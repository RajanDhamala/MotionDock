.PHONY: api web build-api build-web up down generate

api:
	cd apps/api && go run ./cmd/internal

web:
	cd apps/web && pnpm dev

build-api:
	cd apps/api && go build -o ../../bin/api ./cmd/internal

build-web:
	cd apps/web && pnpm build

up:
	cd apps/api && goose -dir db/migrations postgres "$$(grep '^DATABASE_URL=' .env | cut -d '=' -f2-)" up

down:
	cd apps/api && goose -dir db/migrations postgres "$$(grep '^DATABASE_URL=' .env | cut -d '=' -f2-)" down

generate:
	cd apps/api && sqlc generate
