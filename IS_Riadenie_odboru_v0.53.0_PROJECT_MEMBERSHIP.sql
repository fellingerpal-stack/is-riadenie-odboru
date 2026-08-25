-- IS Riadenie odboru v0.53.0
-- Project Membership & Capacity Governance
-- Pevne doparovanie projektoveho clena na Supabase profile/auth UUID.
-- Projektovy manazer moze CITAT aj projekt, kde je clenom v inej projektovej roli,
-- ale RIADIT moze iba projekt, kde je skutocne PM.
-- Predpoklad: v0.51.0 + v0.52.0 projektove migracie su uz nasadene.

begin;

do $preflight$
begin
  if to_regclass('public.project_members') is null then
    raise exception 'Chyba project_members. Najprv spustite migration_project_management_v051.sql.';
  end if;
  if to_regprocedure('public.project_can_manage(uuid)') is null then
    raise exception 'Chyba project_can_manage(uuid). Najprv spustite migration_project_capacity_v052.sql.';
  end if;
end
$preflight$;

-- -----------------------------------------------------------------------------
-- 1. KANONICKY IDENTIFIKATOR PRE STARSIE TEXTOVE ZAZNAMY
-- -----------------------------------------------------------------------------

create or replace function public.project_identity_key(p_value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(
      lower(
        case
          when position('@' in coalesce(p_value,'')) > 0
            then split_part(coalesce(p_value,''),'@',1)
          else coalesce(p_value,'')
        end
      ),
      'áäčďéěíĺľňóôöŕřšťúůüýž',
      'aacdeeillnooorrstuuuyz'
    ),
    '[^a-z0-9]+',
    '',
    'g'
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. JEDNORAZOVE DOPAROVANIE EXISTUJUCICH CLENOV NA profiles.id/auth.uid()
--    Doparovanie sa vykona iba vtedy, ked je kandidat v organizacii jednoznacny.
-- -----------------------------------------------------------------------------

with candidates as (
  select
    m.id as member_id,
    (array_agg(distinct p.id))[1] as profile_id
  from public.project_members m
  join public.profiles p
    on p.organization_id=m.organization_id
   and p.is_active=true
   and (
     (trim(coalesce(m.email,''))<>'' and lower(trim(m.email))=lower(trim(p.email)))
     or (trim(coalesce(m.name,''))<>'' and lower(trim(m.name))=lower(trim(p.full_name)))
     or (
       trim(coalesce(m.email,''))<>''
       and public.project_identity_key(m.email)<>''
       and public.project_identity_key(m.email)=public.project_identity_key(p.email)
     )
     or (
       trim(coalesce(m.name,''))<>''
       and public.project_identity_key(m.name)<>''
       and public.project_identity_key(m.name)=public.project_identity_key(p.full_name)
     )
   )
  where m.user_id is null
  group by m.id
  having count(distinct p.id)=1
)
update public.project_members m
set
  user_id=c.profile_id,
  name=coalesce(nullif(trim(p.full_name),''),m.name),
  email=lower(coalesce(nullif(trim(p.email),''),m.email)),
  updated_at=now()
from candidates c
join public.profiles p on p.id=c.profile_id
where m.id=c.member_id;

-- -----------------------------------------------------------------------------
-- 3. TRIGGER: NOVY/UPRAVENY CLEN SA VZDY POKUSI NAVIAZAT NA KONKRETNY PROFIL
-- -----------------------------------------------------------------------------

create or replace function public.project_member_resolve_user_v053()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_profile_id uuid;
  v_count integer := 0;
begin
  if new.user_id is not null then
    select * into v_profile
    from public.profiles p
    where p.id=new.user_id
      and p.organization_id=new.organization_id
      and p.is_active=true
    limit 1;

    if v_profile.id is null then
      raise exception 'Vybraný používateľ nemá aktívny profil v tejto organizácii.';
    end if;
  else
    select count(distinct p.id), max(p.id::text)::uuid
      into v_count, v_profile_id
    from public.profiles p
    where p.organization_id=new.organization_id
      and p.is_active=true
      and (
        (trim(coalesce(new.email,''))<>'' and lower(trim(new.email))=lower(trim(p.email)))
        or (trim(coalesce(new.name,''))<>'' and lower(trim(new.name))=lower(trim(p.full_name)))
        or (
          trim(coalesce(new.email,''))<>''
          and public.project_identity_key(new.email)<>''
          and public.project_identity_key(new.email)=public.project_identity_key(p.email)
        )
        or (
          trim(coalesce(new.name,''))<>''
          and public.project_identity_key(new.name)<>''
          and public.project_identity_key(new.name)=public.project_identity_key(p.full_name)
        )
      );

    if v_count=1 and v_profile_id is not null then
      select * into v_profile from public.profiles p where p.id=v_profile_id;
      new.user_id:=v_profile_id;
    end if;
  end if;

  if new.user_id is not null and v_profile.id is not null then
    new.name:=coalesce(nullif(trim(v_profile.full_name),''),new.name);
    new.email:=lower(coalesce(nullif(trim(v_profile.email),''),new.email));
  else
    new.email:=lower(trim(coalesce(new.email,'')));
    new.name:=trim(coalesce(new.name,''));
  end if;

  return new;
end;
$$;

drop trigger if exists project_member_resolve_user_v053 on public.project_members;
create trigger project_member_resolve_user_v053
before insert or update of user_id,name,email,organization_id on public.project_members
for each row execute function public.project_member_resolve_user_v053();

-- -----------------------------------------------------------------------------
-- 4. MATCH CLENA NA PRIHLASENEHO POUZIVATELA
-- -----------------------------------------------------------------------------

create or replace function public.project_member_is_current_user(p_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.project_members pm
    join public.profiles p
      on p.id=auth.uid()
     and p.organization_id=pm.organization_id
     and p.is_active=true
    where pm.id=p_member_id
      and pm.is_active=true
      and (pm.valid_from is null or pm.valid_from<=current_date)
      and (pm.valid_to is null or pm.valid_to>=current_date)
      and (
        pm.user_id=p.id
        or (
          pm.user_id is null
          and (
            (trim(coalesce(pm.email,''))<>'' and lower(trim(pm.email))=lower(trim(p.email)))
            or (trim(coalesce(pm.name,''))<>'' and lower(trim(pm.name))=lower(trim(p.full_name)))
            or (
              trim(coalesce(pm.email,''))<>''
              and public.project_identity_key(pm.email)<>''
              and public.project_identity_key(pm.email)=public.project_identity_key(p.email)
            )
            or (
              trim(coalesce(pm.name,''))<>''
              and public.project_identity_key(pm.name)<>''
              and public.project_identity_key(pm.name)=public.project_identity_key(p.full_name)
            )
          )
        )
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- 5. CITANIE PROJEKTOV
-- Admin: vsetko.
-- Projektovy manazer: svoje riadene projekty + projekty, kde je clenom v lubovolnej roli.
-- Clen projektu: projekty, kde ma aktivne clenstvo.
-- -----------------------------------------------------------------------------

create or replace function public.project_can_read(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.work_projects wp
      on wp.id=p_project_id
     and wp.organization_id=p.organization_id
    where p.id=auth.uid()
      and p.is_active=true
      and (
        p.role='admin'
        or (
          p.role='project_manager'
          and (
            public.project_can_manage(wp.id)
            or exists (
              select 1
              from public.project_members pm
              where pm.project_id=wp.id
                and pm.organization_id=p.organization_id
                and public.project_member_is_current_user(pm.id)
            )
          )
        )
        or (
          p.role='project_member'
          and exists (
            select 1
            from public.project_members pm
            where pm.project_id=wp.id
              and pm.organization_id=p.organization_id
              and public.project_member_is_current_user(pm.id)
          )
        )
      )
  );
$$;

-- project_can_manage ostava prisne: PM moze zapisovat iba do projektu, ktory skutocne riadi.
-- Doplnime kanonicke fallback porovnanie pre starsie PM zaznamy.
create or replace function public.project_can_manage(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.work_projects wp
      on wp.id=p_project_id
     and wp.organization_id=p.organization_id
    where p.id=auth.uid()
      and p.is_active=true
      and (
        p.role='admin'
        or (
          p.role='project_manager'
          and (
            wp.manager_user_id=p.id
            or (trim(coalesce(wp.manager_email,''))<>'' and lower(trim(wp.manager_email))=lower(trim(p.email)))
            or (trim(coalesce(wp.manager_name,''))<>'' and lower(trim(wp.manager_name))=lower(trim(p.full_name)))
            or (
              trim(coalesce(wp.manager_email,''))<>''
              and public.project_identity_key(wp.manager_email)=public.project_identity_key(p.email)
            )
            or (
              trim(coalesce(wp.manager_name,''))<>''
              and public.project_identity_key(wp.manager_name)=public.project_identity_key(p.full_name)
            )
            or exists (
              select 1
              from public.project_members pm
              where pm.project_id=wp.id
                and pm.organization_id=p.organization_id
                and pm.is_active=true
                and lower(trim(pm.project_role))=lower('Projektový manažér')
                and public.project_member_is_current_user(pm.id)
            )
          )
        )
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- 6. UPSERT CLENA - UUID Z KLIENTA JE AUTORITATIVNY, TRIGGER DOPARI STARSIE TEXTY
-- -----------------------------------------------------------------------------

create or replace function public.project_portfolio_upsert_member(p_member jsonb)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_org uuid;
  v_actor uuid;
  v_project uuid;
  v_id uuid;
  v_user uuid;
  v_code text;
  v_email text;
  v_name text;
begin
  select organization_id,user_id into v_org,v_actor from public.assert_project_manager();
  select id into v_project
  from public.work_projects
  where organization_id=v_org and code=trim(coalesce(p_member->>'projectId',''));
  if v_project is null then raise exception 'Projekt neexistuje.'; end if;

  v_code:=coalesce(nullif(trim(p_member->>'id'),''),'PMEM-'||substr(md5(random()::text||clock_timestamp()::text),1,12));
  v_email:=lower(trim(coalesce(p_member->>'email','')));
  v_name:=trim(coalesce(p_member->>'name',''));
  begin v_user:=nullif(p_member->>'userId','')::uuid; exception when invalid_text_representation then v_user:=null; end;

  insert into public.project_members(
    organization_id,code,project_id,user_id,name,email,project_role,responsibility,
    allocation_percent,valid_from,valid_to,is_active,note,created_by,updated_by
  ) values (
    v_org,v_code,v_project,v_user,v_name,v_email,
    coalesce(nullif(p_member->>'projectRole',''),'Člen projektu'),
    coalesce(p_member->>'responsibility',''),
    greatest(0,least(100,coalesce(nullif(p_member->>'allocationPercent','')::numeric,0))),
    nullif(p_member->>'validFrom','')::date,
    nullif(p_member->>'validTo','')::date,
    coalesce(nullif(p_member->>'isActive','')::boolean,true),
    coalesce(p_member->>'note',''),v_actor,v_actor
  )
  on conflict(organization_id,code) do update set
    project_id=excluded.project_id,
    user_id=excluded.user_id,
    name=excluded.name,
    email=excluded.email,
    project_role=excluded.project_role,
    responsibility=excluded.responsibility,
    allocation_percent=excluded.allocation_percent,
    valid_from=excluded.valid_from,
    valid_to=excluded.valid_to,
    is_active=excluded.is_active,
    note=excluded.note,
    updated_by=v_actor
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.project_identity_key(text) from public;
revoke all on function public.project_member_is_current_user(uuid) from public;
revoke all on function public.project_member_resolve_user_v053() from public;
revoke all on function public.project_can_read(uuid) from public;
revoke all on function public.project_can_manage(uuid) from public;
revoke all on function public.project_portfolio_upsert_member(jsonb) from public;

grant execute on function public.project_can_read(uuid) to authenticated;
grant execute on function public.project_can_manage(uuid) to authenticated;
grant execute on function public.project_portfolio_upsert_member(jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;

select
  to_regprocedure('public.project_member_is_current_user(uuid)') is not null as membership_identity_ready,
  to_regprocedure('public.project_can_read(uuid)') is not null as project_read_scope_ready,
  to_regprocedure('public.project_can_manage(uuid)') is not null as project_manage_scope_ready,
  exists (
    select 1 from pg_trigger
    where tgname='project_member_resolve_user_v053'
      and tgrelid='public.project_members'::regclass
      and not tgisinternal
  ) as member_uuid_trigger_ready,
  (select count(*) from public.project_members where is_active=true and user_id is null) as active_members_without_user_id;
