-- IS Riadenie odboru v0.16.1
-- Opravná inicializácia samostatnej IAM databázy.
-- Spustite v správnom Supabase projekte aplikácie IS Riadenie odboru.
-- Skript je idempotentný a zachová existujúce IAM údaje.

do $$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.profiles') is null
     or to_regclass('public.app_snapshots') is null then
    raise exception 'Toto nie je databáza aplikácie IS Riadenie odboru alebo chýba základná schéma. Očakávajú sa tabuľky public.organizations, public.profiles a public.app_snapshots.';
  end if;
  if to_regprocedure('public.current_organization_id()') is null
     or to_regprocedure('public.current_app_role()') is null then
    raise exception 'Chýbajú pomocné funkcie current_organization_id alebo current_app_role. Najprv spustite základné Supabase nastavenie aplikácie.';
  end if;
end $$;

begin;

create extension if not exists pgcrypto;

create table if not exists public.iam_catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null default '',
  service_key text not null default '',
  system_name text not null default '',
  description text not null default '',
  business_owner text not null default '',
  technical_owner text not null default '',
  risk text not null default 'Stredné',
  privileged boolean not null default false,
  default_duration_days integer not null default 365 check (default_duration_days >= 0),
  approval_path jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iam_catalog_items_org_code_unique unique (organization_id, code)
);

create table if not exists public.iam_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  request_type text not null default 'Nový prístup',
  subject_name text not null default '',
  subject_email text not null default '',
  department text not null default '',
  manager_name text not null default '',
  requester_name text not null default '',
  service_key text not null default '',
  catalog_item_id uuid references public.iam_catalog_items(id) on delete set null,
  requested_access text not null default '',
  current_access text not null default '',
  business_justification text not null default '',
  privileged boolean not null default false,
  risk text not null default 'Stredné',
  status text not null default 'Návrh',
  start_date date,
  end_date date,
  due_date date,
  assignee text not null default '',
  linked_task_key text not null default '',
  approvals jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iam_requests_org_code_unique unique (organization_id, code)
);

create table if not exists public.iam_recert_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null default '',
  description text not null default '',
  owner_name text not null default '',
  scope text not null default '',
  status text not null default 'Návrh',
  start_date date,
  due_date date,
  items jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iam_recert_campaigns_org_code_unique unique (organization_id, code)
);

create table if not exists public.iam_activity (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('request', 'catalog_item', 'recert_campaign')),
  entity_code text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists iam_requests_org_status_idx
  on public.iam_requests (organization_id, status, risk, due_date, updated_at desc);
create index if not exists iam_requests_catalog_idx
  on public.iam_requests (catalog_item_id, status);
create index if not exists iam_catalog_org_active_idx
  on public.iam_catalog_items (organization_id, is_active, name);
create index if not exists iam_recert_org_status_idx
  on public.iam_recert_campaigns (organization_id, status, due_date);
create index if not exists iam_activity_org_changed_idx
  on public.iam_activity (organization_id, changed_at desc);

create or replace function public.iam_set_updated_at()
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

drop trigger if exists iam_catalog_set_updated_at on public.iam_catalog_items;
create trigger iam_catalog_set_updated_at
before update on public.iam_catalog_items
for each row execute function public.iam_set_updated_at();

drop trigger if exists iam_requests_set_updated_at on public.iam_requests;
create trigger iam_requests_set_updated_at
before update on public.iam_requests
for each row execute function public.iam_set_updated_at();

drop trigger if exists iam_recert_set_updated_at on public.iam_recert_campaigns;
create trigger iam_recert_set_updated_at
before update on public.iam_recert_campaigns
for each row execute function public.iam_set_updated_at();

