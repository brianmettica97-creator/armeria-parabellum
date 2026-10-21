// ───────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN COMERCIAL · ÚNICO LUGAR PARA EDITAR DATOS DE CONTACTO
// ───────────────────────────────────────────────────────────────────────────

// MODO DEMOSTRACIÓN
// true  → usa el número ficticio y el contenido de ejemplo de demo-data.js
//         (novedades, ofertas, usados y trámites de gestoría). Los precios y
//         fichas de ejemplo se rotulan como "Ejemplo" en cada producto.
// false → PRODUCCIÓN: solo datos reales. Poner en false antes de publicar.
export const DEMO_MODE = true;

// Barra superior que avisa "sitio de demostración" (desactivada a pedido).
export const SHOW_DEMO_BANNER = false;

// WhatsApp oficial de Armería Parabellum (+54 9 221 226-9598), solo dígitos
// y en formato internacional: 54 + 9 + código de área sin 0 + número sin 15.
// Todos los botones de consulta, pedidos y contacto usan este número.
export const WHATSAPP_PHONE = '5492212269598';

export const STORE_NAME = 'Armería Parabellum';

// Moneda en la que se publican los precios del catálogo.
export const CURRENCY = 'ARS';
export const LOCALE = 'es-AR';

// Cantidad máxima por artículo cuando el producto no informa stock.
export const DEFAULT_MAX_QUANTITY = 20;

// Cantidad máxima de productos en el carrusel "Últimos ingresos".
export const NOVEDADES_LIMIT = 10;

// Clave de almacenamiento local del pedido (compartido entre sectores y visitas).
export const CART_STORAGE_KEY = 'parabellum-cart-v2';
export const LEGACY_CART_STORAGE_KEY = 'parabellum-cart';

const validPhone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : '';
};

export function whatsappNumber() {
  return validPhone(WHATSAPP_PHONE);
}

// ───────────────────────────────────────────────────────────────────────────
// DATOS DEL LOCAL (tomados de la ficha de Google Maps, octubre 2026)
// ───────────────────────────────────────────────────────────────────────────
export const STORE = {
  name: 'Armería Parabellum',
  street: 'Calle 13 Nº 27',
  city: 'La Plata',
  postalCode: 'B1902CSA',
  region: 'Provincia de Buenos Aires',
  country: 'AR',
  phoneDisplay: '0221 226-9598',
  phoneIntl: '+542212269598',
  instagram: 'armeria_parabellum',
  email: 'parabellumoutdoor@gmail.com',
  geo: { lat: -34.9066819, lng: -57.974618 },
  mapsUrl: 'https://www.google.com/maps/place/Armer%C3%ADa+Parabellum/@-34.9066819,-57.974618,17z/data=!4m6!3m5!1s0x95a2e7bab613b10d:0xb1b42b153d8de6f4!8m2!3d-34.9066819!4d-57.974618!16s%2Fg%2F1tdp66ls',
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Armer%C3%ADa+Parabellum%2C+13+27%2C+La+Plata',
  mapEmbedUrl: 'https://www.google.com/maps?q=Armer%C3%ADa+Parabellum,+13+27,+La+Plata,+Buenos+Aires&z=16&output=embed',
  // Calificación pública en Google: actualizar de vez en cuando.
  rating: { value: 4.7, count: 446, asOf: 'octubre 2026' },
  // Horario semanal (0 = domingo). null = cerrado. Formato 'HH:MM'.
  hours: {
    0: null,
    1: null,
    2: ['09:00', '17:00'],
    3: ['09:00', '17:00'],
    4: ['09:00', '17:00'],
    5: ['09:00', '17:00'],
    6: ['09:00', '14:00'],
  },
  timeZone: 'America/Argentina/Buenos_Aires',
};

// Enlace a la Ventanilla Federal Única de Reclamos (Defensa del Consumidor).
export const CONSUMER_COMPLAINTS_URL = 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario';
