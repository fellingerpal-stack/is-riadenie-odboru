-- IS Riadenie odboru v0.34.0
-- Log Management & Audit Trail
--
-- Cieľ:
-- - nemenný audit kto / kedy / čo zmenil,
-- - automatický audit každého uloženého aplikačného snapshotu,
-- - audit samostatných DB registrov (projekty, helpdesk, IAM, digitálne portfólio),
-- - administrátorský read-only pohľad cez RLS,
-- - zachovanie stabilného save_app_snapshot_v3(); nový v4 ho iba bezpečne obalí.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'LOG_034_PREREQUISITE: chyba public.profiles.';
  end if;
  if to_regclass('public.app_snapshots') is null then
    raise exception 'LOG_034_PREREQUISITE: chyba public.app_snapshots.';
  end if;
  if to_regprocedure('public.save_app_snapshot_v3(jsonb,integer)') is null then
    raise exception 'LOG_034_PREREQUISITE: chyba save_app_snapshot_v3(jsonb,integer). Najprv musi byt funkcny snapshot hotfix 0.30.3/0.30.4.';
  end if;
  if to_regprocedure('public.current_organization_id()') is null or to_regprocedure('public.current_app_role()') is null then
    raise exception 'LOG_034_PREREQUISITE: chybaju IAM helper funkcie current_organization_id/current_app_role.';
  end if;
end
$$;

create table if not exists public.app_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default '',
  actor_email text not null default '',
  category text not null default 'system',
  action text not null,
  module text not null default '',
  scope text not null default '',
  entity_type text not null default '',
  entity_id text not null default '',
  entity_label text not null default '',
  summary text not null default '',
  details jsonb not null default '{}'::jsonb,
  status text not null default 'success',
  source text not null default 'application',
  snapshot_version integer,
  request_ip text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  constraint app_audit_log_category_check check (category in ('data_change','user_admin','security','system','integration','unknown')),
  constraint app_audit_log_status_check check (status in ('success','warning','error'))
);

create index if not exists app_audit_log_org_created_idx
  on public.app_audit_log (organization_id, created_at desc);
create index if not exists app_audit_log_org_actor_idx
  on public.app_audit_log (organization_id, actor_id, created_at desc);
create index if not exists app_audit_log_org_module_idx
  on public.app_audit_log (organization_id, module, created_at desc);
create index if not exists app_audit_log_org_action_idx
  on public.app_audit_log (organization_id, action, created_at desc);
create unique index if not exists app_audit_log_snapshot_history_unique
  on public.app_audit_log (organization_id, source, entity_id)
  where source in ('snapshot_history','snapshot_rpc');

comment on table public.app_audit_log is
  'Append-only audit trail v0.34.0. Priamy INSERT/UPDATE/DELETE klientom nie je povoleny; zapisuje sa cez RPC a DB triggre.';

create or replace function public.audit_request_ip()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_headers jsonb;
  v_ip text := '';
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  v_ip := coalesce(v_headers->>'cf-connecting-ip', split_part(coalesce(v_headers->>'x-forwarded-for',''), ',', 1), '');
  return left(trim(v_ip), 120);
end;
$$;

create or replace function public.audit_user_agent()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_headers jsonb;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  return left(coalesce(v_headers->>'user-agent',''), 600);
end;
$$;

create or replace function public.audit_record_key(p_item jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(p_item->>'id',''),
    nullif(p_item->>'key',''),
    nullif(p_item->>'sourceKey',''),
    nullif(p_item->>'code',''),
    nullif(p_item->>'number',''),
    nullif(p_item->>'contractNumber',''),
    nullif(p_item->>'email',''),
    nullif(p_item->>'name',''),
    nullif(p_item->>'title',''),
    md5(coalesce(p_item::text,''))
  );
$$;

