// Lógica del pedido (sin DOM): cantidades, importes, validación y mensaje.
// Se mantiene separada de la interfaz para poder probarla y, más adelante,
// validar contra el backend sin tocar la presentación.
import { CURRENCY, LOCALE, DEFAULT_MAX_QUANTITY, STORE_NAME } from './config.js';

const wholeFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, minimumFractionDigits: 0, maximumFractionDigits: 0 });
const centsFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value) {
  const formatter = Number.isInteger(Math.round(value * 100) / 100) ? wholeFormatter : centsFormatter;
  return formatter.format(value).replace(/ /g, ' ');
}

const toCents = value => Math.round(value * 100);
const fromCents = cents => cents / 100;

export function isEligible(product) {
  return Boolean(product && product.published !== false && product.availability !== 'agotado');
}

export function maxQuantity(product) {
  if (!product) return 0;
  if (product.regulated) return 1;
  if (Number.isInteger(product.stock)) return Math.max(0, Math.min(product.stock, DEFAULT_MAX_QUANTITY));
  return DEFAULT_MAX_QUANTITY;
}

export function quantityEditable(product) {
  return maxQuantity(product) > 1;
}

export function clampQuantity(product, qty) {
  const max = maxQuantity(product);
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n) || n < 1) return Math.min(1, max);
  return Math.min(n, max);
}

/** Convierte los ítems guardados en líneas con importes actuales del catálogo. */
export function buildLines(items, findProduct) {
  return items.map(item => {
    const product = findProduct(item.id);
    if (!product) return null;
    const unitPrice = product.price ?? null;
    const subtotal = unitPrice === null ? null : fromCents(toCents(unitPrice) * item.qty);
    return { id: item.id, qty: item.qty, product, unitPrice, subtotal };
  }).filter(Boolean);
}

export function computeTotals(lines) {
  let cents = 0;
  let pricedLines = 0;
  let unpricedLines = 0;
  let units = 0;
  for (const line of lines) {
    units += line.qty;
    if (line.unitPrice === null) unpricedLines += 1;
    else { pricedLines += 1; cents += toCents(line.unitPrice) * line.qty; }
  }
  return {
    estimatedTotal: pricedLines ? fromCents(cents) : null,
    pricedLines,
    unpricedLines,
    units,
    complete: lines.length > 0 && unpricedLines === 0,
  };
}

/**
 * Compara el pedido guardado con el catálogo vigente.
 * Devuelve los ítems corregidos y la lista de cambios a mostrar al usuario.
 */
export function validateItems(items, findProduct) {
  const next = [];
  const changes = [];
  for (const item of items) {
    const product = findProduct(item.id);
    const label = product?.name || item.name || item.id;
    if (!product || product.published === false) {
      changes.push({ type: 'removed', id: item.id, name: label, detail: 'ya no está publicado en el catálogo y se quitó del pedido.' });
      continue;
    }
    if (product.availability === 'agotado') {
      changes.push({ type: 'removed', id: item.id, name: label, detail: 'figura sin stock y se quitó del pedido.' });
      continue;
    }
    const qty = clampQuantity(product, item.qty);
    if (qty !== item.qty) {
      changes.push({ type: 'quantity', id: item.id, name: label, detail: `la cantidad se ajustó de ${item.qty} a ${qty} según el máximo disponible.` });
    }
    const currentPrice = product.price ?? null;
    const seenPrice = item.priceSeen ?? null;
    if (currentPrice !== seenPrice) {
      const before = seenPrice === null ? 'Consultar precio' : formatMoney(seenPrice);
      const after = currentPrice === null ? 'Consultar precio' : formatMoney(currentPrice);
      changes.push({ type: 'price', id: item.id, name: label, detail: `el precio cambió: ${before} → ${after}.` });
    }
    if (item.availabilitySeen && item.availabilitySeen !== product.availability) {
      const names = { disponible: 'disponible', consultar: 'a consultar' };
      changes.push({ type: 'availability', id: item.id, name: label, detail: `la disponibilidad cambió a «${names[product.availability] || product.availability}».` });
    }
    next.push({ id: item.id, name: product.name, qty, priceSeen: currentPrice, availabilitySeen: product.availability });
  }
  return { items: next, changes };
}

