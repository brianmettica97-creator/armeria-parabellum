// Formulario de novedades y ofertas (captación de contactos).
// Guarda en la tabla `contactos` de Supabase: el público solo puede enviar;
// leer y borrar queda reservado a los administradores (ver supabase/migrations).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

export function initLeads(root, { sector }) {
  if (!root || !SUPABASE_URL || !SUPABASE_ANON_KEY) { if (root) root.hidden = true; return; }
  const askClu = sector === 'armeria';
  const startedAt = Date.now();
  root.innerHTML = `
    <div class="leads-box">
      <div class="leads-copy">
        <div class="eyebrow">Novedades y ofertas</div>
        <h2 id="leadsTitle">Enterate primero de los ingresos y promociones</h2>
        <p>Dejanos tus datos y te avisamos cuando lleguen productos nuevos, usados seleccionados u ofertas. Sin spam: podés darte de baja cuando quieras.</p>
      </div>
      <form class="leads-form" novalidate>
        <label>Nombre y apellido<input name="nombre" autocomplete="name" required minlength="2" maxlength="120"></label>
        <label>Teléfono<input name="telefono" type="tel" autocomplete="tel" inputmode="tel" required minlength="6" maxlength="30" placeholder="221 …"></label>
        <label>Email<input name="email" type="email" autocomplete="email" required maxlength="160"></label>
        ${askClu ? `<label>¿Tenés CLU (Credencial de Legítimo Usuario)?
          <select name="clu" required>
            <option value="">Elegí una opción</option>
            <option value="si">Sí</option>
            <option value="tramite">En trámite</option>
            <option value="no">No</option>
          </select></label>` : ''}
        <label class="leads-hp" aria-hidden="true">Empresa<input name="empresa" tabindex="-1" autocomplete="off"></label>
        <label class="leads-check"><input type="checkbox" name="consentimiento" required><span>Acepto que Parabellum guarde estos datos para enviarme novedades y ofertas, según la <a href="legales.html#privacidad" target="_blank" rel="noopener">política de privacidad</a>.</span></label>
        <button class="primary" type="submit">Quiero recibir novedades</button>
        <p class="leads-msg" role="status" aria-live="polite"></p>
      </form>
    </div>`;
  const form = root.querySelector('form');
  const msg = root.querySelector('.leads-msg');
  const say = (text, kind = '') => { msg.textContent = text; msg.className = `leads-msg ${kind}`; };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    // Trampa para robots: campo oculto completo o envío instantáneo.
    if (data.empresa || Date.now() - startedAt < 2500) { say('¡Listo! Te vamos a avisar de las novedades.', 'ok'); form.reset(); return; }
    const nombre = String(data.nombre || '').trim();
    const telefono = String(data.telefono || '').trim();
    const email = String(data.email || '').trim();
    if (nombre.length < 2) return say('Escribí tu nombre.', 'err');
    if (telefono.replace(/\D/g, '').length < 6) return say('Revisá el teléfono.', 'err');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return say('Revisá el email.', 'err');
    if (askClu && !data.clu) return say('Indicá si tenés CLU.', 'err');
    if (!data.consentimiento) return say('Para enviarlo, aceptá el uso de tus datos.', 'err');
    const button = form.querySelector('button');
    button.disabled = true; say('Enviando…');
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/contactos`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ nombre, telefono, email, clu: askClu ? data.clu : null, sector, consentimiento: true }),
      });
      if (!response.ok) throw new Error(String(response.status));
      form.reset();
      say(`¡Gracias, ${nombre.split(' ')[0]}! Te vamos a avisar de las novedades.`, 'ok');
    } catch {
      say('No pudimos enviarlo. Probá de nuevo en un rato o escribinos por WhatsApp.', 'err');
    } finally {
      button.disabled = false;
    }
  });
}
