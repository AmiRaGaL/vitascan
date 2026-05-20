create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  symptom_session_id uuid not null references public.symptom_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint chat_threads_user_session_unique unique (user_id, symptom_session_id)
);

alter table public.chat_threads add column if not exists id uuid default gen_random_uuid();
alter table public.chat_threads add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.chat_threads add column if not exists symptom_session_id uuid references public.symptom_sessions(id) on delete cascade;
alter table public.chat_threads add column if not exists created_at timestamptz not null default now();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_sender_check check (sender in ('user', 'ai')),
  constraint chat_messages_content_check check (length(trim(content)) > 0)
);

alter table public.chat_messages add column if not exists id uuid default gen_random_uuid();
alter table public.chat_messages add column if not exists thread_id uuid references public.chat_threads(id) on delete cascade;
alter table public.chat_messages add column if not exists sender text;
alter table public.chat_messages add column if not exists content text;
alter table public.chat_messages add column if not exists created_at timestamptz not null default now();

update public.chat_messages
set sender = 'ai'
where sender = 'assistant';

alter table public.chat_messages
  drop constraint if exists chat_messages_sender_check;

alter table public.chat_messages
  add constraint chat_messages_sender_check check (sender in ('user', 'ai'));

create unique index if not exists chat_threads_user_session_unique_idx
  on public.chat_threads (user_id, symptom_session_id);

create index if not exists chat_threads_user_created_idx
  on public.chat_threads (user_id, created_at desc);

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at asc);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Users can read own chat threads" on public.chat_threads;
create policy "Users can read own chat threads"
  on public.chat_threads for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own chat threads" on public.chat_threads;
create policy "Users can insert own chat threads"
  on public.chat_threads for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own chat messages" on public.chat_messages;
create policy "Users can read own chat messages"
  on public.chat_messages for select
  using (
    exists (
      select 1
      from public.chat_threads
      where chat_threads.id = chat_messages.thread_id
        and chat_threads.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own chat messages" on public.chat_messages;
create policy "Users can insert own chat messages"
  on public.chat_messages for insert
  with check (
    exists (
      select 1
      from public.chat_threads
      where chat_threads.id = chat_messages.thread_id
        and chat_threads.user_id = auth.uid()
    )
  );

create or replace function public.increment_chat_usage(
  p_user_id uuid,
  p_date date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into public.usage_counters (user_id, date, chats_used)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date)
  do update set chats_used = public.usage_counters.chats_used + 1
  returning chats_used into new_count;

  return new_count;
end;
$$;

grant execute on function public.increment_chat_usage(uuid, date) to authenticated;
