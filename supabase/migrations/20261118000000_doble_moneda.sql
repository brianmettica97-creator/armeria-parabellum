-- ───────────────────────────────────────────────────────────────────────────
-- Precios en pesos y en dólares (mejora "doble-moneda") · Armería Parabellum
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- Requiere haber corrido antes 20261111000000_mejoras.sql.
--
-- Cada producto se carga con UN precio y su moneda (ARS o USD). El sitio muestra
-- los dos valores usando la cotización del dólar que el local carga en el panel.
-- Lo que se cobra online es siempre en pesos.
-- ───────────────────────────────────────────────────────────────────────────

-- 1) Moneda de cada producto. Todos los existentes quedan en pesos, como hoy.
--    El precio anterior de una oferta está en la misma moneda que el precio.
alter table public.productos add column if not exists moneda text not null default 'ARS';
do $$
begin
  alter table public.productos add constraint productos_moneda_valida check (moneda in ('ARS', 'USD'));
exception when duplicate_object then null;
end $$;

-- 2) Cotización del dólar: una sola fila, la carga el local desde el panel.
create table if not exists public.cotizacion (
  id          integer primary key default 1 check (id = 1),
  dolar       numeric(12, 2) not null check (dolar > 0),
  updated_at  timestamptz not null default now()
);

drop trigger if exists cotizacion_updated_at on public.cotizacion;
create trigger cotizacion_updated_at before update on public.cotizacion
  for each row execute function public.set_updated_at();

alter table public.cotizacion enable row level security;

drop policy if exists "cotizacion publica" on public.cotizacion;
drop policy if exists "admins cargan cotizacion" on public.cotizacion;
drop policy if exists "admins cambian cotizacion" on public.cotizacion;

-- La cotización se muestra en el sitio: cualquiera la puede leer.
create policy "cotizacion publica" on public.cotizacion
  for select to anon, authenticated using (true);
-- Solo los administradores la cargan o la cambian.
create policy "admins cargan cotizacion" on public.cotizacion
  for insert to authenticated with check (public.es_admin());
create policy "admins cambian cotizacion" on public.cotizacion
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- 3) La mejora arranca en "solo nosotros": se prueba y se lanza desde la pestaña Novedades.
insert into public.mejoras (id, nombre, descripcion, estado) values
  ('doble-moneda', 'Precios en pesos y en dólares',
   'Cada producto se carga con un solo precio, en pesos o en dólares, y el sitio muestra los dos valores (por ejemplo USD 850 · $ 1.020.000) con la cotización del dólar que el local carga en el panel. El cobro online es siempre en pesos.',
   'interna')
on conflict (id) do nothing;
