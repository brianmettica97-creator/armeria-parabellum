// ───────────────────────────────────────────────────────────────────────────
// CONTENIDO DE DEMOSTRACIÓN
// ───────────────────────────────────────────────────────────────────────────
// Solo se aplica cuando DEMO_MODE = true en config.js. Sirve para presentar
// el sitio al cliente con las secciones completas. NO son datos reales del
// comercio: fechas de ingreso, precios de ejemplo y trámites deben ser
// reemplazados por información confirmada antes de publicar.

// Productos marcados como novedad, con fecha de ingreso de ejemplo.
export const demoNovedades = {
  'arma-24': '2026-10-15',
  'arma-9': '2026-10-11',
  'accesorio-optica': '2026-10-09',
  'arma-21': '2026-10-04',
  'arma-2': '2026-10-01',
  'accesorio-kit-mantenimiento': '2026-09-27',
  'accesorio-proteccion': '2026-09-20',
  'camping-tienda': '2026-10-12',
  mochila: '2026-10-06',
  linterna: '2026-09-29',
  'cuchillo-campo': '2026-09-22',
};

// Ofertas con precios DE EJEMPLO (se rotulan como tales en la interfaz).
export const demoOfertas = {
  'accesorio-proteccion': { price: 18500, previousPrice: 22000 },
  'accesorio-kit-mantenimiento': { price: 24900, previousPrice: 29500 },
  'accesorio-estuche': { price: 61000, previousPrice: null },
  'camping-tienda': { price: 189000, previousPrice: 215000 },
  linterna: { price: 15900, previousPrice: 18900 },
};

// Trámites de ejemplo, solo títulos: el comercio debe confirmar cuáles ofrece
// y aprobar descripciones y requisitos.
export const demoGestoria = [
  { title: 'Credencial de Legítimo Usuario', description: 'Ejemplo de trámite. Alcance y requisitos a confirmar por la armería.' },
  { title: 'Tenencia de armas', description: 'Ejemplo de trámite. Alcance y requisitos a confirmar por la armería.' },
  { title: 'Transferencias', description: 'Ejemplo de trámite. Alcance y requisitos a confirmar por la armería.' },
  { title: 'Renovaciones', description: 'Ejemplo de trámite. Alcance y requisitos a confirmar por la armería.' },
];

// Usados de ejemplo: fichas de muestra basadas en modelos del catálogo.
// El estado y las observaciones son ilustrativos.
export const demoUsados = [
  { id: 'usado-1', baseId: 'arma-15', code: 'USA-01', grade: 'Muy bueno', notes: 'Ejemplo de ficha de usado: estado general, uso aproximado y accesorios incluidos a detallar por la armería.' },
  { id: 'usado-2', baseId: 'arma-24', code: 'USA-02', grade: 'Excelente', notes: 'Ejemplo de ficha de usado: estado general, uso aproximado y accesorios incluidos a detallar por la armería.' },
  { id: 'usado-3', baseId: 'accesorio-optica', code: 'USA-03', grade: 'Bueno', notes: 'Ejemplo de ficha de usado: marcas de uso, compatibilidad y accesorios a detallar por la armería.' },
  { id: 'usado-4', baseId: 'mochila', code: 'USA-04', grade: 'Muy bueno', notes: 'Ejemplo de ficha de usado: estado de costuras, cierres y accesorios a detallar por la armería.' },
];
