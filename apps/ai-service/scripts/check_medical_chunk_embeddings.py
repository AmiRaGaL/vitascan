"""
Local-only status check for medical_chunks.embedding.

Install local dependencies with:
  pip install -r requirements.local.txt
"""

import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


TABLE_NAME = "medical_chunks"


def load_local_env() -> None:
    service_dir = Path(__file__).resolve().parents[1]
    load_dotenv(service_dir / ".env")
    load_dotenv()


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"{name} is required.", file=sys.stderr)
        raise SystemExit(1)
    return value


def count_rows(client: Any, embedding_filter: tuple[str, str] | None = None) -> int:
    query = client.table(TABLE_NAME).select("id", count="exact").limit(1)
    if embedding_filter is not None:
        operator, criteria = embedding_filter
        query = query.filter("embedding", operator, criteria)
    response = query.execute()
    return int(response.count or 0)


def main() -> int:
    try:
        from supabase import create_client
    except ImportError as exc:
        print(
            "Install local dependencies before running: pip install -r requirements.local.txt",
            file=sys.stderr,
        )
        print(f"Missing dependency: {exc.name}", file=sys.stderr)
        return 1

    load_local_env()
    supabase_url = require_env("SUPABASE_URL")
    service_role_key = require_env("SUPABASE_SERVICE_ROLE_KEY")

    client = create_client(supabase_url, service_role_key)

    total = count_rows(client)
    with_embeddings = count_rows(client, ("not.is", "null"))
    missing = count_rows(client, ("is", "null"))

    print(f"Total medical_chunks: {total}")
    print(f"Chunks with embeddings: {with_embeddings}")
    print(f"Chunks missing embeddings: {missing}")

    response = (
        client.table(TABLE_NAME)
        .select("source,title,category")
        .filter("embedding", "is", "null")
        .order("id")
        .limit(5)
        .execute()
    )
    samples = response.data or []
    if samples:
        print("Sample rows missing embeddings:")
        for row in samples:
            print(
                f"- source={row.get('source') or ''} "
                f"title={row.get('title') or ''} "
                f"category={row.get('category') or ''}"
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
