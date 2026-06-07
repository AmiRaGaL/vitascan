# VitaScan MVP Deployment

Use this checklist to deploy the existing web/API MVP for a live demo. Mobile is out of scope for this deployment.

## 1. Supabase

1. Create or select a Supabase project.
2. Run SQL migrations in filename order from `supabase/migrations`.
3. In Supabase Auth, enable Google OAuth.
4. Add deployed redirect URLs:
   - `https://YOUR_VERCEL_DOMAIN/auth/callback`
   - `http://localhost:3000/auth/callback` for local development
5. Add the deployed web URL to the Supabase site URL if this is the primary production app.

## 2. Render API

Use `apps/api` as the API service root.

Build command:

```sh
pnpm install --frozen-lockfile
pnpm --filter @vitascan/api build
```

Start command:

```sh
pnpm --filter @vitascan/api start:prod
```

Required API environment variables:

```sh
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
GROQ_API_KEY=
EMBEDDING_MODEL=
WEB_ORIGIN=
PORT=
NODE_ENV=
```

Set `WEB_ORIGIN` to the deployed Vercel URL. Production must include `https://vitascan-web-rho.vercel.app`. For multiple allowed web origins, use a comma-separated list. The API also keeps localhost CORS fallbacks for development.

Confirm the deployed health endpoint works:

```sh
https://YOUR_RENDER_API_URL/health
```

The response should include status, timestamp, Supabase connection state, and app metadata only. It should not expose secrets.

Swagger/OpenAPI documentation is exposed at `/docs` only outside production
(`NODE_ENV !== production`). For local API development, open:

```sh
http://localhost:3000/docs
```

## 3. Vercel Web

Use `apps/web` as the Vercel project root.

Required web environment variables:

```sh
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
```

Set `NEXT_PUBLIC_API_URL` to the deployed Render API URL, without a trailing slash if possible.

The app builds API calls from `NEXT_PUBLIC_API_URL`; do not hardcode localhost API URLs in deployed builds.

## 4. Production Smoke Test

1. Open the deployed web app.
2. Log in with Google.
3. Save or update a health profile.
4. Complete a symptom check.
5. Confirm the saved session appears on the dashboard.
6. Open the session detail page.
7. Try recipes and chat if they are enabled in the deployed environment.
8. Confirm usage limits show clear messages and do not crash the app.
9. Run a red-flag scenario and confirm emergency warning guidance displays.
10. Open the deployed API `/health` endpoint and confirm it returns a safe health response.
