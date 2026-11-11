# Armería Parabellum · Sitio web

Sitio de Armería Parabellum (La Plata) con dos sectores: **Armería** y **Camping & Outdoor**.
Catálogo con filtros, showroom interactivo, pedidos por WhatsApp, marcas, novedades, ofertas, usados y gestoría.

Sitio estático (HTML, CSS y JavaScript con módulos), sin dependencias ni compilación.

## Ver en local
Por usar módulos de JavaScript hay que abrirlo con un servidor, no con doble clic:

```
npx serve .
# o
python -m http.server 8080
```

## Publicar en GitHub Pages
1. En el repositorio: **Settings → Pages**.
2. En *Source* elegir **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. Guardar. En uno o dos minutos el sitio queda en `https://USUARIO.github.io/REPOSITORIO/`.

Antes de publicar para el cliente final:
- Poner `DEMO_MODE = false` en `config.js` (quita novedades, ofertas, usados y trámites de ejemplo).
- Con dominio propio, ejecutar `node herramientas/preparar-publicacion.mjs https://dominio` (enlaces para Google, imágenes para compartir, `sitemap.xml` y `robots.txt`).

## Dónde se edita cada cosa
Ver [`CONFIGURACION.md`](CONFIGURACION.md).

## Créditos de imágenes
Las fotos de productos de referencia provienen de Wikimedia Commons con licencias libres; el autor y la licencia se muestran en cada ficha.
Las marcas y logotipos pertenecen a sus respectivos titulares.

## Mejoras por lanzar (sección oculta del panel)
- `supabase/migrations/20261111000000_mejoras.sql`: crea la lista de desarrolladores, la tabla `mejoras`
  (apagada · solo nosotros · lanzada) y la columna `video` de los productos. Hay que correrlo una vez en
  Supabase → SQL Editor y después sumar el email del desarrollador:
  `insert into public.desarrolladores (email) values ('mail@ejemplo.com');`
- `admin-mejoras.js`: pestaña **Novedades** del panel (solo la ven los desarrolladores) y el bloque
  **Video automático** del editor de producto.
- `video-reel.js`: arma el video en un canvas a partir de la foto principal y los puntos marcados.
  En la ficha aparece solo si la mejora `video-producto` está **lanzada**.
- Sin correr el SQL, el panel y el sitio funcionan igual que antes.
- `asistente.js`: asistente "¿Qué me conviene?" del catálogo de Armería (mejora `asistente`). Los criterios
  de recomendación están al principio del archivo y conviene que la armería los revise.
- `qr.js` y la pestaña **Etiquetas** del panel (mejora `etiquetas-qr`): hoja A4 de etiquetas con QR a la ficha.
- `supabase/migrations/20261111010000_mejoras_asistente_qr.sql`: da de alta esas dos mejoras en "solo nosotros".
- Un desarrollador con la sesión del panel abierta ve en el sitio las mejoras en "solo nosotros".
- `metricas.js` y la pestaña **Resultados** del panel (mejora `tablero`): el sitio anota visitas, fichas vistas,
  consultas por WhatsApp y uso de cada mejora, sin datos personales, en la tabla `eventos`
  (`supabase/migrations/20261111020000_tablero.sql`). Con la mejora apagada, la base rechaza los eventos.
