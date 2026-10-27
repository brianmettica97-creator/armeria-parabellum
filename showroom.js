// Showroom de Armería con fotos reales del local y puntos interactivos.
//
// Cada vista tiene:
//   filter: filtro del catálogo que se aplica (sin mover la página) al elegir la vista.
//   focus:  punto de la foto principal donde está ese sector; la transición
//           hace zoom hacia ahí al entrar y desde ahí al volver.
//   spots:  puntos sobre la foto. x / y son porcentajes de la imagen (0–100).
//           action: { category, subcategory } → abre la vidriera con esos productos
//                   { brand }                  → abre la vidriera con esa marca
//                   { view }                   → hace zoom a otra vista del local
//           La vidriera se muestra sobre la foto: el visitante no sale del showroom.
//           logo: { w, h } → zona rectangular sobre un logo (en % de la foto)
// Los puntos se ubicaron sobre lo que se identifica en cada foto (sectores y
// carteles de marca); no representan unidades específicas en stock.
import { escapeHtml, productImage, priceHtml } from './utils.js';

const ARMAS = 'armas';
// Zona clickeable sobre el cartel de una marca (w / h en % de la foto).
const logo = (x, y, label, brand = label, w = 8, h = 5) => ({ x, y, label, note: 'Marca', logo: { w, h }, action: { brand } });

