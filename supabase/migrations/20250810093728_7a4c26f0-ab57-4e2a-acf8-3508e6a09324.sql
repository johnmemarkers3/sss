
-- 1) Миниатюры для проектов и квартир
alter table public.projects
  add column if not exists thumbnail_urls text[] not null default '{}';

alter table public.units
  add column if not exists thumbnail_urls text[] not null default '{}',
  add column if not exists plan_image_thumb_url text null;

-- 2) Индексы для ускорения запросов и фильтров
-- Проекты
create index if not exists idx_projects_city on public.projects(city);
create index if not exists idx_projects_district on public.projects(district);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_created_at on public.projects(created_at);

-- При необходимости и если нет дублей — делаем slug уникальным
-- Если возникнет ошибка из-за дублей, скажу как аккуратно обработать.
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'projects_slug_unique'
  ) then
    begin
      create unique index projects_slug_unique on public.projects(slug);
    exception
      when others then
        raise notice 'Не удалось создать уникальный индекс на slug (возможно, есть дубликаты). Пропускаем.';
    end;
  end if;
end $$;

-- Квартиры
create index if not exists idx_units_project_id on public.units(project_id);
create index if not exists idx_units_price on public.units(price);
create index if not exists idx_units_area on public.units(area);
create index if not exists idx_units_rooms on public.units(rooms);
create index if not exists idx_units_status on public.units(status);
create index if not exists idx_units_created_at on public.units(created_at);

-- 3) Триггеры на updated_at (функция уже есть: public.set_updated_at)
drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_units_updated_at on public.units;
create trigger trg_units_updated_at
before update on public.units
for each row execute function public.set_updated_at();
