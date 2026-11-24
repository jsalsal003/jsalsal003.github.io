/* ===========================================================================
   TALLER · núcleo común de Plano 2D y Casa 3D
   Geometría, formato del archivo, catálogos de bloques, paredes y huecos,
   regiones cerradas, guardado y deshacer. Sin librerías.
   Todas las medidas se guardan en milímetros reales; las unidades (mm, cm, m)
   solo cambian cómo se muestran y cómo se escriben.
   © 2026 Juan Salguero Salguero · CC BY-NC-SA 4.0
   =========================================================================== */
(function (W) {
'use strict';
const T = W.Taller = W.Taller || {};

/* ---------------------------------------------------------------- vectores */
const V = T.V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, s) => [a[0] * s, a[1] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1],
  cross: (a, b) => a[0] * b[1] - a[1] * b[0],
  len: a => Math.hypot(a[0], a[1]),
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
  norm: a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; },
  perp: a => [-a[1], a[0]],
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
  mid: (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
  rot: (p, ang, c) => { c = c || [0, 0]; const s = Math.sin(ang), co = Math.cos(ang), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co]; },
  ang: a => Math.atan2(a[1], a[0]),
  eq: (a, b, t) => { t = t == null ? 1e-6 : t; return Math.abs(a[0] - b[0]) <= t && Math.abs(a[1] - b[1]) <= t; },
  polar: (p, l, a) => [p[0] + l * Math.cos(a), p[1] + l * Math.sin(a)],
};
const RAD = Math.PI / 180;
T.RAD = RAD;
T.deg = r => r / RAD;
T.norm360 = a => ((a % 360) + 360) % 360;
/* ¿está el ángulo (grados) dentro del arco que va de a0 a a1 en sentido antihorario? */
T.enArco = (a, a0, a1) => {
  const barrido = T.norm360(a1 - a0) || 360;
  return T.norm360(a - a0) <= barrido + 1e-7;
};

/* ------------------------------------------------------------ intersecciones */
T.interLineas = (p, u, q, v) => {
  const d = V.cross(u, v);
  if (Math.abs(d) < 1e-12) return null;
  const t = V.cross(V.sub(q, p), v) / d;
  return V.add(p, V.mul(u, t));
};
function interSegSeg(a, b, c, d) {
  const u = V.sub(b, a), v = V.sub(d, c), den = V.cross(u, v);
  if (Math.abs(den) < 1e-12) return null;
  const w = V.sub(c, a), t = V.cross(w, v) / den, s = V.cross(w, u) / den;
  if (t < -1e-9 || t > 1 + 1e-9 || s < -1e-9 || s > 1 + 1e-9) return null;
  return { p: V.add(a, V.mul(u, t)), t, s };
}
T.interSegSeg = interSegSeg;
function interSegCirc(a, b, c, r) {
  const d = V.sub(b, a), f = V.sub(a, c), A = V.dot(d, d), B = 2 * V.dot(f, d), C = V.dot(f, f) - r * r;
  let disc = B * B - 4 * A * C;
  if (disc < 0 || A < 1e-12) return [];
  disc = Math.sqrt(disc);
  const out = [];
  for (const t of [(-B - disc) / (2 * A), (-B + disc) / (2 * A)]) if (t >= -1e-9 && t <= 1 + 1e-9) out.push({ p: V.add(a, V.mul(d, t)), t });
  return out;
}
function interCircCirc(c1, r1, c2, r2) {
  const d = V.dist(c1, c2);
  if (d < 1e-9 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const u = V.norm(V.sub(c2, c1)), m = V.add(c1, V.mul(u, a)), n = V.perp(u);
  return h < 1e-9 ? [m] : [V.add(m, V.mul(n, h)), V.sub(m, V.mul(n, h))];
}
/* Curvas: {s:[a,b]} segmento · {c,r} círculo · {c,r,a0,a1} arco (grados, antihorario) */
function enCurva(C, p) { return C.a0 == null || T.enArco(T.deg(V.ang(V.sub(p, C.c))), C.a0, C.a1); }
T.interCurvas = (A, B) => {
  if (A.s && B.s) { const i = interSegSeg(A.s[0], A.s[1], B.s[0], B.s[1]); return i ? [i.p] : []; }
  if (A.s) return interSegCirc(A.s[0], A.s[1], B.c, B.r).map(o => o.p).filter(p => enCurva(B, p));
  if (B.s) return interSegCirc(B.s[0], B.s[1], A.c, A.r).map(o => o.p).filter(p => enCurva(A, p));
  return interCircCirc(A.c, A.r, B.c, B.r).filter(p => enCurva(A, p) && enCurva(B, p));
};
T.distSeg = (p, a, b) => {
  const ab = V.sub(b, a), l2 = V.dot(ab, ab);
  let t = l2 ? V.dot(V.sub(p, a), ab) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return { d: V.dist(p, V.add(a, V.mul(ab, t))), t, p: V.add(a, V.mul(ab, t)) };
};
T.distCurva = (p, C) => {
  if (C.s) return T.distSeg(p, C.s[0], C.s[1]).d;
  const dc = V.dist(p, C.c);
  if (enCurva(C, p) || dc < 1e-9) return Math.abs(dc - C.r);
  return Math.min(V.dist(p, V.polar(C.c, C.r, C.a0 * RAD)), V.dist(p, V.polar(C.c, C.r, C.a1 * RAD)));
};

/* ---------------------------------------------------------------- polígonos */
T.areaPoli = pts => { let s = 0; for (let i = 0, n = pts.length; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
T.perimetro = (pts, cerrado) => { let s = 0; for (let i = 0; i < pts.length - (cerrado ? 0 : 1); i++) s += V.dist(pts[i], pts[(i + 1) % pts.length]); return s; };
T.dentroPoli = (p, pts) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
};
T.dentroAnillos = (p, anillos) => { let c = false; for (const r of anillos) if (T.dentroPoli(p, r)) c = !c; return c; };
T.caja = pts => { const b = [Infinity, Infinity, -Infinity, -Infinity]; for (const p of pts) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; } return b; };
/* Douglas-Peucker para anillos cerrados */
T.simplificar = (pts, eps) => {
  if (pts.length < 5) return pts.slice();
  // se parte por los dos puntos más alejados entre sí
  let i0 = 0, i1 = 0, best = -1;
  for (let i = 0; i < pts.length; i++) { const d = V.dist(pts[0], pts[i]); if (d > best) { best = d; i1 = i; } }
  const dp = (arr) => {
    if (arr.length < 3) return arr;
    let m = 0, idx = 0;
    for (let i = 1; i < arr.length - 1; i++) { const d = T.distSeg(arr[i], arr[0], arr[arr.length - 1]).d; if (d > m) { m = d; idx = i; } }
    if (m <= eps) return [arr[0], arr[arr.length - 1]];
    const a = dp(arr.slice(0, idx + 1)), b = dp(arr.slice(idx));
    return a.slice(0, -1).concat(b);
  };
  const A = dp(pts.slice(i0, i1 + 1)), B = dp(pts.slice(i1).concat([pts[0]]));
  return A.slice(0, -1).concat(B.slice(0, -1));
};

/* ------------------------------------------- intérprete de expresiones (sin eval) */
const FN = { min: Math.min, max: Math.max, abs: Math.abs, sqrt: Math.sqrt, round: Math.round, floor: Math.floor, ceil: Math.ceil,
  sen: a => Math.sin(a * RAD), sin: a => Math.sin(a * RAD), cos: a => Math.cos(a * RAD), tan: a => Math.tan(a * RAD) };
T.expr = (src, vars) => {
  if (typeof src === 'number') return src;
  if (src == null || src === '') return 0;
  const s = String(src); let i = 0;
  const peek = () => { while (s[i] === ' ') i++; return s[i]; };
  const fail = m => { throw new Error(m + ' en «' + s + '»'); };
  function primario() {
    const c = peek();
    if (c === '(') { i++; const v = suma(); if (peek() !== ')') fail('falta «)»'); i++; return v; }
    if (c === '-') { i++; return -primario(); }
    if (c === '+') { i++; return primario(); }
    let m = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i));
    if (m) { i += m[0].length; return parseFloat(m[0]); }
    m = /^[A-Za-z_áéíóúñÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ]*/.exec(s.slice(i));
    if (m) {
      i += m[0].length; const id = m[0];
      if (peek() === '(') {
        i++; const args = [suma()];
        while (peek() === ',') { i++; args.push(suma()); }
        if (peek() !== ')') fail('falta «)»'); i++;
        if (!FN[id]) fail('función desconocida ' + id);
        return FN[id].apply(null, args);
      }
      if (vars && Object.prototype.hasOwnProperty.call(vars, id)) return +vars[id];
      if (id === 'pi') return Math.PI;
      fail('no conozco «' + id + '»');
    }
    fail('expresión no válida');
  }
  function producto() { let v = primario(); for (;;) { const c = peek(); if (c === '*') { i++; v *= primario(); } else if (c === '/') { i++; v /= primario(); } else return v; } }
  function suma() { let v = producto(); for (;;) { const c = peek(); if (c === '+') { i++; v += producto(); } else if (c === '-') { i++; v -= producto(); } else return v; } }
  const v = suma();
  if (peek() !== undefined) fail('sobra «' + s.slice(i) + '»');
  return v;
};

