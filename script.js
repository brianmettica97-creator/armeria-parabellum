// Página de sector (Armería o Camping). El sector se toma de <body data-sector>.
import { products, productsForSector, novedades, ofertas, usados } from './catalog.js';
import { sectors, findCategory, findSubcategory, brands, gestoriaServices } from './taxonomy.js';
import { DEMO_MODE, NOVEDADES_LIMIT } from './config.js';
import { initSite } from './site.js';
import { demoGestoria } from './demo-data.js';
import { isEligible, availabilityLabel } from './cart.js';
import { initCart, inquiryUrl } from './cart-ui.js';
import { escapeHtml, safeUrl, productImage, priceHtml, productBadges, PLACEHOLDER_IMG } from './utils.js';

const sectorId = document.body.dataset.sector in sectors ? document.body.dataset.sector : 'armeria';
const sector = sectors[sectorId];
const sectorProducts = productsForSector(sectorId);
const findProduct = id => products.find(product => product.id === id);
const $ = selector => document.querySelector(selector);

const cart = initCart({ products, findProduct });

initSite({ ageCheck: sectorId === 'armeria' });

// ───────────────────────────── Estado del catálogo ─────────────────────────────
const state = { category: '', subcategory: '', brand: '', query: '', sort: 'featured', condition: '' };

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const category = findCategory(sectorId, params.get('cat')) ? params.get('cat') : '';
  state.category = category;
  state.subcategory = category && findSubcategory(sectorId, category, params.get('sub')) ? params.get('sub') : '';
  state.brand = params.get('marca') || '';
  state.condition = ['nuevo', 'usado'].includes(params.get('estado')) ? params.get('estado') : '';
}

function writeUrlState() {
  const params = new URLSearchParams();
  const openProduct = new URLSearchParams(window.location.search).get('producto');
  if (openProduct) params.set('producto', openProduct);
  if (state.category) params.set('cat', state.category);
  if (state.subcategory) params.set('sub', state.subcategory);
  if (state.brand) params.set('marca', state.brand);
  if (state.condition) params.set('estado', state.condition);
  const query = params.toString();
  history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}

function categoryHref(category = '', subcategory = '') {
  const params = new URLSearchParams();
  if (category) params.set('cat', category);
  if (subcategory) params.set('sub', subcategory);
  return `?${params.toString()}#catalogo`;
}

const countIn = (category, subcategory) => sectorProducts.filter(product => product.category === category && (!subcategory || product.subcategory === subcategory)).length;

function applyFilter({ category = '', subcategory = '', brand, scroll = true } = {}) {
  state.category = category;
  state.subcategory = subcategory;
  if (brand !== undefined) state.brand = brand;
  writeUrlState();
  renderSidebar();
  renderProducts();
  if (scroll) $('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ───────────────────────────── Menú principal ─────────────────────────────
function renderNav() {
  const nav = $('#mainNav');
  if (!nav) return;
  const extraLinks = [...nav.querySelectorAll('[data-nav-extra]')].map(link => link.outerHTML);
  const hasSubcategories = sector.categories.some(category => category.subcategories.length);
  const menu = (label, href, attrs, items) => `
    <li class="nav-item has-menu">
      <a class="nav-link" href="${href}" ${attrs}>${escapeHtml(label)}</a>
      <button class="nav-caret" type="button" aria-expanded="false" aria-label="Ver opciones de ${escapeHtml(label)}">▾</button>
      <div class="nav-menu">${items}</div>
    </li>`;
  const groups = hasSubcategories
    ? sector.categories.map(category => menu(category.label, categoryHref(category.id), `data-cat="${category.id}"`,
      `<a href="${categoryHref(category.id)}" data-cat="${category.id}" class="nav-menu-all">Ver todo ${escapeHtml(category.label)} <span>${countIn(category.id)}</span></a>` +
      category.subcategories.map(sub => `<a href="${categoryHref(category.id, sub.id)}" data-cat="${category.id}" data-sub="${sub.id}">${escapeHtml(sub.label)} <span>${countIn(category.id, sub.id)}</span></a>`).join('')))
    : [menu('Categorías', categoryHref(), 'data-cat=""',
      `<a href="${categoryHref()}" data-cat="" class="nav-menu-all">Ver todo <span>${sectorProducts.length}</span></a>` +
      sector.categories.map(category => `<a href="${categoryHref(category.id)}" data-cat="${category.id}">${escapeHtml(category.label)} <span>${countIn(category.id)}</span></a>`).join(''))];
  nav.innerHTML = `<ul class="nav-list">${groups.join('')}${extraLinks.map(link => `<li class="nav-item">${link}</li>`).join('')}</ul>`;

  nav.querySelectorAll('[data-cat]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    applyFilter({ category: link.dataset.cat, subcategory: link.dataset.sub || '', brand: '' });
    closeMobileNav();
  }));
  nav.querySelectorAll('.nav-caret').forEach(button => button.addEventListener('click', () => {
    const item = button.closest('.nav-item');
    const open = !item.classList.contains('open');
    nav.querySelectorAll('.nav-item.open').forEach(other => { other.classList.remove('open'); other.querySelector('.nav-caret')?.setAttribute('aria-expanded', 'false'); });
    item.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  }));
  nav.querySelectorAll('a:not([data-cat])').forEach(link => link.addEventListener('click', closeMobileNav));
}

