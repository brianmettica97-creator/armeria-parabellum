// ───────────────────────────────────────────────────────────────────────────
// SECTORES, CATEGORÍAS Y SUBCATEGORÍAS
// ───────────────────────────────────────────────────────────────────────────
// Para agregar una categoría o subcategoría basta con sumarla acá: el menú,
// los filtros y el catálogo se generan solos. No hace falta crear páginas.
// regulated: los productos de esa categoría/subcategoría se tratan como
// artículos regulados (cantidad 1 y flujo de consulta con verificación legal),
// salvo que el producto indique otra cosa.

export const sectors = {
  armeria: {
    id: 'armeria',
    name: 'Armería Parabellum',
    page: 'armeria.html',
    categories: [
      {
        // Las armas se muestran como accesos independientes (una sección por
        // tipo) en la barra lateral y en el showroom. `flatten` hace que cada
        // subcategoría aparezca como entrada propia; los grupos permiten
        // filtrar varias juntas (armas largas / armas cortas).
        id: 'armas', label: 'Armas', icon: '✦', regulated: true, flatten: true,
        subcategories: [
          { id: 'pistolas', label: 'Pistolas', icon: '⌐' },
          { id: 'revolveres', label: 'Revólveres', icon: '◎' },
          { id: 'escopetas', label: 'Escopetas', icon: '═' },
          { id: 'carabinas', label: 'Carabinas', icon: '─' },
          { id: 'fusiles', label: 'Fusiles', icon: '≡' },
          { id: 'pcc', label: 'PCC', icon: '▭' },
          { id: 'permisos-especiales', label: 'Material con permisos especiales', icon: '⚑' },
        ],
        groups: [
          { id: 'armas-largas', label: 'Armas largas', subs: ['escopetas', 'carabinas', 'fusiles'] },
          { id: 'armas-cortas', label: 'Armas cortas', subs: ['pistolas', 'revolveres'] },
        ],
      },
      {
        id: 'municiones', label: 'Municiones', icon: '⁞', regulated: true,
        subcategories: [
          { id: 'arma-corta', label: 'Munición arma corta' },
          { id: 'arma-larga', label: 'Munición arma larga' },
          { id: 'cartuchos', label: 'Cartuchos' },
        ],
      },
      {
        id: 'recarga', label: 'Recarga', icon: '⚙',
        subcategories: [
          { id: 'insumos', label: 'Insumos', regulated: true },
          { id: 'maquinas', label: 'Máquinas' },
          { id: 'accesorios-recarga', label: 'Accesorios de recarga' },
        ],
      },
      {
        // Accesorios organizados por tipo de producto (no por marca).
        id: 'accesorios', label: 'Accesorios', icon: '◉',
        subcategories: [
          { id: 'auriculares', label: 'Auriculares de tiro' },
          { id: 'protectores-auditivos', label: 'Protectores auditivos' },
          { id: 'proteccion', label: 'Anteojos y protección' },
          { id: 'optica', label: 'Miras y ópticas' },
          { id: 'laseres', label: 'Láseres' },
          { id: 'linternas', label: 'Linternas' },
          { id: 'fundas-transporte', label: 'Fundas, guardado y transporte' },
          { id: 'correaje', label: 'Correaje' },
          { id: 'cajas-portamuniciones', label: 'Cajas portamuniciones' },
          { id: 'limpieza', label: 'Limpieza de armas' },
          { id: 'otros', label: 'Otros accesorios' },
        ],
        // Accesos destacados: filtran por marca dentro de la categoría.
        featured: [
          { brand: 'KILLER GEAR', label: 'Killer Gear', note: 'Guardado, fundas y transporte' },
        ],
      },
      {
        id: 'seguridad', label: 'Seguridad', icon: '▣',
        subcategories: [
          { id: 'cajas-seguridad', label: 'Cajas de seguridad' },
          { id: 'armeros', label: 'Armeros' },
        ],
      },
    ],
  },
  camping: {
    id: 'camping',
    name: 'Camping & Outdoor',
    page: 'camping.html',
    // En el menú, Camping muestra un único desplegable con todas las categorías.
    navMenu: 'single',
    categories: [
      { id: 'carpas', label: 'Carpas', icon: '△', subcategories: [] },
      { id: 'bolsas-dormir', label: 'Bolsas de dormir', icon: '☾', subcategories: [] },
      { id: 'mochilas-bolsos', label: 'Mochilas y bolsos', icon: '▤', subcategories: [] },
      { id: 'bolsos-estancos', label: 'Bolsos estancos', icon: '◒', subcategories: [] },
      { id: 'mesas', label: 'Mesas plegables', icon: '⊓', subcategories: [] },
      { id: 'anafes', label: 'Anafes', icon: '♨', subcategories: [] },
      { id: 'linternas', label: 'Linternas', icon: '◉', subcategories: [] },
      { id: 'reflectores', label: 'Reflectores', icon: '☼', subcategories: [] },
      {
        id: 'pesca', label: 'Pesca', icon: '⌇',
        subcategories: [
          { id: 'mosca', label: 'Cañas para mosca' },
          { id: 'telescopicas', label: 'Cañas telescópicas' },
          { id: 'tramos', label: 'Cañas de distintos tramos' },
          { id: 'accesorios-pesca', label: 'Reeles y accesorios de pesca' },
        ],
      },
      { id: 'nautica', label: 'Náutica y kayaks', icon: '≈', subcategories: [] },
      { id: 'cuchillos', label: 'Cuchillería y herramientas', icon: '◇', subcategories: [] },
      { id: 'encendedores', label: 'Zippo y encendedores', icon: '♦', subcategories: [] },
      { id: 'indumentaria', label: 'Indumentaria', icon: '⌂', subcategories: [] },
      {
        id: 'tiro-recreativo', label: 'Tiro recreativo', icon: '➶',
        subcategories: [
          { id: 'arco-flecha', label: 'Arco y flecha' },
          { id: 'aire-comprimido', label: 'Aire comprimido' },
        ],
      },
      { id: 'binoculares', label: 'Binoculares', icon: '∞', subcategories: [] },
      { id: 'accesorios-camping', label: 'Accesorios de camping', icon: '♧', subcategories: [] },
      { id: 'outlet', label: 'Outlet', icon: '%', subcategories: [] },
    ],
  },
};

