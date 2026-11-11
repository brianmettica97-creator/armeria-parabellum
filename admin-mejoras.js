// Mejoras por lanzar (panel). Dos partes:
//
// 1) Pestaña "Novedades": SOLO la ven los desarrolladores (tabla `desarrolladores`
//    en Supabase). Cada mejora tiene tres estados: apagada · solo nosotros · lanzada.
//    El permiso real lo da la base (RLS): aunque alguien muestre la pestaña a mano,
//    no ve las mejoras sin lanzar ni puede cambiarlas.
// 2) "Video automático" dentro del editor de producto (mejora `video-producto`):
//    aparece si la mejora está lanzada, o si está en "solo nosotros" y entró un desarrollador.
//
// 3) Pestaña "Etiquetas" (mejora `etiquetas-qr`): hoja imprimible con un QR por producto.
//
// 4) Pestaña "Resultados" (mejora `tablero`): visitas, consultas y uso de cada mejora.
//
// Si todavía no se corrió el SQL 20261111000000_mejoras.sql, no aparece nada.
import { crearReel, grabarReel, tituloDe, MAX_PUNTOS } from './video-reel.js?v=20261111c';
import { qrSvg } from './qr.js?v=20261111b';

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

export async function initMejoras(client, { notify, getProducts, money }) {
  sb = client; toast = notify; productos = getProducts; formatMoney = money;
  const [dev, lista] = await Promise.all([sb.rpc('es_dev'), sb.from('mejoras').select('*').order('nombre')]);
  esDev = !dev.error && dev.data === true;
  mejoras = lista.error ? [] : (lista.data || []);
  $('#devTab').hidden = !esDev;
  if (esDev) renderMejoras();
  aplicarVideo();
  aplicarEtiquetas();
  aplicarTablero();
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
  aplicarEtiquetas();
  aplicarTablero();
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

// ─────────────────────────── Etiquetas con QR ───────────────────────────
let productos = () => [];
let formatMoney = value => String(value);
const marcados = new Set();
const estadoDe = id => mejoras.find(m => m.id === id)?.estado;

function aplicarEtiquetas() {
  const activa = mejoraActiva('etiquetas-qr');
  $('#labelsTab').hidden = !activa;
  $('#labelsFlag').hidden = estadoDe('etiquetas-qr') !== 'interna';
  // Si se apagó mientras se estaba mirando, se vuelve al listado.
  if (!activa && !$('#labelsView').hidden) document.querySelector('#admTabs [data-tab="listView"]').click();
}

// &o=qr: el sitio anota que la visita llegó por una etiqueta (tablero de resultados).
const fichaUrl = row => new URL(`${row.sector === 'camping' ? 'camping' : 'armeria'}.html?producto=${encodeURIComponent(row.id)}&o=qr`, location.href).href;
const visibles = () => {
  const q = $('#labelSearch').value.trim().toLowerCase();
  const sector = $('#labelSector').value;
  return productos().filter(row => row.published && (!sector || row.sector === sector)
    && (!q || [row.name, row.brand, row.code].some(v => String(v || '').toLowerCase().includes(q))));
};

/** Dibuja la lista para elegir y la hoja de etiquetas. La llama el panel al abrir la pestaña. */
export function renderLabels() {
  if (!mejoraActiva('etiquetas-qr')) return;
  const all = productos();
  [...marcados].forEach(id => { if (!all.some(row => row.id === id && row.published)) marcados.delete(id); });
  const rows = visibles();
  $('#labelPick').innerHTML = rows.length ? rows.map(row => `
    <label class="label-row">
      <input type="checkbox" data-label="${esc(row.id)}"${marcados.has(row.id) ? ' checked' : ''}>
      <img src="${esc(row.photo?.thumb || row.photo?.src || 'assets/placeholder-producto.svg')}" alt="" loading="lazy" onerror="this.src='assets/placeholder-producto.svg'">
      <span><b>${esc(row.name)}</b><small>${esc([row.brand, row.caliber, row.code].filter(Boolean).join(' · '))}</small></span>
      <span class="price">${row.price == null ? 'Consultar' : esc(formatMoney(row.price))}</span>
    </label>`).join('') : '<p class="empty">No hay productos publicados con ese filtro.</p>';
  renderSheet();
}

function renderSheet() {
  const conPrecio = $('#labelPrice').checked;
  const rows = productos().filter(row => marcados.has(row.id) && row.published);
  $('#labelInfo').textContent = `${marcados.size} etiqueta${marcados.size === 1 ? '' : 's'} elegida${marcados.size === 1 ? '' : 's'}${marcados.size ? ` · ${Math.ceil(marcados.size / 21)} hoja${marcados.size > 21 ? 's' : ''} A4` : ''}`;
  $('#labelPrint').disabled = !rows.length;
  $('#labelPreviewTitle').hidden = !rows.length;
  $('#labelSheet').innerHTML = rows.map(row => `
    <div class="label">
      <div class="label-qr">${qrSvg(fichaUrl(row))}</div>
      <div class="label-text">
        <img src="assets/new/logo-sello.png" alt="Armería Parabellum">
        <b>${esc(row.name)}</b>
        <small>${esc([row.brand, row.caliber].filter(Boolean).join(' · '))}</small>
        ${conPrecio ? `<strong>${row.price == null ? 'Consultar precio' : esc(formatMoney(row.price))}</strong>` : ''}
        <em>Escaneá y mirá la ficha</em>
      </div>
    </div>`).join('');
}

$('#labelPick').addEventListener('change', event => {
  const box = event.target.closest('[data-label]');
  if (!box) return;
  if (box.checked) marcados.add(box.dataset.label); else marcados.delete(box.dataset.label);
  renderSheet();
});
['#labelSearch', '#labelSector'].forEach(sel => $(sel).addEventListener('input', renderLabels));
$('#labelPrice').addEventListener('change', renderSheet);
$('#labelAll').addEventListener('click', () => { visibles().forEach(row => marcados.add(row.id)); renderLabels(); });
$('#labelNone').addEventListener('click', () => { marcados.clear(); renderLabels(); });
$('#labelPrint').addEventListener('click', () => window.print());

// ─────────────────────────── Tablero de resultados ───────────────────────────
function aplicarTablero() {
  const activa = mejoraActiva('tablero');
  $('#statsTab').hidden = !activa;
  $('#statsFlag').hidden = estadoDe('tablero') !== 'interna';
  if (!activa && !$('#statsView').hidden) document.querySelector('#admTabs [data-tab="listView"]').click();
}

const num = value => new Intl.NumberFormat('es-AR').format(value || 0);
const kpi = (label, value, note = '') => `<div class="stats-kpi"><span>${esc(label)}</span><b>${esc(value)}</b>${note ? `<small>${esc(note)}</small>` : ''}</div>`;

// Barras por día (visitas, fichas y consultas), dibujadas en SVG sin librerías.
function chartSvg(days) {
  const W = 960, H = 220, left = 34, bottom = 22, top = 8;
  const max = Math.max(1, ...days.map(d => Math.max(d.visita, d.ficha, d.whatsapp)));
  const step = (W - left) / days.length;
  const bar = Math.max(1.5, Math.min(12, (step - 3) / 3));
  const y = value => top + (H - top - bottom) * (1 - value / max);
  const every = Math.ceil(days.length / 10);
  const grid = [0, 0.5, 1].map(f => `<line x1="${left}" x2="${W}" y1="${y(max * f)}" y2="${y(max * f)}" class="g"/><text x="${left - 6}" y="${y(max * f) + 4}" text-anchor="end">${Math.round(max * f)}</text>`).join('');
  const bars = days.map((d, i) => {
    const x = left + i * step + (step - bar * 3) / 2;
    const label = i % every === 0 ? `<text x="${left + i * step + step / 2}" y="${H - 6}" text-anchor="middle">${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}</text>` : '';
    return ['visita', 'ficha', 'whatsapp'].map((key, k) => `<rect class="k-${key}" x="${(x + k * bar).toFixed(1)}" y="${y(d[key]).toFixed(1)}" width="${Math.max(1, bar - 0.6).toFixed(1)}" height="${(H - bottom - y(d[key])).toFixed(1)}"><title>${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)} · ${key === 'visita' ? 'Visitas' : key === 'ficha' ? 'Fichas vistas' : 'Consultas'}: ${d[key]}</title></rect>`).join('') + label;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitas, fichas vistas y consultas por día">${grid}${bars}</svg>`;
}

const ranking = rows => (rows.length ? `<ol class="stats-rank">${rows.map(row => `<li><span>${esc(row.nombre)}</span><b>${num(row.n)}</b><i style="width:${Math.round(row.n / rows[0].n * 100)}%"></i></li>`).join('')}</ol>` : '<p class="empty">Todavía no hay datos en este período.</p>');

let statsBusy = false;
/** Carga y dibuja el tablero. La llama el panel al abrir la pestaña. */
export async function renderStats() {
  if (!mejoraActiva('tablero') || statsBusy) return;
  statsBusy = true;
  const dias = Number($('#statsDays').value) || 30;
  $('#statsInfo').textContent = 'Cargando…';
  const { data, error } = await sb.rpc('tablero_resumen', { dias });
  statsBusy = false;
  if (error || !data) {
    $('#statsInfo').textContent = /tablero_resumen|does not exist|schema cache/i.test(error?.message || '')
      ? 'Falta correr el SQL 20261111020000_tablero.sql en Supabase.'
      : `No se pudieron cargar los resultados: ${error?.message || 'sin datos'}`;
    return;
  }
  const t = { visita: 0, ficha: 0, whatsapp: 0, asistente: 0, video: 0, qr: 0, ...data.totales };
  // Se completan con cero los días sin movimiento, para que el gráfico no tenga huecos.
  const byDay = new Map((data.por_dia || []).map(d => [d.dia, d]));
  const days = Array.from({ length: dias }, (_, i) => {
    const dia = new Date(Date.now() - (dias - 1 - i) * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    return { dia, visita: 0, ficha: 0, whatsapp: 0, ...byDay.get(dia) };
  });
  $('#statsInfo').textContent = t.visita ? `Últimos ${dias} días · actualizado ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : 'Todavía no hay visitas registradas en este período.';
  $('#statsKpis').innerHTML = [
    kpi('Visitas al catálogo', num(t.visita), `${num(data.visitantes)} visitas distintas`),
    kpi('Fichas vistas', num(t.ficha), t.visita ? `${(t.ficha / t.visita).toFixed(1)} por visita` : ''),
    kpi('Consultas por WhatsApp', num(t.whatsapp)),
    kpi('De cada 100 visitas, consultan', t.visita ? `${Math.round(t.whatsapp / t.visita * 100)}` : '—'),
  ].join('');
  $('#statsChart').innerHTML = chartSvg(days);
  $('#statsAsked').innerHTML = ranking(data.top_consultados || []);
  $('#statsSeen').innerHTML = ranking(data.top_vistos || []);
  $('#statsMejoras').innerHTML = [
    kpi('Video automático', num(t.video), 'reproducciones'),
    kpi('Asistente "¿Qué me conviene?"', num(t.asistente), 'veces completado'),
    kpi('Etiquetas con QR', num(t.qr), 'escaneos en el local'),
  ].join('');
}
$('#statsDays').addEventListener('change', renderStats);
$('#statsReload').addEventListener('click', renderStats);
