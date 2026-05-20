# VitaScan Architecture Overview

VitaScan is a portfolio-ready educational health guidance MVP built as a pnpm monorepo.

## Web App

The web app uses Next.js App Router, React, and Tailwind CSS. It owns the user-facing flows:

- Home page and entry points for guest or logged-in use
- Google login through Supabase Auth
- Dashboard for usage counts and saved sessions
- Profile create/update flow
- Symptom check flow
- Saved session detail, print/copy actions, recipes, and chat where enabled

## API

The API is a NestJS TypeScript service. It coordinates server-side business logic for:

- Symptom analysis requests
- Saved session creation and retrieval
- Health profile reads and writes
- Usage limit checks
- Follow-up chat and recipe endpoints where enabled
- Deployment health checks through `/health`

## Supabase

Supabase provides authentication and Postgres storage.

- Supabase Auth handles Google login.
- Postgres stores profiles, symptom sessions, usage records, and related chat/session data.
- Row-level security keeps user-owned records scoped to the authenticated user.
- The API uses service credentials for trusted server-side operations.

## AI Provider

The AI layer uses Groq for educational symptom guidance and follow-up chat. Responses are treated as user guidance, not medical diagnosis. The API wraps AI calls with product guardrails, usage limits, and saved-session context.

## Saved Session, Profile, and Usage Flow

1. A user starts as a guest or signs in with Google.
2. A logged-in user can save a health profile with basic demographic and health context.
3. The symptom check sends answers, profile context, and auth state to the API.
4. The API checks usage limits, calls the AI provider, and returns structured guidance.
5. For logged-in users, the result is saved as a session linked to their account.
6. The dashboard loads saved sessions, usage counts, and profile prompts.
7. Session detail pages can show recommendations, emergency guidance, answers, profile snapshots, recipes, and follow-up chat where enabled.

## Safety Positioning

VitaScan is educational only. It does not diagnose, prescribe, or replace professional care. Emergency and red-flag guidance is surfaced prominently when symptoms may require immediate attention.
