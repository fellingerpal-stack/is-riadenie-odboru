-- IS Riadenie odboru v0.7 – samostatný dátový model Problem managementu.
-- Predpokladá schema_v02.sql a podľa potreby schema_servicedesk_v05.sql / schema_change_management_v06.sql.
-- Aplikácia v0.7 naďalej podporuje snapshotový režim, preto tento skript zatiaľ nie je povinný.

create extension if not exists pgcrypto;

create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  problem_number text not null,
  title text not null,
  description text not null default '',
  service_key text not null default '',
  owner_id uuid references public.profiles(id) on delete set null,
  owner_name text not null default '',
  resolver_team text not null default '',
  priority text not null default 'Stredná',
  impact text not null default 'Jeden útvar',
  status text not null default 'Nový',
  symptom text not null default '',
  recurring_pattern text not null default '',
  root_cause text not null default '',
  root_cause_method text not null default '5× prečo',
  why_analysis jsonb not null default '[]'::jsonb,
  workaround text not null default '',
  permanent_solution text not null default '',
  is_known_error boolean not null default false,
  known_error_summary text not null default '',
  linked_project_key text not null default '',
  target_date date,
  resolved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, problem_number)
);

create table if not exists public.problem_ticket_links (
  problem_id uuid not null references public.problems(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (problem_id, ticket_id)
);

create table if not exists public.problem_change_links (
  problem_id uuid not null references public.problems(id) on delete cascade,
  change_id uuid not null references public.change_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (problem_id, change_id)
);

create table if not exists public.problem_actions (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  title text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  owner_name text not null default '',
  due_date date,
  status text not null default 'Návrh',
  linked_task_key text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.problem_comments (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default '',
  body text not null,
  is_internal boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.problem_history (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default '',
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists problems_org_status_idx on public.problems (organization_id, status, updated_at desc);
create index if not exists problems_service_idx on public.problems (organization_id, service_key, priority);
create index if not exists problems_known_error_idx on public.problems (organization_id, is_known_error) where is_known_error;
create index if not exists problem_actions_problem_idx on public.problem_actions (problem_id, status, due_date);
create index if not exists problem_comments_problem_idx on public.problem_comments (problem_id, created_at desc);
create index if not exists problem_history_problem_idx on public.problem_history (problem_id, created_at desc);

drop trigger if exists problems_set_updated_at on public.problems;
create trigger problems_set_updated_at before update on public.problems
for each row execute function public.set_updated_at();

drop trigger if exists problem_actions_set_updated_at on public.problem_actions;
create trigger problem_actions_set_updated_at before update on public.problem_actions
for each row execute function public.set_updated_at();

alter table public.problems enable row level security;
alter table public.problem_ticket_links enable row level security;
alter table public.problem_change_links enable row level security;
alter table public.problem_actions enable row level security;
alter table public.problem_comments enable row level security;
alter table public.problem_history enable row level security;

drop policy if exists "org reads problems" on public.problems;
create policy "org reads problems" on public.problems for select to authenticated
using (organization_id = (select public.current_organization_id()));

drop policy if exists "members create problems" on public.problems;
create policy "members create problems" on public.problems for insert to authenticated
with check (organization_id = (select public.current_organization_id()));

drop policy if exists "managers update problems" on public.problems;
create policy "managers update problems" on public.problems for update to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager'))
with check (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager'));

drop policy if exists "admins delete problems" on public.problems;
create policy "admins delete problems" on public.problems for delete to authenticated
using (organization_id = (select public.current_organization_id()) and (select public.current_app_role()) = 'admin');

-- Podriadené záznamy sú dostupné iba cez problém patriaci do aktuálnej organizácie.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['problem_ticket_links','problem_change_links','problem_actions','problem_comments','problem_history']
  loop
    execute format('drop policy if exists "org manages %s" on public.%I', table_name, table_name);
    execute format(
      'create policy "org manages %s" on public.%I for all to authenticated using (exists (select 1 from public.problems p where p.id = problem_id and p.organization_id = (select public.current_organization_id()))) with check (exists (select 1 from public.problems p where p.id = problem_id and p.organization_id = (select public.current_organization_id())))',
      table_name, table_name
    );
  end loop;
end $$;

grant select, insert, update, delete on public.problems to authenticated;
grant select, insert, update, delete on public.problem_ticket_links to authenticated;
grant select, insert, update, delete on public.problem_change_links to authenticated;
grant select, insert, update, delete on public.problem_actions to authenticated;
grant select, insert, update, delete on public.problem_comments to authenticated;
grant select, insert, update, delete on public.problem_history to authenticated;
