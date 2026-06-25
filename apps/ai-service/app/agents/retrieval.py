from functools import lru_cache

from app.services.supabase_client import SupabaseClient, get_supabase_client


MODEL_NAME = "BAAI/bge-small-en-v1.5"
EXPECTED_EMBEDDING_DIMENSIONS = 384


@lru_cache(maxsize=1)
def get_embedding_model():
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=MODEL_NAME)


def embed_query(query_text: str) -> list[float]:
    if not query_text.strip():
        return []

    embeddings = list(get_embedding_model().embed([query_text]))
    if not embeddings:
        return []

    embedding = embeddings[0]
    embedding_list = (
        embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)
    )
    return [float(value) for value in embedding_list]


def retrieve_medical_chunks(
    query_text: str,
    query_embedding: list[float],
    match_count: int = 5,
    supabase_client: SupabaseClient | None = None,
) -> list[dict]:
    if not query_text.strip() or len(query_embedding) != EXPECTED_EMBEDDING_DIMENSIONS:
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
        "id": row.get("id"),
        "title": row.get("title"),
        "source": row.get("source"),
        "chunk_text": row.get("chunk_text"),
        "similarity": row.get("similarity"),
        "metadata": metadata,
        "url": metadata.get("url"),
        "category": metadata.get("category"),
    }
