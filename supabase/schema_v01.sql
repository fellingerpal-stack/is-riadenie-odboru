-- IS Riadenie odboru v0.1 – základ pre Supabase Auth a ukladanie verzií dát.
-- Spustite v Supabase SQL Editore. Aplikácia v release 0.1 používa localStorage;
-- tento model je pripravený pre zapojenie cloudovej synchronizácie v ďalšom release.

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
  role text not null default 'viewer' check (role in ('admin','manager','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null default 1,
  payload jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  is_current boolean not null default true
);
create index if not exists app_snapshots_org_current_idx on public.app_snapshots(organization_id,is_current,created_at desc);

create or replace function public.current_organization_id()
returns uuid language sql stable security definer set search_path=public as $$
  select organization_id from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path=public as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.app_snapshots enable row level security;

create policy "organization members can read organization"
on public.organizations for select to authenticated
using (id = public.current_organization_id());

create policy "members can read profiles in organization"
on public.profiles for select to authenticated
using (organization_id = public.current_organization_id());

create policy "admins manage profiles"
on public.profiles for all to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'admin')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'admin');

create policy "members read snapshots"
on public.app_snapshots for select to authenticated
using (organization_id = public.current_organization_id());

create policy "managers write snapshots"
on public.app_snapshots for insert to authenticated
with check (organization_id = public.current_organization_id() and public.current_app_role() in ('admin','manager'));

create policy "managers update snapshots"
on public.app_snapshots for update to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() in ('admin','manager'))
with check (organization_id = public.current_organization_id() and public.current_app_role() in ('admin','manager'));

insert into public.organizations(name,slug)
values ('CVTI SR','cvti-sr')
on conflict (slug) do nothing;
