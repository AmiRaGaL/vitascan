from app.services.supabase_client import SupabaseClient, get_supabase_client


def retrieve_medical_chunks(
    query_text: str,
    query_embedding: list[float],
    match_count: int = 5,
    supabase_client: SupabaseClient | None = None,
) -> list[dict]:
    if not query_text.strip() or len(query_embedding) != 384:
        return []

    client = supabase_client or get_supabase_client()
    if client is None:
        return []

    rows = client.rpc(
        "match_medical_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": match_count,
        },
    )
    return [normalize_medical_chunk(row) for row in rows]


def normalize_medical_chunk(row: dict) -> dict:
    metadata = row.get("metadata")
    if not isinstance(metadata, dict):
        metadata = {}

    return {
        **row,
        "url": metadata.get("url"),
        "category": metadata.get("category"),
    }
