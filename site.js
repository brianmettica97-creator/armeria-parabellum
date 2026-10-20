// Elementos comunes a todas las páginas: aviso de demo, contacto y horarios,
// WhatsApp flotante, aviso de mayoría de edad y enlaces legales del pie.
import { DEMO_MODE, SHOW_DEMO_BANNER, STORE, CONSUMER_COMPLAINTS_URL, whatsappNumber, usingDemoPhone } from './config.js';

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const toMinutes = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const formatHour = hhmm => { const [h, m] = hhmm.split(':').map(Number); return m ? `${h}:${String(m).padStart(2, '0')}` : `${h}`; };

/** Día y minutos actuales en la zona horaria del local. */
export function localNow(date = new Date(), timeZone = STORE.timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).map(part => [part.type, part.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { day, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Estado "abierto/cerrado" según el horario semanal. */
export function openStatus(hours = STORE.hours, now = localNow()) {
  const today = hours[now.day];
  if (today && now.minutes >= toMinutes(today[0]) && now.minutes < toMinutes(today[1])) {
    return { open: true, label: `Abierto ahora · cierra a las ${formatHour(today[1])} h` };
  }
  for (let offset = 0; offset <= 7; offset++) {
    const day = (now.day + offset) % 7;
    const slot = hours[day];
    if (!slot) continue;
    if (offset === 0 && now.minutes >= toMinutes(slot[0])) continue;
    const when = offset === 0 ? 'hoy' : offset === 1 ? 'mañana' : `el ${DAY_NAMES[day]}`;
    return { open: false, label: `Cerrado · abre ${when} a las ${formatHour(slot[0])} h` };
  }
  return { open: false, label: 'Cerrado' };
}

export function hoursText(slot) {
  return slot ? `${formatHour(slot[0])} a ${formatHour(slot[1])} h` : 'Cerrado';
}

function waLink(text) {
  const phone = whatsappNumber();
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : '';
}

// ───────────────────────────── Aviso de demostración ─────────────────────────────
function renderDemoBar() {
  document.querySelectorAll('[data-demo-bar]').forEach(bar => {
    bar.hidden = !(DEMO_MODE && SHOW_DEMO_BANNER);
    if (!bar.hidden) bar.innerHTML = `<strong>Sitio de demostración</strong> · ${usingDemoPhone() ? 'número de WhatsApp ficticio · ' : ''}novedades, ofertas y trámites de ejemplo.`;
  });
}

// ───────────────────────────── Contacto ─────────────────────────────
function renderContact() {
  const section = document.querySelector('[data-contact]');
  if (!section) return;
  const status = openStatus();
  const today = localNow().day;
  const wa = waLink(`Hola, ${STORE.name}. Quiero hacer una consulta.`);
  const stars = '★★★★★';
  const filled = Math.round(STORE.rating.value);
  section.innerHTML = `
    <div class="contact-layout">
      <div class="contact-info">
        <div class="eyebrow">Visitanos</div>
        <h2 id="contactTitle">Dónde estamos</h2>
        <p class="open-status ${status.open ? 'is-open' : 'is-closed'}" data-open-status><i aria-hidden="true"></i>${esc(status.label)}</p>
        <dl class="contact-list">
          <div><dt>Dirección</dt><dd>${esc(STORE.street)}, ${esc(STORE.city)}<small>${esc(STORE.postalCode)} · ${esc(STORE.region)}</small></dd></div>
          <div><dt>Teléfono</dt><dd><a href="tel:${esc(STORE.phoneIntl)}">${esc(STORE.phoneDisplay)}</a></dd></div>
          <div><dt>Instagram</dt><dd><a href="https://www.instagram.com/${esc(STORE.instagram)}" target="_blank" rel="noopener noreferrer">@${esc(STORE.instagram)}</a></dd></div>
        </dl>
        <table class="hours-table">
          <caption>Horario de atención</caption>
          <tbody>${WEEK_ORDER.map(day => `<tr class="${day === today ? 'is-today' : ''}"><th scope="row">${DAY_NAMES[day][0].toUpperCase() + DAY_NAMES[day].slice(1)}${day === today ? ' <span>hoy</span>' : ''}</th><td>${hoursText(STORE.hours[day])}</td></tr>`).join('')}</tbody>
        </table>
        <small class="hours-note">Feriados: consultá el horario antes de acercarte.</small>
        <div class="contact-actions">
          <a class="primary" href="${esc(STORE.directionsUrl)}" target="_blank" rel="noopener noreferrer">Cómo llegar ↗</a>
          ${wa ? `<a class="secondary" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}
          <a class="secondary" href="tel:${esc(STORE.phoneIntl)}">Llamar</a>
        </div>
      </div>
      <div class="contact-side">
        <a class="rating-card" href="${esc(STORE.mapsUrl)}" target="_blank" rel="noopener noreferrer">
          <span class="rating-value">${STORE.rating.value.toLocaleString('es-AR')}</span>
          <span class="rating-stars" aria-hidden="true"><b>${stars.slice(0, filled)}</b>${stars.slice(filled)}</span>
          <span class="rating-copy"><strong>${STORE.rating.count} reseñas en Google</strong><small>Calificación pública · ${esc(STORE.rating.asOf)}</small></span>
          <span class="rating-link">Ver reseñas ↗</span>
        </a>
        <div class="map-box" data-map>
          <div class="map-placeholder">
            <span class="map-pin" aria-hidden="true"></span>
            <strong>${esc(STORE.street)} · ${esc(STORE.city)}</strong>
            <button type="button" class="secondary" data-load-map>Mostrar mapa</button>
            <small>El mapa lo provee Google y se carga solo si lo pedís.</small>
          </div>
        </div>
      </div>
    </div>`;
  section.querySelector('[data-load-map]').addEventListener('click', () => {
    section.querySelector('[data-map]').innerHTML = `<iframe title="Mapa de ubicación de ${esc(STORE.name)}" src="${esc(STORE.mapEmbedUrl)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
  });
  // Actualiza el estado cada minuto.
  window.setInterval(() => {
    const next = openStatus();
    const node = section.querySelector('[data-open-status]');
    node.className = `open-status ${next.open ? 'is-open' : 'is-closed'}`;
    node.innerHTML = `<i aria-hidden="true"></i>${esc(next.label)}`;
  }, 60000);
}

