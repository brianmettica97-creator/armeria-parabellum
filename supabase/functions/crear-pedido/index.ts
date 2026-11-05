// Función de servidor `crear-pedido` · Armería Parabellum (Supabase Edge Function).
//
// Recibe { items: [{id, qty}], comprador: {...} } desde el carrito, VUELVE A CALCULAR todo con
// los datos de la base (precios, stock, productos regulados), guarda el pedido como "pendiente"
// y, si Payway está configurado, devuelve la dirección del formulario de pago.
//
// El navegador nunca decide un precio. Los productos regulados (armas y municiones) se rechazan acá
// aunque alguien manipule el carrito. La clave de servicio y las claves de Payway viven solo en los
// secretos de Supabase (ver LEEME.md), jamás en el código ni en GitHub.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validarCarrito, validarComprador } from './validar.js';
import { crearLinkDePago } from './payway.ts';

const ORIGENES = (Deno.env.get('ORIGENES_PERMITIDOS') ?? 'https://brianmettica97-creator.github.io')
  .split(',').map(s => s.trim()).filter(Boolean);
const MAX_BYTES = 20_000;
const MAX_PENDIENTES_POR_HORA = 5;   // freno básico contra pedidos basura repetidos con el mismo mail

function cabeceras(origen: string | null) {
  const permitido = origen && ORIGENES.includes(origen) ? origen : ORIGENES[0];
  return {
    'access-control-allow-origin': permitido,
    'access-control-allow-headers': 'authorization, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'origin',
    'content-type': 'application/json; charset=utf-8',
  };
}

Deno.serve(async (req: Request) => {
  const origen = req.headers.get('origin');
  const h = cabeceras(origen);
  const responder = (estado: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: estado, headers: h });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return responder(405, { ok: false, error: 'metodo_no_permitido' });
  if (!origen || !ORIGENES.includes(origen)) return responder(403, { ok: false, error: 'origen_no_permitido' });

  const texto = await req.text();
  if (texto.length > MAX_BYTES) return responder(413, { ok: false, error: 'pedido_muy_grande' });
  let entrada: { items?: unknown; comprador?: unknown };
  try { entrada = JSON.parse(texto); } catch { return responder(400, { ok: false, error: 'json_invalido' }); }

  const comprador = validarComprador(entrada.comprador);
  if (!comprador.ok) return responder(422, { ok: false, error: 'comprador_invalido', errores: comprador.errores });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const ids = Array.isArray(entrada.items)
    ? [...new Set(entrada.items.map((i: { id?: unknown }) => i?.id).filter((id): id is string => typeof id === 'string'))].slice(0, 60)
    : [];
  const { data: productos, error: errorProductos } = ids.length
    ? await supabase.from('productos').select('id,code,name,price,stock,published,regulated,availability').in('id', ids)
    : { data: [], error: null };
  if (errorProductos) return responder(500, { ok: false, error: 'catalogo_no_disponible' });

  const carrito = validarCarrito(entrada.items as never, productos ?? []);
  if (!carrito.ok) return responder(422, { ok: false, error: 'carrito_invalido', errores: carrito.errores });

  const hace1h = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase.from('pedidos').select('id', { count: 'exact', head: true })
    .eq('email', comprador.datos.email).eq('estado', 'pendiente').gte('created_at', hace1h);
  if ((count ?? 0) >= MAX_PENDIENTES_POR_HORA) return responder(429, { ok: false, error: 'demasiados_pedidos' });

  const envioCentavos = 0;   // El costo de envío se define con el cliente (se coordina por WhatsApp por ahora).
  const totalCentavos = carrito.totalCentavos + envioCentavos;
  const { data: pedido, error: errorPedido } = await supabase.from('pedidos').insert({
    ...comprador.datos,
    ambiente: Deno.env.get('PAYWAY_AMBIENTE') === 'produccion' ? 'produccion' : 'prueba',
    items: carrito.lineas,
    subtotal_centavos: carrito.totalCentavos,
    envio_centavos: envioCentavos,
    total_centavos: totalCentavos,
  }).select('id, ref').single();
  if (errorPedido || !pedido) return responder(500, { ok: false, error: 'no_se_pudo_guardar' });

  const pago = await crearLinkDePago(
    { ref: pedido.ref, totalCentavos, descripcion: `Pedido ${pedido.ref.slice(0, 8)}` },
    nombre => Deno.env.get(nombre),
  );

  if (pago.ok) {
    await supabase.from('pedidos').update({ payway_hash: pago.hash }).eq('id', pedido.id);
    return responder(200, { ok: true, pedido: pedido.ref, totalCentavos, pagoUrl: pago.url });
  }
  // Payway no está activado o falló: el pedido queda registrado y el sitio sigue por WhatsApp.
  if (pago.motivo !== 'no_configurado') console.error('Payway:', pago.motivo, pago.detalle);
  return responder(200, { ok: true, pedido: pedido.ref, totalCentavos, pagoUrl: null, motivo: pago.motivo });
});