/* ------------------------------------------------------------------ unidades */
T.UNI = { mm: 1, cm: 10, m: 1000 };
T.fmt = (v, dec) => {
  dec = dec == null ? 2 : dec;
  let s = (Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec)).toFixed(dec);
  if (dec > 0) s = s.replace(/\.?0+$/, '');
  if (s === '-0') s = '0';
  return s.replace('.', ',');
};
T.num = s => { const v = parseFloat(String(s).trim().replace(',', '.')); return isFinite(v) ? v : NaN; };
T.fmtLong = (mm, uni, dec) => T.fmt(mm / T.UNI[uni], dec == null ? (uni === 'm' ? 3 : uni === 'cm' ? 1 : 1) : dec);

/* ----------------------------------------------------------- formato de archivo */
T.HOJAS = { A4: [297, 210], A3: [420, 297] };
T.TRAZOS = {
  continua: { nombre: 'Continua', en: 'Continuous', d: null },
  oculta: { nombre: 'Discontinua', en: 'Dashed (hidden)', d: [3, 1.5] },
  eje: { nombre: 'Trazo y punto', en: 'Chain (axis)', d: [9, 1.5, 0.8, 1.5] },
};
T.GROSORES = [0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1];
/* atajos de tipo de línea normalizado (UNE-EN ISO 128) */
T.ESTILOS = [
  { id: 'capa', nombre: 'Según la capa', en: 'By layer' },
  { id: 'gruesa', nombre: 'Continua gruesa', en: 'Thick continuous', trazo: 'continua', grosor: 0.5 },
  { id: 'fina', nombre: 'Continua fina', en: 'Thin continuous', trazo: 'continua', grosor: 0.25 },
  { id: 'oculta', nombre: 'Discontinua · aristas ocultas', en: 'Dashed · hidden edges', trazo: 'oculta', grosor: 0.25 },
  { id: 'eje', nombre: 'Trazo y punto · ejes', en: 'Chain · centre lines', trazo: 'eje', grosor: 0.25 },
];
T.capasPorDefecto = () => [
  { id: '0', nombre: 'Contorno', en: 'Outline', color: '#14201a', trazo: 'continua', grosor: 0.5, visible: true, bloqueada: false },
  { id: 'ocultas', nombre: 'Ocultas', en: 'Hidden', color: '#14201a', trazo: 'oculta', grosor: 0.25, visible: true, bloqueada: false },
  { id: 'ejes', nombre: 'Ejes', en: 'Centre lines', color: '#b3261e', trazo: 'eje', grosor: 0.25, visible: true, bloqueada: false },
  { id: 'paredes', nombre: 'Paredes', en: 'Walls', color: '#14201a', trazo: 'continua', grosor: 0.5, visible: true, bloqueada: false },
  { id: 'mobiliario', nombre: 'Mobiliario', en: 'Furniture', color: '#3d4b44', trazo: 'continua', grosor: 0.25, visible: true, bloqueada: false },
  { id: 'rayado', nombre: 'Rayado', en: 'Hatch', color: '#14201a', trazo: 'continua', grosor: 0.18, visible: true, bloqueada: false },
  { id: 'texto', nombre: 'Texto', en: 'Text', color: '#14201a', trazo: 'continua', grosor: 0.25, visible: true, bloqueada: false },
  { id: 'cotas', nombre: 'Cotas', en: 'Dimensions', color: '#1f5bd0', trazo: 'continua', grosor: 0.25, visible: true, bloqueada: false },
];
T.ESTILO_COTA = { texto: 3.5, flecha: 3, extremo: 'flecha', sobresale: 2, hueco: 1, separacion: 8, decimales: 1, unidad: null, decAng: 0 };
T.hoy = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
T.nuevoDoc = o => {
  o = o || {};
  return {
    app: 'taller-plano', version: 1,
    nombre: o.nombre || 'Plano sin título',
    unidad: o.unidad || 'cm',
    escala: o.escala || [1, 20],
    hoja: { formato: 'A4', orientacion: 'apaisada', margen: 10, cajetin: 'ancho', origen: [40, 160],
      datos: { titulo: '', nombre: '', curso: '', fecha: T.hoy(), numero: '1', centro: '' } },
    rejilla: { paso: 100, ver: true, iman: true },
    estiloCota: Object.assign({}, T.ESTILO_COTA),
    capas: T.capasPorDefecto(), capaActual: '0',
    entidades: [], defs: {}, sigId: 1,
    casa: { altura: 2500, grosor: 150, colorPared: '#f4efe4', colorSuelo: '#c8a27a', texturaSuelo: 'parquet', colorTecho: '#ffffff' },
  };
};
T.normalizar = d => {
  const base = T.nuevoDoc();
  if (!d || typeof d !== 'object') return base;
  const out = Object.assign({}, base, d);
  out.hoja = Object.assign({}, base.hoja, d.hoja || {});
  out.hoja.datos = Object.assign({}, base.hoja.datos, (d.hoja && d.hoja.datos) || {});
  out.rejilla = Object.assign({}, base.rejilla, d.rejilla || {});
  out.estiloCota = Object.assign({}, base.estiloCota, d.estiloCota || {});
  out.casa = Object.assign({}, base.casa, d.casa || {});
  out.capas = Array.isArray(d.capas) && d.capas.length ? d.capas : base.capas;
  // capas que siempre hacen falta
  for (const c of base.capas) if (!out.capas.some(x => x.id === c.id)) out.capas.push(c);
  out.entidades = Array.isArray(d.entidades) ? d.entidades.filter(e => e && e.tipo) : [];
  out.defs = d.defs || {};
  if (!T.UNI[out.unidad]) out.unidad = 'cm';
  if (!Array.isArray(out.escala) || !(out.escala[0] > 0) || !(out.escala[1] > 0)) out.escala = [1, 20];
  let max = 0;
  for (const e of out.entidades) { if (!e.id) e.id = 'e' + (++max + 100000); const n = parseInt(String(e.id).replace(/\D/g, ''), 10); if (n > max) max = n; }
  out.sigId = Math.max(d.sigId || 1, max + 1);
  return out;
};
T.k = doc => doc.escala[0] / doc.escala[1];
T.textoEscala = doc => doc.escala[0] + ':' + doc.escala[1];

