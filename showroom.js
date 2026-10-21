// Showroom de Armería con fotos reales del local y puntos interactivos.
//
// Cada vista tiene:
//   filter: filtro del catálogo que se aplica al elegir la vista.
//   spots:  puntos sobre la foto. x / y son porcentajes de la imagen (0–100).
//           action: { category, subcategory } → filtra el catálogo
//                   { brand }                  → filtra por marca
//                   { view }                   → pasa a otra vista del local
// Los puntos se ubicaron sobre lo que se identifica en cada foto (sectores y
// carteles de marca); no representan unidades específicas en stock.
export const showroomViews = [
  {
    id: 'entrada', title: 'Vista principal', image: 'assets/showroom/entrada.jpg', thumb: 'assets/showroom/entrada-mini.jpg',
    alt: 'Pasillo central del local con vitrinas y paredes de armas', filter: { category: '' },
    spots: [
      { x: 7, y: 40, label: 'Armas largas', action: { category: 'armas' } },
      { x: 88, y: 30, label: 'Fusiles', action: { category: 'armas', subcategory: 'fusiles' } },
      { x: 89, y: 75, label: 'Pistolas', action: { category: 'armas', subcategory: 'pistolas' } },
      { x: 78, y: 61, label: 'CZ', note: 'Marca', action: { brand: 'CZ' } },
      { x: 42, y: 37, label: 'Mostrador', note: 'Ver el mostrador de atención', action: { view: 'mostrador' } },
    ],
  },
  {
    id: 'pistolas', title: 'Pistolas y escopetas', image: 'assets/showroom/pistolas-escopetas.jpg', thumb: 'assets/showroom/pistolas-escopetas-mini.jpg',
    alt: 'Pared de escopetas y vitrina con pistolas', filter: { category: 'armas', subcategory: 'pistolas' },
    spots: [
      { x: 25, y: 19, label: 'Escopetas', action: { category: 'armas', subcategory: 'escopetas' } },
      { x: 30, y: 68, label: 'Pistolas', action: { category: 'armas', subcategory: 'pistolas' } },
      { x: 55, y: 63, label: 'Valijas y estuches', action: { category: 'accesorios', subcategory: 'fundas-transporte' } },
      { x: 92, y: 58, label: 'Municiones', action: { category: 'municiones' } },
    ],
  },
  {
    id: 'fusiles', title: 'Fusiles y revólveres', image: 'assets/showroom/fusiles-revolveres.jpg', thumb: 'assets/showroom/fusiles-revolveres-mini.jpg',
    alt: 'Pared de fusiles y vitrina con revólveres', filter: { category: 'armas', subcategory: 'fusiles' },
    spots: [
      { x: 62, y: 22, label: 'Fusiles', action: { category: 'armas', subcategory: 'fusiles' } },
      { x: 49, y: 71, label: 'Revólveres', action: { category: 'armas', subcategory: 'revolveres' } },
      { x: 22, y: 62, label: 'CZ', note: 'Marca', action: { brand: 'CZ' } },
    ],
  },
  {
    id: 'accesorios', title: 'Accesorios', image: 'assets/showroom/accesorios-marcas.jpg', thumb: 'assets/showroom/accesorios-marcas-mini.jpg',
    alt: 'Pared de accesorios con protección auditiva, anteojos, miras, recarga y fundas', filter: { category: 'accesorios' },
    spots: [
      { x: 16, y: 33, label: 'EARMOR', note: 'Protección auditiva', action: { brand: 'EARMOR' } },
      { x: 38, y: 32, label: 'Anteojos de protección', action: { category: 'accesorios', subcategory: 'proteccion' } },
      { x: 54, y: 32, label: 'Holosun', note: 'Miras', action: { brand: 'Holosun' } },
      { x: 69, y: 37, label: 'Recarga', action: { category: 'recarga' } },
      { x: 91, y: 32, label: 'Ghost', note: 'Fundas', action: { brand: 'Ghost' } },
      { x: 47, y: 78, label: 'Miras y ópticas', action: { category: 'accesorios', subcategory: 'optica' } },
    ],
  },
  {
    id: 'opticas', title: 'Ópticas y municiones', image: 'assets/showroom/opticas-municiones.jpg', thumb: 'assets/showroom/opticas-municiones-mini.jpg',
    alt: 'Pared de ópticas y vitrinas con cajas de municiones', filter: { category: 'accesorios', subcategory: 'optica' },
    spots: [
      { x: 26, y: 37, label: 'Ópticas', action: { category: 'accesorios', subcategory: 'optica' } },
      { x: 33, y: 80, label: 'Municiones', action: { category: 'municiones' } },
      { x: 80, y: 48, label: 'Fusiles', action: { category: 'armas', subcategory: 'fusiles' } },
    ],
  },
  {
    id: 'mostrador', title: 'Mostrador', image: 'assets/showroom/mostrador.jpg', thumb: 'assets/showroom/mostrador-mini.jpg',
    alt: 'Mostrador de atención con carteles de marcas y rifles de caza', filter: { category: '' },
    spots: [
      { x: 80, y: 31, label: 'Rifles de caza', note: 'Fusiles', action: { category: 'armas', subcategory: 'fusiles' } },
      { x: 37, y: 57, label: 'Pistolas', action: { category: 'armas', subcategory: 'pistolas' } },
      { x: 76, y: 53, label: 'Municiones', action: { category: 'municiones' } },
      { x: 22, y: 37, label: 'Bersa', note: 'Marca', action: { brand: 'Bersa' } },
      { x: 60, y: 45, label: 'CZ', note: 'Marca', action: { brand: 'CZ' } },
    ],
  },
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TOUR_MS = 7000;

export function initShowroom({ applyFilter, countFor }) {
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
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const visited = new Map(showroomViews.map(view => [view.id, new Set()]));
  let current = 0;
  let switchToken = 0;

  // Guía lateral y miniaturas, generadas desde la misma lista de vistas.
  $('#guideLinks').innerHTML = showroomViews.map((view, index) =>
    `<button type="button" data-scene-view="${view.id}"><i></i> ${esc(view.title)} <span>${String(index + 1).padStart(2, '0')}</span></button>`).join('');
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

  function closeSpots(except) {
    spotsBox.querySelectorAll('.spot.is-open').forEach(spot => { if (spot !== except) spot.classList.remove('is-open'); });
  }

  function markVisited(index, button) {
    visited.get(showroomViews[current].id).add(index);
    button.classList.add('is-visited');
    updateProgress();
  }

  function runAction(action) {
    stopTour();
    if (action.view) { setView(action.view); return; }
    if (action.brand) applyFilter({ category: '', subcategory: '', brand: action.brand });
    else applyFilter({ category: action.category || '', subcategory: action.subcategory || '', brand: '' });
  }

  function renderSpots(view) {
    const seen = visited.get(view.id);
    spotsBox.innerHTML = view.spots.map((spot, index) => {
      const sideClass = spot.x > 62 ? ' spot-left' : spot.x < 30 ? ' spot-right' : '';
      const vertical = spot.y < 22 ? ' spot-below' : '';
      return `<button type="button" class="spot${sideClass}${vertical}${seen.has(index) ? ' is-visited' : ''}" data-spot="${index}" style="--x:${spot.x}%;--y:${spot.y}%;--i:${index}" aria-label="${esc(spot.label)}: ${esc(describe(spot))}">
        <i class="spot-ring" aria-hidden="true"></i>
        <i class="spot-dot" aria-hidden="true"></i>
        <span class="spot-label" aria-hidden="true"><b>${esc(spot.label)}</b><small>${esc(describe(spot))}</small><em>${spot.action.view ? 'Ir →' : 'Ver en el catálogo →'}</em></span>
      </button>`;
    }).join('');
    spotsBox.querySelectorAll('.spot').forEach(button => {
      const index = Number(button.dataset.spot);
      button.addEventListener('mouseenter', () => markVisited(index, button));
      button.addEventListener('focus', () => markVisited(index, button));
      button.addEventListener('click', event => {
        event.stopPropagation();
        markVisited(index, button);
        // En pantallas táctiles el primer toque muestra la información y el segundo ejecuta.
        if (touch && !button.classList.contains('is-open')) {
          stopTour();
          closeSpots(button);
          button.classList.add('is-open');
          return;
        }
        runAction(view.spots[index].action);
      });
    });
    updateProgress();
  }
  frame.addEventListener('click', () => closeSpots());

  function replayAnimation(className) {
    frame.classList.remove(className);
    void frame.offsetWidth; // reinicia la animación CSS
    frame.classList.add(className);
  }

  async function setView(id, { filter = true, fromTour = false } = {}) {
    const index = showroomViews.findIndex(view => view.id === id);
    if (index < 0) return;
    if (!fromTour) stopTour();
    const token = ++switchToken;
    const view = showroomViews[index];
    const changing = index !== current || !scene.src.endsWith(view.image);
    current = index;

    $('#sceneCounter').innerHTML = `${String(index + 1).padStart(2, '0')} <i>/ ${String(showroomViews.length).padStart(2, '0')}</i>`;
    document.querySelectorAll('[data-showroom-view]').forEach(button => button.classList.toggle('active', button.dataset.showroomView === id));
    document.querySelectorAll('[data-scene-view]').forEach(button => button.classList.toggle('active', button.dataset.sceneView === id));
    if (filter && view.filter) applyFilter({ ...view.filter, brand: '', scroll: false });

    if (changing && !reduceMotion) {
      frame.classList.add('is-switching');
      await Promise.all([preload(view.image), new Promise(resolve => window.setTimeout(resolve, 260))]);
      if (token !== switchToken) return;
    }
    scene.src = view.image;
    scene.alt = view.alt;
    backdrop.style.backgroundImage = `url('${view.image}')`;
    $('#sceneTitle').textContent = view.title;
    renderSpots(view);
    if (scene.complete) fit();
    frame.classList.remove('is-switching');
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
  document.querySelectorAll('[data-scene-view]').forEach(button => button.addEventListener('click', () => {
    setView(button.dataset.sceneView);
    $('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
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
