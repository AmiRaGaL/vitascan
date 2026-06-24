from fastapi import APIRouter, Depends

from app.evals.runner import get_latest_result, run_eval
from app.services.security import require_service_token


router = APIRouter(prefix="/evals", dependencies=[Depends(require_service_token)])


@router.post("/run")
async def run_evals(mode: str = "mock") -> dict:
    return await run_eval(mode=mode)


@router.get("/latest")
def latest_eval() -> dict:
    return get_latest_result() or {"status": "no_eval_run"}
