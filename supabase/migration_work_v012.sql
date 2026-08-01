-- IS Riadenie odboru v0.12.0
-- Projekty a úlohy v samostatných Supabase tabuľkách.
-- Skript je idempotentný. Spustite celý obsah v Supabase SQL Editore.

begin;

create table if not exists public.work_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null default '',
  type text not null default 'Projekt',
  owner text not null default '',
  sponsor text not null default '',
  status text not null default 'Plánované',
  priority text not null default 'Stredná',
  progress integer not null default 0 check (progress between 0 and 100),
  start_date date,
  due_date date,
  description text not null default '',
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_projects_org_code_unique unique (organization_id, code)
);

create table if not exists public.work_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  title text not null default '',
  project_id uuid references public.work_projects(id) on delete set null,
  owner text not null default '',
  priority text not null default 'Stredná',
  status text not null default 'Návrh',
  start_date date,
  due_date date,
  description text not null default '',
  source text not null default '',
  type text not null default 'Úloha',
  estimate_hours numeric(10,2) not null default 0,
  spent_hours numeric(10,2) not null default 0,
  progress integer not null default 0 check (progress between 0 and 100),
  dependency text not null default '',
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_tasks_org_code_unique unique (organization_id, code)
);

create table if not exists public.work_activity (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('project', 'task')),
  entity_code text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users(id) on delete set null,
  before_data jsonb,
  after_data jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists work_projects_org_status_idx
  on public.work_projects (organization_id, status, due_date);
create index if not exists work_tasks_org_status_idx
  on public.work_tasks (organization_id, status, due_date);
create index if not exists work_tasks_project_idx
  on public.work_tasks (project_id);
create index if not exists work_activity_org_changed_idx
  on public.work_activity (organization_id, changed_at desc);

create or replace function public.work_set_updated_at()
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

drop trigger if exists work_projects_set_updated_at on public.work_projects;
create trigger work_projects_set_updated_at
before update on public.work_projects
for each row execute function public.work_set_updated_at();

drop trigger if exists work_tasks_set_updated_at on public.work_tasks;
create trigger work_tasks_set_updated_at
before update on public.work_tasks
for each row execute function public.work_set_updated_at();