// ───────────────────────────── Franja de confianza ─────────────────────────────
function renderTrust() {
  document.querySelectorAll('[data-trust]').forEach(strip => {
    const status = openStatus();
    strip.innerHTML = `
      <span class="trust-item"><b>Atención personalizada</b><small>asesoramiento en el local</small></span>
      <a class="trust-item" href="${esc(STORE.mapsUrl)}" target="_blank" rel="noopener noreferrer"><b>★ ${STORE.rating.value.toLocaleString('es-AR')} en Google</b><small>${STORE.rating.count} reseñas</small></a>
      <a class="trust-item" href="#contacto"><b>${esc(STORE.street)}</b><small>${esc(STORE.city)} · ver mapa y horarios</small></a>
      <a class="trust-item trust-status ${status.open ? 'is-open' : 'is-closed'}" href="#contacto"><b><i aria-hidden="true"></i>${status.open ? 'Abierto ahora' : 'Cerrado ahora'}</b><small>${esc(status.label.split(' · ')[1] || '')}</small></a>`;
  });
}

// ───────────────────────────── WhatsApp flotante ─────────────────────────────
function mountWhatsAppFloat() {
  if (document.body.dataset.noFloat !== undefined) return;
  const url = waLink(`Hola, ${STORE.name}. Quiero hacer una consulta.`);
  if (!url) return;
  const link = document.createElement('a');
  link.className = 'wa-float';
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'Consultar por WhatsApp');
  link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.6 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5.5.9 1.3 1.7 2.3 2.2.2.1.4.1.5 0l.6-.7c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.4.8-.6.4-1.4.6-2.2.4-2.3-.6-4.5-2.7-5.2-5-.2-.9 0-1.6.4-2.1Z" fill="currentColor"/></svg><span>Consultas</span>';
  document.body.append(link);
}

// ───────────────────────────── Mayoría de edad (Armería) ─────────────────────────────
const AGE_KEY = 'parabellum-mayor-18';
function ageGate() {
  let accepted = false;
  try { accepted = window.localStorage.getItem(AGE_KEY) === 'si'; } catch { /* sin almacenamiento */ }
  if (accepted) return;
  const gate = document.createElement('div');
  gate.className = 'age-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'ageTitle');
  gate.innerHTML = `
    <div class="age-card">
      <img src="assets/cliente/logo-parabellum-banner.jpg" alt="${esc(STORE.name)}">
      <h2 id="ageTitle">Sitio para mayores de 18 años</h2>
      <p>Este sector exhibe armas, municiones y otros artículos regulados. La venta de estos productos se realiza únicamente en el local, a personas mayores de edad que acrediten la documentación y las autorizaciones exigidas por la normativa vigente.</p>
      <div class="age-actions">
        <button type="button" class="primary" data-age-yes>Soy mayor de 18 años · Ingresar</button>
        <a class="secondary" href="index.html">Volver al inicio</a>
      </div>
      <small><a href="legales.html#regulados">Más información sobre artículos regulados</a></small>
    </div>`;
  document.body.append(gate);
  document.documentElement.classList.add('age-locked');
  const yes = gate.querySelector('[data-age-yes]');
  yes.focus();
  yes.addEventListener('click', () => {
    try { window.localStorage.setItem(AGE_KEY, 'si'); } catch { /* sin almacenamiento */ }
    gate.remove();
    document.documentElement.classList.remove('age-locked');
  });
  gate.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...gate.querySelectorAll('button, a')];
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}

// ───────────────────────────── Pie: legales ─────────────────────────────
function renderLegalLinks() {
  document.querySelectorAll('[data-legal-links]').forEach(box => {
    box.innerHTML = `
      <a href="legales.html">Términos y privacidad</a>
      <a href="legales.html#regulados">Artículos regulados</a>
      <a href="${esc(CONSUMER_COMPLAINTS_URL)}" target="_blank" rel="noopener noreferrer">Defensa de las y los consumidores. Para reclamos ingrese aquí</a>`;
  });
}

export function initSite({ ageCheck = false } = {}) {
  renderDemoBar();
  renderContact();
  renderTrust();
  renderLegalLinks();
  mountWhatsAppFloat();
  if (ageCheck) ageGate();
}
