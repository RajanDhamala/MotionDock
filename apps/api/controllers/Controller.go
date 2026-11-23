package controllers

import (
	"github.com/RajanDhamala/MotionDock/db/sqlc"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Controller struct {
	queries *db.Queries
	pool    *pgxpool.Pool
}

func NewController(queries *db.Queries, pool *pgxpool.Pool) *Controller {
	return &Controller{queries: queries, pool: pool}
}
