from fastapi import FastAPI

from app.routes import health, triage


app = FastAPI(title="VitaScan AI Service")

app.include_router(health.router)
app.include_router(triage.router)
