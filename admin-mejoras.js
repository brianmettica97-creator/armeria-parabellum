// Mejoras por lanzar (panel). Dos partes:
//
// 1) Pestaña "Novedades": SOLO la ven los desarrolladores (tabla `desarrolladores`
//    en Supabase). Cada mejora tiene tres estados: apagada · solo nosotros · lanzada.
//    El permiso real lo da la base (RLS): aunque alguien muestre la pestaña a mano,
//    no ve las mejoras sin lanzar ni puede cambiarlas.
// 2) "Video automático" dentro del editor de producto (mejora `video-producto`):
//    aparece si la mejora está lanzada, o si está en "solo nosotros" y entró un desarrollador.
//
// Si todavía no se corrió el SQL 20261111000000_mejoras.sql, no aparece nada.
import { crearReel, grabarReel, tituloDe, MAX_PUNTOS } from './video-reel.js?v=20261111a';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const ESTADOS = [
  ['apagada', 'Apagada', 'No existe para nadie.'],
  ['interna', 'Solo nosotros', 'La ven y la prueban solo los desarrolladores.'],
  ['lanzada', 'Lanzada', 'La ve el equipo de la armería en el panel y el público en el sitio.'],
];

let sb = null, toast = () => {};
let esDev = false;
let mejoras = [];

/** true si la mejora se puede usar en este panel con el usuario que entró. */
export function mejoraActiva(id) {
  const estado = mejoras.find(m => m.id === id)?.estado;
  return estado === 'lanzada' || (estado === 'interna' && esDev);
}

export async function initMejoras(client, { notify }) {
  sb = client; toast = notify;
  const [dev, lista] = await Promise.all([sb.rpc('es_dev'), sb.from('mejoras').select('*').order('nombre')]);
  esDev = !dev.error && dev.data === true;
  mejoras = lista.error ? [] : (lista.data || []);
  $('#devTab').hidden = !esDev;
  if (esDev) renderMejoras();
  aplicarVideo();
}

function renderMejoras() {
  $('#devList').innerHTML = mejoras.length ? mejoras.map(m => `
    <article class="adm-card mejora" data-id="${esc(m.id)}">
      <div class="mejora-head">
        <div><h3>${esc(m.nombre)}</h3><p class="muted">${esc(m.descripcion || '')}</p></div>
        <span class="tag ${m.estado === 'lanzada' ? 'ok' : m.estado === 'interna' ? 'gold' : 'off'}">${esc(ESTADOS.find(e => e[0] === m.estado)?.[1] || m.estado)}</span>
      </div>
      <div class="mejora-states" role="group" aria-label="Estado de ${esc(m.nombre)}">
        ${ESTADOS.map(([id, label]) => `<button type="button" class="${m.estado === id ? 'active' : ''}" data-estado="${id}">${label}</button>`).join('')}
      </div>
      <p class="hint">${esc(ESTADOS.find(e => e[0] === m.estado)?.[2] || '')}</p>
    </article>`).join('') : '<p class="empty">No hay mejoras cargadas. Correr el SQL 20261111000000_mejoras.sql en Supabase.</p>';
}

$('#devList').addEventListener('click', async event => {
  const button = event.target.closest('[data-estado]');
  if (!button || button.classList.contains('active')) return;
  const id = button.closest('.mejora').dataset.id;
  const estado = button.dataset.estado;
  const mejora = mejoras.find(m => m.id === id);
  // Lanzar pide confirmación: es lo único que ve el cliente y el público.
  if (estado === 'lanzada' && button.dataset.confirm !== 'yes') { button.dataset.confirm = 'yes'; button.textContent = '¿Lanzar? Tocá de nuevo'; return; }
  const { data, error } = await sb.from('mejoras').update({ estado }).eq('id', id).select().single();
  if (error || !data) { toast(`No se pudo cambiar: ${error?.message || 'sin permiso'}`, true); renderMejoras(); return; }
  Object.assign(mejora, data);
  renderMejoras();
  aplicarVideo();
  toast(`“${mejora.nombre}”: ${ESTADOS.find(e => e[0] === estado)[1].toLowerCase()}.`);
});

// ─────────────────────────── Video automático (editor) ───────────────────────────
let puntos = [];        // [{x, y}] entre 0 y 1 sobre la foto principal
let fotoSrc = '';       // foto principal actual del editor
let reel = null;
let grabando = false;
let datosTitulo = () => ({ nombre: '', marca: '' });

function aplicarVideo() {
  const activa = mejoraActiva('video-producto');
  $('#videoSection').hidden = !activa;
  $('#videoFlag').hidden = mejoras.find(m => m.id === 'video-producto')?.estado !== 'interna';
}

