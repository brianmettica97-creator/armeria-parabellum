-- ───────────────────────────────────────────────────────────────────────────
-- Pedidos con pago online · Armería Parabellum
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- Requiere haber corrido antes 20261022000000_admin_y_fotos.sql (función es_admin).
--
-- Seguridad:
--   · El público NO puede leer, crear, editar ni borrar pedidos desde el navegador.
--   · Los pedidos los crea SOLO la función de servidor `crear-pedido`, que usa la
--     clave de servicio (esa clave se saltea las reglas de abajo y nunca sale del servidor).
--   · Solo los administradores ven y actualizan los pedidos (panel del local).
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.pedidos (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- identificador de la operación que se le manda a Payway (alfanumérico, máx. 40)
  site_transaction_id  text not null unique default replace(gen_random_uuid()::text, '-', ''),

  estado               text not null default 'pendiente'
                       check (estado in ('pendiente', 'pagado', 'rechazado', 'cancelado', 'vencido')),
  ambiente             text not null default 'prueba' check (ambiente in ('prueba', 'produccion')),

  -- datos de envío del comprador
  nombre               text not null check (char_length(nombre) between 2 and 120),
  telefono             text not null check (char_length(telefono) between 6 and 30),
  email                text not null check (char_length(email) between 5 and 160),
  direccion            text not null check (char_length(direccion) between 2 and 200),
  localidad            text not null check (char_length(localidad) between 2 and 100),
  cp                   text not null check (char_length(cp) between 1 and 12),
  provincia            text not null check (char_length(provincia) between 2 and 80),

  -- lo comprado, con el precio de ese momento (centavos, para no tener errores de decimales)
  items                jsonb not null,
  subtotal_centavos    integer not null check (subtotal_centavos > 0),
  envio_centavos       integer not null default 0 check (envio_centavos >= 0),
  total_centavos       integer not null check (total_centavos > 0),
  moneda               text not null default 'ARS',

  -- seguimiento del pago en Payway (nunca se guardan datos de tarjeta)
  payway_hash          text,
  payway_payment_id    text,
  payway_status        text,
  pagado_at            timestamptz,
  notas                text
);

create index if not exists pedidos_estado_idx on public.pedidos (estado, created_at desc);
create index if not exists pedidos_email_idx  on public.pedidos (email, created_at desc);

drop trigger if exists pedidos_updated_at on public.pedidos;
create trigger pedidos_updated_at before update on public.pedidos
  for each row execute function public.set_updated_at();

alter table public.pedidos enable row level security;

-- Sin ninguna política para el público (anon): no puede hacer nada con esta tabla.
drop policy if exists "admins leen pedidos" on public.pedidos;
create policy "admins leen pedidos" on public.pedidos
  for select to authenticated using (public.es_admin());

drop policy if exists "admins actualizan pedidos" on public.pedidos;
create policy "admins actualizan pedidos" on public.pedidos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
-- (No hay política de borrado ni de alta: los pedidos no se borran y los crea el servidor.)