const navToggle = $('#navToggle');
function closeMobileNav() {
  navToggle?.setAttribute('aria-expanded', 'false');
  $('#mainNav')?.classList.remove('nav-open');
  document.querySelectorAll('#mainNav .nav-item.open').forEach(item => item.classList.remove('open'));
}
navToggle?.addEventListener('click', () => {
  const open = navToggle.getAttribute('aria-expanded') !== 'true';
  navToggle.setAttribute('aria-expanded', String(open));
  $('#mainNav')?.classList.toggle('nav-open', open);
});

// ───────────────────────────── Catálogo ─────────────────────────────
function renderSidebar() {
  const box = $('#filters');
  if (!box) return;
  const button = (attrs, label, count, active, icon = '') =>
    `<button type="button" class="filter${active ? ' active' : ''}" ${attrs}>${icon ? `<i aria-hidden="true">${icon}</i>` : ''}<span>${escapeHtml(label)}</span><b>${count}</b></button>`;
  box.innerHTML = button('data-cat=""', `Todo ${sector.id === 'camping' ? 'Camping' : 'Armería'}`, sectorProducts.length, !state.category, '⌂') +
    sector.categories.map(category => {
      const active = state.category === category.id;
      const subs = active && category.subcategories.length
        ? `<div class="subfilters">${category.subcategories.map(sub => `<button type="button" class="subfilter${state.subcategory === sub.id ? ' active' : ''}" data-cat="${category.id}" data-sub="${sub.id}">${escapeHtml(sub.label)} <b>${countIn(category.id, sub.id)}</b></button>`).join('')}</div>`
        : '';
      return button(`data-cat="${category.id}"`, category.label, countIn(category.id), active && !state.subcategory, category.icon) + subs;
    }).join('');
  box.querySelectorAll('[data-cat]').forEach(node => node.addEventListener('click', () => {
    const toggleOff = !node.dataset.sub && state.category === node.dataset.cat && !state.subcategory && node.dataset.cat;
    applyFilter({ category: toggleOff ? '' : node.dataset.cat, subcategory: node.dataset.sub || '', scroll: false });
  }));
}

function filterLabel() {
  const category = findCategory(sectorId, state.category);
  const sub = findSubcategory(sectorId, state.category, state.subcategory);
  return [category?.label, sub?.label].filter(Boolean).join(' · ') || sector.name;
}

