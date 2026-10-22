// Panel de productos de Armería Parabellum (admin.html).
// Usa Supabase: Auth para el ingreso, la tabla `productos` y el depósito de
// fotos `productos`. Los permisos reales los controla la base (RLS): aunque
// alguien abra esta página, sin estar en la lista de admins no puede escribir.
import { getSupabase, supabaseConfigured } from './supabase-client.js';
import { sectors, findCategory, findSubcategory, brands } from './taxonomy.js';

const BUCKET = 'productos';
const MAX_SIDE = 1600;       // px del lado mayor después de achicar
const JPEG_QUALITY = 0.82;

const $ = selector => document.querySelector(selector);
const views = ['loginView', 'recoveryView', 'deniedView', 'listView'];
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

function show(id) { views.forEach(view => { $(`#${view}`).hidden = view !== id; }); }
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
function renderList() {
  const q = $('#search').value.trim().toLowerCase();
  const sector = $('#sectorFilter').value;
  const state = $('#stateFilter').value;
  const rows = all.filter(row => {
    if (sector && row.sector !== sector) return false;
    if (state === 'publicados' && !row.published) return false;
    if (state === 'ocultos' && row.published) return false;
    if (state === 'sinfoto' && ownPhoto(row)) return false;
    if (state === 'sinprecio' && row.price != null) return false;
    if (state === 'ofertas' && !row.offer_active) return false;
    if (state === 'usados' && row.condition !== 'usado') return false;
    if (q && ![row.name, row.brand, row.code].some(v => String(v || '').toLowerCase().includes(q))) return false;
    return true;
  });
  $('#listCount').textContent = `${rows.length} de ${all.length} productos`;
  $('#list').innerHTML = rows.length ? rows.map(row => {
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
    return `<button type="button" class="item" data-id="${esc(row.id)}">
      <img src="${esc(row.photo?.src || 'assets/placeholder-producto.svg')}" alt="" loading="lazy" onerror="this.src='assets/placeholder-producto.svg'">
      <div><h4>${esc(row.name)}</h4><p>${esc([row.brand, category?.label, sub?.label].filter(Boolean).join(' · '))}</p><div class="tags">${tags}</div></div>
      <span class="price">${row.price == null ? 'Consultar' : money(row.price)}</span>
    </button>`;
  }).join('') : '<p class="empty">No hay productos con ese filtro.</p>';
}
['#search', '#sectorFilter', '#stateFilter'].forEach(sel => $(sel).addEventListener('input', renderList));
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
  $('#regulatedHint').hidden = !categoryRegulated();
  $('#caliberWrap').hidden = f('sector').value !== 'armeria';
}
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

function openEditor(row) {
  editing = row;
  draftId = row ? '' : `producto-${Date.now().toString(36)}`;
  $('#edTitle').textContent = row ? 'Editar producto' : 'Nuevo producto';
  setMsg($('#edMsg'), '');
  $('#confirmBox').hidden = true;
  f('name').value = row?.name || '';
  f('brand').value = row?.brand || '';
  f('code').value = row?.code || '';
  f('sector').value = row?.sector || $('#sectorFilter').value || 'armeria';
  fillCategories(row?.category);
  fillSubcategories(row?.subcategory);
  f('caliber').value = row?.caliber || '';
  f('short').value = row?.short_description || '';
  f('description').value = row?.description || '';
  f('price').value = row?.price ?? '';
  f('availability').value = row?.availability || 'disponible';
  f('stock').value = row?.stock ?? '';
  f('offer').checked = Boolean(row?.offer_active);
  f('prev').value = row?.previous_price ?? '';
  f('condition').value = row?.condition || 'nuevo';
  f('grade').value = row?.condition_grade || '';
  f('notes').value = row?.condition_notes || '';
  f('new').checked = row ? Boolean(row.is_new) : true;
  f('published').checked = row ? row.published !== false : true;
  photos = [row?.photo, ...(Array.isArray(row?.photos) ? row.photos : [])].filter(p => p?.src);
  renderPhotos();
  updateConditional();
  $('#deleteBtn').hidden = !row;
  $('#viewLink').hidden = !row;
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
      <img src="${esc(photo.src)}" alt="Foto ${index + 1}">
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

async function shrink(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  if (!bitmap) throw new Error(`No se pudo leer ${file.name}. Probá con una foto JPG o PNG.`);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo procesar la foto.')), 'image/jpeg', JPEG_QUALITY));
}

const slug = text => String(text || 'producto').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'producto';
const folderFor = () => editing?.id || draftId;

$('#photoInput').addEventListener('change', async event => {
  const files = [...event.target.files];
  event.target.value = '';
  pendingUploads += files.length; renderPhotos();
  for (const file of files) {
    try {
      const blob = await shrink(file);
      const path = `${folderFor()}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
      const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (error) throw error;
      const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
      photos.push({ src: data.publicUrl, own: true, path });
    } catch (error) {
      toast(`Foto no subida: ${error.message}`, true);
    } finally {
      pendingUploads -= 1; renderPhotos();
    }
  }
});

// ─────────────────────────── Guardar y borrar ───────────────────────────
const parseMoney = text => {
  const clean = String(text).trim().replace(/\$|\s/g, '');
  if (!clean) return null;
  // Acepta 150000 · 150.000 · 150.000,50 · 150000.50
  const normal = /,\d{3}(,|$)/.test(clean) && !/\./.test(clean) ? clean.replace(/,/g, '') : /,\d{1,2}$/.test(clean) ? clean.replace(/\./g, '').replace(',', '.') : /\.\d{3}(\.|$)/.test(clean) ? clean.replace(/\./g, '') : clean.replace(',', '.');
  const value = Number(normal);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : NaN;
};

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
    regulated: categoryRegulated(),
    condition: used ? 'usado' : 'nuevo',
    condition_grade: used ? (f('grade').value || null) : null,
    condition_notes: used ? (f('notes').value.trim() || null) : null,
    is_new: isNew,
    date_added: isNew ? (editing?.is_new && editing?.date_added ? editing.date_added : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })) : (editing?.date_added || null),
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
  $('#saveBtn').disabled = true; setMsg(msg, 'Guardando…');
  const query = editing
    ? sb.from('productos').update(values).eq('id', editing.id).select().single()
    : sb.from('productos').insert({ ...values, id: draftId }).select().single();
  const { data, error } = await query;
  $('#saveBtn').disabled = false;
  if (error) { setMsg(msg, `No se pudo guardar: ${error.message}`, 'err'); return; }
  const index = all.findIndex(row => row.id === data.id);
  if (index >= 0) all.splice(index, 1);
  all.unshift(data);
  renderList();
  $('#editor').close();
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

start();