/* ------------------------------------------------------- catálogos de bloques */
/* Bloques de reserva por si no se pueden leer los catálogos (archivo abierto sin web) */
const RESERVA = {
  biblioteca: 'Arquitectura', en: 'Architecture', categoria: 'arquitectura', nombre: 'Arquitectura', unidad: 'cm',
  bloques: [
    { id: 'pared', nombre: 'Pared', en: 'Wall', herramienta: 'pared' },
    { id: 'puerta', nombre: 'Puerta', en: 'Door', hueco: 'puerta', medidas: { ancho: 80, alto: 210 }, color: '#b07a4a' },
    { id: 'ventana', nombre: 'Ventana', en: 'Window', hueco: 'ventana', medidas: { ancho: 120, alto: 120, antepecho: 90 }, color: '#dfe9f2' },
    { id: 'abertura', nombre: 'Abertura', en: 'Opening', hueco: 'abertura', medidas: { ancho: 90, alto: 210 } },
  ],
};
function prepararCatalogo(cat, archivo, salida) {
  const f = T.UNI[cat.unidad || 'cm'] || 10;
  const lista = { archivo, biblioteca: cat.biblioteca || 'Bloques', en: cat.en || '', categoria: cat.categoria || archivo.replace(/\.json$/, ''),
    nombre: cat.nombre || cat.categoria, enCategoria: cat.en_categoria || cat.enCategoria || '', bloques: [] };
  for (const b of cat.bloques || []) {
    if (!b || !b.id) continue;
    const def = Object.assign({}, b);
    def.ref = lista.categoria + '/' + b.id;
    def.factor = f;
    def.biblioteca = lista.biblioteca;
    def.categoria = lista.categoria;
    salida.defs.set(def.ref, def);
    lista.bloques.push(def);
  }
  salida.listas.push(lista);
}
T.cargarCatalogos = async base => {
  const salida = { defs: new Map(), listas: [], errores: [] };
  try {
    const r = await fetch(base + 'indice.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('No encuentro ' + base + 'indice.json');
    const ind = await r.json();
    const archivos = (ind.catalogos || []).map(c => typeof c === 'string' ? c : c.archivo);
    const datos = await Promise.all(archivos.map(a => fetch(base + a, { cache: 'no-cache' }).then(x => { if (!x.ok) throw new Error(a + ': no se encuentra'); return x.json(); }).catch(e => { salida.errores.push(a + ': ' + e.message); return null; })));
    datos.forEach((d, i) => { if (d) prepararCatalogo(d, archivos[i], salida); });
  } catch (e) {
    salida.errores.push(e.message);
  }
  if (!salida.listas.length) prepararCatalogo(RESERVA, 'reserva', salida);
  return salida;
};
/* Definición de un bloque: primero la que va dentro del archivo, luego el catálogo */
T.defBloque = (doc, cat, ref) => (doc.defs && doc.defs[ref]) || (cat && cat.defs.get(ref)) || null;

/* Medidas por defecto de un bloque (en mm) */
T.medidasDef = def => {
  const f = def.factor || 10, m = {};
  for (const k in def.medidas || {}) m[k] = T.expr(def.medidas[k], {}) * f;
  return m;
};
function varsBloque(def, inst) {
  const f = def.factor || 10, v = {};
  for (const k in def.medidas || {}) v[k] = T.expr(def.medidas[k], {});
  for (const k in inst.med || {}) v[k] = inst.med[k] / f;
  for (const k in def.parametros || {}) v[k] = T.expr(def.parametros[k], {});
  for (const k in inst.par || {}) v[k] = inst.par[k];
  return v;
}
/* Geometría de un bloque colocado: líneas en coordenadas del modelo y piezas 3D locales */
T.geoBloque = (def, inst) => {
  const med = inst.med || {};
  const out = { lineas: [], textos: [], piezas: [], errores: [] };
  const f = (def && def.factor) || 10;
  const giro = (inst.giro || 0) * RAD, esp = inst.espejo ? -1 : 1, p0 = inst.p || [0, 0];
  const aModelo = q => { const x = q[0] * esp, y = q[1]; return [p0[0] + x * Math.cos(giro) - y * Math.sin(giro), p0[1] + x * Math.sin(giro) + y * Math.cos(giro)]; };
  out.aModelo = aModelo;
  const ancho = med.ancho || (def && def.medidas && T.expr(def.medidas.ancho, {}) * f) || 600;
  const fondo = med.fondo || (def && def.medidas && T.expr(def.medidas.fondo, {}) * f) || 600;
  out.ancho = ancho; out.fondo = fondo; out.alto = med.alto || (def && def.medidas && def.medidas.alto ? T.expr(def.medidas.alto, {}) * f : 750);
  out.esquinasLocal = [[0, 0], [ancho, 0], [ancho, fondo], [0, fondo]];
  out.esquinas = out.esquinasLocal.map(aModelo);
  if (!def || !def.planta) {
    // bloque desconocido: rectángulo con aspa
    out.lineas.push({ pts: out.esquinas, cerr: true });
    out.lineas.push({ pts: [out.esquinas[0], out.esquinas[2]] });
    out.lineas.push({ pts: [out.esquinas[1], out.esquinas[3]] });
    out.piezas.push({ tipo: 'caja', x: 0, y: 0, z: 0, w: ancho, d: fondo, h: out.alto });
    if (def && def.piezas) out.piezas = [];
    else return out;
  }
  const vars = varsBloque(def, inst);
  const ev = x => T.expr(x, vars) * f;
  const evn = x => T.expr(x, vars);
  const estilo = el => ({ fina: el.gruesa ? false : true, gruesa: !!el.gruesa, trazo: el.trazo || null, relleno: el.relleno || null });
  const planta = (lista, extra) => {
    for (const el of lista || []) {
      try {
        if (el.repetir) {
          const n = Math.max(0, Math.min(500, Math.round(evn(el.repetir.n != null ? el.repetir.n : el.repetir.veces))));
          const nombre = el.repetir.var || 'i';
          for (let i = 0; i < n; i++) { vars[nombre] = i; planta(el.repetir.elementos || el.elementos, extra); }
          continue;
        }
        const st = estilo(el);
        if (el.rect) {
          const [x, y, w, h] = el.rect.map(ev);
          out.lineas.push(Object.assign({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(aModelo), cerr: true }, st));
        } else if (el.linea || el.poligono) {
          const a = (el.linea || el.poligono).map(ev), pts = [];
          for (let i = 0; i + 1 < a.length; i += 2) pts.push(aModelo([a[i], a[i + 1]]));
          out.lineas.push(Object.assign({ pts, cerr: !!el.poligono }, st));
        } else if (el.circulo || el.arco) {
          const a = (el.circulo || el.arco), cx = ev(a[0]), cy = ev(a[1]), r = ev(a[2]);
          let a0 = 0, a1 = 360;
          if (el.arco) { a0 = evn(a[3]); a1 = evn(a[4]); }
          let barrido = el.circulo ? 360 : (T.norm360(a1 - a0) || 360);
          const n = Math.max(12, Math.ceil(barrido / 7.5)), pts = [];
          for (let i = 0; i <= n; i++) {
            const ang = (a0 + barrido * i / n) * RAD;
            pts.push(aModelo([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]));
          }
          if (el.circulo) pts.pop();
          out.lineas.push(Object.assign({ pts, cerr: !!el.circulo }, st));
        } else if (el.texto) {
          out.textos.push({ p: aModelo([ev(el.texto[0]), ev(el.texto[1])]), txt: String(el.texto[2]), h: el.h || 2.5, ang: (inst.giro || 0) });
        }
      } catch (e) { out.errores.push(e.message); }
    }
  };
  planta(def.planta);
  const piezas = lista => {
    for (const el of lista || []) {
      try {
        if (el.repetir) {
          const n = Math.max(0, Math.min(200, Math.round(evn(el.repetir.n != null ? el.repetir.n : el.repetir.veces))));
          const nombre = el.repetir.var || 'i';
          for (let i = 0; i < n; i++) { vars[nombre] = i; piezas(el.repetir.elementos || el.elementos); }
          continue;
        }
        const color = el.color || null;
        if (el.caja) { const [x, y, z, w, d, h] = el.caja.map(ev); out.piezas.push({ tipo: 'caja', x, y, z, w, d, h, color, mate: el.mate }); }
        else if (el.cilindro) { const [x, y, z, r, h] = el.cilindro.map(ev); out.piezas.push({ tipo: 'cil', x, y, z, r, h, eje: el.eje || 'z', color }); }
      } catch (e) { out.errores.push(e.message); }
    }
  };
  piezas(def.piezas);
  return out;
};

/* ------------------------------------------------------------- paredes y huecos */
/* Cada pared es un segmento a→b (eje) con su grosor. En los nudos se cortan a inglete. */
T.geoParedes = ents => {
  const paredes = ents.filter(e => e.tipo === 'pared' && V.dist(e.a, e.b) > 1e-6);
  const res = new Map();
  const TOL = 1;
  // nudos: extremos que coinciden
  const nudos = [];
  const nudoDe = p => {
    for (const n of nudos) if (V.dist(n.p, p) <= TOL) return n;
    const n = { p, extremos: [] }; nudos.push(n); return n;
  };
  for (const w of paredes) {
    const L = V.dist(w.a, w.b), d = V.norm(V.sub(w.b, w.a)), nl = V.perp(d), t = Math.max(1, w.grosor || 150);
    const g = { id: w.id, e: w, A: w.a, B: w.b, L, d, nl, t, huecos: [], piezas: [] };
    res.set(w.id, g);
    nudoDe(w.a).extremos.push({ g, fin: 'a', u: d });
    nudoDe(w.b).extremos.push({ g, fin: 'b', u: V.mul(d, -1) });
  }
  for (const n of nudos) {
    const ex = n.extremos;
    ex.sort((x, y) => V.ang(x.u) - V.ang(y.u));
    const k = ex.length;
    for (let i = 0; i < k; i++) {
      const W1 = ex[i], E = n.p, u = W1.u, t = W1.g.t, pu = V.perp(u);
      let izq = V.add(E, V.mul(pu, t / 2)), der = V.sub(E, V.mul(pu, t / 2));
      if (k > 1) {
        const N = ex[(i + 1) % k], M = ex[(i - 1 + k) % k];
        const lim = 4 * Math.max(t, N.g.t, M.g.t);
        const pi = T.interLineas(izq, u, V.sub(E, V.mul(V.perp(N.u), N.g.t / 2)), N.u);
        if (pi && V.dist(pi, E) < lim && V.dot(V.sub(pi, E), u) > -t) izq = pi;
        const pd = T.interLineas(der, u, V.add(E, V.mul(V.perp(M.u), M.g.t / 2)), M.u);
        if (pd && V.dist(pd, E) < lim && V.dot(V.sub(pd, E), u) > -t) der = pd;
      }
      const g = W1.g;
      if (W1.fin === 'a') { g.aL = izq; g.aR = der; g.nudoA = k; } else { g.bR = izq; g.bL = der; g.nudoB = k; }
    }
  }
  // huecos
  const porPared = new Map();
  for (const h of ents) if (h.tipo === 'hueco' && res.has(h.pared)) { if (!porPared.has(h.pared)) porPared.set(h.pared, []); porPared.get(h.pared).push(h); }
  for (const g of res.values()) {
    const hs = (porPared.get(g.id) || []).map(h => {
      const w = Math.max(10, Math.min(h.ancho || 800, g.L));
      const s = Math.max(0, Math.min(h.pos || 0, g.L - w));
      const P = x => V.add(g.A, V.mul(g.d, x));
      return { id: h.id, e: h, s, w, ini: P(s), fin: P(s + w),
        '0L': V.add(P(s), V.mul(g.nl, g.t / 2)), '0R': V.sub(P(s), V.mul(g.nl, g.t / 2)),
        '1L': V.add(P(s + w), V.mul(g.nl, g.t / 2)), '1R': V.sub(P(s + w), V.mul(g.nl, g.t / 2)) };
    }).sort((x, y) => x.s - y.s);
    g.huecos = hs;
    // tramos macizos entre huecos
    const cortes = [];
    let s0 = 0;
    for (const h of hs) { if (h.s > s0 + 0.5) cortes.push([s0, h.s]); s0 = Math.max(s0, h.s + h.w); }
    if (g.L > s0 + 0.5) cortes.push([s0, g.L]);
    const P = (x, lado) => V.add(V.add(g.A, V.mul(g.d, x)), V.mul(g.nl, lado * g.t / 2));
    // la pared entera, sin huecos (para encontrar las habitaciones)
    g.completa = [g.aR].concat(g.nudoA > 1 ? [g.A] : [], [g.aL, g.bL], g.nudoB > 1 ? [g.B] : [], [g.bR]);
    for (const [a, b] of cortes) {
      const pts = [];
      pts.push(a === 0 ? g.aR : P(a, -1));
      if (a === 0 && g.nudoA > 1) pts.push(g.A);
      pts.push(a === 0 ? g.aL : P(a, 1));
      pts.push(b >= g.L ? g.bL : P(b, 1));
      if (b >= g.L && g.nudoB > 1) pts.push(g.B);
      pts.push(b >= g.L ? g.bR : P(b, -1));
      g.piezas.push({ pts, s0: a, s1: b });
    }
  }
  return res;
};
/* Distancia de un hueco a las esquinas, medida por la cara indicada (+1 izquierda, -1 derecha) */
T.distEsquinas = (g, h, lado) => {
  const ini = lado > 0 ? g.aL : g.aR, fin = lado > 0 ? g.bL : g.bR;
  const s0 = V.dot(V.sub(ini, g.A), g.d), s1 = V.dot(V.sub(fin, g.A), g.d);
  return { ini: h.s - s0, fin: s1 - (h.s + h.w), s0, s1 };
};

/* ------------------------------------------------------- contexto geométrico */
/* Calcula (y guarda) paredes, bloques, puntos notables y curvas de cada entidad */
T.Geo = function (doc, cat) {
  const ents = new Map(doc.entidades.map(e => [e.id, e]));
  const paredes = T.geoParedes(doc.entidades);
  const bloques = new Map();
  const G = { doc, cat, ents, paredes };
  G.bloque = e => {
    if (!bloques.has(e.id)) bloques.set(e.id, T.geoBloque(T.defBloque(doc, cat, e.ref), e));
    return bloques.get(e.id);
  };
  G.hueco = e => { const g = paredes.get(e.pared); return g ? g.huecos.find(h => h.id === e.id) : null; };
  /* puntos notables: {k, p, t} con t = fin | medio | centro | cuadrante | insercion */
  G.puntos = e => {
    const out = [];
    const add = (k, p, t) => { if (p) out.push({ k, p, t }); };
    switch (e.tipo) {
      case 'linea': add('a', e.a, 'fin'); add('b', e.b, 'fin'); add('m', V.mid(e.a, e.b), 'medio'); break;
      case 'polilinea': {
        const n = e.pts.length;
        e.pts.forEach((p, i) => add('v' + i, p, 'fin'));
        for (let i = 0; i < n - (e.cerrada ? 0 : 1); i++) add('m' + i, V.mid(e.pts[i], e.pts[(i + 1) % n]), 'medio');
        break;
      }
      case 'circulo': add('c', e.c, 'centro'); for (let i = 0; i < 4; i++) add('q' + i, V.polar(e.c, e.r, i * Math.PI / 2), 'cuadrante'); break;
      case 'arco': {
        add('c', e.c, 'centro'); add('a0', V.polar(e.c, e.r, e.a0 * RAD), 'fin'); add('a1', V.polar(e.c, e.r, e.a1 * RAD), 'fin');
        const am = e.a0 + (T.norm360(e.a1 - e.a0) || 360) / 2; add('m', V.polar(e.c, e.r, am * RAD), 'medio');
        break;
      }
      case 'texto': add('p', e.p, 'insercion'); break;
      case 'pared': {
        const g = paredes.get(e.id); if (!g) break;
        add('a', e.a, 'fin'); add('b', e.b, 'fin'); add('m', V.mid(e.a, e.b), 'medio');
        add('aL', g.aL, 'fin'); add('aR', g.aR, 'fin'); add('bL', g.bL, 'fin'); add('bR', g.bR, 'fin');
        break;
      }
      case 'hueco': {
        const h = G.hueco(e); if (!h) break;
        add('0L', h['0L'], 'fin'); add('0R', h['0R'], 'fin'); add('1L', h['1L'], 'fin'); add('1R', h['1R'], 'fin'); add('c', V.mid(h.ini, h.fin), 'medio');
        break;
      }
      case 'bloque': {
        const b = G.bloque(e);
        b.esquinas.forEach((p, i) => add('c' + i, p, 'fin'));
        b.esquinas.forEach((p, i) => add('m' + i, V.mid(p, b.esquinas[(i + 1) % 4]), 'medio'));
        add('o', V.mid(b.esquinas[0], b.esquinas[2]), 'centro');
        break;
      }
      case 'suelo': e.pts.forEach((p, i) => add('v' + i, p, 'fin')); break;
    }
    return out;
  };
  G.punto = ref => {
    if (!ref) return null;
    const e = ents.get(ref.id);
    if (!e) return null;
    const p = G.puntos(e).find(x => x.k === ref.k);
    return p ? p.p : null;
  };
  /* curvas (segmentos, círculos y arcos) para el imán, recortar y las regiones */
  G.curvas = e => {
    const out = [];
    const seg = (a, b) => out.push({ s: [a, b] });
    const poli = (pts, cerr) => { for (let i = 0; i < pts.length - (cerr ? 0 : 1); i++) seg(pts[i], pts[(i + 1) % pts.length]); };
    switch (e.tipo) {
      case 'linea': seg(e.a, e.b); break;
      case 'polilinea': poli(e.pts, e.cerrada); break;
      case 'circulo': out.push({ c: e.c, r: e.r }); break;
      case 'arco': out.push({ c: e.c, r: e.r, a0: e.a0, a1: e.a1 }); break;
      case 'pared': { const g = paredes.get(e.id); if (g) for (const pz of g.piezas) poli(pz.pts.filter(p => p !== g.A && p !== g.B), true); break; }
      case 'bloque': { const b = G.bloque(e); for (const l of b.lineas) poli(l.pts, l.cerr); break; }
      case 'suelo': poli(e.pts, true); break;
    }
    return out;
  };
  /* contorno de las paredes sin contar puertas ni ventanas: cierra las habitaciones */
  G.curvasHabitaciones = () => {
    const out = [];
    for (const g of paredes.values()) { const q = g.completa.filter(p => p !== g.A && p !== g.B); for (let i = 0; i < q.length; i++) out.push({ s: [q[i], q[(i + 1) % q.length]] }); }
    return out;
  };
  return G;
};

/* --------------------------------------------- regiones cerradas (por píxeles) */
/* Rasteriza las curvas en una rejilla, rellena desde un punto (o busca todas las
   zonas cerradas) y devuelve sus contornos como anillos. Sirve para el rayado y
   para detectar habitaciones. */
function rasterizar(curvas, caja, celda) {
  let cw = celda;
  let W = Math.ceil((caja[2] - caja[0]) / cw) + 3, H = Math.ceil((caja[3] - caja[1]) / cw) + 3;
  while (W * H > 2.5e6) { cw *= 1.5; W = Math.ceil((caja[2] - caja[0]) / cw) + 3; H = Math.ceil((caja[3] - caja[1]) / cw) + 3; }
  const x0 = caja[0] - cw, y0 = caja[1] - cw;
  const m = new Uint8Array(W * H);
  const marca = (x, y) => { const i = Math.floor((x - x0) / cw), j = Math.floor((y - y0) / cw); if (i >= 0 && j >= 0 && i < W && j < H) m[j * W + i] = 1; };
  const linea = (a, b) => { const n = Math.ceil(V.dist(a, b) / (cw * 0.45)) + 1; for (let s = 0; s <= n; s++) { const p = V.lerp(a, b, s / n); marca(p[0], p[1]); } };
  for (const c of curvas) {
    if (c.s) linea(c.s[0], c.s[1]);
    else {
      const a0 = c.a0 == null ? 0 : c.a0, bar = c.a0 == null ? 360 : (T.norm360(c.a1 - c.a0) || 360);
      const n = Math.max(16, Math.ceil(bar * RAD * c.r / (cw * 0.45)));
      let prev = null;
      for (let s = 0; s <= n; s++) { const p = V.polar(c.c, c.r, (a0 + bar * s / n) * RAD); if (prev) linea(prev, p); prev = p; }
    }
  }
  return { m, W, H, x0, y0, cw };
}
function rellenar(R, i0, j0, etiqueta, lab) {
  const { m, W, H } = R;
  const pila = [j0 * W + i0];
  let borde = false, n = 0;
  lab[j0 * W + i0] = etiqueta;
  while (pila.length) {
    const k = pila.pop(); n++;
    const i = k % W, j = (k - i) / W;
    if (i === 0 || j === 0 || i === W - 1 || j === H - 1) borde = true;
    if (i > 0 && !m[k - 1] && !lab[k - 1]) { lab[k - 1] = etiqueta; pila.push(k - 1); }
    if (i < W - 1 && !m[k + 1] && !lab[k + 1]) { lab[k + 1] = etiqueta; pila.push(k + 1); }
    if (j > 0 && !m[k - W] && !lab[k - W]) { lab[k - W] = etiqueta; pila.push(k - W); }
    if (j < H - 1 && !m[k + W] && !lab[k + W]) { lab[k + W] = etiqueta; pila.push(k + W); }
  }
  return { borde, n };
}
function contornos(R, lab, etiqueta, crecer) {
  const { W, H, x0, y0, cw } = R;
  const dentro = (i, j) => i >= 0 && j >= 0 && i < W && j < H && lab[j * W + i] === etiqueta;
  // aristas dirigidas con el interior a la izquierda
  const sig = new Map();
  const key = (i, j) => i * 100003 + j;
  const add = (a, b) => { const k = key(a[0], a[1]); if (!sig.has(k)) sig.set(k, []); sig.get(k).push(b); };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (!dentro(i, j)) continue;
    if (!dentro(i, j - 1)) add([i, j], [i + 1, j]);
    if (!dentro(i + 1, j)) add([i + 1, j], [i + 1, j + 1]);
    if (!dentro(i, j + 1)) add([i + 1, j + 1], [i, j + 1]);
    if (!dentro(i - 1, j)) add([i, j + 1], [i, j]);
  }
  const anillos = [];
  for (const [k0, lista] of sig) {
    while (lista.length) {
      const i0 = Math.floor(k0 / 100003), j0 = k0 - i0 * 100003;
      const ring = [[i0, j0]];
      let cur = lista.pop(), guard = 0;
      while (guard++ < 2e6) {
        if (cur[0] === i0 && cur[1] === j0) break;
        ring.push(cur);
        const l = sig.get(key(cur[0], cur[1]));
        if (!l || !l.length) break;
        cur = l.pop();
      }
      if (ring.length < 4) continue;
      // quitar puntos alineados
      const lim = [];
      for (let q = 0; q < ring.length; q++) {
        const a = ring[(q - 1 + ring.length) % ring.length], b = ring[q], c = ring[(q + 1) % ring.length];
        if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) lim.push(b);
      }
      let pts = lim.map(p => [x0 + p[0] * cw, y0 + p[1] * cw]);
      pts = T.simplificar(pts, cw * 1.05);
      if (pts.length >= 3) anillos.push(pts);
    }
  }
  if (crecer) {
    // desplaza cada anillo hacia fuera (se mete bajo las líneas que lo cierran)
    return anillos.map(r => offsetAnillo(r, crecer));
  }
  return anillos;
}
function offsetAnillo(r, d) {
  const n = r.length, out = [];
  const sgn = T.areaPoli(r) > 0 ? -1 : 1; // hacia fuera
  for (let i = 0; i < n; i++) {
    const a = r[(i - 1 + n) % n], b = r[i], c = r[(i + 1) % n];
    const n1 = V.mul(V.perp(V.norm(V.sub(b, a))), sgn * d), n2 = V.mul(V.perp(V.norm(V.sub(c, b))), sgn * d);
    const p = T.interLineas(V.add(a, n1), V.sub(b, a), V.add(b, n2), V.sub(c, b));
    out.push(p && V.dist(p, b) < 4 * Math.abs(d) ? p : V.add(b, n1));
  }
  return out;
}
/* Región cerrada que contiene el punto p (o null si está abierta) */
T.regionEnPunto = (curvas, p, celda) => {
  if (!curvas.length) return null;
  const pts = [];
  for (const c of curvas) { if (c.s) pts.push(c.s[0], c.s[1]); else pts.push([c.c[0] - c.r, c.c[1] - c.r], [c.c[0] + c.r, c.c[1] + c.r]); }
  const caja = T.caja(pts);
  if (p[0] < caja[0] || p[0] > caja[2] || p[1] < caja[1] || p[1] > caja[3]) return null;
  const R = rasterizar(curvas, caja, celda);
  const i = Math.floor((p[0] - R.x0) / R.cw), j = Math.floor((p[1] - R.y0) / R.cw);
  if (R.m[j * R.W + i]) return null;
  const lab = new Uint8Array(R.W * R.H);
  const r = rellenar(R, i, j, 1, lab);
  if (r.borde) return null;
  return contornos(R, lab, 1, R.cw * 0.5);
};
/* Todas las zonas cerradas (habitaciones). minArea en mm² */
T.habitaciones = (curvas, celda, minArea) => {
  if (!curvas.length) return [];
  const pts = [];
  for (const c of curvas) { if (c.s) pts.push(c.s[0], c.s[1]); else pts.push([c.c[0] - c.r, c.c[1] - c.r], [c.c[0] + c.r, c.c[1] + c.r]); }
  const R = rasterizar(curvas, T.caja(pts), celda);
  const lab = new Uint16Array(R.W * R.H);
  rellenar(R, 0, 0, 1, lab); // exterior
  const zonas = [];
  let et = 2;
  for (let k = 0; k < R.W * R.H && et < 60000; k++) {
    if (R.m[k] || lab[k]) continue;
    const i = k % R.W, j = (k - i) / R.W;
    const r = rellenar(R, i, j, et, lab);
    if (!r.borde && r.n * R.cw * R.cw >= (minArea || 5e5)) {
      const an = contornos(R, lab, et, R.cw * 0.5);
      if (an.length) zonas.push(an);
    }
    et++;
  }
  return zonas;
};

