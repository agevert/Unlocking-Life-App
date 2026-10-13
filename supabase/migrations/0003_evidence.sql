-- Unlocking Life: durable evidence / deliberate-practice log
-- Additive only.

create table if not exists public.evidence_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  objective_id   uuid references public.objectives (id) on delete set null,
  kr_id          text check (kr_id is null or char_length(kr_id) <= 40),
  kind           text not null default 'practice' check (kind in ('practice', 'experiment', 'real_world')),
  practice       text not null default '' check (char_length(practice) <= 1000),
  evidence       text not null default '' check (char_length(evidence) <= 4000),
  difficulty     smallint not null default 1 check (difficulty between 1 and 5),
  coach_feedback text check (coach_feedback is null or char_length(coach_feedback) <= 4000),
  next_practice  text check (next_practice is null or char_length(next_practice) <= 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists evidence_entries_user_time_idx
  on public.evidence_entries (user_id, created_at desc);
create index if not exists evidence_entries_objective_idx
  on public.evidence_entries (user_id, objective_id, created_at desc);

drop trigger if exists evidence_entries_touch on public.evidence_entries;
create trigger evidence_entries_touch before update on public.evidence_entries
  for each row execute function public.touch_updated_at();

alter table public.evidence_entries enable row level security;

drop policy if exists "own evidence: read" on public.evidence_entries;
drop policy if exists "own evidence: insert" on public.evidence_entries;
drop policy if exists "own evidence: update" on public.evidence_entries;
drop policy if exists "own evidence: delete" on public.evidence_entries;
create policy "own evidence: read" on public.evidence_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "own evidence: insert" on public.evidence_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own evidence: update" on public.evidence_entries for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own evidence: delete" on public.evidence_entries for delete to authenticated using ((select auth.uid()) = user_id);
