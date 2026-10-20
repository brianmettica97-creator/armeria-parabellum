import { formatMoney } from './cart.js';

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

export function productImage(product, className = '', alt = '') {
  const src = safeUrl(product.photo?.src || PLACEHOLDER_IMG);
  return `<img class="${className}" src="${src}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">`;
}

export function priceLabel(product) {
  return product.price === null ? 'Consultar precio' : formatMoney(product.price);
}

export function priceHtml(product) {
  if (product.price === null) return '<span class="price price-consult">Consultar precio</span>';
  const previous = product.offer?.previousPrice ? `<s class="price-previous">${formatMoney(product.offer.previousPrice)}</s>` : '';
  return `<span class="price">${previous}${formatMoney(product.price)}</span>`;
}

export function productBadges(product) {
  return [
    product.condition === 'usado' ? `<span class="badge badge-used">Usado${product.conditionGrade ? ` · ${product.conditionGrade}` : ''}</span>` : '',
    product.isNew ? '<span class="badge badge-new">Nuevo</span>' : '',
    product.offer ? '<span class="badge badge-offer">Oferta</span>' : '',
    product.demoPrice ? '<span class="badge badge-demo">Precio de ejemplo</span>' : '',
    product.demoUsed ? '<span class="badge badge-demo">Ejemplo</span>' : '',
  ].join('');
}
