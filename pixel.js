// Píxel de Meta (Facebook/Instagram) para medir visitas y consultas.
// Está APAGADO mientras META_PIXEL_ID esté vacío: no carga nada de Meta ni envía datos.
// No se envían datos personales (nombre, teléfono, mail): solo "qué pasó" (visita, consulta, registro).
import { META_PIXEL_ID } from './config.js';

const enabled = () => /^\d{10,20}$/.test(META_PIXEL_ID) && !['localhost', '127.0.0.1'].includes(location.hostname);
let started = false;

export function initPixel() {
  if (started || !enabled()) return;
  started = true;
  // Código oficial de instalación del píxel de Meta.
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
}

/** Eventos estándar de Meta: 'Contact' (consulta por WhatsApp), 'Lead' (registro o novedades), 'InitiateCheckout' (compra online). */
export function track(event, params = {}) {
  if (!enabled() || !started || typeof window.fbq !== 'function') return;
  try { window.fbq('track', event, params); } catch { /* la medición nunca debe romper el sitio */ }
}
