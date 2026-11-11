// Asistente "¿Qué me conviene?" (mejora "asistente") · solo sector Armería.
//
// Cinco preguntas → hasta tres armas del catálogo que mejor encajan, con un
// botón para consultarlas juntas por WhatsApp. No usa ningún servicio externo:
// puntúa los productos publicados con las tablas de acá abajo.
//
// ───────────────────────────────────────────────────────────────────────────
// CRITERIOS (editables). Son una orientación comercial: conviene que la armería
// los revise. `sub` = puntos por tipo de arma; `cal` = puntos por calibre
// (escrito en mayúsculas, sin puntos ni espacios).
// ───────────────────────────────────────────────────────────────────────────
const PREGUNTAS = [
  { id: 'uso', titulo: '¿Para qué lo vas a usar?', opciones: [
    { id: 'deportivo', label: 'Tiro deportivo', nota: 'Práctica en polígono y competencia' },
    { id: 'caza', label: 'Caza', nota: 'Caza menor o mayor' },
    { id: 'defensa', label: 'Defensa del hogar', nota: 'Tenencia en el domicilio' },
    { id: 'orientacion', label: 'Todavía no lo tengo claro', nota: 'Quiero que me orienten' },
  ] },
  { id: 'tipo', titulo: '¿Qué tipo de arma preferís?', opciones: [
    { id: 'corta', label: 'Arma corta', nota: 'Pistola o revólver' },
    { id: 'larga', label: 'Arma larga', nota: 'Escopeta, carabina o fusil' },
    { id: 'indistinto', label: 'No lo sé', nota: 'Mostrame de los dos tipos' },
  ] },
  { id: 'experiencia', titulo: '¿Qué experiencia tenés?', opciones: [
    { id: 'primera', label: 'Sería mi primera arma' },
    { id: 'experiencia', label: 'Ya tengo experiencia' },
  ] },
  { id: 'condicion', titulo: '¿Nueva o usada?', opciones: [
    { id: 'nuevo', label: 'Solo nueva' },
    { id: 'usado', label: 'Nueva o usada', nota: 'Las usadas están revisadas por la armería' },
  ] },
  { id: 'clu', titulo: '¿Tenés la Credencial de Legítimo Usuario (CLU)?', opciones: [
    { id: 'si', label: 'Sí, la tengo' },
    { id: 'tramite', label: 'La estoy tramitando' },
    { id: 'no', label: 'Todavía no' },
  ] },
];

const TIPOS = { corta: ['pistolas', 'revolveres'], larga: ['escopetas', 'carabinas', 'fusiles', 'pcc'] };
const USO = {
  deportivo: { sub: { pistolas: 3, carabinas: 3, pcc: 2, revolveres: 1, escopetas: 1, fusiles: 1 }, cal: { '22LR': 1, '9MM': 1 }, motivo: 'Va bien para tiro deportivo' },
  caza: { sub: { escopetas: 3, fusiles: 3, carabinas: 2 }, cal: { '308WINCHESTER': 1, '30-06SPRINGFIELD': 1, '12UAB': 1, '16UAB': 1, '20UAB': 1, '22WMR': 1 }, motivo: 'Tipo de arma habitual para caza' },
  defensa: { sub: { pistolas: 3, revolveres: 3, escopetas: 2 }, cal: { '9MM': 1, '38SPECIAL': 1, '12UAB': 1 }, motivo: 'Tipo de arma habitual para defensa del hogar' },
  orientacion: { sub: {}, cal: {}, motivo: '' },
};
const PRIMERA_ARMA = { '22LR': 2, '9MM': 1, '380ACP': 1, '38SPECIAL': 1, '357MAGNUM': -2, '44MAGNUM': -2, '30-06SPRINGFIELD': -1 };
const SIN_RECOMENDAR = ['permisos-especiales'];   // subcategorías que el asistente no sugiere
const CANTIDAD = 3;

