# VitaScan 🏥

**AI-Powered Guided Symptom Triage System**  
*Educational tool only - not a substitute for professional medical advice.*

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-FF6B35?logo=groq&logoColor=white)](https://groq.com/)

---

## 🎯 Current Status: Phase 3A Complete ✅

| Component | Status | Technology | Details |
|-----------|--------|------------|---------|
| **Monorepo** | ✅ | pnpm workspaces | `apps/api`, `apps/web`, `packages/shared` |
| **Backend API** | ✅ | NestJS + TypeScript | RESTful API with structured endpoints |
| **Database** | ✅ | Supabase (PostgreSQL) | 7 tables with RLS policies |
| **AI Engine** | ✅ | Groq (Llama 4 Scout) | Structured triage analysis |
| **Web Client** | ✅ | Next.js 14 + Tailwind | Multi-step wizard interface |
| **Auth** | 🚧 | Supabase Auth | Schema ready, UI pending |


---

## ✨ Features

### Phase 3A: Guided Symptom Checker ✅
- **Body Area Selection** - 7 major anatomical regions (Head, Chest, Abdomen, etc.)
- **Dynamic Symptom Tree** - Context-aware symptom categories per body area
- **Smart Questionnaire** - Dynamic follow-up questions (severity, duration, triggers)
- **Health Profile Integration** - Age, sex, chronic conditions, medications, allergies
- **AI Triage Analysis** - 4-level triage (Emergency/Urgent Care/PCP/Home)
- **Red Flag Detection** - Automatic identification of warning signs
- **Specialty Routing** - Suggests appropriate medical specialist
- **Confidence Scoring** - AI confidence level in assessment


---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/AmiRaGaL/vitascan.git
cd vitascan
pnpm install


