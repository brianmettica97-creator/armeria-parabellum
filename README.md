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
