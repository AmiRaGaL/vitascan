from fastapi import APIRouter, Depends

from app.schemas.trace import TraceLog
from app.services.security import require_service_token
from app.services.trace_logger import get_traces_for_session


router = APIRouter(prefix="/traces", dependencies=[Depends(require_service_token)])


@router.get("/{session_id}", response_model=list[TraceLog])
def get_session_traces(session_id: str) -> list[TraceLog]:
    return get_traces_for_session(session_id)
