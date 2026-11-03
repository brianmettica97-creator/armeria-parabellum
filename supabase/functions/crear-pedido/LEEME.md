# Pago online · crear-pedido

Función de servidor (Supabase Edge Function) que recibe el carrito, **recalcula todo con la base** y registra el pedido.
El navegador solo manda *qué* productos y *cuántos*. Armas y municiones (`regulated = true`) se rechazan siempre.

## Estado
- ✅ Validación del carrito y de los datos (`validar.js`, con pruebas: `node --test tests/validar-pedido.test.mjs`).
- ✅ Tabla `pedidos` con seguridad (`supabase/migrations/20261103000000_pedidos.sql`). Probada: el público no puede leer, crear ni modificar pedidos.
- ✅ Botón "Comprar Online" conectado, **apagado** (`ONLINE_PAYMENT_ENABLED = false` en `config.js`).
- ⏳ Paso de Payway (`payway.ts`): **sin verificar**. Falta confirmar con Payway (ver abajo). Hasta entonces la función registra el pedido y el sitio sigue por WhatsApp.
- ❌ Falta la **confirmación del pago en el servidor** (consultar a Payway si el pago se aprobó y pasar el pedido a `pagado`). Sin eso, un pedido nunca debe darse por cobrado.
- ❌ Falta decidir el **costo de envío** (hoy `envio_centavos = 0`: se coordina por WhatsApp).

## A confirmar con Payway (integraciones-ventasonline@payway.com.ar)
1. Documentación del **formulario de pago** (`/validate` + `/form`): la pública solo describe la Transacción Simple.
2. Direcciones base de **sandbox y producción** de `/validate` y del formulario.
3. Qué **apikey** va en el header de `/validate` (¿la privada o una "PCI"/validación aparte?).
4. Si `amount` va en **centavos o en pesos**.
5. **Cómo consultar el estado** de un pago después de volver y qué estados existen.
6. Si el sitio necesita el bloque `fraud_detection`.

## Publicar (cuando Payway responda)
1. Supabase → SQL Editor → pegar y correr `20261103000000_pedidos.sql`.
2. Publicar la función **sin verificación de JWT** (la clave nueva `sb_publishable_…` no es un JWT): 
   `supabase functions deploy crear-pedido --no-verify-jwt`
3. Cargar los secretos (**nunca** en el código ni en GitHub; el repositorio es público):
   ```
   supabase secrets set PAYWAY_AMBIENTE=prueba \
     PAYWAY_API_BASE=...  PAYWAY_FORM_BASE=...  PAYWAY_VALIDATE_APIKEY=... \
     PAYWAY_PUBLIC_KEY=... PAYWAY_SITE_ID=93146892 PAYWAY_TEMPLATE_ID=159940 \
     SITIO_URL=https://brianmettica97-creator.github.io/armeria-parabellum \
     ORIGENES_PERMITIDOS=https://brianmettica97-creator.github.io
   ```
   (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los pone Supabase solo.)
4. Probar en sandbox con tarjetas de prueba. Recién ahí poner `ONLINE_PAYMENT_ENABLED = true`.
5. Para producción: **claves nuevas** generadas en el panel de Payway (las actuales circularon por un grupo de WhatsApp), `PAYWAY_AMBIENTE=produccion` y los Site/Template ID de producción.

## Antes de cobrar de verdad
- `legales.html` (sección 3) hoy dice que **no se hacen cobros en línea**: hay que actualizarlo (con asesor legal): pagos, envíos, **botón de arrepentimiento y devoluciones**, datos personales.
- Definir con el cliente: costo de envío, qué pasa si falta stock de algo ya pagado, y cómo se entera de cada venta (mail o WhatsApp automático).