function cardHtml(product) {
  return `
    <article class="card${product.availability === 'agotado' ? ' is-soldout' : ''}">
      <button class="thumb" type="button" data-product="${product.id}" aria-label="Ver ficha de ${escapeHtml(product.name)}">
        <span class="tag">${escapeHtml(product.subcategoryLabel || product.categoryLabel)} · ${escapeHtml(product.code)}</span>
        <span class="card-badges">${productBadges(product)}</span>
        ${productImage(product, 'product-visual', product.name)}
      </button>
      <div class="card-info">
        <small class="maker">${escapeHtml(product.brand)}</small>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.shortDescription || product.description)}</p>
        <small class="card-availability is-${product.availability}">${availabilityLabel(product)}</small>
        <div class="card-bottom">${priceHtml(product)}<button class="view" type="button" data-product="${product.id}">Ver ficha</button></div>
      </div>
    </article>`;
}

function renderProducts() {
  const grid = $('#productGrid');
  if (!grid) return;
  const inScope = sectorProducts.filter(product => (!state.category || product.category === state.category) && (!state.subcategory || product.subcategory === state.subcategory));
  const brandOptions = [...new Set(inScope.map(product => product.brand))].sort((a, b) => a.localeCompare(b, 'es'));
  if (state.brand && !brandOptions.some(brand => brand.toLowerCase() === state.brand.toLowerCase())) brandOptions.push(state.brand);
  const brandFilter = $('#brandFilter');
  brandFilter.innerHTML = '<option value="">Todas las marcas</option>' + brandOptions.map(brand => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`).join('');
  brandFilter.value = brandOptions.find(brand => brand.toLowerCase() === state.brand.toLowerCase()) || '';

  const query = state.query.trim().toLocaleLowerCase('es');
  const visible = inScope.filter(product => {
    const inBrand = (!state.brand || product.brand.toLowerCase() === state.brand.toLowerCase()) && (!state.condition || product.condition === state.condition);
    const text = `${product.name} ${product.brand} ${product.code} ${product.categoryLabel} ${product.subcategoryLabel} ${product.shortDescription || ''}`.toLocaleLowerCase('es');
    return inBrand && (!query || text.includes(query));
  });
  const sorters = {
    featured: (a, b) => a.order - b.order,
    newest: (a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '') || a.order - b.order,
    az: (a, b) => a.name.localeCompare(b.name, 'es'),
    brand: (a, b) => a.brand.localeCompare(b.brand, 'es') || a.name.localeCompare(b.name, 'es'),
  };
  visible.sort(sorters[state.sort] || sorters.featured);

  $('#catalogHeading').textContent = filterLabel();
  $('#resultsCaption').textContent = `${visible.length} producto${visible.length === 1 ? '' : 's'}${state.brand ? ` · marca ${state.brand}` : ''}${state.condition ? ` · ${state.condition === 'usado' ? 'solo usados' : 'solo nuevos'}` : ''} · precio y disponibilidad a confirmar con la armería`;
  grid.setAttribute('aria-label', `${visible.length} productos encontrados`);
  if (!visible.length) {
    const filtered = query || state.brand || state.condition;
    const link = inquiryUrl(`Hola, ${sector.name}. Quiero consultar por ${filterLabel()}.`);
    grid.innerHTML = `<div class="no-results">${filtered
      ? '<p>No encontramos productos con esos filtros. Probá otra búsqueda o quitá la marca.</p>'
      : `<p>Todavía no hay productos publicados en <strong>${escapeHtml(filterLabel())}</strong>.</p><p>Consultá disponibilidad directamente con la armería.</p>${link ? `<a class="secondary" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp ↗</a>` : ''}`}</div>`;
    return;
  }
  grid.innerHTML = visible.map(cardHtml).join('');
}

function bindProductOpeners(root) {
  root?.addEventListener('click', event => {
    const trigger = event.target.closest('[data-product]');
    if (trigger && root.contains(trigger)) showProduct(findProduct(trigger.dataset.product));
  });
}

$('#productSearch')?.addEventListener('input', event => { state.query = event.target.value; renderProducts(); });
$('#brandFilter')?.addEventListener('change', event => { state.brand = event.target.value; writeUrlState(); renderProducts(); });
{
  const conditionFilter = $('#conditionFilter');
  if (conditionFilter) {
    conditionFilter.hidden = !sectorProducts.some(product => product.condition === 'usado');
    conditionFilter.value = state.condition;
    conditionFilter.addEventListener('change', event => { state.condition = event.target.value; writeUrlState(); renderProducts(); });
  }
}
$('#sortProducts')?.addEventListener('change', event => { state.sort = event.target.value; renderProducts(); });
$('#searchFocus')?.addEventListener('click', () => {
  $('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => $('#productSearch')?.focus(), 350);
});

// ───────────────────────────── Ficha de producto ─────────────────────────────
function showProduct(product) {
  if (!product) return;
  const gallery = [product.photo, ...product.photos].filter(photo => photo?.src);
  const photoNote = product.photo?.src?.startsWith('assets/') ? 'Imagen de referencia' : product.photo?.exact ? 'Fotografía referencial del modelo' : 'Imagen de referencia · confirmar variante exacta';
  $('#dialogArt').innerHTML = `
    <div class="product-photo-stage">
      <img id="dialogMainPhoto" src="${safeUrl(gallery[0]?.src || PLACEHOLDER_IMG)}" alt="${escapeHtml(photoNote)}: ${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'">
      <span class="product-photo-caption">${escapeHtml(photoNote)}</span>
    </div>
    ${gallery.length > 1 ? `<div class="gallery-thumbs">${gallery.map((photo, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-photo="${safeUrl(photo.src)}" aria-label="Ver foto ${index + 1}"><img src="${safeUrl(photo.src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}`;
  $('#dialogArt').querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => {
    $('#dialogMainPhoto').src = button.dataset.photo;
    $('#dialogArt').querySelectorAll('[data-photo]').forEach(other => other.classList.toggle('active', other === button));
  }));

  $('#dialogCategory').textContent = `${product.categoryLabel}${product.subcategoryLabel ? ` · ${product.subcategoryLabel}` : ''} · ${product.code}`;
  $('#dialogBadges').innerHTML = productBadges(product);
  $('#dialogTitle').textContent = product.name;
  $('#dialogLead').textContent = product.shortDescription || product.description;
  $('#dialogDescription').textContent = product.condition === 'usado' && product.conditionNotes
    ? `${product.conditionNotes} ${product.description}` : product.description;
  $('#dialogFacts').innerHTML = [
    ['Marca', product.brand], ['Modelo', product.model], ['Categoría', product.subcategoryLabel || product.categoryLabel],
    ['Estado', product.condition === 'usado' ? `Usado${product.conditionGrade ? ` · ${product.conditionGrade}` : ''}` : 'Nuevo'],
    product.caliber ? ['Calibre', product.caliber] : null, ['Código', product.code],
    product.dateAdded ? ['Ingreso', product.dateAdded.split('-').reverse().join('/')] : null,
  ].filter(Boolean).map(([label, value]) => `<div><small>${label}</small><strong>${escapeHtml(value)}</strong></div>`).join('');
  $('#dialogPrice').innerHTML = `${priceHtml(product)}${product.price !== null ? `<small>${product.demoPrice ? 'Precio de ejemplo' : 'Precio unitario publicado'}</small>` : ''}`;
  const availabilityNode = $('#dialogAvailability');
  availabilityNode.textContent = availabilityLabel(product) + (product.availability !== 'agotado' ? ' · la armería confirma el stock al responder' : '');
  availabilityNode.className = `availability is-${product.availability}`;
  $('#dialogNote').textContent = product.regulated
    ? 'Artículo regulado. Se gestiona como consulta: la armería verifica la documentación y las autorizaciones legales antes de cualquier operación.'
    : 'Confirmá marca, precio y disponibilidad con la armería.';
  const links = [];
  if (product.sourceUrl) links.push(`<a href="${safeUrl(product.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(product.sourceLabel || 'Referencia del fabricante')} ↗</a>`);
  if (product.photo?.sourceUrl) links.push(`<a href="${safeUrl(product.photo.sourceUrl)}" target="_blank" rel="noopener noreferrer">Foto: ${escapeHtml(product.photo.author)} · ${escapeHtml(product.photo.license)} ↗</a>`);
  $('#dialogLinks').innerHTML = links.join('');

  const action = $('#dialogAction');
  action.disabled = !isEligible(product);
  action.textContent = !isEligible(product) ? 'Sin stock' : cart.inCart(product.id) ? 'Ya está en tu pedido · ver pedido' : product.regulated ? 'Agregar a la consulta' : 'Agregar al pedido';
  action.onclick = () => cart.addFromProductDialog(product);

  const consult = $('#dialogWhatsApp');
  const url = inquiryUrl(`Hola, ${sector.name}. Quiero consultar por: ${product.name} (${product.brand} · Cód. ${product.code}). ¿Me confirman disponibilidad y precio?`);
  consult.hidden = !url;
  if (url) consult.href = url;

  // Enlace propio del producto: se puede copiar o compartir.
  const params = new URLSearchParams(window.location.search);
  params.set('producto', product.id);
  history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  const shareButton = $('#dialogShare');
  shareButton.textContent = 'Compartir producto';
  shareButton.onclick = async () => {
    const url = window.location.href.split('#')[0];
    try {
      if (navigator.share) { await navigator.share({ title: product.name, text: `${product.name} · ${sector.name}`, url }); return; }
      await navigator.clipboard.writeText(url);
      shareButton.textContent = 'Enlace copiado ✓';
    } catch {
      if (!navigator.share) { window.prompt('Copiá el enlace del producto:', url); }
    }
  };

  cart.openOverlay('productOverlay');
}

