// Visor de fotos a pantalla completa para la ficha de producto.
//
// - Deslizar de costado (o flechas) pasa de una foto a otra, tipo carrete.
// - Pellizcar con dos dedos, doble toque, clic o la rueda del mouse acercan la foto;
//   con la foto ampliada, arrastrar recorre los detalles.
// - Deslizar hacia abajo, la X, Escape o el botón "atrás" del celular cierran el visor
//   y se vuelve a la ficha.
// En iPhone, Safari no permite poner una imagen en pantalla completa real, por eso
// el visor es una capa propia que ocupa toda la pantalla.
import { safeUrl } from './utils.js';

const MAX_SCALE = 4;
const TAP_SCALE = 2.5;

let viewer = null;

function build() {
  const node = document.createElement('div');
  node.className = 'photo-viewer';
  node.setAttribute('role', 'dialog');
  node.setAttribute('aria-modal', 'true');
  node.hidden = true;
  node.innerHTML = `
    <div class="pv-top">
      <span class="pv-counter" aria-live="polite"></span>
      <strong class="pv-title"></strong>
      <button class="pv-close" type="button" aria-label="Cerrar fotos">×</button>
    </div>
    <div class="pv-stage"><img class="pv-img" alt="" draggable="false"></div>
    <button class="pv-nav pv-prev" type="button" aria-label="Foto anterior">‹</button>
    <button class="pv-nav pv-next" type="button" aria-label="Foto siguiente">›</button>
    <p class="pv-hint">${window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ? 'Hacé clic o usá la rueda del mouse para acercar' : 'Pellizcá o tocá dos veces para acercar'}</p>
    <div class="pv-thumbs"></div>`;
  document.body.append(node);
  return node;
}

