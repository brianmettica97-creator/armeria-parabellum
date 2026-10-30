// Registro liviano del visitante: antes de la primera consulta por WhatsApp o del
// pedido se piden nombre, apellido, email y WhatsApp (en Armería, también la CLU).
// Los datos quedan en el navegador para no volver a pedirlos y se envían a la tabla
// `contactos`; cada consulta posterior se anota en `consultas`. El público solo
// puede enviar: leer y borrar queda reservado a los administradores.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const STORAGE_KEY = 'parabellum.visitante';
const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const storage = (() => { try { return window.localStorage; } catch { return null; } })();

export function currentVisitor() {
  try {
    const visitor = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    return visitor && typeof visitor.id === 'string' && visitor.nombre ? visitor : null;
  } catch { return null; }
}

function remember(visitor) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(visitor)); } catch { /* almacenamiento opcional */ }
}

export function newId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Guarda en el navegador a quien ya dejó sus datos (p. ej. desde el formulario de novedades). */
export function rememberVisitor(visitor) {
  if (!currentVisitor()) remember(visitor);
}

export const visitorName = visitor => [visitor.nombre, visitor.apellido].filter(Boolean).join(' ');

function post(table, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    keepalive: true,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  }).then(response => response.status).catch(() => 0);
}

// Envía el contacto una sola vez; si falló (sin conexión), se reintenta en la próxima consulta.
let syncing = null;
function syncVisitor(visitor) {
  if (!configured) return Promise.resolve(false);
  if (visitor.synced) return Promise.resolve(true);
  const base = { id: visitor.id, telefono: visitor.telefono, email: visitor.email, clu: visitor.clu, sector: visitor.sector, consentimiento: true };
  syncing ||= post('contactos', {
    ...base, nombre: visitor.nombre, apellido: visitor.apellido, clu_numero: visitor.cluNumero, origen: visitor.origen, novedades: visitor.novedades,
  })
    // 400: la base todavía no tiene las columnas del registro (falta correr el SQL);
    // se guarda igual con los campos del formulario de novedades para no perder el contacto.
    .then(status => (status === 400 ? post('contactos', { ...base, nombre: visitorName(visitor) }) : status))
    .then(status => {
      syncing = null;
      const ok = (status >= 200 && status < 300) || status === 409; // 409: ya estaba guardado
      if (ok) remember({ ...visitor, synced: true });
      return ok;
    });
  return syncing;
}

/** Anota una consulta del visitante registrado. No bloquea: si falla, se pierde solo ese registro. */
export function logInquiry(tipo, detalle) {
  const visitor = currentVisitor();
  if (!visitor || !configured) return;
  syncVisitor(visitor).then(ok => {
    if (ok) post('consultas', { contacto_id: visitor.id, tipo, detalle: String(detalle || '').slice(0, 600) });
  });
}

/** Agrega el nombre del visitante al final del mensaje de un enlace de WhatsApp. */
export function signWhatsAppUrl(url, visitor = currentVisitor()) {
  if (!visitor) return url;
  const [base, query = ''] = url.split('?');
  const text = new URLSearchParams(query).get('text') || '';
  const signature = `Soy ${visitorName(visitor)}.`;
  if (text.endsWith(signature)) return url;
  return `${base}?text=${encodeURIComponent(`${text}\n\n${signature}`.trim())}`;
}

/** Abre WhatsApp desde un gesto del usuario sin pasar de nuevo por el control de registro. */
export function openWhatsApp(url) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.click();
}

// ───────────────────────────── Diálogo de registro ─────────────────────────────
let dialog = null;
let pending = null;