/* Líneas de rayado (en las mismas unidades que los anillos) */
T.lineasRayado = (anillos, angDeg, sep) => {
  const a = angDeg * RAD, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
  let mn = Infinity, mx = -Infinity;
  for (const r of anillos) for (const p of r) { const d = V.dot(p, n); if (d < mn) mn = d; if (d > mx) mx = d; }
  const out = [];
  if (!(sep > 0) || !isFinite(mn)) return out;
  const k0 = Math.ceil(mn / sep), k1 = Math.floor(mx / sep);
  if (k1 - k0 > 4000) return out;
  for (let k = k0; k <= k1; k++) {
    const d = k * sep, ts = [];
    for (const r of anillos) for (let i = 0; i < r.length; i++) {
      const p = r[i], q = r[(i + 1) % r.length], dp = V.dot(p, n) - d, dq = V.dot(q, n) - d;
      if ((dp < 0) !== (dq < 0)) { const t = dp / (dp - dq); ts.push(V.dot(V.lerp(p, q, t), u)); }
    }
    ts.sort((x, y) => x - y);
    for (let i = 0; i + 1 < ts.length; i += 2) {
      const base = V.mul(n, d);
      out.push([V.add(base, V.mul(u, ts[i])), V.add(base, V.mul(u, ts[i + 1]))]);
    }
  }
  return out;
};

