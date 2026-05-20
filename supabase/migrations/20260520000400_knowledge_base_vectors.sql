create extension if not exists vector;

create table if not exists public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null,
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.kb_documents add column if not exists id uuid default gen_random_uuid();
alter table public.kb_documents add column if not exists title text;
alter table public.kb_documents add column if not exists source text;
alter table public.kb_documents add column if not exists content text;
alter table public.kb_documents add column if not exists tags text[] not null default '{}';
alter table public.kb_documents add column if not exists created_at timestamptz not null default now();

create table if not exists public.kb_embeddings (
  id bigserial primary key,
  document_id uuid not null references public.kb_documents(id) on delete cascade,
  chunk_id int not null,
  chunk_text text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint kb_embeddings_document_chunk_unique unique (document_id, chunk_id)
);

alter table public.kb_embeddings add column if not exists document_id uuid references public.kb_documents(id) on delete cascade;
alter table public.kb_embeddings add column if not exists chunk_id int;
alter table public.kb_embeddings add column if not exists chunk_text text;
alter table public.kb_embeddings add column if not exists embedding vector(1536);
alter table public.kb_embeddings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.kb_embeddings add column if not exists created_at timestamptz not null default now();

create index if not exists kb_documents_tags_idx
  on public.kb_documents using gin (tags);

create index if not exists kb_embeddings_embedding_idx
  on public.kb_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.kb_documents enable row level security;
alter table public.kb_embeddings enable row level security;

drop policy if exists "No direct client access to KB documents" on public.kb_documents;
create policy "No direct client access to KB documents"
  on public.kb_documents for all
  using (false)
  with check (false);

drop policy if exists "No direct client access to KB embeddings" on public.kb_embeddings;
create policy "No direct client access to KB embeddings"
  on public.kb_embeddings for all
  using (false)
  with check (false);

create or replace function public.match_kb_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  chunk_text text,
  title text,
  source text,
  metadata jsonb,
  similarity double precision
)
language sql
security definer
set search_path = public
as $$
  select
    kb_embeddings.chunk_text,
    kb_documents.title,
    kb_documents.source,
    kb_embeddings.metadata,
    1 - (kb_embeddings.embedding <=> query_embedding) as similarity
  from public.kb_embeddings
  join public.kb_documents on kb_documents.id = kb_embeddings.document_id
  where kb_embeddings.embedding is not null
  order by kb_embeddings.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

revoke all on function public.match_kb_chunks(vector, int) from public;
revoke all on function public.match_kb_chunks(vector, int) from anon;
revoke all on function public.match_kb_chunks(vector, int) from authenticated;
grant execute on function public.match_kb_chunks(vector, int) to service_role;
