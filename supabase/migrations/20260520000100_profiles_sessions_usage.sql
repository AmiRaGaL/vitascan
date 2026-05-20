create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  tier text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists id uuid;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists tier text not null default 'free';
alter table public.users add column if not exists created_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz not null default now();

create table if not exists public.health_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  age int,
  sex_at_birth text,
  height_cm int,
  weight_kg numeric,
  chronic_conditions jsonb not null default '[]'::jsonb,
  medications jsonb not null default '[]'::jsonb,
  allergies jsonb not null default '[]'::jsonb,
  diet_prefs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_profiles_age_check check (age is null or age between 0 and 130),
  constraint health_profiles_height_check check (height_cm is null or height_cm between 30 and 275),
  constraint health_profiles_weight_check check (weight_kg is null or weight_kg between 1 and 700),
  constraint health_profiles_sex_check check (
    sex_at_birth is null or sex_at_birth in ('male', 'female', 'other')
  ),
  constraint health_profiles_arrays_check check (
    jsonb_typeof(chronic_conditions) = 'array'
    and jsonb_typeof(medications) = 'array'
    and jsonb_typeof(allergies) = 'array'
    and jsonb_typeof(diet_prefs) = 'array'
  )
);

alter table public.health_profiles add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.health_profiles add column if not exists age int;
alter table public.health_profiles add column if not exists sex_at_birth text;
alter table public.health_profiles add column if not exists height_cm int;
alter table public.health_profiles add column if not exists weight_kg numeric;
alter table public.health_profiles add column if not exists chronic_conditions jsonb not null default '[]'::jsonb;
alter table public.health_profiles add column if not exists medications jsonb not null default '[]'::jsonb;
alter table public.health_profiles add column if not exists allergies jsonb not null default '[]'::jsonb;
alter table public.health_profiles add column if not exists diet_prefs jsonb not null default '[]'::jsonb;
alter table public.health_profiles add column if not exists created_at timestamptz not null default now();
alter table public.health_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.symptom_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  body_area_id uuid,
  symptom_category_id uuid,
  user_answers jsonb not null default '[]'::jsonb,
  health_profile_snapshot jsonb,
  status text not null default 'completed',
  triage_level text,
  specialty_suggestion text,
  llm_confidence numeric,
  red_flags_detected boolean not null default false,
  initial_input text,
  summary text,
  created_at timestamptz not null default now(),
  constraint symptom_sessions_answers_check check (jsonb_typeof(user_answers) = 'array'),
  constraint symptom_sessions_status_check check (status in ('completed')),
  constraint symptom_sessions_triage_check check (
    triage_level is null or triage_level in ('emergency', 'urgent_care', 'pcp', 'home')
  )
);

alter table public.symptom_sessions add column if not exists id uuid default gen_random_uuid();
alter table public.symptom_sessions add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.symptom_sessions add column if not exists body_area_id uuid;
alter table public.symptom_sessions add column if not exists symptom_category_id uuid;
alter table public.symptom_sessions add column if not exists user_answers jsonb not null default '[]'::jsonb;
alter table public.symptom_sessions add column if not exists health_profile_snapshot jsonb;
alter table public.symptom_sessions add column if not exists status text not null default 'completed';
alter table public.symptom_sessions add column if not exists triage_level text;
alter table public.symptom_sessions add column if not exists specialty_suggestion text;
alter table public.symptom_sessions add column if not exists llm_confidence numeric;
alter table public.symptom_sessions add column if not exists red_flags_detected boolean not null default false;
alter table public.symptom_sessions add column if not exists initial_input text;
alter table public.symptom_sessions add column if not exists summary text;
alter table public.symptom_sessions add column if not exists created_at timestamptz not null default now();

create table if not exists public.usage_counters (
  user_id uuid references public.users(id) on delete cascade,
  date date not null,
  symptom_checks_used int not null default 0,
  chats_used int not null default 0,
  primary key (user_id, date),
  constraint usage_counters_nonnegative_check check (
    symptom_checks_used >= 0 and chats_used >= 0
  )
);

alter table public.usage_counters add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.usage_counters add column if not exists date date;
alter table public.usage_counters add column if not exists symptom_checks_used int not null default 0;
alter table public.usage_counters add column if not exists chats_used int not null default 0;

create index if not exists symptom_sessions_user_created_idx
  on public.symptom_sessions (user_id, created_at desc);

alter table public.users enable row level security;
alter table public.health_profiles enable row level security;
alter table public.symptom_sessions enable row level security;
alter table public.usage_counters enable row level security;

drop policy if exists "Users can read own user row" on public.users;
create policy "Users can read own user row"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own user row" on public.users;
create policy "Users can insert own user row"
  on public.users for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own user row" on public.users;
create policy "Users can update own user row"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own health profile" on public.health_profiles;
create policy "Users can read own health profile"
  on public.health_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own health profile" on public.health_profiles;
create policy "Users can insert own health profile"
  on public.health_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own health profile" on public.health_profiles;
create policy "Users can update own health profile"
  on public.health_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own symptom sessions" on public.symptom_sessions;
create policy "Users can read own symptom sessions"
  on public.symptom_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own symptom sessions" on public.symptom_sessions;
create policy "Users can insert own symptom sessions"
  on public.symptom_sessions for insert
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists "Users can read own usage counters" on public.usage_counters;
create policy "Users can read own usage counters"
  on public.usage_counters for select
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists health_profiles_set_updated_at on public.health_profiles;
create trigger health_profiles_set_updated_at
  before update on public.health_profiles
  for each row execute function public.set_updated_at();

create or replace function public.increment_symptom_usage(
  p_user_id uuid,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usage_counters (user_id, date, symptom_checks_used)
  values (p_user_id, p_date, 1)
  on conflict (user_id, date)
  do update set symptom_checks_used = public.usage_counters.symptom_checks_used + 1;
end;
$$;

grant execute on function public.increment_symptom_usage(uuid, date) to authenticated;
