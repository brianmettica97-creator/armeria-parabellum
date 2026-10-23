// Showroom de Armería con fotos reales del local y puntos interactivos.
//
// Cada vista tiene:
//   filter: filtro del catálogo que se aplica (sin mover la página) al elegir la vista.
//   focus:  punto de la foto principal donde está ese sector; la transición
//           hace zoom hacia ahí al entrar y desde ahí al volver.
//   spots:  puntos sobre la foto. x / y son porcentajes de la imagen (0–100).
//           action: { category, subcategory } → filtra el catálogo
//                   { brand }                  → filtra por marca
//                   { view }                   → hace zoom a otra vista del local
//           logo: { w, h } → zona rectangular sobre un logo (en % de la foto)
// Los puntos se ubicaron sobre lo que se identifica en cada foto (sectores y
// carteles de marca); no representan unidades específicas en stock.
const ARMAS = 'armas';
// Zona clickeable sobre el cartel de una marca (w / h en % de la foto).
const logo = (x, y, label, brand = label, w = 8, h = 5) => ({ x, y, label, note: 'Marca', logo: { w, h }, action: { brand } });

export const showroomViews = [
  {
    id: 'entrada', title: 'Vista principal', image: 'assets/showroom/entrada.jpg', thumb: 'assets/showroom/entrada-mini.jpg',
    alt: 'Pasillo central del local con vitrinas, paredes de armas y carteles de marcas', filter: { category: '' },
    spots: [
      { x: 11, y: 40, label: 'Armas largas', note: 'Escopetas, carabinas y fusiles', action: { category: ARMAS, subcategory: 'armas-largas' } },
      { x: 17, y: 78, label: 'Arma corta', note: 'Pistolas y revólveres', action: { category: ARMAS, subcategory: 'armas-cortas' } },
      { x: 46, y: 60, label: 'Municiones, accesorios y recarga', note: 'Entrar a este sector', action: { view: 'accesorios' } },
      { x: 88, y: 32, label: 'Fusiles', action: { category: ARMAS, subcategory: 'fusiles' } },
      { x: 87, y: 82, label: 'Revólveres', action: { category: ARMAS, subcategory: 'revolveres' } },
      // Carteles de marcas de la pared del fondo y de la pared derecha.
      logo(32.5, 27.5, 'Ruger', 'Ruger', 6, 5), logo(36.5, 28, 'CZ', 'CZ', 5, 5), logo(32.5, 35.5, 'Glock', 'GLOCK', 6, 4.5),
      logo(36.3, 35, 'Heckler & Koch', 'Heckler & Koch', 6, 5), logo(59.5, 28, 'FN Herstal', 'FN Herstal', 8, 5),
      logo(59.5, 34.5, 'Beretta', 'Beretta', 8, 3.5),
      logo(76, 19, 'Sig Sauer', 'SIG SAUER', 9, 5), logo(76, 24.5, 'Remington', 'Remington', 9, 4),
      logo(77, 44.5, 'Browning', 'Browning', 10, 4),
      logo(94, 23.5, 'Colt', 'Colt', 9, 6), logo(94, 35.5, 'Mossberg', 'Mossberg', 10, 4), logo(94, 46, 'Taurus', 'Taurus', 10, 4),
    ],
  },
  {
    id: 'pistolas', title: 'Pistolas y escopetas', image: 'assets/showroom/pistolas-escopetas.jpg', thumb: 'assets/showroom/pistolas-escopetas-mini.jpg',
    alt: 'Pared de escopetas y vitrina con pistolas', filter: { category: ARMAS, subcategory: 'escopetas' }, focus: { x: 11, y: 42 },
    spots: [
      { x: 28, y: 24, label: 'Escopetas', action: { category: ARMAS, subcategory: 'escopetas' } },
      { x: 30, y: 82, label: 'Pistolas', action: { category: ARMAS, subcategory: 'pistolas' } },
      { x: 53, y: 77, label: 'Valijas y estuches', action: { category: 'accesorios', subcategory: 'fundas-transporte' } },
      { x: 74, y: 69, label: 'Municiones', action: { category: 'municiones' } },
    ],
  },
  {
    id: 'fusiles', title: 'Fusiles y revólveres', image: 'assets/showroom/fusiles-revolveres.jpg', thumb: 'assets/showroom/fusiles-revolveres-mini.jpg',
    alt: 'Pared de fusiles y vitrina con revólveres', filter: { category: ARMAS, subcategory: 'fusiles' }, focus: { x: 85, y: 45 },
    spots: [
      { x: 70, y: 22, label: 'Fusiles', action: { category: ARMAS, subcategory: 'fusiles' } },
      { x: 30, y: 30, label: 'Carabinas', action: { category: ARMAS, subcategory: 'carabinas' } },
      { x: 57, y: 71, label: 'Revólveres', action: { category: ARMAS, subcategory: 'revolveres' } },
    ],
  },
  {
    id: 'accesorios', title: 'Accesorios', image: 'assets/showroom/accesorios-marcas.jpg', thumb: 'assets/showroom/accesorios-marcas-mini.jpg',
    alt: 'Pared de accesorios con protección auditiva, anteojos, miras, recarga y fundas', filter: { category: 'accesorios' }, focus: { x: 46, y: 58 },
    spots: [
      { x: 14, y: 30, label: 'Auriculares de tiro', note: 'EARMOR', action: { category: 'accesorios', subcategory: 'auriculares' } },
      { x: 34, y: 22, label: 'Anteojos de protección', note: 'Shilba', action: { category: 'accesorios', subcategory: 'proteccion' } },
      { x: 52, y: 33, label: 'Miras y red dots', note: 'Holosun', side: 'right', action: { category: 'accesorios', subcategory: 'optica' } },
      { x: 70, y: 45, label: 'Recarga', note: 'Lyman', side: 'right', action: { category: 'recarga' } },
      { x: 91, y: 30, label: 'Fundas y portacargadores', note: 'Ghost', action: { category: 'accesorios', subcategory: 'fundas-transporte' } },
      { x: 47, y: 78, label: 'Municiones', note: 'Ver todo en el catálogo', action: { category: 'municiones' } },
    ],
  },
  {
    id: 'opticas', title: 'Ópticas y accesorios', image: 'assets/showroom/opticas-municiones.jpg', thumb: 'assets/showroom/opticas-municiones-mini.jpg',
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
      const sideClass = spot.side ? ` spot-${spot.side}` : spot.x > 62 ? ' spot-left' : spot.x < 30 ? ' spot-right' : '';
      const vertical = spot.y < 22 ? ' spot-below' : '';
      const area = spot.logo ? ` spot-logo" style="--x:${spot.x}%;--y:${spot.y}%;--w:${spot.logo.w}%;--h:${spot.logo.h}%;--i:${index}` : `" style="--x:${spot.x}%;--y:${spot.y}%;--i:${index}`;
      return `<button type="button" class="spot${sideClass}${vertical}${seen.has(index) ? ' is-visited' : ''}${spot.action.view ? ' spot-go' : ''}${area}" data-spot="${index}" aria-label="${esc(spot.label)}: ${esc(describe(spot))}">
        ${spot.logo ? '' : '<i class="spot-ring" aria-hidden="true"></i><i class="spot-dot" aria-hidden="true"></i>'}
        ${spot.logo ? '' : `<span class="spot-tag" aria-hidden="true">${esc(spot.label)}${spot.action.view ? ' <i>↗</i>' : ''}</span>`}
        <span class="spot-label" aria-hidden="true"><b>${esc(spot.logo ? `Productos ${spot.label}` : spot.label)}</b><small>${esc(describe(spot))}</small><em>${spot.action.view ? 'Entrar a este sector →' : 'Ver en el catálogo →'}</em></span>
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
      await Promise.all([preload(view.image), outAnimation.finished.catch(() => {})]);
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
      await figure.animate(enter, { duration: zoomOut ? 560 : 460, easing: 'cubic-bezier(.2,.6,.3,1)' }).finished.catch(() => {});
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
