-- ───────────────────────────────────────────────────────────────────────────
-- Descuento automático de stock al cobrar un pedido · Armería Parabellum
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- Requiere haber corrido antes 20261103000000_pedidos.sql.
--
-- Cuando un pedido pasa a "pagado" (solo una vez), cada producto con stock
-- numérico se descuenta por la cantidad comprada, sin bajar de 0. Si llega a 0
-- queda como "agotado" y deja de poder comprarse. Los productos con stock vacío
-- (sin controlar) no se tocan.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.pedidos_descontar_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linea jsonb;
begin
  if new.estado = 'pagado' and old.estado is distinct from 'pagado' then
    for linea in select * from jsonb_array_elements(new.items) loop
      update public.productos
         set stock = greatest(stock - coalesce((linea->>'qty')::int, 0), 0),
             availability = case
               when greatest(stock - coalesce((linea->>'qty')::int, 0), 0) = 0 then 'agotado'
               else availability
             end
       where id = linea->>'id'
         and stock is not null;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists pedidos_descontar_stock on public.pedidos;
create trigger pedidos_descontar_stock
  after update of estado on public.pedidos
  for each row execute function public.pedidos_descontar_stock();
