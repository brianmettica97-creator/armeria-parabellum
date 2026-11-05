// Pruebas del paso de Payway con respuestas simuladas (no sale ninguna llamada real).
// Correr con:  node --test tests/payway.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearLinkDePago, listarPagos } from '../supabase/functions/crear-pedido/payway.ts';
import { conciliar } from '../supabase/functions/crear-pedido/conciliar.js';

const pedido = { ref: 'a1b2c3d4e5f60718', totalCentavos: 150050, descripcion: 'Pedido a1b2c3d4' };
const completo = { PAYWAY_PRIVATE_KEY: 'privada', PAYWAY_PUBLIC_KEY: 'publica', PAYWAY_SITE_ID: '93146892', SITIO_URL: 'https://sitio.ejemplo/', PAYWAY_AMBIENTE: 'prueba' };
const env = vars => nombre => vars[nombre];
const conFetch = async (impl, fn) => { const o = globalThis.fetch; globalThis.fetch = impl; try { return await fn(); } finally { globalThis.fetch = o; } };

test('si falta una variable no llama a Payway', async () => {
  await conFetch(async () => { throw new Error('no debería llamar'); }, async () => {
    for (const faltante of ['PAYWAY_PRIVATE_KEY', 'PAYWAY_PUBLIC_KEY', 'PAYWAY_SITE_ID', 'SITIO_URL']) {
      const vars = { ...completo }; delete vars[faltante];
      const r = await crearLinkDePago(pedido, env(vars));
      assert.deepEqual([r.ok, r.motivo], [false, 'no_configurado'], faltante);
    }
  });
});

test('arma el link como pide el manual (sandbox, template 1, monto en pesos) y manda la clave privada', async () => {
  let enviado;
  await conFetch(async (url, init) => { enviado = { url, init }; return new Response(JSON.stringify({ payment_link: 'https://developers.decidir.com/web/checkout/ABC123' }), { status: 201 }); }, async () => {
    const r = await crearLinkDePago(pedido, env(completo));
    assert.equal(r.ok, true);
    assert.equal(r.url, 'https://developers.decidir.com/web/checkout/ABC123');
    assert.equal(enviado.url, 'https://developers-ventasonline.payway.com.ar/api/v1/checkout-payment-button/link');
    assert.equal(enviado.init.headers.apikey, 'privada');
    const c = JSON.parse(enviado.init.body);
    assert.equal(c.total_price, 1500.5);
    assert.equal(c.template_id, 1);
    assert.deepEqual(c.installments, [1]);
    assert.equal(c.public_apikey, 'publica');
    assert.equal(c.site, '93146892');
    assert.equal(c.success_url, 'https://sitio.ejemplo/pago.html?r=ok&p=a1b2c3d4e5f60718');
    assert.ok(c.success_url.length <= 100 && c.cancel_url.length <= 100);
  });
});

test('en producción usa la dirección de producción', async () => {
  let url;
  await conFetch(async u => { url = u; return new Response('{"payment_link":"https://live.decidir.com/web/checkout/X"}', { status: 201 }); }, async () => {
    await crearLinkDePago(pedido, env({ ...completo, PAYWAY_AMBIENTE: 'produccion' }));
    assert.ok(url.startsWith('https://ventasonline.payway.com.ar/api/v1/'));
  });
});

test('direcciones de vuelta de más de 100 caracteres: no llama a Payway', async () => {
  await conFetch(async () => { throw new Error('no debería llamar'); }, async () => {
    const r = await crearLinkDePago(pedido, env({ ...completo, SITIO_URL: `https://${'x'.repeat(80)}.com` }));
    assert.equal(r.motivo, 'payway_error');
  });
});

test('si Payway rechaza, responde raro o no hay red, avisa sin romper', async () => {
  await conFetch(async () => new Response('{"error":"x"}', { status: 400 }), async () => assert.equal((await crearLinkDePago(pedido, env(completo))).motivo, 'payway_rechazo'));
  await conFetch(async () => new Response('{"sin":"link"}', { status: 201 }), async () => assert.equal((await crearLinkDePago(pedido, env(completo))).motivo, 'payway_error'));
  await conFetch(async () => new Response('{"payment_link":"javascript:alert(1)"}', { status: 201 }), async () => assert.equal((await crearLinkDePago(pedido, env(completo))).motivo, 'payway_error'));
  await conFetch(async () => { throw new Error('sin red'); }, async () => assert.equal((await crearLinkDePago(pedido, env(completo))).motivo, 'payway_error'));
});

test('listarPagos junta páginas y devuelve null ante un error', async () => {
  const paginas = [{ results: [{ id: 1 }, { id: 2 }], hasMore: true }, { results: [{ id: 3 }], hasMore: false }];
  let n = 0;
  await conFetch(async () => new Response(JSON.stringify(paginas[n++]), { status: 200 }), async () => assert.equal((await listarPagos(env(completo))).length, 3));
  await conFetch(async () => new Response('', { status: 401 }), async () => assert.equal(await listarPagos(env(completo)), null));
});

// ── conciliación ──
const ped = (id, t, c) => ({ id, created_at: t, total_centavos: c });
const pago = (id, t, c, status = 'approved') => ({ id, date: t, amount: c, status });

test('la hora de Payway es hora argentina aunque diga Z (caso real de sandbox)', () => {
  // Pedido a las 05:16 UTC (02:16 en Argentina); pago informado como 02:31Z (= 02:31 en Argentina).
  assert.equal(conciliar([ped('P', '2026-11-05T05:16:37Z', 30000)], [pago(1, '2026-11-05T02:31Z', 30000)]).length, 1);
  assert.equal(conciliar([ped('P', '2026-11-05T05:16:37Z', 30000)], [pago(2, '2026-11-05T02:10Z', 30000)]).length, 0);
});

test('un pago aprobado, posterior y del mismo monto cierra el pedido', () => {
  assert.deepEqual(conciliar([ped('P1', '2026-11-05T13:00:00Z', 150050)], [pago(9, '2026-11-05T10:05Z', 150050)]), [{ pedidoId: 'P1', pagoId: '9' }]);
});

test('no cierra con monto distinto, pago rechazado, pago anterior al pedido o pago ya usado', () => {
  const P = [ped('P1', '2026-11-05T13:00:00Z', 150050)];
  assert.deepEqual(conciliar(P, [pago(1, '2026-11-05T10:05Z', 150051)]), []);
  assert.deepEqual(conciliar(P, [pago(2, '2026-11-05T10:05Z', 150050, 'rejected')]), []);
  assert.deepEqual(conciliar(P, [pago(3, '2026-11-05T09:00Z', 150050)]), []);
  assert.deepEqual(conciliar(P, [pago(4, '2026-11-05T10:05Z', 150050)], new Set(['4'])), []);
});

test('dos pedidos con el mismo monto: cada pago cierra uno solo, el más viejo con el más viejo', () => {
  const r = conciliar([ped('B', '2026-11-05T13:10:00Z', 5000), ped('A', '2026-11-05T13:00:00Z', 5000)], [pago(2, '2026-11-05T10:20Z', 5000), pago(1, '2026-11-05T10:15Z', 5000)]);
  assert.deepEqual(r, [{ pedidoId: 'A', pagoId: '1' }, { pedidoId: 'B', pagoId: '2' }]);
  assert.equal(conciliar([ped('A', '2026-11-05T13:00:00Z', 5000), ped('B', '2026-11-05T13:10:00Z', 5000)], [pago(1, '2026-11-05T10:15Z', 5000)]).length, 1);
});
