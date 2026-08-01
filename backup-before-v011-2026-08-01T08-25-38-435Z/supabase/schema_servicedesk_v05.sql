-- IS Riadenie odboru v0.5 – návrh samostatného dátového modelu ServiceDesku.
-- Predpokladá nasadenú schému schema_v02.sql (organizations, profiles a pomocné funkcie).
-- Aplikácia 0.5 naďalej funguje aj cez snapshoty; tento skript je príprava na ďalší krok.

create extension if not exists pgcrypto;

create table if not exists public.support_queues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  email text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.support_queue_members (
  queue_id uuid not null references public.support_queues(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (queue_id, profile_id)
);

create table if not exists public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  priority text not null check (priority in ('Kritická', 'Vysoká', 'Stredná', 'Nízka')),
  first_response_hours integer not null check (first_response_hours > 0),
  resolution_hours integer not null check (resolution_hours > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, priority)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_number text not null,
  ticket_type text not null check (ticket_type in ('Incident', 'Požiadavka')),
  title text not null,
  description text not null default '',
  requester_name text not null default '',
  requester_email text not null default '',
  service_key text not null default '',
  category text not null default 'Ostatné',
  subcategory text not null default 'Iné',
  queue_id uuid references public.support_queues(id) on delete set null,
  priority text not null default 'Stredná',
  impact text not null default 'Stredný',
  urgency text not null default 'Stredná',
  status text not null default 'Nová',
  assignee_id uuid references public.profiles(id) on delete set null,
  channel text not null default 'Formulár',
  due_date date,
  first_response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  resolution text not null default '',
  internal_note text not null default '',
  linked_task_key text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, ticket_number)
);

create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default '',
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default '',
  action text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tickets_org_status_idx on public.tickets (organization_id, status, priority, updated_at desc);
create index if not exists tickets_queue_idx on public.tickets (queue_id, status, updated_at desc);
create index if not exists ticket_comments_ticket_idx on public.ticket_comments (ticket_id, created_at);
create index if not exists ticket_history_ticket_idx on public.ticket_history (ticket_id, created_at);
create index if not exists service_notifications_profile_idx on public.service_notifications (profile_id, is_read, created_at desc);

-- updated_at triggery používajú funkciu zo schema_v02.sql.
drop trigger if exists support_queues_set_updated_at on public.support_queues;
create trigger support_queues_set_updated_at before update on public.support_queues
for each row execute function public.set_updated_at();

drop trigger if exists sla_policies_set_updated_at on public.sla_policies;
create trigger sla_policies_set_updated_at before update on public.sla_policies
for each row execute function public.set_updated_at();

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at before update on public.tickets
for each row execute function public.set_updated_at();

alter table public.support_queues enable row level security;
alter table public.support_queue_members enable row level security;
alter table public.sla_policies enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_history enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.service_notifications enable row level security;

-- Organizácia môže čítať vlastné ServiceDesk dáta.
drop policy if exists "org reads support queues" on public.support_queues;
create policy "org reads support queues" on public.support_queues for select to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "org reads sla policies" on public.sla_policies;
create policy "org reads sla policies" on public.sla_policies for select to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "org reads tickets" on public.tickets;
create policy "org reads tickets" on public.tickets for select to authenticated
using (organization_id = (select public.current_organization_id()));

-- Každý aktívny člen organizácie môže založiť ticket. Zmenu vykonáva manažér alebo administrátor.
drop policy if exists "members create tickets" on public.tickets;
create policy "members create tickets" on public.tickets for insert to authenticated
with check (organization_id = (select public.current_organization_id()));

drop policy if exists "managers update tickets" on public.tickets;
create policy "managers update tickets" on public.tickets for update to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin', 'manager'))
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin', 'manager'));

drop policy if exists "admins delete tickets" on public.tickets;
create policy "admins delete tickets" on public.tickets for delete to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) = 'admin');

-- Detaily ticketu sú dostupné iba v rámci organizácie ticketu.
drop policy if exists "org reads ticket comments" on public.ticket_comments;
create policy "org reads ticket comments" on public.ticket_comments for select to authenticated
using (exists (select 1 from public.tickets t where t.id = ticket_id and t.organization_id = (select public.current_organization_id())));

drop policy if exists "members add ticket comments" on public.ticket_comments;
create policy "members add ticket comments" on public.ticket_comments for insert to authenticated
with check (exists (select 1 from public.tickets t where t.id = ticket_id and t.organization_id = (select public.current_organization_id())));

drop policy if exists "org reads ticket history" on public.ticket_history;
create policy "org reads ticket history" on public.ticket_history for select to authenticated
using (exists (select 1 from public.tickets t where t.id = ticket_id and t.organization_id = (select public.current_organization_id())));

drop policy if exists "org reads ticket attachments" on public.ticket_attachments;
create policy "org reads ticket attachments" on public.ticket_attachments for select to authenticated
using (exists (select 1 from public.tickets t where t.id = ticket_id and t.organization_id = (select public.current_organization_id())));

drop policy if exists "members add ticket attachments" on public.ticket_attachments;
create policy "members add ticket attachments" on public.ticket_attachments for insert to authenticated
with check (exists (select 1 from public.tickets t where t.id = ticket_id and t.organization_id = (select public.current_organization_id())));

drop policy if exists "users read own notifications" on public.service_notifications;
create policy "users read own notifications" on public.service_notifications for select to authenticated
using (organization_id = (select public.current_organization_id()) and (profile_id is null or profile_id = (select auth.uid())));

drop policy if exists "users update own notifications" on public.service_notifications;
create policy "users update own notifications" on public.service_notifications for update to authenticated
using (organization_id = (select public.current_organization_id()) and profile_id = (select auth.uid()))
with check (organization_id = (select public.current_organization_id()) and profile_id = (select auth.uid()));

-- Konfiguračné tabuľky mení iba admin.
drop policy if exists "admins manage queues" on public.support_queues;
create policy "admins manage queues" on public.support_queues for all to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) = 'admin')
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) = 'admin');

drop policy if exists "admins manage sla" on public.sla_policies;
create policy "admins manage sla" on public.sla_policies for all to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) = 'admin')
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) = 'admin');

grant select, insert, update, delete on public.support_queues to authenticated;
grant select, insert, update, delete on public.support_queue_members to authenticated;
grant select, insert, update, delete on public.sla_policies to authenticated;
grant select, insert, update, delete on public.tickets to authenticated;
grant select, insert, update, delete on public.ticket_comments to authenticated;
grant select, insert, update, delete on public.ticket_history to authenticated;
grant select, insert, update, delete on public.ticket_attachments to authenticated;
grant select, insert, update on public.service_notifications to authenticated;
