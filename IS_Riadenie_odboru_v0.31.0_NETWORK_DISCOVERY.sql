-- IS Riadenie odboru v0.31.0
-- Network Discovery & Asset Inventory
-- Bezpecny discovery staging: lokalny collector -> Supabase RPC -> discovery tabulky.
-- Collector ma len outbound HTTPS pristup. Priamy INSERT do discovery tabuliek nie je povoleny.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.organizations') is null then
    raise exception 'DISCOVERY_031_WRONG_DB: chyba public.organizations.';
  end if;
  if to_regclass('public.profiles') is null then
    raise exception 'DISCOVERY_031_WRONG_DB: chyba public.profiles.';
  end if;
  if to_regprocedure('public.current_organization_id()') is null then
    raise exception 'DISCOVERY_031_PREREQUISITE: chyba public.current_organization_id().';
  end if;
  if to_regprocedure('public.current_app_role()') is null then
    raise exception 'DISCOVERY_031_PREREQUISITE: chyba public.current_app_role().';
  end if;
  if to_regprocedure('public.can_write_scope(text)') is null then
    raise exception 'DISCOVERY_031_PREREQUISITE: chyba public.can_write_scope(text).';
  end if;
end
$$;

create table if not exists public.discovery_collectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  scope text not null default 'shared' check (scope in ('oit','oris','shared')),
  location text not null default '',
  api_key_hash text not null,
  enabled boolean not null default true,
  last_seen_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  collector_id uuid not null references public.discovery_collectors(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'completed',
  cidrs text[] not null default '{}'::text[],
  hosts_scanned integer not null default 0,
  hosts_found integer not null default 0,
  accepted_devices integer not null default 0,
  error text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.discovery_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scope text not null default 'shared' check (scope in ('oit','oris','shared')),
  fingerprint text not null,
  ip_address text not null default '',
  mac_address text not null default '',
  hostname text not null default '',
  device_type text not null default 'Nezname zariadenie',
  manufacturer text not null default '',
  model text not null default '',
  serial_number text not null default '',
  firmware text not null default '',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seen_count integer not null default 1,
  last_collector_id uuid references public.discovery_collectors(id) on delete set null,
  last_run_id uuid references public.discovery_runs(id) on delete set null,
  changed_fields text[] not null default '{}'::text[],
  last_changed_at timestamptz,
  open_ports integer[] not null default '{}'::integer[],
  snmp jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  matched_cmdb_id text not null default '',
  ignored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, fingerprint)
);

create table if not exists public.discovery_observations (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  collector_id uuid not null references public.discovery_collectors(id) on delete cascade,
  run_id uuid not null references public.discovery_runs(id) on delete cascade,
  device_id uuid not null references public.discovery_devices(id) on delete cascade,
  observed_at timestamptz not null default now(),
  ip_address text not null default '',
  mac_address text not null default '',
  hostname text not null default '',
  device_type text not null default '',
  manufacturer text not null default '',
  model text not null default '',
  serial_number text not null default '',
  firmware text not null default '',
  open_ports integer[] not null default '{}'::integer[],
  snmp jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb
);

create index if not exists discovery_collectors_org_idx on public.discovery_collectors(organization_id);
create index if not exists discovery_runs_org_started_idx on public.discovery_runs(organization_id, started_at desc);
create index if not exists discovery_devices_org_last_seen_idx on public.discovery_devices(organization_id, last_seen_at desc);
create index if not exists discovery_devices_org_mac_idx on public.discovery_devices(organization_id, lower(mac_address)) where mac_address <> '';
create index if not exists discovery_devices_org_serial_idx on public.discovery_devices(organization_id, lower(serial_number)) where serial_number <> '';
create index if not exists discovery_devices_org_host_idx on public.discovery_devices(organization_id, lower(hostname)) where hostname <> '';
create index if not exists discovery_observations_device_seen_idx on public.discovery_observations(device_id, observed_at desc);

