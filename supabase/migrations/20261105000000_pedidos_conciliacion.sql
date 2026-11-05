-- ───────────────────────────────────────────────────────────────────────────
-- Pedidos · confirmación del pago. Pegar en Supabase → SQL Editor → Run (se puede repetir).
-- Requiere haber corrido antes 20261103000000_pedidos.sql.
-- ───────────────────────────────────────────────────────────────────────────

-- Referencia corta (16 caracteres) que viaja en la dirección de vuelta de Payway (límite del manual: 100).
alter table public.pedidos add column if not exists ref text generated always as (left(site_transaction_id, 16)) stored;
create unique index if not exists pedidos_ref_uniq on public.pedidos (ref);

-- Un pago de Payway puede cerrar UN solo pedido.
create unique index if not exists pedidos_payway_payment_uniq on public.pedidos (payway_payment_id) where payway_payment_id is not null;

-- Última vez que se le preguntó a Payway por este pedido (freno a consultas repetidas).
alter table public.pedidos add column if not exists verificado_at timestamptz;

-- Despacho: el local marca cuándo mandó el pedido.
alter table public.pedidos add column if not exists despachado_at timestamptz;