const availabilityText = { disponible: 'Disponible', consultar: 'Disponibilidad a confirmar', agotado: 'Sin stock' };
export function availabilityLabel(product) {
  return availabilityText[product?.availability] || 'Disponibilidad a confirmar';
}

/** Arma el texto del mensaje de WhatsApp. No incluye datos personales. */
export function buildWhatsAppMessage(lines, totals) {
  const rows = lines.map((line, index) => {
    const p = line.product;
    const detail = [
      `${index + 1}. ${p.name}`,
      ...([p.brand, p.model && p.model !== p.name ? p.model : '', p.code ? `Cód. ${p.code}` : ''].some(Boolean) ? [`   ${[p.brand ? `Marca/modelo: ${p.brand}` : '', p.model && p.model !== p.name ? p.model : '', p.code ? `Cód. ${p.code}` : ''].filter(Boolean).join(' · ')}`] : []),
      p.condition === 'usado' ? `   Estado: Usado${p.conditionGrade ? ` · ${p.conditionGrade}` : ''}` : null,
      `   Cantidad: ${line.qty}`,
      `   Precio unitario: ${line.unitPrice === null ? 'Consultar precio' : formatMoney(line.unitPrice)}${p.demoPrice ? ' (precio de ejemplo)' : ''}`,
      `   Subtotal: ${line.subtotal === null ? 'Consultar precio' : formatMoney(line.subtotal)}`,
    ];
    detail.splice(0, detail.length, ...detail.filter(Boolean));
    if (p.regulated) detail.push('   Artículo regulado: sujeto a verificación de documentación y autorizaciones legales.');
    return detail.join('\n');
  });

  let totalLine;
  if (totals.estimatedTotal === null) totalLine = 'Total estimado: a confirmar (los productos no tienen precio publicado).';
  else if (totals.complete) totalLine = `Total estimado: ${formatMoney(totals.estimatedTotal)}`;
  else totalLine = `Total estimado parcial: ${formatMoney(totals.estimatedTotal)} (solo productos con precio publicado; ${totals.unpricedLines} con precio a consultar).`;

  const hasRegulated = lines.some(line => line.product.regulated);
  return [
    `Hola, ${STORE_NAME}. Quiero hacer una consulta por este pedido:`,
    '',
    ...rows.flatMap(row => [row, '']),
    totalLine,
    '',
    '¿Me confirman stock, disponibilidad y precio final de cada artículo?',
    hasRegulated ? 'Entiendo que los artículos regulados requieren acreditar la documentación y autorizaciones vigentes antes de cualquier operación.' : null,
    'Entiendo que este mensaje es una consulta y que el pedido queda sujeto a su confirmación.',
  ].filter(line => line !== null).join('\n');
}

export function whatsappUrl(phone, message) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** Lectura y escritura del pedido en almacenamiento local, tolerante a fallos. */
export function loadItems(storage, key, legacyKey) {
  try {
    const raw = storage?.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(item => item && typeof item.id === 'string')
          .map(item => ({ id: item.id, name: item.name, qty: Math.max(1, Math.floor(Number(item.qty)) || 1), priceSeen: Number.isFinite(item.priceSeen) ? item.priceSeen : null, availabilitySeen: item.availabilitySeen }));
      }
    }
    // Migración de la lista de consultas anterior (solo ids).
    const legacy = legacyKey ? JSON.parse(storage?.getItem(legacyKey) || '[]') : [];
    if (Array.isArray(legacy) && legacy.length) {
      return [...new Set(legacy.filter(id => typeof id === 'string'))].map(id => ({ id, qty: 1, priceSeen: undefined }));
    }
  } catch { /* almacenamiento no disponible o dañado */ }
  return [];
}

export function saveItems(storage, key, items) {
  try { storage?.setItem(key, JSON.stringify(items)); } catch { /* almacenamiento opcional */ }
}
