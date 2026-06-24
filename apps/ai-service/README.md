# VitaScan AI Service

FastAPI service for VitaScan AI orchestration. Phase 1 provides deployable health and mock triage endpoints only.

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

## Render

Use the Dockerfile and set `AI_SERVICE_TOKEN` in Render environment variables. The container listens on port `10000`.
