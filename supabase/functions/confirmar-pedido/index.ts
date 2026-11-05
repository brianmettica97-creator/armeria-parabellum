// Función de servidor `confirmar-pedido` · Armería Parabellum.
//
// La página de vuelta (pago.html) la llama con la referencia del pedido. Acá se le pregunta a Payway
// (con la clave privada, desde el servidor) qué pagos fueron aprobados y se pasa a "pagado" el pedido
// que corresponde. VOLVER de Payway no prueba nada: solo un pago aprobado en Payway, por el monto exacto
// del pedido, lo da por cobrado. El navegador nunca puede decir "pagué".
import { createClient } from 'npm:@supabase/supabase-js@2';
import { listarPagos } from '../crear-pedido/payway.ts';
import { conciliar, VIDA_DEL_LINK_MS } from '../crear-pedido/conciliar.js';

const ORIGENES = (Deno.env.get('ORIGENES_PERMITIDOS') ?? 'https://brianmettica97-creator.github.io')
  .split(',').map(s => s.trim()).filter(Boolean);
const ESPERA_ENTRE_CONSULTAS_MS = 8000;   // no se le consulta a Payway más de una vez cada 8 s por pedido

function cabeceras(origen: string | null) {
  const permitido = origen && ORIGENES.includes(origen) ? origen : ORIGENES[0];
  return {
    'access-control-allow-origin': permitido,
    'access-control-allow-headers': 'authorization, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'origin',
    'content-type': 'application/json; charset=utf-8',
  };
}

Deno.serve(async (req: Request) => {
  const origen = req.headers.get('origin');
  const h = cabeceras(origen);
  const responder = (estado: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: estado, headers: h });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return responder(405, { ok: false, error: 'metodo_no_permitido' });
  if (!origen || !ORIGENES.includes(origen)) return responder(403, { ok: false, error: 'origen_no_permitido' });

  let ref = '';
  try { ref = String((await req.json())?.ref ?? ''); } catch { return responder(400, { ok: false, error: 'json_invalido' }); }
  if (!/^[a-f0-9]{16}$/.test(ref)) return responder(422, { ok: false, error: 'referencia_invalida' });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: pedido } = await supabase.from('pedidos').select('id, estado, ambiente, verificado_at').eq('ref', ref).maybeSingle();
  if (!pedido) return responder(404, { ok: false, error: 'pedido_no_encontrado' });
  if (pedido.estado !== 'pendiente') return responder(200, { ok: true, estado: pedido.estado });

  const reciente = pedido.verificado_at && Date.now() - new Date(pedido.verificado_at).getTime() < ESPERA_ENTRE_CONSULTAS_MS;
  if (!reciente) {
    await supabase.from('pedidos').update({ verificado_at: new Date().toISOString() }).eq('id', pedido.id);
    const pagos = await listarPagos(nombre => Deno.env.get(nombre));
    if (pagos) {
      const { data: pendientes } = await supabase.from('pedidos')
        .select('id, created_at, total_centavos').eq('estado', 'pendiente').eq('ambiente', pedido.ambiente);
      const { data: usados } = await supabase.from('pedidos').select('payway_payment_id').not('payway_payment_id', 'is', null);
      const yaUsados = new Set((usados ?? []).map((u: { payway_payment_id: string }) => String(u.payway_payment_id)));
      for (const { pedidoId, pagoId } of conciliar(pendientes ?? [], pagos, yaUsados)) {
        // El índice único de payway_payment_id impide que un mismo pago cierre dos pedidos.
        await supabase.from('pedidos').update({ estado: 'pagado', payway_payment_id: pagoId, payway_status: 'approved', pagado_at: new Date().toISOString() })
          .eq('id', pedidoId).eq('estado', 'pendiente');
      }
    }
    // Un link vencido (24 h) ya no se puede pagar.
    await supabase.from('pedidos').update({ estado: 'vencido' })
      .eq('estado', 'pendiente').lt('created_at', new Date(Date.now() - VIDA_DEL_LINK_MS - 3600_000).toISOString());
  }
  const { data: actualizado } = await supabase.from('pedidos').select('estado').eq('id', pedido.id).single();
  return responder(200, { ok: true, estado: actualizado?.estado ?? 'pendiente' });
});
