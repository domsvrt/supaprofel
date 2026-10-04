create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  resource_type text check (resource_type in ('file', 'image', 'video', 'link')),
  resource_url text,
  storage_path text,
  file_name text,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modules_resource_location_check check (
    (
      resource_type is null
      and resource_url is null
      and storage_path is null
      and file_name is null
      and mime_type is null
      and file_size is null
    )
    or
    (
      resource_type = 'link'
      and resource_url is not null
      and storage_path is null
      and file_name is null
      and mime_type is null
      and file_size is null
    )
    or
    (
      resource_type in ('file', 'image', 'video')
      and resource_url is null
      and storage_path is not null
      and file_name is not null
      and mime_type is not null
      and file_size is not null
    )
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists modules_set_updated_at on public.modules;
create trigger modules_set_updated_at
before update on public.modules
for each row execute function public.set_updated_at();

alter table public.modules enable row level security;

drop policy if exists "Teachers can read their modules" on public.modules;
create policy "Teachers can read their modules"
on public.modules for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Teachers can create their modules" on public.modules;
create policy "Teachers can create their modules"
on public.modules for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Teachers can update their modules" on public.modules;
create policy "Teachers can update their modules"
on public.modules for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Teachers can delete their modules" on public.modules;
create policy "Teachers can delete their modules"
on public.modules for delete
to authenticated
using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.modules to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('module-resources', 'module-resources', false, 6291456)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Teachers can read their module files" on storage.objects;
create policy "Teachers can read their module files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'module-resources'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Teachers can upload their module files" on storage.objects;
create policy "Teachers can upload their module files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'module-resources'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Teachers can update their module files" on storage.objects;
create policy "Teachers can update their module files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'module-resources'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'module-resources'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Teachers can delete their module files" on storage.objects;
create policy "Teachers can delete their module files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'module-resources'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
