// Doble moneda (mejora "doble-moneda"): cada producto se carga con UN precio, en
// pesos o en dólares, y el sitio calcula el otro con la cotización del panel.
//
// Reglas (las mismas en el sitio, el panel y el servidor de cobro):
//   · dólares → pesos: se redondea a pesos enteros.
//   · pesos → dólares: se redondea a dólares enteros (es solo de referencia).
//   · sin cotización cargada no se inventa nada: un precio en dólares no tiene
//     equivalente en pesos y no se puede comprar online hasta que haya cotización.
// Lo que se cobra online es siempre en pesos.

export const MONEDAS = ['ARS', 'USD'];

/** "USD", "u$s", "dólares"… → 'USD'. Cualquier otra cosa (o vacío) → 'ARS'. */
export function normalizarMoneda(valor) {
  const texto = String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return /^(usd|us\$|u\$s|u\$d|dolar|dolares|dolar estadounidense)$/.test(texto) ? 'USD' : 'ARS';
}

const cotizacionValida = dolar => Number.isFinite(dolar) && dolar > 0;

/** Precio en pesos, o null si no se puede saber (sin precio, o en dólares sin cotización). */
export function enPesos(valor, moneda, dolar) {
  if (!Number.isFinite(valor)) return null;
  if (moneda !== 'USD') return valor;
  return cotizacionValida(dolar) ? Math.round(valor * dolar) : null;
}

/** Precio en dólares, o null si no se puede saber (sin precio, o en pesos sin cotización). */
export function enDolares(valor, moneda, dolar) {
  if (!Number.isFinite(valor)) return null;
  if (moneda === 'USD') return valor;
  return cotizacionValida(dolar) ? Math.round(valor / dolar) : null;
}

const formatoUsd = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const formatoArs = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 850 → "USD 850" · 849.5 → "USD 849,5" */
export const formatoDolares = valor => `USD ${formatoUsd.format(valor)}`;
/** 1020000 → "$ 1.020.000" */
export const formatoPesos = valor => formatoArs.format(valor);

/** "18/11" a partir de una fecha ISO. */
export function fechaCorta(iso) {
  const fecha = iso ? new Date(iso) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
}
