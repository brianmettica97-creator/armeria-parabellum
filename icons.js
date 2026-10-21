// Íconos lineales propios (SVG) para Gestoría y otras secciones.
const wrap = paths => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const icons = {
  credencial: wrap('<rect x="5" y="11" width="38" height="26" rx="4"/><circle cx="17" cy="23" r="5"/><path d="M10 33c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/><path d="M28 20h10M28 26h10M28 31h6"/>'),
  tenencia: wrap('<path d="M24 5 8 11v11c0 10 7 17.5 16 21 9-3.5 16-11 16-21V11Z"/><path d="m17 24 5 5 9-10"/>'),
  transferencia: wrap('<path d="M8 16h28"/><path d="m30 9 7 7-7 7"/><path d="M40 32H12"/><path d="m18 25-7 7 7 7"/>'),
  renovacion: wrap('<path d="M39 20a15 15 0 0 0-27.5-6"/><path d="M10 7v8h8"/><path d="M9 28a15 15 0 0 0 27.5 6"/><path d="M38 41v-8h-8"/>'),
  portacion: wrap('<rect x="9" y="6" width="30" height="36" rx="3"/><path d="M16 15h16M16 22h16M16 29h9"/><circle cx="32" cy="34" r="5"/><path d="m30 34 1.5 1.5L34 33"/>'),
  documento: wrap('<path d="M13 5h15l9 9v29H13Z"/><path d="M28 5v9h9"/><path d="M18 24h14M18 30h14M18 36h9"/>'),
  consulta: wrap('<path d="M8 10h32v22H22l-9 7v-7H8Z"/><path d="M15 18h18M15 24h12"/>'),
  revision: wrap('<rect x="11" y="8" width="26" height="34" rx="3"/><path d="M18 5h12v6H18Z"/><path d="m17 26 5 5 9-10"/>'),
  acompanamiento: wrap('<path d="M6 26 15 17l7 4 6-6 7 7"/><path d="M6 26l9 9 4-3"/><path d="M42 26 33 35l-9-6"/><path d="m24 29-3 3M27 32l-3 3"/>'),
  sello: wrap('<circle cx="24" cy="20" r="13"/><path d="m18 20 4 4 8-8"/><path d="m16 31-4 12 8-4 4 6 4-6 8 4-4-12"/>'),
};

export function iconFor(service) {
  if (service.icon && icons[service.icon]) return icons[service.icon];
  const t = (service.title || '').toLowerCase();
  if (t.includes('credencial') || t.includes('clu')) return icons.credencial;
  if (t.includes('tenencia')) return icons.tenencia;
  if (t.includes('transfer')) return icons.transferencia;
  if (t.includes('renov')) return icons.renovacion;
  if (t.includes('portaci')) return icons.portacion;
  return icons.documento;
}