export function findCategory(sectorId, categoryId) {
  return sectors[sectorId]?.categories.find(category => category.id === categoryId) || null;
}

export function findSubcategory(sectorId, categoryId, subcategoryId) {
  return findCategory(sectorId, categoryId)?.subcategories.find(sub => sub.id === subcategoryId) || null;
}

// Grupo de subcategorías (p. ej. armas largas = escopetas + carabinas + fusiles).
export function findGroup(sectorId, categoryId, groupId) {
  return findCategory(sectorId, categoryId)?.groups?.find(group => group.id === groupId) || null;
}

// ¿El producto entra en el filtro de subcategoría o grupo?
export function matchesSub(product, sectorId, categoryId, subId) {
  if (!subId) return true;
  const group = findGroup(sectorId, categoryId, subId);
  return group ? group.subs.includes(product.subcategory) : product.subcategory === subId;
}

// ───────────────────────────────────────────────────────────────────────────
// MARCAS (carrusel "Nuestras marcas")
// ───────────────────────────────────────────────────────────────────────────
// logo: ruta a un logotipo REAL proporcionado o autorizado por el comercio,
// por ejemplo 'assets/marcas/glock.svg'. Mientras sea null se muestra el
// nombre en tipografía, sin imitar el logotipo de la marca.
// IMPORTANTE: confirmar con el comercio qué marcas trabaja efectivamente.
// Categorías del carrusel de marcas (se muestran como filtros sobre el carrusel).
export const brandCategories = [
  { id: 'armas', label: 'Armas' },
  { id: 'optica', label: 'Óptica y miras' },
  { id: 'iluminacion', label: 'Linternas' },
  { id: 'proteccion', label: 'Protección' },
  { id: 'equipamiento', label: 'Fundas y equipamiento' },
  { id: 'limpieza', label: 'Limpieza' },
  { id: 'seguridad', label: 'Seguridad' },
];

