# VitaScan 🏥

AI-powered symptom triage and health guidance — built as an educational tool, not a replacement for professional medical advice.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-FF6B35?logoColor=white)](https://groq.com/)

---

## What is VitaScan?

VitaScan helps users understand their symptoms and decide on the right next step — whether that's staying home, seeing a doctor, or heading to the ER. It uses a guided multi-step wizard and an AI triage engine powered by Groq (Llama 4) to produce structured, color-coded recommendations.

This is a personal project built to explore AI in healthcare UX. It is not a medical device and makes no clinical claims.

---

## Current Status

Phases 1 through 3B are complete. The app has a working monorepo, a live API, a Supabase database, a guided symptom checker, and full Google OAuth authentication.

| Area | Status | Notes |
|------|--------|-------|
| Monorepo setup | Done | pnpm workspaces across api, web, shared |
| NestJS API | Done | Symptom sessions, triage, body areas |
| Supabase DB | Done | 10 tables, RLS policies, pgvector ready |
| AI triage | Done | Groq / Llama 4 Scout with structured output |
| Web app | Done | Next.js with Tailwind, guided wizard |
| Google Auth | Done | Supabase OAuth, protected dashboard |
| RAG / KB | In progress | Phase 4 |
| AI Chat | Planned | Phase 6 |
| Mobile app | Planned | Phase 8 (Expo) |

---

## Tech Stack

- **Web** — Next.js (App Router), Tailwind CSS, deployed on Vercel
- **API** — NestJS, TypeScript, deployed on Render
- **Database** — Supabase (PostgreSQL, pgvector, Row Level Security)
- **Auth** — Supabase Auth with Google OAuth
- **AI** — Groq API (Llama 4 Scout) for triage analysis
- **Monorepo** — pnpm workspaces with shared TypeScript types

---

## How It Works

The symptom checker walks users through a 5-step wizard:

1. Select a body area (Head, Chest, Abdomen, Back, Limbs, Skin, General)
2. Choose a specific symptom from that area
3. Answer follow-up questions about severity, duration, and triggers
4. Optionally provide a basic health profile (age, conditions, medications)
5. Receive an AI-generated triage result with color-coded urgency level

Triage levels are: **Home care**, **See a PCP**, **Urgent care**, or **Emergency room**. Each result includes red flag detection, a specialty suggestion, home care advice, and tips for preparing for a doctor visit.

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- A Supabase project
- A Groq API key

### Install

```bash
git clone https://github.com/AmiRaGaL/vitascan.git
cd vitascan
pnpm install
