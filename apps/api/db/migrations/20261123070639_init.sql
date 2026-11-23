-- +goose Up
CREATE TABLE users (
    _id UUID PRIMARY KEY,
    fullname VARCHAR(50) NOT NULL,
    avatar TEXT DEFAULT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,
    created_at DATE DEFAULT CURRENT_DATE
);

CREATE TYPE upload_status AS ENUM (
    'pending',
    'uploaded',
    'failed'
);

CREATE TABLE uploads(
    _id UUID PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    status upload_status  DEFAULT 'pending',
    owner UUID NOT NULL REFERENCES users(_id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose Down

DROP TYPE IF EXISTS upload_status;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS uploads;