create or replace function public.log_work_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_org_id uuid;
  v_code text;
  v_entity text;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_org_id := (v_row ->> 'organization_id')::uuid;
  v_code := coalesce(v_row ->> 'code', '');
  v_entity := case when tg_table_name = 'work_projects' then 'project' else 'task' end;

  insert into public.work_activity (
    organization_id, entity_type, entity_code, action, changed_by, before_data, after_data
  ) values (
    v_org_id,
    v_entity,
    v_code,
    lower(tg_op),
    (select auth.uid()),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists work_projects_activity on public.work_projects;
create trigger work_projects_activity
after insert or update or delete on public.work_projects
for each row execute function public.log_work_activity();

drop trigger if exists work_tasks_activity on public.work_tasks;
create trigger work_tasks_activity
after insert or update or delete on public.work_tasks
for each row execute function public.log_work_activity();

create or replace function public.assert_work_editor()
returns table (organization_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_role text;
begin
  if v_user_id is null then
    raise exception 'Používateľ nie je prihlásený.';
  end if;

  select p.organization_id, p.role
    into v_org_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.is_active = true;

  if v_org_id is null then
    raise exception 'Aktívny používateľský profil nebol nájdený.';
  end if;

  if v_role not in ('admin', 'manager', 'resolver') then
    raise exception 'Používateľ nemá oprávnenie meniť Projekty a úlohy.';
  end if;

  return query select v_org_id, v_user_id;
end;
$$;

create or replace function public.upsert_work_project(p_project jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_id uuid;
  v_code text := trim(coalesce(p_project ->> 'id', ''));
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_work_editor();

  if v_code = '' then raise exception 'Projekt nemá identifikátor.'; end if;
  if trim(coalesce(p_project ->> 'name', '')) = '' then raise exception 'Projekt nemá názov.'; end if;

  insert into public.work_projects (
    organization_id, code, name, type, owner, sponsor, status, priority,
    progress, start_date, due_date, description, note, created_by, updated_by
  ) values (
    v_org_id,
    v_code,
    coalesce(p_project ->> 'name', ''),
    coalesce(nullif(p_project ->> 'type', ''), 'Projekt'),
    coalesce(p_project ->> 'owner', ''),
    coalesce(p_project ->> 'sponsor', ''),
    coalesce(nullif(p_project ->> 'status', ''), 'Plánované'),
    coalesce(nullif(p_project ->> 'priority', ''), 'Stredná'),
    greatest(0, least(100, coalesce(nullif(p_project ->> 'progress', '')::integer, 0))),
    nullif(p_project ->> 'start', '')::date,
    nullif(p_project ->> 'due', '')::date,
    coalesce(p_project ->> 'description', ''),
    coalesce(p_project ->> 'note', ''),
    v_user_id,
    v_user_id
  )
  on conflict (organization_id, code) do update set
    name = excluded.name,
    type = excluded.type,
    owner = excluded.owner,
    sponsor = excluded.sponsor,
    status = excluded.status,
    priority = excluded.priority,
    progress = excluded.progress,
    start_date = excluded.start_date,
    due_date = excluded.due_date,
    description = excluded.description,
    note = excluded.note,
    updated_by = v_user_id
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_work_project(p_project_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_work_editor();

  delete from public.work_projects
  where organization_id = v_org_id and code = p_project_code;
end;
$$;

create or replace function public.upsert_work_task(p_task jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_id uuid;
  v_project_id uuid;
  v_code text := trim(coalesce(p_task ->> 'id', ''));
  v_project_code text := trim(coalesce(p_task ->> 'projectId', ''));
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_work_editor();

  if v_code = '' then raise exception 'Úloha nemá identifikátor.'; end if;
  if trim(coalesce(p_task ->> 'title', '')) = '' then raise exception 'Úloha nemá názov.'; end if;

  if v_project_code <> '' then
    select id into v_project_id
    from public.work_projects
    where organization_id = v_org_id and code = v_project_code;
  end if;

  insert into public.work_tasks (
    organization_id, code, title, project_id, owner, priority, status,
    start_date, due_date, description, source, type, estimate_hours,
    spent_hours, progress, dependency, note, created_by, updated_by
  ) values (
    v_org_id,
    v_code,
    coalesce(p_task ->> 'title', ''),
    v_project_id,
    coalesce(p_task ->> 'owner', ''),
    coalesce(nullif(p_task ->> 'priority', ''), 'Stredná'),
    coalesce(nullif(p_task ->> 'status', ''), 'Návrh'),
    nullif(p_task ->> 'start', '')::date,
    nullif(p_task ->> 'due', '')::date,
    coalesce(p_task ->> 'description', ''),
    coalesce(p_task ->> 'source', ''),
    coalesce(nullif(p_task ->> 'type', ''), 'Úloha'),
    greatest(0, coalesce(nullif(p_task ->> 'estimateHours', '')::numeric, 0)),
    greatest(0, coalesce(nullif(p_task ->> 'spentHours', '')::numeric, 0)),
    greatest(0, least(100, coalesce(nullif(p_task ->> 'progress', '')::integer, 0))),
    coalesce(p_task ->> 'dependency', ''),
    coalesce(p_task ->> 'note', ''),
    v_user_id,
    v_user_id
  )
  on conflict (organization_id, code) do update set
    title = excluded.title,
    project_id = excluded.project_id,
    owner = excluded.owner,
    priority = excluded.priority,
    status = excluded.status,
    start_date = excluded.start_date,
    due_date = excluded.due_date,
    description = excluded.description,
    source = excluded.source,
    type = excluded.type,
    estimate_hours = excluded.estimate_hours,
    spent_hours = excluded.spent_hours,
    progress = excluded.progress,
    dependency = excluded.dependency,
    note = excluded.note,
    updated_by = v_user_id
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_work_task(p_task_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
begin
  select organization_id, user_id into v_org_id, v_user_id
  from public.assert_work_editor();

  delete from public.work_tasks
  where organization_id = v_org_id and code = p_task_code;
end;
$$;

alter table public.work_projects enable row level security;
alter table public.work_tasks enable row level security;
alter table public.work_activity enable row level security;

drop policy if exists "work readers see organization projects" on public.work_projects;
create policy "work readers see organization projects"
on public.work_projects for select to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
);

drop policy if exists "work editors insert projects" on public.work_projects;
create policy "work editors insert projects"
on public.work_projects for insert to authenticated
with check (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
);

drop policy if exists "work editors update projects" on public.work_projects;
create policy "work editors update projects"
on public.work_projects for update to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
)
with check (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
);

drop policy if exists "work editors delete projects" on public.work_projects;
create policy "work editors delete projects"
on public.work_projects for delete to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
);

drop policy if exists "work readers see organization tasks" on public.work_tasks;
create policy "work readers see organization tasks"
on public.work_tasks for select to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
);

drop policy if exists "work editors insert tasks" on public.work_tasks;
create policy "work editors insert tasks"
on public.work_tasks for insert to authenticated
with check (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
);

drop policy if exists "work editors update tasks" on public.work_tasks;
create policy "work editors update tasks"
on public.work_tasks for update to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
)
with check (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
);

drop policy if exists "work editors delete tasks" on public.work_tasks;
create policy "work editors delete tasks"
on public.work_tasks for delete to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
);

drop policy if exists "work readers see activity" on public.work_activity;
create policy "work readers see activity"
on public.work_activity for select to authenticated
using (
  organization_id = (select public.current_organization_id())
  and (select public.current_app_role()) in ('admin', 'manager', 'resolver')
);