/* ----------------------------------------------------- guardar, abrir, deshacer */
T.lsGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
T.lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
T.lsDel = k => { try { localStorage.removeItem(k); } catch (e) { /* nada */ } };
T.descargar = (blob, nombre) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
T.nombreArchivo = s => (String(s || 'plano').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'plano');
T.abrirArchivo = accept => new Promise((ok, mal) => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept || '.json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return mal(new Error('Ningún archivo'));
    const r = new FileReader();
    r.onload = () => ok({ nombre: f.name, texto: String(r.result) });
    r.onerror = () => mal(new Error('No se puede leer el archivo'));
    r.readAsText(f);
  };
  inp.click();
});
T.Historial = function (max) {
  this.max = max || 80; this.pila = []; this.pos = -1;
};
T.Historial.prototype.guardar = function (s) {
  if (this.pila[this.pos] === s) return false;
  this.pila.length = this.pos + 1; this.pila.push(s);
  if (this.pila.length > this.max) this.pila.shift();
  this.pos = this.pila.length - 1;
  return true;
};
T.Historial.prototype.actual = function () { return this.pila[this.pos]; };
T.Historial.prototype.deshacer = function () { return this.pos > 0 ? this.pila[--this.pos] : null; };
T.Historial.prototype.rehacer = function () { return this.pos < this.pila.length - 1 ? this.pila[++this.pos] : null; };
T.Historial.prototype.reiniciar = function (s) { this.pila = [s]; this.pos = 0; };

