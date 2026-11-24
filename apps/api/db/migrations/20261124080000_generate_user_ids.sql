-- +goose Up
ALTER TABLE users ALTER COLUMN _id SET DEFAULT gen_random_uuid();

-- +goose Down
ALTER TABLE users ALTER COLUMN _id DROP DEFAULT;
