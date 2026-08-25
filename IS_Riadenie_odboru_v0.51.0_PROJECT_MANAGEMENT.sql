-- IS Riadenie odboru v0.51.0
-- Riadenie projektov: projektove roly, portfolio, delivery, tim, financovanie a cross-module vazby.
-- Priamy upgrade zo stabilnej v0.49.0. Release v0.50.0 NIE JE predpokladom.

begin;

-- -----------------------------------------------------------------------------
-- 1. APLIKACNE ROLY A LEAST-PRIVILEGE SCOPE
-- -----------------------------------------------------------------------------

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin','manager','resolver','project_manager','project_member','employee','viewer'));

create or replace function public.default_access_scopes(p_role text, p_department text)
returns jsonb
language sql
immutable
as $$
  select case
    when coalesce(p_role,'viewer') = 'admin' then '{"oit":"write","oris":"write","shared":"write"}'::jsonb
    when coalesce(p_role,'viewer') in ('employee','project_manager','project_member') then '{"oit":"none","oris":"none","shared":"none"}'::jsonb
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

update public.profiles
set access_scopes = '{"oit":"none","oris":"none","shared":"none"}'::jsonb,
    updated_at = now()
where role in ('employee','project_manager','project_member')
  and coalesce(access_scopes,'{}'::jsonb) <> '{"oit":"none","oris":"none","shared":"none"}'::jsonb;

-- Azure/Entra ostava bezpecny auto-provisioning ako employee. Pri e-mail/invite flow
-- moze administrator explicitne vytvorit aj project_manager / project_member.
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
    if v_role not in ('admin','manager','resolver','project_manager','project_member','employee','viewer') then
      v_role := 'employee';
    end if;
    v_scopes := coalesce(new.raw_user_meta_data->'access_scopes', public.default_access_scopes(v_role, v_department));
  end if;

  insert into public.profiles (
    id, organization_id, full_name, email, department, job_title, phone, role,
    access_scopes, is_active, invited_at, invite_expires_at, accepted_at,
    last_login_at, created_at, updated_at
  ) values (
    new.id, v_org_id, v_full_name, lower(coalesce(new.email,'')), v_department,
    coalesce(new.raw_user_meta_data->>'job_title',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    v_role, v_scopes, true, now(),
    case when v_provider='azure' then null else now()+interval '24 hours' end,
    case when v_provider='azure' then now() else null end,
    null, now(), now()
  )
  on conflict (id) do update set
    email = case when excluded.email <> '' then excluded.email else public.profiles.email end,
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    access_scopes = case
      when public.profiles.role in ('employee','project_manager','project_member') then '{"oit":"none","oris":"none","shared":"none"}'::jsonb
      else public.profiles.access_scopes
    end,
    is_active = public.profiles.is_active,
    accepted_at = case when v_provider='azure' then coalesce(public.profiles.accepted_at,now()) else public.profiles.accepted_at end,
    invite_expires_at = case when v_provider='azure' then null else public.profiles.invite_expires_at end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 2. ROZSIRENIE EXISTUJUCEHO PROJEKTOVEHO ZAKLADU
-- -----------------------------------------------------------------------------

alter table public.work_projects add column if not exists phase text not null default 'Idea';
alter table public.work_projects add column if not exists health text not null default 'Zelený';
alter table public.work_projects add column if not exists delivery_model text not null default 'Hybridný';
alter table public.work_projects add column if not exists objective text not null default '';
alter table public.work_projects add column if not exists expected_outcome text not null default '';
alter table public.work_projects add column if not exists next_milestone text not null default '';
alter table public.work_projects add column if not exists next_milestone_due date;
alter table public.work_projects add column if not exists funding_status text not null default 'Neurčené';
alter table public.work_projects add column if not exists budget_total numeric(16,2) not null default 0;
alter table public.work_projects add column if not exists budget_spent numeric(16,2) not null default 0;
alter table public.work_projects add column if not exists manager_user_id uuid references auth.users(id) on delete set null;
alter table public.work_projects add column if not exists manager_name text not null default '';
alter table public.work_projects add column if not exists manager_email text not null default '';

-- Existujuce projekty zostavaju zachovane a dostanu zmysluplny PM fallback.
update public.work_projects
set manager_name = case when manager_name='' then owner else manager_name end,
    phase = case
      when phase <> 'Idea' then phase
      when lower(status) like '%ukon%' then 'Ukončenie'
      when lower(status) like '%akt%' or lower(status) like '%rieš%' then 'Realizácia'
      else phase
    end
where manager_name='' or phase='Idea';

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  project_id uuid not null references public.work_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null default '',
  email text not null default '',
  project_role text not null default 'Člen projektu',
  responsibility text not null default '',
  allocation_percent numeric(5,2) not null default 0 check (allocation_percent between 0 and 100),
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_members_org_code_unique unique (organization_id, code)
);

