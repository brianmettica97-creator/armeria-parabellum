// Pruebas del paso de Payway con respuestas simuladas (no sale ninguna llamada real).
// Correr con:  node --experimental-strip-types --test tests/payway.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { iniciarPago } from '../supabase/functions/crear-pedido/payway.ts';

const pedido = { siteTransactionId: 'abc123', totalCentavos: 199999, email: 'j@x.com', moneda: 'ARS' };
const completo = {
  PAYWAY_API_BASE: 'https://api.ejemplo/', PAYWAY_FORM_BASE: 'https://form.ejemplo/', PAYWAY_VALIDATE_APIKEY: 'clave-validate',
  PAYWAY_PUBLIC_KEY: 'clave-publica', PAYWAY_SITE_ID: '111', PAYWAY_TEMPLATE_ID: '222', SITIO_URL: 'https://sitio.ejemplo/',
};
const env = vars => nombre => vars[nombre];

test('si falta cualquier variable no llama a Payway', async () => {
  const original = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = async () => { llamadas++; throw new Error('no debería llamar'); };
  try {
    for (const faltante of Object.keys(completo)) {
      const vars = { ...completo }; delete vars[faltante];
      const r = await iniciarPago(pedido, env(vars));
      assert.deepEqual([r.ok, r.motivo], [false, 'no_configurado'], faltante);
    }
    assert.equal(llamadas, 0);
  } finally { globalThis.fetch = original; }
});

test('arma el pedido a Payway, manda la clave en el header y devuelve la dirección del formulario', async () => {
  const original = globalThis.fetch;
  let enviado;
  globalThis.fetch = async (url, init) => { enviado = { url, init }; return new Response(JSON.stringify({ hash: 'H4SH' }), { status: 201 }); };
  try {
    const r = await iniciarPago(pedido, env(completo));
    assert.equal(r.ok, true);
    assert.equal(enviado.url, 'https://api.ejemplo/validate');
    assert.equal(enviado.init.headers.apikey, 'clave-validate');
    const cuerpo = JSON.parse(enviado.init.body);
    assert.equal(cuerpo.site.transaction_id, 'abc123');
    assert.equal(cuerpo.site.template.id, 222);
    assert.equal(cuerpo.payment.amount, 199999);
    assert.equal(cuerpo.success_url, 'https://sitio.ejemplo/pago.html?resultado=ok&pedido=abc123');
    assert.equal(r.url, 'https://form.ejemplo/web/forms/H4SH?apikey=clave-publica');
  } finally { globalThis.fetch = original; }
});

test('si Payway rechaza o responde algo raro, avisa sin romper', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{"error":"x"}', { status: 401 });
    assert.equal((await iniciarPago(pedido, env(completo))).motivo, 'payway_rechazo');
    globalThis.fetch = async () => new Response('{"sin":"hash"}', { status: 201 });
    assert.equal((await iniciarPago(pedido, env(completo))).motivo, 'payway_error');
    globalThis.fetch = async () => { throw new Error('sin red'); };
    assert.equal((await iniciarPago(pedido, env(completo))).motivo, 'payway_error');
  } finally { globalThis.fetch = original; }
});
