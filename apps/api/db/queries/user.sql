-- name: RegisterUser :one
INSERT INTO users (fullname,email,password) VALUES ($1,$2,$3) RETURNING _id;

-- name: LoginUser :one
SELECT fullname ,email ,password,_id from users WHERE email=$1;

-- name: CheckIfusrExists :one
  SELECT _id from users WHERE email=$1;

-- name: UpdateUserAvatar :one
UPDATE users SET avatar=$1 WHERE _id=$2 RETURNING *;

-- name: UploadVideo :one
INSERT INTO uploads (_id,key,owner,metadata) VALUES ($1,$2,$3,$4) RETURNING _id;

-- name: CheckUpload :one
SELECT key,metadata,created_at, _id,status from uploads WHERE owner=$1;

-- name: VideoUploadCompleted :execrows
UPDATE uploads set status='uploaded' WHERE owner=$1 AND _id=$2;


-- name: GetUserUploads :many
SELECT _id,status,metadata,created_at from uploads WHERE owner=$1;

-- name: RetriveKey :one
SELECT key from uploads WHERE owner=$1 AND _id=$2 AND status='uploaded';


