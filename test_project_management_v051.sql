-- v0.51.0 readiness / smoke diagnostics (read-only)
select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='work_projects' and column_name='phase') as project_extension_ready,
  to_regclass('public.project_members') is not null as project_members_ready,
  to_regclass('public.project_funding') is not null as project_funding_ready,
  to_regclass('public.project_milestones') is not null as project_milestones_ready,
  to_regclass('public.project_links') is not null as project_links_ready,
  to_regprocedure('public.project_portfolio_read()') is not null as project_reader_ready,
  to_regprocedure('public.project_portfolio_upsert_project(jsonb)') is not null as project_writer_ready,
  to_regprocedure('public.project_portfolio_upsert_task(jsonb)') is not null as project_task_writer_ready,
  public.default_access_scopes('project_manager','Odbor 3.1') = '{"oit":"none","oris":"none","shared":"none"}'::jsonb as project_manager_scope_hardened,
  public.default_access_scopes('project_member','Odbor 3.2') = '{"oit":"none","oris":"none","shared":"none"}'::jsonb as project_member_scope_hardened,
  exists(select 1 from pg_constraint where conname='profiles_role_check' and pg_get_constraintdef(oid) like '%project_manager%' and pg_get_constraintdef(oid) like '%project_member%') as project_roles_ready;

-- Kontrola zachovania ServiceDesk dat (modul je vo v0.51.0 iba skryty pre non-admin UI, data sa nemazu).
select
  to_regclass('public.service_tickets') is not null as servicedesk_data_retained,
  to_regclass('public.service_queues') is not null as servicedesk_queues_retained;
