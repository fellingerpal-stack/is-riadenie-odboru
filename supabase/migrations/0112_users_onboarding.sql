-- IS Riadenie odboru v0.11.2
-- Používatelia a onboarding: prijatie pozvánky a platnosť prístupového odkazu.

begin;

alter table public.profiles
  add column if not exists accepted_at timestamptz;

alter table public.profiles
  add column if not exists invite_expires_at timestamptz;

update public.profiles
set accepted_at = coalesce(accepted_at, last_login_at)
where accepted_at is null
  and last_login_at is not null;

update public.profiles
set invite_expires_at = invited_at + interval '24 hours'
where invite_expires_at is null
  and invited_at is not null
  and last_login_at is null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select id into v_org_id
  from public.organizations
  where slug = 'cvti-sr'
  limit 1;

  if v_org_id is null then
    insert into public.organizations (name, slug)
    values ('CVTI SR', 'cvti-sr')
    returning id into v_org_id;
  end if;

  insert into public.profiles (
    id, organization_id, full_name, email, department, job_title,
    phone, role, is_active, invited_at, invite_expires_at
  ) values (
    new.id,
    v_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'job_title', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'employee',
    true,
    now(),
    now() + interval '24 hours'
  ) on conflict (id) do update set
    email = excluded.email,
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    invite_expires_at = coalesce(public.profiles.invite_expires_at, excluded.invite_expires_at),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.touch_last_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set last_login_at = now(),
         accepted_at = coalesce(accepted_at, now()),
         updated_at = now()
   where id = (select auth.uid())
     and is_active = true;
end;
$$;

revoke all on function public.touch_last_login() from public;
grant execute on function public.touch_last_login() to authenticated;

notify pgrst, 'reload schema';

commit;

select
  count(*) filter (where accepted_at is not null) as accepted_accounts,
  count(*) filter (where accepted_at is null and is_active) as awaiting_first_login,
  count(*) filter (where not is_active) as blocked_accounts
from public.profiles;