create or replace function public.log_iam_activity()
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
    when tg_table_name = 'iam_requests' then 'request'
    when tg_table_name = 'iam_catalog_items' then 'catalog_item'
    else 'recert_campaign'
  end;

  v_before := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_after := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

  -- Veľké vnorené kolekcie sú dostupné priamo v zázname. Audit držíme kompaktný.
  if tg_table_name = 'iam_requests' then
    if v_before is not null then v_before := v_before - 'approvals' - 'comments' - 'history'; end if;
    if v_after is not null then v_after := v_after - 'approvals' - 'comments' - 'history'; end if;
  elsif tg_table_name = 'iam_recert_campaigns' then
    if v_before is not null then v_before := v_before - 'items'; end if;
    if v_after is not null then v_after := v_after - 'items'; end if;
  end if;

  insert into public.iam_activity (
    organization_id, entity_type, entity_code, action, changed_by, before_data, after_data
  ) values (
    v_org_id, v_entity, v_code, lower(tg_op), (select auth.uid()), v_before, v_after
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists iam_catalog_activity on public.iam_catalog_items;
create trigger iam_catalog_activity
after insert or update or delete on public.iam_catalog_items
for each row execute function public.log_iam_activity();

drop trigger if exists iam_requests_activity on public.iam_requests;
create trigger iam_requests_activity
after insert or update or delete on public.iam_requests
for each row execute function public.log_iam_activity();

drop trigger if exists iam_recert_activity on public.iam_recert_campaigns;
create trigger iam_recert_activity
after insert or update or delete on public.iam_recert_campaigns
for each row execute function public.log_iam_activity();

create or replace function public.assert_iam_member()
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
    raise exception 'Používateľ nemá oprávnenie pracovať s IAM.';
  end if;

  return query select v_org_id, v_user_id, v_role;
end;
$$;

create or replace function public.assert_iam_configurator()
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
  from public.assert_iam_member() member;

  if v_role not in ('admin', 'manager', 'resolver') then
    raise exception 'Používateľ nemá oprávnenie meniť katalóg prístupov a recertifikácie.';
  end if;

  return query select v_org_id, v_user_id;
end;
$$;

create or replace function public.upsert_iam_catalog_item(p_item jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_id uuid;
  v_code text := trim(coalesce(p_item ->> 'id', ''));
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_iam_configurator();

  if v_code = '' then raise exception 'Katalógová položka nemá identifikátor.'; end if;
  if trim(coalesce(p_item ->> 'name', '')) = '' then raise exception 'Katalógová položka nemá názov.'; end if;

  insert into public.iam_catalog_items (
    organization_id, code, name, service_key, system_name, description,
    business_owner, technical_owner, risk, privileged, default_duration_days,
    approval_path, is_active, created_by, updated_by
  ) values (
    v_org_id,
    v_code,
    coalesce(p_item ->> 'name', ''),
    coalesce(p_item ->> 'serviceId', ''),
    coalesce(p_item ->> 'system', ''),
    coalesce(p_item ->> 'description', ''),
    coalesce(p_item ->> 'businessOwner', ''),
    coalesce(p_item ->> 'technicalOwner', ''),
    coalesce(nullif(p_item ->> 'risk', ''), 'Stredné'),
    coalesce(nullif(p_item ->> 'privileged', '')::boolean, false),
    greatest(0, coalesce(nullif(p_item ->> 'defaultDurationDays', '')::integer, 365)),
    coalesce(p_item -> 'approvalPath', '[]'::jsonb),
    coalesce(nullif(p_item ->> 'isActive', '')::boolean, true),
    v_user_id,
    v_user_id
  )
  on conflict (organization_id, code) do update set
    name = excluded.name,
    service_key = excluded.service_key,
    system_name = excluded.system_name,
    description = excluded.description,
    business_owner = excluded.business_owner,
    technical_owner = excluded.technical_owner,
    risk = excluded.risk,
    privileged = excluded.privileged,
    default_duration_days = excluded.default_duration_days,
    approval_path = excluded.approval_path,
    is_active = excluded.is_active,
    updated_by = v_user_id
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_iam_catalog_item(p_item_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org_id uuid; v_user_id uuid;
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_iam_configurator();
  delete from public.iam_catalog_items where organization_id = v_org_id and code = p_item_code;
end;
$$;

create or replace function public.upsert_iam_request(p_request jsonb)
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
  v_catalog_id uuid;
  v_code text := trim(coalesce(p_request ->> 'id', ''));
  v_catalog_code text := trim(coalesce(p_request ->> 'catalogItemId', ''));
begin
  select organization_id, user_id, app_role into v_org_id, v_user_id, v_role
  from public.assert_iam_member();

  if v_code = '' then raise exception 'IAM žiadosť nemá identifikátor.'; end if;
  if trim(coalesce(p_request ->> 'subjectName', '')) = '' then raise exception 'IAM žiadosť nemá osobu.'; end if;
  if trim(coalesce(p_request ->> 'requestedAccess', '')) = '' then raise exception 'IAM žiadosť nemá požadovaný prístup.'; end if;

  if v_catalog_code <> '' then
    select id into v_catalog_id
    from public.iam_catalog_items
    where organization_id = v_org_id and code = v_catalog_code;
  end if;

  insert into public.iam_requests (
    organization_id, code, request_type, subject_name, subject_email, department,
    manager_name, requester_name, service_key, catalog_item_id, requested_access,
    current_access, business_justification, privileged, risk, status, start_date,
    end_date, due_date, assignee, linked_task_key, approvals, comments, history,
    completed_at, created_by, updated_by, created_at, updated_at
  ) values (
    v_org_id,
    v_code,
    coalesce(nullif(p_request ->> 'requestType', ''), 'Nový prístup'),
    coalesce(p_request ->> 'subjectName', ''),
    coalesce(p_request ->> 'subjectEmail', ''),
    coalesce(p_request ->> 'department', ''),
    coalesce(p_request ->> 'manager', ''),
    coalesce(p_request ->> 'requester', ''),
    coalesce(p_request ->> 'serviceId', ''),
    v_catalog_id,
    coalesce(p_request ->> 'requestedAccess', ''),
    coalesce(p_request ->> 'currentAccess', ''),
    coalesce(p_request ->> 'businessJustification', ''),
    coalesce(nullif(p_request ->> 'privileged', '')::boolean, false),
    coalesce(nullif(p_request ->> 'risk', ''), 'Stredné'),
    coalesce(nullif(p_request ->> 'status', ''), 'Návrh'),
    nullif(p_request ->> 'startDate', '')::date,
    nullif(p_request ->> 'endDate', '')::date,
    nullif(p_request ->> 'dueDate', '')::date,
    coalesce(p_request ->> 'assignee', ''),
    coalesce(p_request ->> 'linkedTaskId', ''),
    coalesce(p_request -> 'approvals', '[]'::jsonb),
    coalesce(p_request -> 'comments', '[]'::jsonb),
    coalesce(p_request -> 'history', '[]'::jsonb),
    nullif(p_request ->> 'completedAt', '')::timestamptz,
    v_user_id,
    v_user_id,
    coalesce(nullif(p_request ->> 'createdAt', '')::timestamptz, now()),
    coalesce(nullif(p_request ->> 'updatedAt', '')::timestamptz, now())
  )
  on conflict (organization_id, code) do update set
    request_type = excluded.request_type,
    subject_name = excluded.subject_name,
    subject_email = excluded.subject_email,
    department = excluded.department,
    manager_name = excluded.manager_name,
    requester_name = excluded.requester_name,
    service_key = excluded.service_key,
    catalog_item_id = excluded.catalog_item_id,
    requested_access = excluded.requested_access,
    current_access = excluded.current_access,
    business_justification = excluded.business_justification,
    privileged = excluded.privileged,
    risk = excluded.risk,
    status = excluded.status,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    due_date = excluded.due_date,
    assignee = excluded.assignee,
    linked_task_key = excluded.linked_task_key,
    approvals = excluded.approvals,
    comments = excluded.comments,
    history = excluded.history,
    completed_at = excluded.completed_at,
    updated_by = v_user_id,
    updated_at = excluded.updated_at
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_iam_request(p_request_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org_id uuid; v_user_id uuid; v_role text;
begin
  select organization_id, user_id, app_role into v_org_id, v_user_id, v_role
  from public.assert_iam_member();
  delete from public.iam_requests where organization_id = v_org_id and code = p_request_code;
end;
$$;

create or replace function public.upsert_iam_recert_campaign(p_campaign jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_id uuid;
  v_code text := trim(coalesce(p_campaign ->> 'id', ''));
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_iam_configurator();

  if v_code = '' then raise exception 'Recertifikačná kampaň nemá identifikátor.'; end if;
  if trim(coalesce(p_campaign ->> 'name', '')) = '' then raise exception 'Recertifikačná kampaň nemá názov.'; end if;

  insert into public.iam_recert_campaigns (
    organization_id, code, name, description, owner_name, scope, status,
    start_date, due_date, items, created_by, updated_by, created_at, updated_at
  ) values (
    v_org_id,
    v_code,
    coalesce(p_campaign ->> 'name', ''),
    coalesce(p_campaign ->> 'description', ''),
    coalesce(p_campaign ->> 'owner', ''),
    coalesce(p_campaign ->> 'scope', ''),
    coalesce(nullif(p_campaign ->> 'status', ''), 'Návrh'),
    nullif(p_campaign ->> 'startDate', '')::date,
    nullif(p_campaign ->> 'dueDate', '')::date,
    coalesce(p_campaign -> 'items', '[]'::jsonb),
    v_user_id,
    v_user_id,
    coalesce(nullif(p_campaign ->> 'createdAt', '')::timestamptz, now()),
    coalesce(nullif(p_campaign ->> 'updatedAt', '')::timestamptz, now())
  )
  on conflict (organization_id, code) do update set
    name = excluded.name,
    description = excluded.description,
    owner_name = excluded.owner_name,
    scope = excluded.scope,
    status = excluded.status,
    start_date = excluded.start_date,
    due_date = excluded.due_date,
    items = excluded.items,
    updated_by = v_user_id,
    updated_at = excluded.updated_at
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_iam_recert_campaign(p_campaign_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org_id uuid; v_user_id uuid;
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_iam_configurator();
  delete from public.iam_recert_campaigns where organization_id = v_org_id and code = p_campaign_code;
end;
$$;

alter table public.iam_catalog_items enable row level security;
alter table public.iam_requests enable row level security;
alter table public.iam_recert_campaigns enable row level security;
alter table public.iam_activity enable row level security;

drop policy if exists "iam members read catalog" on public.iam_catalog_items;
create policy "iam members read catalog" on public.iam_catalog_items for select to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "iam configurators manage catalog" on public.iam_catalog_items;
create policy "iam configurators manage catalog" on public.iam_catalog_items for all to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'))
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'));

drop policy if exists "iam members read requests" on public.iam_requests;
create policy "iam members read requests" on public.iam_requests for select to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "iam members insert requests" on public.iam_requests;
create policy "iam members insert requests" on public.iam_requests for insert to authenticated
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "iam members update requests" on public.iam_requests;
create policy "iam members update requests" on public.iam_requests for update to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'))
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "iam members delete requests" on public.iam_requests;
create policy "iam members delete requests" on public.iam_requests for delete to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "iam members read campaigns" on public.iam_recert_campaigns;
create policy "iam members read campaigns" on public.iam_recert_campaigns for select to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee'));

drop policy if exists "iam configurators manage campaigns" on public.iam_recert_campaigns;
create policy "iam configurators manage campaigns" on public.iam_recert_campaigns for all to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'))
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'));

drop policy if exists "iam managers read activity" on public.iam_activity;
create policy "iam managers read activity" on public.iam_activity for select to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver'));

-- Jednorazový import katalógu zo súčasného snapshotu.
with current_snapshots as (
  select distinct on (organization_id) organization_id, payload, created_by
  from public.app_snapshots
  where is_current = true
  order by organization_id, created_at desc
), catalog_items as (
  select snapshot.organization_id, snapshot.created_by, item
  from current_snapshots snapshot
  cross join lateral jsonb_array_elements(coalesce(snapshot.payload -> 'accessCatalog', '[]'::jsonb)) item
)
insert into public.iam_catalog_items (
  organization_id, code, name, service_key, system_name, description, business_owner,
  technical_owner, risk, privileged, default_duration_days, approval_path, is_active,
  created_by, updated_by
)
select
  organization_id,
  item ->> 'id',
  coalesce(item ->> 'name', ''),
  coalesce(item ->> 'serviceId', ''),
  coalesce(item ->> 'system', ''),
  coalesce(item ->> 'description', ''),
  coalesce(item ->> 'businessOwner', ''),
  coalesce(item ->> 'technicalOwner', ''),
  coalesce(nullif(item ->> 'risk', ''), 'Stredné'),
  coalesce(nullif(item ->> 'privileged', '')::boolean, false),
  greatest(0, coalesce(nullif(item ->> 'defaultDurationDays', '')::integer, 365)),
  coalesce(item -> 'approvalPath', '[]'::jsonb),
  coalesce(nullif(item ->> 'isActive', '')::boolean, true),
  created_by,
  created_by
from catalog_items
where coalesce(item ->> 'id', '') <> ''
on conflict (organization_id, code) do nothing;

-- Jednorazový import IAM žiadostí zo súčasného snapshotu.
with current_snapshots as (
  select distinct on (organization_id) organization_id, payload, created_by
  from public.app_snapshots
  where is_current = true
  order by organization_id, created_at desc
), request_items as (
  select snapshot.organization_id, snapshot.created_by, item
  from current_snapshots snapshot
  cross join lateral jsonb_array_elements(coalesce(snapshot.payload -> 'accessRequests', '[]'::jsonb)) item
)
insert into public.iam_requests (
  organization_id, code, request_type, subject_name, subject_email, department,
  manager_name, requester_name, service_key, catalog_item_id, requested_access,
  current_access, business_justification, privileged, risk, status, start_date,
  end_date, due_date, assignee, linked_task_key, approvals, comments, history,
  completed_at, created_by, updated_by, created_at, updated_at
)
select
  request_items.organization_id,
  request_items.item ->> 'id',
  coalesce(nullif(request_items.item ->> 'requestType', ''), 'Nový prístup'),
  coalesce(request_items.item ->> 'subjectName', ''),
  coalesce(request_items.item ->> 'subjectEmail', ''),
  coalesce(request_items.item ->> 'department', ''),
  coalesce(request_items.item ->> 'manager', ''),
  coalesce(request_items.item ->> 'requester', ''),
  coalesce(request_items.item ->> 'serviceId', ''),
  catalog.id,
  coalesce(request_items.item ->> 'requestedAccess', ''),
  coalesce(request_items.item ->> 'currentAccess', ''),
  coalesce(request_items.item ->> 'businessJustification', ''),
  coalesce(nullif(request_items.item ->> 'privileged', '')::boolean, false),
  coalesce(nullif(request_items.item ->> 'risk', ''), 'Stredné'),
  coalesce(nullif(request_items.item ->> 'status', ''), 'Návrh'),
  nullif(request_items.item ->> 'startDate', '')::date,
  nullif(request_items.item ->> 'endDate', '')::date,
  nullif(request_items.item ->> 'dueDate', '')::date,
  coalesce(request_items.item ->> 'assignee', ''),
  coalesce(request_items.item ->> 'linkedTaskId', ''),
  coalesce(request_items.item -> 'approvals', '[]'::jsonb),
  coalesce(request_items.item -> 'comments', '[]'::jsonb),
  coalesce(request_items.item -> 'history', '[]'::jsonb),
  nullif(request_items.item ->> 'completedAt', '')::timestamptz,
  request_items.created_by,
  request_items.created_by,
  coalesce(nullif(request_items.item ->> 'createdAt', '')::timestamptz, now()),
  coalesce(nullif(request_items.item ->> 'updatedAt', '')::timestamptz, now())
from request_items
left join public.iam_catalog_items catalog
  on catalog.organization_id = request_items.organization_id
 and catalog.code = nullif(request_items.item ->> 'catalogItemId', '')
where coalesce(request_items.item ->> 'id', '') <> ''
on conflict (organization_id, code) do nothing;

-- Jednorazový import recertifikačných kampaní zo súčasného snapshotu.
with current_snapshots as (
  select distinct on (organization_id) organization_id, payload, created_by
  from public.app_snapshots
  where is_current = true
  order by organization_id, created_at desc
), campaign_items as (
  select snapshot.organization_id, snapshot.created_by, item
  from current_snapshots snapshot
  cross join lateral jsonb_array_elements(coalesce(snapshot.payload -> 'recertificationCampaigns', '[]'::jsonb)) item
)
insert into public.iam_recert_campaigns (
  organization_id, code, name, description, owner_name, scope, status, start_date,
  due_date, items, created_by, updated_by, created_at, updated_at
)
select
  organization_id,
  item ->> 'id',
  coalesce(item ->> 'name', ''),
  coalesce(item ->> 'description', ''),
  coalesce(item ->> 'owner', ''),
  coalesce(item ->> 'scope', ''),
  coalesce(nullif(item ->> 'status', ''), 'Návrh'),
  nullif(item ->> 'startDate', '')::date,
  nullif(item ->> 'dueDate', '')::date,
  coalesce(item -> 'items', '[]'::jsonb),
  created_by,
  created_by,
  coalesce(nullif(item ->> 'createdAt', '')::timestamptz, now()),
  coalesce(nullif(item ->> 'updatedAt', '')::timestamptz, now())
from campaign_items
where coalesce(item ->> 'id', '') <> ''
on conflict (organization_id, code) do nothing;

revoke all on function public.assert_iam_member() from public;
revoke all on function public.assert_iam_configurator() from public;
revoke all on function public.upsert_iam_catalog_item(jsonb) from public;
revoke all on function public.delete_iam_catalog_item(text) from public;
revoke all on function public.upsert_iam_request(jsonb) from public;
revoke all on function public.delete_iam_request(text) from public;
revoke all on function public.upsert_iam_recert_campaign(jsonb) from public;
revoke all on function public.delete_iam_recert_campaign(text) from public;

grant execute on function public.upsert_iam_catalog_item(jsonb) to authenticated;
grant execute on function public.delete_iam_catalog_item(text) to authenticated;
grant execute on function public.upsert_iam_request(jsonb) to authenticated;
grant execute on function public.delete_iam_request(text) to authenticated;
grant execute on function public.upsert_iam_recert_campaign(jsonb) to authenticated;
grant execute on function public.delete_iam_recert_campaign(text) to authenticated;

grant select, insert, update, delete on public.iam_catalog_items to authenticated;
grant select, insert, update, delete on public.iam_requests to authenticated;
grant select, insert, update, delete on public.iam_recert_campaigns to authenticated;
grant select on public.iam_activity to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.iam_catalog_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.iam_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.iam_recert_campaigns;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';

commit;

select
  (select count(*) from public.iam_requests) as requests_count,
  (select count(*) from public.iam_catalog_items) as catalog_count,
  (select count(*) from public.iam_recert_campaigns) as campaigns_count,
  to_regprocedure('public.upsert_iam_request(jsonb)') as request_rpc,
  to_regprocedure('public.upsert_iam_catalog_item(jsonb)') as catalog_rpc,
  to_regprocedure('public.upsert_iam_recert_campaign(jsonb)') as campaign_rpc;
