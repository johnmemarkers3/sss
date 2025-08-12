
-- 1) Тип статуса (общий для проектов и квартир)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type public.property_status as enum ('В продаже', 'Сдан', 'Забронировано');
  end if;
end $$;

-- 2) Таблица проектов (объектов/ЖК)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  address text not null,
  city text not null,
  district text not null,
  status public.property_status not null default 'В продаже',
  price_min numeric not null default 0,
  price_max numeric not null default 0,
  area_min numeric,
  area_max numeric,
  deadline text,
  description text,
  amenities text[] not null default '{}',
  tags text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Таблица квартир (юнитов) внутри проекта
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text,
  rooms int not null,
  area numeric not null,
  floor int,
  price numeric not null,
  status public.property_status not null default 'В продаже',
  plan_image_url text,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Профили для контроля прав (без внешнего ключа на auth.users)
create table if not exists public.profiles (
  user_id uuid primary key,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);

-- 5) Триггер обновления updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated on public.projects;
create trigger set_projects_updated
before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists set_units_updated on public.units;
create trigger set_units_updated
before update on public.units
for each row execute procedure public.set_updated_at();

-- 6) Включаем RLS
alter table public.projects enable row level security;
alter table public.units enable row level security;
alter table public.profiles enable row level security;

-- 7) Политики: публичное чтение, админ-изменения
-- projects
drop policy if exists "Public read projects" on public.projects;
create policy "Public read projects"
  on public.projects
  for select
  using (true);

drop policy if exists "Admins insert projects" on public.projects;
create policy "Admins insert projects"
  on public.projects
  for insert
  with check (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins update projects" on public.projects;
create policy "Admins update projects"
  on public.projects
  for update
  using (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins delete projects" on public.projects;
create policy "Admins delete projects"
  on public.projects
  for delete
  using (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ));

-- units
drop policy if exists "Public read units" on public.units;
create policy "Public read units"
  on public.units
  for select
  using (true);

drop policy if exists "Admins insert units" on public.units;
create policy "Admins insert units"
  on public.units
  for insert
  with check (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins update units" on public.units;
create policy "Admins update units"
  on public.units
  for update
  using (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins delete units" on public.units;
create policy "Admins delete units"
  on public.units
  for delete
  using (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  ));

-- profiles: пользователь управляет своей записью
drop policy if exists "Users select own profile" on public.profiles;
create policy "Users select own profile"
  on public.profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 8) Индексы для фильтров и поиска
create index if not exists projects_city_idx on public.projects (city);
create index if not exists projects_district_idx on public.projects (district);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists units_project_idx on public.units (project_id);
create index if not exists units_rooms_idx on public.units (rooms);
create index if not exists units_price_idx on public.units (price);

-- Полнотекстовый поиск (ru) по проектам
create index if not exists projects_search_idx
on public.projects
using gin (
  to_tsvector('russian',
    coalesce(name,'') || ' ' ||
    coalesce(address,'') || ' ' ||
    coalesce(city,'') || ' ' ||
    coalesce(district,'') || ' ' ||
    coalesce(description,'')
  )
);

-- 9) Представления для агрегатов по квартирам
drop view if exists public.project_stats;
create view public.project_stats as
select
  p.id as project_id,
  count(u.id) as units_count,
  min(u.price) as min_unit_price,
  max(u.price) as max_unit_price,
  min(u.area) as min_unit_area,
  max(u.area) as max_unit_area,
  array_agg(distinct u.rooms) filter (where u.id is not null) as rooms_available
from public.projects p
left join public.units u on u.project_id = p.id
group by p.id;

drop view if exists public.projects_with_stats;
create view public.projects_with_stats as
select
  p.*,
  s.units_count,
  s.min_unit_price,
  s.max_unit_price,
  s.min_unit_area,
  s.max_unit_area,
  s.rooms_available
from public.projects p
left join public.project_stats s on s.project_id = p.id;
