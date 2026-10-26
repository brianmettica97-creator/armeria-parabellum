// Panel de productos de Armería Parabellum (admin.html).
// Usa Supabase: Auth para el ingreso, la tabla `productos` y el depósito de
// fotos `productos`. Los permisos reales los controla la base (RLS): aunque
// alguien abra esta página, sin estar en la lista de admins no puede escribir.
import { getSupabase, supabaseConfigured } from './supabase-client.js';
import { sectors, findCategory, findSubcategory, brands, gunBrands, calibers } from './taxonomy.js?v=20261026c';
import { COLUMNS, TEMPLATE_ROWS, analyze, decodeText, parseCsv, parseMoney } from './admin-planilla.js?v=20261026c';

const BUCKET = 'productos';
const MAX_SIDE = 1600;       // px del lado mayor después de achicar
const JPEG_QUALITY = 0.82;
const WEBP_QUALITY = 0.8;
const THUMB_SIDE = 640;      // px de la versión chica para tarjetas
const THUMB_QUALITY = 0.75;

const $ = selector => document.querySelector(selector);
const views = ['loginView', 'recoveryView', 'deniedView', 'listView', 'photosView', 'contactsView'];
const tabViews = ['listView', 'photosView', 'contactsView'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(value);

let sb = null;
let all = [];
let editing = null;   // fila original (null = nuevo)
let photos = [];      // [{src, own?, author?, license?, sourceUrl?, exact?, path?}]
let pendingUploads = 0;
let draftId = '';      // id reservado para un producto nuevo (carpeta de sus fotos)
// Se lee antes de iniciar Supabase, que limpia la dirección al procesarla.
const isRecovery = location.hash.includes('type=recovery');

function show(id) {
  views.forEach(view => { $(`#${view}`).hidden = view !== id; });
  $('#admTabs').hidden = !tabViews.includes(id);
  document.querySelectorAll('#admTabs [data-tab]').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === id));
  if (id === 'photosView') {
    renderPending(true);
    if (!nativeWebp) loadWasmWebp().catch(() => {});
  }
}
function toast(text, error = false) {
  const node = $('#toast');
  node.textContent = text; node.className = `toast${error ? ' err' : ''}`; node.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.hidden = true; }, 3500);
}
function setMsg(node, text, kind = '') { node.textContent = text; node.className = `msg ${kind}`; }

// ─────────────────────────── Ingreso ───────────────────────────
async function start() {
  if (!supabaseConfigured) { show('deniedView'); $('#deniedView p').textContent = 'Supabase no está configurado en supabase-config.js.'; return; }
  sb = await getSupabase();
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { show('recoveryView'); return; }
    if (event === 'SIGNED_OUT') { $('#userBox').hidden = true; show('loginView'); }
    if (event === 'SIGNED_IN' && session && !isRecovery) enter(session);
  });
  const { data } = await sb.auth.getSession();
  if (isRecovery) show('recoveryView');
  else if (data.session) enter(data.session);
  else show('loginView');
}

let entered = false;
async function enter(session) {
  if (entered) return; entered = true;
  $('#userEmail').textContent = session.user.email;
  $('#userBox').hidden = false;
  const { data: isAdmin, error } = await sb.rpc('es_admin');
  if (error || !isAdmin) { entered = false; show('deniedView'); return; }
  show('listView');
  await loadList();
  loadContacts();
}

$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const msg = $('#loginMsg');
  setMsg(msg, 'Ingresando…');
  const { data, error } = await sb.auth.signInWithPassword({ email: $('#loginEmail').value.trim(), password: $('#loginPass').value });
  if (error) { setMsg(msg, error.message.includes('Invalid') ? 'Email o contraseña incorrectos.' : error.message, 'err'); return; }
  setMsg(msg, '');
  enter(data.session);
});

