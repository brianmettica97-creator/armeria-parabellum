// Compra online: le manda el pedido a la función de servidor `crear-pedido`.
// El navegador solo manda QUÉ productos y CUÁNTOS: el servidor recalcula precios y stock
// y rechaza los productos regulados (armas y municiones), aunque alguien toque el carrito.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

export const PEDIDOS_URL = `${SUPABASE_URL}/functions/v1/crear-pedido`;

/**
 * @returns {Promise<{ok: true, pedido: string, pagoUrl: string|null} | {ok: false, error: string, mensajes: string[]}>}
 */
export async function crearPedidoOnline(items, comprador, { fetchFn = fetch, timeoutMs = 20000 } = {}) {
  let respuesta;
  try {
    respuesta = await fetchFn(PEDIDOS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ items: items.map(item => ({ id: item.id, qty: item.qty })), comprador }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { ok: false, error: 'sin_conexion', mensajes: [] };
  }
  let datos = null;
  try { datos = await respuesta.json(); } catch { /* respuesta sin JSON */ }
  if (respuesta.ok && datos?.ok) {
    // Solo se acepta redirigir a una dirección https (nunca a javascript: ni a otros esquemas).
    const pagoUrl = typeof datos.pagoUrl === 'string' && /^https:\/\//i.test(datos.pagoUrl) ? datos.pagoUrl : null;
    return { ok: true, pedido: String(datos.pedido || ''), pagoUrl };
  }
  return { ok: false, error: datos?.error || `http_${respuesta.status}`, mensajes: (datos?.errores || []).map(e => e.detalle).filter(Boolean) };
}