create or replace function public.audit_record_label(p_item jsonb)
returns text
language sql
immutable
as $$
  select left(coalesce(
    nullif(p_item->>'name',''),
    nullif(p_item->>'title',''),
    nullif(p_item->>'label',''),
    nullif(p_item->>'fullName',''),
    nullif(p_item->>'email',''),
    nullif(p_item->>'code',''),
    nullif(p_item->>'number',''),
    nullif(p_item->>'contractNumber',''),
    nullif(p_item->>'id',''),
    public.audit_record_key(p_item)
  ), 300);
$$;

create or replace function public.audit_jsonb_object_delta(p_before jsonb, p_after jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_before jsonb := case when jsonb_typeof(p_before)='object' then p_before else '{}'::jsonb end;
  v_after jsonb := case when jsonb_typeof(p_after)='object' then p_after else '{}'::jsonb end;
  v_key text;
  v_result jsonb := '{}'::jsonb;
  v_count integer := 0;
  v_before_text text;
  v_after_text text;
begin
  for v_key in
    select key from (
      select jsonb_object_keys(v_before) as key
      union
      select jsonb_object_keys(v_after) as key
    ) q
    where key not in (
      'created_at','updated_at','createdAt','updatedAt','organization_id','organizationId',
      'attachments','content','body','binary','password','token','secret','access_token','refresh_token'
    )
    order by key
  loop
    if (v_before->v_key) is distinct from (v_after->v_key) then
      v_count := v_count + 1;
      if v_count <= 40 then
        v_before_text := left(coalesce((v_before->v_key)::text, 'null'), 1200);
        v_after_text := left(coalesce((v_after->v_key)::text, 'null'), 1200);
        v_result := v_result || jsonb_build_object(v_key, jsonb_build_object('before', v_before_text, 'after', v_after_text));
      end if;
    end if;
  end loop;
  return jsonb_build_object('changed_count', v_count, 'fields', v_result, 'truncated', v_count > 40);
end;
$$;

create or replace function public.audit_jsonb_array_delta(p_before jsonb, p_after jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_before jsonb := case when jsonb_typeof(p_before)='array' then p_before else '[]'::jsonb end;
  v_after jsonb := case when jsonb_typeof(p_after)='array' then p_after else '[]'::jsonb end;
  v_added integer := 0;
  v_removed integer := 0;
  v_updated integer := 0;
  v_added_labels jsonb := '[]'::jsonb;
  v_removed_labels jsonb := '[]'::jsonb;
  v_updated_labels jsonb := '[]'::jsonb;
  v_updated_details jsonb := '[]'::jsonb;
begin
  with old_rows as (
    select distinct on (public.audit_record_key(item))
      public.audit_record_key(item) as record_key,
      public.audit_record_label(item) as label,
      item
    from jsonb_array_elements(v_before) as x(item)
    order by public.audit_record_key(item)
  ), new_rows as (
    select distinct on (public.audit_record_key(item))
      public.audit_record_key(item) as record_key,
      public.audit_record_label(item) as label,
      item
    from jsonb_array_elements(v_after) as x(item)
    order by public.audit_record_key(item)
  )
  select
    (select count(*) from new_rows n where not exists (select 1 from old_rows o where o.record_key=n.record_key)),
    (select count(*) from old_rows o where not exists (select 1 from new_rows n where n.record_key=o.record_key)),
    (select count(*) from old_rows o join new_rows n using(record_key) where o.item is distinct from n.item),
    coalesce((select jsonb_agg(label order by label) from (select n.label from new_rows n where not exists (select 1 from old_rows o where o.record_key=n.record_key) order by n.label limit 12) q), '[]'::jsonb),
    coalesce((select jsonb_agg(label order by label) from (select o.label from old_rows o where not exists (select 1 from new_rows n where n.record_key=o.record_key) order by o.label limit 12) q), '[]'::jsonb),
    coalesce((select jsonb_agg(label order by label) from (select n.label from old_rows o join new_rows n using(record_key) where o.item is distinct from n.item order by n.label limit 12) q), '[]'::jsonb),
    coalesce((select jsonb_agg(detail order by label) from (
      select n.label,
        jsonb_build_object(
          'key', n.record_key,
          'label', n.label,
          'changes', public.audit_jsonb_object_delta(o.item, n.item)
        ) as detail
      from old_rows o join new_rows n using(record_key)
      where o.item is distinct from n.item
      order by n.label
      limit 10
    ) q), '[]'::jsonb)
  into v_added, v_removed, v_updated, v_added_labels, v_removed_labels, v_updated_labels, v_updated_details;

  return jsonb_build_object(
    'old_count', jsonb_array_length(v_before),
    'new_count', jsonb_array_length(v_after),
    'added_count', coalesce(v_added,0),
    'removed_count', coalesce(v_removed,0),
    'updated_count', coalesce(v_updated,0),
    'added', v_added_labels,
    'removed', v_removed_labels,
    'updated', v_updated_labels,
    'updated_details', v_updated_details
  );
end;
$$;

create or replace function public.log_app_event(
  p_category text default 'system',
  p_action text default 'event',
  p_module text default '',
  p_scope text default '',
  p_entity_type text default '',
  p_entity_id text default '',
  p_entity_label text default '',
  p_summary text default '',
  p_details jsonb default '{}'::jsonb,
  p_status text default 'success',
  p_source text default 'application',
  p_snapshot_version integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_org_id uuid;
  v_actor_name text := '';
  v_actor_email text := '';
  v_id uuid;
  v_category text := case when p_category in ('data_change','user_admin','security','system','integration','unknown') then p_category else 'unknown' end;
  v_status text := case when p_status in ('success','warning','error') then p_status else 'success' end;
  v_details jsonb := coalesce(p_details, '{}'::jsonb);
begin
  if v_actor_id is null then
    raise exception using message='AUDIT_AUTH_REQUIRED', detail='Auditnu udalost moze zapisat iba prihlaseny pouzivatel.';
  end if;

  select p.organization_id, p.full_name, p.email
    into v_org_id, v_actor_name, v_actor_email
  from public.profiles p
  where p.id=v_actor_id and p.is_active=true
  limit 1;

  if v_org_id is null then
    raise exception using message='AUDIT_PROFILE_MISSING', detail='Aktivny profil nebol najdeny.';
  end if;

  if pg_column_size(v_details) > 262144 then
    v_details := jsonb_build_object('truncated', true, 'preview', left(v_details::text, 24000));
  end if;

  insert into public.app_audit_log (
    organization_id, actor_id, actor_name, actor_email, category, action,
    module, scope, entity_type, entity_id, entity_label, summary, details,
    status, source, snapshot_version, request_ip, user_agent
  ) values (
    v_org_id, v_actor_id, left(coalesce(v_actor_name,''),300), left(coalesce(v_actor_email,''),320),
    v_category, left(coalesce(p_action,'event'),160), left(coalesce(p_module,''),160), left(coalesce(p_scope,''),80),
    left(coalesce(p_entity_type,''),120), left(coalesce(p_entity_id,''),300), left(coalesce(p_entity_label,''),500),
    left(coalesce(p_summary,''),1600), v_details, v_status, left(coalesce(p_source,'application'),120),
    p_snapshot_version, public.audit_request_ip(), public.audit_user_agent()
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Automatický audit riadkových tabuliek. Triger je server-side, takže klient nemôže zmeniť actor_id.
create or replace function public.audit_table_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else '{}'::jsonb end;
  v_new jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else '{}'::jsonb end;
  v_old_payload jsonb;
  v_new_payload jsonb;
  v_compare_old jsonb;
  v_compare_new jsonb;
  v_org_id uuid;
  v_actor_id uuid := (select auth.uid());
  v_actor_name text := '';
  v_actor_email text := '';
  v_entity_id text := '';
  v_entity_label text := '';
  v_action text;
  v_summary text;
  v_details jsonb;
begin
  begin
    v_org_id := nullif(coalesce(v_new->>'organization_id',v_old->>'organization_id',''),'')::uuid;
  exception when others then
    v_org_id := null;
  end;
  if v_org_id is null then v_org_id := public.current_organization_id(); end if;
  if v_org_id is null then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  if v_actor_id is not null then
    select p.full_name,p.email into v_actor_name,v_actor_email
    from public.profiles p where p.id=v_actor_id limit 1;
  end if;

  v_old_payload := case when jsonb_typeof(v_old->'payload')='object' then v_old->'payload' else '{}'::jsonb end;
  v_new_payload := case when jsonb_typeof(v_new->'payload')='object' then v_new->'payload' else '{}'::jsonb end;
  v_compare_old := case when v_old_payload <> '{}'::jsonb or v_new_payload <> '{}'::jsonb then v_old_payload else v_old end;
  v_compare_new := case when v_old_payload <> '{}'::jsonb or v_new_payload <> '{}'::jsonb then v_new_payload else v_new end;

  v_entity_id := left(coalesce(
    nullif(v_new->>'id',''),nullif(v_old->>'id',''),
    nullif(v_new->>'code',''),nullif(v_old->>'code',''),
    nullif(v_new_payload->>'id',''),nullif(v_old_payload->>'id',''),
    nullif(v_new_payload->>'sourceKey',''),nullif(v_old_payload->>'sourceKey','')
  ,''),300);
  v_entity_label := left(coalesce(
    nullif(v_new->>'name',''),nullif(v_old->>'name',''),
    nullif(v_new->>'title',''),nullif(v_old->>'title',''),
    nullif(v_new->>'code',''),nullif(v_old->>'code',''),
    nullif(v_new_payload->>'name',''),nullif(v_old_payload->>'name',''),
    nullif(v_new_payload->>'title',''),nullif(v_old_payload->>'title',''),
    v_entity_id
  ,''),500);

  if tg_op='INSERT' then v_action:='row.insert';
  elsif tg_op='DELETE' then v_action:='row.delete';
  else v_action:='row.update'; end if;

  v_summary := case tg_op
    when 'INSERT' then 'Vytvorený záznam'
    when 'DELETE' then 'Odstránený záznam'
    else 'Upravený záznam'
  end || case when v_entity_label<>'' then ': '||v_entity_label else '' end;

  if tg_op='UPDATE' then
    v_details := public.audit_jsonb_object_delta(v_compare_old,v_compare_new);
    if coalesce((v_details->>'changed_count')::integer,0)=0 then return new; end if;
  elsif tg_op='INSERT' then
    v_details := jsonb_build_object('record', left(v_compare_new::text,12000));
  else
    v_details := jsonb_build_object('record', left(v_compare_old::text,12000));
  end if;

  insert into public.app_audit_log (
    organization_id, actor_id, actor_name, actor_email, category, action, module, scope,
    entity_type, entity_id, entity_label, summary, details, status, source, request_ip, user_agent
  ) values (
    v_org_id, v_actor_id, left(coalesce(v_actor_name,case when v_actor_id is null then 'Systém' else '' end),300), left(coalesce(v_actor_email,''),320),
    'data_change', v_action, coalesce(tg_argv[0],tg_table_name), coalesce(tg_argv[1],''),
    coalesce(tg_argv[2],tg_table_name), v_entity_id, v_entity_label, left(v_summary,1600), v_details,
    'success', 'db_trigger', public.audit_request_ip(), public.audit_user_agent()
  );

  if tg_op='DELETE' then return old; else return new; end if;
exception when others then
  -- Audit nesmie zablokovať pôvodnú biznis operáciu.
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

-- Snapshot v4: zachová všetku overenú v3 logiku a po úspešnom zápise vytvorí server-side audit deltu.
create or replace function public.save_app_snapshot_v4(
  p_payload jsonb,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_actor_name text := '';
  v_actor_email text := '';
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
  v_result jsonb;
  v_new_id uuid;
  v_new_version integer;
  v_key text;
  v_delta jsonb := '{}'::jsonb;
  v_changed_modules jsonb := '[]'::jsonb;
  v_changed_names text[] := array[]::text[];
  v_change jsonb;
  v_audit_details jsonb := '{}'::jsonb;
  v_scope text := 'mixed';
begin
  if v_user_id is null then
    raise exception using message='SNAPSHOT_AUTH_REQUIRED', detail='Pouzivatel nie je prihlaseny.';
  end if;

  select p.organization_id,p.full_name,p.email into v_org_id,v_actor_name,v_actor_email
  from public.profiles p where p.id=v_user_id and p.is_active=true limit 1;
  if v_org_id is null then
    raise exception using message='SNAPSHOT_PROFILE_MISSING', detail='Aktivny profil nebol najdeny.';
  end if;

  select coalesce(s.payload,'{}'::jsonb) into v_before
  from public.app_snapshots s
  where s.organization_id=v_org_id and s.is_current=true
  order by s.created_at desc limit 1;
  v_before := coalesce(v_before,'{}'::jsonb);

  v_result := public.save_app_snapshot_v3(p_payload,p_expected_version);
  v_new_id := nullif(v_result->>'id','')::uuid;
  v_new_version := nullif(v_result->>'version','')::integer;

  select coalesce(s.payload,'{}'::jsonb) into v_after
  from public.app_snapshots s where s.id=v_new_id limit 1;
  v_after := coalesce(v_after,'{}'::jsonb);

  begin
  for v_key in
    select key from (
      select jsonb_object_keys(v_before) as key
      union
      select jsonb_object_keys(v_after) as key
    ) q order by key
  loop
    if (v_before->v_key) is distinct from (v_after->v_key) then
      v_changed_modules := v_changed_modules || jsonb_build_array(v_key);
      v_changed_names := array_append(v_changed_names,v_key);
      if jsonb_typeof(v_before->v_key)='array' or jsonb_typeof(v_after->v_key)='array' then
        v_change := public.audit_jsonb_array_delta(v_before->v_key,v_after->v_key);
      elsif jsonb_typeof(v_before->v_key)='object' or jsonb_typeof(v_after->v_key)='object' then
        v_change := public.audit_jsonb_object_delta(v_before->v_key,v_after->v_key);
      else
        v_change := jsonb_build_object('before',left(coalesce((v_before->v_key)::text,'null'),1200),'after',left(coalesce((v_after->v_key)::text,'null'),1200));
      end if;
      v_delta := v_delta || jsonb_build_object(v_key,v_change);
    end if;
  end loop;

  if array_length(v_changed_names,1) is not null then
    if v_changed_names <@ array['actions','architectureOverrides','supplierRecords','supplierRelationships','contractRecords','cmdbItems','cmdbRelationships']::text[] then
      v_scope := 'shared';
    elsif v_changed_names <@ array['employees','raci','services','substitutions','capacity','risks','decisions','changes','problems']::text[] then
      v_scope := 'oris';
    else
      v_scope := 'mixed';
    end if;

    v_audit_details := jsonb_build_object(
      'changed_modules',v_changed_modules,
      'delta',v_delta,
      'previous_version',coalesce(p_expected_version,0)
    );
    if pg_column_size(v_audit_details) > 524288 then
      v_audit_details := jsonb_build_object(
        'changed_modules',v_changed_modules,
        'previous_version',coalesce(p_expected_version,0),
        'delta_truncated',true,
        'delta_preview',left(v_delta::text,48000)
      );
    end if;

    insert into public.app_audit_log (
      organization_id,actor_id,actor_name,actor_email,category,action,module,scope,
      entity_type,entity_id,entity_label,summary,details,status,source,snapshot_version,request_ip,user_agent,created_at
    ) values (
      v_org_id,v_user_id,left(coalesce(v_actor_name,''),300),left(coalesce(v_actor_email,''),320),'data_change',
      case when v_before='{}'::jsonb then 'snapshot.create' else 'snapshot.update' end,
      'snapshot',v_scope,'app_snapshot',v_new_id::text,'Snapshot v'||v_new_version::text,
      left('Uložená verzia '||v_new_version::text||' · zmenené moduly: '||array_to_string(v_changed_names,', '),1600),
      v_audit_details,
      'success','snapshot_rpc',v_new_version,public.audit_request_ip(),public.audit_user_agent(),now()
    ) on conflict do nothing;
  end if;
  exception when others then
    return v_result || jsonb_build_object('audit_logged',false,'audit_error',left(sqlerrm,500));
  end;

  return v_result || jsonb_build_object('audit_logged', array_length(v_changed_names,1) is not null);
end;
$$;

-- RLS: audit je read-only a iba pre administrátorov vlastnej organizácie.
alter table public.app_audit_log enable row level security;

drop policy if exists "admins read app audit" on public.app_audit_log;
create policy "admins read app audit"
on public.app_audit_log
for select
to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (select public.current_app_role())='admin'
);

revoke all on public.app_audit_log from public, anon, authenticated;
grant select on public.app_audit_log to authenticated;

revoke all on function public.log_app_event(text,text,text,text,text,text,text,text,jsonb,text,text,integer) from public;
revoke all on function public.save_app_snapshot_v4(jsonb,integer) from public;
grant execute on function public.log_app_event(text,text,text,text,text,text,text,text,jsonb,text,text,integer) to authenticated;
grant execute on function public.save_app_snapshot_v4(jsonb,integer) to authenticated;

-- Backfill existujúcich snapshotov. Nezapisuje obsah payloadu, iba overiteľnú verziu a autora.
insert into public.app_audit_log (
  organization_id,actor_id,actor_name,actor_email,category,action,module,scope,
  entity_type,entity_id,entity_label,summary,details,status,source,snapshot_version,created_at
)
select
  s.organization_id,s.created_by,coalesce(p.full_name,'Systém'),coalesce(p.email,''),'data_change','snapshot.history','snapshot','mixed',
  'app_snapshot',s.id::text,'Snapshot v'||s.version::text,'Historický aplikačný snapshot v'||s.version::text,
  jsonb_build_object('historical',true,'version',s.version),'success','snapshot_history',s.version,s.created_at
from public.app_snapshots s
left join public.profiles p on p.id=s.created_by
where not exists (
  select 1 from public.app_audit_log a
  where a.organization_id=s.organization_id and a.source in ('snapshot_history','snapshot_rpc') and a.entity_id=s.id::text
)
on conflict do nothing;

-- Auditné triggre pre samostatné DB registre. Vytvoria sa iba tam, kde tabuľka existuje.
do $$
declare
  v_table text;
  v_module text;
  v_scope text;
  v_entity text;
  v_spec text[][] := array[
    array['work_projects','work_projects','oris','project'],
    array['work_tasks','work_tasks','oris','task'],
    array['service_queues','service_queues','oris','service_queue'],
    array['service_sla_policies','service_sla_policies','oris','sla_policy'],
    array['service_tickets','service_tickets','oris','ticket'],
    array['iam_catalog_items','iam_catalog_items','oris','iam_catalog_item'],
    array['iam_requests','iam_requests','oris','iam_request'],
    array['iam_recert_campaigns','iam_recert_campaigns','oris','iam_recertification'],
    array['website_registry','website_registry','oris','website'],
    array['information_system_registry','information_system_registry','oris','information_system']
  ];
  v_row text[];
begin
  foreach v_row slice 1 in array v_spec loop
    v_table:=v_row[1]; v_module:=v_row[2]; v_scope:=v_row[3]; v_entity:=v_row[4];
    if to_regclass('public.'||v_table) is not null then
      execute format('drop trigger if exists %I on public.%I','audit_'||v_table||'_v034',v_table);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_table_change(%L,%L,%L)',
        'audit_'||v_table||'_v034',v_table,v_module,v_scope,v_entity
      );
    end if;
  end loop;
end
$$;

notify pgrst, 'reload schema';

commit;

select
  to_regclass('public.app_audit_log') is not null as audit_table_ready,
  to_regprocedure('public.log_app_event(text,text,text,text,text,text,text,text,jsonb,text,text,integer)') is not null as audit_rpc_ready,
  to_regprocedure('public.save_app_snapshot_v4(jsonb,integer)') is not null as snapshot_v4_ready,
  (select count(*) from public.app_audit_log) as audit_rows;
