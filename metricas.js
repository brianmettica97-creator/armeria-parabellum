// Mediciones del sitio para el tablero de resultados (mejora "tablero").
//
// Anota en Supabase qué pasó, SIN datos personales: ni nombre, ni teléfono, ni IP.
//   visita · ficha (abrió un producto) · whatsapp (tocó consultar) · asistente · video · qr
// La base solo acepta estos eventos mientras la mejora no esté apagada; si los
// rechaza (o falta la tabla), el sitio deja de intentarlo por el resto de la visita.
// No se mide a quien tiene abierta la sesión del panel en este navegador.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const OFF_KEY = 'pb_metricas_off';
const SESSION_KEY = 'pb_metricas_sesion';
const TIPOS = ['visita', 'ficha', 'whatsapp', 'asistente', 'video', 'qr'];
let sector = null;

function store(key, value) {
  try {
    if (value === undefined) return sessionStorage.getItem(key);
    sessionStorage.setItem(key, value);
  } catch { /* sin almacenamiento */ }
  return null;
}
function panelAbierto() {
  try { return Boolean(localStorage.getItem(`sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`)); } catch { return false; }
}
function sesion() {
  let id = store(SESSION_KEY);
  if (!id) { id = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); store(SESSION_KEY, id); }
  return id;
}

/** Anota un evento. Nunca bloquea ni rompe el sitio. */
export function registrar(tipo, { producto = null, detalle = null } = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TIPOS.includes(tipo) || store(OFF_KEY) || panelAbierto()) return;
  const body = { tipo, sector, producto: producto ? String(producto).slice(0, 80) : null, detalle: detalle ? String(detalle).slice(0, 200) : null, sesion: sesion() };
  fetch(`${SUPABASE_URL}/rest/v1/eventos`, {
    method: 'POST', keepalive: true,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  }).then(response => { if (!response.ok) store(OFF_KEY, '1'); }).catch(() => {});
}

/** Otros módulos (asistente, video) avisan con este evento, sin depender de este archivo. */
export const avisar = (tipo, datos = {}) => document.dispatchEvent(new CustomEvent('parabellum:metrica', { detail: { tipo, ...datos } }));

export function initMetricas({ sectorId }) {
  sector = sectorId;
  registrar('visita');
  document.addEventListener('parabellum:metrica', event => registrar(event.detail?.tipo, event.detail || {}));
  // Consultas por WhatsApp: se anota el producto si hay una ficha abierta; si no, de qué se trata
  // la consulta. La firma con el nombre del visitante nunca se guarda.
  window.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="https://wa.me/"]');
    if (!link || event.button !== 0) return;
    const fichaAbierta = document.querySelector('#productOverlay')?.classList.contains('open');
    const producto = fichaAbierta ? new URLSearchParams(location.search).get('producto') : null;
    let detalle = null;
    if (!producto) {
      try {
        const text = new URL(link.href).searchParams.get('text') || '';
        detalle = text.replace(/^Hola,[^.]*\.\s*/, '').replace(/\n+Soy [^\n]*$/, '').replace(/\s+/g, ' ').trim().slice(0, 120) || null;
      } catch { /* enlace sin texto */ }
    }
    registrar('whatsapp', { producto, detalle });
  }, true);
}
