
-- 1) Публичные buckets для изображений проектов и квартир
insert into storage.buckets (id, name, public)
values ('projects', 'projects', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('units', 'units', true)
on conflict (id) do update set public = excluded.public;

-- 2) Политики для чтения (публично) и записи (только admin) по bucket 'projects'
drop policy if exists "Public read project images" on storage.objects;
create policy "Public read project images"
  on storage.objects for select
  using (bucket_id = 'projects');

drop policy if exists "Admins insert project images" on storage.objects;
create policy "Admins insert project images"
  on storage.objects for insert
  with check (
    bucket_id = 'projects'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins update project images" on storage.objects;
create policy "Admins update project images"
  on storage.objects for update
  using (
    bucket_id = 'projects'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    bucket_id = 'projects'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins delete project images" on storage.objects;
create policy "Admins delete project images"
  on storage.objects for delete
  using (
    bucket_id = 'projects'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

-- 3) Политики по bucket 'units'
drop policy if exists "Public read unit images" on storage.objects;
create policy "Public read unit images"
  on storage.objects for select
  using (bucket_id = 'units');

drop policy if exists "Admins insert unit images" on storage.objects;
create policy "Admins insert unit images"
  on storage.objects for insert
  with check (
    bucket_id = 'units'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins update unit images" on storage.objects;
create policy "Admins update unit images"
  on storage.objects for update
  using (
    bucket_id = 'units'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    bucket_id = 'units'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins delete unit images" on storage.objects;
create policy "Admins delete unit images"
  on storage.objects for delete
  using (
    bucket_id = 'units'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    )
  );

-- 4) Триггер: при создании пользователя — автосоздаём профиль (viewer)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
