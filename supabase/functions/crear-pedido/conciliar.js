// Empareja pagos aprobados de Payway con pedidos pendientes. Sin red ni base: se prueba aparte.
//
// El link de pago de Payway no deja mandar nuestro número de pedido, así que el pago se identifica por
// MONTO (en centavos) + HORA (el pago es posterior al pedido) + que ese pago no haya cerrado otro pedido.
// Si dos pedidos pendientes tienen el mismo monto, se asignan en orden: el pago más viejo al pedido más viejo.
// Un pago nunca cierra dos pedidos (además lo impide un índice único en la base).
const minuto = fecha => Math.floor(new Date(fecha).getTime() / 60000);

/**
 * @param {{id:string, created_at:string, total_centavos:number}[]} pedidos  pendientes, cualquier orden
 * @param {{id:number|string, status:string, amount:number, date:string}[]} pagos  del listado de Payway
 * @param {Set<string>} yaUsados  ids de pago que ya cerraron un pedido
 * @returns {{pedidoId:string, pagoId:string}[]}
 */
export function conciliar(pedidos, pagos, yaUsados = new Set()) {
  const libres = pagos
    .filter(p => p && String(p.status).toLowerCase() === 'approved' && Number.isInteger(p.amount) && !yaUsados.has(String(p.id)) && Number.isFinite(minuto(p.date)))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const resultado = [];
  for (const pedido of [...pedidos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))) {
    const indice = libres.findIndex(p => p.amount === pedido.total_centavos && minuto(p.date) >= minuto(pedido.created_at));
    if (indice < 0) continue;
    const [pago] = libres.splice(indice, 1);
    resultado.push({ pedidoId: pedido.id, pagoId: String(pago.id) });
  }
  return resultado;
}

export const VIDA_DEL_LINK_MS = 24 * 3600 * 1000;   // el link de Payway dura 24 h
