from fastapi import APIRouter, Depends

from app.agents.retrieval import retrieve_medical_chunks
from app.agents.response_builder import build_triage_response
from app.agents.red_flag import detect_red_flags
from app.agents.symptom_intake import normalize_symptoms
from app.agents.triage_decision import decide_triage
from app.schemas.triage import TriageRequest, TriageResponse
from app.services.security import require_service_token


router = APIRouter(prefix="/triage", dependencies=[Depends(require_service_token)])


@router.post("/run", response_model=TriageResponse)
async def run_triage(payload: TriageRequest) -> TriageResponse:
    normalized_symptoms = normalize_symptoms(payload.message)
    red_flags = detect_red_flags(normalized_symptoms)
    citations: list[dict] = []

    try:
        citations = retrieve_medical_chunks(
            query_text=payload.message,
            query_embedding=[],
            match_count=5,
        )
    except Exception:
        citations = []

    decision = await decide_triage(
        normalized=normalized_symptoms,
        health_profile=payload.health_profile,
        retrieved_chunks=citations,
        red_flags=red_flags,
    )

    return build_triage_response(
        decision=decision,
        citations=citations,
        trace_id=f"mock_trace_{payload.session_id}",
    )