const normCal = value => String(value || '').toUpperCase().replace(/[\s.]/g, '');
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** Devuelve hasta CANTIDAD productos con sus motivos, del más al menos indicado. */
export function recomendar(products, r) {
  const uso = USO[r.uso] || USO.orientacion;
  const tipos = TIPOS[r.tipo];
  const scored = products
    .filter(p => p.sector === 'armeria' && p.category === 'armas' && p.published && p.availability !== 'agotado')
    .filter(p => !SIN_RECOMENDAR.includes(p.subcategory))
    .filter(p => !tipos || tipos.includes(p.subcategory))
    .filter(p => r.condicion !== 'nuevo' || p.condition !== 'usado')
    .map(p => {
      const cal = normCal(p.caliber);
      const motivos = [];
      let puntos = 0;
      const porTipo = uso.sub[p.subcategory] || 0;
      puntos += porTipo * 2;
      if (porTipo >= 2 && uso.motivo) motivos.push(uso.motivo);
      if (uso.cal[cal]) { puntos += uso.cal[cal]; }
      if (r.experiencia === 'primera' && PRIMERA_ARMA[cal]) {
        puntos += PRIMERA_ARMA[cal];
        if (PRIMERA_ARMA[cal] > 0) motivos.push('Calibre habitual para empezar');
      }
      if (p.condition === 'usado') motivos.push(`Usada${p.conditionGrade ? ` · estado ${p.conditionGrade.toLowerCase()}` : ''}`);
      if (p.availability === 'disponible') puntos += 0.5;
      if (p.photo?.own) puntos += 0.25;
      return { p, puntos, motivos };
    })
    .sort((a, b) => b.puntos - a.puntos || a.p.order - b.p.order);
  // Variedad: no repetir la misma marca si hay otra opción con puntaje parecido.
  const elegidos = [];
  while (elegidos.length < CANTIDAD && scored.length) {
    const marcas = elegidos.map(e => e.p.brand);
    scored.sort((a, b) => (b.puntos - (marcas.includes(b.p.brand) ? 1.5 : 0)) - (a.puntos - (marcas.includes(a.p.brand) ? 1.5 : 0)) || a.p.order - b.p.order);
    elegidos.push(scored.shift());
  }
  return elegidos;
}

const etiqueta = (pregunta, id) => PREGUNTAS.find(q => q.id === pregunta).opciones.find(o => o.id === id)?.label || '';

/**
 * Monta el asistente en la página de Armería.
 * { products, openProduct(id), inquiryUrl(texto), imageFor(product) }
 */