create table if not exists public.project_funding (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  project_id uuid not null references public.work_projects(id) on delete cascade,
  source_type text not null default 'Štátny rozpočet / úloha',
  source_name text not null default '',
  program text not null default '',
  task_code text not null default '',
  budget_year integer not null default extract(year from current_date)::integer,
  amount numeric(16,2) not null default 0,
  spent numeric(16,2) not null default 0,
  cofinancing_percent numeric(5,2) not null default 0 check (cofinancing_percent between 0 and 100),
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_funding_org_code_unique unique (organization_id, code)
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  project_id uuid not null references public.work_projects(id) on delete cascade,
  title text not null default '',
  phase text not null default '',
  gate text not null default '',
  owner text not null default '',
  due_date date,
  status text not null default 'Plánované',
  completed_at date,
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_milestones_org_code_unique unique (organization_id, code)
);

create table if not exists public.project_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  project_id uuid not null references public.work_projects(id) on delete cascade,
  target_type text not null default 'Iné',
  target_key text not null default '',
  target_name text not null default '',
  relation text not null default '',
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_links_org_code_unique unique (organization_id, code)
);

create index if not exists project_members_project_idx on public.project_members(project_id,is_active);
create index if not exists project_members_user_idx on public.project_members(organization_id,user_id,is_active);
create index if not exists project_members_email_idx on public.project_members(organization_id,lower(email),is_active);
create index if not exists project_funding_project_idx on public.project_funding(project_id,budget_year);
create index if not exists project_milestones_project_idx on public.project_milestones(project_id,due_date);
create index if not exists project_links_project_idx on public.project_links(project_id,target_type);
create index if not exists work_projects_pm_idx on public.work_projects(organization_id,manager_user_id,status);

create or replace function public.project_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;


drop trigger if exists project_members_set_updated_at on public.project_members;
create trigger project_members_set_updated_at before update on public.project_members for each row execute function public.project_set_updated_at();
drop trigger if exists project_funding_set_updated_at on public.project_funding;
create trigger project_funding_set_updated_at before update on public.project_funding for each row execute function public.project_set_updated_at();
drop trigger if exists project_milestones_set_updated_at on public.project_milestones;
create trigger project_milestones_set_updated_at before update on public.project_milestones for each row execute function public.project_set_updated_at();
drop trigger if exists project_links_set_updated_at on public.project_links;
create trigger project_links_set_updated_at before update on public.project_links for each row execute function public.project_set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. AUTORIZACIA PROJEKTOVEHO PORTFOLIA
-- -----------------------------------------------------------------------------

create or replace function public.project_current_context()
returns table (
  organization_id uuid,
  user_id uuid,
  app_role text,
  full_name text,
  email text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select p.organization_id,p.id,p.role,p.full_name,lower(p.email)
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true
  limit 1;
end;
$$;

create or replace function public.project_can_read(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.work_projects wp on wp.id=p_project_id and wp.organization_id=p.organization_id
    where p.id=auth.uid() and p.is_active=true
      and (
        p.role in ('admin','project_manager')
        or (
          p.role='project_member'
          and exists (
            select 1 from public.project_members pm
            where pm.project_id=wp.id and pm.organization_id=p.organization_id and pm.is_active=true
              and (pm.valid_from is null or pm.valid_from<=current_date)
              and (pm.valid_to is null or pm.valid_to>=current_date)
              and (
                pm.user_id=p.id
                or (pm.email<>'' and lower(pm.email)=lower(p.email))
                or (pm.name<>'' and lower(trim(pm.name))=lower(trim(p.full_name)))
              )
          )
        )
      )
  );
$$;

create or replace function public.assert_project_manager()
returns table (organization_id uuid,user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_user uuid;
  v_role text;
begin
  select p.organization_id,p.id,p.role into v_org,v_user,v_role
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true;
  if v_org is null then raise exception 'Aktívny používateľský profil nebol nájdený.'; end if;
  if v_role not in ('admin','project_manager') then raise exception 'Používateľ nemá oprávnenie riadiť projektové portfólio.'; end if;
  return query select v_org,v_user;
end;
$$;

alter table public.project_members enable row level security;
alter table public.project_funding enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_links enable row level security;

-- Existujuce Work RLS ostava. Pridavame iba read-only projektovu cestu pre nove roly.
drop policy if exists "project portfolio readers see scoped projects" on public.work_projects;
create policy "project portfolio readers see scoped projects"
on public.work_projects for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (select public.current_app_role()) in ('project_manager','project_member')
  and public.project_can_read(id)
);

drop policy if exists "project portfolio readers see scoped tasks" on public.work_tasks;
create policy "project portfolio readers see scoped tasks"
on public.work_tasks for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (select public.current_app_role()) in ('project_manager','project_member')
  and project_id is not null
  and public.project_can_read(project_id)
);

