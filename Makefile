.PHONY: api web build-api build-web

api:
	cd apps/api && go run ./cmd/internal

web:
	cd apps/web && pnpm dev

build-api:
	cd apps/api && go build -o ../../bin/api ./cmd/internal

build-web:
	cd apps/web && pnpm build
