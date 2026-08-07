-- IS Riadenie odboru v0.26.0
-- Scoped IAM: Odbor 3.1 / Odbor 3.2 / Spolocne moduly.
-- Spustit raz v Supabase SQL Editore po predchadzajucich migraciach aplikacie.

begin;

alter table public.profiles
  add column if not exists access_scopes jsonb not null default '{}'::jsonb;

create or replace function public.default_access_scopes(p_role text, p_department text)
returns jsonb
language sql
immutable
as $$
  select case
    when coalesce(p_role,'viewer') = 'admin' then '{"oit":"write","oris":"write","shared":"write"}'::jsonb
    when lower(coalesce(p_department,'')) like '%3.1%' or lower(coalesce(p_department,'')) like '%oit%' then
      jsonb_build_object(
        'oit', case when coalesce(p_role,'viewer') <> 'viewer' then 'write' else 'read' end,
        'oris', 'read',
        'shared', case when coalesce(p_role,'viewer') <> 'viewer' then 'write' else 'read' end
      )
    when lower(coalesce(p_department,'')) like '%3.2%' or lower(coalesce(p_department,'')) like '%oris%' then
      jsonb_build_object(
        'oit', 'read',
        'oris', case when coalesce(p_role,'viewer') <> 'viewer' then 'write' else 'read' end,
        'shared', case when coalesce(p_role,'viewer') <> 'viewer' then 'write' else 'read' end
      )
    else '{"oit":"read","oris":"read","shared":"read"}'::jsonb
  end;
$$;

update public.profiles
set access_scopes = public.default_access_scopes(role, department)
where access_scopes is null or access_scopes = '{}'::jsonb;

create or replace function public.current_scope_access(p_scope text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_department text;
  v_scopes jsonb;
  v_value text;
begin
  if p_scope not in ('oit','oris','shared') then return 'none'; end if;

  select role, department, access_scopes
    into v_role, v_department, v_scopes
  from public.profiles
  where id = (select auth.uid()) and is_active = true;

  if v_role is null then return 'none'; end if;
  if v_role = 'admin' then return 'write'; end if;

  v_value := coalesce(v_scopes ->> p_scope, public.default_access_scopes(v_role, v_department) ->> p_scope, 'none');
  if v_value not in ('none','read','write') then return 'none'; end if;
  return v_value;
end;
$$;

create or replace function public.can_read_scope(p_scope text)
returns boolean language sql stable security definer set search_path=public
as $$ select public.current_scope_access(p_scope) in ('read','write') $$;

create or replace function public.can_write_scope(p_scope text)
returns boolean language sql stable security definer set search_path=public
as $$ select public.current_scope_access(p_scope) = 'write' $$;

-- Novy auth ucet dostane bezpecny predvoleny scope uz pri vytvoreni profilu.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_department text := coalesce(new.raw_user_meta_data->>'department', '');
  v_role text := coalesce(nullif(new.raw_user_meta_data->>'requested_role',''), 'employee');
  v_scopes jsonb;
begin
  if v_role not in ('admin','manager','resolver','employee','viewer') then v_role := 'employee'; end if;
  select id into v_org_id from public.organizations where slug = 'cvti-sr' limit 1;
  if v_org_id is null then
    insert into public.organizations (name, slug) values ('CVTI SR', 'cvti-sr') returning id into v_org_id;
  end if;
  v_scopes := coalesce(new.raw_user_meta_data->'access_scopes', public.default_access_scopes(v_role, v_department));

  insert into public.profiles (
    id, organization_id, full_name, email, department, job_title, phone, role, access_scopes, is_active, invited_at
  ) values (
    new.id, v_org_id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,''), v_department,
    coalesce(new.raw_user_meta_data->>'job_title',''), coalesce(new.raw_user_meta_data->>'phone',''), v_role, v_scopes, true, now()
  ) on conflict (id) do nothing;
  return new;
end;
$$;