-- Nove tabulky su z klienta iba citatelne; vsetky zapisy idu cez auditovatelne RPC.
drop policy if exists "project members scoped read" on public.project_members;
create policy "project members scoped read" on public.project_members for select to authenticated
using (organization_id=(select public.current_organization_id()) and public.project_can_read(project_id));
drop policy if exists "project funding scoped read" on public.project_funding;
create policy "project funding scoped read" on public.project_funding for select to authenticated
using (organization_id=(select public.current_organization_id()) and public.project_can_read(project_id));
drop policy if exists "project milestones scoped read" on public.project_milestones;
create policy "project milestones scoped read" on public.project_milestones for select to authenticated
using (organization_id=(select public.current_organization_id()) and public.project_can_read(project_id));
drop policy if exists "project links scoped read" on public.project_links;
create policy "project links scoped read" on public.project_links for select to authenticated
using (organization_id=(select public.current_organization_id()) and public.project_can_read(project_id));

-- -----------------------------------------------------------------------------
-- 4. JEDEN BEZPECNY READER PRE CELY MODUL
-- -----------------------------------------------------------------------------

create or replace function public.project_portfolio_read()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  v_projects jsonb := '[]'::jsonb;
  v_tasks jsonb := '[]'::jsonb;
  v_members jsonb := '[]'::jsonb;
  v_funding jsonb := '[]'::jsonb;
  v_milestones jsonb := '[]'::jsonb;
  v_links jsonb := '[]'::jsonb;
  v_references jsonb := '[]'::jsonb;