// Para sumar una marca: agregar una línea con su logo (PNG blanco con fondo
// transparente en assets/marcas/) y su categoría. El carrusel se arma solo.
export const brands = [
  // Armas
  { id: 'glock', name: 'GLOCK', sector: 'armeria', category: 'armas', logo: 'assets/marcas/glock.png' },
  { id: 'cz', name: 'CZ', sector: 'armeria', category: 'armas', logo: 'assets/marcas/cz.png' },
  { id: 'beretta', name: 'Beretta', sector: 'armeria', category: 'armas', logo: 'assets/marcas/beretta.png' },
  { id: 'sig-sauer', name: 'SIG SAUER', sector: 'armeria', category: 'armas', logo: 'assets/marcas/sig-sauer.png' },
  { id: 'bersa', name: 'Bersa', sector: 'armeria', category: 'armas', logo: 'assets/marcas/bersa.png' },
  { id: 'taurus', name: 'Taurus', sector: 'armeria', category: 'armas', logo: 'assets/marcas/taurus.png' },
  { id: 'walther', name: 'Walther', sector: 'armeria', category: 'armas', logo: 'assets/marcas/walther.png' },
  { id: 'canik', name: 'Canik', sector: 'armeria', category: 'armas', logo: 'assets/marcas/canik.png' },
  // Óptica y miras
  { id: 'holosun', name: 'Holosun', sector: 'armeria', category: 'optica', logo: 'assets/marcas/holosun.png' },
  { id: 'osight', name: 'OSIGHT', sector: 'armeria', category: 'optica', logo: 'assets/marcas/osight.png' },
  // Linternas
  { id: 'olight', name: 'OLIGHT', sector: 'armeria', category: 'iluminacion', logo: 'assets/marcas/olight.png' },
  // Streamlight: falta el logotipo; se muestra el nombre hasta recibirlo.
  { id: 'streamlight', name: 'Streamlight', sector: 'armeria', category: 'iluminacion', logo: null },
  // Protección
  { id: 'earmor', name: 'EARMOR', sector: 'armeria', category: 'proteccion', logo: 'assets/marcas/earmor.png' },
  // Fundas y equipamiento
  { id: 'ghost', name: 'Ghost', sector: 'armeria', category: 'equipamiento', logo: 'assets/marcas/ghost.png' },
  { id: 'houston', name: 'Houston', sector: 'armeria', category: 'equipamiento', logo: 'assets/marcas/houston.png' },
  { id: 'killer-gear', name: 'KILLER GEAR', sector: 'armeria', category: 'equipamiento', logo: 'assets/marcas/killer-gear.png' },
  { id: 'boer', name: 'Boer', sector: 'armeria', category: 'equipamiento', logo: 'assets/marcas/boer.png' },
  // Limpieza
  { id: 'lubrilina', name: 'Lubrilina', sector: 'armeria', category: 'limpieza', logo: 'assets/marcas/lubrilina.png' },
  // Seguridad
  { id: 'vaultek', name: 'Vaultek', sector: 'armeria', category: 'seguridad', logo: 'assets/marcas/vaultek.png' },
];

// ───────────────────────────────────────────────────────────────────────────
// GESTORÍA
// ───────────────────────────────────────────────────────────────────────────
// Trámites que el comercio CONFIRME que ofrece. No publicar requisitos,
// plazos ni garantías sin aprobación del cliente.
// Formato: { title: 'Nombre del trámite', description: 'Texto aprobado' }
export const gestoriaServices = [];