-- Snapshot: zapisuje iba casti, na ktore ma pouzivatel WRITE. Ostatne casti sa serverovo zachovaju.
create or replace function public.save_app_snapshot(p_payload jsonb)
returns table (id uuid, version integer, created_at timestamptz, created_by uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_role text;
  v_version integer;
  v_id uuid;
  v_created_at timestamptz;
  v_current jsonb;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_key text;
begin
  if v_user_id is null then raise exception 'Pouzivatel nie je prihlaseny.'; end if;
  select organization_id, role into v_org_id, v_role from public.profiles where profiles.id=v_user_id and is_active=true;
  if v_org_id is null then raise exception 'Aktivny pouzivatelsky profil nebol najdeny.'; end if;
  if v_role not in ('admin','manager','resolver') then raise exception 'Pouzivatel nema opravnenie ukladat riadiace data.'; end if;
  if v_role <> 'admin' and not (public.can_write_scope('oris') or public.can_write_scope('oit') or public.can_write_scope('shared')) then
    raise exception 'Pouzivatel nema WRITE opravnenie pre ziadny pracovny priestor.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_org_id::text));
  select payload into v_current from public.app_snapshots where organization_id=v_org_id and is_current=true order by created_at desc limit 1;
  if v_current is null and v_role <> 'admin' then
    raise exception 'Prvy organizacny snapshot musi vytvorit administrator.';
  end if;
  v_current := coalesce(v_current, '{}'::jsonb);

  if v_role <> 'admin' and not public.can_write_scope('oris') then
    foreach v_key in array array['employees','raci','services','substitutions','capacity','risks','decisions','changes','problems','cmdbItems','cmdbRelationships'] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;
  if v_role <> 'admin' and not public.can_write_scope('shared') then
    foreach v_key in array array['actions','supplierRecords','architectureOverrides'] loop
      v_payload := jsonb_set(v_payload, array[v_key], coalesce(v_current->v_key, '[]'::jsonb), true);
    end loop;
  end if;

  select coalesce(max(app_snapshots.version),0)+1 into v_version from public.app_snapshots where organization_id=v_org_id;
  update public.app_snapshots set is_current=false where organization_id=v_org_id and is_current=true;
  insert into public.app_snapshots(organization_id,version,payload,created_by,is_current)
    values(v_org_id,v_version,v_payload,v_user_id,true)
    returning app_snapshots.id, app_snapshots.created_at into v_id,v_created_at;
  return query select v_id,v_version,v_created_at,v_user_id;
end;
$$;

-- Projekty a ulohy = pracovny priestor 3.2.
create or replace function public.assert_work_editor()
returns table (organization_id uuid, user_id uuid)
language plpgsql security definer set search_path=public
as $$
declare v_user_id uuid:=(select auth.uid()); v_org_id uuid; v_role text;
begin
  select organization_id,role into v_org_id,v_role from public.profiles where id=v_user_id and is_active=true;
  if v_org_id is null then raise exception 'Aktivny profil nebol najdeny.'; end if;
  if v_role not in ('admin','manager','resolver') or not public.can_write_scope('oris') then raise exception 'Projekty a ulohy: chyba WRITE pristup k odboru 3.2.'; end if;
  return query select v_org_id,v_user_id;
end; $$;

drop policy if exists "work readers see organization projects" on public.work_projects;
create policy "work readers see organization projects" on public.work_projects for select to authenticated using (organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_read_scope('oris'));
drop policy if exists "work editors insert projects" on public.work_projects;
create policy "work editors insert projects" on public.work_projects for insert to authenticated with check (organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_write_scope('oris'));
drop policy if exists "work editors update projects" on public.work_projects;
create policy "work editors update projects" on public.work_projects for update to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris')) with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris'));
drop policy if exists "work editors delete projects" on public.work_projects;
create policy "work editors delete projects" on public.work_projects for delete to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris'));

drop policy if exists "work readers see organization tasks" on public.work_tasks;
create policy "work readers see organization tasks" on public.work_tasks for select to authenticated using (organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_read_scope('oris'));
drop policy if exists "work editors insert tasks" on public.work_tasks;
create policy "work editors insert tasks" on public.work_tasks for insert to authenticated with check (organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_write_scope('oris'));
drop policy if exists "work editors update tasks" on public.work_tasks;
create policy "work editors update tasks" on public.work_tasks for update to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris')) with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris'));
drop policy if exists "work editors delete tasks" on public.work_tasks;
create policy "work editors delete tasks" on public.work_tasks for delete to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris'));

-- Helpdesk = 3.2. Member moze citat pri READ; zapis vyzaduje WRITE.
create or replace function public.assert_service_member()
returns table (organization_id uuid, user_id uuid, app_role text)
language plpgsql security definer set search_path=public
as $$
declare v_user_id uuid:=(select auth.uid()); v_org_id uuid; v_role text;
begin
  select organization_id,role into v_org_id,v_role from public.profiles where id=v_user_id and is_active=true;
  if v_org_id is null then raise exception 'Aktivny profil nebol najdeny.'; end if;
  if v_role not in ('admin','manager','resolver','employee') or not public.can_read_scope('oris') then raise exception 'Helpdesk: chyba pristup k odboru 3.2.'; end if;
  return query select v_org_id,v_user_id,v_role;
