from time import perf_counter

from fastapi import APIRouter, Depends

from app.agents.retrieval import retrieve_medical_chunks
from app.agents.response_builder import build_triage_response
from app.agents.red_flag import detect_red_flags
from app.agents.symptom_intake import normalize_symptoms
from app.agents.triage_decision import decide_triage
from app.schemas.trace import TraceLogCreate
from app.schemas.triage import TriageRequest, TriageResponse
from app.services.security import require_service_token
from app.services.trace_logger import log_trace


router = APIRouter(prefix="/triage", dependencies=[Depends(require_service_token)])


@router.post("/run", response_model=TriageResponse)
async def run_triage(payload: TriageRequest) -> TriageResponse:
    started_at = perf_counter()
    trace_id = f"mock_trace_{payload.session_id}"
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

    response = build_triage_response(
        decision=decision,
        citations=citations,
        trace_id=trace_id,
    )

    latency_ms = int((perf_counter() - started_at) * 1000)
    try:
        log_trace(
            TraceLogCreate(
                trace_id=trace_id,
                session_id=payload.session_id,
                user_id=payload.user_id,
                request_text=payload.message,
                latency_ms=latency_ms,
                normalized_symptoms=normalized_symptoms.model_dump(
                    exclude={"raw_text"}
                ),
                red_flags=red_flags.model_dump(),
                retrieved_chunks=citations,
                triage_decision=decision.model_dump(
                    exclude={"model_name", "token_metadata"}
                ),
                model_name=decision.model_name,
                token_metadata=decision.token_metadata,
                validation_passed=decision.validation_passed,
                fallback_used=decision.fallback_used,
            )
        )
    except Exception:
        pass

    return response
