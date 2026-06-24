from fastapi import FastAPI

from app.routes import evals, health, traces, triage


app = FastAPI(title="VitaScan AI Service")

app.include_router(health.router)
app.include_router(triage.router)
app.include_router(traces.router)
app.include_router(evals.router)
