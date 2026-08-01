-- IS Riadenie odboru v0.11.0
-- Kompletné idempotentné nastavenie Supabase: organizácia, profily, roly,
-- spoločný dátový snapshot, audit, RLS a automatický profil nového používateľa.
-- Spustite celý skript v Supabase SQL Editore.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

insert into public.organizations (name, slug)
values ('CVTI SR', 'cvti-sr')
on conflict (slug) do update set name = excluded.name;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  department text not null default '',
  job_title text not null default '',
  phone text not null default '',
  role text not null default 'employee',
  is_active boolean not null default true,
  last_login_at timestamptz,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists department text not null default '';
alter table public.profiles add column if not exists job_title text not null default '';
alter table public.profiles add column if not exists phone text not null default '';
alter table public.profiles add column if not exists last_login_at timestamptz;
alter table public.profiles add column if not exists invited_at timestamptz;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'manager', 'resolver', 'employee', 'viewer'));

create table if not exists public.app_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null,
  payload jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  is_current boolean not null default true,
  constraint app_snapshots_org_version_unique unique (organization_id, version)
);

create table if not exists public.user_admin_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default '',
  target_user_id uuid references auth.users(id) on delete set null,
  target_user_name text not null default '',
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists profiles_organization_idx
  on public.profiles (organization_id);
create index if not exists app_snapshots_org_current_idx
  on public.app_snapshots (organization_id, is_current, created_at desc);
create index if not exists user_admin_audit_org_created_idx
  on public.user_admin_audit (organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = (select auth.uid())
    and is_active = true
  limit 1
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and is_active = true
  limit 1
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select id into v_org_id
  from public.organizations
  where slug = 'cvti-sr'
  limit 1;

  if v_org_id is null then
    insert into public.organizations (name, slug)
    values ('CVTI SR', 'cvti-sr')
    returning id into v_org_id;
  end if;

  insert into public.profiles (
    id, organization_id, full_name, email, department, job_title,
    phone, role, is_active, invited_at
  ) values (
    new.id,
    v_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'job_title', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'employee',
    true,
    now()
  ) on conflict (id) do update set
    email = excluded.email,
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.touch_last_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set last_login_at = now(), updated_at = now()
   where id = (select auth.uid())
     and is_active = true;
end;
$$;

create or replace function public.log_user_admin_action(
  p_action text,
  p_target_user_id uuid default null,
  p_target_user_name text default '',
  p_detail text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_org_id uuid;
  v_actor_name text;
  v_role text;
  v_id uuid;
begin
  select organization_id, full_name, role
    into v_org_id, v_actor_name, v_role
  from public.profiles
  where id = v_actor_id and is_active = true;

  if v_org_id is null or v_role <> 'admin' then
    raise exception 'Audit administrácie môže zapisovať iba aktívny administrátor.';
  end if;

  insert into public.user_admin_audit (
    organization_id, actor_id, actor_name, target_user_id,
    target_user_name, action, detail
  ) values (
    v_org_id, v_actor_id, coalesce(v_actor_name, ''), p_target_user_id,
    coalesce(p_target_user_name, ''), p_action, coalesce(p_detail, '')
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.save_app_snapshot(p_payload jsonb)
returns table (
  id uuid,
  version integer,
  created_at timestamptz,
  created_by uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_role text;
  v_version integer;
  v_id uuid;
  v_created_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Používateľ nie je prihlásený.';
  end if;

  select organization_id, role
    into v_org_id, v_role
  from public.profiles
  where id = v_user_id and is_active = true;

  if v_org_id is null then
    raise exception 'Aktívny používateľský profil nebol nájdený.';
  end if;

  if v_role not in ('admin', 'manager', 'resolver') then
    raise exception 'Používateľ nemá oprávnenie ukladať dáta.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_org_id::text));

  select coalesce(max(s.version), 0) + 1
    into v_version
  from public.app_snapshots as s
  where s.organization_id = v_org_id;

  update public.app_snapshots
     set is_current = false
   where organization_id = v_org_id and is_current = true;

  insert into public.app_snapshots (
    organization_id, version, payload, created_by, is_current
  ) values (
    v_org_id, v_version, p_payload, v_user_id, true
  ) returning app_snapshots.id, app_snapshots.created_at
    into v_id, v_created_at;

  return query select v_id, v_version, v_created_at, v_user_id;
end;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.app_snapshots enable row level security;
alter table public.user_admin_audit enable row level security;

drop policy if exists "organization members can read organization" on public.organizations;
create policy "organization members can read organization"
on public.organizations for select to authenticated
using (id = (select public.current_organization_id()));

drop policy if exists "members can read profiles in organization" on public.profiles;
create policy "members can read profiles in organization"
on public.profiles for select to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles"
on public.profiles for update to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) = 'admin'
)
with check (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) = 'admin'
);

drop policy if exists "members read snapshots" on public.app_snapshots;
create policy "members read snapshots"
on public.app_snapshots for select to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "admins read user audit" on public.user_admin_audit;
create policy "admins read user audit"
on public.user_admin_audit for select to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) = 'admin'
);

revoke all on function public.current_organization_id() from public;
revoke all on function public.current_app_role() from public;
revoke all on function public.touch_last_login() from public;
revoke all on function public.log_user_admin_action(text, uuid, text, text) from public;
revoke all on function public.save_app_snapshot(jsonb) from public;

grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.touch_last_login() to authenticated;
grant execute on function public.log_user_admin_action(text, uuid, text, text) to authenticated;
grant execute on function public.save_app_snapshot(jsonb) to authenticated;

grant select on public.organizations to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.app_snapshots to authenticated;
grant select on public.user_admin_audit to authenticated;

-- Kontrola po spustení.
select id, name, slug from public.organizations where slug = 'cvti-sr';
