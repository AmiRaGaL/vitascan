# VitaScan Monitoring

Use these lightweight checks for the deployed MVP. Do not log request bodies, symptom text, profile fields, chat messages, medications, allergies, or other health details.

## Health Endpoints

- `GET /health`: public basic health response with status, timestamp, uptime, environment, Supabase status, and whether the AI provider is configured.
- `GET /health/deep`: public deeper diagnostic response. It checks Supabase with a lightweight query and checks AI provider configuration only. It does not make a paid AI call.

Expected healthy status is `ok`. A `degraded` status means at least one dependency/configuration check failed.

## Render Logs

Check API logs for structured request entries:

- `timestamp`
- `method`
- `route`
- `statusCode`
- `responseTimeMs`
- `userId`

Useful patterns to watch:

- repeated `5xx` responses
- repeated `429` responses from rate limits
- slow response times on symptom analysis or chat endpoints
- `/health` or `/health/deep` returning `degraded`

## Vercel Logs

Check web logs for:

- auth callback errors
- frontend route crashes caught by the error boundary
- failed API request metadata from the client helper

Client-side API error logs should include endpoint path, status, and message only. They should not include request payloads or health data.

## Common Failure Cases

- Missing `NEXT_PUBLIC_API_URL`: web requests fail before reaching the API.
- Missing `WEB_ORIGIN`: production CORS blocks browser requests.
- Missing Supabase env vars: `/health` and `/health/deep` report degraded.
- Missing `GROQ_API_KEY`: `/health/deep` reports failed AI provider config.
- Expired Supabase session: protected web pages redirect home.
- Rate limits reached: API returns `429` with a clear message.

## Smoke Test After Deploy

1. Open the web app.
2. Visit API `/health`.
3. Visit API `/health/deep`.
4. Log in with Google.
5. Save or update a profile.
6. Complete a symptom check.
7. Open the saved session detail page.
8. Try recipes and chat if enabled.
9. Confirm usage limits and red-flag guidance still render.

## Sensitive Data

Never log:

- symptom descriptions or answers
- health profile fields
- medications or allergies
- chat message content
- Supabase tokens or service keys
- AI prompts, completions, or retrieved health context
