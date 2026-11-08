"""Pone el sello de agua a las fotos de productos que no lo tienen, usando el panel real.
Requiere: pip install playwright y Microsoft Edge. Entra al panel real con un usuario administrador.
Detecta el sello midiendo la esquina de cada foto (con sello da 0,5 o más; sin sello, cerca de 0),
así nunca pone doble sello. Fue usado el 2026-11-07: 59 fotos de 17 productos.

Uso:  python herramientas/resellar-fotos.py diag            -> solo diagnostica, no cambia nada
      python herramientas/resellar-fotos.py uno <id>        -> procesa un solo producto
      python herramientas/resellar-fotos.py todos           -> procesa todos los que falten
Credenciales por variables de entorno ADM_MAIL / ADM_PASS (no se guardan en ningún archivo).
Las fotos viejas NO se borran: quedan en el depósito como respaldo.
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

MODO = sys.argv[1]
SOLO = sys.argv[2] if len(sys.argv) > 2 else None
BASE = 'https://armeriaparabellum.com.ar/admin.html'
UMBRAL = 0.35   # correlación logo/oscuridad: con sello da ~0.6-0.9, sin sello ~0

JS = r"""
async ({ modo, solo, umbral }) => {
  const { getSupabase } = await import('./supabase-client.js');
  const sb = await getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { error: 'sin sesión' };

  // Código REAL del sello (admin.js), sin copiarlo.
  const src = await (await fetch('admin.js?v=' + Date.now())).text();
  const code = src.slice(src.indexOf('const nativeWebp'), src.indexOf('const slug'));
  const $ = () => ({ addEventListener() {} });
  const shrink = new Function('MAX_SIDE','JPEG_QUALITY','WEBP_QUALITY','THUMB_SIDE','THUMB_QUALITY','$', code + '; return shrink;')(1600, 0.82, 0.8, 640, 0.75, $);
  const logo = await createImageBitmap(await (await fetch('assets/new/logo-sello.png')).blob());

  // ¿Tiene sello? Correlación entre la forma del logo y lo oscuro de la foto en esa esquina.
  async function puntaje(blob) {
    const img = await createImageBitmap(blob);
    const W = img.width, H = img.height, w = Math.round(W * 0.24), h = Math.round(w * logo.height / logo.width);
    const x = Math.round(W - w - W * 0.035), y = Math.round(H - h - W * 0.035);
    const c1 = new OffscreenCanvas(w, h).getContext('2d'); c1.drawImage(img, x, y, w, h, 0, 0, w, h);
    const c2 = new OffscreenCanvas(w, h).getContext('2d'); c2.drawImage(logo, 0, 0, w, h);
    const p = c1.getImageData(0, 0, w, h).data, m = c2.getImageData(0, 0, w, h).data;
    let n = 0, sa = 0, sb2 = 0, saa = 0, sbb = 0, sab = 0;
    for (let i = 0; i < p.length; i += 4) {
      const a = m[i + 3] / 255, d = 1 - (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255;
      n++; sa += a; sb2 += d; saa += a * a; sbb += d * d; sab += a * d;
    }
    const cov = sab / n - (sa / n) * (sb2 / n), va = saa / n - (sa / n) ** 2, vb = sbb / n - (sb2 / n) ** 2;
    img.close?.();
    return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0;
  }

  const BUCKET = 'productos';
  const propia = f => f && f.src && f.src.includes('/storage/v1/object/public/productos/');
  let q = sb.from('productos').select('id,name,code,published,photo,photos').order('code');
  if (solo) q = q.eq('id', solo);
  const { data: filas, error } = await q;
  if (error) return { error: error.message };

  const informe = [], respaldo = [];
  for (const fila of filas) {
    const lista = [fila.photo, ...(fila.photos || [])];
    const nuevas = [];
    let cambio = false;
    for (const f of lista) {
      if (!propia(f)) { nuevas.push(f); continue; }
      let s = null, estado = '';
      try {
        const blob = await (await fetch(f.src, { cache: 'no-store' })).blob();
        s = await puntaje(blob);
        if (s >= umbral) { estado = 'ya tiene sello'; nuevas.push(f); }
        else if (modo === 'diag') { estado = 'FALTA sello'; nuevas.push(f); }
        else {
          const { full, thumb } = await shrink(new File([blob], 'foto.webp', { type: blob.type }));
          const base = `${fila.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const subir = async (b, suf) => {
            const path = `${base}${suf}.${b.type === 'image/webp' ? 'webp' : 'jpg'}`;
            const { error: e } = await sb.storage.from(BUCKET).upload(path, b, { contentType: b.type, cacheControl: '31536000' });
            if (e) throw e;
            return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
          };
          const [srcN, thumbN] = await Promise.all([subir(full, ''), subir(thumb, '-mini')]);
          const s2 = await puntaje(full);
          nuevas.push({ ...f, src: srcN, thumb: thumbN });
          cambio = true; estado = `SELLADA (verificación ${s2.toFixed(2)})`;
        }
      } catch (e) { estado = 'ERROR ' + (e.message || e); nuevas.push(f); }
      informe.push({ id: fila.id, producto: `${fila.code || ''} ${fila.name}`.trim(), publicado: fila.published, puntaje: s === null ? null : Math.round(s * 100) / 100, estado });
    }
    if (cambio) {
      respaldo.push({ id: fila.id, photo: fila.photo, photos: fila.photos });
      const [main, ...extra] = nuevas;
      const { error: e } = await sb.from('productos').update({ photo: main, photos: extra.length ? extra : null }).eq('id', fila.id);
      if (e) informe.push({ id: fila.id, producto: fila.name, estado: 'ERROR al guardar: ' + e.message });
    }
  }
  return { informe, respaldo };
}
"""

with sync_playwright() as p:
    b = p.chromium.launch(channel='msedge', headless=True)
    pg = b.new_page()
    pg.goto(BASE, wait_until='networkidle')
    pg.fill('#loginEmail', os.environ['ADM_MAIL']); pg.fill('#loginPass', os.environ['ADM_PASS'])
    pg.click('#loginForm button[type=submit]')
    pg.wait_for_selector('#newBtn', state='visible', timeout=30000)
    pg.set_default_timeout(0)
    r = pg.evaluate(JS, {'modo': MODO, 'solo': SOLO, 'umbral': UMBRAL})
    b.close()

if r.get('error'):
    sys.exit('ERROR: ' + r['error'])
stamp = time.strftime('%Y%m%d-%H%M%S')
json.dump(r, open(f'resellar-{MODO}-{stamp}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
inf = r['informe']
from collections import Counter
print('Fotos propias revisadas:', len(inf))
print(Counter(i['estado'].split(' (')[0] for i in inf))
prods = sorted({i['producto'] for i in inf if not i['estado'].startswith('ya tiene')})
print('Productos con fotos sin sello o con error:', len(prods))
for i in inf:
    if not i['estado'].startswith('ya tiene'):
        print(f"  {i['puntaje']}\t{'pub' if i.get('publicado') else 'oculto'}\t{i['producto'][:45]}\t{i['estado']}")
print('Archivo de informe/respaldo:', f'resellar-{MODO}-{stamp}.json')
