// Interfaz del pedido: diálogos de complementos y carrito, finalización por WhatsApp.
// Compartida por todos los sectores: el pedido es uno solo.
import { whatsappNumber, CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY } from './config.js';
import {
  formatMoney, isEligible, maxQuantity, quantityEditable, clampQuantity, buildLines, computeTotals,
  validateItems, availabilityLabel, buildWhatsAppMessage, whatsappUrl, loadItems, saveItems,
} from './cart.js';
import { escapeHtml, productImage, priceLabel } from './utils.js';

const DIALOGS = `
  <div class="overlay" id="productOverlay" role="dialog" aria-modal="true" aria-labelledby="dialogTitle">
    <div class="dialog product-dialog">
      <button class="close" data-close="productOverlay" aria-label="Cerrar">×</button>
      <button class="dialog-back" type="button" data-close="productOverlay"><span aria-hidden="true">←</span> Volver</button>
      <div class="dialog-art" id="dialogArt"></div>
      <div class="dialog-copy">
        <div class="eyebrow" id="dialogCategory"></div>
        <div class="dialog-badges" id="dialogBadges"></div>
        <h2 id="dialogTitle"></h2>
        <p class="product-lead" id="dialogLead"></p>
        <div class="dialog-facts" id="dialogFacts"></div>
        <p id="dialogDescription" class="dialog-description"></p>
        <button type="button" class="read-more" id="dialogReadMore" hidden>Leer más</button>
        <div class="dialog-links" id="dialogLinks"></div>
        <div class="dialog-price" id="dialogPrice"></div>
        <div class="availability" id="dialogAvailability"></div>
        <p class="modal-note" id="dialogNote"></p>
        <button class="primary" id="dialogAction" type="button">Agregar al pedido</button>
        <div class="dialog-secondary">
          <a class="dialog-whatsapp" id="dialogWhatsApp" target="_blank" rel="noopener noreferrer" hidden>Consultar por WhatsApp ↗</a>
          <button class="dialog-share" id="dialogShare" type="button">Compartir producto</button>
        </div>
        <p class="controlled-banner" id="dialogControlled" hidden></p>
      </div>
    </div>
  </div>
  <div class="overlay" id="complementOverlay" role="dialog" aria-modal="true" aria-labelledby="complementTitle">
    <div class="dialog complement-dialog">
      <button class="close" data-close="complementOverlay" aria-label="Cerrar">×</button>
      <div class="eyebrow" id="complementAdded">Agregado al pedido</div>
      <h2 id="complementTitle">¿Querés agregar algún complemento?</h2>
      <p class="complement-intro">Son opcionales: solo se suman los que marques. Precios y disponibilidad según el catálogo vigente.</p>
      <div class="complement-list" id="complementList"></div>
      <div class="complement-actions">
        <button class="secondary" id="skipComplements" type="button">Continuar sin complementos</button>
        <button class="primary" id="addComplements" type="button" disabled>Agregar seleccionados</button>
      </div>
    </div>
  </div>
  <div class="overlay" id="cartOverlay" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
    <div class="dialog cart-dialog">
      <button class="close" data-close="cartOverlay" aria-label="Cerrar">×</button>
      <div class="eyebrow">Tu selección</div>
      <h2 id="cartTitle">Tu pedido</h2>
      <div class="cart-changes" id="cartChanges" role="alert" hidden></div>
      <div class="cart-items" id="cartItems"></div>
      <div class="cart-summary" id="cartSummary"></div>
      <label class="cart-ack" id="regulatedAck" hidden>
        <input type="checkbox" id="regulatedAckInput">
        <span>Entiendo que los artículos regulados requieren acreditar la documentación y las autorizaciones legales vigentes, y que la armería las verificará antes de cualquier operación.</span>
      </label>
      <details class="cart-preview" id="cartPreview" hidden>
        <summary>Ver el mensaje que se va a preparar</summary>
        <pre id="cartMessage"></pre>
      </details>
      <button class="primary whatsapp-checkout" id="checkout" type="button" disabled>Finalizar pedido por WhatsApp</button>
      <p class="checkout-status" id="checkoutStatus" role="status" aria-live="polite"></p>
      <p class="modal-note">Al continuar se abre WhatsApp con el mensaje listo para revisar. El pedido no se envía ni queda confirmado hasta que lo envíes desde WhatsApp y la armería confirme stock, precio y condiciones.</p>
      <button class="cart-continue" type="button" data-close="cartOverlay">← Seguir viendo el catálogo</button>
    </div>
  </div>`;

