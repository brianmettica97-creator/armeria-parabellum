import { DEMO_MODE } from './config.js';
import { findCategory, findSubcategory } from './taxonomy.js';
import { demoNovedades, demoOfertas, demoUsados } from './demo-data.js';
import { supabaseConfigured, fetchProductos } from './supabase-client.js';

// 9x19 mm catalog references for the showroom concept. These are not claims of store stock.
const sources = {
  cz: { label: 'Catálogo oficial CZ', url: 'https://cz-usa.com/wp-content/uploads/2025/01/CZ-2025-Catalog.pdf' },
  glock: { label: 'Catálogo oficial GLOCK', url: 'https://eu.glock.com/en/News/Portfolio-Update-2026' },
  beretta: { label: 'Catálogo oficial Beretta', url: 'https://www.beretta.com/en/services/beretta-services/firearms-catalogs' },
  sig: { label: 'Catálogo oficial SIG SAUER', url: 'https://www.sigsauer.com/media/sigsauer/resources/WEB-2023_DSG_CATALOG_8-28-23.pdf' },
  walther: { label: 'Catálogo oficial Walther', url: 'https://waltherarms.com/wp-content/uploads/2022/01/2022-Walther-Product-Catalog.pdf' },
  bersa: { label: 'Sitio oficial Bersa', url: 'https://www.bersa.com.ar/' },
  taurus: { label: 'Catálogo oficial Taurus', url: 'https://www.taurususa.com/wp-content/uploads/2025/07/Taurus_MAGALOG_2024_FINAL.pdf' },
  canik: { label: 'Catálogo oficial Canik', url: 'https://www.canikarms.com/pdf/canik.pdf' },
};

