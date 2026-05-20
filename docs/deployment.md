# VitaScan MVP Deployment

## 1. Supabase

1. Create or select a Supabase project.
2. Run the SQL files in `supabase/migrations` in filename order.
3. Confirm auth is enabled and note:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Render API

Use the `apps/api` package as the API service.

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
PORT=
NODE_ENV=
WEB_ORIGIN=
```

Set `WEB_ORIGIN` to the deployed web URL. For multiple origins, use a comma-separated list.

## 3. Vercel Web

Use `apps/web` as the Vercel project root.

Required web environment variables:

```sh
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
```

Set `NEXT_PUBLIC_API_URL` to the deployed Render API URL.

## 4. Smoke Test

1. Open the deployed web app.
2. Sign in with Supabase auth.
3. Complete or skip the health profile prompt.
4. Run a symptom check and confirm a saved session appears on the dashboard.
5. Open the saved session detail page.
6. Test follow-up chat, print summary, copy summary, and delete.
7. Check the API health endpoint at `/health`; it should return `status`, `timestamp`, Supabase connection status, and app metadata.
