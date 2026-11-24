package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/RajanDhamala/MotionDock/db/sqlc"
	"github.com/RajanDhamala/MotionDock/utils"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type RegisterUserReq struct {
	Email    string `json:"email"`
	FullName string `json:"fullname"`
	Password string `json:"password"`
}

type LoginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func (ctrl *Controller) RegisterUser(w http.ResponseWriter, r *http.Request) {
	var data RegisterUserReq

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "error parsing body",
		})
		return
	}

	_, err := ctrl.queries.CheckIfusrExists(r.Context(), data.Email)

	if err == nil {
		writeJSON(w, http.StatusConflict, map[string]string{
			"error": "user already exists",
		})
		return
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "internal server error",
		})
		return
	}

	hashedPwd, err := utils.EncryptPaswrod(data.Password)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "internal server error",
		})
		return
	}

	id, err := ctrl.queries.RegisterUser(r.Context(), db.RegisterUserParams{
		Email:    data.Email,
		Fullname: data.FullName,
		Password: hashedPwd,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "failed to register user",
		})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"data": map[string]any{
			"id": id,
		},
	})
}

func (ctrl *Controller) LoginUser(w http.ResponseWriter, r *http.Request) {
	fmt.Println("user login called")

	var data LoginReq

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "error parsing body",
		})
		return
	}

	user, err := ctrl.queries.LoginUser(r.Context(), data.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "invalid credentials",
			})
			return
		}

		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "internal server error",
		})
		return
	}

	if err := utils.DecrptPassword(user.Password, data.Password); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "invalid credentials",
		})
		return
	}

	usr := utils.AuthUser{
		ID:       user.ID,
		Fullname: user.Fullname,
		Email:    user.Email,
	}

	accessToken, err := utils.CreateToken(
		usr,
		"accessToken",
		15*time.Minute,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "failed to create access token",
		})
		return
	}

	refreshToken, err := utils.CreateToken(
		usr,
		"refreshToken",
		7*24*time.Hour,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "failed to create refresh token",
		})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "accessToken",
		Value:    accessToken,
		Path:     "/",
		Expires:  time.Now().Add(15 * time.Minute),
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refreshToken",
		Value:    refreshToken,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "logged in successfully",
	})
}

func (ctrl *Controller) LogoutUser(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "accessToken",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refreshToken",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "logged out",
	})
}

type VideoUploadPresignReq struct {
	Size     int64           `json:"size"`
	Name     string          `json:"string"`
	Metadata json.RawMessage `json:"metadata"`
}

func (ctrl *Controller) VideoUploadPresignUrl(w http.ResponseWriter, r *http.Request) {
	var data VideoUploadPresignReq

	user, ok := r.Context().Value(utils.UserContextKey).(*utils.AuthUser)

	if !ok || user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
		return
	}

	err := json.NewDecoder(r.Body).Decode(&data)
	if err != nil {
		w.Write([]byte("failed to parse body /n"))
		return
	}

	if data.Metadata == nil || string(data.Metadata) == "null" {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "metadata is required",
		})
		return
	}

	uploadID := uuid.New()
	key := "/uploads/" + uploadID.String()
	result, err := ctrl.presignClient.PresignPutObject(
		r.Context(),
		&s3.PutObjectInput{
			Bucket: aws.String(ctrl.s3Bucket),
			Key:    aws.String(key),
		},
		s3.WithPresignExpires(5*time.Minute),
	)
	if err != nil {
		fmt.Println("Error generating presigned URL:", err)
		http.Error(w, "Failed to generate URL", http.StatusInternalServerError)
		return
	}

	_, err = ctrl.queries.UploadVideo(r.Context(), db.UploadVideoParams{
		ID:       uploadID,
		Key:      key,
		Owner:    user.ID,
		Metadata: data.Metadata,
	})
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to register upload"})
		return
	}

	w.Header().Set("Content-Type", "application/json")

	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false)

	encoder.Encode(map[string]string{
		"url":     result.URL,
		"message": "expires in 5 min",
		"id":      uploadID.String(),
	})
}

func (ctrl *Controller) VideoUploadCompleted(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(utils.UserContextKey).(*utils.AuthUser)

	uploadID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "invalid upload id",
		})
		return
	}

	if !ok || user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
		return
	}

	_, err = ctrl.s3Client.HeadObject(r.Context(), &s3.HeadObjectInput{
		Bucket: aws.String(ctrl.s3Bucket),
		Key:    aws.String("/uploads/" + uploadID.String()),
	})
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
		return

	}
	_, err = ctrl.queries.VideoUploadCompleted(r.Context(), db.VideoUploadCompletedParams{
		Owner: user.ID,
		ID:    uploadID,
	})
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{
		"message": "video upload completed",
	})
}

func (ctrl *Controller) GetUserVideos(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(utils.UserContextKey).(*utils.AuthUser)

	if !ok || user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
		return
	}
	data, err := ctrl.queries.GetUserUploads(r.Context(), user.ID)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data": data,
	})
}

func (ctrl *Controller) GenerateTempViewUrl(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(utils.UserContextKey).(*utils.AuthUser)

	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "invalid upload id",
		})
		return
	}

	if !ok || user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
		return
	}

	key, err := ctrl.queries.RetriveKey(r.Context(), db.RetriveKeyParams{
		Owner: user.ID,
		ID:    id,
	})
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
		return
	}

	result, err := ctrl.presignClient.PresignGetObject(
		r.Context(),
		&s3.GetObjectInput{
			Bucket: aws.String(ctrl.s3Bucket),
			Key:    aws.String(key),
		},
		s3.WithPresignExpires(15*time.Minute),
	)
	writeJSON(w, http.StatusOK, map[string]any{
		"data": result,
	})
}
