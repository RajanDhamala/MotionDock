package routes

import (
	"github.com/RajanDhamala/MotionDock/controllers"

	"github.com/RajanDhamala/MotionDock/middlewares"
	"github.com/go-chi/chi/v5"
)

func UserRouter(ctrl *controllers.Controller) chi.Router {
	r := chi.NewRouter()

	r.Post("/register", ctrl.RegisterUser)
	r.Post("/login", ctrl.LoginUser)
	r.Post("/logout", ctrl.LogoutUser)
	r.Get("/me", middlewares.AuthMe)

	r.Post("/upload/init", ctrl.VideoUploadPresignUrl)

	r.Group(func(r chi.Router) {
		r.Use(middlewares.UserAuthenticate)

		r.Post("/upload/init", ctrl.VideoUploadPresignUrl)
		r.Post("/upload/{id}/complete", ctrl.VideoUploadCompleted)
		r.Get("/upload/video", ctrl.GetUserVideos)
		r.Get("/upload/{id}/play", ctrl.GenerateTempViewUrl)
	})

	return r
}