begin
  select * into c from public.project_current_context();
  if c.organization_id is null or c.app_role not in ('admin','project_manager','project_member') then
    raise exception 'Používateľ nemá prístup do Riadenia projektov.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.code,'name',p.name,'type',p.type,'owner',p.owner,'sponsor',p.sponsor,
    'status',p.status,'priority',p.priority,'progress',p.progress,
    'start',coalesce(p.start_date::text,''),'due',coalesce(p.due_date::text,''),
    'description',p.description,'note',p.note,'updatedAt',p.updated_at,
    'phase',p.phase,'health',p.health,'deliveryModel',p.delivery_model,
    'objective',p.objective,'expectedOutcome',p.expected_outcome,
    'nextMilestone',p.next_milestone,'nextMilestoneDue',coalesce(p.next_milestone_due::text,''),
    'fundingStatus',p.funding_status,
    'budgetTotal',coalesce((select sum(f.amount) from public.project_funding f where f.project_id=p.id),p.budget_total,0),
    'budgetSpent',coalesce((select sum(f.spent) from public.project_funding f where f.project_id=p.id),p.budget_spent,0),
    'managerUserId',coalesce(p.manager_user_id::text,''),'managerName',p.manager_name,'managerEmail',p.manager_email,
    'linkedSystemNames',coalesce((select jsonb_agg(l.target_name order by l.target_name) from public.project_links l where l.project_id=p.id and l.target_type='Informačný systém'),'[]'::jsonb),
    'linkedServiceIds',coalesce((select jsonb_agg(l.target_key order by l.target_key) from public.project_links l where l.project_id=p.id and l.target_type='Služba'),'[]'::jsonb),
    'linkedContractNumbers',coalesce((select jsonb_agg(l.target_key order by l.target_key) from public.project_links l where l.project_id=p.id and l.target_type='Zmluva'),'[]'::jsonb)
  ) order by p.priority,p.due_date nulls last,p.code),'[]'::jsonb)
  into v_projects
  from public.work_projects p
  where p.organization_id=c.organization_id and public.project_can_read(p.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',t.code,'title',t.title,'projectId',coalesce(p.code,''),'owner',t.owner,
    'priority',t.priority,'status',t.status,'start',coalesce(t.start_date::text,''),
    'due',coalesce(t.due_date::text,''),'description',t.description,'source',t.source,
    'type',t.type,'estimateHours',t.estimate_hours,'spentHours',t.spent_hours,
    'progress',t.progress,'dependency',t.dependency,'note',t.note,
    'createdAt',t.created_at,'updatedAt',t.updated_at
  ) order by t.due_date nulls last,t.code),'[]'::jsonb)
  into v_tasks
  from public.work_tasks t
  join public.work_projects p on p.id=t.project_id
  where t.organization_id=c.organization_id and public.project_can_read(p.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',m.code,'projectId',p.code,'userId',coalesce(m.user_id::text,''),'name',m.name,'email',m.email,
    'projectRole',m.project_role,'responsibility',m.responsibility,'allocationPercent',m.allocation_percent,
    'validFrom',coalesce(m.valid_from::text,''),'validTo',coalesce(m.valid_to::text,''),'isActive',m.is_active,'note',m.note
  ) order by m.project_role,m.name),'[]'::jsonb)
  into v_members
  from public.project_members m join public.work_projects p on p.id=m.project_id
  where m.organization_id=c.organization_id and public.project_can_read(p.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.code,'projectId',p.code,'sourceType',f.source_type,'sourceName',f.source_name,
    'program',f.program,'taskCode',f.task_code,'year',f.budget_year,'amount',f.amount,
    'spent',f.spent,'cofinancingPercent',f.cofinancing_percent,'note',f.note
  ) order by f.budget_year desc,f.source_type,f.code),'[]'::jsonb)
  into v_funding
  from public.project_funding f join public.work_projects p on p.id=f.project_id
  where f.organization_id=c.organization_id and public.project_can_read(p.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',m.code,'projectId',p.code,'title',m.title,'phase',m.phase,'gate',m.gate,'owner',m.owner,
    'due',coalesce(m.due_date::text,''),'status',m.status,'completedAt',coalesce(m.completed_at::text,''),'note',m.note
  ) order by m.due_date nulls last,m.code),'[]'::jsonb)
  into v_milestones
  from public.project_milestones m join public.work_projects p on p.id=m.project_id
  where m.organization_id=c.organization_id and public.project_can_read(p.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',l.code,'projectId',p.code,'targetType',l.target_type,'targetKey',l.target_key,
    'targetName',l.target_name,'relation',l.relation,'note',l.note
  ) order by l.target_type,l.target_name),'[]'::jsonb)
  into v_links
  from public.project_links l join public.work_projects p on p.id=l.project_id
  where l.organization_id=c.organization_id and public.project_can_read(p.id);

  if c.app_role in ('admin','project_manager') then
    with refs as (
      select 'Používateľ'::text as type,p.id::text as key,p.full_name as name,
             concat_ws(' · ',nullif(lower(p.email),''),nullif(p.department,'')) as subtitle
      from public.profiles p
      where p.organization_id=c.organization_id and p.is_active=true
      union all
      select 'Informačný systém',i.source_key,i.name,
             concat_ws(' · ',nullif(i.operation_status,''),nullif(i.technical_owner,''))
      from public.information_system_registry i
      where i.organization_id=c.organization_id
      union all
      select distinct 'Zmluva',i.contract_number,
             concat_ws(' · ',i.contract_number,nullif(i.supplier,'')),i.name
      from public.information_system_registry i
      where i.organization_id=c.organization_id and trim(i.contract_number)<>''
      union all
      select distinct 'Dodávateľ',i.supplier,i.supplier,'Evidovaný pri informačných systémoch'
      from public.information_system_registry i
      where i.organization_id=c.organization_id and trim(i.supplier)<>''
    )
    select coalesce(jsonb_agg(jsonb_build_object('type',type,'key',key,'name',name,'subtitle',subtitle) order by type,name),'[]'::jsonb)
    into v_references
    from refs;
  end if;

  return jsonb_build_object(
    'projects',v_projects,'tasks',v_tasks,'members',v_members,'funding',v_funding,
    'milestones',v_milestones,'links',v_links,'references',v_references
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. MANAZERSKE RPC + OBMEDZENY TASK UPDATE PRE CLENA PROJEKTU
-- -----------------------------------------------------------------------------

create or replace function public.project_portfolio_upsert_project(p_project jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid; v_user uuid; v_id uuid; v_manager uuid;
  v_code text := trim(coalesce(p_project->>'id',''));
  v_manager_email text := lower(trim(coalesce(p_project->>'managerEmail','')));
  v_manager_name text := trim(coalesce(p_project->>'managerName',p_project->>'owner',''));
begin
  select organization_id,user_id into v_org,v_user from public.assert_project_manager();
  if v_code='' then raise exception 'Projekt nemá identifikátor.'; end if;
  if trim(coalesce(p_project->>'name',''))='' then raise exception 'Projekt nemá názov.'; end if;

  begin v_manager := nullif(p_project->>'managerUserId','')::uuid; exception when invalid_text_representation then v_manager:=null; end;
  if v_manager is null and v_manager_email<>'' then
    select p.id into v_manager from public.profiles p where p.organization_id=v_org and lower(p.email)=v_manager_email and p.is_active=true limit 1;
  end if;
  if v_manager is null and v_manager_name<>'' then
    select p.id into v_manager from public.profiles p where p.organization_id=v_org and lower(trim(p.full_name))=lower(v_manager_name) and p.is_active=true limit 1;
  end if;

  insert into public.work_projects(
    organization_id,code,name,type,owner,sponsor,status,priority,progress,start_date,due_date,description,note,
    phase,health,delivery_model,objective,expected_outcome,next_milestone,next_milestone_due,funding_status,
    budget_total,budget_spent,manager_user_id,manager_name,manager_email,created_by,updated_by
  ) values (
    v_org,v_code,trim(p_project->>'name'),coalesce(nullif(p_project->>'type',''),'Projekt'),
    coalesce(nullif(v_manager_name,''),p_project->>'owner',''),coalesce(p_project->>'sponsor',''),
    coalesce(nullif(p_project->>'status',''),'Návrh'),coalesce(nullif(p_project->>'priority',''),'Stredná'),
    greatest(0,least(100,coalesce(nullif(p_project->>'progress','')::integer,0))),
    nullif(p_project->>'start','')::date,nullif(p_project->>'due','')::date,
    coalesce(p_project->>'description',''),coalesce(p_project->>'note',''),
    coalesce(nullif(p_project->>'phase',''),'Idea'),coalesce(nullif(p_project->>'health',''),'Zelený'),
    coalesce(nullif(p_project->>'deliveryModel',''),'Hybridný'),coalesce(p_project->>'objective',''),
    coalesce(p_project->>'expectedOutcome',''),coalesce(p_project->>'nextMilestone',''),
    nullif(p_project->>'nextMilestoneDue','')::date,coalesce(nullif(p_project->>'fundingStatus',''),'Neurčené'),
    greatest(0,coalesce(nullif(p_project->>'budgetTotal','')::numeric,0)),greatest(0,coalesce(nullif(p_project->>'budgetSpent','')::numeric,0)),
    v_manager,v_manager_name,v_manager_email,v_user,v_user
  )
  on conflict(organization_id,code) do update set
    name=excluded.name,type=excluded.type,owner=excluded.owner,sponsor=excluded.sponsor,status=excluded.status,
    priority=excluded.priority,progress=excluded.progress,start_date=excluded.start_date,due_date=excluded.due_date,
    description=excluded.description,note=excluded.note,phase=excluded.phase,health=excluded.health,
    delivery_model=excluded.delivery_model,objective=excluded.objective,expected_outcome=excluded.expected_outcome,
    next_milestone=excluded.next_milestone,next_milestone_due=excluded.next_milestone_due,funding_status=excluded.funding_status,
    budget_total=excluded.budget_total,budget_spent=excluded.budget_spent,manager_user_id=excluded.manager_user_id,
    manager_name=excluded.manager_name,manager_email=excluded.manager_email,updated_by=v_user
  returning id into v_id;

  if v_manager is not null or v_manager_email<>'' or v_manager_name<>'' then
    insert into public.project_members(
      organization_id,code,project_id,user_id,name,email,project_role,responsibility,allocation_percent,valid_from,is_active,created_by,updated_by
    )
    select v_org,'PM-'||v_code,v_id,v_manager,v_manager_name,v_manager_email,'Projektový manažér','Riadenie projektu',100,current_date,true,v_user,v_user
    where not exists (
      select 1 from public.project_members m where m.project_id=v_id and m.is_active=true and (
        (v_manager is not null and m.user_id=v_manager) or
        (v_manager_email<>'' and lower(m.email)=v_manager_email) or
        (v_manager_name<>'' and lower(trim(m.name))=lower(v_manager_name))
      )
    )
    on conflict(organization_id,code) do update set user_id=excluded.user_id,name=excluded.name,email=excluded.email,project_role='Projektový manažér',updated_by=v_user;
  else
    delete from public.project_members where organization_id=v_org and project_id=v_id and code='PM-'||v_code;
  end if;

  return v_id;
end;
$$;

create or replace function public.project_portfolio_delete_project(p_project_code text)
returns void language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_user uuid; v_id uuid;
begin
  select organization_id,user_id into v_org,v_user from public.assert_project_manager();
  select id into v_id from public.work_projects where organization_id=v_org and code=p_project_code;
  if v_id is null then return; end if;
  delete from public.work_tasks where organization_id=v_org and project_id=v_id;
  delete from public.work_projects where organization_id=v_org and id=v_id;
end; $$;

create or replace function public.project_portfolio_upsert_member(p_member jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_actor uuid; v_project uuid; v_id uuid; v_user uuid; v_code text; v_email text; v_name text;
begin
  select organization_id,user_id into v_org,v_actor from public.assert_project_manager();
  select id into v_project from public.work_projects where organization_id=v_org and code=trim(coalesce(p_member->>'projectId',''));
  if v_project is null then raise exception 'Projekt neexistuje.'; end if;
  v_code:=coalesce(nullif(trim(p_member->>'id'),''),'PMEM-'||substr(md5(random()::text||clock_timestamp()::text),1,12));
  v_email:=lower(trim(coalesce(p_member->>'email',''))); v_name:=trim(coalesce(p_member->>'name',''));
  begin v_user:=nullif(p_member->>'userId','')::uuid; exception when invalid_text_representation then v_user:=null; end;
  if v_user is null and v_email<>'' then select id into v_user from public.profiles where organization_id=v_org and lower(email)=v_email and is_active=true limit 1; end if;
  if v_user is null and v_name<>'' then select id into v_user from public.profiles where organization_id=v_org and lower(trim(full_name))=lower(v_name) and is_active=true limit 1; end if;
  insert into public.project_members(organization_id,code,project_id,user_id,name,email,project_role,responsibility,allocation_percent,valid_from,valid_to,is_active,note,created_by,updated_by)
  values(v_org,v_code,v_project,v_user,v_name,v_email,coalesce(nullif(p_member->>'projectRole',''),'Člen projektu'),coalesce(p_member->>'responsibility',''),greatest(0,least(100,coalesce(nullif(p_member->>'allocationPercent','')::numeric,0))),nullif(p_member->>'validFrom','')::date,nullif(p_member->>'validTo','')::date,coalesce(nullif(p_member->>'isActive','')::boolean,true),coalesce(p_member->>'note',''),v_actor,v_actor)
  on conflict(organization_id,code) do update set project_id=excluded.project_id,user_id=excluded.user_id,name=excluded.name,email=excluded.email,project_role=excluded.project_role,responsibility=excluded.responsibility,allocation_percent=excluded.allocation_percent,valid_from=excluded.valid_from,valid_to=excluded.valid_to,is_active=excluded.is_active,note=excluded.note,updated_by=v_actor
  returning id into v_id; return v_id;
end; $$;

create or replace function public.project_portfolio_delete_member(p_member_id text)
returns void language plpgsql security definer set search_path=public as $$ declare v_org uuid; v_user uuid; begin select organization_id,user_id into v_org,v_user from public.assert_project_manager(); delete from public.project_members where organization_id=v_org and code=p_member_id; end; $$;

create or replace function public.project_portfolio_upsert_funding(p_item jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_actor uuid; v_project uuid; v_id uuid; v_code text;
begin
  select organization_id,user_id into v_org,v_actor from public.assert_project_manager();
  select id into v_project from public.work_projects where organization_id=v_org and code=trim(coalesce(p_item->>'projectId',''));
  if v_project is null then raise exception 'Projekt neexistuje.'; end if;
  v_code:=coalesce(nullif(trim(p_item->>'id'),''),'PF-'||substr(md5(random()::text||clock_timestamp()::text),1,12));
  insert into public.project_funding(organization_id,code,project_id,source_type,source_name,program,task_code,budget_year,amount,spent,cofinancing_percent,note,created_by,updated_by)
  values(v_org,v_code,v_project,coalesce(nullif(p_item->>'sourceType',''),'Iné'),coalesce(p_item->>'sourceName',''),coalesce(p_item->>'program',''),coalesce(p_item->>'taskCode',''),coalesce(nullif(p_item->>'year','')::integer,extract(year from current_date)::integer),greatest(0,coalesce(nullif(p_item->>'amount','')::numeric,0)),greatest(0,coalesce(nullif(p_item->>'spent','')::numeric,0)),greatest(0,least(100,coalesce(nullif(p_item->>'cofinancingPercent','')::numeric,0))),coalesce(p_item->>'note',''),v_actor,v_actor)
  on conflict(organization_id,code) do update set project_id=excluded.project_id,source_type=excluded.source_type,source_name=excluded.source_name,program=excluded.program,task_code=excluded.task_code,budget_year=excluded.budget_year,amount=excluded.amount,spent=excluded.spent,cofinancing_percent=excluded.cofinancing_percent,note=excluded.note,updated_by=v_actor returning id into v_id;
  update public.work_projects set budget_total=(select coalesce(sum(amount),0) from public.project_funding where project_id=v_project),budget_spent=(select coalesce(sum(spent),0) from public.project_funding where project_id=v_project),updated_by=v_actor where id=v_project;
  return v_id;
end; $$;

create or replace function public.project_portfolio_delete_funding(p_item_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_actor uuid; v_project uuid;
begin select organization_id,user_id into v_org,v_actor from public.assert_project_manager(); select project_id into v_project from public.project_funding where organization_id=v_org and code=p_item_id; delete from public.project_funding where organization_id=v_org and code=p_item_id; if v_project is not null then update public.work_projects set budget_total=(select coalesce(sum(amount),0) from public.project_funding where project_id=v_project),budget_spent=(select coalesce(sum(spent),0) from public.project_funding where project_id=v_project),updated_by=v_actor where id=v_project; end if; end; $$;

create or replace function public.project_portfolio_upsert_milestone(p_item jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_actor uuid; v_project uuid; v_id uuid; v_code text;
begin select organization_id,user_id into v_org,v_actor from public.assert_project_manager(); select id into v_project from public.work_projects where organization_id=v_org and code=trim(coalesce(p_item->>'projectId','')); if v_project is null then raise exception 'Projekt neexistuje.'; end if; v_code:=coalesce(nullif(trim(p_item->>'id'),''),'MS-'||substr(md5(random()::text||clock_timestamp()::text),1,12)); insert into public.project_milestones(organization_id,code,project_id,title,phase,gate,owner,due_date,status,completed_at,note,created_by,updated_by) values(v_org,v_code,v_project,coalesce(p_item->>'title',''),coalesce(p_item->>'phase',''),coalesce(p_item->>'gate',''),coalesce(p_item->>'owner',''),nullif(p_item->>'due','')::date,coalesce(nullif(p_item->>'status',''),'Plánované'),nullif(p_item->>'completedAt','')::date,coalesce(p_item->>'note',''),v_actor,v_actor) on conflict(organization_id,code) do update set project_id=excluded.project_id,title=excluded.title,phase=excluded.phase,gate=excluded.gate,owner=excluded.owner,due_date=excluded.due_date,status=excluded.status,completed_at=excluded.completed_at,note=excluded.note,updated_by=v_actor returning id into v_id; return v_id; end; $$;
create or replace function public.project_portfolio_delete_milestone(p_item_id text) returns void language plpgsql security definer set search_path=public as $$ declare v_org uuid; v_user uuid; begin select organization_id,user_id into v_org,v_user from public.assert_project_manager(); delete from public.project_milestones where organization_id=v_org and code=p_item_id; end; $$;

create or replace function public.project_portfolio_upsert_link(p_item jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_actor uuid; v_project uuid; v_id uuid; v_code text;
begin select organization_id,user_id into v_org,v_actor from public.assert_project_manager(); select id into v_project from public.work_projects where organization_id=v_org and code=trim(coalesce(p_item->>'projectId','')); if v_project is null then raise exception 'Projekt neexistuje.'; end if; v_code:=coalesce(nullif(trim(p_item->>'id'),''),'PL-'||substr(md5(random()::text||clock_timestamp()::text),1,12)); insert into public.project_links(organization_id,code,project_id,target_type,target_key,target_name,relation,note,created_by,updated_by) values(v_org,v_code,v_project,coalesce(nullif(p_item->>'targetType',''),'Iné'),coalesce(p_item->>'targetKey',''),coalesce(p_item->>'targetName',''),coalesce(p_item->>'relation',''),coalesce(p_item->>'note',''),v_actor,v_actor) on conflict(organization_id,code) do update set project_id=excluded.project_id,target_type=excluded.target_type,target_key=excluded.target_key,target_name=excluded.target_name,relation=excluded.relation,note=excluded.note,updated_by=v_actor returning id into v_id; return v_id; end; $$;
create or replace function public.project_portfolio_delete_link(p_item_id text) returns void language plpgsql security definer set search_path=public as $$ declare v_org uuid; v_user uuid; begin select organization_id,user_id into v_org,v_user from public.assert_project_manager(); delete from public.project_links where organization_id=v_org and code=p_item_id; end; $$;

create or replace function public.project_portfolio_upsert_task(p_task jsonb)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  c record; v_project uuid; v_id uuid; v_code text:=trim(coalesce(p_task->>'id','')); v_project_code text:=trim(coalesce(p_task->>'projectId','')); v_existing public.work_tasks%rowtype;
begin
  select * into c from public.project_current_context();
  if c.organization_id is null or c.app_role not in ('admin','project_manager','project_member') then raise exception 'Používateľ nemá oprávnenie meniť projektové úlohy.'; end if;
  if v_code='' then raise exception 'Úloha nemá identifikátor.'; end if;

  if c.app_role='project_member' then
    select * into v_existing from public.work_tasks t where t.organization_id=c.organization_id and t.code=v_code;
    if v_existing.id is null or v_existing.project_id is null or not public.project_can_read(v_existing.project_id) then raise exception 'Úloha nie je dostupná členovi projektu.'; end if;
    if not (
      lower(trim(v_existing.owner)) in (lower(trim(c.full_name)),lower(trim(c.email)))
      or exists(select 1 from public.project_members pm where pm.project_id=v_existing.project_id and pm.is_active=true and (pm.user_id=c.user_id or lower(pm.email)=lower(c.email)) and lower(trim(v_existing.owner)) in (lower(trim(pm.name)),lower(trim(pm.email))))
    ) then raise exception 'Člen projektu môže aktualizovať iba svoju pridelenú úlohu.'; end if;
    update public.work_tasks set
      status=coalesce(nullif(p_task->>'status',''),status),
      spent_hours=greatest(0,coalesce(nullif(p_task->>'spentHours','')::numeric,spent_hours)),
      progress=greatest(0,least(100,coalesce(nullif(p_task->>'progress','')::integer,progress))),
      note=coalesce(p_task->>'note',note),updated_by=c.user_id
    where id=v_existing.id returning id into v_id;
    return v_id;
  end if;

  if trim(coalesce(p_task->>'title',''))='' then raise exception 'Úloha nemá názov.'; end if;
  if v_project_code<>'' then select id into v_project from public.work_projects where organization_id=c.organization_id and code=v_project_code; end if;
  if v_project is null then raise exception 'Úloha musí patriť do existujúceho projektu.'; end if;
  insert into public.work_tasks(organization_id,code,title,project_id,owner,priority,status,start_date,due_date,description,source,type,estimate_hours,spent_hours,progress,dependency,note,created_by,updated_by)
  values(c.organization_id,v_code,coalesce(p_task->>'title',''),v_project,coalesce(p_task->>'owner',''),coalesce(nullif(p_task->>'priority',''),'Stredná'),coalesce(nullif(p_task->>'status',''),'Návrh'),nullif(p_task->>'start','')::date,nullif(p_task->>'due','')::date,coalesce(p_task->>'description',''),coalesce(nullif(p_task->>'source',''),'Riadenie projektov'),coalesce(nullif(p_task->>'type',''),'Úloha'),greatest(0,coalesce(nullif(p_task->>'estimateHours','')::numeric,0)),greatest(0,coalesce(nullif(p_task->>'spentHours','')::numeric,0)),greatest(0,least(100,coalesce(nullif(p_task->>'progress','')::integer,0))),coalesce(p_task->>'dependency',''),coalesce(p_task->>'note',''),c.user_id,c.user_id)
  on conflict(organization_id,code) do update set title=excluded.title,project_id=excluded.project_id,owner=excluded.owner,priority=excluded.priority,status=excluded.status,start_date=excluded.start_date,due_date=excluded.due_date,description=excluded.description,source=excluded.source,type=excluded.type,estimate_hours=excluded.estimate_hours,spent_hours=excluded.spent_hours,progress=excluded.progress,dependency=excluded.dependency,note=excluded.note,updated_by=c.user_id returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.project_portfolio_delete_task(p_task_code text)
returns void language plpgsql security definer set search_path=public as $$ declare v_org uuid; v_user uuid; begin select organization_id,user_id into v_org,v_user from public.assert_project_manager(); delete from public.work_tasks where organization_id=v_org and code=p_task_code; end; $$;

-- -----------------------------------------------------------------------------
-- 6. GRANTY / REALTIME / READINESS
-- -----------------------------------------------------------------------------

revoke all on public.project_members,public.project_funding,public.project_milestones,public.project_links from public;
grant select on public.project_members,public.project_funding,public.project_milestones,public.project_links to authenticated;

revoke all on function public.project_current_context() from public;
revoke all on function public.project_can_read(uuid) from public;
revoke all on function public.assert_project_manager() from public;
revoke all on function public.project_portfolio_read() from public;
revoke all on function public.project_portfolio_upsert_project(jsonb) from public;
revoke all on function public.project_portfolio_delete_project(text) from public;
revoke all on function public.project_portfolio_upsert_task(jsonb) from public;
revoke all on function public.project_portfolio_delete_task(text) from public;
revoke all on function public.project_portfolio_upsert_member(jsonb) from public;
revoke all on function public.project_portfolio_delete_member(text) from public;
revoke all on function public.project_portfolio_upsert_funding(jsonb) from public;
revoke all on function public.project_portfolio_delete_funding(text) from public;
revoke all on function public.project_portfolio_upsert_milestone(jsonb) from public;
revoke all on function public.project_portfolio_delete_milestone(text) from public;
revoke all on function public.project_portfolio_upsert_link(jsonb) from public;
revoke all on function public.project_portfolio_delete_link(text) from public;

grant execute on function public.project_portfolio_read() to authenticated;
grant execute on function public.project_portfolio_upsert_project(jsonb) to authenticated;
grant execute on function public.project_portfolio_delete_project(text) to authenticated;
grant execute on function public.project_portfolio_upsert_task(jsonb) to authenticated;
grant execute on function public.project_portfolio_delete_task(text) to authenticated;
grant execute on function public.project_portfolio_upsert_member(jsonb) to authenticated;
grant execute on function public.project_portfolio_delete_member(text) to authenticated;
grant execute on function public.project_portfolio_upsert_funding(jsonb) to authenticated;
grant execute on function public.project_portfolio_delete_funding(text) to authenticated;
grant execute on function public.project_portfolio_upsert_milestone(jsonb) to authenticated;
grant execute on function public.project_portfolio_delete_milestone(text) to authenticated;
grant execute on function public.project_portfolio_upsert_link(jsonb) to authenticated;
grant execute on function public.project_portfolio_delete_link(text) to authenticated;

-- project_can_read je potrebna aj v RLS policy; authenticated ju moze volat, ale sama vracia iba boolean pre aktualneho usera.
grant execute on function public.project_can_read(uuid) to authenticated;

do $$ begin alter publication supabase_realtime add table public.project_members; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.project_funding; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.project_milestones; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.project_links; exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
commit;

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='work_projects' and column_name='phase') as project_extension_ready,
  to_regclass('public.project_members') is not null and to_regclass('public.project_funding') is not null and to_regclass('public.project_milestones') is not null and to_regclass('public.project_links') is not null as project_tables_ready,
  to_regprocedure('public.project_portfolio_read()') is not null and to_regprocedure('public.project_portfolio_upsert_project(jsonb)') is not null as project_rpc_ready,
  public.default_access_scopes('project_manager','Odbor 3.1') = '{"oit":"none","oris":"none","shared":"none"}'::jsonb as project_scope_hardened,
  exists(select 1 from pg_constraint where conname='profiles_role_check' and pg_get_constraintdef(oid) like '%project_manager%') as project_roles_ready;