-- Jednorazový import existujúcich projektov a úloh z aktuálneho snapshotu.
-- ON CONFLICT DO NOTHING zabezpečuje, že opakované spustenie neprepíše novšie DB dáta.
with current_snapshots as (
  select distinct on (organization_id)
    organization_id, payload, created_by
  from public.app_snapshots
  where is_current = true
  order by organization_id, created_at desc
), project_items as (
  select
    snapshot.organization_id,
    snapshot.created_by,
    item
  from current_snapshots snapshot
  cross join lateral jsonb_array_elements(coalesce(snapshot.payload -> 'projects', '[]'::jsonb)) item
)
insert into public.work_projects (
  organization_id, code, name, type, owner, sponsor, status, priority,
  progress, start_date, due_date, description, note, created_by, updated_by
)
select
  organization_id,
  item ->> 'id',
  coalesce(item ->> 'name', ''),
  coalesce(nullif(item ->> 'type', ''), 'Projekt'),
  coalesce(item ->> 'owner', ''),
  coalesce(item ->> 'sponsor', ''),
  coalesce(nullif(item ->> 'status', ''), 'Plánované'),
  coalesce(nullif(item ->> 'priority', ''), 'Stredná'),
  greatest(0, least(100, coalesce(nullif(item ->> 'progress', '')::integer, 0))),
  nullif(item ->> 'start', '')::date,
  nullif(item ->> 'due', '')::date,
  coalesce(item ->> 'description', ''),
  coalesce(item ->> 'note', ''),
  created_by,
  created_by
from project_items
where coalesce(item ->> 'id', '') <> ''
on conflict (organization_id, code) do nothing;

with current_snapshots as (
  select distinct on (organization_id)
    organization_id, payload, created_by
  from public.app_snapshots
  where is_current = true
  order by organization_id, created_at desc
), task_items as (
  select
    snapshot.organization_id,
    snapshot.created_by,
    item
  from current_snapshots snapshot
  cross join lateral jsonb_array_elements(coalesce(snapshot.payload -> 'tasks', '[]'::jsonb)) item
)
insert into public.work_tasks (
  organization_id, code, title, project_id, owner, priority, status,
  start_date, due_date, description, source, type, estimate_hours,
  spent_hours, progress, dependency, note, created_by, updated_by
)
select
  task_items.organization_id,
  task_items.item ->> 'id',
  coalesce(task_items.item ->> 'title', ''),
  project.id,
  coalesce(task_items.item ->> 'owner', ''),
  coalesce(nullif(task_items.item ->> 'priority', ''), 'Stredná'),
  coalesce(nullif(task_items.item ->> 'status', ''), 'Návrh'),
  nullif(task_items.item ->> 'start', '')::date,
  nullif(task_items.item ->> 'due', '')::date,
  coalesce(task_items.item ->> 'description', ''),
  coalesce(task_items.item ->> 'source', ''),
  coalesce(nullif(task_items.item ->> 'type', ''), 'Úloha'),
  greatest(0, coalesce(nullif(task_items.item ->> 'estimateHours', '')::numeric, 0)),
  greatest(0, coalesce(nullif(task_items.item ->> 'spentHours', '')::numeric, 0)),
  greatest(0, least(100, coalesce(nullif(task_items.item ->> 'progress', '')::integer, 0))),
  coalesce(task_items.item ->> 'dependency', ''),
  coalesce(task_items.item ->> 'note', ''),
  task_items.created_by,
  task_items.created_by
from task_items
left join public.work_projects project
  on project.organization_id = task_items.organization_id
 and project.code = nullif(task_items.item ->> 'projectId', '')
where coalesce(task_items.item ->> 'id', '') <> ''
on conflict (organization_id, code) do nothing;

revoke all on function public.assert_work_editor() from public;
revoke all on function public.upsert_work_project(jsonb) from public;
revoke all on function public.delete_work_project(text) from public;
revoke all on function public.upsert_work_task(jsonb) from public;
revoke all on function public.delete_work_task(text) from public;

grant execute on function public.upsert_work_project(jsonb) to authenticated;
grant execute on function public.delete_work_project(text) to authenticated;
grant execute on function public.upsert_work_task(jsonb) to authenticated;
grant execute on function public.delete_work_task(text) to authenticated;

grant select, insert, update, delete on public.work_projects to authenticated;
grant select, insert, update, delete on public.work_tasks to authenticated;
grant select on public.work_activity to authenticated;

-- Zapnutie Realtime pre spoluprácu viacerých používateľov.
do $$
begin
  alter publication supabase_realtime add table public.work_projects;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.work_tasks;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';

commit;

select
  (select count(*) from public.work_projects) as projects_count,
  (select count(*) from public.work_tasks) as tasks_count,
  to_regprocedure('public.upsert_work_project(jsonb)') as project_rpc,
  to_regprocedure('public.upsert_work_task(jsonb)') as task_rpc;
