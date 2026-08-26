-- IS Riadenie odboru v0.56.2
-- Entity Financial Allocation
-- Auditovatelne mapovanie riadkov kontraktovych uloh 10 / 22 / 25 na CVTI 360 entity a KOMIS moduly.
-- Predpoklad: existuju profily/auth z predchadzajucich releaseov. Zdrojovy ledger zostava read-only v aplikacii.

begin;

create table if not exists public.entity_financial_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  code text not null,
  entity_id text not null,
  entity_name text not null default '',
  module_id text not null default '',
  module_code text not null default '',
  module_name text not null default '',
  task_code text not null,
  ledger_id text not null,
  allocation_mode text not null default 'full',
  allocation_percent numeric(8,4) not null default 0,
  source_amount numeric(16,2) not null default 0,
  allocated_amount numeric(16,2) not null default 0,
  source_date date,
  source_document text not null default '',
  source_zak text not null default '',
  source_kpd text not null default '',
  source_ppd text not null default '',
  source_pracm text not null default '',
  source_note text not null default '',
  note text not null default '',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_fin_alloc_mode_chk check (allocation_mode in ('full','amount','percent','suggested')),
  constraint entity_fin_alloc_task_chk check (task_code in ('10','22','25')),
  constraint entity_fin_alloc_percent_chk check (allocation_percent >= 0 and allocation_percent <= 100),
  constraint entity_fin_alloc_code_uq unique (organization_id, code)
);

create index if not exists entity_fin_alloc_entity_idx on public.entity_financial_allocations(organization_id, entity_id);
create index if not exists entity_fin_alloc_module_idx on public.entity_financial_allocations(organization_id, module_id);
create index if not exists entity_fin_alloc_ledger_idx on public.entity_financial_allocations(organization_id, ledger_id);
create index if not exists entity_fin_alloc_task_idx on public.entity_financial_allocations(organization_id, task_code);

alter table public.entity_financial_allocations enable row level security;

create or replace function public.entity_finance_allocation_read()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_org uuid;
  v_result jsonb := '[]'::jsonb;
begin
  select p.organization_id into v_org
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true;

  if v_org is null then
    raise exception 'Pouzivatel nema aktivny profil.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.code,
    'entityId',a.entity_id,
    'entityName',a.entity_name,
    'moduleId',a.module_id,
    'moduleCode',a.module_code,
    'moduleName',a.module_name,
    'taskCode',a.task_code,
    'ledgerId',a.ledger_id,
    'allocationMode',a.allocation_mode,
    'allocationPercent',a.allocation_percent,
    'sourceAmount',a.source_amount,
    'allocatedAmount',a.allocated_amount,
    'sourceDate',coalesce(a.source_date::text,''),
    'sourceDocument',a.source_document,
    'sourceZak',a.source_zak,
    'sourceKpd',a.source_kpd,
    'sourcePpd',a.source_ppd,
    'sourcePracm',a.source_pracm,
    'sourceNote',a.source_note,
    'note',a.note,
    'createdAt',a.created_at,
    'updatedAt',a.updated_at
  ) order by a.source_date desc nulls last,a.task_code,a.source_document,a.code),'[]'::jsonb)
  into v_result
  from public.entity_financial_allocations a
  where a.organization_id=v_org;

  return v_result;
end;
$$;

create or replace function public.entity_finance_allocation_upsert(p_item jsonb)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_org uuid;
  v_actor uuid;
  v_role text;
  v_id uuid;
  v_code text;
  v_mode text;
  v_task text;
  v_ledger text;
  v_source numeric(16,2);
  v_alloc numeric(16,2);
  v_pct numeric(8,4);
  v_used numeric(16,2);
  v_existing_source numeric(16,2);
