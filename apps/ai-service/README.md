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
