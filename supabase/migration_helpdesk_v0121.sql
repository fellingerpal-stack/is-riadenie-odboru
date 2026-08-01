-- IS Riadenie odboru v0.12.1
-- Samostatné Supabase tabuľky pre Helpdesk / ServiceDesk.
-- Predpokladá nasadený release 0.11 (organizations, profiles, current_organization_id, current_app_role).

begin;

create extension if not exists pgcrypto;

create table if not exists public.service_queues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null default '',
  description text not null default '',
  members jsonb not null default '[]'::jsonb,
  email text not null default '',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_queues_org_code_unique unique (organization_id, code)
);

create table if not exists public.service_sla_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null default '',
  priority text not null default 'Stredná',
  first_response_hours integer not null default 8 check (first_response_hours > 0),
  resolution_hours integer not null default 40 check (resolution_hours > 0),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_sla_org_code_unique unique (organization_id, code),
  constraint service_sla_org_priority_unique unique (organization_id, priority)
);

create table if not exists public.service_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  ticket_type text not null default 'Požiadavka',
  title text not null default '',
  description text not null default '',
  requester_name text not null default '',
  requester_email text not null default '',
  service_key text not null default '',
  category text not null default 'Ostatné',
  subcategory text not null default 'Iné',
  queue_id uuid references public.service_queues(id) on delete set null,
  priority text not null default 'Stredná',
  impact text not null default 'Stredný',
  urgency text not null default 'Stredná',
  status text not null default 'Nová',
  assignee text not null default '',
  channel text not null default 'Formulár',
  due_date date,
  first_response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  linked_task_key text not null default '',
  resolution text not null default '',
  internal_note text not null default '',
  comments jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_tickets_org_code_unique unique (organization_id, code)
);

create table if not exists public.service_activity (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('ticket', 'queue', 'sla_policy')),
  entity_code text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists service_tickets_org_status_idx
  on public.service_tickets (organization_id, status, priority, updated_at desc);
create index if not exists service_tickets_queue_idx
  on public.service_tickets (queue_id, status, updated_at desc);
create index if not exists service_activity_org_changed_idx
  on public.service_activity (organization_id, changed_at desc);

create or replace function public.service_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end;
$$;

drop trigger if exists service_queues_set_updated_at on public.service_queues;
create trigger service_queues_set_updated_at
before update on public.service_queues
for each row execute function public.service_set_updated_at();

drop trigger if exists service_sla_set_updated_at on public.service_sla_policies;
create trigger service_sla_set_updated_at
before update on public.service_sla_policies
for each row execute function public.service_set_updated_at();

drop trigger if exists service_tickets_set_updated_at on public.service_tickets;
create trigger service_tickets_set_updated_at
before update on public.service_tickets
for each row execute function public.service_set_updated_at();

