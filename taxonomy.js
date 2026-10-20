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
        id: 'armas', label: 'Armas', icon: '✦', regulated: true,
        subcategories: [
          { id: 'pistolas', label: 'Pistolas' },
          { id: 'revolveres', label: 'Revólveres' },
          { id: 'escopetas', label: 'Escopetas' },
          { id: 'carabinas', label: 'Carabinas' },
          { id: 'fusiles', label: 'Fusiles' },
          { id: 'pcc', label: 'PCC' },
          { id: 'permisos-especiales', label: 'Material con permisos especiales' },
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
        id: 'accesorios', label: 'Accesorios', icon: '◉',
        subcategories: [
          { id: 'limpieza', label: 'Limpieza de armas' },
          { id: 'optica', label: 'Óptica' },
          { id: 'linternas', label: 'Linternas' },
          { id: 'correaje', label: 'Correaje' },
          { id: 'cajas-portamuniciones', label: 'Cajas portamuniciones' },
          { id: 'proteccion', label: 'Protección personal' },
          { id: 'fundas-transporte', label: 'Fundas y transporte' },
          { id: 'otros', label: 'Otros accesorios' },
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
    categories: [
      { id: 'carpas', label: 'Carpas', icon: '△', subcategories: [] },
      { id: 'bolsas-dormir', label: 'Bolsas de dormir', icon: '☾', subcategories: [] },
      { id: 'cuchillos', label: 'Cuchillos y herramientas', icon: '◇', subcategories: [] },
      { id: 'linternas', label: 'Linternas', icon: '◉', subcategories: [] },
      { id: 'reflectores', label: 'Reflectores', icon: '☼', subcategories: [] },
      { id: 'anafes', label: 'Anafes', icon: '♨', subcategories: [] },
      { id: 'bolsos-estancos', label: 'Bolsos estancos', icon: '◒', subcategories: [] },
      { id: 'mochilas-bolsos', label: 'Mochilas y bolsos', icon: '▤', subcategories: [] },
      { id: 'mesas', label: 'Mesas plegables', icon: '⊓', subcategories: [] },
      { id: 'accesorios-camping', label: 'Accesorios de camping', icon: '♧', subcategories: [] },
    ],
  },
};

export function findCategory(sectorId, categoryId) {
  return sectors[sectorId]?.categories.find(category => category.id === categoryId) || null;
}

export function findSubcategory(sectorId, categoryId, subcategoryId) {
  return findCategory(sectorId, categoryId)?.subcategories.find(sub => sub.id === subcategoryId) || null;
}

// ───────────────────────────────────────────────────────────────────────────
// MARCAS (carrusel "Nuestras marcas")
// ───────────────────────────────────────────────────────────────────────────
// logo: ruta a un logotipo REAL proporcionado o autorizado por el comercio,
// por ejemplo 'assets/marcas/glock.svg'. Mientras sea null se muestra el
// nombre en tipografía, sin imitar el logotipo de la marca.
// IMPORTANTE: confirmar con el comercio qué marcas trabaja efectivamente.
export const brands = [
  { id: 'glock', name: 'GLOCK', sector: 'armeria', logo: 'assets/marcas/glock.png' },
  { id: 'cz', name: 'CZ', sector: 'armeria', logo: 'assets/marcas/cz.png' },
  { id: 'beretta', name: 'Beretta', sector: 'armeria', logo: 'assets/marcas/beretta.png' },
  { id: 'sig-sauer', name: 'SIG SAUER', sector: 'armeria', logo: 'assets/marcas/sig-sauer.png' },
  { id: 'bersa', name: 'Bersa', sector: 'armeria', logo: 'assets/marcas/bersa.png' },
  { id: 'taurus', name: 'Taurus', sector: 'armeria', logo: 'assets/marcas/taurus.png' },
  { id: 'walther', name: 'Walther', sector: 'armeria', logo: 'assets/marcas/walther.png' },
  { id: 'canik', name: 'Canik', sector: 'armeria', logo: 'assets/marcas/canik.png' },
];

// ───────────────────────────────────────────────────────────────────────────
// GESTORÍA
// ───────────────────────────────────────────────────────────────────────────
// Trámites que el comercio CONFIRME que ofrece. No publicar requisitos,
// plazos ni garantías sin aprobación del cliente.
// Formato: { title: 'Nombre del trámite', description: 'Texto aprobado' }
export const gestoriaServices = [];
