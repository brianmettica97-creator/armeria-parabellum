// Validación del pedido en el SERVIDOR · Armería Parabellum.
// JavaScript puro, sin nada propio de Deno, para poder probarlo con Node
// (node --test tests/). La función crear-pedido lo importa.
//
// Regla de oro: el navegador solo manda QUÉ productos y CUÁNTOS.
// Los precios, el stock y si se puede vender online salen siempre de la base.

export const MAX_CANTIDAD_POR_ARTICULO = 20;   // igual que DEFAULT_MAX_QUANTITY de config.js
export const MAX_LINEAS = 30;

const aCentavos = valor => Math.round(Number(valor) * 100);

/**
 * @param {Array<{id: string, qty: number}>} items   lo que mandó el navegador
 * @param {Array<object>} productos                  filas de la tabla `productos`
 * @returns {{ok: true, lineas: object[], totalCentavos: number} | {ok: false, errores: {codigo: string, id?: string, detalle: string}[]}}
 */
export function validarCarrito(items, productos) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, errores: [{ codigo: 'carrito_vacio', detalle: 'El pedido está vacío.' }] };
  }
  if (items.length > MAX_LINEAS) {
    return { ok: false, errores: [{ codigo: 'carrito_grande', detalle: `El pedido tiene demasiados artículos (máximo ${MAX_LINEAS}).` }] };
  }

  const porId = new Map(productos.map(p => [p.id, p]));
  const errores = [];
  const cantidades = new Map();   // id → cantidad total (suma las líneas repetidas)

  for (const item of items) {
    const id = item && typeof item.id === 'string' && item.id ? item.id : null;
    if (!id || !porId.has(id)) {
      errores.push({ codigo: 'no_existe', id: id ?? undefined, detalle: 'Un artículo del pedido ya no existe en el catálogo.' });
      continue;
    }
    const qty = item.qty;
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) {
      errores.push({ codigo: 'cantidad_invalida', id, detalle: 'La cantidad de un artículo no es válida.' });
      continue;
    }
    cantidades.set(id, (cantidades.get(id) || 0) + qty);
  }
  if (errores.length) return { ok: false, errores };

  const lineas = [];
  let totalCentavos = 0;
  for (const [id, qty] of cantidades) {
    const p = porId.get(id);
    if (p.regulated) {
      errores.push({ codigo: 'regulado', id, detalle: `${p.name}: es material controlado y no se vende online. Consultalo por WhatsApp.` });
      continue;
    }
    if (p.published === false || p.availability === 'agotado' || p.stock === 0) {
      errores.push({ codigo: 'no_disponible', id, detalle: `${p.name}: no está disponible.` });
      continue;
    }
    const precio = p.price === null || p.price === undefined ? NaN : aCentavos(p.price);
    if (!Number.isFinite(precio) || precio <= 0) {
      errores.push({ codigo: 'sin_precio', id, detalle: `${p.name}: no tiene precio publicado, consultalo por WhatsApp.` });
      continue;
    }
    const maximo = Number.isInteger(p.stock) ? Math.min(p.stock, MAX_CANTIDAD_POR_ARTICULO) : MAX_CANTIDAD_POR_ARTICULO;
    if (qty > maximo) {
      errores.push({ codigo: 'cantidad_excedida', id, detalle: `${p.name}: la cantidad máxima disponible es ${maximo}.` });
      continue;
    }
    lineas.push({ id, nombre: p.name, codigo: p.code ?? null, qty, precioUnitarioCentavos: precio, subtotalCentavos: precio * qty });
    totalCentavos += precio * qty;
  }
  if (errores.length) return { ok: false, errores };
  return { ok: true, lineas, totalCentavos };
}

const CAMPOS = { nombre: 120, telefono: 30, email: 160, direccion: 200, localidad: 100, cp: 12, provincia: 80 };
const MAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Limpia y valida los datos de envío. Devuelve solo los campos conocidos. */
export function validarComprador(datos) {
  if (!datos || typeof datos !== 'object') return { ok: false, errores: [{ codigo: 'datos_invalidos', detalle: 'Faltan los datos de envío.' }] };
  const limpios = {};
  const errores = [];
  for (const [campo, max] of Object.entries(CAMPOS)) {
    const valor = typeof datos[campo] === 'string' ? datos[campo].trim() : '';
    if (!valor) errores.push({ codigo: 'dato_faltante', campo, detalle: `Falta completar: ${campo}.` });
    else if (valor.length > max) errores.push({ codigo: 'dato_largo', campo, detalle: `El campo ${campo} es demasiado largo.` });
    else limpios[campo] = valor;
  }
  if (limpios.email && !MAIL.test(limpios.email)) errores.push({ codigo: 'email_invalido', campo: 'email', detalle: 'El email no parece válido.' });
  return errores.length ? { ok: false, errores } : { ok: true, datos: limpios };
}
