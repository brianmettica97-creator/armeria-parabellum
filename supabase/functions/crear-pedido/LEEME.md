# Pago online con Payway · cómo funciona y cómo publicarlo

Funciones de servidor (Supabase Edge Functions):
- `crear-pedido`: recibe el carrito, **recalcula todo con la base** (el navegador nunca decide un precio), rechaza armas y municiones, guarda el pedido como `pendiente` y pide a Payway un link de pago.
- `confirmar-pedido`: la página `pago.html` la llama al volver de Payway. Consulta a Payway (clave privada, desde el servidor) y pasa el pedido a `pagado` **solo** si hay un pago aprobado por el monto exacto, posterior al pedido y no usado antes (`conciliar.js`).
- Panel (`admin.html` → pestaña **Pedidos**): el local ve lo pagado, marca "despachado" y, si hiciera falta, confirma un pago a mano.

Basado en el **Manual de Integración Checkout v6** de Payway (template 1, sin Cybersource).

## Estado (2026-11-05)
- ✅ **Publicado en Supabase (modo prueba):** SQL aplicado, funciones `crear-pedido` y `confirmar-pedido` desplegadas y secretos de sandbox cargados. Verificado: rechaza orígenes ajenos, armas, carritos vacíos y referencias inválidas.
- ⏳ Falta probar con un producto real (hoy la base no tiene ningún producto publicado, no regulado y con precio) y el pago de prueba con tarjeta, a mano.
- ✅ Validación del carrito y los datos, con pruebas (`node --test tests/`: 20 pruebas).
- ✅ Crear el link de pago: **probado contra el sandbox real** (201 + `payment_link`) con las credenciales de prueba. Solo hace falta el header `apikey` (la clave privada).
- ✅ Tabla `pedidos` con seguridad (el público no puede leer ni escribir).
- ✅ Panel de pedidos y página de vuelta.
- ⏳ **Sin probar:** el pago con tarjeta de prueba de punta a punta. El formulario de Payway bloquea navegadores automatizados, así que se prueba a mano (ver abajo).
- ⏳ **Sin probar:** que el listado `GET /api/v2/payments` traiga el pago aprobado con `amount` en centavos, `status: "approved"` y `date` (se vio vacío y el ejemplo del manual). Si el formato difiere, se ajusta `conciliar.js`.
- ❌ Costo de envío: hoy `envio_centavos = 0` (se coordina por WhatsApp).
- ❌ Descuento de stock al cobrar: hoy no se descuenta solo.
- ❌ `legales.html` §3 dice que no se cobra en línea: hay que actualizarlo con asesor legal (pagos, envíos, botón de arrepentimiento, devoluciones, datos personales).

## Por qué se concilia por monto y hora
El link de Payway **no deja mandar nuestro número de pedido** y el pago trae un número propio. Por eso un pago aprobado se asocia al pedido pendiente del mismo monto (en centavos) creado antes del pago; con dos pedidos del mismo monto se asignan en orden, y un pago nunca cierra dos pedidos (índice único). Si Payway ofrece aviso automático (webhook) o un campo propio, conviene usarlo: es más sólido. Mientras tanto el botón "Confirmar pago a mano" del panel sirve de respaldo.

## Publicar
1. Supabase → SQL Editor: correr `20261103000000_pedidos.sql` y después `20261105000000_pedidos_conciliacion.sql`.
2. Publicar las dos funciones **sin verificación de JWT** (la clave `sb_publishable_…` no es un JWT):
   ```
   supabase functions deploy crear-pedido --no-verify-jwt
   supabase functions deploy confirmar-pedido --no-verify-jwt
   ```
3. Cargar los secretos (**nunca** en el código ni en GitHub: el repositorio es público):
   ```
   supabase secrets set PAYWAY_AMBIENTE=prueba \
     PAYWAY_PRIVATE_KEY=... PAYWAY_PUBLIC_KEY=... PAYWAY_SITE_ID=93146892 \
     SITIO_URL=https://brianmettica97-creator.github.io/armeria-parabellum \
     ORIGENES_PERMITIDOS=https://brianmettica97-creator.github.io
   ```
   Las direcciones de vuelta no pueden pasar de 100 caracteres (límite de Payway): con la URL de github.io alcanza; con el dominio propio sobra.
4. **Probar en sandbox a mano** con `ONLINE_PAYMENT_ENABLED = true` en una copia local: armar un carrito de accesorios, pagar con una tarjeta de prueba de Payway, volver a `pago.html` y ver "¡Pago aprobado!" y el pedido en Pedidos. Probar también un rechazo y cancelar.
5. Recién entonces activar `ONLINE_PAYMENT_ENABLED = true` en `config.js`.
6. Producción: **claves nuevas** generadas en el panel de Payway (las actuales circularon por chat y WhatsApp), `PAYWAY_AMBIENTE=produccion` y el Site ID de producción.
7. Con el dominio propio: cambiar `SITIO_URL` y `ORIGENES_PERMITIDOS`.

## Respuesta de Payway (2026-11-12)
- **Webhook:** sí hay aviso automático de pago. Falta pedirles la documentación (formato y firma del aviso) para sumarlo; hoy se concilia por monto y hora, que funciona y tiene el botón "Confirmar pago a mano" de respaldo.
- **Rubro:** Outdoor, miras y accesorios permitido.
- **Tarjetas y cuotas:** por defecto Visa y Master Payway; Cabal y Amex Payway "en veremos"; cuotas Mi PYME. Es información comercial: la define el comercio con su ejecutivo. El sitio manda 1 cuota y todos los medios habilitados.
- **Devoluciones:** totales o parciales desde la consola de DECIDIR (a mano, las hace el local). **Contracargos:** operatoria aparte; el local debe aportar evidencia de compra y entrega (guardar comprobantes y seguimiento de envío).
- **Cybersource (antifraude):** lo decide el comercio y se integra junto con el alta del checkout. Hoy el sitio usa template 1 (sin Cybersource); con Cybersource hay que pasar a otro template y pedir más datos del comprador.
- **Template ID:** lo explica el técnico asignado de Payway; recién después pasan a la siguiente etapa.
- **Acreditación y comisiones:** dependen de la modalidad y del cobro anticipado. Lo resuelve el dueño con su ejecutivo comercial.

## Lo que falta para cobrar en vivo
Del lado del sitio y del servidor ya está todo (pago probado dos veces en sandbox, descuento de stock al cobrar, textos legales). Lo que depende de Payway y del dueño:
1. Que Payway asigne el **técnico** y apruebe el pase a producción (Template ID).
2. Las **claves de producción** (Site ID 93086686), generadas por el dueño en el panel de Payway.
3. Que el dueño cierre con su ejecutivo **comisiones y plazo de acreditación**, y decida **Cybersource**.
4. Correr en Supabase `20261112000000_pedidos_stock.sql`.
5. Cargar los secretos de producción, activar `ONLINE_PAYMENT_ENABLED = true`, hacer una compra real chica con devolución desde la consola, y recién entonces abrir el sitio (`MAINTENANCE_MODE = false`).
