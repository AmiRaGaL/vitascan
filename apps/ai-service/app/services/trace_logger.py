from app.schemas.trace import TraceLog, TraceLogCreate
from app.services.supabase_client import SupabaseClient, get_supabase_client


SECRET_KEYS = {
    "authorization",
    "apikey",
    "api_key",
    "service_role_key",
    "supabase_service_role_key",
    "groq_api_key",
    "ai_service_token",
    "x-service-token",
}


def log_trace(
    metadata: TraceLogCreate,
    supabase_client: SupabaseClient | None = None,
) -> bool:
    client = supabase_client or get_supabase_client()
    if client is None:
        return False

    try:
        client.insert(
            "ai_trace_logs",
            {
                "trace_id": metadata.trace_id,
                "session_id": metadata.session_id,
                "user_id": metadata.user_id,
                "event_type": "triage_run",
                "payload": sanitize_payload(metadata.model_dump()),
            },
        )
        return True
    except Exception:
        return False


def get_traces_for_session(
    session_id: str,
    supabase_client: SupabaseClient | None = None,
) -> list[TraceLog]:
    client = supabase_client or get_supabase_client()
    if client is None:
        return []

    rows = client.select(
        "ai_trace_logs",
        {
            "session_id": f"eq.{session_id}",
            "event_type": "eq.triage_run",
            "select": "trace_id,session_id,user_id,event_type,payload,created_at",
            "order": "created_at.desc",
        },
    )
    return [TraceLog.model_validate(row) for row in rows]


def sanitize_payload(value):
    if isinstance(value, dict):
        sanitized = {}
        for key, item in value.items():
            if key.lower() in SECRET_KEYS:
                continue
            sanitized[key] = sanitize_payload(item)
        return sanitized

    if isinstance(value, list):
        return [sanitize_payload(item) for item in value]

    return value
