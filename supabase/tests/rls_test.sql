\set ON_ERROR_STOP 0
insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','a@x.com','{"full_name":"Ann"}'),
 ('22222222-2222-2222-2222-222222222222','b@x.com','{}');
select 'profiles created: ' || count(*) from public.profiles;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
insert into objectives (quarter, title) values ('2026-Q4','one'),('2026-Q4','two'),('2026-Q4','three');
\echo '--- expect objective_limit error:'
insert into objectives (quarter, title) values ('2026-Q4','four');
insert into objectives (quarter, title) values ('2027-Q1','next quarter ok');
\echo '--- expect check violation (5 key results):'
insert into objectives (quarter, title, key_results) values ('2027-Q2','x','[1,2,3,4,5]');
insert into reviews (week, next) values ('2026-W41','[{"text":"a"}]');
\echo '--- expect check violation (4 commitments):'
insert into reviews (week, next) values ('2026-W42','[1,2,3,4]');
\echo '--- expect permission denied (email column):'
update profiles set email='hacked@x.com';
update profiles set display_name='Ann B';
select 'own profile name: ' || display_name from profiles;

select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'user2 sees objectives: ' || count(*) from objectives;
select 'user2 sees reviews: ' || count(*) from reviews;
select 'user2 sees profiles: ' || count(*) from profiles;
\echo '--- expect RLS violation inserting as another user:'
insert into objectives (user_id, quarter, title) values ('11111111-1111-1111-1111-111111111111','2027-Q3','spoof');
update objectives set title='pwned';
select 'rows user2 could change of user1: ' || (select count(*) from objectives where title='pwned');

reset role;
select 'user1 objectives intact: ' || count(*) from objectives where title in ('one','two','three');
set role anon;
select set_config('request.jwt.claim.sub','',false);
select 'anon sees objectives: ' || count(*) from objectives;
reset role;
delete from auth.users where id='11111111-1111-1111-1111-111111111111';
select 'after account delete, objectives left: ' || count(*) || ', reviews left: ' || (select count(*) from reviews) from objectives;
