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

Local embeddings use `fastembed` with `BAAI/bge-small-en-v1.5`, which outputs
384-dimensional vectors for `medical_chunks.embedding`. This is local-only and
is not installed or run on Render.

```bash
pip install -r requirements.local.txt
python scripts/check_medical_chunk_embeddings.py
python scripts/backfill_medical_chunk_embeddings.py --dry-run --limit 2
python scripts/backfill_medical_chunk_embeddings.py --limit 5
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