// Al cerrar la ficha se quita el producto de la dirección.
new MutationObserver(() => {
  if ($('#productOverlay').classList.contains('open')) return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('producto')) return;
  params.delete('producto');
  const query = params.toString();
  history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
}).observe($('#productOverlay'), { attributes: true, attributeFilter: ['class'] });

window.parabellumShowProduct = id => showProduct(findProduct(id));

// ───────────────────────────── Carruseles ─────────────────────────────
function initCarousel(root, { autoplay = false } = {}) {
  const track = root.querySelector('.carousel-track');
  const prev = root.querySelector('[data-carousel-prev]');
  const next = root.querySelector('[data-carousel-next]');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const looping = autoplay && !reduceMotion && track.children.length > 1;

  // Carrusel automático: se duplican los elementos para lograr un bucle continuo.
  let loopWidth = () => 0;
  if (looping) {
    const originals = [...track.children];
    originals.forEach(node => {
      const clone = node.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      clone.dataset.clone = 'true';
      track.append(clone);
    });
    const firstClone = track.children[originals.length];
    loopWidth = () => firstClone.offsetLeft - originals[0].offsetLeft;
    root.classList.add('is-autoplay');
  }

  const sync = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    if (looping) { prev.disabled = false; next.disabled = false; return; }
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
    root.classList.toggle('is-static', max <= 0);
  };

  let resumeAt = 0;
  const holdAutoplay = (ms = 3500) => { resumeAt = performance.now() + ms; };
  const step = direction => {
    const amount = Math.max(track.clientWidth * 0.8, 200);
    if (looping) {
      holdAutoplay();
      const width = loopWidth();
      if (direction < 0 && track.scrollLeft < amount) track.scrollLeft += width;
      if (direction > 0 && track.scrollLeft + amount >= width * 2 - track.clientWidth) track.scrollLeft -= width;
    }
    track.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  track.addEventListener('scroll', () => window.requestAnimationFrame(sync), { passive: true });
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  });
  window.addEventListener('resize', sync);
  sync();
  window.setTimeout(sync, 400);

  if (!looping) return;
  const SPEED = 38; // píxeles por segundo
  let hovering = false;
  let position = track.scrollLeft;
  let last = performance.now();
  root.addEventListener('mouseenter', () => { hovering = true; });
  root.addEventListener('mouseleave', () => { hovering = false; });
  root.addEventListener('focusin', () => { hovering = true; });
  root.addEventListener('focusout', () => { hovering = false; });
  track.addEventListener('pointerdown', () => holdAutoplay(4000), { passive: true });
  track.addEventListener('touchstart', () => holdAutoplay(4000), { passive: true });
  track.addEventListener('wheel', () => holdAutoplay(3000), { passive: true });
  const frame = now => {
    const dt = Math.min(now - last, 64);
    last = now;
    const width = loopWidth();
    if (!hovering && now > resumeAt && !document.hidden && width > 0) {
      position += (SPEED * dt) / 1000;
      if (position >= width) position -= width;
      track.scrollLeft = position;
    } else {
      if (width > 0 && track.scrollLeft >= width) track.scrollLeft -= width;
      position = track.scrollLeft;
    }
    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame(frame);
}

