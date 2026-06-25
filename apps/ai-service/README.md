# VitaScan AI Service

FastAPI service for VitaScan AI orchestration.

## Local setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
AI_SERVICE_TOKEN=replace_me uvicorn app.main:app --host 0.0.0.0 --port 10000
```

## Endpoints

- `GET /health` is public and returns service status.
- `POST /triage/run` requires the `x-service-token` header and returns a mock triage response.

## Local embedding backfill

`sentence-transformers` is a local-only dependency for manual data maintenance.
Do not add it to `requirements.txt`, the Dockerfile, or the Render deployment.
Do not run this backfill on Render.

Create a local environment from the AI service directory:

```bash
cd apps/ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.local.txt
```

Create a local `.env` with Supabase service credentials:

```sh
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Check current embedding coverage:

```bash
python scripts/check_medical_chunk_embeddings.py
```

Run a dry run that generates embeddings without updating Supabase:

```bash
python scripts/backfill_medical_chunk_embeddings.py --dry-run --limit 25
```

Run a limited backfill:

```bash
python scripts/backfill_medical_chunk_embeddings.py --limit 25
```

Run the full backfill:

```bash
python scripts/backfill_medical_chunk_embeddings.py
```

## Render deployment

Create a Render web service with:

- Service root: `apps/ai-service`
- Environment: Docker
- Dockerfile: `apps/ai-service/Dockerfile`

The container listens on port `10000`.

Required environment variables:

```sh
AI_SERVICE_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
GROQ_TRIAGE_MODEL=
GROQ_FAST_MODEL=
```

Keep local ingestion dependencies such as `sentence-transformers` out of
`requirements.txt`; install them only in a local virtual environment when
running scripts under `scripts/`.
