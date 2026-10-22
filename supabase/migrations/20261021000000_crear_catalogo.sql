-- Catálogo de Armería Parabellum (reemplaza a futuro el arreglo de catalog.js)

create table public.productos (
  id               text primary key,               -- ej. 'arma-9', 'mochila'
  code             text,
  name             text not null,
  brand            text,
  sector           text not null check (sector in ('armeria', 'camping')),
  category         text not null,
  subcategory      text,
  short_description text,
  description      text,
  price            numeric(12,2),                  -- null = consultar
  previous_price   numeric(12,2),                  -- precio anterior si hay oferta
  offer_active     boolean not null default false,
  stock            integer check (stock >= 0),
  availability     text,                           -- ej. 'agotado'
  regulated        boolean not null default false,
  caliber          text,
  condition        text not null default 'nuevo' check (condition in ('nuevo', 'usado')),
  condition_grade  text,
  condition_notes  text,
  is_new           boolean not null default false,
  date_added       date,
  photo            jsonb,                          -- {src, sourceUrl, author, license}
  published        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index productos_sector_idx on public.productos (sector, category, subcategory);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger productos_updated_at before update on public.productos
  for each row execute function public.set_updated_at();

-- Seguridad: el público solo LEE productos publicados.
-- Escribir/editar requiere un usuario autenticado (el dueño del local).
alter table public.productos enable row level security;

create policy "lectura publica de publicados" on public.productos
  for select to anon, authenticated
  using (published = true);

create policy "admin gestiona productos" on public.productos
  for all to authenticated
  using (true) with check (true);
