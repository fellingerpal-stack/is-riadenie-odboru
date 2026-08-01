-- IS Riadenie odboru v0.8 – voliteľná normalizovaná schéma IAM
-- Aktuálna aplikácia môže naďalej používať spoločný snapshot. Tento skript je pripravený pre neskorší prechod na samostatné tabuľky.

create table if not exists public.iam_access_catalog (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  service_id text,
  system_name text,
  description text,
  business_owner text,
  technical_owner text,
  risk text not null default 'Stredné',
  privileged boolean not null default false,
  default_duration_days integer not null default 365,
  approval_path jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.iam_access_requests (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_type text not null,
  subject_name text not null,
  subject_email text,
  department text,
  manager text,
  requester text,
  service_id text,
  catalog_item_id text references public.iam_access_catalog(id) on delete set null,
  requested_access text not null,
  current_access text,
  business_justification text,
  privileged boolean not null default false,
  risk text not null default 'Stredné',
  status text not null default 'Návrh',
  start_date date,
  end_date date,
  due_date date,
  assignee text,
  linked_task_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.iam_access_approvals (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.iam_access_requests(id) on delete cascade,
  stage text not null,
  approver text,
  decision text not null default 'Čaká',
  note text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.iam_access_comments (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.iam_access_requests(id) on delete cascade,
  author text,
  comment_text text not null,
  internal boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.iam_access_history (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references public.iam_access_requests(id) on delete cascade,
  action text not null,
  author text,
  created_at timestamptz not null default now()
);

create table if not exists public.iam_recertification_campaigns (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  owner text,
  scope text,
  status text not null default 'Návrh',
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.iam_recertification_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.iam_recertification_campaigns(id) on delete cascade,
  subject_name text not null,
  subject_email text,
  catalog_item_id text references public.iam_access_catalog(id) on delete set null,
  access_name text not null,
  reviewer text,
  decision text not null default 'Čaká',
  decision_note text,
  due_date date,
  last_used_at date,
  privileged boolean not null default false
);

alter table public.iam_access_catalog enable row level security;
alter table public.iam_access_requests enable row level security;
alter table public.iam_access_approvals enable row level security;
alter table public.iam_access_comments enable row level security;
alter table public.iam_access_history enable row level security;
alter table public.iam_recertification_campaigns enable row level security;
alter table public.iam_recertification_items enable row level security;

-- Politiky zámerne nie sú vytvorené automaticky. Majú sa zosúladiť s existujúcim modelom profiles/organizations.
