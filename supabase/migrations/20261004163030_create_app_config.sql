-- Create the role mapping first so a teacher can be identified before access
-- policies are changed. Existing post ownership takes precedence over Auth age.
create table if not exists public.app_config (
  id boolean primary key default true check (id),
  teacher_id uuid not null references auth.users(id) on delete restrict
);

do $$
declare
  existing_user_count integer;
  existing_teacher_id uuid;
  post_owner_count integer;
begin
  if not exists (select 1 from public.app_config where id = true) then
    select count(*) into post_owner_count
    from (select distinct owner_id from public.modules) as owners;

    if post_owner_count = 1 then
      select distinct owner_id into existing_teacher_id from public.modules;
    else
      select count(*) into existing_user_count from auth.users;
      if post_owner_count = 0 and existing_user_count = 1 then
        select id into existing_teacher_id from auth.users limit 1;
      end if;
    end if;

    if existing_teacher_id is not null then
      insert into public.app_config (id, teacher_id)
      values (true, existing_teacher_id);
    end if;
  end if;
end;
$$;

alter table public.app_config enable row level security;
revoke all on public.app_config from public, anon, authenticated;
grant select on public.app_config to authenticated;

drop policy if exists "Signed in users can identify the teacher" on public.app_config;
create policy "Signed in users can identify the teacher"
on public.app_config for select
to authenticated
using (id = true);