export function initCart({ products, findProduct, onChange = () => {} }) {
  document.body.insertAdjacentHTML('beforeend', DIALOGS);
  const $ = selector => document.querySelector(selector);
  const storage = (() => { try { return window.localStorage; } catch { return null; } })();

  let cartItems = loadItems(storage, CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY);
  let pendingChanges = [];
  let checkoutNeedsReview = false;
  {
    const initial = validateItems(cartItems, findProduct);
    cartItems = initial.items;
    pendingChanges = initial.changes;
    saveItems(storage, CART_STORAGE_KEY, cartItems);
  }

  const checkoutButton = $('#checkout');
  const checkoutStatus = $('#checkoutStatus');
  const regulatedAck = $('#regulatedAck');
  const regulatedAckInput = $('#regulatedAckInput');

  const openOverlay = id => $(`#${id}`).classList.add('open');
  const closeOverlay = id => $(`#${id}`).classList.remove('open');
  const inCart = id => cartItems.some(item => item.id === id);

  function addItem(product, qty = 1) {
    if (!isEligible(product) || product.regulated || inCart(product.id)) return false; // controlados: solo WhatsApp
    cartItems.push({ id: product.id, name: product.name, qty: clampQuantity(product, qty), priceSeen: product.price, availabilitySeen: product.availability });
    return true;
  }

  // Agregado rápido desde la tarjeta (accesorios y productos no regulados).
  let toastTimer;
  function toast(message) {
    let node = document.querySelector('#cartToast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'cartToast';
      node.className = 'cart-toast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.append(node);
    }
    node.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" data-toast-open>Ver pedido</button>`;
    node.querySelector('[data-toast-open]').addEventListener('click', () => { node.classList.remove('show'); update(); openOverlay('cartOverlay'); });
    node.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => node.classList.remove('show'), 3600);
  }

  function quickAdd(product) {
    if (!product || !isEligible(product) || product.regulated) return false;
    const existing = cartItems.find(item => item.id === product.id);
    if (existing) {
      const next = clampQuantity(product, existing.qty + 1);
      if (next === existing.qty) { toast(`${product.name}: ya tenés la cantidad máxima disponible.`); return false; }
      existing.qty = next;
      update();
      toast(`${product.name}: cantidad ${next} en tu pedido.`);
      return true;
    }
    addItem(product);
    update();
    toast(`${product.name} se agregó a tu pedido.`);
    return true;
  }

  function addFromProductDialog(product) {
    if (product.regulated) return;
    const alreadyInCart = inCart(product.id);
    if (!alreadyInCart && !addItem(product)) return;
    closeOverlay('productOverlay');
    checkoutStatus.textContent = alreadyInCart ? `${product.name} ya estaba en tu pedido. Podés ajustar la cantidad acá.` : '';
    update();
    const options = alreadyInCart ? [] : product.complements
      .map(findProduct)
      .filter(item => item && item.published && item.id !== product.id && isEligible(item) && !inCart(item.id));
    if (options.length) showComplements(product, options);
    else openOverlay('cartOverlay');
  }

  function showComplements(product, options) {
    $('#complementAdded').textContent = `Agregado: ${product.name}`;
    const list = $('#complementList');
    list.innerHTML = options.map(item => `
      <label class="complement-card">
        <input type="checkbox" value="${escapeHtml(item.id)}">
        ${productImage(item)}
        <span class="complement-copy">
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml([item.brand, item.shortDescription].filter(Boolean).join(' · '))}</small>
          <span class="complement-meta"><b>${escapeHtml(priceLabel(item))}${item.demoPrice ? ' · ejemplo' : ''}</b><em class="is-${item.availability}">${escapeHtml(availabilityLabel(item))}</em></span>
        </span>
      </label>`).join('');
    const addButton = $('#addComplements');
    addButton.disabled = true;
    addButton.textContent = 'Agregar seleccionados';
    list.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
      const count = list.querySelectorAll('input:checked').length;
      addButton.disabled = count === 0;
      addButton.textContent = count ? `Agregar ${count} seleccionado${count === 1 ? '' : 's'}` : 'Agregar seleccionados';
    }));
    openOverlay('complementOverlay');
  }

  $('#addComplements').addEventListener('click', () => {
    document.querySelectorAll('#complementList input:checked').forEach(input => addItem(findProduct(input.value)));
    closeOverlay('complementOverlay');
    update();
    openOverlay('cartOverlay');
  });
  $('#skipComplements').addEventListener('click', () => {
    closeOverlay('complementOverlay');
    openOverlay('cartOverlay');
  });

  function renderChanges() {
    const box = $('#cartChanges');
    if (!pendingChanges.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = `<strong>Hubo cambios en tu pedido</strong><ul>${pendingChanges.map(change => `<li><b>${escapeHtml(change.name)}</b>: ${escapeHtml(change.detail)}</li>`).join('')}</ul><small>Revisá el detalle antes de continuar.</small>`;
  }

  function update() {
    saveItems(storage, CART_STORAGE_KEY, cartItems);
    const lines = buildLines(cartItems, findProduct);
    const totals = computeTotals(lines);
    document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = totals.units; });
    document.querySelectorAll('[data-open-cart]').forEach(node => node.setAttribute('aria-label', `Abrir pedido, ${totals.units} artículo${totals.units === 1 ? '' : 's'}`));
    renderChanges();

    const list = $('#cartItems');
    list.innerHTML = lines.length ? lines.map(line => {
      const p = line.product;
      const max = maxQuantity(p);
      return `
      <div class="cart-row" data-id="${escapeHtml(p.id)}">
        ${productImage(p, 'cart-thumb')}
        <div class="cart-info">
          <small>${escapeHtml([p.brand, p.code].filter(Boolean).join(' · '))}</small>
          <strong>${escapeHtml(p.name)}</strong>
          <span class="cart-unit">${line.unitPrice === null ? 'Consultar precio' : `${formatMoney(line.unitPrice)} c/u${p.demoPrice ? ' · ejemplo' : ''}`}</span>
          <span class="cart-availability is-${p.availability}">${escapeHtml(availabilityLabel(p))}</span>
          ${p.regulated ? '<span class="cart-regulated">Artículo regulado · consulta sujeta a verificación legal</span>' : ''}
        </div>
        <div class="cart-controls">
          ${quantityEditable(p) ? `
          <div class="qty" role="group" aria-label="Cantidad de ${escapeHtml(p.name)}">
            <button type="button" data-qty-step="-1" aria-label="Restar uno" ${line.qty <= 1 ? 'disabled' : ''}>−</button>
            <input type="number" inputmode="numeric" min="1" max="${max}" value="${line.qty}" data-qty-input aria-label="Cantidad">
            <button type="button" data-qty-step="1" aria-label="Sumar uno" ${line.qty >= max ? 'disabled' : ''}>+</button>
          </div>` : `<span class="qty-fixed">Cant. ${line.qty}</span>`}
          <span class="cart-subtotal">${line.subtotal === null ? 'Consultar precio' : formatMoney(line.subtotal)}</span>
          <button type="button" class="cart-remove" data-remove aria-label="Quitar ${escapeHtml(p.name)}">Quitar</button>
        </div>
      </div>`;
    }).join('') : '<div class="cart-empty">Tu pedido está vacío. Agregá productos desde el catálogo.</div>';

    list.querySelectorAll('.cart-row').forEach(row => {
      const id = row.dataset.id;
      const product = findProduct(id);
      const setQty = qty => {
        const item = cartItems.find(entry => entry.id === id);
        if (!item) return;
        item.qty = clampQuantity(product, qty);
        checkoutNeedsReview = false;
        checkoutStatus.textContent = '';
        update();
      };
      row.querySelector('[data-remove]').addEventListener('click', () => {
        cartItems = cartItems.filter(entry => entry.id !== id);
        pendingChanges = pendingChanges.filter(change => change.id !== id);
        checkoutStatus.textContent = '';
        update();
      });
      row.querySelectorAll('[data-qty-step]').forEach(button => button.addEventListener('click', () => {
        setQty(cartItems.find(entry => entry.id === id).qty + Number(button.dataset.qtyStep));
      }));
      row.querySelector('[data-qty-input]')?.addEventListener('change', event => setQty(event.target.value));
    });

    const summary = $('#cartSummary');
    if (!lines.length) summary.innerHTML = '';
    else if (totals.estimatedTotal === null) {
      summary.innerHTML = '<div class="total-row"><span>Total estimado</span><strong>A confirmar</strong></div><small>Ningún producto del pedido tiene precio publicado. La armería informará el precio al responder.</small>';
    } else if (totals.complete) {
      summary.innerHTML = `<div class="total-row"><span>Total estimado</span><strong>${formatMoney(totals.estimatedTotal)}</strong></div><small>Importe orientativo según precios publicados. Sujeto a confirmación de la armería.</small>`;
    } else {
      summary.innerHTML = `<div class="total-row"><span>Total estimado parcial</span><strong>${formatMoney(totals.estimatedTotal)}</strong></div><small>Incluye solo ${totals.pricedLines} producto${totals.pricedLines === 1 ? '' : 's'} con precio publicado. ${totals.unpricedLines} producto${totals.unpricedLines === 1 ? '' : 's'} con precio a consultar: el total definitivo lo confirma la armería.</small>`;
    }

    const hasRegulated = lines.some(line => line.product.regulated);
    regulatedAck.hidden = !hasRegulated;
    if (!hasRegulated) regulatedAckInput.checked = false;

    $('#cartPreview').hidden = !lines.length;
    $('#cartMessage').textContent = lines.length ? buildWhatsAppMessage(lines, totals) : '';

    const phoneReady = Boolean(whatsappNumber());
    checkoutButton.disabled = !lines.length || !phoneReady;
    checkoutButton.textContent = checkoutNeedsReview ? 'Revisé los cambios · Abrir WhatsApp' : 'Finalizar pedido por WhatsApp';
    if (!phoneReady) checkoutStatus.textContent = 'WhatsApp no disponible: falta configurar el número comercial del sitio.';
    else if (!lines.length && !pendingChanges.length) checkoutStatus.textContent = '';
    onChange();
  }

  // Fuente vigente del catálogo para validar el pedido antes de abrir WhatsApp.
  // Hoy es catalog.js (sitio estático). Al conectar el backend, reemplazar por
  // una consulta al servicio de productos: es el único punto a modificar.
  async function loadCurrentCatalog() {
    return products;
  }

  async function finalizeOrder() {
    if (!cartItems.length) return;
    const phone = whatsappNumber();
    if (!phone) { checkoutStatus.textContent = 'WhatsApp no disponible: falta configurar el número comercial del sitio.'; return; }

    let catalog;
    try { catalog = await loadCurrentCatalog(); }
    catch {
      checkoutStatus.textContent = 'No pudimos verificar el catálogo en este momento. Intentá de nuevo en unos segundos.';
      return;
    }
    const lookup = id => catalog.find(product => product.id === id);
    const result = validateItems(cartItems, lookup);
    if (result.changes.length) {
      cartItems = result.items;
      pendingChanges = result.changes;
      checkoutNeedsReview = cartItems.length > 0;
      checkoutStatus.textContent = cartItems.length
        ? 'Actualizamos tu pedido con los datos vigentes. Revisá los cambios y volvé a presionar el botón.'
        : 'Ninguno de los productos del pedido sigue disponible.';
      update();
      return;
    }

    const lines = buildLines(cartItems, lookup);
    if (lines.some(line => line.product.regulated) && !regulatedAckInput.checked) {
      checkoutStatus.textContent = 'Para continuar, confirmá que conocés los requisitos legales de los artículos regulados.';
      regulatedAckInput.focus();
      return;
    }

    const url = whatsappUrl(phone, buildWhatsAppMessage(lines, computeTotals(lines)));
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    pendingChanges = [];
    checkoutNeedsReview = false;
    update();
    checkoutStatus.innerHTML = `Abrimos WhatsApp con tu mensaje. <b>Revisalo y envialo desde WhatsApp</b>: el pedido no queda confirmado hasta que la armería responda.${opened ? '' : ` Si no se abrió, <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">tocá acá para abrir WhatsApp</a>.`}`;
  }

  regulatedAckInput.addEventListener('change', () => { if (regulatedAckInput.checked) checkoutStatus.textContent = ''; });
  document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', () => { update(); openOverlay('cartOverlay'); }));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeOverlay(button.dataset.close)));
  document.querySelectorAll('.overlay').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) overlay.classList.remove('open'); }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') document.querySelectorAll('.overlay.open').forEach(overlay => overlay.classList.remove('open')); });
  checkoutButton.addEventListener('click', finalizeOrder);

  update();
  return { addFromProductDialog, quickAdd, update, inCart, openOverlay, closeOverlay };
}

/** Enlace de consulta simple (ficha, gestoría, contacto). Devuelve '' si no hay número. */
export function inquiryUrl(text) {
  const phone = whatsappNumber();
  return phone ? whatsappUrl(phone, text) : '';
}
