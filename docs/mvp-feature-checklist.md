# VitaScan MVP Feature Checklist

Use this checklist for demos, portfolio review, and handoff.

## Implemented

- [x] Google authentication with Supabase Auth
- [x] Guest symptom-check path with basic daily limits
- [x] Health profile create/update flow
- [x] Guided symptom check with structured questions
- [x] Saved symptom sessions for logged-in users
- [x] Dashboard session list with search, filters, sorting, pagination, usage counts, and deletion
- [x] Session detail page with summary, triage level, red-flag guidance, answers, profile snapshot, copy, print, and delete
- [x] Wellness recipe suggestions for saved sessions
- [x] Post-triage follow-up chat for saved sessions
- [x] Usage limits for symptom checks and chat
- [x] Basic RAG grounding with `pgvector` knowledge-base chunks
- [x] Deployment readiness for Vercel web and Render API
- [x] Production diagnostics with `/health`, `/health/deep`, structured API logs, and monitoring notes
- [x] Security/privacy basics: RLS, protected API routes, CORS restrictions, safe logging, rate limiting, and privacy copy

## Intentionally Not Included

- [ ] Mobile app production flow
- [ ] Payments or subscription billing
- [ ] HIPAA or regulated medical-device claims
- [ ] Clinical validation
- [ ] Emergency-services integration
- [ ] PDF generation or email sharing
- [ ] Public citations UI for RAG references

## Demo Positioning

VitaScan is an educational MVP. It does not diagnose, prescribe, replace professional care, or claim HIPAA compliance. Red-flag symptoms should direct users toward emergency care.