$('#forgotBtn').addEventListener('click', async () => {
  const msg = $('#loginMsg');
  const email = $('#loginEmail').value.trim();
  if (!email) { setMsg(msg, 'Escribí tu email arriba y volvé a tocar “Olvidé mi contraseña”.', 'err'); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
  setMsg(msg, error ? error.message : 'Si el email está registrado, te llega un enlace para crear una contraseña nueva.', error ? 'err' : 'ok');
});

$('#recoveryForm').addEventListener('submit', async event => {
  event.preventDefault();
  const msg = $('#recoveryMsg');
  const { error } = await sb.auth.updateUser({ password: $('#newPass').value });
  if (error) { setMsg(msg, error.message, 'err'); return; }
  setMsg(msg, 'Contraseña guardada.', 'ok');
  history.replaceState(null, '', location.pathname);
  const { data } = await sb.auth.getSession();
  if (data.session) enter(data.session);
});

$('#logoutBtn').addEventListener('click', async () => { entered = false; await sb.auth.signOut(); });

// ─────────────────────────── Listado ───────────────────────────
async function loadList() {
  $('#list').innerHTML = '<p class="empty">Cargando…</p>';
  const { data, error } = await sb.from('productos').select('*').order('updated_at', { ascending: false });
  if (error) { $('#list').innerHTML = `<p class="empty">No se pudo cargar: ${esc(error.message)}</p>`; return; }
  all = data;
  renderList();
}

const ownPhoto = row => Boolean(row.photo?.own);
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
// Posición del calibre en la lista del comercio; los que no figuran van al final.
const caliberRank = value => {
  const index = calibers.findIndex(c => same(c, value));
  return index >= 0 ? index : value ? calibers.length : calibers.length + 1;
};
const byText = (a, b) => (a ? (b ? a.localeCompare(b, 'es', { sensitivity: 'base' }) : -1) : (b ? 1 : 0));
const sorters = {
  marca: (a, b) => byText(a.brand, b.brand) || byText(a.name, b.name),
  calibre: (a, b) => caliberRank(a.caliber) - caliberRank(b.caliber) || byText(a.caliber, b.caliber) || byText(a.brand, b.brand) || byText(a.name, b.name),
  nombre: (a, b) => byText(a.name, b.name),
};

// Desplegables de marca y calibre del listado, armados con lo que hay cargado.
function fillListFilters() {
  const unique = values => values.filter(Boolean).map(v => v.trim()).filter((v, i, list) => list.findIndex(o => same(o, v)) === i);
  const options = (select, first, values) => {
    const current = select.value;
    select.innerHTML = `<option value="">${first}</option>${values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}`;
    select.value = values.find(v => same(v, current)) || '';
  };
  options($('#brandFilter'), 'Todas las marcas', unique(all.map(row => row.brand)).sort(byText));
  options($('#caliberFilter'), 'Todos los calibres', unique(all.map(row => row.caliber)).sort((a, b) => caliberRank(a) - caliberRank(b) || byText(a, b)));
}

function renderList() {
  fillListFilters();
  updatePendingCount();
  const q = $('#search').value.trim().toLowerCase();
  const sector = $('#sectorFilter').value;
  const state = $('#stateFilter').value;
  const brand = $('#brandFilter').value;
  const caliber = $('#caliberFilter').value;
  const sort = $('#sortList').value;
  const rows = all.filter(row => {
    if (sector && row.sector !== sector) return false;
    if (brand && !same(row.brand, brand)) return false;
    if (caliber && !same(row.caliber, caliber)) return false;
    if (state === 'publicados' && !row.published) return false;
    if (state === 'ocultos' && row.published) return false;
    if (state === 'sinfoto' && ownPhoto(row)) return false;
    if (state === 'sinprecio' && row.price != null) return false;
    if (state === 'ofertas' && !row.offer_active) return false;
    if (state === 'usados' && row.condition !== 'usado') return false;
    if (q && ![row.name, row.brand, row.code].some(v => String(v || '').toLowerCase().includes(q))) return false;
    return true;
  });
  if (sorters[sort]) rows.sort(sorters[sort]);
  $('#listCount').textContent = `${rows.length} de ${all.length} productos`;
  // Al ordenar por marca o calibre, el listado se agrupa con un título por grupo.
  const groupOf = { marca: row => row.brand?.trim() || 'Sin marca', calibre: row => row.caliber?.trim() || 'Sin calibre' }[sort];
  const counts = new Map();
  if (groupOf) rows.forEach(row => { const key = groupOf(row).toLowerCase(); counts.set(key, (counts.get(key) || 0) + 1); });
  $('#list').innerHTML = rows.length ? rows.map((row, index) => {
    const group = groupOf?.(row);
    const header = group && (index === 0 || !same(groupOf(rows[index - 1]), group))
      ? `<h3 class="group">${esc(group)} <span>${counts.get(group.toLowerCase())}</span></h3>` : '';
    const category = findCategory(row.sector, row.category);
    const sub = findSubcategory(row.sector, row.category, row.subcategory);
    const tags = [
      !row.published && '<span class="tag off">Oculto</span>',
      row.offer_active && '<span class="tag gold">Oferta</span>',
      row.is_new && '<span class="tag gold">Ingreso</span>',
      row.condition === 'usado' && '<span class="tag">Usado</span>',
      row.availability === 'agotado' && '<span class="tag off">Agotado</span>',
      !ownPhoto(row) && '<span class="tag">Foto de referencia</span>',
    ].filter(Boolean).join('');
    return `${header}<button type="button" class="item" data-id="${esc(row.id)}">
      <img src="${esc(row.photo?.thumb || row.photo?.src || 'assets/placeholder-producto.svg')}" alt="" loading="lazy" onerror="this.src='assets/placeholder-producto.svg'">
      <div><h4>${esc(row.name)}</h4><p>${esc([row.brand, sub?.label || category?.label, row.caliber].filter(Boolean).join(' · '))}</p><div class="tags">${tags}</div></div>
      <span class="price">${row.price == null ? 'Consultar' : money(row.price)}</span>
    </button>`;
  }).join('') : '<p class="empty">No hay productos con ese filtro.</p>';
}
['#search', '#sectorFilter', '#stateFilter', '#brandFilter', '#caliberFilter', '#sortList'].forEach(sel => $(sel).addEventListener('input', renderList));
$('#list').addEventListener('click', event => {
  const item = event.target.closest('.item');
  if (item) openEditor(all.find(row => row.id === item.dataset.id));
});
$('#newBtn').addEventListener('click', () => openEditor(null));

// ─────────────────────────── Editor ───────────────────────────
const f = id => $(`#f_${id}`);
$('#brandList').innerHTML = [...new Set(brands.map(b => b.name))].map(name => `<option value="${esc(name)}">`).join('');

function fillCategories(selected) {
  const cats = sectors[f('sector').value].categories;
  f('category').innerHTML = cats.map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
  if (selected && cats.some(c => c.id === selected)) f('category').value = selected;
  fillSubcategories();
}
function fillSubcategories(selected) {
  const cat = findCategory(f('sector').value, f('category').value);
  const subs = cat?.subcategories || [];
  $('#subWrap').hidden = !subs.length;
  f('subcategory').innerHTML = subs.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
  if (selected && subs.some(s => s.id === selected)) f('subcategory').value = selected;
  updateRegulated();
}
function categoryRegulated() {
  const cat = findCategory(f('sector').value, f('category').value);
  const sub = findSubcategory(f('sector').value, f('category').value, f('subcategory').value);
  return Boolean(sub?.regulated ?? cat?.regulated);
}
function updateRegulated() {
  const forced = categoryRegulated();
  $('#regulatedHint').hidden = !forced;
  if (!forced && f('regulated').disabled) f('regulated').checked = false; // venía de una categoría controlada
  f('regulated').disabled = forced;
  if (forced) f('regulated').checked = true;
  $('#caliberWrap').hidden = f('sector').value !== 'armeria';
  updatePicks();
}

// Marca y calibre: desplegable con la lista del comercio + "Otra…" para
// escribir a mano. El valor que se guarda es siempre el del campo de texto.
const OTHER = '__otra';
function setPick(name, options, otherLabel) {
  const select = f(`${name}Pick`);
  const input = f(name);
  const value = input.value.trim();
  select.hidden = !options;
  if (!options) { input.hidden = false; return; }
  const match = options.find(option => same(option, value));
  select.innerHTML = `<option value="">— Elegir —</option>${options.map(option => `<option value="${esc(option)}">${esc(option)}</option>`).join('')}<option value="${OTHER}">${otherLabel}</option>`;
  select.value = match || (value ? OTHER : '');
  input.value = match || value;
  input.hidden = select.value !== OTHER;
}
function updatePicks() {
  const armas = f('sector').value === 'armeria' && f('category').value === 'armas';
  setPick('brand', armas ? gunBrands : null, 'Otra marca…');
  setPick('caliber', calibers, 'Otro calibre…');
}
['brand', 'caliber'].forEach(name => f(`${name}Pick`).addEventListener('change', () => {
  const other = f(`${name}Pick`).value === OTHER;
  f(name).value = other ? '' : f(`${name}Pick`).value;
  f(name).hidden = !other;
  if (other) f(name).focus();
}));
function updateConditional() {
  const used = f('condition').value === 'usado';
  $('#gradeWrap').hidden = !used; $('#notesWrap').hidden = !used;
  $('#prevWrap').hidden = !f('offer').checked;
}
f('sector').addEventListener('change', () => fillCategories());
f('category').addEventListener('change', () => fillSubcategories());
f('subcategory').addEventListener('change', updateRegulated);
f('condition').addEventListener('change', updateConditional);
f('offer').addEventListener('change', updateConditional);

// preset: datos que se mantienen al usar "Guardar y cargar otro".
function openEditor(row, preset = null) {
  editing = row;
  const base = row || preset;
  draftId = row ? '' : `producto-${Date.now().toString(36)}`;
  $('#edTitle').textContent = row ? 'Editar producto' : 'Nuevo producto';
  setMsg($('#edMsg'), '');
  $('#confirmBox').hidden = true;
  f('name').value = row?.name || '';
  f('brand').value = base?.brand || '';
  f('code').value = row?.code || '';
  f('caliber').value = base?.caliber || '';
  f('sector').value = base?.sector || $('#sectorFilter').value || 'armeria';
  fillCategories(base?.category);
  fillSubcategories(base?.subcategory);
  f('short').value = row?.short_description || '';
  f('description').value = row?.description || '';
  f('price').value = row?.price ?? '';
  f('availability').value = row?.availability || 'disponible';
  f('stock').value = row?.stock ?? '';
  f('offer').checked = Boolean(row?.offer_active);
  f('prev').value = row?.previous_price ?? '';
  f('condition').value = base?.condition || 'nuevo';
  f('grade').value = row?.condition_grade || '';
  f('notes').value = row?.condition_notes || '';
  f('new').checked = row ? Boolean(row.is_new) : true;
  f('published').checked = row ? row.published !== false : true;
  f('regulated').disabled = false;
  f('regulated').checked = Boolean(row?.regulated);
  updateRegulated();
  photos = [row?.photo, ...(Array.isArray(row?.photos) ? row.photos : [])].filter(p => p?.src);
  renderPhotos();
  updateConditional();
  $('#deleteBtn').hidden = !row;
  $('#viewLink').hidden = !row;
  $('#saveNextBtn').hidden = Boolean(row);
  if (row) $('#viewLink').href = `${row.sector === 'camping' ? 'camping' : 'armeria'}.html?producto=${encodeURIComponent(row.id)}`;
  $('#editor').showModal();
  $('#editor').scrollTop = 0;
}
$('#editor').addEventListener('click', event => { if (event.target.closest('[data-close]')) $('#editor').close(); });

// ─────────────────────────── Fotos ───────────────────────────
function renderPhotos() {
  $('#photoList').innerHTML = photos.map((photo, index) => `
    <div class="photo${index === 0 ? ' main' : ''}">
      ${index === 0 ? '<span class="badge">Principal</span>' : ''}
      <img src="${esc(photo.thumb || photo.src)}" alt="Foto ${index + 1}">
      <div class="acts">
        ${index > 0 ? `<button type="button" data-main="${index}">★ Principal</button>` : ''}
        <button type="button" data-remove="${index}">Quitar</button>
      </div>
    </div>`).join('') + (pendingUploads ? Array.from({ length: pendingUploads }, () => '<div class="photo loading">Subiendo…</div>').join('') : '')
    + (!photos.length && !pendingUploads ? '<p class="hint">Sin fotos: el sitio muestra una imagen genérica.</p>' : '');
}
$('#photoList').addEventListener('click', event => {
  const main = event.target.closest('[data-main]');
  const remove = event.target.closest('[data-remove]');
  if (main) { const [p] = photos.splice(Number(main.dataset.main), 1); photos.unshift(p); renderPhotos(); }
  if (remove) { photos.splice(Number(remove.dataset.remove), 1); renderPhotos(); }
});

// WebP pesa ~30% menos que JPG con la misma calidad. Safari (el iPhone) no
// sabe generarlo desde un canvas, así que ahí se usa el codificador oficial
// de libwebp compilado a WebAssembly; si no carga, se sube en JPG.
const nativeWebp = (() => { const c = document.createElement('canvas'); c.width = c.height = 1; return c.toDataURL('image/webp').startsWith('data:image/webp'); })();
const WEBP_WASM = 'https://cdn.jsdelivr.net/npm/@jsquash/webp@1.5.0/';
let wasmWebp = null;
function loadWasmWebp() {
  wasmWebp ||= (async () => {
    const { defaultOptions } = await import(`${WEBP_WASM}meta.js`);
    for (const file of ['webp_enc_simd.js', 'webp_enc.js']) {
      try {
        const { default: factory } = await import(`${WEBP_WASM}codec/enc/${file}`);
        return { module: await factory({ noInitialRun: true }), defaultOptions };
      } catch { /* sin SIMD: se prueba la versión común */ }
    }
    throw new Error('codificador WebP no disponible');
  })().catch(error => { wasmWebp = null; throw error; });
  return wasmWebp;
}
// Se precarga al abrir el editor en el iPhone para que la primera foto no espere.
if (!nativeWebp) $('#editor').addEventListener('toggle', () => { if ($('#editor').open) loadWasmWebp().catch(() => {}); });

async function encodeCanvas(canvas, quality) {
  if (nativeWebp) {
    const webp = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    if (webp?.type === 'image/webp') return webp;
  } else {
    try {
      const { module, defaultOptions } = await loadWasmWebp();
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const bytes = module.encode(pixels.data, canvas.width, canvas.height, { ...defaultOptions, quality: Math.round(quality * 100) });
      if (bytes) return new Blob([bytes], { type: 'image/webp' });
    } catch { /* se sube en JPG */ }
  }
  const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!jpeg) throw new Error('No se pudo procesar la foto.');
  return jpeg;
}

