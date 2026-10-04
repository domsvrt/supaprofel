-- Refuse to grant teacher access until the sole teacher is identified.
do $$
begin
  if not exists (select 1 from public.app_config where id = true) then
    raise exception 'Set app_config.teacher_id to the teacher Auth user ID before applying student access policies.';
  end if;
end;
$$;

drop policy if exists "Teachers can read their modules" on public.modules;
drop policy if exists "Teachers can create their modules" on public.modules;
drop policy if exists "Teachers can update their modules" on public.modules;
drop policy if exists "Teachers can delete their modules" on public.modules;
drop policy if exists "teachers can read their modules" on public.modules;
drop policy if exists "teachers can create their modules" on public.modules;
drop policy if exists "teachers can update their modules" on public.modules;
drop policy if exists "teachers can delete their modules" on public.modules;
drop policy if exists "Signed in users can read teacher posts" on public.modules;
drop policy if exists "Only the teacher can create posts" on public.modules;
drop policy if exists "Only the teacher can update posts" on public.modules;
drop policy if exists "Only the teacher can delete posts" on public.modules;

create policy "Signed in users can read teacher posts"
on public.modules for select
to authenticated
using (owner_id = (select teacher_id from public.app_config where id = true));

create policy "Only the teacher can create posts"
on public.modules for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and owner_id = (select teacher_id from public.app_config where id = true)
);

create policy "Only the teacher can update posts"
on public.modules for update
to authenticated
using (
  owner_id = (select auth.uid())
  and owner_id = (select teacher_id from public.app_config where id = true)
)
with check (
  owner_id = (select auth.uid())
  and owner_id = (select teacher_id from public.app_config where id = true)
);

create policy "Only the teacher can delete posts"
on public.modules for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and owner_id = (select teacher_id from public.app_config where id = true)
);

drop policy if exists "Teachers can read their module files" on storage.objects;
drop policy if exists "Teachers can upload their module files" on storage.objects;
drop policy if exists "Teachers can update their module files" on storage.objects;
drop policy if exists "Teachers can delete their module files" on storage.objects;
drop policy if exists "teachers can read their module files" on storage.objects;
drop policy if exists "teachers can upload their module files" on storage.objects;
drop policy if exists "teachers can update their module files" on storage.objects;
drop policy if exists "teachers can delete their module files" on storage.objects;
drop policy if exists "Signed in users can read teacher post files" on storage.objects;
drop policy if exists "Only the teacher can upload post files" on storage.objects;
drop policy if exists "Only the teacher can update post files" on storage.objects;
drop policy if exists "Only the teacher can delete post files" on storage.objects;

create policy "Signed in users can read teacher post files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'module-resources'
  and (storage.foldername(name))[1] =
    (select teacher_id::text from public.app_config where id = true)
  and (
    (select auth.uid()) =
      (select teacher_id from public.app_config where id = true)
    or exists (
      select 1 from public.modules
      where storage_path = storage.objects.name
        and owner_id =
          (select teacher_id from public.app_config where id = true)
    )
  )
);

create policy "Only the teacher can upload post files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'module-resources'
  and (select auth.uid()) =
    (select teacher_id from public.app_config where id = true)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Only the teacher can update post files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'module-resources'
  and (select auth.uid()) =
    (select teacher_id from public.app_config where id = true)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'module-resources'
  and (select auth.uid()) =
    (select teacher_id from public.app_config where id = true)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Only the teacher can delete post files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'module-resources'
  and (select auth.uid()) =
    (select teacher_id from public.app_config where id = true)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