export const showroomViews = [
  {
    id: 'entrada', title: 'Vista principal', image: 'assets/new/vista-principal.jpg', thumb: 'assets/new/vista-principal-mini.jpg',
    alt: 'Pasillo central del local con vitrinas, paredes de armas y carteles de marcas', filter: { category: '' },
    spots: [
      // Los sectores con foto propia entran a esa vista con zoom (como Equipo y Munición).
      { x: 10, y: 46, label: 'Armas largas', note: 'Pared de escopetas', action: { view: 'pistolas' } },
      { x: 16, y: 80, label: 'Arma corta', note: 'Vitrina de pistolas', action: { view: 'pistolas' } },
      { x: 44, y: 45, label: 'Equipo y Munición', note: 'Accesorios, recarga y municiones', action: { view: 'accesorios' } },
      { x: 88, y: 30, label: 'Fusiles', note: 'Fusiles y carabinas', action: { view: 'fusiles' } },
      { x: 85, y: 80, label: 'Revólveres', note: 'Vitrina de revólveres', action: { view: 'fusiles' } },
      // Carteles de marcas de la pared del fondo (columna izquierda y derecha de la puerta).
      logo(35.1, 26.5, 'Ruger', 'Ruger', 5.5, 5), logo(35.1, 30.2, 'Beretta', 'Beretta', 5.5, 2.6),
      logo(35.2, 33.4, 'Glock', 'GLOCK', 4, 3.5), logo(35.1, 36.8, 'CZ', 'CZ', 4.5, 3.2),
      logo(48, 27, 'Taurus', 'Taurus', 5.5, 5), logo(48, 30.4, 'Remington', 'Remington', 6, 2.4),
      logo(48, 33.6, 'Sig Sauer', 'SIG SAUER', 3.5, 3.5), logo(48, 36.8, 'Bersa', 'Bersa', 5, 3),
    ],
  },
  {
    id: 'pistolas', title: 'Pistolas y escopetas', image: 'assets/new/pistolas-escopetas.jpg', thumb: 'assets/new/pistolas-escopetas-mini.jpg',
    alt: 'Pared de escopetas y vitrina con pistolas', filter: { category: ARMAS, subcategory: 'escopetas' }, focus: { x: 11, y: 42 },
    spots: [
      { x: 28, y: 24, label: 'Escopetas', action: { category: ARMAS, subcategory: 'escopetas' } },
      { x: 30, y: 82, label: 'Pistolas', action: { category: ARMAS, subcategory: 'pistolas' } },
      { x: 53, y: 77, label: 'Valijas y estuches', action: { category: 'accesorios', subcategory: 'fundas-transporte' } },
    ],
  },
  {
    id: 'fusiles', title: 'Fusiles y revólveres', image: 'assets/new/fusiles-revolveres.jpg', thumb: 'assets/new/fusiles-revolveres-mini.jpg',
    alt: 'Pared de fusiles y vitrina con revólveres', filter: { category: ARMAS, subcategory: 'fusiles' }, focus: { x: 85, y: 45 },
    spots: [
      { x: 66, y: 25, label: 'Fusiles', action: { category: ARMAS, subcategory: 'fusiles' } },
      { x: 28, y: 31, label: 'Carabinas', action: { category: ARMAS, subcategory: 'carabinas' } },
      { x: 52, y: 70, label: 'Revólveres', action: { category: ARMAS, subcategory: 'revolveres' } },
    ],
  },
  {
    id: 'accesorios', title: 'Equipo y Munición', image: 'assets/new/equipo-municion.jpg', thumb: 'assets/new/equipo-municion-mini.jpg',
    alt: 'Pared de protección auditiva, anteojos, miras, recarga y fundas, con vitrina de municiones por calibre', filter: { category: 'accesorios' }, focus: { x: 46, y: 58 },
    spots: [
      { x: 15, y: 25, label: 'Auriculares de tiro', note: 'EARMOR', action: { category: 'accesorios', subcategory: 'auriculares' } },
      { x: 38, y: 29, label: 'Anteojos de protección', note: 'Shilba', side: 'left', action: { category: 'accesorios', subcategory: 'proteccion' } },
      { x: 54, y: 29, label: 'Miras y red dots', note: 'Holosun', action: { category: 'accesorios', subcategory: 'optica' } },
      { x: 69, y: 34, label: 'Recarga', note: 'Lyman', action: { category: 'recarga' } },
      { x: 91, y: 31, label: 'Fundas y portacargadores', note: 'Ghost', action: { category: 'accesorios', subcategory: 'fundas-transporte' } },
      { x: 9, y: 77, label: 'Munición pistola 9mm', note: 'Arma corta', action: { category: 'municiones', subcategory: 'arma-corta' } },
      { x: 45, y: 75, label: 'Munición escopeta', side: 'left', action: { category: 'municiones' } },
      { x: 63, y: 74, label: 'Munición carabina', note: 'Arma larga', action: { category: 'municiones', subcategory: 'arma-larga' } },
      { x: 82, y: 70, label: 'Varios calibres', action: { category: 'municiones' } },
    ],
  },
  {
    id: 'opticas', title: 'Ópticas y accesorios', image: 'assets/new/opticas-accesorios.jpg', thumb: 'assets/new/opticas-accesorios-mini.jpg',
    alt: 'Sección de accesorios y ópticas: miras, miras láser, fundas, kits de limpieza y extensiones', filter: { category: 'accesorios', subcategory: 'optica' }, focus: { x: 46, y: 58 },
    spots: [
      { x: 17, y: 44, label: 'Miras y ópticas', action: { category: 'accesorios', subcategory: 'optica' } },
      { x: 37, y: 57, label: 'Miras láser', action: { category: 'accesorios', subcategory: 'laseres' } },
      { x: 54, y: 43, label: 'Fundas', action: { category: 'accesorios', subcategory: 'fundas-transporte' } },
      { x: 72, y: 58, label: 'Kits de limpieza', action: { category: 'accesorios', subcategory: 'limpieza' } },
      { x: 88, y: 44, label: 'Extensiones y otros', action: { category: 'accesorios', subcategory: 'otros' } },
      { x: 65, y: 87, label: 'Estuches y valijas', action: { category: 'accesorios', subcategory: 'fundas-transporte' } },
    ],
  },
];

const esc = escapeHtml;
const SHELF_LIMIT = 24; // tarjetas en la vidriera; el resto, en el catálogo

const TOUR_MS = 7000;
// Si la pestaña está en segundo plano las animaciones se pausan: este respaldo evita que la transición quede colgada.
const settle = (animation, ms) => Promise.race([animation.finished.catch(() => {}), new Promise(resolve => window.setTimeout(resolve, ms + 250))]);

