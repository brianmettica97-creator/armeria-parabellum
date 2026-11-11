-- ───────────────────────────────────────────────────────────────────────────
-- Mejoras por lanzar (sección oculta del panel) · Armería Parabellum
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Lista de desarrolladores. SOLO estos emails ven la pestaña "Novedades"
--    del panel y pueden prender o apagar mejoras.
--    Para sumarte (NO se guarda en el repositorio, se corre a mano una vez):
--      insert into public.desarrolladores (email) values ('tu-email@ejemplo.com');
--    y, si el usuario no existe: Authentication → Users → Add user (Auto Confirm).
create table if not exists public.desarrolladores (
  email text primary key
);
alter table public.desarrolladores enable row level security;
-- Sin reglas: nadie puede leer ni tocar esta tabla desde la web.

create or replace function public.es_dev() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.desarrolladores
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Los desarrolladores también entran al panel como administradores.
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) or public.es_dev();
$$;

-- 2) Mejoras. Cada una tiene tres estados:
--      apagada  → no existe para nadie
--      interna  → solo la ven y la prueban los desarrolladores
--      lanzada  → la ve el equipo de la armería en el panel y el público en el sitio
create table if not exists public.mejoras (
  id          text primary key,
  nombre      text not null,
  descripcion text,
  estado      text not null default 'apagada' check (estado in ('apagada', 'interna', 'lanzada')),
  updated_at  timestamptz not null default now()
);
alter table public.mejoras enable row level security;

drop policy if exists "mejoras lanzadas son publicas" on public.mejoras;
drop policy if exists "desarrolladores cambian mejoras" on public.mejoras;

-- El público y la armería solo se enteran de las mejoras ya lanzadas.
create policy "mejoras lanzadas son publicas" on public.mejoras
  for select to anon, authenticated
  using (estado = 'lanzada' or public.es_dev());
-- Solo los desarrolladores cambian el estado. Nadie crea ni borra desde la web.
create policy "desarrolladores cambian mejoras" on public.mejoras
  for update to authenticated
  using (public.es_dev()) with check (public.es_dev());

drop trigger if exists mejoras_updated_at on public.mejoras;
create trigger mejoras_updated_at before update on public.mejoras
  for each row execute function public.set_updated_at();

insert into public.mejoras (id, nombre, descripcion, estado) values
  ('video-producto', 'Video automático por producto',
   'Arma un video con acercamientos, luces y el nombre del modelo a partir de la foto principal. El admin marca los detalles a destacar; el video aparece en la ficha y se puede descargar para redes.',
   'interna')
on conflict (id) do nothing;

-- 3) Datos del video de cada producto: { foto: url de la foto usada, puntos: [{x, y}] }
--    (x, y entre 0 y 1, sobre la foto principal).
alter table public.productos add column if not exists video jsonb;
