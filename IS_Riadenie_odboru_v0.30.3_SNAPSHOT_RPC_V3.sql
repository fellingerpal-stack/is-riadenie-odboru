-- IS Riadenie odboru v0.30.3
-- Definitívny hotfix synchronizácie snapshotu.
--
-- Dôvod:
-- Produkčný frontend v0.30.0 volá legacy RPC save_app_snapshot(jsonb).
-- V staršej PL/pgSQL implementácii sa výstupný parameter "version" môže dostať
-- do konfliktu so stĺpcom app_snapshots.version (PostgreSQL 42702).
--
-- Tento hotfix vytvára NOVÉ RPC save_app_snapshot_v3(), ktoré vracia JSONB.
-- Nemá OUT parameter s názvom version, takže konflikt sa nemôže zopakovať.
-- Frontend v0.30.3 volá iba toto RPC.

begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'HOTFIX_0303_WRONG_DB: chyba public.profiles.';
  end if;
  if to_regclass('public.app_snapshots') is null then
    raise exception 'HOTFIX_0303_WRONG_DB: chyba public.app_snapshots.';
  end if;
  if to_regprocedure('public.can_write_scope(text)') is null then
    raise exception 'HOTFIX_0303_PREREQUISITE: chyba public.can_write_scope(text). Spustite IAM scope migraciu v0.26.';
  end if;
end
$$;

