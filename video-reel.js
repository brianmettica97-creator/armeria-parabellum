// Video automático de producto (mejora "video-producto").
//
// Arma un "reel" vertical en un <canvas> a partir de UNA foto: apertura,
// un acercamiento por cada punto marcado (con luces de color), plano general
// con el nombre del modelo y cierre con el logo. No genera ningún archivo:
// se dibuja en el momento. `grabarReel` lo graba para descargarlo (panel).
//
// video = { foto: url de la foto principal, puntos: [{ x, y }] }  (x, y entre 0 y 1)

const W = 540, H = 960;
const LOGO_URL = 'assets/new/logo-armeria-blanco.png';
export const MAX_PUNTOS = 6;

const BLUE = '#1a73ff', TEAL = '#0dd9cc', RED = '#ff1a14', AMBER = '#ff9e26', DARK = '#070c1a';
const GELS = [[BLUE, TEAL], [RED, '#8c0d1f'], [RED, AMBER], [TEAL, AMBER], [BLUE, RED], [TEAL, BLUE]];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - (1 - clamp(x)) ** 3;
const lerp = (a, b, t) => a + (b - a) * t;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';   // necesario para poder grabar el canvas
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del video.'));
    img.src = src;
  });
}

/** Separa "Bersa B1911" en marca y modelo para el título. */
export function tituloDe(nombre, marca) {
  const name = String(nombre || '').trim();
  const brand = String(marca || '').trim();
  const modelo = brand && name.toLowerCase().startsWith(brand.toLowerCase()) ? name.slice(brand.length).trim() : name;
  return { marca: brand, modelo: modelo || name };
}

// Lista de tomas: [cx, cy, ancho, giro] de inicio y fin, en px de la foto.
function buildShots(img, puntos) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const cover = Math.min(iw, ih * W / H);            // ancho de cuadro que entra completo en la foto
  const shots = [{ d: 2.4, a: [iw / 2, ih * 0.3, cover * 0.55, 0], b: [iw / 2, ih / 2, cover * 0.85, 0], gel: [BLUE, DARK], k: 0.7, fadeIn: 0.8 }];
  puntos.slice(0, MAX_PUNTOS).forEach((p, i) => {
    const x = p.x * iw, y = p.y * ih, w = cover * 0.36;
    const rot = [-7, 8, 4, -10, 6, -4][i % 6];
    // Las tomas impares hacen un paneo corto; las pares, un empuje hacia el detalle.
    const pan = i % 2 ? w * 0.28 : 0;
    shots.push({
      d: 1.9, gel: GELS[i % GELS.length], k: i % 3 === 2 ? 0.6 : 0.78, ang: [35, 80, 20, 60, 120, 45][i % 6],
      a: [x - pan, y, w * (pan ? 1 : 1.18), rot], b: [x + pan, y, w, rot * 0.5],
      outline: i === 1 ? 'in' : i === 2 ? 'out' : '',
    });
  });
  shots.push({ d: 3.8, a: [iw / 2, ih / 2, iw * 0.72, -3], b: [iw / 2, ih * 0.56, iw * 1.04, 0], gel: null, k: 0, hero: true });
  shots.push({ d: 2.6, end: true });
  let t = 0;
  for (const s of shots) { s.t0 = t; t += s.d; }
  return { shots, total: t };
}

/**
 * Crea el reel sobre un canvas. Devuelve { play, stop, total, drawAt }.
 * opciones: { foto, puntos, marca, modelo, loop = true, onEnd }
 */
