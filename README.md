# VitaScan 

**AI-Powered Symptom Triage Assistant (MVP)**  
*Educational tool only - not medical advice.*

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)](https://openai.com/)

## 🎯 Current Status (Phase A Complete)

| Component | Status | Details |
|-----------|--------|---------|
| **Monorepo** | ✅ | `pnpm` workspaces (api, shared) |
| **Backend** | ✅ | NestJS + `POST /symptom-sessions` |
| **Database** | ✅ | Supabase (Auth + RLS policies) |
| **AI Triage** | ✅ | **GPT-4o** with emergency red-flag overrides |

## 🛠 Quick Start

1. **Clone & Install**
   ```bash
   git clone https://github.com/AmiRaGaL/vitascan.git
   cd vitascan
   pnpm install
