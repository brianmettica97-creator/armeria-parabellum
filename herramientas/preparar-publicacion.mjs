// Prepara los datos para buscadores y redes sociales a partir de config.js.
//
// Uso (desde la carpeta del proyecto):
//   node herramientas/preparar-publicacion.mjs                       → solo datos del local (sin dominio)
//   node herramientas/preparar-publicacion.mjs https://parabellum.com.ar  → completo + sitemap.xml + robots.txt
//
// Reescribe únicamente el bloque entre <!-- seo:inicio --> y <!-- seo:fin --> de cada página,
// así que se puede ejecutar todas las veces que haga falta.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { STORE } = await import(pathToFileURL(path.join(root, 'config.js')).href);

const rawDomain = (process.argv[2] || '').trim().replace(/\/+$/, '');
if (rawDomain && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(rawDomain)) {
  console.error('El dominio debe tener la forma https://ejemplo.com.ar');
  process.exit(1);
}
const domain = rawDomain;
const abs = file => (domain ? `${domain}/${file}` : '');

const pages = [
  { file: 'index.html', path: '', image: 'assets/og/inicio.jpg', title: 'Parabellum La Plata · Armería y Camping & Outdoor', schema: 'Store', schemaName: STORE.name },
  { file: 'armeria.html', path: 'armeria.html', image: 'assets/og/armeria.jpg', title: 'Armería Parabellum · Armas, municiones y accesorios en La Plata', schema: 'Store', schemaName: STORE.name },
  { file: 'camping.html', path: 'camping.html', image: 'assets/og/camping.jpg', title: 'Outdoor Parabellum · Camping y aire libre en La Plata', schema: 'SportingGoodsStore', schemaName: 'Outdoor Parabellum · Camping & Outdoor' },
  { file: 'legales.html', path: 'legales.html', image: 'assets/og/armeria.jpg', title: 'Términos, privacidad y artículos regulados · Armería Parabellum', schema: null },
];

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function openingHours() {
  const groups = new Map();
  for (const [day, slot] of Object.entries(STORE.hours)) {
    if (!slot) continue;
    const key = slot.join('-');
    if (!groups.has(key)) groups.set(key, { '@type': 'OpeningHoursSpecification', dayOfWeek: [], opens: slot[0], closes: slot[1] });
    groups.get(key).dayOfWeek.push(DAY[Number(day)]);
  }
  return [...groups.values()];
}

function structuredData(page) {
  const data = {
    '@context': 'https://schema.org',
    '@type': page.schema,
    name: page.schemaName,
    telephone: STORE.phoneIntl,
    email: STORE.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: STORE.street.replace('Nº ', ''),
      addressLocality: STORE.city,
      postalCode: STORE.postalCode,
      addressRegion: STORE.region,
      addressCountry: STORE.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: STORE.geo.lat, longitude: STORE.geo.lng },
    openingHoursSpecification: openingHours(),
    hasMap: STORE.mapsUrl,
    sameAs: [`https://www.instagram.com/${STORE.instagram}`, STORE.mapsUrl],
  };
  if (domain) { data.url = abs(page.path); data.image = abs(page.image); }
  return `  <script type="application/ld+json">${JSON.stringify(data)}</script>\n`;
}

function seoBlock(page) {
  let out = '  <!-- seo:inicio (generado por herramientas/preparar-publicacion.mjs) -->\n';
  out += '  <meta property="og:locale" content="es_AR">\n';
  out += `  <meta property="og:site_name" content="Parabellum La Plata">\n`;
  out += '  <meta name="twitter:card" content="summary_large_image">\n';
  if (domain) {
    out += `  <link rel="canonical" href="${abs(page.path)}">\n`;
    out += `  <meta property="og:url" content="${abs(page.path)}">\n`;
    out += `  <meta property="og:image" content="${abs(page.image)}">\n`;
    out += '  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n';
    out += `  <meta name="twitter:image" content="${abs(page.image)}">\n`;
  }
  if (page.schema) out += structuredData(page);
  out += '  <!-- seo:fin -->';
  return out;
}

for (const page of pages) {
  const file = path.join(root, page.file);
  const html = await readFile(file, 'utf8');
  const pattern = /  <!-- seo:inicio[\s\S]*?<!-- seo:fin -->/;
  if (!pattern.test(html)) { console.warn(`Sin marcadores seo en ${page.file}, se omite.`); continue; }
  await writeFile(file, html.replace(pattern, seoBlock(page)));
  console.log(`✓ ${page.file}`);
}

if (domain) {
  const today = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${abs(page.path)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(path.join(root, 'sitemap.xml'), sitemap);
  await writeFile(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /herramientas/\n\nSitemap: ${domain}/sitemap.xml\n`);
  console.log('✓ sitemap.xml y robots.txt');
} else {
  console.log('Sin dominio: se cargaron los datos del local. Volvé a ejecutar con el dominio para completar enlaces e imágenes para compartir.');
}
