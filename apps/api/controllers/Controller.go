package controllers

import (
	"github.com/RajanDhamala/MotionDock/db/sqlc"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Controller struct {
	queries       *db.Queries
	pool          *pgxpool.Pool
	s3Client      *s3.Client
	presignClient *s3.PresignClient
	s3Bucket      string
}

func NewController(
	queries *db.Queries,
	pool *pgxpool.Pool,
	s3Client *s3.Client,
	presignClient *s3.PresignClient,
	s3Bucket string,
) *Controller {
	return &Controller{
		queries:       queries,
		pool:          pool,
		s3Client:      s3Client,
		presignClient: presignClient,
		s3Bucket:      s3Bucket,
	}
}
