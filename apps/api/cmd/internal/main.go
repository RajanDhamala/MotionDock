package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/RajanDhamala/MotionDock/controllers"
	"github.com/RajanDhamala/MotionDock/db/sqlc"
	"github.com/RajanDhamala/MotionDock/routes"
	"github.com/RajanDhamala/MotionDock/utils"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

func main() {
	PORT := "8080"

	if err := godotenv.Load(); err != nil {
		log.Fatal("Failed to load .env:", err)
	}

	ctx := context.Background()

	pool, err := utils.ConnectDb(ctx)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer pool.Close()

	queries := db.New(pool)

	s3Bucket := os.Getenv("S3_BUCKET")

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatal("Failed to load AWS config:", err)
	}

	s3Client := s3.NewFromConfig(cfg)
	presignClient := s3.NewPresignClient(s3Client)

	app := chi.NewRouter()

	app.Use(middleware.Logger)
	app.Use(middleware.Recoverer)

	ctrl := controllers.NewController(queries, pool, s3Client, presignClient, s3Bucket)
	app.Mount("/users", routes.UserRouter(ctrl))

	log.Println("Server listening on port", PORT)

	if err := http.ListenAndServe("127.0.0.1:"+PORT, app); err != nil {
		log.Fatal(err)
	}
}
