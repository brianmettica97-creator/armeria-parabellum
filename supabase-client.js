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

/** Lee los productos publicados; devuelve null si no hay conexión. */
export async function fetchProductos() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from('productos').select('*').eq('published', true).order('code');
  if (error) { console.error('Supabase:', error.message); return null; }
  return data;
}
