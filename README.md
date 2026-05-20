# VitaScan

AI-powered symptom triage and health guidance built as an educational MVP. VitaScan is not a medical device and does not provide a diagnosis.

## MVP Status

Currently works:

- Guest symptom checks with basic daily limit behavior.
- Supabase Google login.
- Health profile create/update.
- Logged-in symptom checks saved to session history.
- Dashboard usage counts, profile prompt, search/filter/sort, pagination, print route, and session deletion.
- Saved session detail pages with emergency guidance, copy summary, print summary, recipes, and delete.
- Post-triage chat for logged-in users with daily free chat limits.
- Supabase-backed RLS policies for user-owned data.
- API `/health` endpoint for deployment smoke tests.

Not implemented yet:

- Server-side history search/filtering.
- PDF generation or email sharing.
- Bulk session deletion.
- Mobile app production flow.
- CI/CD pipeline.
- Clinical validation or regulated medical-device workflows.

## Tech Stack

- Web: Next.js App Router, React, Tailwind CSS
- API: NestJS, TypeScript
- Database/Auth: Supabase Postgres and Supabase Auth
- AI: Groq API
- Monorepo: pnpm workspaces

## MVP Demo Story

VitaScan demonstrates an educational health guidance flow for people who want a clearer next step after noticing symptoms. The demo path is:

1. Log in with Google or continue as a guest.
2. Create or update a basic health profile.
3. Complete a symptom check with guided questions.
4. Review the saved session, recommended level of care, red flags, and profile snapshot.
5. Use follow-up recommendations, recipes, and chat where enabled.

The product is positioned as educational support only. It does not diagnose, prescribe, or replace medical care. Red-flag symptoms surface emergency guidance and direct users to local emergency services.

## Future Work

- RAG with `pgvector` for source-grounded health education.
- Mobile app experience for repeat use and notifications.
- Clinical validation with medical reviewers and structured safety evaluation.
- Stronger compliance, privacy, audit logging, and security hardening.
- Premium usage limits for higher-volume symptom checks and chat.

## Local Development

Install dependencies:

```bash
pnpm install
```

Copy env templates and fill in local values:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Run the API:

```bash
pnpm dev:api
```

Run the web app:

```bash
pnpm dev:web
```

Run both:

```bash
pnpm dev
```

Run focused checks:

```bash
pnpm --filter @vitascan/api build
pnpm --filter @vitascan/api test
pnpm --filter @vitascan/web exec tsc --noEmit
```

## Required Env Vars

API:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
GROQ_API_KEY=
PORT=
NODE_ENV=
WEB_ORIGIN=
```

Web:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
```

## Docs

- Architecture overview: [docs/architecture.md](docs/architecture.md)
- Demo script: [docs/demo-script.md](docs/demo-script.md)
- Deployment notes: [docs/deployment.md](docs/deployment.md)
- Manual QA checklist: [docs/qa-checklist.md](docs/qa-checklist.md)
- Screenshot guide: [docs/screenshots/README.md](docs/screenshots/README.md)

## Safety

VitaScan is for education only and does not provide a diagnosis. For emergencies, call local emergency services.
