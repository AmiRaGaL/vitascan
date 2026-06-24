create extension if not exists vector;

create table if not exists public.medical_chunks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null,
  chunk_text text not null,
  embedding vector(384),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_trace_logs (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null,
  session_id text,
  user_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'pending',
  metrics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists medical_chunks_embedding_idx
  on public.medical_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists ai_trace_logs_trace_id_idx
  on public.ai_trace_logs (trace_id);

create index if not exists eval_runs_started_at_idx
  on public.eval_runs (started_at desc);

create or replace function public.match_medical_chunks(
  query_embedding vector(384),
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  source text,
  chunk_text text,
  metadata jsonb,
  similarity double precision
)
language sql
security definer
set search_path = public
as $$
  select
    medical_chunks.id,
    medical_chunks.title,
    medical_chunks.source,
    medical_chunks.chunk_text,
    medical_chunks.metadata,
    1 - (medical_chunks.embedding <=> query_embedding) as similarity
  from public.medical_chunks
  where medical_chunks.embedding is not null
  order by medical_chunks.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

revoke all on function public.match_medical_chunks(vector, int) from public;
revoke all on function public.match_medical_chunks(vector, int) from anon;
revoke all on function public.match_medical_chunks(vector, int) from authenticated;
grant execute on function public.match_medical_chunks(vector, int) to service_role;
