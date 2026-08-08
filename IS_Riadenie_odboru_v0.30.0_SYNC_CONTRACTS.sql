-- IS Riadenie odboru v0.30.0
-- Snapshot Sync v2 + scoped CMDB merge + Supplier/Contract shared data.
-- Predpoklad: IAM scope migrácia v0.26 už bola nasadená.

begin;

create or replace function public.snapshot_item_scope(p_item jsonb)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_item->>'scope',''))
    when 'oit' then 'oit'
    when 'oris' then 'oris'
    when 'shared' then 'shared'
    else 'oris'
  end
$$;

create or replace function public.merge_scoped_cmdb_items(p_current jsonb, p_incoming jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with current_items as (
    select value as item
    from jsonb_array_elements(case when jsonb_typeof(coalesce(p_current,'[]'::jsonb))='array' then coalesce(p_current,'[]'::jsonb) else '[]'::jsonb end)
  ), incoming_items as (
    select value as item
    from jsonb_array_elements(case when jsonb_typeof(coalesce(p_incoming,'[]'::jsonb))='array' then coalesce(p_incoming,'[]'::jsonb) else '[]'::jsonb end)
  ), merged as (
    -- položky mimo WRITE scope zostávajú zo serverovej verzie
    select item, 0 as ord
    from current_items
    where not public.can_write_scope(public.snapshot_item_scope(item))
    union all
    -- položky vo WRITE scope sa preberú z klienta; tým funguje aj editácia a mazanie
    select item, 1 as ord
    from incoming_items
    where public.can_write_scope(public.snapshot_item_scope(item))
  )
  select coalesce(jsonb_agg(item order by ord, coalesce(item->>'name',''), coalesce(item->>'id','')), '[]'::jsonb)
  from merged
$$;

create or replace function public.save_app_snapshot_v2(
  p_payload jsonb,
  p_expected_version integer default null
)
returns table (
  id uuid,
  version integer,
  created_at timestamptz,
  created_by uuid,
  payload_bytes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_role text;
  v_version integer;
  v_current_version integer;
  v_id uuid;
  v_created_at timestamptz;
  v_current jsonb;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_key text;
  v_bytes integer;
begin
  if v_user_id is null then
    raise exception using message='SNAPSHOT_AUTH_REQUIRED', detail='Používateľ nie je prihlásený.';
  end if;

  select organization_id, role
    into v_org_id, v_role
  from public.profiles
  where profiles.id=v_user_id and is_active=true;

  if v_org_id is null then
    raise exception using message='SNAPSHOT_PROFILE_MISSING', detail='Aktívny používateľský profil nebol nájdený.';
  end if;

  if v_role not in ('admin','manager','resolver') then
    raise exception using message='SNAPSHOT_WRITE_DENIED', detail='Rola používateľa nemôže zapisovať riadiace dáta.';
  end if;

  if v_role <> 'admin' and not (public.can_write_scope('oris') or public.can_write_scope('oit') or public.can_write_scope('shared')) then
    raise exception using message='SNAPSHOT_WRITE_DENIED', detail='Používateľ nemá WRITE oprávnenie pre žiadny pracovný priestor.';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using message='SNAPSHOT_INVALID_PAYLOAD', detail='Očakáva sa JSON objekt AppState.';
  end if;

  v_bytes := pg_column_size(v_payload);
  if v_bytes > 8388608 then
    raise exception using message='SNAPSHOT_PAYLOAD_TOO_LARGE', detail=format('Payload má %s bajtov; limit synchronizačného RPC je 8 MiB.',v_bytes);
  end if;

  perform pg_advisory_xact_lock(hashtext(v_org_id::text));

  select payload, version
    into v_current, v_current_version
  from public.app_snapshots
  where organization_id=v_org_id and is_current=true
  order by created_at desc
  limit 1;

  if v_current is null and v_role <> 'admin' then
    raise exception using message='SNAPSHOT_ADMIN_FIRST', detail='Prvý organizačný snapshot musí vytvoriť administrátor.';
  end if;

  if p_expected_version is not null and v_current_version is not null and p_expected_version <> v_current_version then
    raise exception using
      message='SNAPSHOT_CONFLICT',
      detail=format('Klient vychádza z verzie %s, aktuálna DB verzia je %s.',p_expected_version,v_current_version),
      hint='Najprv načítajte aktuálny snapshot a následne zopakujte zmenu.';
  end if;

  v_current := coalesce(v_current, '{}'::jsonb);

  -- Kompatibilita so staršou otvorenou kartou: ak starší frontend daný novší kľúč
  -- vôbec nepozná, nesmie ho pri uložení vymazať ani administrátor.
  if v_current <> '{}'::jsonb then
    foreach v_key in array array['architectureOverrides','supplierRecords','supplierRelationships','contractRecords','cmdbItems'] loop
      if not (v_payload ? v_key) then
        v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
      end if;
    end loop;
  end if;

  -- Moduly s vlastnými DB tabuľkami sa snapshotom neprepisujú. Zachovávame poslednú
  -- snapshotovú kópiu ako núdzový fallback, ale klient ich nemusí posielať pri autosave.
  if v_current <> '{}'::jsonb then
    foreach v_key in array array[
      'projects','tasks','tickets','supportQueues','slaPolicies',
      'accessRequests','accessCatalog','recertificationCampaigns'
    ] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;

  -- ORIS snapshotová agenda.
  if v_role <> 'admin' and not public.can_write_scope('oris') then
    foreach v_key in array array[
      'employees','raci','services','substitutions','capacity','risks','decisions','changes','problems'
    ] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;

  -- Dodávateľský a zmluvný master register je admin-only aj na serveri. Read prístup
  -- môže mať širší okruh používateľov, ale zmena týchto troch polí sa od ne-admina zahodí.
  if v_role <> 'admin' then
    foreach v_key in array array['supplierRecords','supplierRelationships','contractRecords'] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;

  -- Ostatná spoločná agenda rešpektuje Shared WRITE.
  if v_role <> 'admin' and not public.can_write_scope('shared') then
    foreach v_key in array array['actions','architectureOverrides','cmdbRelationships'] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;

  -- CMDB/Asset register má vlastný scope na každej položke. Server zachová položky mimo
  -- WRITE scope a prijme len položky, ktoré používateľ smie meniť.
  v_payload := jsonb_set(
    v_payload,
    array['cmdbItems'],
    public.merge_scoped_cmdb_items(v_current->'cmdbItems', v_payload->'cmdbItems'),
    true
  );

  select coalesce(max(app_snapshots.version),0)+1
    into v_version
  from public.app_snapshots
  where organization_id=v_org_id;

  update public.app_snapshots
    set is_current=false
  where organization_id=v_org_id and is_current=true;

  insert into public.app_snapshots(organization_id,version,payload,created_by,is_current)
    values(v_org_id,v_version,v_payload,v_user_id,true)
    returning app_snapshots.id, app_snapshots.created_at into v_id,v_created_at;

  return query select v_id,v_version,v_created_at,v_user_id,pg_column_size(v_payload);
end;
$$;

revoke all on function public.save_app_snapshot_v2(jsonb,integer) from public;
grant execute on function public.save_app_snapshot_v2(jsonb,integer) to authenticated;

comment on function public.save_app_snapshot_v2(jsonb,integer) is
  'v0.30 scoped snapshot save with optimistic version check, smaller transport payload and item-level CMDB merge.';

-- Spätná kompatibilita pre otvorené karty/starší frontend. Aj pôvodný RPC názov ide po migrácii
-- cez rovnakú bezpečnú implementáciu, iba bez optimistic-lock parametra.
create or replace function public.save_app_snapshot(p_payload jsonb)
returns table (id uuid, version integer, created_at timestamptz, created_by uuid)
language sql
security definer
set search_path = public
as $$
  select saved.id, saved.version, saved.created_at, saved.created_by
  from public.save_app_snapshot_v2(p_payload, null::integer) saved
$$;

revoke all on function public.save_app_snapshot(jsonb) from public;
grant execute on function public.save_app_snapshot(jsonb) to authenticated;

commit;