// Devuelve la foto grande (ficha) y una chica (tarjetas y miniaturas).
async function shrink(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bitmap) throw new Error(`No se pudo leer ${file.name}. Probá con una foto JPG o PNG.`);
  const draw = maxSide => {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  };
  const full = await encodeCanvas(draw(MAX_SIDE), WEBP_QUALITY);
  const thumb = await encodeCanvas(draw(THUMB_SIDE), THUMB_QUALITY);
  bitmap.close?.();
  return { full, thumb };
}

const slug = text => String(text || 'producto').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'producto';
const folderFor = () => editing?.id || draftId;

// Achica la foto y sube sus dos versiones a la carpeta del producto.
async function uploadPhoto(file, folder) {
  const { full, thumb } = await shrink(file);
  const base = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const upload = async (blob, suffix) => {
    const path = `${base}${suffix}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };
  const [src, thumbSrc] = await Promise.all([upload(full, ''), upload(thumb, '-mini')]);
  return { src, thumb: thumbSrc, own: true };
}

$('#photoInput').addEventListener('change', async event => {
  const files = [...event.target.files];
  event.target.value = '';
  pendingUploads += files.length; renderPhotos();
  for (const file of files) {
    try {
      photos.push(await uploadPhoto(file, folderFor()));
    } catch (error) {
      toast(`Foto no subida: ${error.message}`, true);
    } finally {
      pendingUploads -= 1; renderPhotos();
    }
  }
});

// ─────────────────────────── Guardar y borrar ───────────────────────────
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

function collect() {
  const name = f('name').value.trim();
  if (!name) throw new Error('Falta el nombre del producto.');
  const price = parseMoney(f('price').value);
  if (Number.isNaN(price)) throw new Error('El precio no es válido. Escribilo solo con números, por ejemplo 150000.');
  const offer = f('offer').checked;
  const previous = offer ? parseMoney(f('prev').value) : null;
  if (offer && price == null) throw new Error('Para marcar una oferta hace falta cargar el precio.');
  if (Number.isNaN(previous) || (previous != null && previous <= price)) throw new Error('El precio anterior tiene que ser mayor al precio de oferta.');
  const stockText = f('stock').value.trim();
  const stock = stockText === '' ? null : Number(stockText);
  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) throw new Error('El stock tiene que ser un número entero (0, 1, 2…).');
  const used = f('condition').value === 'usado';
  const isNew = f('new').checked;
  const hasSub = !$('#subWrap').hidden;
  const [main, ...extra] = photos.map(({ path, ...photo }) => photo);
  return {
    name,
    brand: f('brand').value.trim() || null,
    code: f('code').value.trim() || null,
    sector: f('sector').value,
    category: f('category').value,
    subcategory: hasSub ? f('subcategory').value : null,
    caliber: f('sector').value === 'armeria' ? (f('caliber').value.trim() || null) : null,
    short_description: f('short').value.trim() || null,
    description: f('description').value.trim() || null,
    price,
    offer_active: offer,
    previous_price: previous,
    stock,
    availability: stock === 0 ? 'agotado' : f('availability').value,
    regulated: categoryRegulated() || f('regulated').checked,
    condition: used ? 'usado' : 'nuevo',
    condition_grade: used ? (f('grade').value || null) : null,
    condition_notes: used ? (f('notes').value.trim() || null) : null,
    is_new: isNew,
    date_added: isNew ? (editing?.is_new && editing?.date_added ? editing.date_added : today()) : (editing?.date_added || null),
    published: f('published').checked,
    photo: main || null,
    photos: extra.length ? extra : null,
  };
}

$('#editForm').addEventListener('submit', async event => {
  event.preventDefault();
  const msg = $('#edMsg');
  if (pendingUploads) { setMsg(msg, 'Esperá a que terminen de subir las fotos.', 'err'); return; }
  let values;
  try { values = collect(); } catch (error) { setMsg(msg, error.message, 'err'); return; }
  const next = event.submitter?.id === 'saveNextBtn' && !editing;
  $('#saveBtn').disabled = $('#saveNextBtn').disabled = true; setMsg(msg, 'Guardando…');
  const query = editing
    ? sb.from('productos').update(values).eq('id', editing.id).select().single()
    : sb.from('productos').insert({ ...values, id: draftId }).select().single();
  const { data, error } = await query;
  $('#saveBtn').disabled = $('#saveNextBtn').disabled = false;
  if (error) { setMsg(msg, `No se pudo guardar: ${error.message}`, 'err'); return; }
  // Borra del depósito las fotos propias que se quitaron del producto.
  const kept = new Set([data.photo?.src, ...(data.photos || []).map(p => p.src)]);
  const marker = `/object/public/${BUCKET}/`;
  const removed = [editing?.photo, ...(editing?.photos || [])]
    .filter(p => p?.own && p.src.includes(marker) && !kept.has(p.src))
    .flatMap(p => [p.src, p.thumb].filter(url => url?.includes(marker)))
    .map(url => decodeURIComponent(url.split(marker)[1].split('?')[0]));
  if (removed.length) sb.storage.from(BUCKET).remove(removed);
  const index = all.findIndex(row => row.id === data.id);
  if (index >= 0) all.splice(index, 1);
  all.unshift(data);
  renderList();
  $('#editor').close();
  if (next) {
    const { sector, category, subcategory, brand, caliber, condition } = data;
    openEditor(null, { sector, category, subcategory, brand, caliber, condition });
    f('name').focus();
    toast(`“${data.name}” guardado. Cargá el siguiente.`);
    return;
  }
  toast(editing ? 'Cambios guardados. En el sitio se ven al recargar la página.' : 'Producto creado.');
});

$('#deleteBtn').addEventListener('click', () => { $('#confirmBox').hidden = false; $('#confirmBox').scrollIntoView({ block: 'end' }); });
$('#confirmNo').addEventListener('click', () => { $('#confirmBox').hidden = true; });
$('#confirmYes').addEventListener('click', async () => {
  if (!editing) return;
  const { error } = await sb.from('productos').delete().eq('id', editing.id);
  if (error) { setMsg($('#edMsg'), `No se pudo borrar: ${error.message}`, 'err'); return; }
  // Borra también las fotos propias guardadas en la carpeta del producto.
  const { data: files } = await sb.storage.from(BUCKET).list(editing.id);
  if (files?.length) await sb.storage.from(BUCKET).remove(files.map(file => `${editing.id}/${file.name}`));
  all = all.filter(row => row.id !== editing.id);
  renderList();
  $('#editor').close();
  toast('Producto borrado.');
});

// ─────────────────────────── Importar planilla ───────────────────────────
// SheetJS (lector de Excel) se carga solo cuando hace falta.
const SHEETJS = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
let sheetjs = null;
const loadSheetJS = () => sheetjs ||= new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = SHEETJS;
  script.onload = () => resolve(window.XLSX);
  script.onerror = () => { sheetjs = null; reject(new Error('No se pudo cargar el lector de Excel. Revisá la conexión o subí la planilla en CSV.')); };
  document.head.append(script);
});
let importRows = [];

$('#importBtn').addEventListener('click', () => {
  importRows = [];
  $('#impPreview').hidden = true; $('#impFoot').hidden = true;
  setMsg($('#impMsg'), '');
  $('#importer').showModal();
  $('#importer').scrollTop = 0;
});
$('#importer').addEventListener('click', event => { if (event.target.closest('[data-close-import]')) $('#importer').close(); });

$('#templateBtn').addEventListener('click', async () => {
  try {
    const XLSX = await loadSheetJS();
    const sheet = XLSX.utils.aoa_to_sheet([COLUMNS.filter(col => !col.optional).map(col => col.label), ...TEMPLATE_ROWS]);
    sheet['!cols'] = [10, 26, 14, 14, 16, 12, 8, 11, 30, 40].map(wch => ({ wch }));
    const types = [...new Set(Object.values(sectors).flatMap(s => s.categories.flatMap(c => c.subcategories.length ? c.subcategories.map(x => x.label) : [c.label])))];
    const help = XLSX.utils.aoa_to_sheet([
      ['Cómo completar la planilla'], [],
      ['Nombre y Tipo son obligatorios. El resto es opcional.'],
      ['Precio: solo números (ej.: 1250000). Vacío = "Consultar precio".'],
      ['Condición: Nuevo o Usado. Vacío = Nuevo.'],
      ['Código: si coincide con uno ya cargado, se actualiza ese producto.'],
      ['Borrá las filas de ejemplo antes de subirla.'], [],
      ['Marcas sugeridas', 'Calibres', 'Tipos'],
      ...Array.from({ length: Math.max(gunBrands.length, calibers.length, types.length) }, (_, i) => [gunBrands[i] || '', calibers[i] || '', types[i] || '']),
    ]);
    help['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 32 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Productos');
    XLSX.utils.book_append_sheet(book, help, 'Ayuda');
    XLSX.writeFile(book, 'modelo-productos-parabellum.xlsx');
  } catch (error) {
    // Sin el lector de Excel, el modelo se descarga en CSV.
    const cell = value => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [COLUMNS.filter(col => !col.optional).map(col => col.label), ...TEMPLATE_ROWS].map(row => row.map(cell).join(';'));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }));
    link.download = 'modelo-productos-parabellum.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
});

$('#sheetInput').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const msg = $('#impMsg');
  setMsg(msg, 'Leyendo la planilla…');
  $('#impPreview').hidden = true; $('#impFoot').hidden = true;
  try {
    const buffer = await file.arrayBuffer();
    let grid;
    if (/\.numbers$/i.test(file.name)) throw new Error('Los archivos de Numbers no se pueden leer directo. En Numbers: Compartir → Exportar → Excel, y subí ese archivo.');
    if (/\.(csv|txt)$/i.test(file.name) || file.type === 'text/csv') grid = parseCsv(decodeText(buffer));
    else {
      const XLSX = await loadSheetJS();
      const book = XLSX.read(buffer, { type: 'array' });
      const sheet = book.Sheets[book.SheetNames[0]];
      // raw: los números llegan como número (sin el formato de moneda de la celda).
      grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    }
    const result = analyze(grid, { existing: all, today: today() });
    if (!result.headerFound || result.missing.length) throw new Error('No encontré las columnas Nombre y Tipo. Usá el modelo descargado (la primera fila tiene que tener los títulos).');
    if (!result.results.length) throw new Error('La planilla no tiene productos cargados.');
    importRows = result.results;
    renderImport();
    setMsg(msg, '');
  } catch (error) {
    setMsg(msg, error.message, 'err');
  }
});

function renderImport() {
  const counts = { nuevo: 0, actualiza: 0, error: 0, igual: 0 };
  importRows.forEach(row => { counts[row.status] += 1; });
  const ready = counts.nuevo + counts.actualiza;
  $('#impSummary').innerHTML = [
    counts.nuevo && `<span class="tag gold">${counts.nuevo} nuevo${counts.nuevo > 1 ? 's' : ''}</span>`,
    counts.actualiza && `<span class="tag ok">${counts.actualiza} se actualiza${counts.actualiza > 1 ? 'n' : ''}</span>`,
    counts.igual && `<span class="tag">${counts.igual} sin cambios</span>`,
    counts.error && `<span class="tag off">${counts.error} con errores (no se importa${counts.error > 1 ? 'n' : ''})</span>`,
  ].filter(Boolean).join(' ');
  const label = { nuevo: 'Nuevo', actualiza: 'Actualiza', error: 'Error', igual: 'Sin cambios' };
  $('#impList').innerHTML = importRows.map(row => {
    const d = row.data || {};
    const changes = row.status === 'actualiza' ? Object.keys(d).filter(k => !['availability', 'regulated', 'sector', 'category', 'condition_grade', 'condition_notes'].includes(k))
      .map(k => ({ name: 'nombre', subcategory: 'tipo', brand: 'marca', caliber: 'calibre', price: 'precio', stock: 'stock', condition: 'condición', short_description: 'desc. corta', description: 'descripción' }[k])).filter(Boolean) : [];
    const detail = row.status === 'nuevo'
      ? [row.typeLabel, d.brand, d.caliber, d.price == null ? 'Consultar precio' : money(d.price), d.stock != null && `stock ${d.stock}`].filter(Boolean).join(' · ')
      : row.status === 'actualiza' ? `Cambia: ${changes.join(', ')}${d.price != null ? ` · ${money(d.price)}` : ''}` : '';
    return `<div class="imp-row is-${row.status}">
      <span class="tag ${row.status === 'error' ? 'off' : row.status === 'nuevo' ? 'gold' : row.status === 'actualiza' ? 'ok' : ''}">${label[row.status]}</span>
      <div><strong>${esc(row.name || '(sin nombre)')}</strong> <small class="muted">fila ${row.line}</small>
        ${detail ? `<p>${esc(detail)}</p>` : ''}
        ${row.errors.map(e => `<p class="err">${esc(e)}</p>`).join('')}
        ${row.notes.map(n => `<p class="note">${esc(n)}</p>`).join('')}
      </div>
    </div>`;
  }).join('');
  $('#impPreview').hidden = false;
  $('#impFoot').hidden = false;
  $('#impConfirm').disabled = !ready;
  $('#impConfirm').textContent = ready ? `Importar ${ready} producto${ready > 1 ? 's' : ''}` : 'Nada para importar';
  $('#impPreview').scrollIntoView({ block: 'start' });
}

$('#impConfirm').addEventListener('click', async () => {
  const msg = $('#impMsg');
  const fresh = importRows.filter(row => row.status === 'nuevo');
  const updates = importRows.filter(row => row.status === 'actualiza');
  $('#impConfirm').disabled = true;
  setMsg(msg, 'Importando…');
  const stamp = Date.now().toString(36);
  const failures = [];
  let created = [];
  if (fresh.length) {
    const { data, error } = await sb.from('productos').insert(fresh.map((row, i) => ({ ...row.data, id: `producto-${stamp}-${i}` }))).select();
    if (error) failures.push(`No se pudieron crear los productos nuevos: ${error.message}`);
    else created = data;
  }
  let updated = 0;
  for (const row of updates) {
    setMsg(msg, `Actualizando ${updated + 1} de ${updates.length}…`);
    const { data, error } = await sb.from('productos').update(row.data).eq('id', row.target.id).select().single();
    if (error) { failures.push(`Fila ${row.line} (${row.name}): ${error.message}`); continue; }
    const index = all.findIndex(p => p.id === data.id);
    if (index >= 0) all[index] = data;
    updated += 1;
  }
  all.unshift(...created);
  renderList();
  if (failures.length) {
    setMsg(msg, failures.join(' · '), 'err');
    $('#impConfirm').disabled = false;
    return;
  }
  $('#importer').close();
  toast(`${created.length ? `${created.length} producto${created.length > 1 ? 's' : ''} creado${created.length > 1 ? 's' : ''} (ocultos)` : ''}${created.length && updated ? ' · ' : ''}${updated ? `${updated} actualizado${updated > 1 ? 's' : ''}` : ''}.`);
  if (created.length) { $('#pendingFilter').value = 'ocultos'; show('photosView'); }
});

// ─────────────────────────── Fotos pendientes ───────────────────────────
// Lista para cargar fotos desde el celular, producto por producto. Los que se
// completan en esta pasada quedan a la vista (con ✓) hasta salir de la pestaña.
let pendingIds = [];
const uploading = new Map();   // id → texto de avance ("Subiendo 1 de 3…")
const needsPhoto = row => !ownPhoto(row);
function updatePendingCount() {
  const hidden = all.filter(row => needsPhoto(row) && !row.published).length;
  $('#pendingCount').textContent = hidden ? `(${hidden})` : '';
}
function renderPending(reset = false) {
  const mode = $('#pendingFilter').value;
  if (reset) {
    pendingIds = all.filter(row => needsPhoto(row) && (mode === 'todos' || !row.published))
      .sort((a, b) => Number(a.published) - Number(b.published))
      .map(row => row.id);
  }
  const rows = pendingIds.map(id => all.find(row => row.id === id)).filter(Boolean);
  const left = rows.filter(row => needsPhoto(row) || !row.published).length;
  $('#pendingInfo').textContent = rows.length
    ? `${left} por completar${rows.length - left ? ` · ${rows.length - left} listo${rows.length - left > 1 ? 's' : ''}` : ''}`
    : '';
  $('#pendingList').innerHTML = rows.length ? rows.map(row => {
    const own = [row.photo, ...(row.photos || [])].filter(p => p?.own);
    const done = own.length && row.published;
    const category = findCategory(row.sector, row.category);
    const sub = findSubcategory(row.sector, row.category, row.subcategory);
    const busy = uploading.get(row.id);
    return `<article class="pending${done ? ' done' : ''}${busy ? ' busy' : ''}" data-id="${esc(row.id)}">
      <div class="pending-head">
        <div><h4>${done ? '✓ ' : ''}${esc(row.name)}</h4>
          <p>${esc([row.brand, sub?.label || category?.label, row.caliber, row.code].filter(Boolean).join(' · '))}</p></div>
        <span class="tag ${row.published ? 'ok' : 'off'}">${row.published ? 'Publicado' : 'Oculto'}</span>
      </div>
      <div class="pending-photos">
        ${own.map(p => `<img src="${esc(p.thumb || p.src)}" alt="">`).join('')}
        ${!own.length && row.photo?.src ? `<img class="ref" src="${esc(row.photo.thumb || row.photo.src)}" alt="" title="Foto de referencia">` : ''}
        ${busy ? `<span class="pending-status">${esc(busy)}</span>` : ''}
      </div>
      <div class="pending-actions">
        <label class="btn${own.length ? '' : ' primary'}">
          <input type="file" accept="image/*" multiple hidden data-upload>
          ${own.length ? '+ Más fotos' : '📷 Agregar fotos'}
        </label>
        ${!row.published ? `<button type="button" class="btn${own.length ? ' primary' : ''}" data-publish${own.length ? '' : ' disabled title="Primero cargale una foto"'}>Publicar</button>` : ''}
        <button type="button" class="btn ghost" data-edit>Editar</button>
      </div>
    </article>`;
  }).join('') : `<p class="empty">${mode === 'ocultos' ? 'No hay productos ocultos esperando fotos. 👌' : 'Todos los productos tienen foto propia. 👌'}</p>`;
}
$('#pendingFilter').addEventListener('input', () => renderPending(true));

async function savePhotos(row, uploaded) {
  // Las fotos propias nuevas reemplazan a la foto de referencia.
  const own = [row.photo, ...(row.photos || [])].filter(p => p?.own);
  const [main, ...extra] = [...own, ...uploaded];
  const { data, error } = await sb.from('productos').update({ photo: main, photos: extra.length ? extra : null }).eq('id', row.id).select().single();
  if (error) throw error;
  all[all.findIndex(p => p.id === row.id)] = data;
  return data;
}

$('#pendingList').addEventListener('change', async event => {
  const input = event.target.closest('[data-upload]');
  if (!input) return;
  const id = input.closest('.pending').dataset.id;
  const files = [...input.files];
  input.value = '';
  if (!files.length || uploading.has(id)) return;
  const uploaded = [];
  for (const [i, file] of files.entries()) {
    uploading.set(id, `Subiendo ${i + 1} de ${files.length}…`); renderPending();
    try { uploaded.push(await uploadPhoto(file, id)); }
    catch (error) { toast(`Foto no subida: ${error.message}`, true); }
  }
  if (uploaded.length) {
    uploading.set(id, 'Guardando…'); renderPending();
    // Se toma la fila actual: pudo cambiar mientras subían las fotos.
    try { await savePhotos(all.find(p => p.id === id), uploaded); toast(`${uploaded.length} foto${uploaded.length > 1 ? 's' : ''} cargada${uploaded.length > 1 ? 's' : ''}.`); }
    catch (error) { toast(`No se pudieron guardar las fotos: ${error.message}`, true); }
  }
  uploading.delete(id);
  renderPending();
  renderList();
});

$('#pendingList').addEventListener('click', async event => {
  const card = event.target.closest('.pending');
  if (!card) return;
  const row = all.find(p => p.id === card.dataset.id);
  if (event.target.closest('[data-edit]')) { openEditor(row); return; }
  const publish = event.target.closest('[data-publish]');
  if (!publish || publish.disabled) return;
  publish.disabled = true; publish.textContent = 'Publicando…';
  const { data, error } = await sb.from('productos').update({ published: true }).eq('id', row.id).select().single();
  if (error) { toast(`No se pudo publicar: ${error.message}`, true); renderPending(); return; }
  all[all.findIndex(p => p.id === row.id)] = data;
  renderPending();
  renderList();
  toast(`“${data.name}” ya está en el sitio.`);
  // Pasa al siguiente que falte completar.
  const next = [...$('#pendingList').querySelectorAll('.pending:not(.done)')][0];
  next?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
// Al guardar desde el editor estando en esta pestaña, se refresca la lista.
$('#editor').addEventListener('close', () => { if (!$('#photosView').hidden) renderPending(); });

start();

// ─────────────────────────── Contactos (formulario de novedades) ───────────────────────────
let contacts = [];
const cluLabel = { si: 'Sí', no: 'No', tramite: 'En trámite' };
document.querySelectorAll('#admTabs [data-tab]').forEach(tab => tab.addEventListener('click', () => show(tab.dataset.tab)));

async function loadContacts() {
  const { data, error } = await sb.from('contactos').select('*').order('created_at', { ascending: false });
  if (error) {
    $('#contactsInfo').textContent = error.code === '42P01' || /does not exist|schema cache/i.test(error.message)
      ? 'Falta crear la tabla de contactos: correr el SQL 20261023000000_contactos.sql en Supabase.'
      : `No se pudieron cargar los contactos: ${error.message}`;
    contacts = [];
  } else contacts = data;
  $('#contactsCount').textContent = contacts.length ? `(${contacts.length})` : '';
  renderContacts();
}

function filteredContacts() {
  const q = $('#contactSearch').value.trim().toLowerCase();
  const clu = $('#cluFilter').value;
  return contacts.filter(c => (!clu || c.clu === clu) && (!q || [c.nombre, c.telefono, c.email].some(v => String(v || '').toLowerCase().includes(q))));
}

function renderContacts() {
  const rows = filteredContacts();
  $('#contactsInfo').textContent = contacts.length ? `${rows.length} de ${contacts.length} contactos` : '';
  const date = iso => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  $('#contactsTable').innerHTML = rows.length ? `
    <thead><tr><th>Fecha</th><th>Nombre</th><th>Teléfono</th><th>Email</th><th>CLU</th><th>Sector</th><th></th></tr></thead>
    <tbody>${rows.map(c => `<tr>
      <td>${date(c.created_at)}</td><td>${esc(c.nombre)}</td>
      <td><a href="https://wa.me/${esc(String(c.telefono).replace(/\D/g, ''))}" target="_blank" rel="noopener">${esc(c.telefono)}</a></td>
      <td><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></td>
      <td>${esc(cluLabel[c.clu] || '—')}</td><td>${c.sector === 'camping' ? 'Outdoor' : 'Armería'}</td>
      <td><button type="button" class="link danger-link" data-del-contact="${esc(c.id)}">Borrar</button></td>
    </tr>`).join('')}</tbody>` : '<tbody><tr><td class="empty">Todavía no hay contactos.</td></tr></tbody>';
}
['#contactSearch', '#cluFilter'].forEach(sel => $(sel).addEventListener('input', renderContacts));

$('#contactsTable').addEventListener('click', async event => {
  const button = event.target.closest('[data-del-contact]');
  if (!button) return;
  if (button.dataset.confirm !== 'yes') { button.dataset.confirm = 'yes'; button.textContent = '¿Seguro? Tocá de nuevo'; return; }
  const { error } = await sb.from('contactos').delete().eq('id', button.dataset.delContact);
  if (error) { toast(`No se pudo borrar: ${error.message}`, true); return; }
  contacts = contacts.filter(c => c.id !== button.dataset.delContact);
  $('#contactsCount').textContent = contacts.length ? `(${contacts.length})` : '';
  renderContacts();
  toast('Contacto borrado.');
});

$('#exportCsv').addEventListener('click', () => {
  const rows = filteredContacts();
  const cell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [['Fecha', 'Nombre', 'Teléfono', 'Email', 'CLU', 'Sector'].map(cell).join(';'),
    ...rows.map(c => [new Date(c.created_at).toLocaleString('es-AR'), c.nombre, c.telefono, c.email, cluLabel[c.clu] || '', c.sector === 'camping' ? 'Outdoor' : 'Armería'].map(cell).join(';'))];
  const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `contactos-parabellum-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});
