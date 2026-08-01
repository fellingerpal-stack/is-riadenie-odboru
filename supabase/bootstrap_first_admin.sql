-- PRVÝ ADMINISTRÁTOR PRE RELEASE 0.10
-- 1. V Supabase Dashboard > Authentication > Users vytvorte používateľa.
-- 2. Nahraďte e-mail nižšie jeho presným e-mailom.
-- 3. Spustite najprv schema_v02.sql a schema_auth_users_v010.sql.
-- 4. Spustite tento skript.

insert into public.profiles (
  id,
  organization_id,
  full_name,
  email,
  department,
  job_title,
  phone,
  role,
  is_active
)
select
  users.id,
  organizations.id,
  coalesce(users.raw_user_meta_data->>'full_name', 'Pavol Horváth'),
  coalesce(users.email, ''),
  'Odbor 3.2',
  'Riaditeľ odboru',
  '',
  'admin',
  true
from auth.users as users
cross join public.organizations as organizations
where lower(users.email) = lower('SEM_DOPLNTE_EMAIL@cvtisr.sk')
  and organizations.slug = 'cvti-sr'
on conflict (id) do update set
  organization_id = excluded.organization_id,
  full_name = excluded.full_name,
  email = excluded.email,
  department = excluded.department,
  job_title = excluded.job_title,
  role = 'admin',
  is_active = true,
  updated_at = now();

select id, full_name, email, department, job_title, role, is_active
from public.profiles
where lower(email) = lower('SEM_DOPLNTE_EMAIL@cvtisr.sk');
