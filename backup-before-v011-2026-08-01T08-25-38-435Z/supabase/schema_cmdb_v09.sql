-- Voliteľná samostatná CMDB schéma pre budúce oddelenie od spoločného snapshotu.
-- V aktuálnej verzii 0.9 ju nie je potrebné spúšťať.

create table if not exists public.cmdb_items (
  id text primary key,
  organization_id uuid,
  name text not null,
  item_type text not null,
  category text,
  status text,
  criticality text,
  service_id text,
  business_owner text,
  technical_owner text,
  custodian text,
  environment text,
  location text,
  supplier text,
  version text,
  hostname text,
  ip_address text,
  serial_number text,
  asset_tag text,
  purchase_date date,
  warranty_end date,
  license_end date,
  contract_end date,
  support_end date,
  cost numeric(14,2) default 0,
  data_classification text,
  monitoring text,
  backup text,
  documentation text,
  lifecycle text,
  linked_ticket_ids jsonb not null default '[]'::jsonb,
  linked_change_ids jsonb not null default '[]'::jsonb,
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.cmdb_relationships (
  id text primary key,
  organization_id uuid,
  source_id text not null references public.cmdb_items(id) on delete cascade,
  target_id text not null references public.cmdb_items(id) on delete cascade,
  relationship_type text not null,
  criticality text,
  note text,
  created_at timestamptz not null default now(),
  constraint cmdb_relationship_no_self_link check (source_id <> target_id)
);

create index if not exists cmdb_items_service_idx on public.cmdb_items(service_id);
create index if not exists cmdb_items_type_idx on public.cmdb_items(item_type);
create index if not exists cmdb_relationships_source_idx on public.cmdb_relationships(source_id);
create index if not exists cmdb_relationships_target_idx on public.cmdb_relationships(target_id);
