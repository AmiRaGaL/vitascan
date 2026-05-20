# VitaScan Architecture Overview

VitaScan is an educational health guidance MVP built as a pnpm monorepo.

## Next.js Web

The web app uses Next.js App Router, React, and Tailwind CSS. It owns the user-facing flows:

- Landing page and entry points for guest or logged-in use
- Google login through Supabase Auth
- Dashboard with usage counts and saved sessions
- Health profile create/update
- Symptom check wizard
- Saved session detail with print/copy/delete
- Recipes and post-triage chat for saved sessions
- Friendly error and empty states for demo stability

## NestJS API

The API is a NestJS TypeScript service. It coordinates:

- Symptom analysis requests
- Rule-based red-flag overrides
- Saved session creation, listing, detail, and deletion
- Health profile reads/writes
- Usage limit checks
- Recipe recommendations
- Post-triage chat
- Health diagnostics through `/health` and `/health/deep`

## Supabase Auth and Database

Supabase provides Google authentication and Postgres storage.

- Supabase Auth manages user sessions.
- Postgres stores users, health profiles, symptom sessions, usage counters, recipes, chat threads/messages, and knowledge-base documents.
- Row-level security keeps user-owned records scoped to the authenticated user.
- The API uses service-role access for trusted server-side operations.

## AI Provider and RAG

Groq powers structured symptom guidance and follow-up chat. A lightweight RAG layer uses `pgvector`:

1. Educational knowledge-base documents are stored in `kb_documents`.
2. Chunks and embeddings are stored in `kb_embeddings`.
3. The API retrieves relevant chunks before symptom analysis and chat.
4. Retrieved chunks are included as trusted reference context in prompts.

RAG is used for grounding only. The UI does not yet expose citations.

## Saved-Session Flow

1. A user starts as a guest or signs in with Google.
2. A logged-in user can save a health profile.
3. The symptom check sends answers, optional profile context, and auth state to the API.
4. The API checks limits, retrieves KB context, calls the AI provider, applies red-flag overrides, and returns guidance.
5. Logged-in results are saved as symptom sessions.
6. The dashboard loads lightweight session summaries.
7. Detail pages load full saved-session data, recipes, and chat where enabled.

## Privacy and Security Basics

- Educational-only positioning; no diagnosis or prescription claims.
- Protected API routes for profile, saved sessions, recipes, usage, and chat.
- Supabase RLS for user-owned data.
- CORS restricted by `WEB_ORIGIN` in production.
- Basic rate limiting on sensitive write/action endpoints.
- Structured API logging without request bodies or health details.
- Security headers and public health diagnostics.