function carouselShell(id, label, items) {
  return `
    <div class="carousel" id="${id}">
      <button class="carousel-arrow" type="button" data-carousel-prev aria-label="Anterior">‹</button>
      <div class="carousel-track" tabindex="0" role="region" aria-label="${escapeHtml(label)}">${items}</div>
      <button class="carousel-arrow" type="button" data-carousel-next aria-label="Siguiente">›</button>
    </div>`;
}

function renderBrands() {
  const section = $('#marcas');
  if (!section) return;
  const list = brands.filter(brand => brand.sector === sectorId);
  if (!list.length) { section.hidden = true; return; }
  const count = name => sectorProducts.filter(product => product.brand.toLowerCase() === name.toLowerCase()).length;
  const tiles = list.map(brand => `
    <button type="button" class="brand-tile" data-brand="${escapeHtml(brand.name)}" aria-label="Ver productos ${escapeHtml(brand.name)}">
      ${brand.logo ? `<img src="${safeUrl(brand.logo)}" alt="${escapeHtml(brand.name)}" decoding="async">` : `<span class="brand-wordmark">${escapeHtml(brand.name)}</span>`}
      <small>${count(brand.name)} producto${count(brand.name) === 1 ? '' : 's'}</small>
    </button>`).join('');
  section.querySelector('[data-slot]').innerHTML = carouselShell('brandCarousel', 'Marcas', tiles);
  initCarousel($('#brandCarousel'), { autoplay: true });
  section.querySelectorAll('[data-brand]').forEach(tile => tile.addEventListener('click', () => {
    applyFilter({ category: '', subcategory: '', brand: tile.dataset.brand });
  }));
}