begin
  select p.organization_id,p.id,p.role into v_org,v_actor,v_role
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true;

  if v_org is null or v_role not in ('admin','manager') then
    raise exception 'Na mapovanie financii CVTI 360 nemate opravnenie.';
  end if;

  v_code := coalesce(nullif(trim(p_item->>'id'),''),'EFA-'||substr(md5(random()::text||clock_timestamp()::text),1,12));
  v_mode := coalesce(nullif(trim(p_item->>'allocationMode'),''),'full');
  v_task := trim(coalesce(p_item->>'taskCode',''));
  v_ledger := trim(coalesce(p_item->>'ledgerId',''));
  v_source := coalesce(nullif(p_item->>'sourceAmount','')::numeric,0);
  v_alloc := coalesce(nullif(p_item->>'allocatedAmount','')::numeric,0);
  v_pct := greatest(0,least(100,coalesce(nullif(p_item->>'allocationPercent','')::numeric,0)));

  if trim(coalesce(p_item->>'entityId',''))='' then raise exception 'Chyba cielova CVTI 360 entita.'; end if;
  if v_task not in ('10','22','25') then raise exception 'Kontraktova uloha musi byt 10, 22 alebo 25.'; end if;
  if v_ledger='' then raise exception 'Chyba zdrojovy ledger riadok.'; end if;
  if v_mode not in ('full','amount','percent','suggested') then raise exception 'Neznamy sposob alokacie.'; end if;
  if abs(v_source) < 0.005 then raise exception 'Zdrojova suma nesmie byt nulova.'; end if;
  if abs(v_alloc) < 0.005 then raise exception 'Alokovana suma nesmie byt nulova.'; end if;
  if sign(v_alloc) <> sign(v_source) then raise exception 'Alokacia musi mat rovnake znamienko ako zdrojovy riadok.'; end if;

  select max(source_amount) into v_existing_source
  from public.entity_financial_allocations
  where organization_id=v_org and ledger_id=v_ledger and code<>v_code;

  if v_existing_source is not null and abs(v_existing_source-v_source)>0.01 then
    raise exception 'Zdrojova suma ledger riadku sa nezhoduje s uz ulozenou auditnou stopou.';
  end if;

  select coalesce(sum(abs(allocated_amount)),0) into v_used
  from public.entity_financial_allocations
  where organization_id=v_org and ledger_id=v_ledger and code<>v_code;

  if v_used + abs(v_alloc) > abs(v_source) + 0.01 then
    raise exception 'Alokacia by prekrocila zdrojovu platbu. Uz priradene: %, zdroj: %, nova alokacia: %.',v_used,abs(v_source),abs(v_alloc);
  end if;

  insert into public.entity_financial_allocations(
    organization_id,code,entity_id,entity_name,module_id,module_code,module_name,
    task_code,ledger_id,allocation_mode,allocation_percent,source_amount,allocated_amount,
    source_date,source_document,source_zak,source_kpd,source_ppd,source_pracm,source_note,note,
    created_by,updated_by,updated_at
  ) values (
    v_org,v_code,trim(p_item->>'entityId'),coalesce(p_item->>'entityName',''),
    coalesce(p_item->>'moduleId',''),coalesce(p_item->>'moduleCode',''),coalesce(p_item->>'moduleName',''),
    v_task,v_ledger,v_mode,v_pct,v_source,v_alloc,
    nullif(p_item->>'sourceDate','')::date,coalesce(p_item->>'sourceDocument',''),coalesce(p_item->>'sourceZak',''),
    coalesce(p_item->>'sourceKpd',''),coalesce(p_item->>'sourcePpd',''),coalesce(p_item->>'sourcePracm',''),
    coalesce(p_item->>'sourceNote',''),coalesce(p_item->>'note',''),v_actor,v_actor,now()
  )
  on conflict(organization_id,code) do update set
    entity_id=excluded.entity_id,entity_name=excluded.entity_name,module_id=excluded.module_id,module_code=excluded.module_code,module_name=excluded.module_name,
    task_code=excluded.task_code,ledger_id=excluded.ledger_id,allocation_mode=excluded.allocation_mode,allocation_percent=excluded.allocation_percent,
    source_amount=excluded.source_amount,allocated_amount=excluded.allocated_amount,source_date=excluded.source_date,source_document=excluded.source_document,
    source_zak=excluded.source_zak,source_kpd=excluded.source_kpd,source_ppd=excluded.source_ppd,source_pracm=excluded.source_pracm,
    source_note=excluded.source_note,note=excluded.note,updated_by=v_actor,updated_at=now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.entity_finance_allocation_delete(p_item_id text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_org uuid;
  v_role text;
begin
  select p.organization_id,p.role into v_org,v_role
  from public.profiles p
  where p.id=auth.uid() and p.is_active=true;
  if v_org is null or v_role not in ('admin','manager') then
    raise exception 'Na mazanie financnych mapovani CVTI 360 nemate opravnenie.';
  end if;
  delete from public.entity_financial_allocations where organization_id=v_org and code=p_item_id;
end;
$$;

revoke all on table public.entity_financial_allocations from public;
revoke all on function public.entity_finance_allocation_read() from public;
revoke all on function public.entity_finance_allocation_upsert(jsonb) from public;
revoke all on function public.entity_finance_allocation_delete(text) from public;
grant execute on function public.entity_finance_allocation_read() to authenticated;
grant execute on function public.entity_finance_allocation_upsert(jsonb) to authenticated;
grant execute on function public.entity_finance_allocation_delete(text) to authenticated;

notify pgrst, 'reload schema';
commit;

select
  to_regclass('public.entity_financial_allocations') is not null as entity_finance_table_ready,
  to_regprocedure('public.entity_finance_allocation_read()') is not null as entity_finance_read_ready,
  to_regprocedure('public.entity_finance_allocation_upsert(jsonb)') is not null as entity_finance_write_ready,
  to_regprocedure('public.entity_finance_allocation_delete(text)') is not null as entity_finance_delete_ready,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='entity_financial_allocations' and column_name='allocated_amount') as entity_finance_amount_ready;
