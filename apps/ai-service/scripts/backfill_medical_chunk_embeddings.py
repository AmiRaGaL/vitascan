"""
Local-only backfill for medical_chunks.embedding.

This script intentionally depends on local-only packages. Install with:
  pip install -r requirements.local.txt
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
TABLE_NAME = "medical_chunks"
DEFAULT_BATCH_SIZE = 25
EXPECTED_DIMENSIONS = 384


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


def get_missing_count(client: Any) -> int:
    query = client.table(TABLE_NAME).select("id", count="exact").filter("embedding", "is", "null")
    response = query.execute()
    return int(response.count or 0)


def fetch_missing_rows(client: Any, batch_size: int, offset: int = 0) -> list[dict[str, Any]]:
    response = (
        client.table(TABLE_NAME)
        .select("id,title,source,category,chunk_text")
        .filter("embedding", "is", "null")
        .order("id")
        .range(offset, offset + batch_size - 1)
        .execute()
    )
    return response.data or []


def describe_row(row: dict[str, Any]) -> str:
    title = row.get("title") or "(untitled)"
    return f"id={row.get('id')} title={title}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill medical_chunks.embedding locally.")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of rows to process.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate embeddings and print progress without updating Supabase.",
    )
    args = parser.parse_args()

    if args.limit is not None and args.limit < 1:
        print("--limit must be greater than 0.", file=sys.stderr)
        return 1

    try:
        from sentence_transformers import SentenceTransformer
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
    total_missing = get_missing_count(client)
    total_to_process = min(total_missing, args.limit) if args.limit is not None else total_missing
    print(f"Total rows needing embeddings: {total_missing}")
    if args.limit is not None:
        print(f"Limit: {args.limit}")
    if args.dry_run:
        print("Dry run: Supabase updates will be skipped.")
    if total_missing == 0:
        return 0

    model = SentenceTransformer(MODEL_NAME)
    completed = 0

    while completed < total_to_process:
        remaining = total_to_process - completed
        offset = completed if args.dry_run else 0
        rows = fetch_missing_rows(client, min(DEFAULT_BATCH_SIZE, remaining), offset)
        if not rows:
            break

        texts = [str(row.get("chunk_text") or "") for row in rows]
        embeddings = model.encode(texts, normalize_embeddings=True).tolist()

        for row, embedding in zip(rows, embeddings, strict=True):
            if len(embedding) != EXPECTED_DIMENSIONS:
                print(
                    f"Unexpected embedding dimension for {describe_row(row)}: {len(embedding)}",
                    file=sys.stderr,
                )
                return 1

            action = "Would update" if args.dry_run else "Updating"
            print(f"{action} {describe_row(row)}")
            if not args.dry_run:
                (
                    client.table(TABLE_NAME)
                    .update({"embedding": embedding})
                    .eq("id", row["id"])
                    .execute()
                )

            completed += 1
            print(f"Completed: {completed}/{total_to_process}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