create or replace function public.save_app_snapshot_v3(
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
  v_role text;
  v_new_version integer;
  v_current_version integer;
  v_new_id uuid;
  v_created_at timestamptz;
  v_current jsonb;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_key text;
  v_can_oris boolean := false;
  v_can_oit boolean := false;
  v_can_shared boolean := false;
  v_merged jsonb;
  v_bytes integer;
begin
  if v_user_id is null then
    raise exception using message='SNAPSHOT_AUTH_REQUIRED', detail='Pouzivatel nie je prihlaseny.';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using message='SNAPSHOT_INVALID_PAYLOAD', detail='Ocakava sa JSON objekt AppState.';
  end if;

  select p.organization_id, p.role
    into v_org_id, v_role
  from public.profiles as p
  where p.id = v_user_id
    and p.is_active = true
  limit 1;

  if v_org_id is null then
    raise exception using message='SNAPSHOT_PROFILE_MISSING', detail='Aktivny pouzivatelsky profil nebol najdeny.';
  end if;

  if v_role not in ('admin','manager','resolver') then
    raise exception using message='SNAPSHOT_WRITE_DENIED', detail='Rola pouzivatela nemoze zapisovat riadiace data.';
  end if;

  v_can_oris := v_role = 'admin' or public.can_write_scope('oris');
  v_can_oit := v_role = 'admin' or public.can_write_scope('oit');
  v_can_shared := v_role = 'admin' or public.can_write_scope('shared');

  if not (v_can_oris or v_can_oit or v_can_shared) then
    raise exception using message='SNAPSHOT_WRITE_DENIED', detail='Pouzivatel nema WRITE opravnenie pre ziadny pracovny priestor.';
  end if;

  v_bytes := pg_column_size(v_payload);
  if v_bytes > 8388608 then
    raise exception using
      message='SNAPSHOT_PAYLOAD_TOO_LARGE',
      detail=format('Payload ma %s bajtov; limit synchronizacneho RPC je 8 MiB.', v_bytes);
  end if;

  perform pg_advisory_xact_lock(hashtext(v_org_id::text));

  select s.payload, s.version
    into v_current, v_current_version
  from public.app_snapshots as s
  where s.organization_id = v_org_id
    and s.is_current = true
  order by s.created_at desc
  limit 1;

  if v_current is null and v_role <> 'admin' then
    raise exception using message='SNAPSHOT_ADMIN_FIRST', detail='Prvy organizacny snapshot musi vytvorit administrator.';
  end if;

  if p_expected_version is not null
     and v_current_version is not null
     and p_expected_version <> v_current_version then
    raise exception using
      message='SNAPSHOT_CONFLICT',
      detail=format('Klient vychadza z verzie %s, aktualna DB verzia je %s.', p_expected_version, v_current_version),
      hint='Najprv nacitajte aktualny snapshot a potom zopakujte zmenu.';
  end if;

  v_current := coalesce(v_current, '{}'::jsonb);

  -- Pri starsej otvorenej karte zachovaj nove registre, ktore payload este nemusi poznat.
  if v_current <> '{}'::jsonb then
    foreach v_key in array array[
      'architectureOverrides','supplierRecords','supplierRelationships','contractRecords',
      'cmdbItems','cmdbRelationships'
    ] loop
      if not (v_payload ? v_key) then
        v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
      end if;
    end loop;
  end if;

  -- Tieto moduly maju vlastne databazove tabulky a snapshot ich nesmie prepisat.
  if v_current <> '{}'::jsonb then
    foreach v_key in array array[
      'projects','tasks','tickets','supportQueues','slaPolicies',
      'accessRequests','accessCatalog','recertificationCampaigns'
    ] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;

  -- ORIS domena: pri READ-only zachovaj serverovu verziu.
  if not v_can_oris then
    foreach v_key in array array[
      'employees','raci','services','substitutions','capacity','risks','decisions','changes','problems'
    ] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;

  -- Dodavatelsky a zmluvny master je admin-only.
  if v_role <> 'admin' then
    foreach v_key in array array['supplierRecords','supplierRelationships','contractRecords'] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;

  -- Ostatne spolocne registre respektuju Shared WRITE.
  if not v_can_shared then
    foreach v_key in array array['actions','architectureOverrides'] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;

  -- Asset Management: item-level scope merge.
  with current_items as (
    select x.item, x.ordinality as ord
    from jsonb_array_elements(coalesce(v_current->'cmdbItems','[]'::jsonb))
         with ordinality as x(item, ordinality)
  ), incoming_items as (
    select x.item, x.ordinality as ord
    from jsonb_array_elements(coalesce(v_payload->'cmdbItems','[]'::jsonb))
         with ordinality as x(item, ordinality)
  ), replaced as (
    select case
      when case coalesce(c.item->>'scope','oris')
             when 'oit' then v_can_oit
             when 'shared' then v_can_shared
             else v_can_oris
           end
        then i.item
      else c.item
    end as item,
    c.ord as ord
    from current_items as c
    left join incoming_items as i
      on coalesce(i.item->>'id','') = coalesce(c.item->>'id','')
    where not (
      case coalesce(c.item->>'scope','oris')
        when 'oit' then v_can_oit
        when 'shared' then v_can_shared
        else v_can_oris
      end
    ) or i.item is not null
  ), added as (
    select i.item, 1000000 + i.ord as ord
    from incoming_items as i
    where not exists (
      select 1 from current_items as c
      where coalesce(c.item->>'id','') = coalesce(i.item->>'id','')
    )
    and case coalesce(i.item->>'scope','oris')
          when 'oit' then v_can_oit
          when 'shared' then v_can_shared
          else v_can_oris
        end
  )
  select coalesce(jsonb_agg(q.item order by q.ord), '[]'::jsonb)
    into v_merged
  from (
    select r.item, r.ord from replaced as r
    union all
    select a.item, a.ord from added as a
  ) as q;

  v_payload := jsonb_set(v_payload, '{cmdbItems}', coalesce(v_merged,'[]'::jsonb), true);

  -- CMDB vztahy: zapis len ak je zapisovatelny scope zdrojoveho aktiva.
  with merged_items as (
    select x.item
    from jsonb_array_elements(coalesce(v_payload->'cmdbItems','[]'::jsonb)) as x(item)
  ), current_rels as (
    select x.rel, x.ordinality as ord
    from jsonb_array_elements(coalesce(v_current->'cmdbRelationships','[]'::jsonb))
         with ordinality as x(rel, ordinality)
  ), incoming_rels as (
    select x.rel, x.ordinality as ord
    from jsonb_array_elements(coalesce(v_payload->'cmdbRelationships','[]'::jsonb))
         with ordinality as x(rel, ordinality)
  ), replaced as (
    select case when p.writable then i.rel else c.rel end as rel, c.ord as ord
    from current_rels as c
    left join incoming_rels as i
      on coalesce(i.rel->>'id','') = coalesce(c.rel->>'id','')
    cross join lateral (
      select case coalesce((
        select mi.item->>'scope'
        from merged_items as mi
        where mi.item->>'id' = c.rel->>'sourceId'
        limit 1
      ),'oris')
        when 'oit' then v_can_oit
        when 'shared' then v_can_shared
        else v_can_oris
      end as writable
    ) as p
    where not p.writable or i.rel is not null
  ), added as (
    select i.rel, 1000000 + i.ord as ord
    from incoming_rels as i
    where not exists (
      select 1 from current_rels as c
      where coalesce(c.rel->>'id','') = coalesce(i.rel->>'id','')
    )
    and case coalesce((
      select mi.item->>'scope'
      from merged_items as mi
      where mi.item->>'id' = i.rel->>'sourceId'
      limit 1
    ),'oris')
      when 'oit' then v_can_oit
      when 'shared' then v_can_shared
      else v_can_oris
    end
  )
  select coalesce(jsonb_agg(q.rel order by q.ord), '[]'::jsonb)
    into v_merged
  from (
    select r.rel, r.ord from replaced as r
    union all
    select a.rel, a.ord from added as a
  ) as q;

  v_payload := jsonb_set(v_payload, '{cmdbRelationships}', coalesce(v_merged,'[]'::jsonb), true);

  select coalesce(max(s.version), 0) + 1
    into v_new_version
  from public.app_snapshots as s
  where s.organization_id = v_org_id;

  update public.app_snapshots as s
     set is_current = false
   where s.organization_id = v_org_id
     and s.is_current = true;

  insert into public.app_snapshots (
    organization_id,
    version,
    payload,
    created_by,
    is_current
  ) values (
    v_org_id,
    v_new_version,
    v_payload,
    v_user_id,
    true
  )
  returning app_snapshots.id, app_snapshots.created_at
    into v_new_id, v_created_at;

  return jsonb_build_object(
    'id', v_new_id,
    'version', v_new_version,
    'created_at', v_created_at,
    'created_by', v_user_id,
    'payload_bytes', pg_column_size(v_payload)
  );
end;
$$;

revoke all on function public.save_app_snapshot_v3(jsonb,integer) from public;
grant execute on function public.save_app_snapshot_v3(jsonb,integer) to authenticated;

comment on function public.save_app_snapshot_v3(jsonb,integer) is
  'v0.30.3 snapshot RPC returning JSONB; avoids OUT-parameter collision with app_snapshots.version.';

notify pgrst, 'reload schema';

commit;

select
  to_regclass('public.profiles') is not null as profiles_ready,
  to_regclass('public.app_snapshots') is not null as snapshots_ready,
  to_regprocedure('public.can_write_scope(text)') is not null as scope_ready,
  to_regprocedure('public.save_app_snapshot_v3(jsonb,integer)') is not null as snapshot_v3_ready;
