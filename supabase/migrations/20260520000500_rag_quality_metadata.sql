alter table public.kb_documents
  add column if not exists emergency_red_flags text[] not null default '{}';

alter table public.kb_documents
  add column if not exists last_reviewed date;

alter table public.symptom_sessions
  add column if not exists rag_references jsonb;