function buildDialog(sector) {
  const askClu = sector === 'armeria';
  document.body.insertAdjacentHTML('beforeend', `
  <div class="overlay" id="registroOverlay" role="dialog" aria-modal="true" aria-labelledby="registroTitle">
    <div class="dialog cart-dialog registro-dialog">
      <button class="close" type="button" data-registro-close aria-label="Cerrar">×</button>
      <div class="eyebrow">Antes de continuar</div>
      <h2 id="registroTitle">Dejanos tus datos</h2>
      <p class="registro-intro">Así un asesor sabe quién consulta y te atiende más rápido. Te los pedimos una sola vez: la próxima vas directo.</p>
      <form class="leads-form registro-form" novalidate>
        <label>Nombre<input name="nombre" autocomplete="given-name" required minlength="2" maxlength="60"></label>
        <label>Apellido<input name="apellido" autocomplete="family-name" required maxlength="80"></label>
        <label>WhatsApp<input name="telefono" type="tel" autocomplete="tel" inputmode="tel" required minlength="6" maxlength="30" placeholder="221 …"></label>
        <label>Email<input name="email" type="email" autocomplete="email" required maxlength="160"></label>
        ${askClu ? `<label>¿Tenés CLU (Credencial de Legítimo Usuario)?
          <select name="clu" required>
            <option value="">Elegí una opción</option>
            <option value="si">Sí</option>
            <option value="tramite">En trámite</option>
            <option value="no">No</option>
          </select></label>
        <label class="registro-clu" hidden><span>N° de CLU <small>(opcional)</small></span><input name="clu_numero" inputmode="numeric" autocomplete="off" maxlength="30"></label>` : ''}
        <label class="leads-hp" aria-hidden="true">Empresa<input name="empresa" tabindex="-1" autocomplete="off"></label>
        <label class="leads-check"><input type="checkbox" name="consentimiento" required><span>Acepto que Parabellum guarde estos datos para responder mis consultas, según la <a href="legales.html#privacidad" target="_blank" rel="noopener">política de privacidad</a>.</span></label>
        <label class="leads-check"><input type="checkbox" name="novedades"><span>También quiero recibir novedades y ofertas.</span></label>
        <button class="primary" type="submit">Continuar</button>
        <p class="leads-msg" role="status" aria-live="polite"></p>
      </form>
    </div>
  </div>`);
  const overlay = document.querySelector('#registroOverlay');
  const form = overlay.querySelector('form');
  const msg = overlay.querySelector('.leads-msg');
  const say = (text, kind = '') => { msg.textContent = text; msg.className = `leads-msg ${kind}`; };
  const close = () => { overlay.classList.remove('open'); pending = null; };

  form.elements.clu?.addEventListener('change', () => {
    const wrap = overlay.querySelector('.registro-clu');
    wrap.hidden = form.elements.clu.value !== 'si';
    if (wrap.hidden) form.elements.clu_numero.value = '';
  });
  overlay.querySelector('[data-registro-close]').addEventListener('click', close);
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.classList.contains('open')) close(); });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const nombre = String(data.nombre || '').trim();
    const apellido = String(data.apellido || '').trim();
    const telefono = String(data.telefono || '').trim();
    const email = String(data.email || '').trim();
    const cluNumero = String(data.clu_numero || '').trim();
    if (nombre.length < 2) return say('Escribí tu nombre.', 'err');
    if (!apellido) return say('Escribí tu apellido.', 'err');
    if (telefono.replace(/\D/g, '').length < 6) return say('Revisá el WhatsApp.', 'err');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say('Revisá el email.', 'err');
    if (askClu && !data.clu) return say('Indicá si tenés CLU.', 'err');
    if (cluNumero && cluNumero.length < 3) return say('Revisá el número de CLU o dejalo vacío.', 'err');
    if (!data.consentimiento) return say('Para continuar, aceptá el uso de tus datos.', 'err');
    const visitor = {
      id: newId(), nombre, apellido, telefono, email,
      clu: askClu ? data.clu : null, cluNumero: askClu && data.clu === 'si' && cluNumero ? cluNumero : null,
      sector, origen: pending?.origen || 'consulta', novedades: Boolean(data.novedades), synced: false,
    };
    const onReady = pending?.onReady;
    say('');
    form.reset();
    close();
    // Trampa para robots: con el campo oculto completo no se guarda nada.
    if (!data.empresa) { remember(visitor); syncVisitor(visitor); }
    // Se continúa dentro del mismo toque para que el navegador permita abrir WhatsApp.
    onReady?.(data.empresa ? null : visitor);
  });
  return overlay;
}

/**
 * Llama a onReady con los datos del visitante; si todavía no se registró,
 * primero muestra el formulario. Sin Supabase configurado no pide nada.
 */
export function requireVisitor({ sector, origen = 'consulta', onReady }) {
  const visitor = currentVisitor();
  if (visitor || !configured) { onReady(visitor); return; }
  dialog ||= buildDialog(sector);
  pending = { origen, onReady };
  dialog.classList.add('open'); // queda encima del diálogo que lo abrió
  dialog.querySelector('input[name="nombre"]').focus();
}

// Resumen legible de la consulta a partir del mensaje de WhatsApp.
function inquiryDetail(url) {
  const text = new URLSearchParams(url.split('?')[1] || '').get('text') || '';
  return text.replace(/^Hola,[^.]*\.\s*/, '').replace(/\n+Soy [^\n]*$/, '').replace(/\s+/g, ' ').trim();
}

/** Toda consulta por WhatsApp de la página pasa primero por el registro. */
export function initRegistro({ sector }) {
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="https://wa.me/"]');
    if (!link || link.hasAttribute('data-no-registro') || event.button !== 0 || event.metaKey || event.ctrlKey) return;
    const visitor = currentVisitor();
    if (visitor) {
      logInquiry('consulta', inquiryDetail(link.href));
      link.href = signWhatsAppUrl(link.href, visitor);
      return;
    }
    if (!configured) return;
    event.preventDefault();
    const url = link.href;
    requireVisitor({
      sector,
      onReady: registered => {
        if (registered) logInquiry('consulta', inquiryDetail(url));
        openWhatsApp(signWhatsAppUrl(url, registered));
      },
    });
  }, true);
}