export function openPhotoViewer(photos, start = 0, { title = '' } = {}) {
  if (!photos.length) return;
  viewer ||= build();
  const node = viewer;
  const stage = node.querySelector('.pv-stage');
  const img = node.querySelector('.pv-img');
  const counter = node.querySelector('.pv-counter');
  const thumbs = node.querySelector('.pv-thumbs');
  let index = start;
  let scale = 1, x = 0, y = 0;
  const pointers = new Map();
  let gesture = null;   // estado del gesto en curso
  let lastTap = 0;

  node.setAttribute('aria-label', `Fotos de ${title}`);
  node.querySelector('.pv-title').textContent = title;
  node.classList.toggle('is-single', photos.length < 2);
  thumbs.innerHTML = photos.length > 1 ? photos.map((photo, i) =>
    `<button type="button" data-i="${i}" aria-label="Ver foto ${i + 1}"><img src="${safeUrl(photo.thumb || photo.src)}" alt="" loading="lazy"></button>`).join('') : '';

  function apply(animate = false) {
    img.style.transition = animate ? 'transform .25s ease' : 'none';
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    node.classList.toggle('is-zoomed', scale > 1.01);
  }
  // Mantiene la foto dentro de la pantalla al acercar o arrastrar.
  function clamp() {
    const maxX = Math.max(0, (img.offsetWidth * scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * scale - stage.clientHeight) / 2);
    x = Math.min(maxX, Math.max(-maxX, x));
    y = Math.min(maxY, Math.max(-maxY, y));
  }
  // Acerca o aleja manteniendo fijo el punto (px, py) de la pantalla.
  function zoomAt(nextScale, px, py, animate) {
    const box = stage.getBoundingClientRect();
    const cx = px - box.left - box.width / 2;
    const cy = py - box.top - box.height / 2;
    const next = Math.min(MAX_SCALE, Math.max(1, nextScale));
    x = cx - (cx - x) * (next / scale);
    y = cy - (cy - y) * (next / scale);
    scale = next;
    if (scale === 1) { x = 0; y = 0; }
    clamp();
    apply(animate);
  }
  function reset(animate) { scale = 1; x = 0; y = 0; apply(animate); }

  function show(i, direction = 0) {
    index = (i + photos.length) % photos.length;
    reset(false);
    img.src = safeUrl(photos[index].src);
    img.alt = `${title} · foto ${index + 1} de ${photos.length}`;
    counter.textContent = photos.length > 1 ? `${index + 1} / ${photos.length}` : '';
    thumbs.querySelectorAll('button').forEach((button, n) => button.classList.toggle('active', n === index));
    thumbs.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    if (direction && img.animate) img.animate([{ opacity: 0, transform: `translateX(${direction * 40}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: 'ease-out' });
  }

  // ── Gestos (puntero unificado: dedo, mouse y lápiz) ──
  function down(event) {
    if (event.target.closest('button')) return;
    stage.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), scale, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    } else if (pointers.size === 1) {
      gesture = { type: 'drag', startX: event.clientX, startY: event.clientY, x, y, moved: false, mouse: event.pointerType === 'mouse' };
    }
  }
  function move(event) {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gesture.type === 'pinch' && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      zoomAt(gesture.scale * Math.hypot(a.x - b.x, a.y - b.y) / gesture.dist, mid.x, mid.y, false);
      x += mid.x - gesture.mid.x; y += mid.y - gesture.mid.y; // arrastre con dos dedos
      gesture.mid = mid;
      clamp(); apply(false);
      return;
    }
    if (gesture.type !== 'drag') return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) gesture.moved = true;
    if (scale > 1.01) { x = gesture.x + dx; y = gesture.y + dy; clamp(); apply(false); return; }
    if (gesture.mouse) return;
    // Sin zoom: la foto acompaña el dedo (de costado cambia de foto, hacia abajo cierra).
    const vertical = dy > 0 && Math.abs(dy) > Math.abs(dx);
    img.style.transition = 'none';
    img.style.transform = vertical ? `translateY(${dy}px) scale(${1 - Math.min(dy, 300) / 1500})` : `translateX(${dx}px)`;
    node.style.setProperty('--pv-fade', vertical ? String(1 - Math.min(dy, 300) / 450) : '1');
  }
  function up(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (!gesture) return;
    if (gesture.type === 'pinch') {
      if (pointers.size === 0) { gesture = null; if (scale < 1.05) reset(true); }
      else { const [p] = pointers.values(); gesture = { type: 'drag', startX: p.x, startY: p.y, x, y, moved: true }; }
      return;
    }
    const done = gesture;
    gesture = null;
    node.style.setProperty('--pv-fade', '1');
    const dx = event.clientX - done.startX;
    const dy = event.clientY - done.startY;
    if (!done.moved) { tap(event); return; }
    if (scale > 1.01 || done.mouse) return;
    if (dy > 110 && dy > Math.abs(dx)) { close(); return; }
    if (Math.abs(dx) > 60 && photos.length > 1) { show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); return; }
    apply(true); // vuelve a su lugar
  }
  function tap(event) {
    // (con el puntero capturado el evento llega al marco: se mira si el toque cayó sobre la foto)
    const box = img.getBoundingClientRect();
    const onPhoto = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!onPhoto) { if (event.pointerType === 'mouse' && scale > 1.01) reset(true); return; }
    // Mouse: un clic acerca o aleja. Dedo: doble toque.
    if (event.pointerType !== 'mouse') {
      const now = Date.now();
      if (now - lastTap > 320) { lastTap = now; return; }
      lastTap = 0;
    }
    if (scale > 1.01) reset(true);
    else zoomAt(TAP_SCALE, event.clientX, event.clientY, true);
  }
  function wheel(event) {
    event.preventDefault();
    zoomAt(scale * (event.deltaY < 0 ? 1.2 : 1 / 1.2), event.clientX, event.clientY, false);
  }
  function key(event) {
    if (event.key === 'Escape') { event.stopImmediatePropagation(); close(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1, 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1, -1); }
  }
  const noGesture = event => event.preventDefault(); // Safari: evita que el pellizco amplíe toda la página
  const prev = () => show(index - 1, -1);
  const next = () => show(index + 1, 1);
  const pick = event => { const button = event.target.closest('[data-i]'); if (button) show(Number(button.dataset.i)); };
  const fit = () => { clamp(); apply(false); };

  // El visor ocupa un paso del historial: el "atrás" del celular lo cierra sin cerrar la ficha.
  function onPop() { if (!history.state?.photoViewer) close({ fromHistory: true }); }
  function close({ fromHistory = false } = {}) {
    if (node.hidden) return;
    node.hidden = true;
    document.documentElement.classList.remove('pv-open');
    stage.removeEventListener('pointerdown', down);
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerup', up);
    stage.removeEventListener('pointercancel', up);
    stage.removeEventListener('wheel', wheel);
    window.removeEventListener('keydown', key, true);
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('resize', fit);
    document.removeEventListener('gesturestart', noGesture);
    node.querySelector('.pv-close').onclick = null;
    node.querySelector('.pv-prev').onclick = null;
    node.querySelector('.pv-next').onclick = null;
    thumbs.onclick = null;
    if (!fromHistory && history.state?.photoViewer) history.back();
    opener?.focus?.({ preventScroll: true });
  }

  const opener = document.activeElement;
  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('keydown', key, true);
  window.addEventListener('resize', fit);
  document.addEventListener('gesturestart', noGesture);
  node.querySelector('.pv-close').onclick = () => close();
  node.querySelector('.pv-prev').onclick = prev;
  node.querySelector('.pv-next').onclick = next;
  thumbs.onclick = pick;

  history.pushState({ ...(history.state || {}), photoViewer: true }, '', window.location.href);
  window.addEventListener('popstate', onPop);
  node.hidden = false;
  document.documentElement.classList.add('pv-open');
  show(start);
  node.querySelector('.pv-close').focus({ preventScroll: true });
}
