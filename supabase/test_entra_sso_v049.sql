-- v0.49.0 – diagnostika po prvom Microsoft Entra prihláseni
-- 1) Readiness konfiguracie DB vrstvy
select
  public.default_access_scopes('employee','Odbor 3.1') = '{"oit":"none","oris":"none","shared":"none"}'::jsonb as employee_scope_hardened,
  to_regprocedure('public.handle_new_auth_user()') is not null as auth_profile_function_ready,
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='auth' and c.relname='users'
      and t.tgname='on_auth_user_created_create_profile'
      and not t.tgisinternal
  ) as auth_profile_trigger_ready;

-- 2) Poslednych 20 Auth pouzivatelov + provideri.
select
  u.created_at,
  u.email,
  coalesce(i.provider, u.raw_app_meta_data->>'provider', '') as auth_provider,
  p.full_name,
  p.role,
  p.access_scopes,
  p.is_active
from auth.users u
left join lateral (
  select ai.provider
  from auth.identities ai
  where ai.user_id=u.id
  order by ai.created_at desc
  limit 1
) i on true
left join public.profiles p on p.id=u.id
order by u.created_at desc
limit 20;

-- Očakávané pre nový Entra účet:
-- auth_provider = azure
-- role = employee
-- access_scopes = {"oit":"none","oris":"none","shared":"none"}
-- is_active = true