alter table public.discovery_collectors enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.discovery_devices enable row level security;
alter table public.discovery_observations enable row level security;

drop policy if exists "members read discovery collectors" on public.discovery_collectors;
create policy "members read discovery collectors" on public.discovery_collectors
for select to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "members read discovery runs" on public.discovery_runs;
create policy "members read discovery runs" on public.discovery_runs
for select to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "members read discovery devices" on public.discovery_devices;
create policy "members read discovery devices" on public.discovery_devices
for select to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "members read discovery observations" on public.discovery_observations;
create policy "members read discovery observations" on public.discovery_observations
for select to authenticated
using (organization_id = (select public.current_organization_id()));

-- Ziadne priame zapisy cez Data API. Vsetky mutacie idu cez nizsie uvedene RPC.
revoke all on public.discovery_collectors from anon, authenticated;
revoke all on public.discovery_runs from anon, authenticated;
revoke all on public.discovery_devices from anon, authenticated;
revoke all on public.discovery_observations from anon, authenticated;
grant select (id,organization_id,name,scope,location,enabled,last_seen_at,created_by,created_at,updated_at) on public.discovery_collectors to authenticated;
grant select on public.discovery_runs to authenticated;
grant select on public.discovery_devices to authenticated;
grant select on public.discovery_observations to authenticated;

