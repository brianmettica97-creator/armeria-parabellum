// Pruebas de la validación del pedido en el servidor.
// Correr con:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCarrito, validarComprador } from '../supabase/functions/crear-pedido/validar.js';

const catalogo = [
  { id: 'protector', name: 'Protector auditivo', price: 1999.99, stock: 5, published: true, regulated: false, availability: 'disponible' },
  { id: 'mira', name: 'Mira', price: 25000, stock: null, published: true, regulated: false, availability: 'disponible' },
  { id: 'arma-9', name: 'Pistola 9 mm', price: 900000, stock: 1, published: true, regulated: true, availability: 'disponible' },
  { id: 'oculto', name: 'Oculto', price: 100, stock: 3, published: false, regulated: false, availability: 'disponible' },
  { id: 'agotado', name: 'Agotado', price: 100, stock: 3, published: true, regulated: false, availability: 'agotado' },
  { id: 'sin-stock', name: 'Sin stock', price: 100, stock: 0, published: true, regulated: false, availability: 'disponible' },
  { id: 'sin-precio', name: 'Sin precio', price: null, stock: 3, published: true, regulated: false, availability: 'consultar' },
  { id: 'gratis', name: 'Gratis', price: 0, stock: 3, published: true, regulated: false, availability: 'disponible' },
];

test('el total sale de los precios de la base y se calcula en centavos sin errores de decimales', () => {
  const r = validarCarrito([{ id: 'protector', qty: 3 }, { id: 'mira', qty: 1 }], catalogo);
  assert.equal(r.ok, true);
  assert.equal(r.totalCentavos, 199999 * 3 + 2500000);
  assert.equal(r.lineas[0].precioUnitarioCentavos, 199999);
});

test('ignora cualquier precio que mande el navegador', () => {
  const r = validarCarrito([{ id: 'protector', qty: 1, price: 1, precio: 1, unitPrice: 1 }], catalogo);
  assert.equal(r.ok, true);
  assert.equal(r.totalCentavos, 199999);
});

test('rechaza productos regulados (armas y municiones)', () => {
  const r = validarCarrito([{ id: 'arma-9', qty: 1 }], catalogo);
  assert.equal(r.ok, false);
  assert.equal(r.errores[0].codigo, 'regulado');
});

test('rechaza productos ocultos, agotados, sin stock, sin precio, de precio cero o inexistentes', () => {
  const casos = { oculto: 'no_disponible', agotado: 'no_disponible', 'sin-stock': 'no_disponible', 'sin-precio': 'sin_precio', gratis: 'sin_precio', inexistente: 'no_existe' };
  for (const [id, codigo] of Object.entries(casos)) {
    const r = validarCarrito([{ id, qty: 1 }], catalogo);
    assert.equal(r.ok, false, id);
    assert.equal(r.errores[0].codigo, codigo, id);
  }
});

test('rechaza cantidades que superan el stock o el máximo por artículo', () => {
  assert.equal(validarCarrito([{ id: 'protector', qty: 6 }], catalogo).errores[0].codigo, 'cantidad_excedida');
  assert.equal(validarCarrito([{ id: 'mira', qty: 21 }], catalogo).errores[0].codigo, 'cantidad_excedida');
  assert.equal(validarCarrito([{ id: 'mira', qty: 20 }], catalogo).ok, true);
});

test('rechaza cantidades inválidas', () => {
  for (const qty of [0, -1, 1.5, '2', NaN, null, undefined, Infinity]) {
    const r = validarCarrito([{ id: 'mira', qty }], catalogo);
    assert.equal(r.ok, false, String(qty));
    assert.equal(r.errores[0].codigo, 'cantidad_invalida', String(qty));
  }
});

test('suma las líneas repetidas del mismo producto y respeta el stock sobre la suma', () => {
  const r = validarCarrito([{ id: 'protector', qty: 2 }, { id: 'protector', qty: 2 }], catalogo);
  assert.equal(r.ok, true);
  assert.equal(r.lineas.length, 1);
  assert.equal(r.lineas[0].qty, 4);
  assert.equal(validarCarrito([{ id: 'protector', qty: 3 }, { id: 'protector', qty: 3 }], catalogo).ok, false);
});

test('rechaza carritos vacíos, mal formados o demasiado grandes', () => {
  assert.equal(validarCarrito([], catalogo).errores[0].codigo, 'carrito_vacio');
  assert.equal(validarCarrito(null, catalogo).errores[0].codigo, 'carrito_vacio');
  assert.equal(validarCarrito('mira', catalogo).errores[0].codigo, 'carrito_vacio');
  const muchos = Array.from({ length: 31 }, (_, i) => ({ id: `p${i}`, qty: 1 }));
  assert.equal(validarCarrito(muchos, catalogo).errores[0].codigo, 'carrito_grande');
});

test('un ítem sin id válido se rechaza', () => {
  for (const id of [undefined, null, '', 5, {}]) {
    assert.equal(validarCarrito([{ id, qty: 1 }], catalogo).errores[0].codigo, 'no_existe');
  }
});

const comprador = { nombre: 'Juan Pérez', telefono: '221 555-1234', email: 'juan@correo.com', direccion: 'Calle 13 Nº 27', localidad: 'La Plata', cp: '1900', provincia: 'Buenos Aires' };

test('valida los datos del comprador y los limpia', () => {
  const r = validarComprador({ ...comprador, nombre: '  Juan Pérez  ', extra: 'x' });
  assert.equal(r.ok, true);
  assert.equal(r.datos.nombre, 'Juan Pérez');
  assert.equal(r.datos.extra, undefined);
});

test('rechaza comprador con campos vacíos, mail inválido o textos enormes', () => {
  for (const campo of Object.keys(comprador)) {
    assert.equal(validarComprador({ ...comprador, [campo]: '   ' }).ok, false, campo);
    assert.equal(validarComprador({ ...comprador, [campo]: undefined }).ok, false, campo);
  }
  assert.equal(validarComprador({ ...comprador, email: 'no-es-mail' }).ok, false);
  assert.equal(validarComprador({ ...comprador, direccion: 'x'.repeat(300) }).ok, false);
  assert.equal(validarComprador(null).ok, false);
});
