-- ───────────────────────────────────────────────────────────────────────────
-- Tablero de resultados (mejora "tablero") · Armería Parabellum
-- Requiere haber corrido antes 20261111000000_mejoras.sql.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.mejoras (id, nombre, descripcion, estado) values
  ('tablero', 'Tablero de resultados',
   'Pestaña "Resultados" del panel: visitas, fichas vistas, consultas por WhatsApp, productos más consultados y uso de cada mejora (video, asistente, QR). Mientras no esté apagada, el sitio anota esos eventos sin datos personales.',
   'interna')
on conflict (id) do nothing;

-- true si la mejora está en "solo nosotros" o lanzada (se usa para decidir si se anotan eventos).
create or replace function public.mejora_encendida(mejora text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mejoras where id = mejora and estado <> 'apagada');
$$;

-- Eventos del sitio. NO guarda datos personales: ni nombre, ni teléfono, ni IP.
--   tipo     visita (abrió el catálogo) · ficha (abrió un producto) · whatsapp (tocó consultar)
--            · asistente (terminó el asistente) · video (reprodujo el video) · qr (llegó por una etiqueta)
--   sesion   código al azar de la visita, para contar visitas distintas (se pierde al cerrar la pestaña)
create table if not exists public.eventos (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tipo       text not null check (tipo in ('visita', 'ficha', 'whatsapp', 'asistente', 'video', 'qr')),
  sector     text check (sector in ('armeria', 'camping')),
  producto   text check (char_length(producto) <= 80),
  detalle    text check (char_length(detalle) <= 200),
  sesion     text check (char_length(sesion) <= 40)
);
create index if not exists eventos_fecha_idx on public.eventos (created_at);
alter table public.eventos enable row level security;

drop policy if exists "el sitio anota eventos" on public.eventos;
drop policy if exists "admins leen eventos" on public.eventos;
drop policy if exists "desarrolladores borran eventos" on public.eventos;

-- El sitio puede anotar eventos solo mientras la mejora no esté apagada.
create policy "el sitio anota eventos" on public.eventos
  for insert to anon, authenticated
  with check (public.mejora_encendida('tablero'));
create policy "admins leen eventos" on public.eventos
  for select to authenticated using (public.es_admin());
create policy "desarrolladores borran eventos" on public.eventos
  for delete to authenticated using (public.es_dev());

-- Resumen para la pestaña "Resultados": todo calculado en la base.
create or replace function public.tablero_resumen(dias integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  desde timestamptz := now() - make_interval(days => least(greatest(coalesce(dias, 30), 1), 365));
  resumen jsonb;
begin
  if not public.es_admin() then
    raise exception 'sin permiso';
  end if;
  select jsonb_build_object(
    'dias', least(greatest(coalesce(dias, 30), 1), 365),
    'totales', (
      select coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb)
      from (select tipo, count(*) as n from public.eventos where created_at >= desde group by tipo) t),
    'visitantes', (
      select count(distinct sesion) from public.eventos where created_at >= desde and tipo = 'visita'),
    'por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'visita', v, 'ficha', f, 'whatsapp', w) order by dia), '[]'::jsonb)
      from (
        select (created_at at time zone 'America/Argentina/Buenos_Aires')::date as dia,
               count(*) filter (where tipo = 'visita') as v,
               count(*) filter (where tipo = 'ficha') as f,
               count(*) filter (where tipo = 'whatsapp') as w
        from public.eventos where created_at >= desde group by 1) d),
    'top_consultados', (
      select coalesce(jsonb_agg(jsonb_build_object('id', producto, 'nombre', nombre, 'n', n) order by n desc, nombre), '[]'::jsonb)
      from (
        select e.producto, coalesce(p.name, e.producto) as nombre, count(*) as n
        from public.eventos e left join public.productos p on p.id = e.producto
        where e.created_at >= desde and e.tipo = 'whatsapp' and e.producto is not null
        group by e.producto, p.name order by n desc limit 10) c),
    'top_vistos', (
      select coalesce(jsonb_agg(jsonb_build_object('id', producto, 'nombre', nombre, 'n', n) order by n desc, nombre), '[]'::jsonb)
      from (
        select e.producto, coalesce(p.name, e.producto) as nombre, count(*) as n
        from public.eventos e left join public.productos p on p.id = e.producto
        where e.created_at >= desde and e.tipo = 'ficha' and e.producto is not null
        group by e.producto, p.name order by n desc limit 10) v)
  ) into resumen;
  return resumen;
end $$;