create or replace function public.create_discovery_collector(
  p_name text,
  p_scope text default 'shared',
  p_location text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_organization_id();
  v_user uuid := auth.uid();
  v_role text := public.current_app_role();
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_row public.discovery_collectors%rowtype;
begin
  if v_user is null or v_org is null then raise exception 'DISCOVERY_AUTH_REQUIRED'; end if;
  if v_role <> 'admin' then raise exception 'DISCOVERY_ADMIN_REQUIRED'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'DISCOVERY_NAME_REQUIRED'; end if;
  if p_scope not in ('oit','oris','shared') then raise exception 'DISCOVERY_INVALID_SCOPE'; end if;

  insert into public.discovery_collectors(organization_id,name,scope,location,api_key_hash,created_by)
  values(v_org,trim(p_name),p_scope,coalesce(trim(p_location),''),encode(digest(v_token,'sha256'),'hex'),v_user)
  returning * into v_row;

  return jsonb_build_object(
    'collector', jsonb_build_object(
      'id',v_row.id,'name',v_row.name,'scope',v_row.scope,'location',v_row.location,
      'enabled',v_row.enabled,'last_seen_at',v_row.last_seen_at,'created_at',v_row.created_at,'updated_at',v_row.updated_at
    ),
    'token', v_token
  );
end;
$$;

create or replace function public.rotate_discovery_collector_token(p_collector_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_organization_id();
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  if auth.uid() is null or v_org is null then raise exception 'DISCOVERY_AUTH_REQUIRED'; end if;
  if public.current_app_role() <> 'admin' then raise exception 'DISCOVERY_ADMIN_REQUIRED'; end if;
  update public.discovery_collectors
     set api_key_hash=encode(digest(v_token,'sha256'),'hex'), updated_at=now()
   where id=p_collector_id and organization_id=v_org;
  if not found then raise exception 'DISCOVERY_COLLECTOR_NOT_FOUND'; end if;
  return jsonb_build_object('token',v_token);
end;
$$;

create or replace function public.set_discovery_collector_enabled(p_collector_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid := public.current_organization_id();
begin
  if auth.uid() is null or v_org is null then raise exception 'DISCOVERY_AUTH_REQUIRED'; end if;
  if public.current_app_role() <> 'admin' then raise exception 'DISCOVERY_ADMIN_REQUIRED'; end if;
  update public.discovery_collectors set enabled=coalesce(p_enabled,false), updated_at=now()
   where id=p_collector_id and organization_id=v_org;
  if not found then raise exception 'DISCOVERY_COLLECTOR_NOT_FOUND'; end if;
end;
$$;

create or replace function public.set_discovery_device_state(
  p_device_id uuid,
  p_matched_cmdb_id text default null,
  p_ignored boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.current_organization_id();
  v_scope text;
  v_role text := public.current_app_role();
begin
  if auth.uid() is null or v_org is null then raise exception 'DISCOVERY_AUTH_REQUIRED'; end if;
  select d.scope into v_scope from public.discovery_devices d where d.id=p_device_id and d.organization_id=v_org;
  if v_scope is null then raise exception 'DISCOVERY_DEVICE_NOT_FOUND'; end if;
  if v_role not in ('admin','manager','resolver') then raise exception 'DISCOVERY_WRITE_DENIED'; end if;
  if v_role <> 'admin' and not public.can_write_scope(v_scope) then raise exception 'DISCOVERY_SCOPE_WRITE_DENIED'; end if;

  update public.discovery_devices
     set matched_cmdb_id=coalesce(p_matched_cmdb_id,''), ignored=coalesce(p_ignored,false), updated_at=now()
   where id=p_device_id and organization_id=v_org;
end;
$$;

-- Collector ingest. RPC je dostupne anon role, ale kazdy zapis vyzaduje 256-bit collector token.
create or replace function public.ingest_discovery_batch(
  p_collector_id uuid,
  p_token text,
  p_run jsonb,
  p_devices jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collector public.discovery_collectors%rowtype;
  v_run_id uuid := gen_random_uuid();
  v_device jsonb;
  v_org uuid;
  v_scope text;
  v_fp text;
  v_ip text;
  v_mac text;
  v_host text;
  v_serial text;
  v_type text;
  v_manufacturer text;
  v_model text;
  v_firmware text;
  v_ports integer[];
  v_snmp jsonb;
  v_details jsonb;
  v_existing public.discovery_devices%rowtype;
  v_device_id uuid;
  v_changes text[];
  v_accepted integer := 0;
  v_cidrs text[] := '{}'::text[];
  v_hosts_scanned integer := 0;
  v_hosts_found integer := 0;
  v_status text := 'completed';
  v_error text := '';
begin
  if p_collector_id is null or coalesce(p_token,'') = '' then raise exception 'DISCOVERY_COLLECTOR_AUTH_REQUIRED'; end if;
  select * into v_collector from public.discovery_collectors c where c.id=p_collector_id limit 1;
  if v_collector.id is null or not v_collector.enabled then raise exception 'DISCOVERY_COLLECTOR_DISABLED_OR_UNKNOWN'; end if;
  if encode(digest(p_token,'sha256'),'hex') <> v_collector.api_key_hash then raise exception 'DISCOVERY_COLLECTOR_TOKEN_INVALID'; end if;
  if jsonb_typeof(coalesce(p_devices,'[]'::jsonb)) <> 'array' then raise exception 'DISCOVERY_INVALID_DEVICES'; end if;
  if jsonb_array_length(coalesce(p_devices,'[]'::jsonb)) > 5000 then raise exception 'DISCOVERY_BATCH_TOO_LARGE'; end if;

  v_org := v_collector.organization_id;
  v_scope := v_collector.scope;
  if jsonb_typeof(coalesce(p_run->'cidrs','[]'::jsonb))='array' then
    select coalesce(array_agg(value),'{}'::text[]) into v_cidrs from jsonb_array_elements_text(coalesce(p_run->'cidrs','[]'::jsonb));
  end if;
  v_hosts_scanned := greatest(0,coalesce(nullif(p_run->>'hosts_scanned','')::integer,0));
  v_hosts_found := greatest(0,coalesce(nullif(p_run->>'hosts_found','')::integer,jsonb_array_length(coalesce(p_devices,'[]'::jsonb))));
  v_status := coalesce(nullif(p_run->>'status',''),'completed');
  v_error := coalesce(p_run->>'error','');

  insert into public.discovery_runs(id,organization_id,collector_id,started_at,completed_at,status,cidrs,hosts_scanned,hosts_found,error)
  values(v_run_id,v_org,v_collector.id,now(),now(),v_status,v_cidrs,v_hosts_scanned,v_hosts_found,v_error);

  for v_device in select value from jsonb_array_elements(coalesce(p_devices,'[]'::jsonb)) loop
    v_ip := left(coalesce(v_device->>'ip_address',''),128);
    v_mac := lower(left(coalesce(v_device->>'mac_address',''),64));
    v_host := left(coalesce(v_device->>'hostname',''),255);
    v_serial := left(coalesce(v_device->>'serial_number',''),255);
    v_type := left(coalesce(nullif(v_device->>'device_type',''),'Nezname zariadenie'),255);
    v_manufacturer := left(coalesce(v_device->>'manufacturer',''),255);
    v_model := left(coalesce(v_device->>'model',''),255);
    v_firmware := left(coalesce(v_device->>'firmware',''),255);
    v_snmp := case when jsonb_typeof(v_device->'snmp')='object' then v_device->'snmp' else '{}'::jsonb end;
    v_details := case when jsonb_typeof(v_device->'details')='object' then v_device->'details' else '{}'::jsonb end;

    select coalesce(array_agg(port order by port),'{}'::integer[]) into v_ports
    from (
      select distinct value::integer as port
      from jsonb_array_elements_text(case when jsonb_typeof(v_device->'open_ports')='array' then v_device->'open_ports' else '[]'::jsonb end)
      where value ~ '^[0-9]+$' and value::integer between 1 and 65535
    ) p;

    if v_serial <> '' then v_fp := encode(digest(v_org::text||'|serial:'||lower(v_serial),'sha256'),'hex');
    elsif v_mac <> '' then v_fp := encode(digest(v_org::text||'|mac:'||lower(v_mac),'sha256'),'hex');
    elsif v_host <> '' then v_fp := encode(digest(v_org::text||'|host:'||lower(v_host),'sha256'),'hex');
    else v_fp := encode(digest(v_org::text||'|ip:'||lower(v_ip),'sha256'),'hex');
    end if;

    v_existing.id := null;
    select d.* into v_existing
      from public.discovery_devices d
     where d.organization_id=v_org
       and (
         (v_serial<>'' and lower(d.serial_number)=lower(v_serial)) or
         (v_mac<>'' and lower(d.mac_address)=lower(v_mac)) or
         d.fingerprint=v_fp
       )
     order by case when v_serial<>'' and lower(d.serial_number)=lower(v_serial) then 1 when v_mac<>'' and lower(d.mac_address)=lower(v_mac) then 2 else 3 end
     limit 1;

    if v_existing.id is null then
      insert into public.discovery_devices(
        organization_id,scope,fingerprint,ip_address,mac_address,hostname,device_type,manufacturer,model,serial_number,firmware,
        first_seen_at,last_seen_at,seen_count,last_collector_id,last_run_id,open_ports,snmp,details
      ) values(
        v_org,v_scope,v_fp,v_ip,v_mac,v_host,v_type,v_manufacturer,v_model,v_serial,v_firmware,
        now(),now(),1,v_collector.id,v_run_id,v_ports,v_snmp,v_details
      ) returning id into v_device_id;
      v_changes := '{}'::text[];
    else
      v_device_id := v_existing.id;
      v_changes := array_remove(array[
        case when v_existing.ip_address<>'' and v_ip<>'' and v_existing.ip_address<>v_ip then 'IP' end,
        case when v_existing.hostname<>'' and v_host<>'' and lower(v_existing.hostname)<>lower(v_host) then 'hostname' end,
        case when v_existing.model<>'' and v_model<>'' and lower(v_existing.model)<>lower(v_model) then 'model' end,
        case when v_existing.serial_number<>'' and v_serial<>'' and lower(v_existing.serial_number)<>lower(v_serial) then 'serial' end,
        case when v_existing.firmware<>'' and v_firmware<>'' and v_existing.firmware<>v_firmware then 'firmware' end
      ], null);

      update public.discovery_devices d set
        scope=v_scope,
        ip_address=case when v_ip<>'' then v_ip else d.ip_address end,
        mac_address=case when v_mac<>'' then v_mac else d.mac_address end,
        hostname=case when v_host<>'' then v_host else d.hostname end,
        device_type=case when v_type<>'' then v_type else d.device_type end,
        manufacturer=case when v_manufacturer<>'' then v_manufacturer else d.manufacturer end,
        model=case when v_model<>'' then v_model else d.model end,
        serial_number=case when v_serial<>'' then v_serial else d.serial_number end,
        firmware=case when v_firmware<>'' then v_firmware else d.firmware end,
        last_seen_at=now(), seen_count=d.seen_count+1,
        last_collector_id=v_collector.id,last_run_id=v_run_id,
        changed_fields=case when cardinality(v_changes)>0 then v_changes else '{}'::text[] end,
        last_changed_at=case when cardinality(v_changes)>0 then now() else d.last_changed_at end,
        open_ports=v_ports,snmp=v_snmp,details=v_details,updated_at=now()
      where d.id=v_device_id;
    end if;

    insert into public.discovery_observations(
      organization_id,collector_id,run_id,device_id,observed_at,ip_address,mac_address,hostname,device_type,manufacturer,model,serial_number,firmware,open_ports,snmp,details
    ) values(v_org,v_collector.id,v_run_id,v_device_id,now(),v_ip,v_mac,v_host,v_type,v_manufacturer,v_model,v_serial,v_firmware,v_ports,v_snmp,v_details);
    v_accepted := v_accepted + 1;
  end loop;

  update public.discovery_runs r set accepted_devices=v_accepted where r.id=v_run_id;
  update public.discovery_collectors c set last_seen_at=now(),updated_at=now() where c.id=v_collector.id;

  return jsonb_build_object('run_id',v_run_id,'accepted_devices',v_accepted,'organization_id',v_org,'scope',v_scope);
end;
$$;

create or replace function public.prune_discovery_observations(p_keep_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_org uuid := public.current_organization_id(); v_count integer;
begin
  if auth.uid() is null or v_org is null then raise exception 'DISCOVERY_AUTH_REQUIRED'; end if;
  if public.current_app_role() <> 'admin' then raise exception 'DISCOVERY_ADMIN_REQUIRED'; end if;
  delete from public.discovery_observations where organization_id=v_org and observed_at < now() - make_interval(days=>greatest(7,least(coalesce(p_keep_days,90),730)));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.create_discovery_collector(text,text,text) from public;
revoke all on function public.rotate_discovery_collector_token(uuid) from public;
revoke all on function public.set_discovery_collector_enabled(uuid,boolean) from public;
revoke all on function public.set_discovery_device_state(uuid,text,boolean) from public;
revoke all on function public.ingest_discovery_batch(uuid,text,jsonb,jsonb) from public;
revoke all on function public.prune_discovery_observations(integer) from public;

grant execute on function public.create_discovery_collector(text,text,text) to authenticated;
grant execute on function public.rotate_discovery_collector_token(uuid) to authenticated;
grant execute on function public.set_discovery_collector_enabled(uuid,boolean) to authenticated;
grant execute on function public.set_discovery_device_state(uuid,text,boolean) to authenticated;
grant execute on function public.ingest_discovery_batch(uuid,text,jsonb,jsonb) to anon, authenticated;
grant execute on function public.prune_discovery_observations(integer) to authenticated;

notify pgrst, 'reload schema';

commit;

select
  to_regclass('public.discovery_collectors') is not null as collectors_ready,
  to_regclass('public.discovery_devices') is not null as devices_ready,
  to_regclass('public.discovery_runs') is not null as runs_ready,
  to_regclass('public.discovery_observations') is not null as observations_ready,
  to_regprocedure('public.ingest_discovery_batch(uuid,text,jsonb,jsonb)') is not null as ingest_rpc_ready,
  to_regprocedure('public.create_discovery_collector(text,text,text)') is not null as collector_rpc_ready;
