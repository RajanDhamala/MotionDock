# MotionDock

MotionDock is a hands-on video editing project for learning **AWS S3 object storage** and **FFmpeg**.

## Stack

<p>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/react/react-original.svg" height="32" alt="React" title="React">
  &nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/typescript/typescript-original.svg" height="32" alt="TypeScript" title="TypeScript">
  &nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/vitejs/vitejs-original.svg" height="32" alt="Vite" title="Vite">
  &nbsp;
  <img src="https://go.dev/images/go-logo-blue.svg" height="26" alt="Go (net/http)" title="Go (net/http)">
  &nbsp;
  <img src="https://awsfundamentals.com/assets/aws-icons/Arch_Amazon-Simple-Storage-Service_64.svg" height="32" alt="Amazon S3" title="Amazon S3">
  &nbsp;
  <img src="https://upload.wikimedia.org/wikipedia/commons/5/5f/FFmpeg_Logo_new.svg" height="26" alt="FFmpeg" title="FFmpeg">
  &nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/postgresql/postgresql-original.svg" height="32" alt="PostgreSQL" title="PostgreSQL">
  &nbsp;
  <img src="https://pressly.github.io/goose/assets/goose_logo.png" height="32" alt="Goose" title="Goose">
  &nbsp;
  <code>sqlc</code>
</p>

## Ideas to explore

- Resumable S3 uploads and private video projects
- Browser previews and edits that preserve the original video
- FFmpeg compression, conversion, and export
- Background workers, live job progress, and distributed processing later on

## Run the API

Configure `apps/api/.env`, then run this from the repository root.

```sh
make api
```

If you’re already in `apps/api`, run this instead.

```sh
go run ./cmd/internal
```

See the [contribution guide](CONTRIBUTING.md) for frontend setup and build checks.
