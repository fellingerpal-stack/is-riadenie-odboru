-- IS Riadenie odboru v0.56.0
-- Project Financial Integration
-- Prepojenie projektoveho financovania na autoritativne IT ulohy 10 / 22 / 25.
-- Predpoklad: migracie v0.51.0, v0.52.0, v0.53.0 a v0.55.0 su uz nasadene.

begin;

do $$
begin
  if to_regclass('public.project_funding') is null then
    raise exception 'Chyba public.project_funding. Najprv spustite migration_project_management_v051.sql.';
  end if;
  if to_regprocedure('public.project_can_read(uuid)') is null or to_regprocedure('public.project_can_manage(uuid)') is null then
    raise exception 'Chybaju projektove scope funkcie. Najprv spustite migracie v0.52.0/v0.53.0.';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. DOPLNENIE METADAT PRE SYNCHRONIZOVANE FINANCNE VAZBY
-- -----------------------------------------------------------------------------

alter table public.project_funding add column if not exists source_mode text not null default 'manual';
alter table public.project_funding add column if not exists link_mode text;
alter table public.project_funding add column if not exists linked_task_code text not null default '';
alter table public.project_funding add column if not exists allocation_amount numeric(16,2) not null default 0;
alter table public.project_funding add column if not exists filter_zak text not null default '';
alter table public.project_funding add column if not exists selected_ledger_ids jsonb not null default '[]'::jsonb;
alter table public.project_funding add column if not exists sync_source text not null default '';

update public.project_funding
set source_mode='manual'
where source_mode is null or trim(source_mode)='';

-- -----------------------------------------------------------------------------
-- 2. READ MODEL - VRACIA AJ INFORMACIU O VAZBE NA IT FINANCNU ULOHU
-- -----------------------------------------------------------------------------

create or replace function public.project_finance_read()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_org uuid;
  v_role text;
  v_result jsonb := '[]'::jsonb;
begin
  select p.organization_id,p.role into v_org,v_role
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true;

  if v_org is null or v_role not in ('admin','project_manager','project_member') then
    raise exception 'Pouzivatel nema pristup do projektoveho financovania.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.code,
    'projectId',wp.code,
    'sourceType',f.source_type,
    'sourceName',f.source_name,
    'program',f.program,
    'taskCode',f.task_code,
    'year',f.budget_year,
    'amount',f.amount,
    'spent',f.spent,
    'cofinancingPercent',f.cofinancing_percent,
    'note',f.note,
    'sourceMode',coalesce(nullif(f.source_mode,''),'manual'),
    'linkMode',f.link_mode,
    'linkedTaskCode',f.linked_task_code,
    'allocationAmount',f.allocation_amount,
    'filterZak',f.filter_zak,
    'selectedLedgerIds',coalesce(f.selected_ledger_ids,'[]'::jsonb),
    'syncSource',f.sync_source
  ) order by f.budget_year desc,f.source_type,f.code),'[]'::jsonb)
  into v_result
  from public.project_funding f
  join public.work_projects wp on wp.id=f.project_id
  where f.organization_id=v_org
    and public.project_can_read(wp.id);

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. SCOPED UPSERT - ADMIN ALEBO PM LEN NA PROJEKTE, KTORY RIADI
-- -----------------------------------------------------------------------------

create or replace function public.project_finance_upsert(p_item jsonb)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_org uuid;
  v_actor uuid;
  v_role text;
  v_project uuid;
  v_id uuid;
  v_code text;
  v_source_mode text;
  v_link_mode text;
  v_linked_task text;
  v_selected jsonb;
