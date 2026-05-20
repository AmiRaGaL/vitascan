# VitaScan Launch Backlog

## Must Fix Before Public Demo

- Verify production Supabase migrations and RLS policies on a fresh project.
- Confirm Google auth redirect URLs for the deployed Vercel domain.
- Confirm Render API env vars and Vercel web env vars are set.
- Run a full production smoke test for login, profile, symptom check, saved sessions, recipes, chat, limits, and red-flag guidance.
- Confirm no secrets or health details appear in API logs.

## Nice To Have

- Add stronger automated tests around auth expiry, API errors, and saved-session deletion.
- Add production monitoring and alerting for API errors and latency.
- Improve empty/error states with consistent loading skeletons.
- Add more structured QA scenarios for red flags and rate limits.
- Validate RAG retrieval quality against a small curated symptom set.

## Future Roadmap

- Mobile app work remains paused.
- Do not claim HIPAA or regulated medical-device compliance without a formal compliance program.
- Add deeper RAG validation, source governance, and clinical review workflows.
- Add stronger privacy, audit, and operational monitoring.
- Expand test coverage across API, web flows, and deployment smoke tests.