function renderNovedades() {
  const section = $('#novedades');
  if (!section) return;
  const items = novedades(sectorId, NOVEDADES_LIMIT);
  const slot = section.querySelector('[data-slot]');
  if (!items.length) {
    slot.innerHTML = '<p class="section-empty">Pronto vas a ver acá los últimos ingresos.</p>';
    return;
  }
  slot.innerHTML = carouselShell('novedadesCarousel', 'Últimos ingresos', items.map(product => `
    <article class="nov-card">
      <button type="button" class="nov-media" data-product="${product.id}" aria-label="Ver ficha de ${escapeHtml(product.name)}">
        <span class="badge badge-new">Nuevo</span>
        ${productImage(product, '', product.name)}
      </button>
      <div class="nov-copy">
        <small>${escapeHtml(product.brand)} · ${escapeHtml(product.subcategoryLabel || product.categoryLabel)}</small>
        <h3>${escapeHtml(product.name)}</h3>
        <button type="button" class="nov-link" data-product="${product.id}">Ver ficha →</button>
      </div>
    </article>`).join(''));
  initCarousel($('#novedadesCarousel'));
  bindProductOpeners(slot);
}

function renderOfertas() {
  const section = $('#ofertas');
  if (!section) return;
  const items = ofertas(sectorId);
  const slot = section.querySelector('[data-slot]');
  if (!items.length) {
    const link = inquiryUrl(`Hola, ${sector.name}. ¿Tienen promociones vigentes?`);
    slot.innerHTML = `<div class="section-empty"><p>No hay ofertas publicadas en este momento.</p>${link ? `<a class="secondary" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Consultar promociones ↗</a>` : ''}</div>`;
    return;
  }
  slot.innerHTML = `<div class="offers-grid">${items.map(product => `
    <article class="offer-card">
      <button type="button" class="offer-media" data-product="${product.id}" aria-label="Ver ficha de ${escapeHtml(product.name)}">
        ${productImage(product, '', product.name)}
        ${product.offer.previousPrice ? `<span class="offer-off">−${Math.round((1 - product.price / product.offer.previousPrice) * 100)}%</span>` : ''}
      </button>
      <div class="offer-copy">
        <span class="card-badges">${productBadges(product)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.shortDescription || '')}</p>
        <small class="card-availability is-${product.availability}">${availabilityLabel(product)}</small>
        <div class="offer-bottom">${priceHtml(product)}<button type="button" class="view" data-product="${product.id}">Ver producto</button></div>
      </div>
    </article>`).join('')}</div>`;
  bindProductOpeners(slot);
}

