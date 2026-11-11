-- ───────────────────────────────────────────────────────────────────────────
-- Dos mejoras nuevas para la sección "Novedades" del panel · Armería Parabellum
-- Requiere haber corrido antes 20261111000000_mejoras.sql.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.mejoras (id, nombre, descripcion, estado) values
  ('asistente', 'Asistente "¿Qué me conviene?"',
   'En el catálogo de Armería, el visitante responde cinco preguntas (uso, tipo de arma, experiencia, nueva o usada, CLU) y ve hasta tres opciones del catálogo, con un botón para consultarlas juntas por WhatsApp.',
   'interna'),
  ('etiquetas-qr', 'Etiquetas con QR para la vitrina',
   'Pestaña "Etiquetas" del panel: se eligen productos y se imprime una hoja de etiquetas con nombre, marca, calibre, precio opcional y un QR que abre la ficha del producto en el celular del cliente.',
   'interna')
on conflict (id) do nothing;
