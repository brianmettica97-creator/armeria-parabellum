// Paso de Payway · Checkout (link de pago), según el "Manual de Integración Checkout v6".
//
// Verificado en sandbox el 2026-11-05: POST /api/v1/checkout-payment-button/link con el header `apikey`
// (clave PRIVADA) devuelve 201 y { payment_link }. El cliente paga en el formulario de Payway (template 1,
// sin Cybersource) y vuelve a `success_url`. Ninguna clave está en el código: todo sale de los secretos.
//
// Lo que NO está verificado todavía (ver LEEME.md): el pago con tarjeta de prueba de punta a punta y el
// formato exacto del listado de pagos con un pago real (se probó solo vacío).

export interface PedidoPago {
  ref: string;              // referencia corta del pedido (16 caracteres), va en las direcciones de vuelta
  totalCentavos: number;
  descripcion: string;
}

export type ResultadoPago =
  | { ok: true; hash: string; url: string }
  | { ok: false; motivo: 'no_configurado' | 'payway_rechazo' | 'payway_error'; detalle?: string };

export interface PagoPayway { id: number | string; status: string; amount: number; date: string; site_transaction_id?: string }

const BASES = {
  prueba: 'https://developers-ventasonline.payway.com.ar',
  produccion: 'https://ventasonline.payway.com.ar',
} as const;
const VARIABLES = ['PAYWAY_PRIVATE_KEY', 'PAYWAY_PUBLIC_KEY', 'PAYWAY_SITE_ID', 'SITIO_URL'] as const;
const MAX_URL = 100;   // el manual limita success_url y cancel_url a 100 caracteres

export const baseApi = (env: (n: string) => string | undefined) =>
  BASES[env('PAYWAY_AMBIENTE') === 'produccion' ? 'produccion' : 'prueba'];

function variables(env: (n: string) => string | undefined): Record<string, string> | { falta: string } {
  const v: Record<string, string> = {};
  for (const nombre of VARIABLES) {
    const valor = env(nombre)?.trim();
    if (!valor) return { falta: nombre };
    v[nombre] = valor.replace(/\/+$/, '');
  }
  return v;
}

export async function crearLinkDePago(pedido: PedidoPago, env: (n: string) => string | undefined): Promise<ResultadoPago> {
  const v = variables(env);
  if ('falta' in v) return { ok: false, motivo: 'no_configurado', detalle: `falta ${v.falta}` };

  const exito = `${v.SITIO_URL}/pago.html?r=ok&p=${pedido.ref}`;
  const cancelado = `${v.SITIO_URL}/pago.html?r=no&p=${pedido.ref}`;
  if (exito.length > MAX_URL || cancelado.length > MAX_URL) {
    return { ok: false, motivo: 'payway_error', detalle: `las direcciones de vuelta superan ${MAX_URL} caracteres (SITIO_URL muy largo)` };
  }

  const cuerpo = {
    origin_platform: 'Armeria Parabellum',
    payment_description: pedido.descripcion.slice(0, 40),
    currency: 'ARS',
    total_price: '__TOTAL__',                                // se reemplaza abajo por el número con 2 decimales exactos
    site: v.PAYWAY_SITE_ID,
    success_url: exito,
    cancel_url: cancelado,
    template_id: 1,                                          // 1 = formulario simple, sin Cybersource
    installments: [1],                                       // una sola cuota por link (límite del manual)
    auth_3ds: false,
    public_apikey: v.PAYWAY_PUBLIC_KEY,
  };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${baseApi(env)}/api/v1/checkout-payment-button/link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: v.PAYWAY_PRIVATE_KEY },
      body: JSON.stringify(cuerpo).replace('"__TOTAL__"', (Math.round(pedido.totalCentavos) / 100).toFixed(2)),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    return { ok: false, motivo: 'payway_error', detalle: String(error) };
  }
  const texto = await respuesta.text();
  if (!respuesta.ok) return { ok: false, motivo: 'payway_rechazo', detalle: `HTTP ${respuesta.status}: ${texto.slice(0, 300)}` };

  let url = '';
  try { url = JSON.parse(texto).payment_link; } catch { /* queda vacío */ }
  // Solo se acepta una dirección https (nunca otro esquema) antes de mandar al cliente ahí.
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) return { ok: false, motivo: 'payway_error', detalle: 'La respuesta no trae payment_link.' };
  return { ok: true, hash: url.split('/').pop() ?? '', url };
}

/** Pagos del comercio (GET /api/v2/payments). Devuelve null si Payway no responde bien. */
export async function listarPagos(env: (n: string) => string | undefined): Promise<PagoPayway[] | null> {
  const v = variables(env);
  if ('falta' in v) return null;
  const todos: PagoPayway[] = [];
  for (let offset = 0, pagina = 0; pagina < 10; pagina++) {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${baseApi(env)}/api/v2/payments?siteId=${encodeURIComponent(v.PAYWAY_SITE_ID)}&offset=${offset}`, {
        headers: { 'content-type': 'application/json', apikey: v.PAYWAY_PRIVATE_KEY },
        signal: AbortSignal.timeout(15000),
      });
    } catch { return null; }
    if (!respuesta.ok) return null;
    let datos: { results?: PagoPayway[]; hasMore?: boolean; limit?: number };
    try { datos = await respuesta.json(); } catch { return null; }
    const filas = Array.isArray(datos.results) ? datos.results : [];
    todos.push(...filas);
    if (!datos.hasMore || !filas.length) break;
    offset += filas.length;
  }
  return todos;
}
