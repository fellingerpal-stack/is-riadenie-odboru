-- Návrh relačného dátového modelu pre budúce ITSM moduly.
-- Zatiaľ nespúšťať v produkcii bez potvrdenia procesov, číselníkov a oprávnení.

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  number bigint generated always as identity, title text not null, description text not null default '',
  requester_id uuid references public.profiles(id), assignee_id uuid references public.profiles(id),
  status text not null default 'new', priority text not null default 'medium', due_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  number bigint generated always as identity, title text not null, impact text, urgency text, priority text,
  status text not null default 'new', service_name text, owner_id uuid references public.profiles(id),
  detected_at timestamptz default now(), resolved_at timestamptz, resolution text not null default ''
);

create table if not exists public.changes (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  number bigint generated always as identity, title text not null, change_type text not null default 'normal',
  risk_level text, impact text, implementation_plan text, rollback_plan text, test_plan text,
  owner_id uuid references public.profiles(id), approver_id uuid references public.profiles(id),
  status text not null default 'draft', planned_start timestamptz, planned_end timestamptz, created_at timestamptz default now()
);

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  number bigint generated always as identity, title text not null, root_cause text, workaround text,
  known_error boolean not null default false, owner_id uuid references public.profiles(id),
  status text not null default 'open', created_at timestamptz default now(), closed_at timestamptz
);

create table if not exists public.iam_requests (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  request_type text not null, target_user text not null, system_name text not null, requested_role text,
  justification text, requester_id uuid references public.profiles(id), approver_id uuid references public.profiles(id),
  status text not null default 'draft', valid_from date, valid_to date, created_at timestamptz default now()
);