/* --------------------------------------------------- entrada de coordenadas */
/* Formatos (en la unidad del plano, ángulos en grados):
     x,y   absoluta        @dx,dy  relativa al último punto
     L<a   longitud y ángulo desde el último punto (también @L<a)
     L     longitud en la dirección del ratón
   Si se usa «;» para separar, la coma vale como decimal: 2,5;3 */
T.leerCoordenadas = (txt, ultimo, haciaRaton, f) => {
  let s = String(txt || '').trim().replace(/\s+/g, '');
  if (!s) return { error: 'Escribe una coordenada o una medida' };
  let rel = false;
  if (s[0] === '@') { rel = true; s = s.slice(1); }
  const sep = s.includes(';') ? ';' : ',';
  const num = x => { const v = parseFloat(sep === ';' ? x.replace(',', '.') : x); return isFinite(v) ? v : NaN; };
  if (s.includes('<')) {
    const [l, a] = s.split('<').map(num);
    if (isNaN(l) || isNaN(a)) return { error: 'Formato: longitud<ángulo, por ejemplo 120<30' };
    const base = ultimo || [0, 0];
    return { p: V.polar(base, l * f, a * RAD) };
  }
  const partes = s.split(sep);
  if (partes.length === 2) {
    const x = num(partes[0]), y = num(partes[1]);
    if (isNaN(x) || isNaN(y)) return { error: 'Formato: x,y (por ejemplo 120,80)' };
    if (rel) { if (!ultimo) return { error: 'Aún no hay un punto anterior para «@»' }; return { p: [ultimo[0] + x * f, ultimo[1] + y * f] }; }
    return { p: [x * f, y * f] };
  }
  if (partes.length === 1) {
    const l = parseFloat(s.replace(',', '.'));
    if (isNaN(l)) return { error: 'No entiendo «' + txt + '»' };
    return { valor: l, p: ultimo && haciaRaton ? V.add(ultimo, V.mul(V.norm(haciaRaton), l * f)) : null };
  }
  return { error: 'No entiendo «' + txt + '»' };
};

})(window);
