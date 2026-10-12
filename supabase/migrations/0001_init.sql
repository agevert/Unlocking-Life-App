-- Threefold: initial schema
-- Every table is private to its owner through row-level security.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text,
  display_name      text not null default '' check (char_length(display_name) <= 80),
  timezone          text not null default 'Europe/Berlin' check (char_length(timezone) <= 64),
  review_weekday    smallint not null default 4 check (review_weekday between 0 and 6), -- 0 = Monday
  reminders_enabled boolean not null default true,
  last_reminder_week text,
  onboarded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Objectives (key results live inside as a validated JSON array)
-- ---------------------------------------------------------------
create table public.objectives (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quarter     text not null check (quarter ~ '^\d{4}-Q[1-4]$'),
  position    smallint not null default 0,
  title       text not null default '' check (char_length(title) <= 200),
  why         text not null default '' check (char_length(why) <= 400),
  key_results jsonb not null default '[]'::jsonb
              check (jsonb_typeof(key_results) = 'array' and jsonb_array_length(key_results) <= 4),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index objectives_user_quarter_idx on public.objectives (user_id, quarter, position);

-- ---------------------------------------------------------------
-- Weekly reviews (one per user per ISO week)
-- ---------------------------------------------------------------
create table public.reviews (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week         text not null check (week ~ '^\d{4}-W\d{2}$'),
  carried      jsonb not null default '[]'::jsonb check (jsonb_typeof(carried) = 'array'),
  reflection   jsonb not null default '{}'::jsonb check (jsonb_typeof(reflection) = 'object'),
  confidence   jsonb not null default '{}'::jsonb check (jsonb_typeof(confidence) = 'object'),
  kr_values    jsonb not null default '{}'::jsonb check (jsonb_typeof(kr_values) = 'object'),
  next         jsonb not null default '[]'::jsonb
               check (jsonb_typeof(next) = 'array' and jsonb_array_length(next) <= 3),
  sparring     text check (char_length(sparring) <= 6000),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, week)
);

-- ---------------------------------------------------------------
-- Sparring usage (rate limiting)
-- ---------------------------------------------------------------
create table public.spar_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week       text not null,
  created_at timestamptz not null default now()
);
create index spar_events_user_time_idx on public.spar_events (user_id, created_at desc);

-- ---------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch   before update on public.profiles   for each row execute function public.touch_updated_at();
create trigger objectives_touch before update on public.objectives for each row execute function public.touch_updated_at();
create trigger reviews_touch    before update on public.reviews    for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- The core rule, enforced in the database: three objectives per quarter
-- ---------------------------------------------------------------
create or replace function public.enforce_objective_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.objectives
      where user_id = new.user_id and quarter = new.quarter) >= 3 then
    raise exception 'objective_limit' using errcode = 'check_violation',
      hint = 'Three objectives per quarter is the limit.';
  end if;
  return new;
end $$;

create trigger objectives_limit before insert on public.objectives
  for each row execute function public.enforce_objective_limit();

-- ---------------------------------------------------------------
-- Create a profile for every new account
-- ---------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------
-- Row-level security: each person sees and changes only their own rows
-- ---------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.objectives  enable row level security;
alter table public.reviews     enable row level security;
alter table public.spar_events enable row level security;

create policy "own profile: read"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile: update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own objectives: read"   on public.objectives for select to authenticated using ((select auth.uid()) = user_id);
create policy "own objectives: insert" on public.objectives for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own objectives: update" on public.objectives for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own objectives: delete" on public.objectives for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own reviews: read"   on public.reviews for select to authenticated using ((select auth.uid()) = user_id);
create policy "own reviews: insert" on public.reviews for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own reviews: update" on public.reviews for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own reviews: delete" on public.reviews for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own spar events: read"   on public.spar_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "own spar events: insert" on public.spar_events for insert to authenticated with check ((select auth.uid()) = user_id);

-- Profiles are created by the trigger only; the email column is maintained by triggers.
revoke insert, update, delete on public.profiles from authenticated, anon;
grant update (display_name, timezone, review_weekday, reminders_enabled, onboarded_at)
  on public.profiles to authenticated;
