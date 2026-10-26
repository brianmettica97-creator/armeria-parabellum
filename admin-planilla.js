// Importación de productos desde una planilla (CSV o Excel) para el panel.
// Este módulo solo lee y valida: no toca la pantalla ni la base, así se puede
// probar aparte. admin.js arma la vista previa y guarda.
import { sectors, calibers, gunBrands, brands } from './taxonomy.js?v=20261026c';

// Columnas del modelo. `aliases`: otros encabezados que se aceptan.
export const COLUMNS = [
  { key: 'code', label: 'Código', aliases: ['cod', 'codigo interno', 'sku'] },
  { key: 'name', label: 'Nombre', aliases: ['producto', 'modelo', 'nombre del producto'] },
  { key: 'type', label: 'Tipo', aliases: ['categoria', 'subcategoria', 'tipo de arma'] },
  { key: 'brand', label: 'Marca', aliases: [] },
  { key: 'caliber', label: 'Calibre', aliases: [] },
  { key: 'price', label: 'Precio', aliases: ['precio en pesos', 'precio $', 'valor'] },
  { key: 'stock', label: 'Stock', aliases: ['cantidad', 'unidades'] },
  { key: 'condition', label: 'Condición', aliases: ['estado', 'nuevo/usado'] },
  { key: 'short', label: 'Descripción corta', aliases: ['resumen'] },
  { key: 'description', label: 'Descripción', aliases: ['descripcion completa', 'detalle'] },
  { key: 'sector', label: 'Sector', aliases: [], optional: true },
];

export const TEMPLATE_ROWS = [
  ['BP9-01', 'Bersa BP9CC', 'Pistola', 'Bersa', '9MM', '1250000', '2', 'Nuevo', 'Compacta de uso diario', ''],
  ['MOS-500', 'Mossberg 500', 'Escopeta', 'Mossberg', '12 UAB', '', '1', 'Usado', '', 'Muy buen estado, con caja.'],
  ['', 'Ruger 10/22', 'Carabina', 'Ruger', '22LR', '980.000', '', 'Nuevo', '', ''],
];

const fold = text => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const key = text => fold(text).replace(/[^a-z0-9]/g, '');

// ─────────────── Lectura del archivo ───────────────

// Excel en Windows guarda los CSV en ANSI (Windows-1252), no en UTF-8.
export function decodeText(buffer) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, ''); }
  catch { return new TextDecoder('windows-1252').decode(buffer); }
}

