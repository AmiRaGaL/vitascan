from fastapi import APIRouter, Depends

from app.agents.red_flag import detect_red_flags
from app.agents.symptom_intake import normalize_symptoms
from app.schemas.triage import TriageRequest, TriageResponse
from app.services.security import require_service_token


router = APIRouter(prefix="/triage", dependencies=[Depends(require_service_token)])


@router.post("/run", response_model=TriageResponse)
def run_triage(payload: TriageRequest) -> TriageResponse:
    normalized_symptoms = normalize_symptoms(payload.message)
    red_flags = detect_red_flags(normalized_symptoms)

    if red_flags.matched:
        return TriageResponse(
            triage_level="emergency",
            confidence=0.95,
            response=(
                "This may be a medical emergency based on the symptoms described. "
                "Please seek immediate care now or call local emergency services."
            ),
            follow_up_questions=[],
            safety_override_applied=True,
            trace_id=f"mock_trace_{payload.session_id}",
        )

    return TriageResponse(trace_id=f"mock_trace_{payload.session_id}")
