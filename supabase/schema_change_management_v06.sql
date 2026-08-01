-- IS Riadenie odboru v0.6 – samostatný dátový model Change managementu.
-- Predpokladá schema_v02.sql. Aplikácia v0.6 naďalej podporuje aj snapshotový režim.

create extension if not exists pgcrypto;

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  change_number text not null,
  title text not null,
  description text not null default '',
  change_type text not null default 'Normálna' check (change_type in ('Štandardná','Normálna','Núdzová')),
  category text not null default 'Iné',
  service_key text not null default '',
  requester_id uuid references public.profiles(id) on delete set null,
  requester_name text not null default '',
  owner_id uuid references public.profiles(id) on delete set null,
  owner_name text not null default '',
  approver_id uuid references public.profiles(id) on delete set null,
  priority text not null default 'Stredná',
  risk_level text not null default 'Stredné',
  impact text not null default 'Jeden útvar',
  status text not null default 'Návrh',
  reason text not null default '',
  planned_start timestamptz,
  planned_end timestamptz,
  outage_minutes integer not null default 0 check (outage_minutes >= 0),
  implementation_plan text not null default '',
  test_plan text not null default '',
  rollback_plan text not null default '',
  communication_plan text not null default '',
  affected_systems text not null default '',
  linked_project_key text not null default '',
  linked_task_key text not null default '',
  validation_result text not null default '',
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, change_number)
);

create table if not exists public.change_ticket_links (
  change_id uuid not null references public.change_requests(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (change_id, ticket_id)
);

create table if not exists public.change_approvals (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references public.change_requests(id) on delete cascade,
  approval_role text not null,
  approver_id uuid references public.profiles(id) on delete set null,
  approver_name text not null default '',
  decision text not null default 'Čaká' check (decision in ('Čaká','Schválené','Zamietnuté')),
  note text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.change_history (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references public.change_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default '',
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists change_requests_org_status_idx on public.change_requests (organization_id, status, planned_start);
create index if not exists change_requests_service_idx on public.change_requests (organization_id, service_key, updated_at desc);
create index if not exists change_approvals_change_idx on public.change_approvals (change_id, decision);
create index if not exists change_history_change_idx on public.change_history (change_id, created_at desc);

drop trigger if exists change_requests_set_updated_at on public.change_requests;
create trigger change_requests_set_updated_at before update on public.change_requests
for each row execute function public.set_updated_at();

alter table public.change_requests enable row level security;
alter table public.change_ticket_links enable row level security;
alter table public.change_approvals enable row level security;
alter table public.change_history enable row level security;

drop policy if exists "org reads changes" on public.change_requests;
create policy "org reads changes" on public.change_requests for select to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "members create changes" on public.change_requests;
create policy "members create changes" on public.change_requests for insert to authenticated
with check (organization_id = (select public.current_organization_id()));

drop policy if exists "managers update changes" on public.change_requests;
create policy "managers update changes" on public.change_requests for update to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager'))
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager'));

drop policy if exists "admins delete changes" on public.change_requests;
create policy "admins delete changes" on public.change_requests for delete to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) = 'admin');

-- Podriadené záznamy sú dostupné iba cez zmenu patriacu do aktuálnej organizácie.
drop policy if exists "org manages change approvals" on public.change_approvals;
create policy "org manages change approvals" on public.change_approvals for all to authenticated
using (exists (select 1 from public.change_requests c where c.id = change_id and c.organization_id = (select public.current_organization_id())))
with check (exists (select 1 from public.change_requests c where c.id = change_id and c.organization_id = (select public.current_organization_id())));

drop policy if exists "org manages change history" on public.change_history;
create policy "org manages change history" on public.change_history for all to authenticated
using (exists (select 1 from public.change_requests c where c.id = change_id and c.organization_id = (select public.current_organization_id())))
with check (exists (select 1 from public.change_requests c where c.id = change_id and c.organization_id = (select public.current_organization_id())));

drop policy if exists "org manages change ticket links" on public.change_ticket_links;
create policy "org manages change ticket links" on public.change_ticket_links for all to authenticated
using (exists (select 1 from public.change_requests c where c.id = change_id and c.organization_id = (select public.current_organization_id())))
with check (exists (select 1 from public.change_requests c where c.id = change_id and c.organization_id = (select public.current_organization_id())));

grant select, insert, update, delete on public.change_requests to authenticated;
grant select, insert, update, delete on public.change_ticket_links to authenticated;
grant select, insert, update, delete on public.change_approvals to authenticated;
grant select, insert, update, delete on public.change_history to authenticated;