end; $$;
create or replace function public.assert_service_configurator()
returns table (organization_id uuid, user_id uuid)
language plpgsql security definer set search_path=public
as $$
declare v_org_id uuid; v_user_id uuid; v_role text;
begin
  select organization_id,user_id,app_role into v_org_id,v_user_id,v_role from public.assert_service_member();
  if v_role not in ('admin','manager','resolver') or not public.can_write_scope('oris') then raise exception 'Helpdesk konfiguracia: chyba WRITE pristup k odboru 3.2.'; end if;
  return query select v_org_id,v_user_id;
end; $$;

-- Pre ticket write policies je scope podmienka doplnena priamo do RLS.
drop policy if exists "service members read queues" on public.service_queues;
create policy "service members read queues" on public.service_queues for select to authenticated using (organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','employee') and public.can_read_scope('oris'));
drop policy if exists "service configurators manage queues" on public.service_queues;
create policy "service configurators manage queues" on public.service_queues for all to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver')) with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver'));
drop policy if exists "service members read sla" on public.service_sla_policies;
create policy "service members read sla" on public.service_sla_policies for select to authenticated using (organization_id=(select public.current_organization_id()) and public.can_read_scope('oris'));
drop policy if exists "service configurators manage sla" on public.service_sla_policies;
create policy "service configurators manage sla" on public.service_sla_policies for all to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver')) with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver'));
drop policy if exists "service members read tickets" on public.service_tickets;
create policy "service members read tickets" on public.service_tickets for select to authenticated using (organization_id=(select public.current_organization_id()) and public.can_read_scope('oris'));
drop policy if exists "service members insert tickets" on public.service_tickets;
create policy "service members insert tickets" on public.service_tickets for insert to authenticated with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver','employee'));
drop policy if exists "service members update tickets" on public.service_tickets;
create policy "service members update tickets" on public.service_tickets for update to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris')) with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris'));
drop policy if exists "service members delete tickets" on public.service_tickets;
create policy "service members delete tickets" on public.service_tickets for delete to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris'));

-- IAM modul = 3.2.
create or replace function public.assert_iam_member()
returns table (organization_id uuid, user_id uuid, app_role text)
language plpgsql security definer set search_path=public
as $$
declare v_user_id uuid:=(select auth.uid()); v_org_id uuid; v_role text;
begin
  select organization_id,role into v_org_id,v_role from public.profiles where id=v_user_id and is_active=true;
  if v_org_id is null then raise exception 'Aktivny profil nebol najdeny.'; end if;
  if v_role not in ('admin','manager','resolver','employee') or not public.can_read_scope('oris') then raise exception 'IAM: chyba pristup k odboru 3.2.'; end if;
  return query select v_org_id,v_user_id,v_role;
end; $$;
create or replace function public.assert_iam_configurator()
returns table (organization_id uuid, user_id uuid)
language plpgsql security definer set search_path=public
as $$
declare v_org_id uuid; v_user_id uuid; v_role text;
begin
  select organization_id,user_id,app_role into v_org_id,v_user_id,v_role from public.assert_iam_member();
  if v_role not in ('admin','manager','resolver') or not public.can_write_scope('oris') then raise exception 'IAM konfiguracia: chyba WRITE pristup k odboru 3.2.'; end if;
  return query select v_org_id,v_user_id;
end; $$;

