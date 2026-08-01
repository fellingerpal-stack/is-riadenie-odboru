-- PRVÝ ADMINISTRÁTOR PRE RELEASE 0.11
-- 1. Najprv spustite setup_v011.sql.
-- 2. V Authentication > Users vytvorte používateľa s heslom.
-- 3. Nižšie nahraďte oba výskyty e-mailu a skript spustite.

insert into public.profiles (
  id, organization_id, full_name, email, department, job_title,
  phone, role, is_active
)
select
  users.id,
  organizations.id,
  coalesce(nullif(users.raw_user_meta_data->>'full_name', ''), 'Pavol Horváth'),
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