begin
  select p.organization_id,p.id,p.role into v_org,v_actor,v_role
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true;

  if v_org is null or v_role not in ('admin','project_manager') then
    raise exception 'Na zmenu projektoveho financovania nemate opravnenie.';
  end if;

  select wp.id into v_project
  from public.work_projects wp
  where wp.organization_id=v_org
    and wp.code=trim(coalesce(p_item->>'projectId',''));

  if v_project is null then raise exception 'Projekt neexistuje.'; end if;
  if not public.project_can_manage(v_project) then
    raise exception 'Projektovy manazer moze menit financovanie iba svojho projektu.';
  end if;

  v_code := coalesce(nullif(trim(p_item->>'id'),''),'PF-'||substr(md5(random()::text||clock_timestamp()::text),1,12));
  v_source_mode := coalesce(nullif(trim(p_item->>'sourceMode'),''),'manual');
  v_link_mode := nullif(trim(p_item->>'linkMode'),'');
  v_linked_task := trim(coalesce(p_item->>'linkedTaskCode',p_item->>'taskCode',''));
  v_selected := coalesce(p_item->'selectedLedgerIds','[]'::jsonb);
  if jsonb_typeof(v_selected) is distinct from 'array' then v_selected := '[]'::jsonb; end if;

  if v_source_mode not in ('manual','linked_task') then
    raise exception 'Neznamy sourceMode.';
  end if;
  if v_source_mode='linked_task' then
    if v_linked_task not in ('10','22','25') then raise exception 'Prepojena IT uloha musi byt 10, 22 alebo 25.'; end if;
    if v_link_mode not in ('whole_task','allocation','zak','items') then raise exception 'Neznamy sposob financnej vazby.'; end if;
  else
    v_link_mode := null;
    v_linked_task := '';
    v_selected := '[]'::jsonb;
  end if;

  insert into public.project_funding(
    organization_id,code,project_id,source_type,source_name,program,task_code,budget_year,
    amount,spent,cofinancing_percent,note,source_mode,link_mode,linked_task_code,
    allocation_amount,filter_zak,selected_ledger_ids,sync_source,created_by,updated_by
  ) values (
    v_org,v_code,v_project,
    coalesce(nullif(p_item->>'sourceType',''),'Iné'),
    coalesce(p_item->>'sourceName',''),
    coalesce(p_item->>'program',''),
    coalesce(p_item->>'taskCode',''),
    coalesce(nullif(p_item->>'year','')::integer,extract(year from current_date)::integer),
    greatest(0,coalesce(nullif(p_item->>'amount','')::numeric,0)),
    greatest(0,coalesce(nullif(p_item->>'spent','')::numeric,0)),
    greatest(0,least(100,coalesce(nullif(p_item->>'cofinancingPercent','')::numeric,0))),
    coalesce(p_item->>'note',''),
    v_source_mode,v_link_mode,v_linked_task,
    greatest(0,coalesce(nullif(p_item->>'allocationAmount','')::numeric,0)),
    case when v_source_mode='linked_task' then coalesce(p_item->>'filterZak','') else '' end,
    v_selected,
    case when v_source_mode='linked_task' then coalesce(p_item->>'syncSource','') else '' end,
    v_actor,v_actor
  )
  on conflict(organization_id,code) do update set
    project_id=excluded.project_id,
    source_type=excluded.source_type,
    source_name=excluded.source_name,
    program=excluded.program,
    task_code=excluded.task_code,
    budget_year=excluded.budget_year,
    amount=excluded.amount,
    spent=excluded.spent,
    cofinancing_percent=excluded.cofinancing_percent,
    note=excluded.note,
    source_mode=excluded.source_mode,
    link_mode=excluded.link_mode,
    linked_task_code=excluded.linked_task_code,
    allocation_amount=excluded.allocation_amount,
    filter_zak=excluded.filter_zak,
    selected_ledger_ids=excluded.selected_ledger_ids,
    sync_source=excluded.sync_source,
    updated_by=v_actor
  returning id into v_id;

  update public.work_projects
  set budget_total=(select coalesce(sum(amount),0) from public.project_funding where project_id=v_project),
      budget_spent=(select coalesce(sum(spent),0) from public.project_funding where project_id=v_project),
      updated_by=v_actor
  where id=v_project;

  return v_id;
end;
$$;

create or replace function public.project_finance_delete(p_item_id text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_org uuid;
  v_actor uuid;
  v_role text;
  v_project uuid;
begin
  select p.organization_id,p.id,p.role into v_org,v_actor,v_role
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true;

  if v_org is null or v_role not in ('admin','project_manager') then
    raise exception 'Na zmenu projektoveho financovania nemate opravnenie.';
  end if;

  select f.project_id into v_project
  from public.project_funding f
  where f.organization_id=v_org and f.code=p_item_id;

  if v_project is null then return; end if;
  if not public.project_can_manage(v_project) then
    raise exception 'Projektovy manazer moze menit financovanie iba svojho projektu.';
  end if;

  delete from public.project_funding
  where organization_id=v_org and code=p_item_id;

  update public.work_projects
  set budget_total=(select coalesce(sum(amount),0) from public.project_funding where project_id=v_project),
      budget_spent=(select coalesce(sum(spent),0) from public.project_funding where project_id=v_project),
      updated_by=v_actor
  where id=v_project;
end;
$$;

revoke all on function public.project_finance_read() from public;
revoke all on function public.project_finance_upsert(jsonb) from public;
revoke all on function public.project_finance_delete(text) from public;
grant execute on function public.project_finance_read() to authenticated;
grant execute on function public.project_finance_upsert(jsonb) to authenticated;
grant execute on function public.project_finance_delete(text) to authenticated;

notify pgrst, 'reload schema';
commit;

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='project_funding' and column_name='source_mode') as project_finance_columns_ready,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='project_funding' and column_name='selected_ledger_ids') as project_finance_items_ready,
  to_regprocedure('public.project_finance_read()') is not null as project_finance_read_ready,
  to_regprocedure('public.project_finance_upsert(jsonb)') is not null as project_finance_write_ready,
  to_regprocedure('public.project_finance_delete(text)') is not null as project_finance_delete_ready;
