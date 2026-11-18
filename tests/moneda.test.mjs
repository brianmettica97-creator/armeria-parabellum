// Pruebas de la doble moneda (mejora "doble-moneda").
// Correr con:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarMoneda, enPesos, enDolares, formatoDolares } from '../moneda.js';

test('reconoce las formas habituales de escribir dólares', () => {
  for (const texto of ['USD', 'usd', 'U$S', 'u$s', 'US$', 'Dólares', 'dolares', 'Dólar']) assert.equal(normalizarMoneda(texto), 'USD', texto);
  for (const texto of ['', null, 'ARS', 'Pesos', '$']) assert.equal(normalizarMoneda(texto), 'ARS', String(texto));
});

test('dólares a pesos: redondea a pesos enteros', () => {
  assert.equal(enPesos(850, 'USD', 1200), 1020000);
  assert.equal(enPesos(849.99, 'USD', 1235.5), Math.round(849.99 * 1235.5));
  assert.equal(enPesos(1250000, 'ARS', 1200), 1250000);
});

test('pesos a dólares: redondea a dólares enteros', () => {
  assert.equal(enDolares(1020000, 'ARS', 1200), 850);
  assert.equal(enDolares(1250000, 'ARS', 1235.5), Math.round(1250000 / 1235.5));
  assert.equal(enDolares(850, 'USD', 1200), 850);
});

test('sin cotización no se inventa el otro valor', () => {
  for (const dolar of [null, undefined, 0, -1, NaN]) {
    assert.equal(enPesos(850, 'USD', dolar), null);
    assert.equal(enDolares(1020000, 'ARS', dolar), null);
  }
  assert.equal(enPesos(1020000, 'ARS', null), 1020000);
  assert.equal(enDolares(850, 'USD', null), 850);
});

test('sin precio devuelve null', () => {
  assert.equal(enPesos(null, 'USD', 1200), null);
  assert.equal(enDolares(null, 'ARS', 1200), null);
});

test('formato en dólares', () => {
  assert.equal(formatoDolares(850), 'USD 850');
  assert.equal(formatoDolares(1250), 'USD 1.250');
  assert.equal(formatoDolares(849.5), 'USD 849,5');
});
