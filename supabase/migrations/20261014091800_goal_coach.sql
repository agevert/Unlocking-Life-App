-- Goal Coach: durable accepted proposals and separate, atomic interview quota.
-- Additive; no interview transcripts or unaccepted proposals are stored.

alter table public.objectives
  add column if not exists bottleneck text not null default '' check (char_length(bottleneck) <= 1000),
  add column if not exists first_practice text not null default '' check (char_length(first_practice) <= 1000);

create table public.goal_coach_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index goal_coach_events_user_time_idx on public.goal_coach_events (user_id, created_at desc);
alter table public.goal_coach_events enable row level security;
create policy "own goal coach usage: read" on public.goal_coach_events
  for select to authenticated using ((select auth.uid()) = user_id);

-- End users may inspect their own usage, but cannot forge or delete reservations.
revoke all on public.goal_coach_events from public, anon, authenticated;
grant select on public.goal_coach_events to authenticated;
grant select, insert on public.goal_coach_events to service_role;
grant usage, select on sequence public.goal_coach_events_id_seq to service_role;

-- The route authenticates with getUser, then uses the server's service key for this RPC only.
-- Invoker semantics and restricted EXECUTE prevent callers choosing their own limit or user id.
create function public.reserve_goal_coach_request(p_user_id uuid, p_limit integer default 40)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  reservation_time timestamptz;
begin
  if p_user_id is null or p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid_goal_coach_quota' using errcode = 'invalid_parameter_value';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('goal_coach:' || p_user_id::text, 0));
  reservation_time := pg_catalog.clock_timestamp();
  if (select count(*) from public.goal_coach_events
      where user_id = p_user_id and created_at > reservation_time - interval '24 hours') >= p_limit then
    return false;
  end if;
  insert into public.goal_coach_events (user_id, created_at) values (p_user_id, reservation_time);
  return true;
end $$;
revoke all on function public.reserve_goal_coach_request(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_goal_coach_request(uuid, integer) to service_role;

-- Existing manual and coached insertions share the same three-goal invariant, even when concurrent.
create or replace function public.enforce_objective_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('objectives:' || new.user_id::text || ':' || new.quarter, 0)
  );
  if (select count(*) from public.objectives
      where user_id = new.user_id and quarter = new.quarter) >= 3 then
    raise exception 'objective_limit' using errcode = 'check_violation',
      hint = 'Three objectives per quarter is the limit.';
  end if;
  return new;
end $$;
