# VitaScan MVP Demo Script

Use this as a 2-3 minute walkthrough for portfolio reviews, recorded demos, or live project discussions.

## 1. Problem

"VitaScan is an educational symptom triage MVP for people who are unsure what to do next when they notice symptoms. The goal is not to diagnose, but to help users organize their symptoms, understand red flags, and decide whether home care, primary care, urgent care, or emergency care may be appropriate."

## 2. Product Overview

"The app includes a Next.js web experience, a NestJS API, Supabase authentication and database storage, and an AI provider for structured educational guidance. Users can continue as guests with limits or log in to save their health profile and symptom sessions."

## 3. Live Flow

"I will start by logging in with Google, then open the dashboard. From there I can create or update a health profile with basic context like age, medications, allergies, chronic conditions, and diet preferences."

"Next I will run a symptom check. The flow asks guided questions, optionally uses profile context, and returns a structured result with a recommended level of care, red flags, and a plain-language summary."

"Because I am logged in, the session is saved. I can return to the dashboard, search or filter past sessions, open a session detail page, copy or print the summary, and delete it when I no longer need it."

"If enabled in the environment, the session page also includes wellness recipe suggestions and a follow-up chat for questions about the saved session."

## 4. Safety Guardrails

"The safety model is explicit: VitaScan is educational only and does not provide a diagnosis, prescription, or replacement for medical care. Severe or sudden symptoms trigger emergency guidance, and the interface consistently reminds users to contact local emergency services for red flags."

## 5. Technical Stack

"The frontend is built with Next.js App Router, React, and Tailwind CSS. The backend is a NestJS API in TypeScript. Supabase handles Google auth, Postgres storage, and row-level security for user-owned data. The AI layer calls Groq for symptom guidance and follow-up chat. The monorepo uses pnpm workspaces."

## 6. Future Work

"Future work would add retrieval-augmented generation with pgvector, a mobile app, clinical validation, stronger compliance and security controls, and premium usage limits for heavier symptom-check and chat usage."
