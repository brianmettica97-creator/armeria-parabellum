# Armería Parabellum · Dónde se configura cada cosa

| Qué | Archivo |
|---|---|
| WhatsApp oficial (5492212269598), modo demostración, moneda | `config.js` |
| Dirección, teléfono, email, horarios, Instagram, calificación de Google | `config.js` → `STORE` |
| Fotos del showroom y sus puntos interactivos | `showroom.js` (fotos en `assets/showroom/`) |
| Textos legales | `legales.html` (modelo: revisar con asesor legal) |
| Secciones y subsecciones (Armas, Municiones, Recarga, Accesorios, Seguridad, Camping) | `taxonomy.js` → `sectors` |
| Marcas del carrusel, sus logos y rubros | `taxonomy.js` → `brands` y `brandCategories` (logos PNG blancos con fondo transparente en `assets/marcas/`) |
| Trámites de Gestoría aprobados por el cliente | `taxonomy.js` → `gestoriaServices` |
| Productos (precio, stock, novedad, oferta, complementos) | `catalog.js` |
| Contenido de ejemplo (solo modo demo) | `demo-data.js` |

## Antes de publicar
1. Poner `DEMO_MODE = false` en `config.js`: desaparece todo el contenido de `demo-data.js` (novedades, ofertas, usados y trámites de ejemplo). El WhatsApp oficial ya está cargado.
2. Falta el logo de Streamlight: guardarlo en `assets/marcas/streamlight.png` y completar `logo` en `taxonomy.js`.
2. Reemplazar las marcas por las que el comercio confirme, con logos autorizados.
3. Cargar los trámites de gestoría aprobados (sin requisitos ni plazos no confirmados).
4. Cargar los usados con `condition: 'usado'`, `conditionGrade` (estado) y `conditionNotes` (detalle) en `catalog.js`.
5. Cargar precios, ofertas (`offer: { active: true, previousPrice }`) y novedades (`isNew: true, dateAdded: 'AAAA-MM-DD'`) reales en `catalog.js`.

## Al publicar con dominio propio
Ejecutar una vez (y cada vez que cambien los datos del local):

```
node herramientas/preparar-publicacion.mjs https://tu-dominio.com.ar
```

Completa enlaces canónicos, imágenes para compartir en WhatsApp y redes, datos estructurados para Google, `sitemap.xml` y `robots.txt`.
Después, dar de alta el sitio en Google Search Console y cargar el `sitemap.xml`.

## Páginas
- `index.html` → portada con los dos sectores
- `armeria.html` → showroom + catálogo de armería, marcas, novedades, ofertas y gestoría
- `camping.html` → catálogo de camping, novedades y ofertas
- `legales.html` → términos, privacidad, artículos regulados y defensa del consumidor
- Enlace directo a un producto: `armeria.html?producto=arma-9`
- Enlaces directos a una sección: `armeria.html?cat=armas&sub=pistolas#catalogo`