export function initAsistente({ products, openProduct, inquiryUrl, imageFor }) {
  const anchor = document.querySelector('.catalog-main .filter-tools');
  if (!anchor || document.querySelector('#asistenteOverlay')) return;

  anchor.insertAdjacentHTML('beforebegin', `
    <button type="button" class="asistente-cta" id="asistenteOpen">
      <span class="asistente-cta-icon" aria-hidden="true">?</span>
      <span><b>¿No sabés cuál elegir?</b><small>Respondé 5 preguntas y te mostramos las opciones que mejor te quedan.</small></span>
      <span class="asistente-cta-go" aria-hidden="true">Empezar →</span>
    </button>`);
  document.body.insertAdjacentHTML('beforeend', `
    <div class="overlay" id="asistenteOverlay">
      <div class="dialog asistente" role="dialog" aria-modal="true" aria-labelledby="asistenteTitle">
        <button class="close" type="button" data-asistente-close aria-label="Cerrar">×</button>
        <div class="asistente-body" id="asistenteBody"></div>
      </div>
    </div>`);
  const overlay = document.querySelector('#asistenteOverlay');
  const body = document.querySelector('#asistenteBody');
  let paso = 0;
  let respuestas = {};
  let medido = false;   // cada vez que se completa se avisa una sola vez al tablero

  const abrir = () => { render(); overlay.classList.add('open'); };
  const cerrar = () => overlay.classList.remove('open');

  function render() {
    if (paso >= PREGUNTAS.length) { renderResultado(); return; }
    const q = PREGUNTAS[paso];
    body.innerHTML = `
      <div class="eyebrow">Asistente Parabellum · ${paso + 1} de ${PREGUNTAS.length}</div>
      <div class="asistente-progress" aria-hidden="true"><i style="width:${(paso / PREGUNTAS.length) * 100}%"></i></div>
      <h2 id="asistenteTitle">${esc(q.titulo)}</h2>
      <div class="asistente-options">
        ${q.opciones.map(o => `<button type="button" data-opcion="${o.id}"><b>${esc(o.label)}</b>${o.nota ? `<small>${esc(o.nota)}</small>` : ''}</button>`).join('')}
      </div>
      ${paso > 0 ? '<button type="button" class="asistente-back" data-asistente-back>← Volver a la pregunta anterior</button>' : ''}`;
    body.querySelector('[data-opcion]')?.focus({ preventScroll: true });
  }

  function renderResultado() {
    const picks = recomendar(products, respuestas);
    if (!medido) {
      medido = true;
      document.dispatchEvent(new CustomEvent('parabellum:metrica', { detail: { tipo: 'asistente', detalle: `${respuestas.uso} · ${respuestas.tipo} · ${picks.length} opciones` } }));
    }
    const resumen = [`uso: ${etiqueta('uso', respuestas.uso)}`, `tipo: ${etiqueta('tipo', respuestas.tipo)}`, `experiencia: ${etiqueta('experiencia', respuestas.experiencia)}`, `condición: ${etiqueta('condicion', respuestas.condicion)}`, `CLU: ${etiqueta('clu', respuestas.clu)}`].join(' · ');
    const nombres = picks.map(({ p }) => `${p.name}${p.caliber ? ` (${p.caliber})` : ''}`);
    const texto = picks.length
      ? `Hola, Armería Parabellum. Usé el asistente de la web (${resumen}). Me interesan: ${nombres.join(', ')}. ¿Me asesoran y me confirman disponibilidad y precio?`
      : `Hola, Armería Parabellum. Usé el asistente de la web (${resumen}) y no encontré opciones publicadas. ¿Me asesoran?`;
    const link = inquiryUrl(texto);
    const avisoClu = respuestas.clu === 'si' ? '' : `
      <p class="asistente-note">Para adquirir un arma hace falta la Credencial de Legítimo Usuario. ${respuestas.clu === 'tramite' ? 'Mientras sale tu trámite podés ir eligiendo.' : 'Nuestra gestoría te acompaña en el trámite.'} <a href="#gestoria" data-asistente-close>Ver gestoría →</a></p>`;
    body.innerHTML = `
      <div class="eyebrow">Asistente Parabellum · resultado</div>
      <div class="asistente-progress" aria-hidden="true"><i style="width:100%"></i></div>
      <h2 id="asistenteTitle">${picks.length ? 'Estas opciones son las que mejor te quedan' : 'No encontramos opciones publicadas para esa búsqueda'}</h2>
      <p class="asistente-summary">${esc(resumen)}</p>
      ${picks.length ? `<div class="asistente-results">${picks.map(({ p, motivos }) => `
        <article class="asistente-card">
          <div class="asistente-thumb">${imageFor(p)}</div>
          <div class="asistente-info">
            <small>${esc([p.brand, p.subcategoryLabel, p.caliber].filter(Boolean).join(' · '))}</small>
            <h3>${esc(p.name)}</h3>
            ${motivos.length ? `<ul>${motivos.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
            <button type="button" class="secondary" data-ver="${esc(p.id)}">Ver ficha</button>
          </div>
        </article>`).join('')}</div>` : '<p class="asistente-summary">Probá cambiando alguna respuesta, o escribinos y te asesoramos.</p>'}
      ${avisoClu}
      <div class="asistente-actions">
        ${link ? `<a class="primary" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${picks.length ? 'Consultar estas opciones por WhatsApp' : 'Consultar por WhatsApp'}</a>` : ''}
        <button type="button" class="asistente-back" data-asistente-restart>Empezar de nuevo</button>
      </div>
      <small class="asistente-legal">Sugerencia orientativa según tus respuestas. La venta de material controlado se realiza en el local, con la documentación que exige la normativa vigente.</small>`;
    body.scrollTop = 0;
  }

  document.querySelector('#asistenteOpen').addEventListener('click', abrir);
  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target.closest('[data-asistente-close]')) { cerrar(); return; }
    const opcion = event.target.closest('[data-opcion]');
    if (opcion) { respuestas[PREGUNTAS[paso].id] = opcion.dataset.opcion; paso += 1; render(); return; }
    if (event.target.closest('[data-asistente-back]')) { paso = Math.max(0, paso - 1); render(); return; }
    if (event.target.closest('[data-asistente-restart]')) { paso = 0; respuestas = {}; medido = false; render(); return; }
    const ver = event.target.closest('[data-ver]');
    // Al abrir una ficha el asistente se cierra; al volver a abrirlo sigue en el resultado.
    if (ver) { cerrar(); openProduct(ver.dataset.ver); }
  });
}
