-- Threefold: the aspiration layer above the quarter
-- One long-term aspiration per person (a vision, up to three foundations, open strategic questions),
-- and each objective can be tagged to one foundation, at most one objective per foundation per quarter.
-- Additive only: safe to run before deploying the code that uses it.

-- ---------------------------------------------------------------
-- Aspiration (one row per person)
-- ---------------------------------------------------------------
create table if not exists public.aspirations (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  horizon_year smallint check (horizon_year between 2000 and 2200),
  vision       text not null default '' check (char_length(vision) <= 1200),
  foundations  jsonb not null default '[]'::jsonb
               check (jsonb_typeof(foundations) = 'array' and jsonb_array_length(foundations) <= 3),
  questions    jsonb not null default '[]'::jsonb
               check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 5),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists aspirations_touch on public.aspirations;
create trigger aspirations_touch before update on public.aspirations
  for each row execute function public.touch_updated_at();

alter table public.aspirations enable row level security;

drop policy if exists "own aspiration: read" on public.aspirations;
drop policy if exists "own aspiration: insert" on public.aspirations;
drop policy if exists "own aspiration: update" on public.aspirations;
drop policy if exists "own aspiration: delete" on public.aspirations;
create policy "own aspiration: read"   on public.aspirations for select to authenticated using ((select auth.uid()) = user_id);
create policy "own aspiration: insert" on public.aspirations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own aspiration: update" on public.aspirations for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own aspiration: delete" on public.aspirations for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------
-- Objectives: which foundation each one serves
-- ---------------------------------------------------------------
alter table public.objectives
  add column if not exists foundation text check (foundation is null or char_length(foundation) <= 40);

-- The rule, enforced in the database: one objective per foundation per quarter.
create unique index if not exists objectives_one_per_foundation_idx
  on public.objectives (user_id, quarter, foundation) where foundation is not null;