// Fotografías con reutilización declarada; los créditos se muestran en las fichas.
function commonsPhoto(file, author, license, exact = false) {
  return {
    src: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1200`,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
    author, license, exact,
  };
}
const photoLibrary = {
  shadow2: commonsPhoto('CZ SHADOW 2.jpg', 'Land68', 'CC0', true),
  p10c: commonsPhoto('CZ P-10 C cal. 9x19.jpg', 'Land68', 'CC0', true),
  cz75: commonsPhoto('CZ 75 SP-01 Shadow 9x19 mm.jpg', 'autor en Commons', 'CC BY-SA 4.0', true),
  glock17: commonsPhoto('GLOCK 17 Gen 4 Pistol MOD 45160305.jpg', 'Steve Dock / MOD', 'OGL v1.0', false),
  glock19: commonsPhoto('Glock 19 (transparent background).jpg', 'U.S. Bureau of ATF', 'Dominio público · EE. UU.', false),
  glock26: commonsPhoto('Glock 26.JPG', 'KEN', 'CC BY-SA 3.0', true),
  beretta92: commonsPhoto('Beretta 92FS hand gun.jpg', 'U.S. Bureau of ATF', 'Dominio público · EE. UU.', true),
  berettaApx: commonsPhoto('Beretta-APX-9mm.jpg', 'Picanox', 'CC BY-SA 4.0', true),
  m17: commonsPhoto('Sig Sauer M17.jpg', 'Andrew Smith / National Guard', 'Dominio público · EE. UU.', true),
  p365: commonsPhoto('Sig Sauer P365 Handgun.jpg', 'Digitallymade', 'CC BY-SA 4.0', true),
  bersa: commonsPhoto('Bersa TPR9.jpg', 'Shistorybuff', 'CC BY-SA 4.0', true),
  walther: commonsPhoto('Walther PDP Compact 4".jpg', 'Fdik', 'CC0', true),
  rifleHunt: commonsPhoto('Hunting rifle 01.jpg', 'Ragnhild Kjeldsen', 'CC BY-SA 4.0', false),
  rifleClassic: commonsPhoto('Winchester 1873 Rifle.jpg', 'Hmaag', 'CC0', false),
  rifleMuseum: commonsPhoto('Rifle, bolt action (AM 1930.61-18).jpg', 'Auckland Museum', 'CC BY 4.0', false),
  tent: commonsPhoto('Camping tent on tarp.jpg', 'Edenaviv5', 'CC0', false),
  backpack: commonsPhoto('Backpack.jpg', 'Joe from Backpack and Gear', 'Dominio público', false),
  flashlight: commonsPhoto('Small black flashlight.jpg', 'Kathy Zinn', 'CC0', false),
  bottle: commonsPhoto('Blue Water Bottle.jpg', 'Byoung82', 'CC0', false),
  knife: commonsPhoto('Hunting Knife.JPG', "Earth'sbuddy", 'CC BY-SA 3.0', false),
  scope: commonsPhoto('Rifle scope.jpg', 'Microflexer', 'CC BY-SA 4.0', false),
  binoculars: commonsPhoto('Navy binoculars.jpg', 'U.S. Navy / Commons', 'Dominio público · EE. UU.', false),
  holster: commonsPhoto('Pistol Holster with Belt.jpg', 'Missouri History Museum', 'Dominio público · EE. UU.', false),
  gunCase: commonsPhoto('Case, gun (AM 2014.56.15-3).jpg', 'Auckland Museum', 'CC BY 4.0', false),
  earDefenders: commonsPhoto('Mallock-Armstrong ear defenders, London, England. Wellcome L0058074.jpg', 'Wellcome Library', 'CC BY 4.0', false),
  genericPistol: commonsPhoto('Glock 19 (9mm), Generation 3.jpg', 'Agazoo', 'Dominio público', false),
};
const pistolPhotoRefs = [
  photoLibrary.shadow2, photoLibrary.shadow2, photoLibrary.p10c, photoLibrary.p10c, photoLibrary.p10c,
  photoLibrary.p10c, photoLibrary.cz75, photoLibrary.cz75, photoLibrary.glock17, photoLibrary.glock19,
  photoLibrary.glock17, photoLibrary.glock17, photoLibrary.glock26, photoLibrary.glock26,
  photoLibrary.beretta92, photoLibrary.beretta92, photoLibrary.berettaApx, photoLibrary.m17,
  photoLibrary.m17, photoLibrary.genericPistol, photoLibrary.p365, photoLibrary.walther,
  photoLibrary.walther, photoLibrary.bersa, photoLibrary.genericPistol,
];
const exactPhotoIndexes = new Set([1, 2, 6, 14, 17, 20, 22, 23]);
const pistols = [
  ['CZ Shadow 2 Compact', 'CZ', 'cz', 'Foto referencial · familia Shadow', '#45505b', 'Versión compacta de la familia Shadow 2. La ficha del fabricante la presenta como una plataforma de tamaño reducido que conserva el enfoque deportivo de la serie.', 'Shadow 2 en formato compacto'],
  ['CZ Shadow 2', 'CZ', 'cz', 'Competición · acabado ilustrativo', '#282927', 'Integrante de la familia Shadow, orientada por CZ al segmento deportivo. La configuración concreta puede variar según versión y mercado.', 'Familia Shadow · deportiva'],
  ['CZ P-10 C', 'CZ', 'cz', 'Compacta · acabado ilustrativo', '#a18b6b', 'Pistola de la línea P-10 en configuración compacta. Esta ficha identifica el modelo de referencia; variantes, terminación y equipamiento deben verificarse.', 'Línea P-10 · compacta'],
  ['CZ P-10 C OR', 'CZ', 'cz', 'Compacta · acabado ilustrativo', '#626b4c', 'Variante P-10 C identificada como OR en la nomenclatura del modelo. Consultá con la armería qué configuración y componentes corresponden a la unidad ofrecida.', 'P-10 C · variante OR'],
  ['CZ P-10 F', 'CZ', 'cz', 'Full size · acabado ilustrativo', '#806446', 'Versión de tamaño completo de la familia P-10. El acabado de la imagen es ilustrativo y no identifica una variante disponible.', 'Línea P-10 · tamaño completo'],
  ['CZ P-10 S', 'CZ', 'cz', 'Subcompacta · acabado ilustrativo', '#899094', 'Versión subcompacta de la familia P-10. Confirmá con el comercio la variante exacta, configuración y disponibilidad.', 'Línea P-10 · subcompacta'],
  ['CZ 75 SP-01', 'CZ', 'cz', 'Full size · acabado ilustrativo', '#765f4a', 'Modelo de tamaño completo de la conocida familia CZ 75, presentado aquí en la variante SP-01. Las especificaciones dependen de la versión comercializada.', 'Familia CZ 75 · SP-01'],
  ['CZ 75 Compact', 'CZ', 'cz', 'Compacta · acabado ilustrativo', '#334c63', 'Configuración compacta perteneciente a la familia CZ 75. La imagen no representa necesariamente el acabado ni los accesorios de una unidad en stock.', 'Familia CZ 75 · compacta'],
  ['GLOCK 17 Gen5', 'GLOCK', 'glock', 'Full size · acabado ilustrativo', '#747b7d', 'Modelo de tamaño completo de la serie GLOCK 17, generación 5. Consultá la ficha del fabricante y verificá la configuración local antes de solicitarlo.', 'GLOCK Gen5 · tamaño completo'],
  ['GLOCK 19 Gen5', 'GLOCK', 'glock', 'Compacta · acabado ilustrativo', '#665244', 'Versión compacta de la serie GLOCK 19 Gen5. Se muestra como referencia de catálogo; disponibilidad, cargadores y terminación deben confirmarse.', 'GLOCK Gen5 · compacta'],
  ['GLOCK 45', 'GLOCK', 'glock', 'Crossover · acabado ilustrativo', '#45505b', 'Modelo de la familia crossover de GLOCK, identificado como G45. Esta presentación es ilustrativa y no confirma stock ni configuración.', 'GLOCK · formato crossover'],
  ['GLOCK 34 Gen5 MOS', 'GLOCK', 'glock', 'Competición · acabado ilustrativo', '#282927', 'Variante de corredera extendida de la familia GLOCK 34, con designación Gen5 MOS. Verificá con el comercio la versión y el equipamiento exactos.', 'GLOCK Gen5 MOS · G34'],
  ['GLOCK 26 Gen5', 'GLOCK', 'glock', 'Subcompacta · acabado ilustrativo', '#a18b6b', 'Modelo subcompacto GLOCK 26 en generación 5. El fabricante lo identifica dentro de su línea 9×19; consultá la variante comercializada localmente.', 'GLOCK Gen5 · subcompacta'],
  ['GLOCK 43X', 'GLOCK', 'glock', 'Slimline · acabado ilustrativo', '#626b4c', 'Modelo de la línea Slimline de GLOCK, identificado como 43X. La ficha es referencial: confirmá calibre, variante y disponibilidad con la armería.', 'GLOCK · línea Slimline'],
  ['Beretta 92FS', 'Beretta', 'beretta', 'Full size · foto de referencia', '#806446', 'Pistola de tamaño completo de la familia 92, con sistema de acción doble y simple según la documentación de Beretta. La foto muestra la familia 92; verificá la variante exacta.', 'Familia Beretta 92 · 92FS'],
  ['Beretta 92X', 'Beretta', 'beretta', 'Full size · acabado ilustrativo', '#899094', 'Versión contemporánea de la familia Beretta 92. La serie incluye distintas configuraciones; consultá cuál corresponde a la unidad disponible.', 'Familia Beretta 92 · 92X'],
  ['Beretta APX A1 Full Size', 'Beretta', 'beretta', 'Full size · acabado ilustrativo', '#765f4a', 'Modelo de tamaño completo de la línea APX A1. Beretta publica manuales y variantes específicas de la serie; confirmá configuración y equipamiento.', 'Línea APX A1 · tamaño completo'],
  ['SIG SAUER M17', 'SIG SAUER', 'sig', 'Full size · foto de referencia', '#334c63', 'Modelo M17 de SIG SAUER basado en la plataforma P320. La foto es una referencia visual; la unidad comercial puede diferir.', 'Plataforma P320 · M17'],
  ['SIG SAUER P320 Full Size', 'SIG SAUER', 'sig', 'Full size · acabado ilustrativo', '#747b7d', 'Configuración de tamaño completo de la familia P320. Las versiones de esta plataforma pueden diferir en módulos, miras y otros componentes.', 'Familia P320 · tamaño completo'],
  ['Taurus G3', 'Taurus', 'taurus', 'Full size · acabado ilustrativo', '#665244', 'Modelo G3 de Taurus, presentado como pistola semiautomática de 9×19 en la información del fabricante. Confirmá variante y especificaciones de la versión local.', 'Taurus · serie G3'],
  ['SIG SAUER P365', 'SIG SAUER', 'sig', 'Microcompacta · acabado ilustrativo', '#45505b', 'Modelo compacto de la familia P365, reconocida en el catálogo de SIG SAUER como una plataforma 9 mm. Existen distintas configuraciones; consultá la variante exacta.', 'Familia P365 · compacto'],
  ['Walther PDP Full Size 4.5″', 'Walther', 'walther', 'Full size · acabado ilustrativo', '#282927', 'Configuración Full Size de la familia PDP con longitud de cañón indicada en el nombre de referencia. Confirmá generación, equipamiento y especificaciones del ejemplar.', 'Familia PDP · Full Size'],
  ['Walther PDP Compact 4″', 'Walther', 'walther', 'Compacta · acabado ilustrativo', '#a18b6b', 'Configuración Compact de la familia PDP con longitud de cañón indicada en el nombre de referencia. La imagen y el acabado son ilustrativos.', 'Familia PDP · Compact'],
  ['Bersa TPR9', 'Bersa', 'bersa', 'Full size · acabado ilustrativo', '#626b4c', 'Modelo TPR9 de Bersa, marca argentina. La ficha funciona como referencia para el showroom; consultá la configuración y disponibilidad directamente con la armería.', 'Bersa · familia TPR9'],
  ['Canik TP9 Elite Combat', 'Canik', 'canik', 'Compacta · acabado ilustrativo', '#806446', 'Integrante de la familia TP9 Elite Combat de Canik. El fabricante publica variantes y configuraciones específicas; confirmá los componentes y el acabado de la unidad.', 'Familia TP9 · Elite Combat'],
].map(([name, brand, source, note, color, description, shortDescription], index) => ({
  id: `arma-${index + 1}`,
  code: `9MM-${String(index + 1).padStart(2, '0')}`,
  name,
  brand,
  sector: 'armeria',
  category: 'armas',
  subcategory: 'pistolas',
  caliber: '9×19 mm · confirmar variante',
  description: `${description} Modelo, acabado y disponibilidad deben confirmarse con Armería Parabellum.`,
  shortDescription,
  finish: { name: note, color },
  price: null,
  icon: '✦',
  regulated: true,
  sourceUrl: sources[source].url,
  sourceLabel: sources[source].label,
  photo: { ...pistolPhotoRefs[index], exact: exactPhotoIndexes.has(index) },
}));

// ───────────────────────────────────────────────────────────────────────────
// FICHA DE PRODUCTO · CAMPOS ADMITIDOS
// ───────────────────────────────────────────────────────────────────────────
// id, code, name, brand, model, description, shortDescription
// sector:       'armeria' | 'camping'  (ver taxonomy.js)
// category / subcategory: ids definidos en taxonomy.js
// photo:        { src, ... } foto principal · photos: [{ src }] adicionales
// price:        número (precio unitario publicado) o null → "Consultar precio".
//               No cargar importes que el comercio no haya confirmado.
// availability: 'disponible' | 'consultar' | 'agotado'. Los agotados no pueden
//               agregarse al pedido.
// stock:        cantidad opcional; si se informa, limita la cantidad pedida.
// published:    false oculta el producto y lo quita de pedidos guardados.
// regulated:    true → cantidad fija en 1 y flujo de consulta con verificación
//               de requisitos legales. Si no se indica, hereda de la categoría.
// isNew, dateAdded ('AAAA-MM-DD'): alimentan "Últimos ingresos".
// offer:        { active: true, previousPrice } → aparece en "Ofertas".
//               previousPrice solo si es un precio anterior real.
// complements:  ids de productos complementarios sugeridos (configurables).
// condition:    'nuevo' (por defecto) | 'usado' → aparece en la sección "Usados".
// conditionGrade: estado del usado ('Excelente', 'Muy bueno', 'Bueno'…).
// conditionNotes: detalle del usado (uso, accesorios incluidos, observaciones).
//               Los usados son unidades únicas: si no se indica stock, se toma 1.
// order:        número para ordenar "destacados" (menor primero).
const AVAILABILITY = new Set(['disponible', 'consultar', 'agotado']);
const PLACEHOLDER = { src: 'assets/placeholder-producto.svg', exact: false };

// Complementos sugeridos. Ajustar según lo que el comercio quiera recomendar;
// los precios siempre salen del catálogo.
const complementsBySubcategory = {
  pistolas: ['accesorio-kit-mantenimiento', 'accesorio-estuche', 'accesorio-proteccion', 'accesorio-funda'],
  fusiles: ['accesorio-kit-mantenimiento', 'accesorio-estuche', 'accesorio-correa-transporte', 'accesorio-optica'],
};
const complementsById = {
  mochila: ['linterna', 'cantimplora'],
  'camping-tienda': ['linterna', 'mochila'],
  linterna: ['cantimplora'],
  'cuchillo-campo': ['linterna'],
  'accesorio-optica': ['accesorio-kit-mantenimiento'],
};

function applyDemo(product) {
  if (!DEMO_MODE) return product;
  const next = { ...product };
  if (demoNovedades[product.id] && !product.dateAdded) {
    next.isNew = true;
    next.dateAdded = demoNovedades[product.id];
  }
  const offer = demoOfertas[product.id];
  if (offer && product.price == null) {
    next.price = offer.price;
    next.offer = { active: true, previousPrice: offer.previousPrice, demo: true };
    next.demoPrice = true;
  }
  return next;
}

function normalizeProduct(raw, index) {
  const product = applyDemo(raw);
  const category = findCategory(product.sector, product.category);
  const subcategory = findSubcategory(product.sector, product.category, product.subcategory);
  const price = Number.isFinite(product.price) && product.price > 0 ? product.price : null;
  const condition = product.condition === 'usado' ? 'usado' : 'nuevo';
  const stock = Number.isInteger(product.stock) && product.stock >= 0 ? product.stock : condition === 'usado' ? 1 : null;
  let availability = AVAILABILITY.has(product.availability) ? product.availability : 'consultar';
  if (stock === 0) availability = 'agotado';
  const previousPrice = Number.isFinite(product.offer?.previousPrice) && price !== null && product.offer.previousPrice > price ? product.offer.previousPrice : null;
  const dateAdded = /^\d{4}-\d{2}-\d{2}$/.test(product.dateAdded || '') ? product.dateAdded : null;
  return {
    ...product,
    model: product.model || product.name,
    categoryLabel: category?.label || 'Sin categoría',
    subcategoryLabel: subcategory?.label || '',
    price,
    stock,
    availability,
    published: product.published !== false && Boolean(category),
    regulated: product.regulated ?? Boolean(subcategory?.regulated ?? category?.regulated),
    isNew: Boolean(product.isNew && dateAdded),
    dateAdded,
    offer: product.offer?.active && price !== null ? { active: true, previousPrice, demo: Boolean(product.offer.demo) } : null,
    photo: product.photo || PLACEHOLDER,
    photos: Array.isArray(product.photos) ? product.photos : [],
    order: Number.isFinite(product.order) ? product.order : index,
    condition,
    conditionGrade: condition === 'usado' ? (product.conditionGrade || '') : '',
    conditionNotes: condition === 'usado' ? (product.conditionNotes || '') : '',
    complements: product.complements || complementsById[product.id] || complementsBySubcategory[product.subcategory] || [],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// ARMAS CON FOTOS REALES (Wikimedia Commons, licencias libres con crédito)
// ───────────────────────────────────────────────────────────────────────────
// Fotos de referencia del modelo; la unidad disponible puede variar en
// calibre, largo de cañón, terminación y accesorios. Cada ficha enlaza al
// sitio oficial de la marca. Datos técnicos generales del modelo: confirmar
// la variante exacta con la armería.
const official = {
  remington: { label: 'Sitio oficial Remington (RemArms)', url: 'https://www.remarms.com/' },
  beretta: { label: 'Sitio oficial Beretta', url: 'https://www.beretta.com/' },
  mossberg: { label: 'Sitio oficial Mossberg', url: 'https://www.mossberg.com/' },
  sw: { label: 'Sitio oficial Smith & Wesson', url: 'https://www.smith-wesson.com/' },
  colt: { label: 'Sitio oficial Colt', url: 'https://www.colt.com/' },
  ruger: { label: 'Sitio oficial Ruger', url: 'https://ruger.com/' },
  taurus: { label: 'Sitio oficial Taurus', url: 'https://www.taurusarmas.com.br/' },
  cz: sources.cz,
  marlin: { label: 'Sitio oficial Marlin', url: 'https://www.marlinfirearms.com/' },
  henry: { label: 'Sitio oficial Henry', url: 'https://www.henryusa.com/' },
  winchester: { label: 'Sitio oficial Winchester', url: 'https://www.winchesterguns.com/' },
  tikka: { label: 'Sitio oficial Tikka', url: 'https://www.tikka.fi/' },
  bersa: sources.bersa,
};

// [id, código, subcategoría, nombre, marca, fuente oficial, calibre, sistema, capacidad, resumen, descripción, foto]
const armasLargasYRevolveres = [
  // Escopetas
  ['esc-remington-870-fieldmaster', 'ESC-01', 'escopetas', 'Remington 870 Fieldmaster', 'Remington', 'remington', 'Calibre 12 · consultar variante', 'Corredera (acción por bomba)', 'Cargador tubular', 'Escopeta de corredera · calibre 12',
    'Versión Fieldmaster de la Remington 870, una de las escopetas de corredera más difundidas para caza y tiro deportivo. Robusta y de mantenimiento simple.',
    commonsPhoto('Remington 870 Fieldmaster.jpg', 'Burnyburnout', 'CC BY-SA 4.0', true)],
  ['esc-remington-870-wingmaster', 'ESC-02', 'escopetas', 'Remington 870 Wingmaster', 'Remington', 'remington', 'Calibre 12 · consultar variante', 'Corredera (acción por bomba)', 'Cargador tubular', 'Corredera clásica · madera y acero pavonado',
    'La versión Wingmaster de la 870 combina culata y guardamanos de madera con acabado pavonado. Una clásica para caza.',
    commonsPhoto('Remington 870 Wmaster.jpg', 'Burnyburnout', 'CC BY-SA 4.0', true)],
  ['esc-beretta-a400-xtreme-plus', 'ESC-03', 'escopetas', 'Beretta A400 Xtreme Plus', 'Beretta', 'beretta', 'Calibre 12 · recámara 3½"', 'Semiautomática a gas', 'Consultar', 'Semiautomática · calibre 12 · para caza exigente',
    'Semiautomática de la familia A400 pensada para caza en condiciones duras, con recámara de 3½" y terminación resistente a la intemperie.',
    commonsPhoto('Beretta-A400-Xtreme-Plus.jpg', 'Picanox', 'CC BY-SA 4.0', true)],
  ['esc-beretta-a400-xplor-action', 'ESC-04', 'escopetas', 'Beretta A400 Xplor Action', 'Beretta', 'beretta', 'Calibre 12 · consultar variante', 'Semiautomática a gas', 'Consultar', 'Semiautomática · culata de madera',
    'Versión Xplor Action de la A400, con culata de madera y cajón con terminación de color. Liviana y equilibrada para caza.',
    commonsPhoto('Beretta-A400-Xplor-Action.jpg', 'Picanox', 'CC BY-SA 4.0', true)],
  ['esc-beretta-1301-tactical', 'ESC-05', 'escopetas', 'Beretta 1301 Tactical', 'Beretta', 'beretta', 'Calibre 12', 'Semiautomática a gas', 'Consultar', 'Semiautomática · calibre 12 · formato táctico',
    'Escopeta semiautomática compacta de la línea 1301, de ciclo rápido y controles ampliados. Uso deportivo y de defensa conforme a la normativa vigente.',
    commonsPhoto('Beretta 1301 Tactical.jpg', 'autor en Commons', 'CC BY-SA 4.0', true)],
  ['esc-hatsan-escort', 'ESC-06', 'escopetas', 'Hatsan Escort Magnum', 'Hatsan', null, 'Calibre 12', 'Consultar variante', 'Consultar', 'Escopeta calibre 12 · línea Escort',
    'Escopeta de la línea Escort del fabricante turco Hatsan, reconocida por su buena relación entre precio y prestaciones. Consultá la variante disponible.',
    commonsPhoto('Escort-Magnum-MPA-12ga.jpg', 'Picanox', 'CC BY-SA 4.0', true)],
  ['esc-maverick-88', 'ESC-07', 'escopetas', 'Mossberg Maverick 88', 'Mossberg', 'mossberg', 'Calibre 12', 'Corredera (acción por bomba)', 'Cargador tubular', 'Corredera · calibre 12 · versátil y accesible',
    'Escopeta de corredera de la línea Maverick, fabricada bajo el paraguas de Mossberg. Simple, confiable y accesible.',
    commonsPhoto('Mossberg Maverick 88.png', 'Dybdal', 'CC BY-SA 4.0', true)],
  ['esc-mossberg-590', 'ESC-08', 'escopetas', 'Mossberg 590', 'Mossberg', 'mossberg', 'Calibre 12', 'Corredera (acción por bomba)', 'Cargador tubular', 'Corredera · calibre 12 · formato robusto',
    'Variante de la familia Mossberg 500 con construcción reforzada. Consultá largo de cañón y configuración de la unidad.',
    commonsPhoto('Mossberg 590.jpg', 'U.S. Bureau of ATF', 'Dominio público · EE. UU.', true)],
  // Revólveres
  ['rev-sw-686-plus', 'REV-01', 'revolveres', 'Smith & Wesson 686 Plus', 'Smith & Wesson', 'sw', '.357 Magnum (admite .38 Special)', 'Revólver doble y simple acción', '7 tiros', 'Revólver · .357 Magnum · acero inoxidable',
    'Revólver de armazón mediano en acero inoxidable, con tambor de siete tiros en la versión Plus. Muy elegido para tiro deportivo.',
    commonsPhoto('Smith & Wesson .357 Model 686 Plus.jpg', 'Junglecat', 'CC BY-SA 3.0', true)],
  ['rev-colt-python', 'REV-02', 'revolveres', 'Colt Python', 'Colt', 'colt', '.357 Magnum (admite .38 Special)', 'Revólver doble y simple acción', '6 tiros', 'Revólver · .357 Magnum · acero inoxidable',
    'Reedición contemporánea del clásico Colt Python, con cañón ventilado y acabado de acero inoxidable. Un ícono entre los revólveres.',
    commonsPhoto('Colt Python 2020 4 inch.jpg', 'Coati077', 'CC BY-SA 4.0', true)],
  ['rev-ruger-gp100', 'REV-03', 'revolveres', 'Ruger GP100', 'Ruger', 'ruger', '.357 Magnum (admite .38 Special)', 'Revólver doble y simple acción', '6 tiros · consultar variante', 'Revólver · .357 Magnum · construcción robusta',
    'Revólver de armazón mediano conocido por su solidez. Versión en acero inoxidable; consultá largo de cañón disponible.',
    commonsPhoto('Ruger GP100 .357 Stainless.jpg', 'Gordon Gartrell', 'CC BY-SA 2.0', true)],
  ['rev-taurus-judge', 'REV-04', 'revolveres', 'Taurus Judge Magnum', 'Taurus', 'taurus', '.45 Colt / .410', 'Revólver doble y simple acción', '5 tiros', 'Revólver · .45 Colt / .410',
    'Revólver de la línea Judge que admite cartuchos .45 Colt y .410. Consultá largo de cañón y terminación.',
    commonsPhoto('Taurus Judge Magnum noBG.jpg', 'HarveyHenkelmann', 'CC BY-SA 4.0', true)],
  ['rev-taurus-627-tracker', 'REV-05', 'revolveres', 'Taurus 627 Tracker', 'Taurus', 'taurus', '.357 Magnum (admite .38 Special)', 'Revólver doble y simple acción', '7 tiros', 'Revólver · .357 Magnum · 7 tiros',
    'Revólver de la línea Tracker con tambor de siete tiros y empuñadura ergonómica. Fabricación brasileña.',
    commonsPhoto('Taurus-Tracker-627-4.png', 'Wolfram75', 'CC BY-SA 4.0', true)],
  ['rev-ruger-lcrx', 'REV-06', 'revolveres', 'Ruger LCRx 3"', 'Ruger', 'ruger', '.38 Special +P · consultar variante', 'Revólver doble y simple acción', '5 tiros', 'Revólver liviano · armazón con polímero',
    'Revólver liviano de la familia LCR, con martillo expuesto en la versión LCRx. Consultá calibre y largo de cañón disponibles.',
    commonsPhoto('Ruger LCRx 3in.jpg', 'HalfGig', 'CC BY 3.0', true)],
  // Carabinas
  ['car-ruger-1022', 'CAR-01', 'carabinas', 'Ruger 10/22', 'Ruger', 'ruger', '.22 LR', 'Semiautomática', 'Cargador rotativo de 10', 'Carabina .22 LR · semiautomática',
    'Una de las carabinas .22 más populares del mundo, ideal para iniciación, tiro deportivo y control de plagas. Gran disponibilidad de accesorios.',
    commonsPhoto('Ruger-1022.jpg', 'Dictouray', 'CC BY-SA 3.0', true)],
  ['car-cz-457-lux', 'CAR-02', 'carabinas', 'CZ 457 Lux', 'CZ', 'cz', '.22 LR · consultar variante', 'Cerrojo', 'Consultar', 'Carabina de cerrojo · culata de madera',
    'Carabina de cerrojo de la plataforma CZ 457, con culata de madera estilo clásico. Precisión reconocida en calibres de percusión anular.',
    commonsPhoto('CZ 457 Lux.jpg', 'Fanchigo', 'CC0', true)],
  ['car-cz-457-inox', 'CAR-03', 'carabinas', 'CZ 457 Inoxidable', 'CZ', 'cz', '.22 LR · consultar variante', 'Cerrojo', 'Consultar', 'Carabina de cerrojo · acero inoxidable',
    'Variante de la CZ 457 con cañón de acero inoxidable. La foto muestra el arma con óptica montada: consultá qué incluye la unidad.',
    commonsPhoto('CZ 457 STAILESS.jpg', 'Land68', 'CC0', true)],
  ['car-marlin-60', 'CAR-04', 'carabinas', 'Marlin Model 60', 'Marlin', 'marlin', '.22 LR', 'Semiautomática', 'Cargador tubular', 'Carabina .22 LR · semiautomática',
    'Carabina semiautomática .22 LR con cargador tubular, muy difundida para tiro recreativo. Versión con cañón inoxidable y culata laminada.',
    commonsPhoto('Marlin Model 60 SSBL.JPG', 'Brethart77', 'CC BY-SA 3.0', true)],
  ['car-marlin-336', 'CAR-05', 'carabinas', 'Marlin 336', 'Marlin', 'marlin', '.30-30 Winchester', 'Acción de palanca', 'Cargador tubular', 'Acción de palanca · .30-30',
    'Clásica carabina de acción de palanca, muy usada para caza mayor a distancias cortas y medias.',
    commonsPhoto('Marlin 336W.png', 'Boris Barowski', 'CC BY-SA 3.0', true)],
  ['car-henry-golden-boy', 'CAR-06', 'carabinas', 'Henry Golden Boy', 'Henry', 'henry', '.22 S / L / LR', 'Acción de palanca', 'Cargador tubular', 'Acción de palanca · .22 · cajón de bronce',
    'Carabina de palanca .22 con el característico cajón de bronce pulido y culata de nogal. Muy buscada por su terminación.',
    commonsPhoto('Henry H004 Golden Boy .22 S-L-LR.jpg', 'Dcl412', 'CC BY-SA 4.0', true)],
  // Fusiles
  ['fus-remington-700', 'FUS-01', 'fusiles', 'Remington 700', 'Remington', 'remington', 'Varios calibres · consultar', 'Cerrojo', 'Consultar variante', 'Fusil de cerrojo · caza y precisión',
    'Fusil de cerrojo de referencia para caza y tiro de precisión, con una enorme oferta de calibres y accesorios.',
    commonsPhoto('Remington 700 Standard.jpg', 'Rizuan', 'CC BY-SA 3.0', true)],
  ['fus-winchester-70', 'FUS-02', 'fusiles', 'Winchester Model 70 Featherweight', 'Winchester', 'winchester', 'Varios calibres · consultar', 'Cerrojo', 'Consultar variante', 'Fusil de cerrojo · clásico de caza',
    'Versión Featherweight del clásico Model 70, liviana y con culata de madera. Ideal para caza en recorrido.',
    commonsPhoto('Winchester Model 70 Classic Featherweight .300 WSM.jpg', 'Efeesh', 'CC BY 4.0', true)],
  ['fus-tikka-t3-sporter', 'FUS-03', 'fusiles', 'Tikka T3 Sporter', 'Tikka', 'tikka', 'Varios calibres · consultar', 'Cerrojo', 'Consultar variante', 'Fusil de cerrojo · tiro deportivo',
    'Fusil de cerrojo finlandés orientado al tiro deportivo, con culata regulable. Reconocido por su precisión y suavidad de cerrojo.',
    commonsPhoto('Tikka-T3-Sporter.jpg', 'Picanox', 'CC BY-SA 4.0', true)],
  ['fus-ruger-american', 'FUS-04', 'fusiles', 'Ruger American Rifle', 'Ruger', 'ruger', 'Varios calibres · consultar', 'Cerrojo', 'Consultar variante', 'Fusil de cerrojo · caza',
    'Fusil de cerrojo de excelente relación precio-precisión, con gatillo regulable y culata sintética.',
    commonsPhoto('Ruger-American-Rifle.jpg', 'Sturm, Ruger & Co.', 'CC BY-SA 3.0', true)],
  // PCC
  ['pcc-ruger-pc-carbine', 'PCC-01', 'pcc', 'Ruger PC Carbine', 'Ruger', 'ruger', '9×19 mm', 'Semiautomática', 'Consultar', 'Carabina de calibre de pistola · 9 mm',
    'Carabina semiautomática en 9 mm con sistema desarmable y cargadores intercambiables según versión.',
    commonsPhoto('Ruger-PC-Carbine-9mm.jpg', 'Picanox', 'CC BY-SA 4.0', true)],
  ['pcc-cz-evo3-s1', 'PCC-02', 'pcc', 'CZ Scorpion EVO 3 S1 Carbine', 'CZ', 'cz', '9×19 mm', 'Semiautomática', 'Consultar', 'Carabina de calibre de pistola · 9 mm',
    'Versión carabina semiautomática de la plataforma Scorpion EVO 3. Consultá configuración y requisitos.',
    commonsPhoto('CZ EVO 3 S1 right.jpg', 'Costas-1963', 'CC0', true)],
  // Pistolas adicionales
  ['pis-bersa-thunder-380', 'PIS-01', 'pistolas', 'Bersa Thunder 380', 'Bersa', 'bersa', '.380 ACP', 'Semiautomática doble y simple acción', 'Consultar', 'Pistola · .380 ACP · fabricación argentina',
    'Pistola compacta de Bersa, fabricante argentino, muy difundida para uso civil. Foto de la versión niquelada.',
    commonsPhoto('Bersa Thunder 380 nickel.jpg', 'Ptkfgs', 'Dominio público', true)],
  ['pis-bersa-thunder-40-pro', 'PIS-02', 'pistolas', 'Bersa Thunder 40 Pro', 'Bersa', 'bersa', '.40 S&W', 'Semiautomática', 'Consultar', 'Pistola · .40 S&W · fabricación argentina',
    'Pistola de la línea Thunder Pro de Bersa en calibre .40. Consultá disponibilidad y variante.',
    commonsPhoto('Bersa Thunder 40 Pro.jpg', 'Ws4590', 'CC BY-SA 3.0', true)],
  ['pis-taurus-g2c', 'PIS-03', 'pistolas', 'Taurus G2C', 'Taurus', 'taurus', '9×19 mm', 'Semiautomática', 'Consultar', 'Pistola compacta · 9 mm',
    'Pistola compacta de polímero de Taurus, pensada para portación. Consultá cargadores y variante disponible.',
    commonsPhoto('Taurus G2C 9mm Sn 1C014003 R DSC0275.jpg', 'Self Loader', 'CC BY-SA 4.0', true)],
].map(([id, code, subcategory, name, brand, source, caliber, action, capacity, shortDescription, description, photo]) => ({
  id, code, name, brand, sector: 'armeria', category: 'armas', subcategory, caliber, shortDescription,
  description: `${description} Modelo, variante y disponibilidad deben confirmarse con Armería Parabellum.`,
  specs: [['Sistema', action], ['Capacidad', capacity]],
  price: null, regulated: true, photo,
  sourceUrl: source ? official[source].url : undefined,
  sourceLabel: source ? official[source].label : undefined,
}));

const A = 'armeria';
const C = 'camping';
const ref = 'Por confirmar';

const localProducts = [
  ...pistols,
  ...armasLargasYRevolveres,
  { id: 'accesorio-kit-mantenimiento', code: 'ACC-06', name: 'Kit de cuidado y mantenimiento', brand: ref, sector: A, category: 'accesorios', subcategory: 'limpieza', shortDescription: 'Accesorio de cuidado · contenido a confirmar', description: 'Referencia visual de un kit de cuidado. Contenido, compatibilidad, marca y disponibilidad deben confirmarse con la armería.', price: null, icon: '◇' },
  { id: 'accesorio-optica', code: 'ACC-01', name: 'Óptica de precisión', brand: ref, sector: A, category: 'accesorios', subcategory: 'optica', shortDescription: 'Óptica · aumentos y compatibilidad a confirmar', description: 'Referencia visual de óptica. Marca, aumentos, retícula, compatibilidad y disponibilidad deben verificarse con la armería.', price: null, icon: '◉', photo: photoLibrary.scope },
  { id: 'accesorio-binoculares', code: 'ACC-03', name: 'Binoculares de campo', brand: ref, sector: A, category: 'accesorios', subcategory: 'optica', shortDescription: 'Observación outdoor · foto y ficha técnica por confirmar', description: 'Referencia de binoculares para actividades de observación. Aumentos, marca, accesorios y disponibilidad por confirmar.', price: null, icon: '◎', photo: photoLibrary.binoculars },
  { id: 'accesorio-correa-transporte', code: 'ACC-07', name: 'Correa de transporte', brand: ref, sector: A, category: 'accesorios', subcategory: 'correaje', shortDescription: 'Transporte · materiales y compatibilidad a confirmar', description: 'Referencia de correa de transporte. Materiales, compatibilidad, marca y disponibilidad por confirmar.', price: null, icon: '⌁' },
  { id: 'accesorio-proteccion', code: 'ACC-04', name: 'Protección auditiva', brand: ref, sector: A, category: 'accesorios', subcategory: 'proteccion', shortDescription: 'Protección personal · certificación a confirmar', description: 'Referencia de protección auditiva. Marca, nivel de atenuación, certificaciones y disponibilidad por confirmar.', price: null, icon: '◖', photo: photoLibrary.earDefenders },
  { id: 'accesorio-funda', code: 'ACC-02', name: 'Funda de transporte', brand: ref, sector: A, category: 'accesorios', subcategory: 'fundas-transporte', shortDescription: 'Protección y transporte · formato a confirmar', description: 'Referencia de funda de transporte. Compatibilidad, materiales, marca y disponibilidad por confirmar.', price: null, icon: '▤', photo: photoLibrary.holster },
  { id: 'accesorio-estuche', code: 'ACC-05', name: 'Estuche rígido de transporte', brand: ref, sector: A, category: 'accesorios', subcategory: 'fundas-transporte', shortDescription: 'Protección y guardado · formato a confirmar', description: 'Referencia de estuche para transporte y guardado. Medidas, material, marca y disponibilidad deben confirmarse con la armería.', price: null, icon: '▤', photo: photoLibrary.gunCase },
  { id: 'accesorio-bolso', code: 'ACC-08', name: 'Bolso de campo', brand: ref, sector: A, category: 'accesorios', subcategory: 'otros', shortDescription: 'Organización outdoor · capacidad a confirmar', description: 'Referencia visual de bolso de campo. Capacidad, materiales, marca y disponibilidad deben verificarse con la armería.', price: null, icon: '▤', photo: photoLibrary.backpack },
  // Camping & Outdoor
  { id: 'camping-tienda', code: 'CAM-04', name: 'Carpa de expedición', brand: ref, sector: C, category: 'carpas', shortDescription: 'Refugio outdoor · capacidad a confirmar', description: 'Referencia visual de carpa para actividades outdoor. Capacidad, materiales, peso y disponibilidad por confirmar.', price: null, icon: '△', photo: photoLibrary.tent },
  { id: 'cuchillo-campo', code: 'CUC-01', name: 'Cuchillo de campamento', brand: ref, sector: C, category: 'cuchillos', shortDescription: 'Herramienta de campo · foto y ficha técnica por confirmar', description: 'Referencia visual de cuchillo de campamento. Marca, materiales, tipo y disponibilidad deben ser confirmados por la armería.', price: null, icon: '◇', photo: photoLibrary.knife },
  { id: 'linterna', code: 'CAM-02', name: 'Linterna de campo', brand: ref, sector: C, category: 'linternas', shortDescription: 'Iluminación portátil · especificaciones a confirmar', description: 'Referencia de iluminación para actividades al aire libre. Marca, autonomía, alimentación y disponibilidad por confirmar.', price: null, icon: '◉', photo: photoLibrary.flashlight },
  { id: 'mochila', code: 'CAM-01', name: 'Mochila de expedición', brand: ref, sector: C, category: 'mochilas-bolsos', shortDescription: 'Equipamiento outdoor · capacidad a confirmar', description: 'Referencia para equipamiento de expedición. Marca, capacidad, materiales y disponibilidad por confirmar con la armería.', price: null, icon: '▤', photo: photoLibrary.backpack },
  { id: 'cantimplora', code: 'CAM-03', name: 'Cantimplora outdoor', brand: ref, sector: C, category: 'accesorios-camping', shortDescription: 'Hidratación en exteriores · capacidad a confirmar', description: 'Referencia de recipiente outdoor. Marca, capacidad, material y disponibilidad por confirmar con la armería.', price: null, icon: '♧', photo: photoLibrary.bottle },
].map(normalizeProduct);

// ───────────────────────────────────────────────────────────────────────────
// CATÁLOGO EN SUPABASE
// ───────────────────────────────────────────────────────────────────────────
// Si Supabase está configurado se cargan los productos publicados de la tabla
// `productos`; si falla, tarda demasiado o viene vacía, se usa localProducts.
// La tabla no guarda icon, specs, fuente oficial, finish, photos ni complements:
// esos campos se toman de la ficha local con el mismo id.
const REMOTE_TIMEOUT_MS = 4000;
const LOCAL_ONLY_FIELDS = ['icon', 'specs', 'sourceUrl', 'sourceLabel', 'finish', 'photos', 'complements'];

function fromRow(row, index) {
  const local = localProducts.find(product => product.id === row.id);
  const product = {
    id: row.id,
    code: row.code ?? undefined,
    name: row.name,
    brand: row.brand ?? undefined,
    sector: row.sector,
    category: row.category,
    subcategory: row.subcategory ?? undefined,
    shortDescription: row.short_description ?? undefined,
    description: row.description ?? undefined,
    price: row.price == null ? null : Number(row.price),
    offer: row.offer_active ? { active: true, previousPrice: row.previous_price == null ? null : Number(row.previous_price) } : null,
    stock: row.stock ?? undefined,
    availability: row.availability ?? undefined,
    regulated: row.regulated,
    caliber: row.caliber ?? undefined,
    condition: row.condition,
    conditionGrade: row.condition_grade ?? undefined,
    conditionNotes: row.condition_notes ?? undefined,
    isNew: row.is_new,
    dateAdded: row.date_added ?? undefined,
    published: row.published,
    photo: row.photo ? { ...row.photo, exact: local?.photo?.src === row.photo.src && Boolean(local.photo.exact) } : local?.photo,
  };
  if (local) for (const key of LOCAL_ONLY_FIELDS) if (local[key] !== undefined) product[key] = local[key];
  return normalizeProduct(product, index);
}

async function loadRemoteProducts() {
  if (!supabaseConfigured) return null;
  try {
    const rows = await Promise.race([
      fetchProductos(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('tiempo de espera agotado')), REMOTE_TIMEOUT_MS)),
    ]);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows.map(fromRow);
  } catch (error) {
    console.error('Catálogo remoto no disponible, se usa el local:', error);
    return null;
  }
}

// Top-level await: script.js recibe `products` ya resuelto, sin cambios.
export const products = (await loadRemoteProducts()) ?? localProducts;

// Usados de ejemplo (solo modo demostración): copian la ficha de un modelo del
// catálogo y se rotulan como "Ejemplo".
if (DEMO_MODE) {
  for (const used of demoUsados) {
    const base = products.find(product => product.id === used.baseId);
    if (!base) continue;
    products.push(normalizeProduct({
      ...base, id: used.id, code: used.code, condition: 'usado', conditionGrade: used.grade, conditionNotes: used.notes,
      price: null, demoPrice: false, offer: null, isNew: false, dateAdded: null, demoUsed: true, order: products.length,
    }, products.length));
  }
}

export function usados(sectorId) {
  return productsForSector(sectorId).filter(product => product.condition === 'usado');
}

export function productsForSector(sectorId) {
  return products.filter(product => product.sector === sectorId && product.published);
}

export function novedades(sectorId, limit) {
  return productsForSector(sectorId)
    .filter(product => product.isNew)
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
    .slice(0, limit);
}

export function ofertas(sectorId) {
  return productsForSector(sectorId).filter(product => product.offer);
}

export const manufacturers = Object.values(sources);
