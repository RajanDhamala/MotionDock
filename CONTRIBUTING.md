# Contributing to MotionDock

Use Go 1.25 or newer for the API, Node.js 24 and pnpm 10 for the web app, and Make for the commands below. Run them from the repository root.

## Local setup

**API**

Create `apps/api/.env` and set `S3_BUCKET` to a bucket you can use for development. Configure your AWS credentials and region locally for S3 requests. Keep `.env` files and credentials out of Git.

```sh
make api
```

**Web app**

```sh
pnpm --dir apps/web install --frozen-lockfile
make web
```

## Pull requests

Run the build for the part you changed.

```sh
make build-api
make build-web
```

Open a pull request against `main`. Briefly describe what changed and how you checked it. For a UI change, a screenshot can help reviewers see the result.