/** Conecta el editor de producto: getTitle() devuelve { nombre, marca } del formulario. */
export function initVideoEditor({ getTitle }) { datosTitulo = getTitle; }

/** Al abrir un producto: carga sus puntos guardados. */
export function videoLoad(video, mainSrc) {
  fotoSrc = mainSrc || '';
  puntos = video?.foto === fotoSrc && Array.isArray(video?.puntos) ? video.puntos.slice(0, MAX_PUNTOS).map(p => ({ x: p.x, y: p.y })) : [];
  detener();
  renderVideo();
}
/** Al cambiar las fotos: si cambió la principal, los puntos ya no sirven. */
export function videoPhotoChanged(mainSrc) {
  if ((mainSrc || '') === fotoSrc) return;
  fotoSrc = mainSrc || '';
  puntos = [];
  detener();
  renderVideo();
}
/** Lo que se guarda en el producto, o undefined si la mejora no está activa (no se toca la columna). */
export function videoValue() {
  if (!mejoraActiva('video-producto')) return undefined;
  return puntos.length && fotoSrc ? { foto: fotoSrc, puntos: puntos.map(p => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) })) } : null;
}

function detener() {
  reel?.stop(); reel = null;
  $('#vidCanvas').hidden = true; $('#vidPhoto').hidden = false;
  $('#vidPlay').textContent = '▶ Ver video';
}

function renderVideo() {
  const has = Boolean(fotoSrc);
  $('#vidEmpty').hidden = has;
  $('#vidBody').hidden = !has;
  if (!has) return;
  const img = $('#vidPhoto img');
  if (img.getAttribute('src') !== fotoSrc) img.src = fotoSrc;
  $('#vidPts').innerHTML = puntos.map((p, i) => `<span style="left:${p.x * 100}%;top:${p.y * 100}%">${i + 1}</span>`).join('');
  $('#vidCount').textContent = puntos.length
    ? `${puntos.length} de ${MAX_PUNTOS} detalles marcados${puntos.length < 3 ? ' · conviene marcar al menos 3' : ''}`
    : 'Tocá la foto para marcar el primer detalle (boca del cañón, gatillo, empuñadura…).';
  ['#vidPlay', '#vidDownload', '#vidUndo', '#vidClear'].forEach(sel => { $(sel).disabled = !puntos.length || grabando; });
}

$('#vidPhoto').addEventListener('click', event => {
  if (grabando) return;
  const img = $('#vidPhoto img');
  const box = img.getBoundingClientRect();
  if (!box.width || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) return;
  if (puntos.length >= MAX_PUNTOS) { toast(`Hasta ${MAX_PUNTOS} detalles por video.`, true); return; }
  puntos.push({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height });
  renderVideo();
});
$('#vidUndo').addEventListener('click', () => { puntos.pop(); renderVideo(); });
$('#vidClear').addEventListener('click', () => { puntos = []; renderVideo(); });

const opciones = () => { const { nombre, marca } = datosTitulo(); return { foto: fotoSrc, puntos, ...tituloDe(nombre, marca) }; };

$('#vidPlay').addEventListener('click', async () => {
  if (reel) { detener(); return; }
  $('#vidPhoto').hidden = true; $('#vidCanvas').hidden = false;
  $('#vidPlay').textContent = '■ Volver a la foto';
  try { reel = await crearReel($('#vidCanvas'), opciones()); reel.play(); }
  catch (error) { detener(); toast(error.message, true); }
});

$('#vidDownload').addEventListener('click', async () => {
  if (grabando) return;
  detener();
  grabando = true; renderVideo();
  $('#vidPhoto').hidden = true; $('#vidCanvas').hidden = false;
  const msg = $('#vidMsg');
  try {
    const { blob, ext } = await grabarReel($('#vidCanvas'), opciones(), p => { msg.textContent = `Grabando el video… ${Math.round(p * 100)}% (no cierres esta ventana)`; });
    const { nombre } = datosTitulo();
    const slug = String(nombre || 'producto').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'producto';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `video-${slug}.${ext}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    msg.textContent = ext === 'mp4' ? 'Video descargado.' : 'Video descargado en formato WebM. Para Instagram conviene descargarlo desde Chrome o Safari actualizados, que lo generan en MP4.';
  } catch (error) {
    msg.textContent = '';
    toast(error.message, true);
  }
  grabando = false;
  detener();
  renderVideo();
});

// Al cerrar el editor, el video deja de reproducirse.
$('#editor').addEventListener('close', detener);
