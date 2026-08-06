-- IS Riadenie odboru 0.14.0
-- Privátne úložisko topologických dokumentov OIT.
-- Skript je bezpečné spustiť opakovane.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'oit-documents',
  'oit-documents',
  false,
  15728640,
  array['image/png', 'image/jpeg', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists "OIT documents read active roles" on storage.objects;
create policy "OIT documents read active roles"
on storage.objects for select
to authenticated
using (
  bucket_id = 'oit-documents'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'manager', 'resolver', 'viewer')
  )
);

drop policy if exists "OIT documents admin insert" on storage.objects;
create policy "OIT documents admin insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'oit-documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true and p.role = 'admin'
  )
);

drop policy if exists "OIT documents admin update" on storage.objects;
create policy "OIT documents admin update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'oit-documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true and p.role = 'admin'
  )
)
with check (
  bucket_id = 'oit-documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true and p.role = 'admin'
  )
);

drop policy if exists "OIT documents admin delete" on storage.objects;
create policy "OIT documents admin delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'oit-documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true and p.role = 'admin'
  )
);

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'oit-documents';