// CSV con comillas; detecta el separador (; , o tabulación) en la primera línea.
export function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = [';', '\t', ','].map(d => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Ubica los encabezados (puede haber filas de título arriba) y arma objetos por fila.
export function readSheet(grid) {
  const lookup = new Map();
  COLUMNS.forEach(col => [col.label, ...col.aliases].forEach(alias => lookup.set(key(alias), col.key)));
  const headerIndex = grid.slice(0, 10).findIndex(row => row.filter(cell => lookup.has(key(cell))).length >= 2);
  if (headerIndex < 0) return { rows: [], missing: ['name', 'type'], headerFound: false };
  const header = grid[headerIndex].map(cell => lookup.get(key(cell)) || null);
  const rows = [];
  grid.slice(headerIndex + 1).forEach((cells, index) => {
    const values = {};
    header.forEach((field, col) => { if (field && values[field] === undefined) values[field] = String(cells[col] ?? '').trim(); });
    if (Object.values(values).some(Boolean)) rows.push({ line: headerIndex + index + 2, values });
  });
  const missing = ['name', 'type'].filter(field => !header.includes(field));
  return { rows, missing, headerFound: true };
}

// ─────────────── Normalización ───────────────

// Acepta 150000 · 150.000 · 150.000,50 · 150000.50 · $ 150.000
export function parseMoney(text) {
  const clean = String(text ?? '').trim().replace(/\$|\s|ars/gi, '');
  if (!clean) return null;
  // Con puntos y comas a la vez, el último separador es el de los decimales.
  if (/\./.test(clean) && /,/.test(clean)) {
    const decimal = clean.lastIndexOf(',') > clean.lastIndexOf('.') ? ',' : '.';
    const value = Number(clean.split(decimal === ',' ? '.' : ',').join('').replace(',', '.'));
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : NaN;
  }
  const normal = /,\d{3}(,|$)/.test(clean) && !/\./.test(clean) ? clean.replace(/,/g, '')
    : /,\d{1,2}$/.test(clean) ? clean.replace(/\./g, '').replace(',', '.')
    : /\.\d{3}(\.|$)/.test(clean) ? clean.replace(/\./g, '') : clean.replace(',', '.');
  const value = Number(normal);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : NaN;
}

// Tipos aceptados: subcategorías y categorías de cada sector, en singular o plural.
const variants = text => { const k = key(text); return [k, k.replace(/es$/, ''), k.replace(/s$/, '')]; };
const typeIndex = Object.values(sectors).flatMap(sector => sector.categories.flatMap(category => [
  { sector: sector.id, category: category.id, sub: null, label: category.label, keys: [...variants(category.label), key(category.id)] },
  ...category.subcategories.map(sub => ({ sector: sector.id, category: category.id, sub: sub.id, label: sub.label, keys: [...variants(sub.label), key(sub.id)] })),
]));

export function resolveType(text, sectorHint) {
  const wanted = variants(text);
  const matches = typeIndex.filter(entry => (!sectorHint || entry.sector === sectorHint) && entry.keys.some(k => wanted.includes(k)));
  // Si coincide una subcategoría, gana sobre la categoría; Armería va primero.
  return matches.find(entry => entry.sub) || matches[0] || null;
}

const CALIBER_ALIASES = {
  '22': '22LR', '22lr': '22LR', '22largo': '22LR', '22longrifle': '22LR',
  '380': '.380ACP', '380acp': '.380ACP', '380auto': '.380ACP',
  '9': '9MM', '9mm': '9MM', '9x19': '9MM', '9x19mm': '9MM', '9mmluger': '9MM', '9mmparabellum': '9MM', '9mmpara': '9MM', '9luger': '9MM',
  '40': '.40S&W', '40sw': '.40S&W', '40sandw': '.40S&W',
  '45': '.45ACP', '45acp': '.45ACP', '45auto': '.45ACP',
  '38': '38 SPECIAL', '38sp': '38 SPECIAL', '38spl': '38 SPECIAL', '38special': '38 SPECIAL', '38especial': '38 SPECIAL',
  '357': '.357 MAGNUM', '357mag': '.357 MAGNUM', '357magnum': '.357 MAGNUM',
  '44': '.44 MAGNUM', '44mag': '.44 MAGNUM', '44magnum': '.44 MAGNUM',
  '308': '308 WINCHESTER', '308win': '308 WINCHESTER', '308winchester': '308 WINCHESTER',
  '3006': '30-06 SPRINGFIELD', '3006sprg': '30-06 SPRINGFIELD', '3006springfield': '30-06 SPRINGFIELD',
  '22wmr': '22WMR', '22mag': '22WMR', '22magnum': '22WMR', '22m': '22WMR',
  '12': '12 UAB', '12uab': '12 UAB', 'cal12': '12 UAB', 'calibre12': '12 UAB', '12ga': '12 UAB',
  '16': '16 UAB', '16uab': '16 UAB', 'cal16': '16 UAB', 'calibre16': '16 UAB', '16ga': '16 UAB',
  '20': '20 UAB', '20uab': '20 UAB', 'cal20': '20 UAB', 'calibre20': '20 UAB', '20ga': '20 UAB',
};
export function normalizeCaliber(text) {
  const k = key(text);
  if (!k) return { value: null, known: true };
  const listed = calibers.find(c => key(c) === k) || CALIBER_ALIASES[k];
  return listed ? { value: listed, known: true } : { value: String(text).trim(), known: false };
}

export function normalizeBrand(text, knownBrands = []) {
  const k = key(text);
  if (!k) return null;
  return [...gunBrands, ...knownBrands, ...brands.map(b => b.name)].find(b => key(b) === k) || String(text).trim();
}

const SECTOR_NAMES = { armeria: 'armeria', armas: 'armeria', camping: 'camping', outdoor: 'camping', campingoutdoor: 'camping' };

// Valida una fila. `existing`: productos cargados (para actualizar por código).
// Devuelve { status: 'nuevo' | 'actualiza' | 'error', data, target, errors, notes }.
export function normalizeRow({ line, values }, { existing = [], seenCodes = new Set(), today = '' } = {}) {
  const errors = [];
  const notes = [];
  const code = values.code?.trim() || '';
  const target = code ? existing.find(row => row.code && key(row.code) === key(code)) : null;
  if (code && seenCodes.has(key(code))) errors.push(`El código ${code} está repetido en la planilla.`);
  if (code) seenCodes.add(key(code));

  const name = values.name?.trim() || '';
  if (!name && !target) errors.push('Falta el nombre.');

  let sectorHint = null;
  if (values.sector) {
    sectorHint = SECTOR_NAMES[key(values.sector)] || null;
    if (!sectorHint) errors.push(`Sector “${values.sector}” no reconocido (Armería u Outdoor).`);
  }
  let type = null;
  if (values.type) {
    type = resolveType(values.type, sectorHint);
    const category = type && sectors[type.sector].categories.find(c => c.id === type.category);
    if (!type) errors.push(`Tipo “${values.type}” no reconocido. Ej.: Pistola, Revólver, Escopeta, Carabina, Fusil.`);
    else if (!type.sub && category.subcategories.length) {
      errors.push(`“${values.type}” es muy general: poné ${category.subcategories.slice(0, 4).map(s => s.label).join(', ')}…`);
      type = null;
    }
  } else if (!target) errors.push('Falta el tipo (Pistola, Escopeta, Carabina…).');

  const price = parseMoney(values.price);
  if (Number.isNaN(price)) errors.push(`Precio “${values.price}” no válido. Escribilo solo con números, ej.: 1250000.`);

  let stock = null;
  if (values.stock) {
    stock = Number(String(values.stock).replace(/\s/g, ''));
    if (!Number.isInteger(stock) || stock < 0) { errors.push(`Stock “${values.stock}” no válido (0, 1, 2…).`); stock = null; }
  }

  let condition = null;
  if (values.condition) {
    const k = key(values.condition);
    condition = /^nuev[oa]s?$/.test(k) ? 'nuevo' : /^usad[oa]s?$/.test(k) ? 'usado' : null;
    if (!condition) errors.push(`Condición “${values.condition}” no válida (Nuevo o Usado).`);
  }

  const knownBrands = existing.map(row => row.brand).filter(Boolean);
  const brand = normalizeBrand(values.brand, knownBrands);
  const sector = type?.sector || target?.sector || 'armeria';
  const caliber = normalizeCaliber(values.caliber);
  if (caliber.value && !caliber.known) notes.push(`Calibre “${caliber.value}” no está en la lista: se carga tal cual.`);
  if (caliber.value && sector !== 'armeria') notes.push('El calibre solo se usa en Armería: se ignora.');
  if (!target && name && existing.some(row => key(row.name) === key(name))) notes.push('Ya hay un producto con este nombre: se crea otro aparte (poné el mismo código para actualizarlo).');

  if (errors.length) return { line, status: 'error', errors, notes, data: null, target, name: name || target?.name || '' };

  const regulatedFor = t => {
    const category = sectors[t.sector].categories.find(c => c.id === t.category);
    const sub = category.subcategories.find(s => s.id === t.sub);
    return Boolean(sub?.regulated ?? category.regulated);
  };

  if (target) {
    // Actualización: solo se cambian las celdas que vienen con algo escrito.
    const data = {};
    if (name) data.name = name;
    if (type) Object.assign(data, { sector: type.sector, category: type.category, subcategory: type.sub, regulated: regulatedFor(type) || (type.sector === target.sector && type.category === target.category && target.regulated) });
    if (brand) data.brand = brand;
    if (caliber.value && sector === 'armeria') data.caliber = caliber.value;
    if (price != null) data.price = price;
    if (stock != null) {
      data.stock = stock;
      if (stock === 0) data.availability = 'agotado';
      else if (target.availability === 'agotado') data.availability = 'disponible';
    }
    if (condition) data.condition = condition;
    if (values.short) data.short_description = values.short;
    if (values.description) data.description = values.description;
    if (data.condition === 'nuevo') Object.assign(data, { condition_grade: null, condition_notes: null });
    if (data.sector === 'camping') data.caliber = null;
    return { line, status: Object.keys(data).length ? 'actualiza' : 'igual', errors, notes, data, target, name: name || target.name };
  }

  const data = {
    code: code || null,
    name,
    brand,
    sector: type.sector,
    category: type.category,
    subcategory: type.sub,
    caliber: type.sector === 'armeria' ? caliber.value : null,
    short_description: values.short || null,
    description: values.description || null,
    price,
    offer_active: false,
    previous_price: null,
    stock,
    availability: stock === 0 ? 'agotado' : 'disponible',
    regulated: regulatedFor(type),
    condition: condition || 'nuevo',
    is_new: true,
    date_added: today || null,
    published: false,     // se publica después de cargarle las fotos
    photo: null,
    photos: null,
  };
  return { line, status: 'nuevo', errors, notes, data, target: null, name, typeLabel: type.label };
}

export function analyze(grid, options = {}) {
  const sheet = readSheet(grid);
  const seenCodes = new Set();
  const results = sheet.rows.map(row => normalizeRow(row, { ...options, seenCodes }));
  return { ...sheet, results };
}