create or replace function public.log_service_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_before jsonb;
  v_after jsonb;
  v_org_id uuid;
  v_code text;
  v_entity text;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_org_id := (v_row ->> 'organization_id')::uuid;
  v_code := coalesce(v_row ->> 'code', '');
  v_entity := case
    when tg_table_name = 'service_tickets' then 'ticket'
    when tg_table_name = 'service_queues' then 'queue'
    else 'sla_policy'
  end;

  v_before := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_after := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

  -- Audit nezväčšujeme o dátové URL príloh a celé konverzácie.
  if tg_table_name = 'service_tickets' then
    if v_before is not null then v_before := v_before - 'attachments' - 'comments' - 'history'; end if;
    if v_after is not null then v_after := v_after - 'attachments' - 'comments' - 'history'; end if;
  end if;

  insert into public.service_activity (
    organization_id, entity_type, entity_code, action, changed_by, before_data, after_data
  ) values (
    v_org_id, v_entity, v_code, lower(tg_op), (select auth.uid()), v_before, v_after
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists service_queues_activity on public.service_queues;
create trigger service_queues_activity
after insert or update or delete on public.service_queues
for each row execute function public.log_service_activity();

drop trigger if exists service_sla_activity on public.service_sla_policies;
create trigger service_sla_activity
after insert or update or delete on public.service_sla_policies
for each row execute function public.log_service_activity();

drop trigger if exists service_tickets_activity on public.service_tickets;
create trigger service_tickets_activity
after insert or update or delete on public.service_tickets
for each row execute function public.log_service_activity();

create or replace function public.assert_service_member()
returns table (organization_id uuid, user_id uuid, app_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_role text;
begin
  if v_user_id is null then raise exception 'Používateľ nie je prihlásený.'; end if;

  select p.organization_id, p.role
    into v_org_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.is_active = true;

  if v_org_id is null then raise exception 'Aktívny používateľský profil nebol nájdený.'; end if;
  if v_role not in ('admin', 'manager', 'resolver', 'employee') then
    raise exception 'Používateľ nemá oprávnenie pracovať s Helpdeskom.';
  end if;

  return query select v_org_id, v_user_id, v_role;
end;
$$;

create or replace function public.assert_service_configurator()
returns table (organization_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_role text;
begin
  select member.organization_id, member.user_id, member.app_role
    into v_org_id, v_user_id, v_role
  from public.assert_service_member() member;

  if v_role not in ('admin', 'manager', 'resolver') then
    raise exception 'Používateľ nemá oprávnenie meniť fronty a SLA politiky.';
  end if;

  return query select v_org_id, v_user_id;
end;
$$;

create or replace function public.upsert_service_queue(p_queue jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_id uuid;
  v_code text := trim(coalesce(p_queue ->> 'id', ''));
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_service_configurator();

  if v_code = '' then raise exception 'Fronta nemá identifikátor.'; end if;

  insert into public.service_queues (
    organization_id, code, name, description, members, email, is_active, created_by, updated_by
  ) values (
    v_org_id,
    v_code,
    coalesce(p_queue ->> 'name', ''),
    coalesce(p_queue ->> 'description', ''),
    coalesce(p_queue -> 'members', '[]'::jsonb),
    coalesce(p_queue ->> 'email', ''),
    coalesce(nullif(p_queue ->> 'isActive', '')::boolean, true),
    v_user_id,
    v_user_id
  )
  on conflict (organization_id, code) do update set
    name = excluded.name,
    description = excluded.description,
    members = excluded.members,
    email = excluded.email,
    is_active = excluded.is_active,
    updated_by = v_user_id
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_service_queue(p_queue_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org_id uuid; v_user_id uuid;
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_service_configurator();
  delete from public.service_queues where organization_id = v_org_id and code = p_queue_code;
end;
$$;

create or replace function public.upsert_service_sla_policy(p_policy jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_id uuid;
  v_code text := trim(coalesce(p_policy ->> 'id', ''));
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_service_configurator();
  if v_code = '' then raise exception 'SLA politika nemá identifikátor.'; end if;

  insert into public.service_sla_policies (
    organization_id, code, name, priority, first_response_hours, resolution_hours,
    is_active, created_by, updated_by
  ) values (
    v_org_id,
    v_code,
    coalesce(p_policy ->> 'name', ''),
    coalesce(nullif(p_policy ->> 'priority', ''), 'Stredná'),
    greatest(1, coalesce(nullif(p_policy ->> 'firstResponseHours', '')::integer, 8)),
    greatest(1, coalesce(nullif(p_policy ->> 'resolutionHours', '')::integer, 40)),
    coalesce(nullif(p_policy ->> 'isActive', '')::boolean, true),
    v_user_id,
    v_user_id
  )
  on conflict (organization_id, code) do update set
    name = excluded.name,
    priority = excluded.priority,
    first_response_hours = excluded.first_response_hours,
    resolution_hours = excluded.resolution_hours,
    is_active = excluded.is_active,
    updated_by = v_user_id
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_service_sla_policy(p_policy_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org_id uuid; v_user_id uuid;
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_service_configurator();
  delete from public.service_sla_policies where organization_id = v_org_id and code = p_policy_code;
end;
$$;

create or replace function public.upsert_service_ticket(p_ticket jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_role text;
  v_id uuid;
  v_queue_id uuid;
  v_code text := trim(coalesce(p_ticket ->> 'id', ''));
  v_queue_code text := trim(coalesce(p_ticket ->> 'queueId', ''));
begin
  select organization_id, user_id, app_role into v_org_id, v_user_id, v_role
  from public.assert_service_member();

  if v_code = '' then raise exception 'Ticket nemá identifikátor.'; end if;
  if trim(coalesce(p_ticket ->> 'title', '')) = '' then raise exception 'Ticket nemá názov.'; end if;

  if v_queue_code <> '' then
    select id into v_queue_id
    from public.service_queues
    where organization_id = v_org_id and code = v_queue_code;
  end if;

  insert into public.service_tickets (
    organization_id, code, ticket_type, title, description, requester_name,
    requester_email, service_key, category, subcategory, queue_id, priority,
    impact, urgency, status, assignee, channel, due_date,
    first_response_due_at, resolution_due_at, first_responded_at, resolved_at,
    linked_task_key, resolution, internal_note, comments, history, attachments,
    created_by, updated_by, created_at, updated_at
  ) values (
    v_org_id,
    v_code,
    coalesce(nullif(p_ticket ->> 'type', ''), 'Požiadavka'),
    coalesce(p_ticket ->> 'title', ''),
    coalesce(p_ticket ->> 'description', ''),
    coalesce(p_ticket ->> 'requester', ''),
    coalesce(p_ticket ->> 'requesterEmail', ''),
    coalesce(p_ticket ->> 'serviceId', ''),
    coalesce(nullif(p_ticket ->> 'category', ''), 'Ostatné'),
    coalesce(nullif(p_ticket ->> 'subcategory', ''), 'Iné'),
    v_queue_id,
    coalesce(nullif(p_ticket ->> 'priority', ''), 'Stredná'),
    coalesce(nullif(p_ticket ->> 'impact', ''), 'Stredný'),
    coalesce(nullif(p_ticket ->> 'urgency', ''), 'Stredná'),
    coalesce(nullif(p_ticket ->> 'status', ''), 'Nová'),
    coalesce(p_ticket ->> 'assignee', ''),
    coalesce(nullif(p_ticket ->> 'channel', ''), 'Formulár'),
    nullif(p_ticket ->> 'due', '')::date,
    nullif(p_ticket ->> 'firstResponseDueAt', '')::timestamptz,
    nullif(p_ticket ->> 'resolutionDueAt', '')::timestamptz,
    nullif(p_ticket ->> 'firstRespondedAt', '')::timestamptz,
    nullif(p_ticket ->> 'resolvedAt', '')::timestamptz,
    coalesce(p_ticket ->> 'linkedTaskId', ''),
    coalesce(p_ticket ->> 'resolution', ''),
    coalesce(p_ticket ->> 'internalNote', ''),
    coalesce(p_ticket -> 'comments', '[]'::jsonb),
    coalesce(p_ticket -> 'history', '[]'::jsonb),
    coalesce(p_ticket -> 'attachments', '[]'::jsonb),
    v_user_id,
    v_user_id,
    coalesce(nullif(p_ticket ->> 'createdAt', '')::timestamptz, now()),
    coalesce(nullif(p_ticket ->> 'updatedAt', '')::timestamptz, now())
  )
  on conflict (organization_id, code) do update set
    ticket_type = excluded.ticket_type,
    title = excluded.title,
    description = excluded.description,
    requester_name = excluded.requester_name,
    requester_email = excluded.requester_email,
    service_key = excluded.service_key,
    category = excluded.category,
    subcategory = excluded.subcategory,
    queue_id = excluded.queue_id,
    priority = excluded.priority,
    impact = excluded.impact,
    urgency = excluded.urgency,
    status = excluded.status,
    assignee = excluded.assignee,
    channel = excluded.channel,
    due_date = excluded.due_date,
    first_response_due_at = excluded.first_response_due_at,
    resolution_due_at = excluded.resolution_due_at,
    first_responded_at = excluded.first_responded_at,
    resolved_at = excluded.resolved_at,
    linked_task_key = excluded.linked_task_key,
    resolution = excluded.resolution,
    internal_note = excluded.internal_note,
    comments = excluded.comments,
    history = excluded.history,
    attachments = excluded.attachments,
    updated_by = v_user_id,
    updated_at = excluded.updated_at
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_service_ticket(p_ticket_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org_id uuid; v_user_id uuid; v_role text;
begin
  select organization_id, user_id, app_role into v_org_id, v_user_id, v_role
  from public.assert_service_member();
  delete from public.service_tickets where organization_id = v_org_id and code = p_ticket_code;
end;
$$;

alter table public.service_queues enable row level security;
alter table public.service_sla_policies enable row level security;
alter table public.service_tickets enable row level security;
alter table public.service_activity enable row level security;

drop policy if exists "service members read queues" on public.service_queues;
create policy "service members read queues" on public.service_queues for select to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "service configurators manage queues" on public.service_queues;
create policy "service configurators manage queues" on public.service_queues for all to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'))
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'));

drop policy if exists "service members read sla" on public.service_sla_policies;
create policy "service members read sla" on public.service_sla_policies for select to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "service configurators manage sla" on public.service_sla_policies;
create policy "service configurators manage sla" on public.service_sla_policies for all to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'))
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'));

drop policy if exists "service members read tickets" on public.service_tickets;
create policy "service members read tickets" on public.service_tickets for select to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "service members insert tickets" on public.service_tickets;
create policy "service members insert tickets" on public.service_tickets for insert to authenticated
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "service members update tickets" on public.service_tickets;
create policy "service members update tickets" on public.service_tickets for update to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'))
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "service members delete tickets" on public.service_tickets;
create policy "service members delete tickets" on public.service_tickets for delete to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "service managers read activity" on public.service_activity;
create policy "service managers read activity" on public.service_activity for select to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'));

-- Jednorazový import zo súčasného snapshotu. Opakované spustenie neprepíše novšie DB dáta.
with current_snapshots as (
  select distinct on (organization_id) organization_id, payload, created_by
  from public.app_snapshots
  where is_current = true
  order by organization_id, created_at desc
), queue_items as (
  select snapshot.organization_id, snapshot.created_by, item
  from current_snapshots snapshot
  cross join lateral jsonb_array_elements(coalesce(snapshot.payload -> 'supportQueues', '[]'::jsonb)) item
)
insert into public.service_queues (
  organization_id, code, name, description, members, email, is_active, created_by, updated_by
)
select
  organization_id,
  item ->> 'id',
  coalesce(item ->> 'name', ''),
  coalesce(item ->> 'description', ''),
  coalesce(item -> 'members', '[]'::jsonb),
  coalesce(item ->> 'email', ''),
  coalesce(nullif(item ->> 'isActive', '')::boolean, true),
  created_by,
  created_by
from queue_items
where coalesce(item ->> 'id', '') <> ''
on conflict (organization_id, code) do nothing;

with current_snapshots as (
  select distinct on (organization_id) organization_id, payload, created_by
  from public.app_snapshots
  where is_current = true
  order by organization_id, created_at desc
), policy_items as (
  select snapshot.organization_id, snapshot.created_by, item
  from current_snapshots snapshot
  cross join lateral jsonb_array_elements(coalesce(snapshot.payload -> 'slaPolicies', '[]'::jsonb)) item
)
insert into public.service_sla_policies (
  organization_id, code, name, priority, first_response_hours, resolution_hours, is_active, created_by, updated_by
)
select
  organization_id,
  item ->> 'id',
  coalesce(item ->> 'name', ''),
  coalesce(nullif(item ->> 'priority', ''), 'Stredná'),
  greatest(1, coalesce(nullif(item ->> 'firstResponseHours', '')::integer, 8)),
  greatest(1, coalesce(nullif(item ->> 'resolutionHours', '')::integer, 40)),
  coalesce(nullif(item ->> 'isActive', '')::boolean, true),
  created_by,
  created_by
from policy_items
where coalesce(item ->> 'id', '') <> ''
on conflict (organization_id, code) do nothing;

with current_snapshots as (
  select distinct on (organization_id) organization_id, payload, created_by
  from public.app_snapshots
  where is_current = true
  order by organization_id, created_at desc
), ticket_items as (
  select snapshot.organization_id, snapshot.created_by, item
  from current_snapshots snapshot
  cross join lateral jsonb_array_elements(coalesce(snapshot.payload -> 'tickets', '[]'::jsonb)) item
)
insert into public.service_tickets (
  organization_id, code, ticket_type, title, description, requester_name,
  requester_email, service_key, category, subcategory, queue_id, priority,
  impact, urgency, status, assignee, channel, due_date, first_response_due_at,
  resolution_due_at, first_responded_at, resolved_at, linked_task_key,
  resolution, internal_note, comments, history, attachments, created_by,
  updated_by, created_at, updated_at
)
select
  ticket_items.organization_id,
  ticket_items.item ->> 'id',
  coalesce(nullif(ticket_items.item ->> 'type', ''), 'Požiadavka'),
  coalesce(ticket_items.item ->> 'title', ''),
  coalesce(ticket_items.item ->> 'description', ''),
  coalesce(ticket_items.item ->> 'requester', ''),
  coalesce(ticket_items.item ->> 'requesterEmail', ''),
  coalesce(ticket_items.item ->> 'serviceId', ''),
  coalesce(nullif(ticket_items.item ->> 'category', ''), 'Ostatné'),
  coalesce(nullif(ticket_items.item ->> 'subcategory', ''), 'Iné'),
  queue.id,
  coalesce(nullif(ticket_items.item ->> 'priority', ''), 'Stredná'),
  coalesce(nullif(ticket_items.item ->> 'impact', ''), 'Stredný'),
  coalesce(nullif(ticket_items.item ->> 'urgency', ''), 'Stredná'),
  coalesce(nullif(ticket_items.item ->> 'status', ''), 'Nová'),
  coalesce(ticket_items.item ->> 'assignee', ''),
  coalesce(nullif(ticket_items.item ->> 'channel', ''), 'Formulár'),
  nullif(ticket_items.item ->> 'due', '')::date,
  nullif(ticket_items.item ->> 'firstResponseDueAt', '')::timestamptz,
  nullif(ticket_items.item ->> 'resolutionDueAt', '')::timestamptz,
  nullif(ticket_items.item ->> 'firstRespondedAt', '')::timestamptz,
  nullif(ticket_items.item ->> 'resolvedAt', '')::timestamptz,
  coalesce(ticket_items.item ->> 'linkedTaskId', ''),
  coalesce(ticket_items.item ->> 'resolution', ''),
  coalesce(ticket_items.item ->> 'internalNote', ''),
  coalesce(ticket_items.item -> 'comments', '[]'::jsonb),
  coalesce(ticket_items.item -> 'history', '[]'::jsonb),
  coalesce(ticket_items.item -> 'attachments', '[]'::jsonb),
  ticket_items.created_by,
  ticket_items.created_by,
  coalesce(nullif(ticket_items.item ->> 'createdAt', '')::timestamptz, now()),
  coalesce(nullif(ticket_items.item ->> 'updatedAt', '')::timestamptz, now())
from ticket_items
left join public.service_queues queue
  on queue.organization_id = ticket_items.organization_id
 and queue.code = nullif(ticket_items.item ->> 'queueId', '')
where coalesce(ticket_items.item ->> 'id', '') <> ''
on conflict (organization_id, code) do nothing;

revoke all on function public.assert_service_member() from public;
revoke all on function public.assert_service_configurator() from public;
revoke all on function public.upsert_service_queue(jsonb) from public;
revoke all on function public.delete_service_queue(text) from public;
revoke all on function public.upsert_service_sla_policy(jsonb) from public;
revoke all on function public.delete_service_sla_policy(text) from public;
revoke all on function public.upsert_service_ticket(jsonb) from public;
revoke all on function public.delete_service_ticket(text) from public;

grant execute on function public.upsert_service_queue(jsonb) to authenticated;
grant execute on function public.delete_service_queue(text) to authenticated;
grant execute on function public.upsert_service_sla_policy(jsonb) to authenticated;
grant execute on function public.delete_service_sla_policy(text) to authenticated;
grant execute on function public.upsert_service_ticket(jsonb) to authenticated;
grant execute on function public.delete_service_ticket(text) to authenticated;

grant select, insert, update, delete on public.service_queues to authenticated;
grant select, insert, update, delete on public.service_sla_policies to authenticated;
grant select, insert, update, delete on public.service_tickets to authenticated;
grant select on public.service_activity to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.service_queues;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.service_sla_policies;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.service_tickets;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';

commit;

select
  (select count(*) from public.service_tickets) as tickets_count,
  (select count(*) from public.service_queues) as queues_count,
  (select count(*) from public.service_sla_policies) as sla_count,
  to_regprocedure('public.upsert_service_ticket(jsonb)') as ticket_rpc,
  to_regprocedure('public.upsert_service_queue(jsonb)') as queue_rpc,
  to_regprocedure('public.upsert_service_sla_policy(jsonb)') as sla_rpc;
