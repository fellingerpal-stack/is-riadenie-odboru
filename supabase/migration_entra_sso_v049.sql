-- IS Riadenie odboru v0.49.0
-- Microsoft Entra ID SSO + bezpecny auto-provisioning zamestnancov.
-- Spustit v Supabase SQL Editore PRED zapnutim Azure providera.
-- Migracia je idempotentna a nemeni existujuce admin/manager/resolver roly.

begin;

-- Employee je ServiceDesk-only rola. Serverovy scope musi byt rovnako prisny ako frontend.
create or replace function public.default_access_scopes(p_role text, p_department text)
returns jsonb
language sql
immutable
as $$
  select case
    when coalesce(p_role,'viewer') = 'admin' then '{"oit":"write","oris":"write","shared":"write"}'::jsonb
    when coalesce(p_role,'viewer') = 'employee' then '{"oit":"none","oris":"none","shared":"none"}'::jsonb
    when lower(coalesce(p_department,'')) like '%3.1%' or lower(coalesce(p_department,'')) like '%oit%' then
      jsonb_build_object(
        'oit', case when coalesce(p_role,'viewer') <> 'viewer' then 'write' else 'read' end,
        'oris', 'read',
        'shared', case when coalesce(p_role,'viewer') <> 'viewer' then 'write' else 'read' end
      )
    when lower(coalesce(p_department,'')) like '%3.2%' or lower(coalesce(p_department,'')) like '%oris%' then
      jsonb_build_object(
        'oit', 'read',
        'oris', case when coalesce(p_role,'viewer') <> 'viewer' then 'write' else 'read' end,
        'shared', case when coalesce(p_role,'viewer') <> 'viewer' then 'write' else 'read' end
      )
    else '{"oit":"read","oris":"read","shared":"read"}'::jsonb
  end;
$$;

-- Existujuci employee pouzivatelia dostanu explicitny least-privilege scope.
update public.profiles p
set access_scopes = '{"oit":"none","oris":"none","shared":"none"}'::jsonb,
    updated_at = now()
where p.role = 'employee'
  and coalesce(p.access_scopes, '{}'::jsonb) <> '{"oit":"none","oris":"none","shared":"none"}'::jsonb;

-- Pri novom Supabase Auth pouzivatelovi vytvor profil.
-- Pri Azure/Entra prihlaseni je rola VZDY employee. Rolu resolver/manager/admin meni az administrator aplikacie.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_provider text := lower(coalesce(new.raw_app_meta_data->>'provider', 'email'));
  v_department text := coalesce(new.raw_user_meta_data->>'department', '');
  v_role text;
  v_scopes jsonb;
  v_full_name text;
begin
  select o.id into v_org_id
  from public.organizations o
  where o.slug = 'cvti-sr'
  limit 1;

  if v_org_id is null then
    insert into public.organizations (name, slug)
    values ('CVTI SR', 'cvti-sr')
    returning id into v_org_id;
  end if;

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'preferred_username'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Pouzivatel'
  );

  if v_provider = 'azure' then
    v_role := 'employee';
    v_scopes := '{"oit":"none","oris":"none","shared":"none"}'::jsonb;
  else
    v_role := lower(coalesce(nullif(new.raw_user_meta_data->>'requested_role', ''), 'employee'));
    if v_role not in ('admin','manager','resolver','employee','viewer') then
      v_role := 'employee';
    end if;
    v_scopes := coalesce(new.raw_user_meta_data->'access_scopes', public.default_access_scopes(v_role, v_department));
  end if;

  insert into public.profiles (
    id,
    organization_id,
    full_name,
    email,
    department,
    job_title,
    phone,
    role,
    access_scopes,
    is_active,
    invited_at,
    invite_expires_at,
    accepted_at,
    last_login_at,
    created_at,
    updated_at
  ) values (
    new.id,
    v_org_id,
    v_full_name,
    lower(coalesce(new.email, '')),
    v_department,
    coalesce(new.raw_user_meta_data->>'job_title', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    v_role,
    v_scopes,
    true,
    now(),
    case when v_provider = 'azure' then null else now() + interval '24 hours' end,
    case when v_provider = 'azure' then now() else null end,
    null,
    now(),
    now()
  )
  on conflict (id) do update set
    email = case when excluded.email <> '' then excluded.email else public.profiles.email end,
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    access_scopes = case
      when public.profiles.role = 'employee' then '{"oit":"none","oris":"none","shared":"none"}'::jsonb
      else public.profiles.access_scopes
    end,
    is_active = public.profiles.is_active,
    accepted_at = case
      when v_provider = 'azure' then coalesce(public.profiles.accepted_at, now())
      else public.profiles.accepted_at
    end,
    invite_expires_at = case
      when v_provider = 'azure' then null
      else public.profiles.invite_expires_at
    end,
    updated_at = now();

  return new;
end;
$$;

-- Obnovime trigger, aby bola produkcna DB v jednoznacnom stave aj po starsich migraciach.
drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

notify pgrst, 'reload schema';

commit;

-- Readiness kontrola: ocakavane TRUE / TRUE / TRUE.
select
  public.default_access_scopes('employee','Odbor 3.1') = '{"oit":"none","oris":"none","shared":"none"}'::jsonb as employee_scope_hardened,
  to_regprocedure('public.handle_new_auth_user()') is not null as auth_profile_function_ready,
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and t.tgname = 'on_auth_user_created_create_profile'
      and not t.tgisinternal
  ) as auth_profile_trigger_ready;
