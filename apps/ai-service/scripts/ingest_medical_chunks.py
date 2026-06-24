"""
Local-only ingestion helper for medical_chunks.

Install local ingestion dependencies outside deployed requirements:
  pip install sentence-transformers

Example:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/ingest_medical_chunks.py docs.txt
"""

import argparse
import os
import sys
from pathlib import Path

import httpx


def chunk_text(text: str, max_chars: int = 1200) -> list[str]:
    paragraphs = [paragraph.strip() for paragraph in text.split("\n\n")]
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if not paragraph:
            continue
        next_chunk = f"{current}\n\n{paragraph}".strip()
        if len(next_chunk) > max_chars and current:
            chunks.append(current)
            current = paragraph
        else:
            current = next_chunk

    if current:
        chunks.append(current)

    return chunks


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    parser.add_argument("--title", default=None)
    parser.add_argument("--source", default="local-ingest")
    args = parser.parse_args()

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("Install sentence-transformers locally before running ingestion.", file=sys.stderr)
        return 1

    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        print("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.", file=sys.stderr)
        return 1

    text = args.file.read_text(encoding="utf-8")
    chunks = chunk_text(text)
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    embeddings = model.encode(chunks, normalize_embeddings=True).tolist()

    rows = [
        {
            "title": args.title or args.file.stem,
            "source": args.source,
            "chunk_text": chunk,
            "embedding": embedding,
            "metadata": {"filename": args.file.name, "chunk_index": index},
        }
        for index, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    response = httpx.post(
        f"{supabase_url.rstrip('/')}/rest/v1/medical_chunks",
        headers={
            "apikey": service_role_key,
            "authorization": f"Bearer {service_role_key}",
            "content-type": "application/json",
            "prefer": "return=minimal",
        },
        json=rows,
        timeout=30.0,
    )
    response.raise_for_status()
    print(f"Inserted {len(rows)} chunks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
