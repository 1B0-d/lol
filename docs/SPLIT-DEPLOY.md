# Split Frontend And Backend Deploy

## Frontend

- Deploy the static frontend from `frontend/public`
- Netlify uses `netlify.toml` from the repo root
- Vercel uses `vercel.json` from the repo root
- Set the backend URL in `frontend/public/js/runtime-config.js`

Example:

```js
window.APP_CONFIG = {
  apiBaseUrl: "https://your-backend.onrender.com"
};
```

When `apiBaseUrl` is set, the frontend sends API requests to that backend and opens `Resume.pdf` from the backend host.

## Backend

- Deploy the Go backend on Render or Koyeb
- Render native commands:

```bash
go build -o app ./backend/cmd/app
./app
```

- Or use Docker with `backend/Dockerfile`
- Required environment variables:

```bash
FIREBASE_PROJECT_ID=portfolio-1a377
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-frontend.netlify.app
```

- Upload the Firebase service account JSON as a secret file named `serviceAccountKey.json`

## Metrics

- Raw backend metrics stay available at `/metrics`
- Health check stays available at `/healthz`
- Prometheus and Grafana can still run locally with `docker-compose up -d`
