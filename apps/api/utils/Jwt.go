package utils

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserJWT struct {
	Username string
	ID       uuid.UUID
}

type userJWTClaims struct {
	Username string     `json:"username"`
	ID       *uuid.UUID `json:"id"`
	jwt.RegisteredClaims
}

func CreateAccessToken(data *UserJWT) (string, error) {
	claims := jwt.MapClaims{
		"username": data.Username,
		"id":       data.ID,
		"exp":      time.Now().Add(15 * time.Minute).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(accessTokenSecret())
}

func CreateRefreshToken(data *UserJWT) (string, error) {
	claims := jwt.MapClaims{
		"username": data.Username,
		"id":       data.ID,
		"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(refreshTokenSecret())
}

func VerifyAccessToken(tokenString string) (*UserJWT, error) {
	return verifyUserToken(tokenString, accessTokenSecret(), "access")
}

func VerifyRefreshToken(tokenString string) (*UserJWT, error) {
	return verifyUserToken(tokenString, refreshTokenSecret(), "refresh")
}

func verifyUserToken(tokenString string, secret []byte, tokenType string) (*UserJWT, error) {
	claims := &userJWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil || !token.Valid || claims.ID == nil {
		return nil, fmt.Errorf("invalid %s token", tokenType)
	}

	return &UserJWT{Username: claims.Username, ID: *claims.ID}, nil
}

func HashPassword(passwrod string) (string, error) {
	paswdByte := []byte(passwrod)
	data, err := bcrypt.GenerateFromPassword(paswdByte, 10)
	if err != nil {
		fmt.Println("failed to hash the passwrod")
		return "", err
	}
	return string(data), nil
}

func ComaprePasswrod(Password string, HashedPassword string) error {
	bytePassword := []byte(Password)
	byteHashPassword := []byte(HashedPassword)
	err := bcrypt.CompareHashAndPassword(byteHashPassword, bytePassword)
	if err != nil {
		return errors.New("password not matched")
	}
	return nil
}

func accessTokenSecret() []byte {
	return []byte(os.Getenv("ACCESS_TOKEN_SECRET"))
}

func refreshTokenSecret() []byte {
	return []byte(os.Getenv("REFRESH_TOKEN_SECRET"))
}
