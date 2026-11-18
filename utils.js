import { formatMoney } from './cart.js';
import { formatoDolares } from './moneda.js';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function safeUrl(value) {
  if (typeof value === 'string' && /^assets\/[a-z0-9._/-]+\.(?:svg|png|jpe?g|webp|avif)$/i.test(value) && !value.split('/').some(part => part === '..')) {
    return value;
  }
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

export const PLACEHOLDER_IMG = 'assets/placeholder-producto.svg';

// Tarjetas y miniaturas usan la versión chica de la foto cuando existe.
export function productImage(product, className = '', alt = '') {
  const src = safeUrl(product.photo?.thumb || product.photo?.src || PLACEHOLDER_IMG);
  return `<img class="${className}" src="${src}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">`;
}

// Precio en pesos y en dólares (mejora "doble-moneda"): primero la moneda en la que
// cargó el local y después el equivalente, si hay cotización. Sin dólares, como siempre.
function priceParts(product) {
  const ars = product.price ?? null;
  const usd = product.priceUsd ?? null;
  const usdFirst = product.currency === 'USD';
  const main = usdFirst ? (usd !== null ? formatoDolares(usd) : null) : (ars !== null ? formatMoney(ars) : null);
  const alt = usdFirst ? (ars !== null ? formatMoney(ars) : null) : (usd !== null ? formatoDolares(usd) : null);
  const prevValue = usdFirst ? product.offer?.previousPriceUsd : product.offer?.previousPrice;
  const previous = prevValue ? (usdFirst ? formatoDolares(prevValue) : formatMoney(prevValue)) : null;
  return { main: main ?? alt, alt: main ? alt : null, previous: main ? previous : null };
}

export function priceLabel(product) {
  const { main, alt } = priceParts(product);
  return main ? [main, alt].filter(Boolean).join(' · ') : 'Consultar precio';
}

export function priceHtml(product) {
  const { main, alt, previous } = priceParts(product);
  if (!main) return '<span class="price price-consult">Consultar precio</span>';
  return `<span class="price">${previous ? `<s class="price-previous">${previous}</s>` : ''}${main}${alt ? `<span class="price-alt">${alt}</span>` : ''}</span>`;
}

export function productBadges(product) {
  // Agotado (nuevo, puede reingresar) o Vendido (usado, pieza única): la foto se mantiene y se marca.
  if (product.availability === 'agotado') {
    return [
      product.condition === 'usado' ? `<span class="badge badge-used">Usado${product.conditionGrade ? ` · ${product.conditionGrade}` : ''}</span>` : '',
      `<span class="badge badge-soldout">${product.condition === 'usado' ? 'Vendido' : 'Agotado'}</span>`,
    ].join('');
  }
  return [
    product.condition === 'usado' ? `<span class="badge badge-used">Usado${product.conditionGrade ? ` · ${product.conditionGrade}` : ''}</span>` : '',
    product.isNew ? `<span class="badge badge-new">${product.condition === 'usado' ? 'Recién ingresado' : 'Nuevo'}</span>` : '',
    product.offer ? '<span class="badge badge-offer">Oferta</span>' : '',
    product.demoPrice ? '<span class="badge badge-demo">Precio de ejemplo</span>' : '',
    product.demoUsed ? '<span class="badge badge-demo">Ejemplo</span>' : '',
  ].join('');
}
