from fastapi import APIRouter, Depends

from app.schemas.triage import TriageRequest, TriageResponse
from app.services.security import require_service_token


router = APIRouter(prefix="/triage", dependencies=[Depends(require_service_token)])


@router.post("/run", response_model=TriageResponse)
def run_triage(payload: TriageRequest) -> TriageResponse:
    return TriageResponse(trace_id=f"mock_trace_{payload.session_id}")
