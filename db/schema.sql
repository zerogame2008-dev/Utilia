-- Esquema PostgreSQL (Supabase u otro proveedor). Ejecutar en el editor SQL del proveedor.
-- Hoy se usan: events y contact_messages. El resto prepara el futuro panel de administración:
-- el catálogo vive en src/tools/*.js y se migrará aquí cuando exista el panel.

create table if not exists events (
  id bigint generated always as identity primary key,
  type text not null check (type in ('pageview','tool_use','tool_error','download','search','search_click','fav','unfav','contact')),
  path text, tool text, q text, n int, code text, ref text,
  day date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists events_day_type on events (day, type);
create index if not exists events_tool on events (tool) where tool is not null;

create table if not exists contact_messages (
  id bigint generated always as identity primary key,
  nombre text not null, email text not null, motivo text not null, mensaje text not null,
  created_at timestamptz not null default now()
);

-- Estados editoriales: BORRADOR, REVISIÓN, PUBLICADO, ACTUALIZAR, ARCHIVADO
do $$ begin create type publish_status as enum ('draft','review','published','update','archived'); exception when duplicate_object then null; end $$;

create table if not exists categories (
  slug text primary key, name text not null, title text not null, description text not null,
  seo_title text, icon text, position int not null default 0, faq jsonb not null default '[]'
);
create table if not exists tools (
  slug text primary key,
  category text not null references categories(slug),
  name text not null, short text not null, description text not null, seo_title text not null,
  type text not null check (type in ('client','server','ai')),
  family text not null, icon text, status publish_status not null default 'draft',
  fields jsonb not null, options jsonb, howto jsonb, about jsonb default '[]', faq jsonb default '[]',
  keywords text[] default '{}', tags text[] default '{}', popularity int not null default 10,
  created_at date not null default current_date, updated_at date not null default current_date
);
create table if not exists tool_relations (
  tool text references tools(slug) on delete cascade, related text references tools(slug) on delete cascade,
  position int not null default 0, primary key (tool, related)
);
create table if not exists articles (
  slug text primary key, title text not null, description text not null, blocks jsonb not null,
  status publish_status not null default 'draft', tools text[] default '{}', image_url text, image_alt text,
  published_at date, updated_at date not null default current_date
);

-- Popularidad real para ordenar «Más utilizadas»:
create or replace view tool_popularity_30d as
  select tool, count(*) as uses from events where type = 'tool_use' and day > current_date - 30 group by tool order by uses desc;

-- Seguridad: solo el backend (service role) escribe; sin acceso anónimo.
alter table events enable row level security;
alter table contact_messages enable row level security;
