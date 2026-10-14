-- Run only against a throwaway database after the migrations and local auth stub.
-- Every assertion raises on failure; the transaction leaves no test data behind.
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'coach-test-a@example.invalid'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'coach-test-b@example.invalid');

set local role service_role;
do $$
begin
  if not public.reserve_goal_coach_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2) then
    raise exception 'first reservation rejected';
  end if;
  if not public.reserve_goal_coach_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2) then
    raise exception 'second reservation rejected';
  end if;
  if public.reserve_goal_coach_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2) then
    raise exception 'quota exceeded';
  end if;
  if not public.reserve_goal_coach_request('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 2) then
    raise exception 'quota leaked across users';
  end if;
end $$;
reset role;

-- A rolling-day quota becomes available again when an event expires.
update public.goal_coach_events set created_at = now() - interval '25 hours'
  where id = (select min(id) from public.goal_coach_events
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
set local role service_role;
do $$
begin
  if not public.reserve_goal_coach_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2) then
    raise exception 'expired reservation still counted';
  end if;
end $$;
reset role;

-- Only the trusted server may reserve or forge usage.
do $$
begin
  if has_function_privilege('authenticated', 'public.reserve_goal_coach_request(uuid, integer)', 'EXECUTE')
    or has_function_privilege('anon', 'public.reserve_goal_coach_request(uuid, integer)', 'EXECUTE') then
    raise exception 'quota RPC exposed to clients';
  end if;
  if has_table_privilege('authenticated', 'public.goal_coach_events', 'INSERT')
    or has_table_privilege('authenticated', 'public.goal_coach_events', 'DELETE')
    or has_table_privilege('anon', 'public.goal_coach_events', 'SELECT') then
    raise exception 'quota table writable or public';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
do $$
begin
  if (select count(*) from public.goal_coach_events) <> 3 then
    raise exception 'own usage RLS incorrect';
  end if;
end $$;

-- Existing manual creation and accepted coach metadata share the same goal limit.
insert into public.objectives (quarter, title) values ('2026-Q4', 'Manual goal');
insert into public.objectives (quarter, title, bottleneck, first_practice)
  values ('2026-Q4', 'Coached goal', 'Weak diagnosis', 'Test one diagnosis with a business owner');
insert into public.objectives (quarter, title) values ('2026-Q4', 'Third goal');
do $$
begin
  begin
    insert into public.objectives (quarter, title) values ('2026-Q4', 'Fourth goal');
    raise exception 'three-goal invariant violated';
  exception when check_violation then
    if sqlerrm <> 'objective_limit' then raise; end if;
  end;
  if not exists (select 1 from public.objectives
    where title = 'Coached goal' and bottleneck = 'Weak diagnosis'
      and first_practice = 'Test one diagnosis with a business owner') then
    raise exception 'accepted coaching metadata lost';
  end if;
  begin
    update public.objectives set bottleneck = repeat('x', 1001) where title = 'Coached goal';
    raise exception 'bottleneck length constraint missing';
  exception when check_violation then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
do $$
begin
  if (select count(*) from public.goal_coach_events) <> 1 then
    raise exception 'other user usage exposed';
  end if;
  if exists (select 1 from public.objectives) then
    raise exception 'other user goals exposed';
  end if;
end $$;

reset role;
delete from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  if exists (select 1 from public.goal_coach_events
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then
    raise exception 'account deletion left coaching usage behind';
  end if;
end $$;

rollback;
