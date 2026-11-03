// Paso de Payway (formulario de pago) · SIN VERIFICAR contra la documentación oficial.
//
// Esto está armado a partir del README del SDK .NET de Payway (flujo `validate` + `form`).
// La documentación pública actual solo describe la Transacción Simple, así que las URL, el header
// de /validate y el formato del monto hay que CONFIRMARLOS con Payway antes de activarlo
// (ver supabase/functions/crear-pedido/LEEME.md). Mientras falten las variables de entorno,
// `iniciarPago` devuelve { ok: false, motivo: 'no_configurado' } y el sitio sigue funcionando
// por WhatsApp como hoy. Nunca se escribe ninguna clave en el código: todo sale de los secretos.

export interface PedidoPago {
  siteTransactionId: string;
  totalCentavos: number;
  email: string;
  moneda: string;
}

export type ResultadoPago =
  | { ok: true; hash: string; url: string }
  | { ok: false; motivo: 'no_configurado' | 'payway_rechazo' | 'payway_error'; detalle?: string };

const VARIABLES = [
  'PAYWAY_API_BASE',        // dirección base de la API (sandbox o producción), a confirmar con Payway
  'PAYWAY_FORM_BASE',       // dirección base del formulario renderizado, a confirmar con Payway
  'PAYWAY_VALIDATE_APIKEY', // clave del header de /validate (¿privada o "PCI"?), a confirmar con Payway
  'PAYWAY_PUBLIC_KEY',      // clave pública (va en la URL del formulario)
  'PAYWAY_SITE_ID',
  'PAYWAY_TEMPLATE_ID',
  'SITIO_URL',              // dirección pública del sitio, para las páginas de vuelta
] as const;

export async function iniciarPago(pedido: PedidoPago, env: (nombre: string) => string | undefined): Promise<ResultadoPago> {
  const v: Record<string, string> = {};
  for (const nombre of VARIABLES) {
    const valor = env(nombre);
    if (!valor) return { ok: false, motivo: 'no_configurado', detalle: `falta ${nombre}` };
    v[nombre] = valor.replace(/\/+$/, '');
  }

  const cuerpo = {
    site: {
      id: v.PAYWAY_SITE_ID,
      template: { id: Number(v.PAYWAY_TEMPLATE_ID) },
      transaction_id: pedido.siteTransactionId,
    },
    customer: { id: pedido.siteTransactionId, email: pedido.email },
    payment: {
      amount: pedido.totalCentavos,   // A CONFIRMAR: ¿centavos o pesos? Se define en la prueba de sandbox.
      currency: pedido.moneda,
      payment_type: 'single',
    },
    success_url: `${v.SITIO_URL}/pago.html?resultado=ok&pedido=${pedido.siteTransactionId}`,
    cancel_url: `${v.SITIO_URL}/pago.html?resultado=cancelado&pedido=${pedido.siteTransactionId}`,
  };

  let respuesta: Response;
  try {
    respuesta = await fetch(`${v.PAYWAY_API_BASE}/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: v.PAYWAY_VALIDATE_APIKEY },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    return { ok: false, motivo: 'payway_error', detalle: String(error) };
  }

  const texto = await respuesta.text();
  if (!respuesta.ok) return { ok: false, motivo: 'payway_rechazo', detalle: `HTTP ${respuesta.status}: ${texto.slice(0, 300)}` };

  let hash = '';
  try { hash = JSON.parse(texto).hash; } catch { /* queda vacío */ }
  if (!hash || typeof hash !== 'string') return { ok: false, motivo: 'payway_error', detalle: 'La respuesta no trae hash.' };

  return { ok: true, hash, url: `${v.PAYWAY_FORM_BASE}/web/forms/${encodeURIComponent(hash)}?apikey=${encodeURIComponent(v.PAYWAY_PUBLIC_KEY)}` };
}
