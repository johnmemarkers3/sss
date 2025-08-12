
-- Добавляем поля для инфраструктуры рядом и произвольного кода карты
alter table public.projects
  add column if not exists infrastructure_nearby text[] not null default '{}',
  add column if not exists map_embed_url text null;
