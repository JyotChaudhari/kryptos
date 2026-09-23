# Kryptos

Kryptos is a Vite/React client with a temporary, in-memory Express backend. It provides anonymous
session identity, username profile creation/update/search, contact-filtered chat, and text posts.
Data is intentionally lost when the backend restarts; do not use this service for production data.

## Local development

```powershell
npm install
Copy-Item .env.example .env
npm run dev:all
```

Vite runs on `http://localhost:5173` and the API runs on `http://localhost:8787`. Set
`VITE_API_URL` in `.env` when the API is hosted elsewhere. The frontend uses same-origin when it
is unset.

## Share with ngrok

Start the backend and Vite as above, then expose the Vite port:

```powershell
ngrok http 5173
```

For a single public origin, build the client and serve `dist` from the backend:

```powershell
$env:NODE_ENV = "production"
npm run build
npm run server
ngrok http 8787
```

The backend has no secrets or external service configuration. Posts currently support text only;
media upload, persistent storage, and real peer-to-peer calls are intentionally disabled.

## Desktop build

```powershell
npm run build
npx electron .
```
