import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Cliente cargado como módulo desde CDN (el sitio no usa bundler).
const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let clientPromise = null;

/** Devuelve el cliente de Supabase, o null si todavía no se configuró. */
export function getSupabase() {
  if (!supabaseConfigured) return Promise.resolve(null);
  clientPromise ||= import(SUPABASE_ESM).then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  return clientPromise;
}

/**
 * Lee los productos publicados con una consulta REST directa (sin cargar la
 * librería, para que el catálogo público abra más rápido). Devuelve null si
 * no hay conexión o Supabase responde con error.
 */
export async function fetchProductos() {
  if (!supabaseConfigured) return null;
  const url = `${SUPABASE_URL}/rest/v1/productos?select=*&published=eq.true&order=code.asc.nullslast`;
  try {
    const response = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    if (!response.ok) { console.error('Supabase:', response.status, await response.text()); return null; }
    return await response.json();
  } catch (error) {
    console.error('Supabase:', error);
    return null;
  }
}

/**
 * Mejoras por lanzar: dice si una mejora ya está lanzada para el público.
 * La base solo deja ver las lanzadas; se consulta una sola vez por visita y
 * recién cuando hace falta. Ante cualquier error, la mejora cuenta como apagada.
 */
let mejorasPromise = null;
export function mejoraLanzada(id) {
  if (!supabaseConfigured) return Promise.resolve(false);
  mejorasPromise ||= fetch(`${SUPABASE_URL}/rest/v1/mejoras?select=id&estado=eq.lanzada`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } })
    .then(response => (response.ok ? response.json() : []))
    .then(rows => (Array.isArray(rows) ? rows.map(row => row.id) : []))
    .catch(() => []);
  return mejorasPromise.then(ids => ids.includes(id));
}