export async function crearReel(canvas, { foto, puntos, marca = '', modelo = '', loop = true, onEnd } = {}) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const [img, logo] = await Promise.all([loadImage(foto), loadImage(LOGO_URL).catch(() => null)]);
  const { shots, total } = buildShots(img, puntos || []);
  const iw = img.naturalWidth, ih = img.naturalHeight;

  // Fondo desenfocado (la foto achicada y vuelta a agrandar) para lo que queda fuera de la foto.
  const tiny = document.createElement('canvas');
  tiny.width = 18; tiny.height = 32;
  { const s = Math.max(18 / iw, 32 / ih); tiny.getContext('2d').drawImage(img, (18 - iw * s) / 2, (32 - ih * s) / 2, iw * s, ih * s); }
  // Grano de película.
  const grain = document.createElement('canvas');
  grain.width = grain.height = 128;
  { const g = grain.getContext('2d'), d = g.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 110; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); }

  const font = (px, italic = true) => `${italic ? 'italic ' : ''}800 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  function fitFont(text, maxWidth, start) {
    let px = start;
    do { ctx.font = font(px); px -= 4; } while (ctx.measureText(text).width > maxWidth && px > 24);
    return ctx.font;
  }
  function spaced(text, y, px, gap, alpha) {
    ctx.font = `600 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    const chars = [...text.toUpperCase()];
    const widths = chars.map(ch => ctx.measureText(ch).width);
    let x = W / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1)) / 2;
    ctx.globalAlpha = alpha; ctx.textAlign = 'left';
    chars.forEach((ch, i) => { ctx.fillText(ch, x, y); x += widths[i] + gap; });
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
  }

  function drawShot(s, t) {
    const u = t / s.d;
    const e = s.hero ? easeOut(u) : lerp(u, ease(u), 0.5);
    let [cx, cy, w, rot] = s.a.map((a, i) => lerp(a, s.b[i], e));
    w *= 1 - 0.10 * (1 - easeOut(t / 0.35));                 // golpe de zoom al entrar
    cx += iw * 0.003 * Math.sin(t * 1.3); cy += iw * 0.0025 * Math.sin(t * 1.9 + 1);   // pulso de cámara en mano
    const scale = W / w;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.45; ctx.drawImage(tiny, 0, 0, W, H); ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate(rot * Math.PI / 180); ctx.scale(scale, scale);
    ctx.drawImage(img, -cx, -cy);
    ctx.restore();
    if (s.gel) {
      // Luz de color: tiñe la imagen conservando su luminosidad.
      const ang = (s.ang ?? 35) * Math.PI / 180, shift = 0.25 * Math.sin(t * 0.9) * W;
      const dx = Math.cos(ang) * W * 0.6, dy = Math.sin(ang) * W * 0.6;
      const grad = ctx.createLinearGradient(W / 2 - dx - shift, H / 2 - dy, W / 2 + dx - shift, H / 2 + dy);
      grad.addColorStop(0, s.gel[0]); grad.addColorStop(1, s.gel[1]);
      ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = s.k; ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    // Barrido de luz diagonal.
    const p = lerp(-0.75, 0.75, u) * H;
    const sweep = ctx.createLinearGradient(p - 170, 0, p + 170, 0);
    sweep.addColorStop(0, 'rgba(255,255,255,0)'); sweep.addColorStop(0.5, 'rgba(255,255,255,.6)'); sweep.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'overlay';
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.6);
    ctx.fillStyle = sweep; ctx.fillRect(-H, -H, H * 2, H * 2); ctx.restore();
    // Viñeta.
    ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, H * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${s.hero ? 0.55 : 0.86})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // Nombre del modelo en contorno sobre dos tomas.
    if (s.outline && modelo) {
      const alpha = s.outline === 'in' ? ease((t - 0.5) / 0.4) : 1 - ease((t - 1.0) / 0.5);
      ctx.font = fitFont(modelo, W * 0.8, 150);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha; ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.strokeText(modelo, W / 2, H * 0.7); ctx.globalAlpha = 1;
    }
    if (s.hero) {
      const k = ease((t - 0.3) / 0.6);
      const shade = ctx.createLinearGradient(0, H * 0.6, 0, H * 0.78);
      shade.addColorStop(0, 'rgba(4,5,7,0)'); shade.addColorStop(1, `rgba(4,5,7,${0.94 * k})`);
      ctx.fillStyle = shade; ctx.fillRect(0, H * 0.6, W, H * 0.4);
      const a = ease((t - 0.8) / 0.6), dy = 18 * (1 - easeOut((t - 0.8) / 0.9));
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (marca) spaced(marca, H * 0.752 + dy, 22, 12, a * 0.9);
      ctx.font = fitFont(modelo, W * 0.84, 160);
      ctx.globalAlpha = a; ctx.fillText(modelo, W / 2, H * 0.85 + dy);
      ctx.fillStyle = '#d5a75b'; ctx.fillRect(W / 2 - 45, H * 0.92 + dy, 90, 3);
      ctx.globalAlpha = 1;
      const out = ease((t - (s.d - 0.45)) / 0.45);
      if (out) { ctx.fillStyle = `rgba(0,0,0,${out})`; ctx.fillRect(0, 0, W, H); }
    }
    // Entrada: la primera toma abre desde negro; el resto, con un destello en el corte.
    if (s.fadeIn) { ctx.fillStyle = `rgba(0,0,0,${1 - ease(t / s.fadeIn)})`; ctx.fillRect(0, 0, W, H); }
    else if (t < 0.13) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - t / 0.13)})`; ctx.fillRect(0, 0, W, H); }
  }

  function drawEnd(s, t) {
    ctx.globalCompositeOperation = 'source-over';
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.6);
    bg.addColorStop(0, '#161b22'); bg.addColorStop(1, '#07080a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const a = ease(t / 0.7) * (1 - ease((t - (s.d - 0.5)) / 0.5)), dy = 12 * (1 - easeOut(t / 0.9));
    ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (logo) {
      const lw = W * 0.62, lh = lw * logo.naturalHeight / logo.naturalWidth;
      ctx.drawImage(logo, (W - lw) / 2, H / 2 - lh / 2 + dy, lw, lh);
      ctx.fillStyle = '#d5a75b'; ctx.fillRect(W / 2 - 45, H / 2 + lh / 2 + 26 + dy, 90, 3);
    } else {
      ctx.font = font(44, false); ctx.fillText('ARMERÍA PARABELLUM', W / 2, H / 2 + dy);
    }
    ctx.globalAlpha = 1;
  }

  function drawAt(time) {
    const t = clamp(time, 0, total - 0.001);
    const s = shots.find(shot => t < shot.t0 + shot.d) || shots[shots.length - 1];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050607'; ctx.fillRect(0, 0, W, H);
    if (s.end) drawEnd(s, t - s.t0); else drawShot(s, t - s.t0);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.16;
    const ox = Math.floor(Math.random() * 128), oy = Math.floor(Math.random() * 128);
    for (let y = -oy; y < H; y += 128) for (let x = -ox; x < W; x += 128) ctx.drawImage(grain, x, y);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  let raf = 0, start = 0;
  function frame(now) {
    // Si el canvas dejó de verse (se cerró la ficha), el video se detiene solo.
    if (!canvas.isConnected || !canvas.getClientRects().length) { raf = 0; return; }
    let t = (now - start) / 1000;
    if (t >= total) {
      if (!loop) { drawAt(total); raf = 0; onEnd?.(); return; }
      start = now; t = 0;
    }
    drawAt(t);
    raf = requestAnimationFrame(frame);
  }
  return {
    total,
    drawAt,
    play() { cancelAnimationFrame(raf); start = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}

/**
 * Graba una pasada del reel y devuelve { blob, ext }. Tarda lo que dura el video.
 * El canvas tiene que estar visible. Usa MP4 si el navegador lo permite (sirve
 * para Instagram); si no, WebM.
 */
export async function grabarReel(canvas, opciones, onProgress) {
  if (!canvas.captureStream || !window.MediaRecorder) throw new Error('Este navegador no permite grabar el video. Probá con Chrome en la computadora.');
  const mime = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
  if (!mime) throw new Error('Este navegador no permite grabar el video.');
  const reel = await crearReel(canvas, { ...opciones, loop: false });
  const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const done = new Promise((resolve, reject) => { recorder.onstop = resolve; recorder.onerror = () => reject(new Error('Falló la grabación del video.')); });
  recorder.start(250);
  const began = performance.now();
  await new Promise(resolve => {
    const tick = now => {
      const t = (now - began) / 1000;
      reel.drawAt(t);
      onProgress?.(clamp(t / reel.total));
      if (t >= reel.total) resolve(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  await done;
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' };
}

/**
 * Ficha pública: agrega la miniatura "VIDEO" a la galería. Al tocarla, el reel
 * se reproduce en el lugar de la foto; al tocar una foto, se vuelve a la foto.
 */
export function montarEnFicha(art, product) {
  const stage = art.querySelector('.product-photo-stage');
  const foto = product.photo?.src;
  if (!stage || !foto || art.querySelector('.reel-thumb')) return;
  let thumbs = art.querySelector('.gallery-thumbs');
  if (!thumbs) {
    // Producto con una sola foto: se crea la tira con la foto y el video.
    thumbs = document.createElement('div');
    thumbs.className = 'gallery-thumbs';
    thumbs.innerHTML = '<button type="button" class="active" data-reel-foto aria-label="Ver foto"><img alt=""></button>';
    thumbs.querySelector('img').src = product.photo.thumb || foto;
    stage.after(thumbs);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'reel-thumb';
  button.setAttribute('aria-label', 'Ver video del producto');
  button.innerHTML = '<img alt=""><span>▶ Video</span>';
  button.querySelector('img').src = product.photo.thumb || foto;
  thumbs.append(button);

  let canvas = null, reel = null;
  const cerrar = () => {
    reel?.stop(); canvas?.remove(); canvas = null; reel = null;
    stage.classList.remove('is-reel'); button.classList.remove('active');
  };
  thumbs.addEventListener('click', event => {
    const hit = event.target.closest('button');
    if (!hit || hit === button) return;
    cerrar();
    if (hit.hasAttribute('data-reel-foto')) hit.classList.add('active');
  });
  button.addEventListener('click', async () => {
    if (canvas) return;
    thumbs.querySelectorAll('button').forEach(other => other.classList.toggle('active', other === button));
    canvas = document.createElement('canvas');
    canvas.className = 'reel-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Video de ${product.name}`);
    stage.classList.add('is-reel');
    stage.append(canvas);
    document.dispatchEvent(new CustomEvent('parabellum:metrica', { detail: { tipo: 'video', producto: product.id } }));
    const mine = canvas;
    try {
      const made = await crearReel(mine, { foto, puntos: product.video.puntos, ...tituloDe(product.name, product.brand) });
      if (canvas !== mine) return;   // ya se volvió a la foto
      reel = made; reel.play();
    } catch { if (canvas === mine) cerrar(); }
  });
}