drop policy if exists "iam members read catalog" on public.iam_catalog_items;
create policy "iam members read catalog" on public.iam_catalog_items for select to authenticated using (organization_id=(select public.current_organization_id()) and public.can_read_scope('oris'));
drop policy if exists "iam configurators manage catalog" on public.iam_catalog_items;
create policy "iam configurators manage catalog" on public.iam_catalog_items for all to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver')) with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver'));
drop policy if exists "iam members read requests" on public.iam_requests;
create policy "iam members read requests" on public.iam_requests for select to authenticated using (organization_id=(select public.current_organization_id()) and public.can_read_scope('oris'));
drop policy if exists "iam members insert requests" on public.iam_requests;
create policy "iam members insert requests" on public.iam_requests for insert to authenticated with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver','employee'));
drop policy if exists "iam members update requests" on public.iam_requests;
create policy "iam members update requests" on public.iam_requests for update to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris')) with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris'));
drop policy if exists "iam members delete requests" on public.iam_requests;
create policy "iam members delete requests" on public.iam_requests for delete to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris'));
drop policy if exists "iam members read campaigns" on public.iam_recert_campaigns;
create policy "iam members read campaigns" on public.iam_recert_campaigns for select to authenticated using (organization_id=(select public.current_organization_id()) and public.can_read_scope('oris'));
drop policy if exists "iam configurators manage campaigns" on public.iam_recert_campaigns;
create policy "iam configurators manage campaigns" on public.iam_recert_campaigns for all to authenticated using (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver')) with check (organization_id=(select public.current_organization_id()) and public.can_write_scope('oris') and (select public.current_app_role()) in ('admin','manager','resolver'));

-- Digitalne portfolio = 3.2.
create or replace function public.assert_digital_portfolio_editor()
returns table (organization_id uuid, user_id uuid, app_role text)
language plpgsql security definer set search_path=public
as $$
declare v_user_id uuid:=(select auth.uid()); v_org_id uuid; v_role text;
begin
  select organization_id,role into v_org_id,v_role from public.profiles where id=v_user_id and is_active=true;
  if v_org_id is null then raise exception 'Aktivny profil nebol najdeny.'; end if;
  if v_role not in ('admin','manager','resolver') or not public.can_write_scope('oris') then raise exception 'Digitalne portfolio: chyba WRITE pristup k odboru 3.2.'; end if;
  return query select v_org_id,v_user_id,v_role;
end; $$;

drop policy if exists website_registry_select on public.website_registry;
create policy website_registry_select on public.website_registry for select to authenticated using(organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','viewer') and public.can_read_scope('oris'));
drop policy if exists website_registry_write on public.website_registry;
create policy website_registry_write on public.website_registry for all to authenticated using(organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_write_scope('oris')) with check(organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_write_scope('oris'));
drop policy if exists information_system_registry_select on public.information_system_registry;
create policy information_system_registry_select on public.information_system_registry for select to authenticated using(organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver','viewer') and public.can_read_scope('oris'));
drop policy if exists information_system_registry_write on public.information_system_registry;
create policy information_system_registry_write on public.information_system_registry for all to authenticated using(organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_write_scope('oris')) with check(organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_write_scope('oris'));

-- Audit/activity vrstvy respektuju rovnaky pracovny scope.
drop policy if exists "work readers see activity" on public.work_activity;
create policy "work readers see activity" on public.work_activity for select to authenticated
using (organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_read_scope('oris'));

drop policy if exists "service managers read activity" on public.service_activity;
create policy "service managers read activity" on public.service_activity for select to authenticated
using (organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_read_scope('oris'));

drop policy if exists "iam managers read activity" on public.iam_activity;
create policy "iam managers read activity" on public.iam_activity for select to authenticated
using (organization_id=(select public.current_organization_id()) and (select public.current_app_role()) in ('admin','manager','resolver') and public.can_read_scope('oris'));

-- OIT dokumenty: citanie vyzaduje READ do 3.1. Zapis zostava administratorsky a navyse vyzaduje WRITE do 3.1.
drop policy if exists "OIT documents read active roles" on storage.objects;
drop policy if exists "OIT documents read app roles" on storage.objects;
create policy "OIT documents read app roles"
on storage.objects for select to authenticated
using (
  bucket_id='oit-documents'
  and (select public.current_app_role()) in ('admin','manager','resolver','viewer')
  and public.can_read_scope('oit')
);

drop policy if exists "OIT documents admin insert" on storage.objects;
create policy "OIT documents admin insert" on storage.objects for insert to authenticated
with check (bucket_id='oit-documents' and (select public.current_app_role())='admin' and public.can_write_scope('oit'));

drop policy if exists "OIT documents admin update" on storage.objects;
create policy "OIT documents admin update" on storage.objects for update to authenticated
using (bucket_id='oit-documents' and (select public.current_app_role())='admin' and public.can_write_scope('oit'))
with check (bucket_id='oit-documents' and (select public.current_app_role())='admin' and public.can_write_scope('oit'));

drop policy if exists "OIT documents admin delete" on storage.objects;
create policy "OIT documents admin delete" on storage.objects for delete to authenticated
using (bucket_id='oit-documents' and (select public.current_app_role())='admin' and public.can_write_scope('oit'));

revoke all on function public.current_scope_access(text) from public;
revoke all on function public.can_read_scope(text) from public;
revoke all on function public.can_write_scope(text) from public;
grant execute on function public.current_scope_access(text) to authenticated;
grant execute on function public.can_read_scope(text) to authenticated;
grant execute on function public.can_write_scope(text) to authenticated;

commit;

-- Kontrola: administrator by mal mat write/write/write.
select email, department, role, access_scopes from public.profiles order by full_name;
