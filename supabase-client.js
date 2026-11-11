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
 * Mejoras por lanzar: dice si esta visita puede ver una mejora.
 * - Público y equipo de la armería: solo las que están lanzadas.
 * - Desarrollador con la sesión del panel abierta en este navegador: también
 *   las que están en "solo nosotros", para probarlas en el sitio real.
 * La decisión la toma la base (RLS): acá solo se manda la sesión si existe.
 * Se consulta una vez por visita. Ante cualquier error, cuenta como apagada.
 */
let mejorasPromise = null;
function panelToken() {
  try {
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
    const session = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`));
    return session?.access_token && session.expires_at * 1000 > Date.now() + 10000 ? session.access_token : null;
  } catch { return null; }
}
export function mejoraLanzada(id) {
  if (!supabaseConfigured) return Promise.resolve(false);
  mejorasPromise ||= fetch(`${SUPABASE_URL}/rest/v1/mejoras?select=id&estado=neq.apagada`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${panelToken() || SUPABASE_ANON_KEY}` } })
    .then(response => (response.ok ? response.json() : []))
    .then(rows => (Array.isArray(rows) ? rows.map(row => row.id) : []))
    .catch(() => []);
  return mejorasPromise.then(ids => ids.includes(id));
}
