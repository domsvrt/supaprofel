alter table public.modules
  drop constraint if exists modules_resource_location_check;

alter table public.modules
  alter column resource_type drop not null;

alter table public.modules
  add constraint modules_resource_location_check check (
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
  );