export function initShowroom({ applyFilter, productsFor, openProduct, inquiryFor }) {
  const countFor = action => productsFor(action).length;
  const $ = selector => document.querySelector(selector);
  const frame = $('#showroomViewer');
  const stage = $('#sceneStage');
  const figure = $('#sceneFigure');
  const scene = $('#showroomScene');
  const spotsBox = $('#sceneSpots');
  const backdrop = $('#sceneBackdrop');
  const progress = $('#sceneProgress');
  const tourButton = $('#tourToggle');
  const touch = window.matchMedia?.('(hover: none)').matches;
  const compact = () => Boolean(window.matchMedia?.('(max-width: 720px)').matches);
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const visited = new Map(showroomViews.map(view => [view.id, new Set()]));
  let current = 0;
  let switchToken = 0;
  let outAnimation = null; // salida de la vista anterior (se cancela al entrar la nueva)

  // Guía lateral y miniaturas, generadas desde la misma lista de vistas.
  $('#guideLinks').innerHTML = showroomViews.map((view, index) =>
    `<button type="button" data-scene-view="${view.id}"><em>${String(index + 1).padStart(2, '0')}</em> <i></i> ${esc(view.title)}</button>`).join('');
  $('#showroomRail').innerHTML = showroomViews.map(view =>
    `<button class="showroom-thumb" type="button" data-showroom-view="${view.id}"><img src="${view.thumb}" alt="" loading="lazy"><span>${esc(view.title)}</span><i class="thumb-progress" aria-hidden="true"></i></button>`).join('');

  // Precarga de las fotos para que las transiciones sean fluidas.
  const preload = src => new Promise(resolve => { const img = new Image(); img.onload = img.onerror = () => resolve(); img.src = src; });
  window.setTimeout(() => showroomViews.forEach(view => preload(view.image)), 1500);

  // Ajusta la foto al espacio disponible sin recortarla.
  function fit() {
    if (!scene.naturalWidth) return;
    const ratio = scene.naturalWidth / scene.naturalHeight;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    let figureWidth = width;
    let figureHeight = width / ratio;
    if (figureHeight > height) { figureHeight = height; figureWidth = height * ratio; }
    frame.style.setProperty('--photo-h', Math.min(1.34, 1 / ratio).toFixed(3)); // alto de la foto en celular
    figure.style.width = `${Math.round(figureWidth)}px`;
    figure.style.height = `${Math.round(figureHeight)}px`;
  }
  scene.addEventListener('load', fit);
  window.addEventListener('resize', fit);
  new ResizeObserver(fit).observe(stage);

  function describe(spot) {
    if (spot.action.view) return spot.note || 'Ver esta parte del local';
    const count = countFor(spot.action);
    const base = spot.note ? `${spot.note} · ` : '';
    return `${base}${count ? `${count} producto${count === 1 ? '' : 's'} en el catálogo` : 'Consultar disponibilidad'}`;
  }

  function updateProgress() {
    const view = showroomViews[current];
    const seen = visited.get(view.id).size;
    const total = view.spots.length;
    progress.classList.toggle('is-complete', seen === total);
    progress.innerHTML = seen === total
      ? '<b>✓</b> Exploraste todos los puntos de esta vista'
      : `<b>${seen}/${total}</b> puntos explorados`;
  }

  // En celular las etiquetas se pisan sobre la foto: se muestran en una tarjeta fija debajo.
  const info = document.createElement('div');
  info.className = 'scene-info';
  info.setAttribute('aria-live', 'polite');
  frame.append(info);
  function showHint() {
    info.classList.remove('has-spot');
    info.innerHTML = '<p>Tocá un punto de la foto para ver ese sector</p>';
  }
  function showInfo(spot) {
    info.classList.add('has-spot');
    info.innerHTML = `<b>${esc(spot.logo ? `Productos ${spot.label}` : spot.label)}</b><small>${esc(describe(spot))}</small><button type="button">${spot.action.view ? 'Entrar a este sector →' : 'Ver los artículos →'}</button>`;
    info.querySelector('button').addEventListener('click', event => { event.stopPropagation(); runAction(spot.action, spot); });
  }

  function closeSpots(except) {
    spotsBox.querySelectorAll('.spot.is-open').forEach(spot => { if (spot !== except) spot.classList.remove('is-open'); });
  }

  function markVisited(index, button) {
    visited.get(showroomViews[current].id).add(index);
    button.classList.add('is-visited');
    updateProgress();
  }

  // ── Vidriera: los productos del sector, sobre la misma foto ──
  const shelf = document.createElement('div');
  shelf.className = 'scene-shelf';
  shelf.hidden = true;
  shelf.setAttribute('role', 'region');
  frame.append(shelf);
  // Lo que pasa dentro de la vidriera no cierra los puntos ni cambia de vista al deslizar.
  ['click', 'touchstart', 'touchend', 'pointermove'].forEach(type => shelf.addEventListener(type, event => event.stopPropagation(), { passive: true }));

  const catalogFilter = action => action.brand
    ? { category: '', subcategory: '', brand: action.brand }
    : { category: action.category || '', subcategory: action.subcategory || '', brand: '' };

  function openShelf(spot) {
    const action = spot.action;
    const items = productsFor(action);
    const title = spot.logo ? `Productos ${spot.label}` : spot.label;
    const shown = items.slice(0, SHELF_LIMIT);
    const count = `${items.length} artículo${items.length === 1 ? '' : 's'}`;
    const consult = inquiryFor(`Hola, quiero consultar qué tienen disponible en ${title}.`);
    shelf.setAttribute('aria-label', `Vidriera: ${title}`);
    shelf.innerHTML = `
      <div class="shelf-head">
        <div class="shelf-title"><small>${spot.logo ? 'Marca' : esc(showroomViews[current].title)}</small><b>${esc(title)}</b><span>${items.length ? count : 'Sin artículos publicados'}</span></div>
        ${items.length ? '<button type="button" class="shelf-all">Ver en el catálogo <span>↘</span></button>' : ''}
        <button type="button" class="shelf-close" aria-label="Cerrar vidriera">×</button>
      </div>
      ${items.length ? `<div class="shelf-track">${shown.map(product => `
        <button type="button" class="shelf-card${product.availability === 'agotado' ? ' is-soldout' : ''}" data-shelf-product="${esc(product.id)}" aria-label="Ver ficha de ${esc(product.name)}">
          <span class="shelf-photo">${productImage(product)}</span>
          <small>${esc(product.brand)}</small>
          <strong>${esc(product.name)}</strong>
          ${priceHtml(product)}
        </button>`).join('')}${items.length > shown.length ? `<button type="button" class="shelf-card shelf-more"><b>+${items.length - shown.length}</b><span>Ver todos en el catálogo</span></button>` : ''}</div>`
        : `<div class="shelf-empty"><p>Por ahora no hay artículos publicados en este sector. Consultanos disponibilidad.</p>${consult ? `<a href="${esc(consult)}" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp ↗</a>` : ''}</div>`}`;
    shelf.querySelector('.shelf-close').addEventListener('click', closeShelf);
    shelf.querySelectorAll('.shelf-all, .shelf-more').forEach(button => button.addEventListener('click', () => { closeShelf(); applyFilter(catalogFilter(action)); }));
    shelf.querySelectorAll('[data-shelf-product]').forEach(card => card.addEventListener('click', () => openProduct(card.dataset.shelfProduct)));
    // El catálogo de abajo queda filtrado igual, sin mover la página.
    applyFilter({ ...catalogFilter(action), scroll: false, push: false });
    shelf.hidden = false;
    frame.classList.add('has-shelf');
    if (!reduceMotion && shelf.animate) shelf.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.2,.6,.3,1)' });
  }
  function closeShelf() {
    if (shelf.hidden) return;
    shelf.hidden = true;
    frame.classList.remove('has-shelf');
    closeSpots();
    showHint();
  }

  function runAction(action, spot) {
    stopTour();
    if (action.view) { setView(action.view); return; }
    openShelf(spot);
  }

  function renderSpots(view) {
    const seen = visited.get(view.id);
    showHint();
    spotsBox.innerHTML = view.spots.map((spot, index) => {
      const sideClass = spot.side ? ` spot-${spot.side}` : spot.x > 62 ? ' spot-left' : spot.x < 30 ? ' spot-right' : '';
      const vertical = spot.y < 22 ? ' spot-below' : '';
      const area = spot.logo ? ` spot-logo" style="--x:${spot.x}%;--y:${spot.y}%;--w:${spot.logo.w}%;--h:${spot.logo.h}%;--i:${index}` : `" style="--x:${spot.x}%;--y:${spot.y}%;--i:${index}`;
      return `<button type="button" class="spot${sideClass}${vertical}${seen.has(index) ? ' is-visited' : ''}${spot.action.view ? ' spot-go' : ''}${area}" data-spot="${index}" aria-label="${esc(spot.label)}: ${esc(describe(spot))}">
        ${spot.logo ? '' : '<i class="spot-ring" aria-hidden="true"></i><i class="spot-dot" aria-hidden="true"></i>'}
        ${spot.logo ? '' : `<span class="spot-tag" aria-hidden="true">${esc(spot.label)}${spot.action.view ? ' <i>↗</i>' : ''}</span>`}
        <span class="spot-label" aria-hidden="true"><b>${esc(spot.logo ? `Productos ${spot.label}` : spot.label)}</b><small>${esc(describe(spot))}</small><em>${spot.action.view ? 'Entrar a este sector →' : 'Ver los artículos →'}</em></span>
      </button>`;
    }).join('');
    spotsBox.querySelectorAll('.spot').forEach(button => {
      const index = Number(button.dataset.spot);
      button.addEventListener('mouseenter', () => markVisited(index, button));
      button.addEventListener('focus', () => markVisited(index, button));
      button.addEventListener('click', event => {
        event.stopPropagation();
        markVisited(index, button);
        const spot = view.spots[index];
        // Sectores con productos: se abre la vidriera directamente (también en celular).
        if (!spot.action.view) {
          stopTour();
          closeSpots(button);
          button.classList.add('is-open');
          showInfo(spot);
          openShelf(spot);
          return;
        }
        // Sectores con foto propia: en pantallas táctiles el primer toque muestra la información y el segundo entra.
        if ((touch || compact()) && !button.classList.contains('is-open')) {
          stopTour();
          closeSpots(button);
          button.classList.add('is-open');
          showInfo(view.spots[index]);
          return;
        }
        runAction(spot.action, spot);
      });
    });
    updateProgress();
  }
  frame.addEventListener('click', () => { if (!shelf.hidden) { closeShelf(); return; } closeSpots(); showHint(); });

  function replayAnimation(className) {
    frame.classList.remove(className);
    void frame.offsetWidth; // reinicia la animación CSS
    frame.classList.add(className);
  }

  async function setView(id, { filter = true, fromTour = false } = {}) {
    const index = showroomViews.findIndex(view => view.id === id);
    if (index < 0) return;
    if (!fromTour) stopTour();
    closeShelf();
    const token = ++switchToken;
    const view = showroomViews[index];
    const changing = index !== current || !scene.src.endsWith(view.image);
    const previous = showroomViews[current];
    const direction = index >= current ? 1 : -1;
    current = index;

    $('#sceneCounter').innerHTML = `${String(index + 1).padStart(2, '0')} <i>/ ${String(showroomViews.length).padStart(2, '0')}</i>`;
    document.querySelectorAll('[data-showroom-view]').forEach(button => button.classList.toggle('active', button.dataset.showroomView === id));
    document.querySelectorAll('[data-scene-view]').forEach(button => button.classList.toggle('active', button.dataset.sceneView === id));
    if (filter && view.filter) applyFilter({ ...view.filter, brand: '', scroll: false, push: false });

    // Transición: desde la vista principal hace zoom hacia el sector elegido;
    // al volver, sale desde ese sector; entre sectores se desliza de costado.
    const zoomIn = previous?.id === 'entrada' && view.focus;
    const zoomOut = view.id === 'entrada' && previous?.focus;
    const origin = zoomIn ? view.focus : zoomOut ? previous.focus : null;
    const animate = changing && !reduceMotion && typeof figure.animate === 'function';
    if (animate) {
      frame.classList.add('is-zooming');
      figure.style.transformOrigin = origin ? `${origin.x}% ${origin.y}%` : '50% 50%';
      const out = zoomIn
        ? [{ transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }, { transform: 'scale(2.4)', opacity: 0.15, filter: 'blur(3px)' }]
        : zoomOut
          ? [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.82)', opacity: 0 }]
          : [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-6 * direction}%)`, opacity: 0 }];
      outAnimation?.cancel();
      outAnimation = figure.animate(out, { duration: zoomIn ? 520 : 300, easing: 'cubic-bezier(.55,0,.8,.4)', fill: 'forwards' });
      await Promise.all([preload(view.image), settle(outAnimation, zoomIn ? 520 : 300)]);
      if (token !== switchToken) return;
    }
    scene.src = view.image;
    scene.alt = view.alt;
    backdrop.style.backgroundImage = `url('${view.image}')`;
    $('#sceneTitle').textContent = view.title;
    renderSpots(view);
    if (scene.complete) fit();
    else await new Promise(resolve => scene.addEventListener('load', () => { fit(); resolve(); }, { once: true }));
    if (token !== switchToken) return;
    frame.classList.remove('is-switching');
    if (animate) {
      figure.style.transformOrigin = origin ? `${origin.x}% ${origin.y}%` : '50% 50%';
      const enter = zoomIn
        ? [{ transform: 'scale(1.25)', opacity: 0.35 }, { transform: 'scale(1)', opacity: 1 }]
        : zoomOut
          ? [{ transform: 'scale(2.4)', opacity: 0.2, filter: 'blur(3px)' }, { transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }]
          : [{ transform: `translateX(${6 * direction}%)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }];
      outAnimation?.cancel();
      figure.getAnimations().forEach(animation => animation.cancel());
      await settle(figure.animate(enter, { duration: zoomOut ? 560 : 460, easing: 'cubic-bezier(.2,.6,.3,1)' }), zoomOut ? 560 : 460);
      if (token !== switchToken) return;
      frame.classList.remove('is-zooming');
    } else {
      outAnimation?.cancel();
      figure.getAnimations().forEach(animation => animation.cancel());
      frame.classList.remove('is-zooming');
    }
    frame.classList.toggle('skip-figure-reveal', Boolean(animate)); // la foto ya entró con el zoom
    if (!reduceMotion) { replayAnimation('is-revealing'); }
    if (fromTour) restartThumbProgress();
  }

  // ── Recorrido automático ──
  let tourTimer = null;
  function restartThumbProgress() {
    document.querySelectorAll('.showroom-thumb').forEach(thumb => thumb.classList.remove('is-touring'));
    const active = document.querySelector('.showroom-thumb.active');
    if (!active || !tourTimer) return;
    void active.offsetWidth;
    active.classList.add('is-touring');
  }
  function startTour() {
    if (tourTimer) return;
    tourButton.setAttribute('aria-pressed', 'true');
    tourButton.querySelector('.tour-icon').textContent = '❚❚';
    tourButton.querySelector('.tour-text').textContent = 'Pausar recorrido';
    frame.classList.add('is-touring');
    tourTimer = window.setInterval(() => {
      if (document.hidden || frame.matches(':hover')) return;
      setView(showroomViews[(current + 1) % showroomViews.length].id, { fromTour: true });
    }, TOUR_MS);
    restartThumbProgress();
  }
  function stopTour() {
    if (!tourTimer) return;
    window.clearInterval(tourTimer);
    tourTimer = null;
    tourButton.setAttribute('aria-pressed', 'false');
    tourButton.querySelector('.tour-icon').textContent = '▶';
    tourButton.querySelector('.tour-text').textContent = 'Recorrido automático';
    frame.classList.remove('is-touring');
    document.querySelectorAll('.showroom-thumb').forEach(thumb => thumb.classList.remove('is-touring'));
  }
  tourButton?.addEventListener('click', () => (tourTimer ? stopTour() : startTour()));

  // ── Movimiento con el mouse: inclinación 3D y luz que sigue al cursor ──
  if (!touch && !reduceMotion) {
    let frameRequest = 0;
    frame.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frameRequest);
      frameRequest = requestAnimationFrame(() => {
        const box = frame.getBoundingClientRect();
        const dx = ((event.clientX - box.left) / box.width) * 2 - 1;
        const dy = ((event.clientY - box.top) / box.height) * 2 - 1;
        frame.style.setProperty('--tilt-x', dx.toFixed(3));
        frame.style.setProperty('--tilt-y', dy.toFixed(3));
        const zoom = figure.getBoundingClientRect();
        figure.style.setProperty('--light-x', `${(((event.clientX - zoom.left) / zoom.width) * 100).toFixed(1)}%`);
        figure.style.setProperty('--light-y', `${(((event.clientY - zoom.top) / zoom.height) * 100).toFixed(1)}%`);
        frame.classList.add('is-pointing');
      });
    });
    frame.addEventListener('pointerleave', () => {
      frame.classList.remove('is-pointing');
      frame.style.setProperty('--tilt-x', '0');
      frame.style.setProperty('--tilt-y', '0');
    });
  }

  // ── Deslizar en celular y flechas del teclado ──
  let touchStart = null;
  frame.addEventListener('touchstart', event => { touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }, { passive: true });
  frame.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  frame.addEventListener('keydown', event => {
    if (event.target !== frame) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  });

  function step(direction) {
    setView(showroomViews[(current + direction + showroomViews.length) % showroomViews.length].id);
  }

  document.querySelectorAll('[data-showroom-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.showroomView)));
  // La guía y las miniaturas cambian de vista dentro del showroom (no saltan al catálogo).
  document.querySelectorAll('[data-scene-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.sceneView)));
  document.querySelectorAll('[data-view-step]').forEach(button => button.addEventListener('click', () => step(Number(button.dataset.viewStep))));
  $('#showroomFullscreen')?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.requestFullscreen?.();
    } catch { /* pantalla completa no disponible */ }
  });

  setView('entrada', { filter: false });
  return { setView, startTour, stopTour };
}
