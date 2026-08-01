-- IS Riadenie odboru v0.2
-- Supabase Auth, organizácia, používateľské roly, RLS a verzované dátové snapshoty.
-- Spustite celý skript v Supabase SQL Editore.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'manager', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bezpečný upgrade zo staršieho návrhu schémy.
alter table public.profiles add column if not exists email text not null default '';

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

create index if not exists profiles_organization_idx
  on public.profiles (organization_id);
create index if not exists app_snapshots_org_current_idx
  on public.app_snapshots (organization_id, is_current, created_at desc);

insert into public.organizations (name, slug)
values ('CVTI SR', 'cvti-sr')
on conflict (slug) do update set name = excluded.name;

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

-- Jediný podporovaný zápis dát aplikácie. Vytvorí novú verziu a predchádzajúcu označí ako historickú.
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
  where profiles.id = v_user_id
    and is_active = true;

  if v_org_id is null then
    raise exception 'Aktívny používateľský profil nebol nájdený.';
  end if;

  if v_role not in ('admin', 'manager') then
    raise exception 'Používateľ nemá oprávnenie ukladať dáta.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_org_id::text));

  select coalesce(max(app_snapshots.version), 0) + 1
    into v_version
  from public.app_snapshots
  where organization_id = v_org_id;

  update public.app_snapshots
    set is_current = false
  where organization_id = v_org_id
    and is_current = true;

  insert into public.app_snapshots (
    organization_id,
    version,
    payload,
    created_by,
    is_current
  ) values (
    v_org_id,
    v_version,
    p_payload,
    v_user_id,
    true
  )
  returning app_snapshots.id, app_snapshots.created_at
    into v_id, v_created_at;

  return query select v_id, v_version, v_created_at, v_user_id;
end;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.app_snapshots enable row level security;

-- Idempotentné vytvorenie politík.
drop policy if exists "organization members can read organization" on public.organizations;
create policy "organization members can read organization"
on public.organizations
for select
to authenticated
using (id = (select public.current_organization_id()));

drop policy if exists "members can read profiles in organization" on public.profiles;
create policy "members can read profiles in organization"
on public.profiles
for select
to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles"
on public.profiles
for update
to authenticated
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
on public.app_snapshots
for select
to authenticated
using (organization_id = (select public.current_organization_id()));

-- Priamy insert/update/delete snapshotov z klienta nie je povolený.
-- Zápis prebieha iba cez security-definer RPC save_app_snapshot.

revoke all on function public.current_organization_id() from public;
revoke all on function public.current_app_role() from public;
revoke all on function public.save_app_snapshot(jsonb) from public;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.save_app_snapshot(jsonb) to authenticated;

grant select on public.organizations to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.app_snapshots to authenticated;

-- Kontrolný výstup po spustení.
select id, name, slug from public.organizations where slug = 'cvti-sr';