function renderUsados() {
  const section = $('#usados');
  if (!section) return;
  const items = usados(sectorId);
  const slot = section.querySelector('[data-slot]');
  if (!items.length) {
    const link = inquiryUrl(`Hola, ${sector.name}. ¿Tienen productos usados disponibles?`);
    slot.innerHTML = `<div class="section-empty"><p>Por el momento no hay usados publicados.</p><p>Si buscás algo en particular, consultanos: ingresan unidades seleccionadas.</p>${link ? `<a class="secondary" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Consultar por usados ↗</a>` : ''}</div>`;
    return;
  }
  slot.innerHTML = `<div class="grid used-grid">${items.map(cardHtml).join('')}</div>
    <div class="used-actions"><button type="button" class="secondary" data-show-used>Ver usados en el catálogo →</button></div>`;
  bindProductOpeners(slot);
  slot.querySelector('[data-show-used]').addEventListener('click', () => {
    state.condition = 'usado';
    const select = $('#conditionFilter');
    if (select) select.value = 'usado';
    applyFilter({ category: '', subcategory: '', brand: '' });
  });
}

function renderGestoria() {
  const section = $('#gestoria');
  if (!section) return;
  const services = gestoriaServices.length ? gestoriaServices.map(service => ({ ...service, demo: false })) : DEMO_MODE ? demoGestoria.map(service => ({ ...service, demo: true })) : [];
  section.querySelector('[data-slot]').innerHTML = services.length
    ? `<div class="gestoria-grid">${services.map((service, index) => `
        <article class="gestoria-card">
          <span class="gestoria-index">${String(index + 1).padStart(2, '0')}</span>
          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(service.description || '')}</p>
          ${service.demo ? '<span class="badge badge-demo">Ejemplo</span>' : ''}
        </article>`).join('')}</div>`
    : '<p class="section-empty">El detalle de trámites se publicará cuando la armería lo confirme. Mientras tanto, consultanos por WhatsApp.</p>';
}

// Botones que filtran el catálogo por categoría (p. ej. puntos del local outdoor)
document.querySelectorAll('[data-filter-cat]').forEach(button => button.addEventListener('click', () => {
  applyFilter({ category: button.dataset.filterCat, subcategory: '', brand: '' });
}));

// Enlaces de consulta general: <a data-inquiry="texto del mensaje">
function bindInquiryLinks() {
  document.querySelectorAll('[data-inquiry]').forEach(link => {
    const url = inquiryUrl(link.dataset.inquiry);
    if (url) { link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.hidden = false; }
    else link.hidden = true;
  });
}

// ───────────────────────────── Inicio ─────────────────────────────
readUrlState();
renderNav();
renderSidebar();
renderProducts();
bindProductOpeners($('#productGrid'));
renderBrands();
renderNovedades();
renderOfertas();
renderUsados();
renderGestoria();
bindInquiryLinks();

// Enlace directo a un producto: ?producto=id
{
  const linked = findProduct(new URLSearchParams(window.location.search).get('producto'));
  if (linked && linked.sector === sectorId && linked.published) showProduct(linked);
}

if ($('#showroomViewer')) {
  import('./showroom.js').then(module => module.initShowroom({ applyFilter }));
}
