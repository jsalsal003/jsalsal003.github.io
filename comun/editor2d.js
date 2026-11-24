/* ===========================================================================
   TALLER · editor 2D (lo usan Plano 2D y la planta de Casa 3D)
   Vista con zoom, imanes (rejilla, extremos, puntos medios, centros e
   intersecciones), ortogonal, entrada de coordenadas, herramientas de dibujo,
   de edición y de acotación, deshacer y «Revisar cotas».
   © 2026 Juan Salguero Salguero · CC BY-NC-SA 4.0
   =========================================================================== */
(function (W) {
'use strict';
const T = W.Taller, V = T.V, RAD = T.RAD;

/* ---------------------------------------------------- lista de herramientas */
const I = { // iconos (viewBox 0 0 24 24, trazo con currentColor)
  sel: '<path d="M5 3l13 8-6 1.5L9 19z"/>',
  mano: '<path d="M8 12V5.5a1.5 1.5 0 013 0V11m0-6.5a1.5 1.5 0 013 0V11m0-4.5a1.5 1.5 0 013 0V14a6 6 0 01-6 6h-1a6 6 0 01-5-2.7L3.5 13a1.5 1.5 0 012.5-1.6L8 14"/>',
  linea: '<path d="M4 20L20 4"/><rect x="2.5" y="18.5" width="3" height="3"/><rect x="18.5" y="2.5" width="3" height="3"/>',
  polilinea: '<path d="M3 19l5-9 6 5 7-11"/>',
  rect: '<rect x="3.5" y="6" width="17" height="12"/>',
  circulo: '<circle cx="12" cy="12" r="8"/><path d="M12 12h8"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  arco: '<path d="M4 18a9 9 0 0116 0"/><circle cx="12" cy="18" r="1" fill="currentColor"/>',
  texto: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  rayado: '<rect x="3.5" y="3.5" width="17" height="17"/><path d="M3.5 12L12 3.5M3.5 20.5L20.5 3.5M12 20.5l8.5-8.5"/>',
  pared: '<path d="M3 5h18v5H3zM3 14h18v5H3z" fill="currentColor" fill-opacity=".25"/><path d="M3 5h18v5H3zM3 14h18v5H3z"/>',
  habitacion: '<path d="M3 3h18v18H3z" stroke-width="3.2"/><path d="M14 21a6 6 0 016-6" stroke-dasharray="2 2"/>',
  suelo: '<path d="M3 8l9-5 9 5-9 5z" fill="currentColor" fill-opacity=".25"/><path d="M3 8l9-5 9 5-9 5zM3 13l9 5 9-5M3 17l9 5 9-5"/>',
  mover: '<path d="M12 3v18M3 12h18M12 3l-3 3m3-3l3 3M12 21l-3-3m3 3l3-3M3 12l3-3m-3 3l3 3M21 12l-3-3m3 3l-3 3"/>',
  copiar: '<rect x="8" y="8" width="12" height="12"/><path d="M4 16V4h12"/>',
  girar: '<path d="M20 12a8 8 0 11-3-6.3"/><path d="M17 2v4h4"/>',
  simetria: '<path d="M12 2v20" stroke-dasharray="2.5 2"/><path d="M9 6L3 18h6zM15 6l6 12h-6z"/>',
  escalar: '<rect x="3" y="11" width="10" height="10"/><path d="M11 3h10v10M21 3l-8 8M15 3h6v6"/>',
  recortar: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5L20 18M8.5 16.5L20 6"/>',
  borrar: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  'cota-lin': '<path d="M4 4v16M20 4v16M4 12h16"/><path d="M4 12l3-1.6v3.2zM20 12l-3-1.6v3.2z" fill="currentColor"/>',
  'cota-ali': '<path d="M3 15L15 3M9 21L21 9M6 18L18 6"/><path d="M6 18l1-3.2 2.2 2.2zM18 6l-1 3.2-2.2-2.2z" fill="currentColor"/>',
  'cota-ang': '<path d="M4 20h16M4 20L16 6"/><path d="M14 20a10 10 0 00-3.3-7.5"/>',
  'cota-rad': '<circle cx="12" cy="12" r="8"/><path d="M12 12l5.6-5.6"/><text x="5" y="18" font-size="8" font-family="Arial" stroke="none" fill="currentColor">R</text>',
  'cota-dia': '<circle cx="12" cy="12" r="8"/><path d="M6.3 17.7L17.7 6.3"/><path d="M17.7 6.3l-1 3.2-2.2-2.2zM6.3 17.7l1-3.2 2.2 2.2z" fill="currentColor"/>',
  'cota-serie': '<path d="M3 5v14M11 5v14M21 5v14M3 12h18"/><path d="M3 12l2.5-1.3v2.6zM11 12l-2.5-1.3v2.6zM11 12l2.5-1.3v2.6zM21 12l-2.5-1.3v2.6z" fill="currentColor"/>',
  'cota-base': '<path d="M3 4v16M12 9v11M21 4v16M3 10h9M3 16h18"/><path d="M3 10l2.5-1.3v2.6zM12 10l-2.5-1.3v2.6zM3 16l2.5-1.3v2.6zM21 16l-2.5-1.3v2.6z" fill="currentColor"/>',
  'cota-rapida': '<path d="M4 18h16M4 14v8M20 14v8"/><path d="M13 2l-5 8h4l-1 5 5-8h-4z" fill="currentColor"/>',
  medir: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  puerta: '<path d="M2 20h6M17 20h5" stroke-width="3"/><path d="M17 20V7"/><path d="M17 7A13 13 0 0 0 8 20" stroke-dasharray="2.5 2"/>',
  ventana: '<path d="M2 9.5h5v5H2zM17 9.5h5v5h-5z" fill="currentColor" fill-opacity=".25"/><path d="M2 9.5h5v5H2zM17 9.5h5v5h-5zM7 11h10M7 13h10M7 9.5h10M7 14.5h10"/>',
  abertura: '<path d="M2 9.5h6v5H2zM16 9.5h6v5h-6z" fill="currentColor" fill-opacity=".25"/><path d="M2 9.5h6v5H2zM16 9.5h6v5h-6z"/><path d="M8 9.5h8M8 14.5h8" stroke-dasharray="2 2"/>',
  revisar: '<path d="M4 12l5 5L20 6"/><circle cx="12" cy="12" r="10" stroke-dasharray="3 2.4"/>',
};
T.ICONOS = I;
T.icono = id => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (I[id] || '') + '</svg>';
T.HERRAMIENTAS = [
  { id: 'sel', nombre: 'Seleccionar', en: 'Select', tecla: 'Esc', grupo: 'edicion' },
  { id: 'linea', nombre: 'Línea', en: 'Line', tecla: 'L', grupo: 'dibujo' },
  { id: 'polilinea', nombre: 'Polilínea', en: 'Polyline', tecla: 'P', grupo: 'dibujo' },
  { id: 'rect', nombre: 'Rectángulo', en: 'Rectangle', tecla: 'R', grupo: 'dibujo' },
  { id: 'circulo', nombre: 'Círculo', en: 'Circle', tecla: 'C', grupo: 'dibujo' },
  { id: 'arco', nombre: 'Arco', en: 'Arc', tecla: 'A', grupo: 'dibujo' },
  { id: 'texto', nombre: 'Texto', en: 'Text', tecla: 'T', grupo: 'dibujo' },
  { id: 'rayado', nombre: 'Rayado', en: 'Hatch', tecla: 'H', grupo: 'dibujo' },
  { id: 'pared', nombre: 'Pared', en: 'Wall', tecla: 'W', grupo: 'arq' },
  { id: 'habitacion', nombre: 'Habitación rectangular', en: 'Rectangular room', tecla: 'B', grupo: 'arq' },
  { id: 'suelo', nombre: 'Suelo de una habitación', en: 'Room floor', tecla: 'F', grupo: 'arq' },
  { id: 'mover', nombre: 'Mover', en: 'Move', tecla: 'M', grupo: 'edicion' },
  { id: 'copiar', nombre: 'Copiar', en: 'Copy', tecla: 'O', grupo: 'edicion' },
  { id: 'girar', nombre: 'Girar', en: 'Rotate', tecla: 'G', grupo: 'edicion' },
  { id: 'simetria', nombre: 'Simetría', en: 'Mirror', tecla: 'S', grupo: 'edicion' },
  { id: 'escalar', nombre: 'Escalar', en: 'Scale', tecla: 'E', grupo: 'edicion' },
  { id: 'recortar', nombre: 'Recortar', en: 'Trim', tecla: 'X', grupo: 'edicion' },
  { id: 'borrar', nombre: 'Borrar', en: 'Erase', tecla: 'Supr', grupo: 'edicion' },
  { id: 'cota-lin', nombre: 'Cota lineal (horizontal o vertical)', en: 'Linear dimension', tecla: 'D', grupo: 'cotas' },
  { id: 'cota-ali', nombre: 'Cota alineada', en: 'Aligned dimension', tecla: 'J', grupo: 'cotas' },
  { id: 'cota-ang', nombre: 'Cota angular', en: 'Angular dimension', tecla: 'K', grupo: 'cotas' },
  { id: 'cota-rad', nombre: 'Cota de radio (R)', en: 'Radius dimension', tecla: 'U', grupo: 'cotas' },
  { id: 'cota-dia', nombre: 'Cota de diámetro (Ø)', en: 'Diameter dimension', tecla: 'Y', grupo: 'cotas' },
  { id: 'cota-serie', nombre: 'Cotas en serie (encadenadas)', en: 'Chain dimensions', tecla: 'Z', grupo: 'cotas' },
  { id: 'cota-base', nombre: 'Cotas en paralelo (desde una línea de referencia)', en: 'Baseline dimensions', tecla: 'V', grupo: 'cotas' },
  { id: 'cota-rapida', nombre: 'Acotación rápida (clic en una línea, círculo o arco)', en: 'Quick dimension', tecla: 'Q', grupo: 'cotas' },
  { id: 'medir', nombre: 'Medir distancia y área', en: 'Measure', tecla: 'I', grupo: 'otras' },
  { id: 'mano', nombre: 'Desplazar la vista', en: 'Pan', tecla: '', grupo: 'otras' },
];
T.herramienta = id => T.HERRAMIENTAS.find(h => h.id === id);
const NOMBRE_ENT = {
  linea: ['Línea', 'Line'], polilinea: ['Polilínea', 'Polyline'], circulo: ['Círculo', 'Circle'], arco: ['Arco', 'Arc'],
  texto: ['Texto', 'Text'], rayado: ['Rayado', 'Hatch'], pared: ['Pared', 'Wall'], hueco: ['Hueco', 'Opening'],
  bloque: ['Bloque', 'Block'], cota: ['Cota', 'Dimension'], suelo: ['Suelo', 'Floor'],
};
T.NOMBRE_ENT = NOMBRE_ENT;
const SNAP_TXT = { fin: 'Extremo · Endpoint', medio: 'Punto medio · Midpoint', centro: 'Centro · Center', cuadrante: 'Cuadrante · Quadrant',
  inter: 'Intersección · Intersection', insercion: 'Inserción · Insert', rejilla: '' };

/* ------------------------------------------------------- transformaciones */
/* afín del modelo: m' = A·m + b, con A = [a, b, c, d] → [[a, b], [c, d]] */
const ap = (A, p, b) => [A[0] * p[0] + A[1] * p[1] + (b ? b[0] : 0), A[2] * p[0] + A[3] * p[1] + (b ? b[1] : 0)];
T.afinMover = d => ({ A: [1, 0, 0, 1], b: d });
T.afinGirar = (c, ang) => { const s = Math.sin(ang), co = Math.cos(ang); const A = [co, -s, s, co]; return { A, b: V.sub(c, ap(A, c)) }; };
T.afinEscalar = (c, f) => { const A = [f, 0, 0, f]; return { A, b: V.sub(c, ap(A, c)) }; };
T.afinSimetria = (p1, p2) => { const f = V.ang(V.sub(p2, p1)) * 2, A = [Math.cos(f), Math.sin(f), Math.sin(f), -Math.cos(f)]; return { A, b: V.sub(p1, ap(A, p1)) }; };
function transformarEnt(e, F, conPared) {
  const A = F.A, f = p => ap(A, p, F.b), det = A[0] * A[3] - A[1] * A[2], s = Math.sqrt(Math.abs(det));
  const angDe = a => T.deg(V.ang(ap(A, [Math.cos(a * RAD), Math.sin(a * RAD)])));
  const rot = T.deg(Math.atan2(A[2], A[0]));
  switch (e.tipo) {
    case 'linea': e.a = f(e.a); e.b = f(e.b); break;
    case 'polilinea': case 'suelo': e.pts = e.pts.map(f); break;
    case 'circulo': e.c = f(e.c); e.r *= s; break;
    case 'arco': { e.c = f(e.c); e.r *= s; const a0 = angDe(e.a0), a1 = angDe(e.a1); if (det < 0) { e.a0 = a1; e.a1 = a0; } else { e.a0 = a0; e.a1 = a1; } break; }
    case 'texto': {
      e.p = f(e.p); e.h = (e.h || 3.5) * (Math.abs(s - 1) > 1e-9 ? s : 1);
      let a = angDe(e.ang || 0); a = ((a + 180) % 360 + 360) % 360 - 180; if (det < 0 && (a > 90 || a < -90)) a = T.norm360(a + 180);
      e.ang = Math.round(a * 1e6) / 1e6; break;
    }
    case 'rayado': e.anillos = (e.anillos || []).map(r => r.map(f)); e.ang = angDe(e.ang != null ? e.ang : 45); break;
    case 'pared': e.a = f(e.a); e.b = f(e.b); if (Math.abs(s - 1) > 1e-9) e.grosor = (e.grosor || 150) * s; break;
    case 'hueco': if (conPared) { if (Math.abs(s - 1) > 1e-9) { e.pos *= s; e.ancho *= s; } if (det < 0) e.abre = -(e.abre || 1); } break;
    case 'bloque': {
      e.p = f(e.p);
      if (Math.abs(s - 1) > 1e-9 && e.med) for (const k in e.med) e.med[k] *= s;
      if (det >= 0) e.giro = T.norm360((e.giro || 0) + rot);
      else { const fi = T.deg(Math.atan2(A[2], A[0])) / 2; e.giro = T.norm360(2 * fi - (e.giro || 0) + 180); e.espejo = !e.espejo; }
      e.giro = Math.round(e.giro * 1e6) / 1e6;
      break;
    }
    case 'cota': {
      for (const k of ['p1', 'p2', 'pos', 'c']) if (e[k]) e[k] = f(e[k]);
      if (e.l1) e.l1 = e.l1.map(f); if (e.l2) e.l2 = e.l2.map(f);
      if (e.r) e.r *= s;
      if (e.clase === 'lineal') {
        const r = T.norm360(rot);
        if (Math.abs(r - 90) < 1e-6 || Math.abs(r - 270) < 1e-6) e.dir = e.dir === 'v' ? 'h' : 'v';
        else if (!(r < 1e-6 || Math.abs(r - 180) < 1e-6 || r > 360 - 1e-6) && det > 0) e.clase = 'alineada';
      }
      break;
    }
  }
}
T.transformarEnt = transformarEnt;
const clonar = o => JSON.parse(JSON.stringify(o));

/* ======================================================================= */
T.Editor2D = function (host, opc) {
  opc = opc || {};
  const ed = {
    doc: T.nuevoDoc(), cat: opc.cat || null, geo: null, lista: null,
    sel: new Set(), herrId: 'sel', herr: null,
    vista: { z: 3, x: -10, y: -10 },
    imanes: { rejilla: true, objetos: true, orto: false },
    hist: new T.Historial(100),
    estiloNuevo: 'capa',
    opcTexto: { h: 3.5 }, opcRayado: { ang: 45, sep: 2.5 },
    opcPared: { grosor: 150, altura: 2500 }, opcHabitacion: { ancho: 3200, largo: 2800 },
    problemas: [], medicion: null, ultimaCota: null,
  };
  const dpr = () => Math.min(W.devicePixelRatio || 1, 2);
  host.classList.add('ed2d');
  const cvB = document.createElement('canvas'), cvO = document.createElement('canvas');
  cvB.className = 'ed2d-base'; cvO.className = 'ed2d-capa'; cvO.tabIndex = 0;
  host.appendChild(cvB); host.appendChild(cvO);
  const cxB = cvB.getContext('2d'), cxO = cvO.getContext('2d');
  const caja = document.createElement('input'); caja.className = 'ed2d-texto'; caja.hidden = true; host.appendChild(caja);
  let Wpx = 100, Hpx = 100;
  const msg = t => { ed.mensaje = t; opc.alMensaje && opc.alMensaje(t); };
  const aviso = t => opc.alAviso ? opc.alAviso(t) : msg(t);

  /* ---------------------------------------------- coordenadas */
  const k = () => T.k(ed.doc);
  const M = p => { const o = ed.doc.hoja.origen, kk = k(); return [o[0] + p[0] * kk, o[1] - p[1] * kk]; };
  const Mi = P => { const o = ed.doc.hoja.origen, kk = k(); return [(P[0] - o[0]) / kk, (o[1] - P[1]) / kk]; };
  const aPant = P => [(P[0] - ed.vista.x) * ed.vista.z, (P[1] - ed.vista.y) * ed.vista.z];
  const dePant = s => [s[0] / ed.vista.z + ed.vista.x, s[1] / ed.vista.z + ed.vista.y];
  const mPant = p => aPant(M(p));
  const pantM = s => Mi(dePant(s));
  ed.M = M; ed.Mi = Mi; ed.mPant = mPant; ed.pantM = pantM;
  const fUni = () => T.UNI[ed.doc.unidad];
  const fmtL = mm => T.fmt(mm / fUni(), ed.doc.unidad === 'm' ? 3 : 2) + ' ' + ed.doc.unidad;

  /* ---------------------------------------------- reconstruir y pintar */
  let pedidoB = false, pedidoO = false, raf = 0;
  const pedir = base => { if (base) pedidoB = true; pedidoO = true; if (!raf) raf = requestAnimationFrame(pintar); };
  ed.pedir = pedir;
  function reconstruir() {
    ed.geo = T.Geo(ed.doc, ed.cat);
    ed.lista = T.construir(ed.doc, ed.geo, opc);
    // cajas por entidad (papel) para seleccionar deprisa
    ed.cajas = new Map();
    for (const [id, P] of ed.lista.porEnt) {
      const pts = [];
      for (const p of P) { if (p.k === 'L') pts.push(...p.p); else if (p.k === 'F') for (const r of p.r) pts.push(...r); else if (p.k === 'T') { pts.push([p.x, p.y], [p.x + T.anchoTexto(p.s, p.h) * Math.cos(p.a || 0), p.y - p.h - T.anchoTexto(p.s, p.h) * Math.sin(p.a || 0)]); } }
      if (P.caja) pts.push(...P.caja);
      if (pts.length) ed.cajas.set(id, T.caja(pts));
    }
    curvasCache = null;
    pedir(true);
  }
  ed.reconstruir = reconstruir;
  function pintar() {
    raf = 0;
    if (pedidoB) { pedidoB = false; pintarBase(); }
    if (pedidoO) { pedidoO = false; pintarCapa(); }
  }
  function ponerVista(cx) { const d = dpr(), z = ed.vista.z; cx.setTransform(d * z, 0, 0, d * z, -ed.vista.x * z * d, -ed.vista.y * z * d); }
  function pintarBase() {
    const cx = cxB, d = dpr();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cvB.width, cvB.height);
    if (!ed.lista) return;
    ponerVista(cx);
    const z = ed.vista.z, mm1px = 1 / z;
    let marco = null;
    if (opc.hoja) {
      const [Wd, Hd] = T.tamHoja(ed.doc), m = ed.doc.hoja.margen;
      cx.save(); cx.shadowColor = 'rgba(20,32,26,.28)'; cx.shadowBlur = 18 * d; cx.shadowOffsetY = 4 * d;
      cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, Wd, Hd); cx.restore();
      marco = [m, m, Wd - m, Hd - m];
    }
    if (ed.doc.rejilla.ver) pintarRejilla(cx, marco);
    if (opc.hoja) T.pintar(cx, T.hojaPrims(ed.doc), { mm1px });
    T.pintar(cx, ed.lista.prims, { mm1px });
    // origen de coordenadas
    const o = M([0, 0]), L = 9 * mm1px;
    cx.lineWidth = 1.2 * mm1px; cx.strokeStyle = '#d7262c'; cx.beginPath(); cx.moveTo(o[0], o[1]); cx.lineTo(o[0] + L * 2, o[1]); cx.stroke();
    cx.strokeStyle = '#1f8a4c'; cx.beginPath(); cx.moveTo(o[0], o[1]); cx.lineTo(o[0], o[1] - L * 2); cx.stroke();
  }
  function pintarRejilla(cx, marco) {
    const kk = k(), z = ed.vista.z;
    let paso = ed.doc.rejilla.paso * kk; // mm de papel
    if (!(paso > 0)) return;
    let mult = 1;
    while (paso * mult * z < 9) mult *= (String(mult).startsWith('2') ? 2.5 : 2);
    const p = paso * mult;
    const vis = [ed.vista.x, ed.vista.y, ed.vista.x + Wpx / z, ed.vista.y + Hpx / z];
    const r = marco ? [Math.max(vis[0], marco[0]), Math.max(vis[1], marco[1]), Math.min(vis[2], marco[2]), Math.min(vis[3], marco[3])] : vis;
    if (r[2] <= r[0] || r[3] <= r[1]) return;
    const o = ed.doc.hoja.origen;
    cx.save(); cx.beginPath(); cx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); cx.clip();
    for (const mayor of [false, true]) {
      const q = mayor ? p * 5 : p;
      cx.beginPath();
      for (let x = o[0] + Math.ceil((r[0] - o[0]) / q) * q; x <= r[2]; x += q) { cx.moveTo(x, r[1]); cx.lineTo(x, r[3]); }
      for (let y = o[1] + Math.ceil((r[1] - o[1]) / q) * q; y <= r[3]; y += q) { cx.moveTo(r[0], y); cx.lineTo(r[2], y); }
      cx.lineWidth = 1 / z; cx.strokeStyle = mayor ? 'rgba(31,91,208,.17)' : 'rgba(31,91,208,.07)'; cx.stroke();
    }
    cx.restore();
  }

  /* ---------------------------------------------- capa de encima (selección, imán, vista previa) */
  const ACENTO = '#ff6a1f';
  let cursor = null, snap = null, hover = null, rectSel = null, arrastre = null;
  const O = { // ayudas de dibujo en coordenadas del modelo
    cx: cxO,
    linea(a, b, col, dash) { const A = mPant(a), B = mPant(b); cxO.beginPath(); cxO.moveTo(A[0], A[1]); cxO.lineTo(B[0], B[1]); cxO.strokeStyle = col || ACENTO; cxO.lineWidth = 1.4; cxO.setLineDash(dash || []); cxO.stroke(); cxO.setLineDash([]); },
    poli(pts, cerr, col, dash) { if (pts.length < 2) return; cxO.beginPath(); pts.map(mPant).forEach((q, i) => i ? cxO.lineTo(q[0], q[1]) : cxO.moveTo(q[0], q[1])); if (cerr) cxO.closePath(); cxO.strokeStyle = col || ACENTO; cxO.lineWidth = 1.4; cxO.setLineDash(dash || []); cxO.stroke(); cxO.setLineDash([]); },
    circ(c, r, col, dash) { const q = mPant(c); cxO.beginPath(); cxO.arc(q[0], q[1], Math.max(0.5, r * k() * ed.vista.z), 0, 2 * Math.PI); cxO.strokeStyle = col || ACENTO; cxO.lineWidth = 1.4; cxO.setLineDash(dash || []); cxO.stroke(); cxO.setLineDash([]); },
    arco(c, r, a0, a1, col) { const q = mPant(c); cxO.beginPath(); cxO.arc(q[0], q[1], Math.max(0.5, r * k() * ed.vista.z), -a0 * RAD, -a1 * RAD, true); cxO.strokeStyle = col || ACENTO; cxO.lineWidth = 1.4; cxO.stroke(); },
    prims(P, col, extra, alfa) { cxO.save(); ponerVista(cxO); T.pintar(cxO, P, { mm1px: 1 / ed.vista.z, color: col, extra: extra || 0, alfa }); cxO.restore(); },
    etiqueta(p, txt, col, dx, dy) {
      const q = mPant(p); cxO.font = '600 12px "Martian Mono", ui-monospace, monospace';
      const w = cxO.measureText(txt).width + 10, x = q[0] + (dx == null ? 14 : dx), y = q[1] + (dy == null ? 16 : dy);
      cxO.fillStyle = col || 'rgba(20,32,26,.88)'; cxO.fillRect(x, y - 13, w, 19); cxO.fillStyle = '#fff'; cxO.fillText(txt, x + 5, y + 1);
    },
  };
  ed.O = O;
  function pintarCapa() {
    const d = dpr();
    cxO.setTransform(1, 0, 0, 1, 0, 0); cxO.clearRect(0, 0, cvO.width, cvO.height);
    cxO.setTransform(d, 0, 0, d, 0, 0);
    if (!ed.lista) return;
    // resaltado
    if (hover && !ed.sel.has(hover) && ed.lista.porEnt.has(hover)) O.prims(ed.lista.porEnt.get(hover), '#ffb38a', 1.5);
    for (const id of ed.sel) if (ed.lista.porEnt.has(id)) O.prims(ed.lista.porEnt.get(id), ACENTO, 1.5);
    // problemas de «Revisar cotas»
    for (const pr of ed.problemas) {
      const b = ed.cajas.get(pr.id); if (!b) continue;
      const A = aPant([b[0], b[1]]), B = aPant([b[2], b[3]]);
      cxO.strokeStyle = '#d7262c'; cxO.lineWidth = 2; cxO.setLineDash([5, 3]);
      cxO.strokeRect(Math.min(A[0], B[0]) - 5, Math.min(A[1], B[1]) - 5, Math.abs(B[0] - A[0]) + 10, Math.abs(B[1] - A[1]) + 10); cxO.setLineDash([]);
    }
    // medidas del objeto seleccionado
    if (ed.sel.size === 1 && ed.herrId === 'sel') medidasSeleccion([...ed.sel][0]);
    // agarres
    if (ed.herrId === 'sel' && ed.sel.size && ed.sel.size <= 30) for (const g of agarres()) {
      const q = mPant(g.p); cxO.fillStyle = g.k === arrastre?.agarre?.k && g.id === arrastre?.agarre?.id ? ACENTO : '#fff';
      cxO.strokeStyle = '#1f5bd0'; cxO.lineWidth = 1.5; cxO.fillRect(q[0] - 4.5, q[1] - 4.5, 9, 9); cxO.strokeRect(q[0] - 4.5, q[1] - 4.5, 9, 9);
    }
    // herramienta
    if (ed.herr && ed.herr.dibujar && cursor) ed.herr.dibujar(O, snap ? snap.p : pantM(cursor));
    // medición
    if (ed.medicion && ed.medicion.pts && ed.medicion.pts.length > 1) O.poli(ed.medicion.pts, ed.medicion.cerr, '#1f8a4c', [6, 4]);
    // rectángulo de selección
    if (rectSel) {
      const [a, b] = rectSel, cruce = b[0] < a[0];
      cxO.fillStyle = cruce ? 'rgba(31,138,76,.08)' : 'rgba(31,91,208,.08)'; cxO.strokeStyle = cruce ? '#1f8a4c' : '#1f5bd0';
      cxO.setLineDash(cruce ? [6, 4] : []); cxO.lineWidth = 1.2;
      cxO.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      cxO.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); cxO.setLineDash([]);
    }
    // marca del imán
    if (snap && cursor && snap.t && snap.t !== 'rejilla') {
      const q = mPant(snap.p), s = 6;
      cxO.strokeStyle = '#1f8a4c'; cxO.lineWidth = 2; cxO.beginPath();
      if (snap.t === 'fin') cxO.rect(q[0] - s, q[1] - s, 2 * s, 2 * s);
      else if (snap.t === 'medio') { cxO.moveTo(q[0], q[1] - s - 1); cxO.lineTo(q[0] + s + 1, q[1] + s); cxO.lineTo(q[0] - s - 1, q[1] + s); cxO.closePath(); }
      else if (snap.t === 'centro') cxO.arc(q[0], q[1], s, 0, 2 * Math.PI);
      else if (snap.t === 'cuadrante') { cxO.moveTo(q[0], q[1] - s); cxO.lineTo(q[0] + s, q[1]); cxO.lineTo(q[0], q[1] + s); cxO.lineTo(q[0] - s, q[1]); cxO.closePath(); }
      else { cxO.moveTo(q[0] - s, q[1] - s); cxO.lineTo(q[0] + s, q[1] + s); cxO.moveTo(q[0] + s, q[1] - s); cxO.lineTo(q[0] - s, q[1] + s); }
      cxO.stroke();
      if (SNAP_TXT[snap.t]) O.etiqueta(snap.p, SNAP_TXT[snap.t], 'rgba(31,138,76,.92)', 12, -12);
    }
    // cruz del cursor
    if (cursor && ed.herrId !== 'sel' && ed.herrId !== 'mano') {
      const q = snap ? mPant(snap.p) : cursor;
      cxO.strokeStyle = 'rgba(20,32,26,.55)'; cxO.lineWidth = 1; cxO.beginPath();
      cxO.moveTo(q[0] - 14, q[1]); cxO.lineTo(q[0] + 14, q[1]); cxO.moveTo(q[0], q[1] - 14); cxO.lineTo(q[0], q[1] + 14); cxO.stroke();
    }
  }
  /* medidas visibles al seleccionar una pared, un hueco o un mueble */
  function medidasSeleccion(id) {
    const e = ed.geo.ents.get(id); if (!e) return;
    if (e.tipo === 'pared') {
      const g = ed.geo.paredes.get(id); if (!g) return;
      const lL = V.dist(g.aL, g.bL), lR = V.dist(g.aR, g.bR);
      O.etiqueta(V.mid(g.aL, g.bL), fmtL(lL), 'rgba(31,91,208,.9)', -20, -6);
      O.etiqueta(V.mid(g.aR, g.bR), fmtL(lR), 'rgba(31,91,208,.9)', -20, 16);
      O.etiqueta(e.b, 'grosor ' + fmtL(g.t), 'rgba(20,32,26,.8)');
    } else if (e.tipo === 'hueco') {
      const g = ed.geo.paredes.get(e.pared), h = ed.geo.hueco(e); if (!g || !h) return;
      const lado = ladoInterior(g), dd = T.distEsquinas(g, h, lado);
      const base = lado > 0 ? 'L' : 'R';
      const c0 = V.add(g.A, V.add(V.mul(g.d, dd.s0), V.mul(g.nl, lado * g.t / 2))), c1 = V.add(g.A, V.add(V.mul(g.d, dd.s1), V.mul(g.nl, lado * g.t / 2)));
      O.linea(c0, h['0' + base], '#1f5bd0', [4, 3]); O.linea(h['1' + base], c1, '#1f5bd0', [4, 3]);
      O.etiqueta(V.mid(c0, h['0' + base]), fmtL(dd.ini), 'rgba(31,91,208,.9)', -16, 8);
      O.etiqueta(V.mid(h['1' + base], c1), fmtL(dd.fin), 'rgba(31,91,208,.9)', -16, 8);
      O.etiqueta(V.mid(h.ini, h.fin), 'ancho ' + fmtL(h.w), 'rgba(20,32,26,.85)', -30, -22);
    } else if (e.tipo === 'bloque') {
      const b = ed.geo.bloque(e), q = b.esquinas;
      O.etiqueta(V.mid(q[0], q[1]), fmtL(b.ancho), 'rgba(31,91,208,.9)', -18, 4);
      O.etiqueta(V.mid(q[1], q[2]), fmtL(b.fondo), 'rgba(31,91,208,.9)', 6, 4);
    } else if (e.tipo === 'linea') {
      O.etiqueta(V.mid(e.a, e.b), fmtL(V.dist(e.a, e.b)), 'rgba(31,91,208,.9)', 8, -8);
    }
  }
  /* la cara interior de una pared: la que mira al centro de todas las paredes */
  function ladoInterior(g) {
    let s = [0, 0], n = 0;
    for (const w of ed.geo.paredes.values()) { s = V.add(s, V.mid(w.A, w.B)); n++; }
    const c = V.mul(s, 1 / Math.max(1, n));
    return V.dot(V.sub(c, V.mid(g.A, g.B)), g.nl) >= 0 ? 1 : -1;
  }
  ed.ladoInterior = ladoInterior;

  /* ---------------------------------------------- vista */
  function redimensionar() {
    const r = host.getBoundingClientRect(), d = dpr();
    Wpx = Math.max(10, r.width); Hpx = Math.max(10, r.height);
    for (const c of [cvB, cvO]) { c.width = Math.round(Wpx * d); c.height = Math.round(Hpx * d); c.style.width = Wpx + 'px'; c.style.height = Hpx + 'px'; }
    pedir(true);
  }
  if (W.ResizeObserver) new ResizeObserver(redimensionar).observe(host); else W.addEventListener('resize', redimensionar);
  ed.redimensionar = redimensionar;
  ed.ajustar = () => {
    let bb;
    if (opc.hoja) { const [a, b] = T.tamHoja(ed.doc); bb = [0, 0, a, b]; }
    else {
      const pts = [];
      for (const b of (ed.cajas || new Map()).values()) pts.push([b[0], b[1]], [b[2], b[3]]);
      if (!pts.length) { pts.push(M([-500, -500]), M([6000, 4500])); }
      bb = T.caja(pts); const m = Math.max(bb[2] - bb[0], bb[3] - bb[1]) * 0.08 + 4; bb = [bb[0] - m, bb[1] - m, bb[2] + m, bb[3] + m];
    }
    const z = Math.min(Wpx / (bb[2] - bb[0]), Hpx / (bb[3] - bb[1])) * 0.94;
    ed.vista.z = z; ed.vista.x = bb[0] - (Wpx / z - (bb[2] - bb[0])) / 2; ed.vista.y = bb[1] - (Hpx / z - (bb[3] - bb[1])) / 2;
    pedir(true); opc.alVista && opc.alVista();
  };
  ed.zoom = (f, s) => {
    s = s || [Wpx / 2, Hpx / 2];
    const P = dePant(s), z = Math.max(0.05, Math.min(400, ed.vista.z * f));
    ed.vista.z = z; ed.vista.x = P[0] - s[0] / z; ed.vista.y = P[1] - s[1] / z;
    pedir(true); opc.alVista && opc.alVista();
  };
  const desplazar = (dx, dy) => { ed.vista.x -= dx / ed.vista.z; ed.vista.y -= dy / ed.vista.z; pedir(true); };

  /* ---------------------------------------------- documento */
  ed.cargar = (doc, conservarVista) => {
    ed.doc = T.normalizar(doc);
    ed.sel.clear(); ed.problemas = []; ed.medicion = null;
    actualizarCotas(true);
    reconstruir();
    ed.hist.reiniciar(JSON.stringify(ed.doc));
    if (!conservarVista) ed.ajustar();
    ponerHerramienta('sel');
    opc.alSeleccion && opc.alSeleccion();
  };
  ed.nuevoId = () => 'e' + (ed.doc.sigId++);
  function estiloNuevo(e) {
    const st = T.ESTILOS.find(s => s.id === ed.estiloNuevo);
    if (st && st.trazo && !['pared', 'hueco', 'cota', 'bloque', 'suelo', 'texto', 'rayado'].includes(e.tipo)) { e.trazo = st.trazo; e.pluma = st.grosor; }
  }
  ed.añadir = e => {
    e.id = ed.nuevoId();
    if (!e.capa) {
      const def = T.capaPorDefecto(e);
      e.capa = def !== '0' ? def : (ed.doc.capaActual || '0');
    }
    estiloNuevo(e);
    ed.doc.entidades.push(e);
    return e;
  };
  /* aplicar un cambio: deshacer, cotas asociativas, guardar */
  ed.cambiar = (fn, motivo) => {
    const r = fn && fn();
    trasCambio(motivo || 'cambio');
    return r;
  };
  function trasCambio(motivo, sinHistorial) {
    ed.geo = T.Geo(ed.doc, ed.cat);
    actualizarCotas();
    reconstruir();
    for (const id of [...ed.sel]) if (!ed.geo.ents.has(id)) ed.sel.delete(id);
    if (!sinHistorial) ed.hist.guardar(JSON.stringify(ed.doc));
    opc.alCambiar && opc.alCambiar(motivo);
    opc.alSeleccion && opc.alSeleccion();
  }
  ed.trasCambio = trasCambio;
  ed.vivo = () => { ed.geo = T.Geo(ed.doc, ed.cat); actualizarCotas(); reconstruir(); opc.alVivo && opc.alVivo(); };
  ed.deshacer = () => { const s = ed.hist.deshacer(); if (s) { ed.doc = JSON.parse(s); ed.problemas = []; trasCambio('deshacer', true); aviso('Deshecho · Undo'); } };
  ed.rehacer = () => { const s = ed.hist.rehacer(); if (s) { ed.doc = JSON.parse(s); ed.problemas = []; trasCambio('rehacer', true); aviso('Rehecho · Redo'); } };
  /* cotas asociativas: cada punto puede ir unido a un punto notable de otra entidad */
  function actualizarCotas(soloGeo) {
    if (!ed.geo || soloGeo) ed.geo = T.Geo(ed.doc, ed.cat);
    const G = ed.geo;
    for (const c of ed.doc.entidades) {
      if (c.tipo !== 'cota') continue;
      for (const [r, kp] of [['r1', 'p1'], ['r2', 'p2']]) {
        if (!c[r]) continue;
        const p = G.punto(c[r]); if (p) c[kp] = p; else delete c[r];
      }
      if (c.rc) {
        const e = G.ents.get(c.rc.id);
        if (e && (e.tipo === 'circulo' || e.tipo === 'arco')) {
          const d = V.sub(c.pos, c.c); c.c = e.c.slice(); c.r = e.r; c.pos = V.add(c.c, d);
        } else delete c.rc;
      }
      for (const L of ['l1', 'l2']) {
        const rr = c['r' + L];
        if (!rr) continue;
        const a = G.punto(rr[0]), b = G.punto(rr[1]);
        if (a && b) c[L] = [a, b]; else delete c['r' + L];
      }
    }
  }
  ed.actualizarCotas = actualizarCotas;
  ed.borrar = ids => {
    const quitar = new Set(ids);
    for (const e of ed.doc.entidades) if (e.tipo === 'hueco' && quitar.has(e.pared)) quitar.add(e.id);
    ed.doc.entidades = ed.doc.entidades.filter(e => !quitar.has(e.id));
    for (const id of quitar) ed.sel.delete(id);
  };
  const capaBloqueada = e => { const c = ed.doc.capas.find(x => x.id === (e.capa || '0')); return c && (c.bloqueada || c.visible === false); };

  /* ---------------------------------------------- tocar entidades (en papel) */
  function tocar(s, filtro) {
    if (!ed.lista) return null;
    const P = dePant(s), tol = 7 / ed.vista.z;
    let mejor = null, md = Infinity;
    const ents = ed.doc.entidades;
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if (filtro && !filtro(e)) continue;
      if (capaBloqueada(e)) continue;
      const b = ed.cajas.get(e.id); if (!b) continue;
      if (P[0] < b[0] - tol || P[0] > b[2] + tol || P[1] < b[1] - tol || P[1] > b[3] + tol) continue;
      const prs = ed.lista.porEnt.get(e.id) || [];
      let d = Infinity;
      for (const p of prs) {
        if (p.k === 'L') { for (let j = 0; j + 1 < p.p.length + (p.z ? 1 : 0); j++) d = Math.min(d, T.distSeg(P, p.p[j], p.p[(j + 1) % p.p.length]).d - p.w / 2); }
        else if (p.k === 'T') { const tw = T.anchoTexto(p.s, p.h), a = p.a || 0, t = [Math.cos(a), -Math.sin(a)], up = [t[1], -t[0]]; const q = [[p.x, p.y], V.add([p.x, p.y], V.mul(t, tw))]; const box = [q[0], q[1], V.add(q[1], V.mul(up, p.h)), V.add(q[0], V.mul(up, p.h))]; if (T.dentroPoli(P, box)) d = Math.min(d, tol * 0.3); }
        else if (p.k === 'F' && (e.tipo === 'pared' || e.tipo === 'suelo')) { if (T.dentroAnillos(P, p.r)) d = Math.min(d, tol * (e.tipo === 'suelo' ? 0.95 : 0.6)); }
      }
      if (e.tipo === 'pared') { const g = ed.geo.paredes.get(e.id); if (g) for (const pz of g.piezas) if (T.dentroPoli(P, pz.pts.map(M))) d = Math.min(d, tol * 0.6); }
      if (prs.caja && T.dentroPoli(P, prs.caja)) d = Math.min(d, tol * (e.tipo === 'bloque' ? 0.7 : 0.3));
      if (d < tol && d < md) { md = d; mejor = e.id; }
    }
    return mejor;
  }
  ed.tocar = tocar;

  /* ---------------------------------------------- imán */
  let curvasCache = null;
  function curvasCerca(m, r) {
    if (!curvasCache) {
      curvasCache = [];
      for (const e of ed.doc.entidades) {
        if (e.tipo === 'cota' || e.tipo === 'texto' || e.tipo === 'rayado' || e.tipo === 'hueco') continue;
        const c = ed.doc.capas.find(x => x.id === (e.capa || '0')); if (c && c.visible === false) continue;
        for (const cv of ed.geo.curvas(e)) {
          const bb = cv.s ? T.caja(cv.s) : [cv.c[0] - cv.r, cv.c[1] - cv.r, cv.c[0] + cv.r, cv.c[1] + cv.r];
          curvasCache.push({ id: e.id, cv, bb });
        }
      }
    }
    return curvasCache.filter(x => m[0] > x.bb[0] - r && m[0] < x.bb[2] + r && m[1] > x.bb[1] - r && m[1] < x.bb[3] + r && T.distCurva(m, x.cv) < r);
  }
  function imantar(s, base, excluir) {
    const m = pantM(s), r = 11 / ed.vista.z / k();
    let mejor = null;
    if (ed.imanes.objetos) {
      for (const e of ed.doc.entidades) {
        if (excluir && excluir.has(e.id)) continue;
        if (e.tipo === 'cota' || e.tipo === 'rayado') continue;
        const c = ed.doc.capas.find(x => x.id === (e.capa || '0')); if (c && c.visible === false) continue;
        const b = ed.cajas.get(e.id);
        if (b) { const P = M(m), tp = r * k(); if (P[0] < b[0] - tp || P[0] > b[2] + tp || P[1] < b[1] - tp || P[1] > b[3] + tp) continue; }
        for (const q of ed.geo.puntos(e)) {
          const d = V.dist(q.p, m), pen = (q.t === 'medio' || q.t === 'cuadrante') ? 0.25 : q.t === 'insercion' ? 0.3 : 0;
          if (d < r && (!mejor || d + pen * r < mejor.score)) mejor = { p: q.p, t: q.t, ref: { id: e.id, k: q.k }, score: d + pen * r };
        }
      }
      const cs = curvasCerca(m, r).filter(x => !(excluir && excluir.has(x.id)));
      for (let i = 0; i < cs.length && i < 40; i++) for (let j = i + 1; j < cs.length && j < 40; j++) {
        if (cs[i].id === cs[j].id && cs[i].cv === cs[j].cv) continue;
        for (const p of T.interCurvas(cs[i].cv, cs[j].cv)) {
          const d = V.dist(p, m);
          if (d < r && (!mejor || d + 0.1 * r < mejor.score)) mejor = { p, t: 'inter', ref: null, score: d + 0.1 * r };
        }
      }
    }
    if (mejor) return mejor;
    let p = m;
    const paso = ed.doc.rejilla.paso;
    if (base && ed.imanes.orto) {
      const d = V.sub(m, base);
      if (Math.abs(d[0]) >= Math.abs(d[1])) p = [ed.imanes.rejilla ? base[0] + Math.round(d[0] / paso) * paso : m[0], base[1]];
      else p = [base[0], ed.imanes.rejilla ? base[1] + Math.round(d[1] / paso) * paso : m[1]];
      return { p, t: 'orto' };
    }
    if (ed.imanes.rejilla && paso > 0) return { p: [Math.round(m[0] / paso) * paso, Math.round(m[1] / paso) * paso], t: 'rejilla' };
    return { p: m, t: null };
  }
  ed.imantar = imantar;

  /* ---------------------------------------------- agarres (pinzamientos) */
  function agarres() {
    const out = [];
    for (const id of ed.sel) {
      const e = ed.geo.ents.get(id); if (!e || capaBloqueada(e)) continue;
      const add = (kk, p) => p && out.push({ id, k: kk, p });
      switch (e.tipo) {
        case 'linea': add('a', e.a); add('b', e.b); add('m', V.mid(e.a, e.b)); break;
        case 'polilinea': case 'suelo': e.pts.forEach((p, i) => add('v' + i, p)); break;
        case 'circulo': add('c', e.c); add('q0', V.add(e.c, [e.r, 0])); break;
        case 'arco': add('c', e.c); add('a0', V.polar(e.c, e.r, e.a0 * RAD)); add('a1', V.polar(e.c, e.r, e.a1 * RAD)); break;
        case 'texto': add('p', e.p); break;
        case 'pared': add('a', e.a); add('b', e.b); break;
        case 'hueco': { const h = ed.geo.hueco(e); if (h) add('c', V.mid(h.ini, h.fin)); break; }
        case 'bloque': add('p', e.p); add('o', V.mid(ed.geo.bloque(e).esquinas[0], ed.geo.bloque(e).esquinas[2])); break;
        case 'cota': add('pos', e.clase === 'radio' || e.clase === 'diametro' || e.clase === 'angular' ? e.pos : medioCota(e)); if (e.p1) { add('p1', e.p1); add('p2', e.p2); } break;
        case 'rayado': break;
      }
    }
    return out;
  }
  function medioCota(c) {
    const u = c.clase === 'alineada' ? V.norm(V.sub(c.p2, c.p1)) : (c.dir === 'v' ? [0, 1] : [1, 0]), n = V.perp(u);
    const D1 = V.add(c.p1, V.mul(n, V.dot(V.sub(c.pos, c.p1), n))), D2 = V.add(c.p2, V.mul(n, V.dot(V.sub(c.pos, c.p2), n)));
    return V.mid(D1, D2);
  }
  function moverAgarre(g, p, sn) {
    const e = ed.geo.ents.get(g.id); if (!e) return;
    switch (e.tipo) {
      case 'linea': if (g.k === 'm') { const d = V.sub(p, V.mid(e.a, e.b)); e.a = V.add(e.a, d); e.b = V.add(e.b, d); } else e[g.k] = p; break;
      case 'polilinea': case 'suelo': e.pts[+g.k.slice(1)] = p; break;
      case 'circulo': if (g.k === 'c') e.c = p; else e.r = Math.max(1e-3, V.dist(p, e.c)); break;
      case 'arco': if (g.k === 'c') e.c = p; else e[g.k] = T.norm360(T.deg(V.ang(V.sub(p, e.c)))); break;
      case 'texto': e.p = p; break;
      case 'pared': {
        const viejo = e[g.k];
        // las paredes unidas a ese extremo se estiran con ella
        for (const w of ed.doc.entidades) if (w.tipo === 'pared' && w !== e) { if (V.dist(w.a, viejo) < 1) w.a = p.slice(); if (V.dist(w.b, viejo) < 1) w.b = p.slice(); }
        e[g.k] = p.slice(); break;
      }
      case 'hueco': { const gw = ed.geo.paredes.get(e.pared); if (gw) { let s = V.dot(V.sub(p, gw.A), gw.d) - (e.ancho || 800) / 2; const paso = ed.doc.rejilla.paso; if (ed.imanes.rejilla && paso > 0 && !(sn && sn.ref)) s = Math.round(s / paso * 2) * paso / 2; e.pos = Math.max(0, Math.min(gw.L - (e.ancho || 800), s)); } break; }
      case 'bloque': if (g.k === 'p') e.p = p; else { const b = ed.geo.bloque(e), c = V.mid(b.esquinas[0], b.esquinas[2]); e.p = V.add(e.p, V.sub(p, c)); } break;
      case 'cota':
        if (g.k === 'pos') { if (e.clase === 'lineal' || e.clase === 'alineada') { e.pos = p; } else e.pos = p; }
        else { e[g.k] = p; if (sn && sn.ref && sn.ref.id !== e.id) e[g.k === 'p1' ? 'r1' : 'r2'] = sn.ref; else delete e[g.k === 'p1' ? 'r1' : 'r2']; }
        break;
    }
  }

  /* ---------------------------------------------- herramientas */
  const H = {};
  function ponerHerramienta(id, extra) {
    if (ed.herr && ed.herr.fin) ed.herr.fin();
    if (!H[id]) id = 'sel';
    if (opc.herramientas && !opc.herramientas.includes(id) && id !== 'sel' && id !== 'bloque' && id !== 'hueco' && id !== 'mano') id = 'sel';
    ed.herrId = id; ed.herr = H[id](extra);
    if (id !== 'medir') ed.medicion = null;
    cvO.style.cursor = id === 'sel' ? 'default' : id === 'mano' ? 'grab' : 'crosshair';
    msg(ed.herr.ayuda ? ed.herr.ayuda() : '');
    opc.alHerramienta && opc.alHerramienta(id);
    pedir();
  }
  ed.herramienta = ponerHerramienta;
  const ayudaPunto = 'clic, o escribe x,y · @dx,dy · longitud<ángulo · longitud';
  /* herramienta genérica que pide una serie de puntos */
  function pidePuntos(cfg) {
    const t = { pts: [], fase: 0 };
    t.ayuda = () => cfg.ayuda(t);
    t.base = () => t.pts.length ? t.pts[t.pts.length - 1] : null;
    t.punto = (p, sn) => { t.pts.push(p); if (sn) (t.snaps = t.snaps || []).push(sn); cfg.punto(t, p, sn); msg(t.ayuda()); pedir(); };
    t.clic = t.punto;
    t.enter = () => { if (cfg.enter) cfg.enter(t); else ponerHerramienta('sel'); };
    t.esc = () => { if (cfg.esc) return cfg.esc(t); return false; };
    t.valor = n => cfg.valor ? cfg.valor(t, n) : false;
    t.letra = l => cfg.letra ? cfg.letra(t, l) : false;
    t.dibujar = (Ob, cur) => cfg.dibujar && cfg.dibujar(t, Ob, cur);
    t.fin = () => cfg.fin && cfg.fin(t);
    return t;
  }
  const goma = (Ob, a, b) => {
    Ob.linea(a, b);
    const d = V.dist(a, b);
    if (d > 1e-6) Ob.etiqueta(b, fmtL(d) + '  ' + T.fmt(T.norm360(T.deg(V.ang(V.sub(b, a)))), 1) + '°');
  };

  H.sel = () => ({
    ayuda: () => ed.sel.size ? 'Arrastra los cuadraditos para estirar · Supr borra · M mueve · G gira · Esc quita la selección' : 'Haz clic en un objeto o arrastra un recuadro para seleccionar · Elige una herramienta a la izquierda',
    esc: () => { if (ed.sel.size || ed.problemas.length) { ed.sel.clear(); ed.problemas = []; opc.alSeleccion && opc.alSeleccion(); pedir(); return true; } return false; },
    enter: () => {},
  });
  H.mano = () => ({ ayuda: () => 'Arrastra para mover la vista · Esc para terminar' });

  H.linea = () => pidePuntos({
    ayuda: t => t.pts.length ? 'Línea · siguiente punto (' + ayudaPunto + ') · C cierra · Intro termina' : 'Línea · primer punto (' + ayudaPunto + ')',
    punto: (t, p) => { if (t.pts.length > 1) { const a = t.pts[t.pts.length - 2]; if (V.dist(a, p) > 1e-6) ed.cambiar(() => ed.añadir({ tipo: 'linea', a, b: p }), 'dibujar'); else t.pts.pop(); } },
    letra: (t, l) => { if (l === 'c' && t.pts.length > 2) { const a = t.pts[t.pts.length - 1], b = t.pts[0]; ed.cambiar(() => ed.añadir({ tipo: 'linea', a, b }), 'dibujar'); t.pts = []; msg(t.ayuda()); return true; } return false; },
    esc: t => { if (t.pts.length) { t.pts = []; msg(t.ayuda()); pedir(); return true; } return false; },
    dibujar: (t, Ob, cur) => { if (t.pts.length) goma(Ob, t.pts[t.pts.length - 1], cur); },
  });
  H.polilinea = () => pidePuntos({
    ayuda: t => t.pts.length ? 'Polilínea · siguiente punto · C o clic en el primer punto la cierra · Intro termina' : 'Polilínea · primer punto (' + ayudaPunto + ')',
    punto: (t, p) => {
      const n = t.pts.length;
      if (n > 3 && V.dist(p, t.pts[0]) < 1e-6) { t.pts.pop(); crear(t, true); }
      else if (n > 1 && V.dist(p, t.pts[n - 2]) < 1e-6) t.pts.pop();
    },
    enter: t => { crear(t, false); ponerHerramienta('sel'); },
    letra: (t, l) => { if (l === 'c' && t.pts.length > 2) { crear(t, true); return true; } return false; },
    esc: t => { if (t.pts.length > 1) { crear(t, false); return true; } if (t.pts.length) { t.pts = []; pedir(); return true; } return false; },
    dibujar: (t, Ob, cur) => { if (t.pts.length) { Ob.poli(t.pts, false); goma(Ob, t.pts[t.pts.length - 1], cur); } },
  });
  function crear(t, cerrada) {
    if (t.pts.length >= 2) ed.cambiar(() => ed.añadir({ tipo: 'polilinea', pts: t.pts.slice(), cerrada: !!cerrada && t.pts.length > 2 }), 'dibujar');
    t.pts = []; msg(t.ayuda()); pedir();
  }
  H.rect = () => pidePuntos({
    ayuda: t => t.pts.length ? 'Rectángulo · esquina opuesta (clic o @ancho,alto)' : 'Rectángulo · primera esquina (' + ayudaPunto + ')',
    punto: (t, p) => {
      if (t.pts.length === 2) {
        const [a, b] = t.pts;
        if (Math.abs(a[0] - b[0]) > 1e-6 && Math.abs(a[1] - b[1]) > 1e-6) ed.cambiar(() => ed.añadir({ tipo: 'polilinea', cerrada: true, pts: [a, [b[0], a[1]], b, [a[0], b[1]]] }), 'dibujar');
        t.pts = [];
      }
    },
    esc: t => { if (t.pts.length) { t.pts = []; pedir(); return true; } return false; },
    dibujar: (t, Ob, cur) => { if (t.pts.length) { const a = t.pts[0]; Ob.poli([a, [cur[0], a[1]], cur, [a[0], cur[1]]], true); Ob.etiqueta(cur, fmtL(Math.abs(cur[0] - a[0])) + ' × ' + fmtL(Math.abs(cur[1] - a[1]))); } },
  });
  H.circulo = () => pidePuntos({
    ayuda: t => t.pts.length ? 'Círculo · radio: clic o escribe el radio e Intro' : 'Círculo · centro (' + ayudaPunto + ')',
    punto: (t, p) => { if (t.pts.length === 2) { const r = V.dist(t.pts[0], p); if (r > 1e-6) ed.cambiar(() => ed.añadir({ tipo: 'circulo', c: t.pts[0], r }), 'dibujar'); t.pts = []; } },
    valor: (t, n) => { if (t.pts.length === 1 && n > 0) { ed.cambiar(() => ed.añadir({ tipo: 'circulo', c: t.pts[0], r: n * fUni() }), 'dibujar'); t.pts = []; msg(t.ayuda()); return true; } return false; },
    esc: t => { if (t.pts.length) { t.pts = []; pedir(); return true; } return false; },
    dibujar: (t, Ob, cur) => { if (t.pts.length) { const r = V.dist(t.pts[0], cur); Ob.circ(t.pts[0], r); Ob.linea(t.pts[0], cur, null, [4, 3]); Ob.etiqueta(cur, 'R ' + fmtL(r) + ' · Ø ' + fmtL(2 * r)); } },
  });
  H.arco = () => pidePuntos({
    ayuda: t => ['Arco · centro (' + ayudaPunto + ')', 'Arco · punto inicial (define el radio)', 'Arco · punto final (el arco va en sentido antihorario) o escribe el ángulo'][t.pts.length],
    punto: (t, p) => {
      if (t.pts.length === 3) {
        const [c, a, b] = t.pts, r = V.dist(c, a);
        if (r > 1e-6) ed.cambiar(() => ed.añadir({ tipo: 'arco', c, r, a0: T.norm360(T.deg(V.ang(V.sub(a, c)))), a1: T.norm360(T.deg(V.ang(V.sub(b, c)))) }), 'dibujar');
        t.pts = [];
      }
    },
    valor: (t, n) => { if (t.pts.length === 2) { const [c, a] = t.pts, a0 = T.deg(V.ang(V.sub(a, c))); ed.cambiar(() => ed.añadir({ tipo: 'arco', c, r: V.dist(c, a), a0: T.norm360(a0), a1: T.norm360(a0 + n) }), 'dibujar'); t.pts = []; msg(t.ayuda()); return true; } return false; },
    esc: t => { if (t.pts.length) { t.pts = []; pedir(); return true; } return false; },
    dibujar: (t, Ob, cur) => {
      if (t.pts.length === 1) goma(Ob, t.pts[0], cur);
      if (t.pts.length === 2) { const [c, a] = t.pts, r = V.dist(c, a), a0 = T.deg(V.ang(V.sub(a, c))), a1 = T.deg(V.ang(V.sub(cur, c))); Ob.arco(c, r, a0, a1); Ob.linea(c, cur, null, [4, 3]); Ob.etiqueta(cur, T.fmt(T.norm360(a1 - a0), 1) + '°'); }
    },
  });
  H.texto = () => pidePuntos({
    ayuda: () => 'Texto · haz clic donde empieza el texto (altura ' + T.fmt(ed.opcTexto.h, 1) + ' mm de papel)',
    punto: (t, p) => {
      t.pts = [];
      ed.pedirTexto(p, '', txt => { if (txt) ed.cambiar(() => ed.añadir({ tipo: 'texto', p, txt, h: ed.opcTexto.h, ang: 0 }), 'dibujar'); });
    },
  });
  H.rayado = () => pidePuntos({
    ayuda: () => 'Rayado · haz clic dentro de una zona cerrada (ángulo ' + ed.opcRayado.ang + '°, separación ' + ed.opcRayado.sep + ' mm)',
    punto: (t, p) => {
      t.pts = [];
      const curvas = [];
      for (const e of ed.doc.entidades) {
        if (['cota', 'texto', 'rayado', 'hueco', 'suelo'].includes(e.tipo)) continue;
        const c = ed.doc.capas.find(x => x.id === (e.capa || '0')); if (c && c.visible === false) continue;
        curvas.push(...ed.geo.curvas(e));
      }
      const an = T.regionEnPunto(curvas, p, 0.3 / k());
      if (!an) { aviso('Esa zona no está cerrada: revisa que las líneas se toquen · Area not closed'); return; }
      ed.cambiar(() => ed.añadir({ tipo: 'rayado', anillos: an, ang: ed.opcRayado.ang, sep: ed.opcRayado.sep }), 'dibujar');
    },
  });
  H.pared = () => pidePuntos({
    ayuda: t => (t.pts.length ? 'Pared · siguiente punto · C cierra · Intro termina' : 'Pared · primer punto del eje (' + ayudaPunto + ')') + ' · grosor ' + fmtL(ed.opcPared.grosor),
    punto: (t, p) => {
      const n = t.pts.length;
      if (n > 1) { const a = t.pts[n - 2]; if (V.dist(a, p) > 1e-6) ed.cambiar(() => ed.añadir({ tipo: 'pared', a, b: p, grosor: ed.opcPared.grosor, altura: ed.opcPared.altura }), 'dibujar'); else t.pts.pop(); }
    },
    letra: (t, l) => { if (l === 'c' && t.pts.length > 2) { const a = t.pts[t.pts.length - 1], b = t.pts[0]; ed.cambiar(() => ed.añadir({ tipo: 'pared', a, b, grosor: ed.opcPared.grosor, altura: ed.opcPared.altura }), 'dibujar'); t.pts = []; msg(t.ayuda()); return true; } return false; },
    esc: t => { if (t.pts.length) { t.pts = []; pedir(); return true; } return false; },
    dibujar: (t, Ob, cur) => {
      if (!t.pts.length) return;
      const a = t.pts[t.pts.length - 1];
      if (V.dist(a, cur) > 1e-6) { const n = V.mul(V.perp(V.norm(V.sub(cur, a))), ed.opcPared.grosor / 2); Ob.poli([V.add(a, n), V.add(cur, n), V.sub(cur, n), V.sub(a, n)], true, '#1f5bd0'); }
      goma(Ob, a, cur);
    },
  });
  /* habitación rectangular: se da el tamaño interior y se pincha la esquina interior de abajo a la izquierda */
  H.habitacion = () => pidePuntos({
    ayuda: () => 'Habitación ' + fmtL(ed.opcHabitacion.ancho) + ' × ' + fmtL(ed.opcHabitacion.largo) + ' (interior) · clic en la esquina interior de abajo a la izquierda · el tamaño se cambia en el panel',
    punto: (t, p) => { t.pts = []; habitacion(p); },
    dibujar: (t, Ob, cur) => { const a = ed.opcHabitacion.ancho, l = ed.opcHabitacion.largo; Ob.poli([cur, [cur[0] + a, cur[1]], [cur[0] + a, cur[1] + l], [cur[0], cur[1] + l]], true, '#1f5bd0'); },
  });
  function habitacion(p) {
    const a = ed.opcHabitacion.ancho, l = ed.opcHabitacion.largo, g = ed.opcPared.grosor, h = g / 2;
    const q = [[p[0] - h, p[1] - h], [p[0] + a + h, p[1] - h], [p[0] + a + h, p[1] + l + h], [p[0] - h, p[1] + l + h]];
    ed.cambiar(() => { for (let i = 0; i < 4; i++) ed.añadir({ tipo: 'pared', a: q[i], b: q[(i + 1) % 4], grosor: g, altura: ed.opcPared.altura }); }, 'dibujar');
  }
  ed.habitacion = habitacion;
  /* suelo: clic dentro de una habitación cerrada por paredes */
  H.suelo = () => pidePuntos({
    ayuda: () => 'Suelo · haz clic dentro de una habitación cerrada por paredes',
    punto: (t, p) => {
      t.pts = [];
      const an = T.regionEnPunto(ed.geo.curvasHabitaciones(), p, 20);
      if (!an) { aviso('No encuentro una habitación cerrada ahí · No closed room here'); return; }
      const ext = an.reduce((a, b) => Math.abs(T.areaPoli(b)) > Math.abs(T.areaPoli(a)) ? b : a);
      ed.cambiar(() => ed.añadir({ tipo: 'suelo', pts: ext, nombre: '', color: ed.doc.casa.colorSuelo, textura: ed.doc.casa.texturaSuelo, techo: true }), 'dibujar');
    },
  });
  /* insertar un hueco (puerta, ventana, abertura) sobre una pared */
  H.hueco = def => {
    const f = def.factor || 10, med = T.medidasDef(def);
    let prev = null;
    const buscar = cur => {
      let mejor = null;
      for (const g of ed.geo.paredes.values()) {
        const r = T.distSeg(cur, g.A, g.B);
        if (r.d < g.t / 2 + 14 / ed.vista.z / k() && (!mejor || r.d < mejor.d)) mejor = { g, d: r.d, s: r.t * g.L };
      }
      if (!mejor) return null;
      const w = med.ancho || 800, paso = ed.doc.rejilla.paso;
      let s = mejor.s - w / 2;
      if (ed.imanes.rejilla && paso > 0) s = Math.round(s / (paso / 2)) * (paso / 2);
      s = Math.max(0, Math.min(mejor.g.L - w, s));
      const lado = V.dot(V.sub(cur, mejor.g.A), mejor.g.nl) >= 0 ? 1 : -1;
      return { g: mejor.g, s, w, lado };
    };
    return {
      ayuda: () => def.nombre + ' · pasa por encima de una pared y haz clic (la puerta abre hacia el lado del ratón) · Esc termina',
      clic: (p, sn, s) => {
        const b = buscar(pantM(s));
        if (!b) { aviso('Pon el ' + def.nombre.toLowerCase() + ' encima de una pared'); return; }
        ed.cambiar(() => {
          const e = ed.añadir({ tipo: 'hueco', pared: b.g.id, clase: def.hueco, ref: def.ref, pos: b.s, ancho: b.w, alto: med.alto || 2100, antepecho: med.antepecho || 0, abre: b.lado, bisagra: 'ini', color: def.color });
          ed.sel.clear(); ed.sel.add(e.id);
        }, 'dibujar');
      },
      mover: s => { prev = buscar(pantM(s)); },
      dibujar: Ob => {
        if (!prev) return;
        const g = prev.g, a = V.add(g.A, V.mul(g.d, prev.s)), b = V.add(a, V.mul(g.d, prev.w)), n = V.mul(g.nl, g.t / 2);
        Ob.poli([V.add(a, n), V.add(b, n), V.sub(b, n), V.sub(a, n)], true, '#1f8a4c');
        Ob.linea(V.add(a, V.mul(g.nl, prev.lado * g.t / 2)), V.add(a, V.mul(g.nl, prev.lado * (g.t / 2 + prev.w))), '#1f8a4c', [4, 3]);
        Ob.etiqueta(b, fmtL(prev.w));
      },
    };
  };
  /* insertar un bloque del catálogo (mueble, escalera…) */
  H.bloque = def => {
    const med = T.medidasDef(def), par = {};
    for (const kk in def.parametros || {}) par[kk] = T.expr(def.parametros[kk], {});
    const inst = { tipo: 'bloque', ref: def.ref, p: [0, 0], giro: 0, med, par, color: def.color };
    return {
      ayuda: () => def.nombre + ' · clic para colocarlo (se engancha por la esquina de abajo a la izquierda) · R lo gira 90° · Esc cancela',
      clic: p => {
        ed.cambiar(() => {
          if (!ed.doc.defs[def.ref]) { const copia = Object.assign({}, def); delete copia.biblioteca; ed.doc.defs[def.ref] = JSON.parse(JSON.stringify(copia)); }
          const e = ed.añadir(Object.assign(clonar(inst), { p }));
          ed.sel.clear(); ed.sel.add(e.id);
        }, 'dibujar');
        ponerHerramienta('sel');
      },
      letra: l => { if (l === 'r') { inst.giro = T.norm360(inst.giro + 90); pedir(); return true; } return false; },
      dibujar: (Ob, cur) => { inst.p = cur; Ob.prims(T.primsEntidad(ed.doc, ed.geo, Object.assign({ id: '_vp' }, inst)), '#1f8a4c', 0.5); },
    };
  };

  /* --- edición con selección previa --- */
  function conSeleccion(cfg) {
    const t = { fase: ed.sel.size ? 1 : 0, pts: [] };
    t.ayuda = () => t.fase === 0 ? cfg.nombre + ' · selecciona objetos (clic o recuadro) y pulsa Intro' : cfg.ayuda(t);
    t.base = () => t.pts.length ? t.pts[0] : null;
    t.seleccionando = () => t.fase === 0;
    t.enter = () => { if (t.fase === 0) { if (ed.sel.size) { t.fase = 1; msg(t.ayuda()); } } else if (cfg.enter) cfg.enter(t); else ponerHerramienta('sel'); };
    t.clic = (p, sn) => { t.pts.push(p); cfg.punto(t, p, sn); msg(t.ayuda()); pedir(); };
    t.valor = n => cfg.valor ? cfg.valor(t, n) : false;
    t.letra = l => cfg.letra ? cfg.letra(t, l) : false;
    t.esc = () => false;
    t.dibujar = (Ob, cur) => { if (t.fase && cfg.dibujar) cfg.dibujar(t, Ob, cur); };
    return t;
  }
  const idsSel = () => [...ed.sel].filter(id => { const e = ed.geo.ents.get(id); return e && !capaBloqueada(e); });
  /* vista previa: los trazos de la selección transformados en el papel */
  function previa(Ob, F) {
    const o = ed.doc.hoja.origen, kk = k(), A = F.A;
    const Ap = [A[0], -A[1], -A[2], A[3]], bp = [kk * F.b[0], -kk * F.b[1]];
    const tp = P => { const x = P[0] - o[0], y = P[1] - o[1]; return [o[0] + Ap[0] * x + Ap[1] * y + bp[0], o[1] + Ap[2] * x + Ap[3] * y + bp[1]]; };
    const P2 = [];
    for (const id of ed.sel) for (const p of ed.lista.porEnt.get(id) || []) {
      if (p.k === 'L') P2.push({ k: 'L', p: p.p.map(tp), z: p.z, w: p.w, c: p.c });
      else if (p.k === 'T') { const q = tp([p.x, p.y]); const t = tp([p.x + Math.cos(p.a || 0), p.y - Math.sin(p.a || 0)]); P2.push({ k: 'T', x: q[0], y: q[1], s: p.s, h: p.h, a: Math.atan2(-(t[1] - q[1]), t[0] - q[0]), c: p.c }); }
    }
    Ob.prims(P2, '#1f8a4c', 0.5, 0.9);
  }
  function aplicar(F, copiar) {
    const ids = idsSel();
    if (!ids.length) return;
    ed.cambiar(() => {
      const set = new Set(ids);
      let objetivo = ids.map(id => ed.geo.ents.get(id));
      if (copiar) {
        const mapa = new Map();
        const copias = objetivo.map(e => { const c = clonar(e); c.id = ed.nuevoId(); mapa.set(e.id, c.id); return c; });
        // huecos de las paredes copiadas
        for (const h of ed.doc.entidades) if (h.tipo === 'hueco' && set.has(h.pared) && !set.has(h.id)) { const c = clonar(h); c.id = ed.nuevoId(); mapa.set(h.id, c.id); copias.push(c); }
        for (const c of copias) {
          if (c.tipo === 'hueco' && mapa.has(c.pared)) c.pared = mapa.get(c.pared);
          for (const r of ['r1', 'r2', 'rc']) if (c[r]) { if (mapa.has(c[r].id)) c[r].id = mapa.get(c[r].id); else delete c[r]; }
          for (const r of ['rl1', 'rl2']) if (c[r]) { if (c[r].every(x => mapa.has(x.id))) c[r].forEach(x => { x.id = mapa.get(x.id); }); else delete c[r]; }
        }
        ed.doc.entidades.push(...copias);
        objetivo = copias;
        ed.sel.clear(); copias.forEach(c => ed.sel.add(c.id));
      }
      const paredes = new Set(objetivo.filter(e => e.tipo === 'pared').map(e => e.id));
      for (const e of objetivo) {
        if (e.tipo === 'hueco' && !paredes.has(e.pared)) {
          const g = ed.geo.paredes.get(e.pared);
          if (g && F.A[0] === 1 && F.A[3] === 1 && !F.A[1] && !F.A[2]) e.pos = Math.max(0, Math.min(g.L - e.ancho, e.pos + V.dot(F.b, g.d)));
          continue;
        }
        transformarEnt(e, F, true);
        // una cota que se mueve sola pierde la unión con objetos que no se mueven
        if (e.tipo === 'cota') {
          const todos = new Set(objetivo.map(x => x.id));
          for (const r of ['r1', 'r2', 'rc']) if (e[r] && !todos.has(e[r].id)) delete e[r];
          for (const r of ['rl1', 'rl2']) if (e[r] && !e[r].every(x => todos.has(x.id))) delete e[r];
        }
      }
      if (!copiar) {
        // huecos de las paredes transformadas: cambian de lado si hay simetría
        const det = F.A[0] * F.A[3] - F.A[1] * F.A[2];
        if (det < 0) for (const h of ed.doc.entidades) if (h.tipo === 'hueco' && paredes.has(h.pared) && !ids.includes(h.id)) h.abre = -(h.abre || 1);
      }
    }, copiar ? 'copiar' : 'editar');
  }
  H.mover = () => conSeleccion({
    nombre: 'Mover',
    ayuda: t => t.pts.length ? 'Mover · punto de destino (o @dx,dy · longitud)' : 'Mover · punto base',
    punto: (t, p) => { if (t.pts.length === 2) { aplicar(T.afinMover(V.sub(p, t.pts[0]))); ponerHerramienta('sel'); } },
    dibujar: (t, Ob, cur) => { if (t.pts.length) { previa(Ob, T.afinMover(V.sub(cur, t.pts[0]))); goma(Ob, t.pts[0], cur); } },
  });
  H.copiar = () => conSeleccion({
    nombre: 'Copiar',
    ayuda: t => t.pts.length ? 'Copiar · punto de destino (puedes hacer varias copias) · Intro termina' : 'Copiar · punto base',
    punto: (t, p) => {
      if (t.pts.length >= 2) {
        const sel0 = t.sel0 || (t.sel0 = [...ed.sel]);
        ed.sel.clear(); sel0.forEach(id => ed.sel.add(id));
        aplicar(T.afinMover(V.sub(p, t.pts[0])), true);
        ed.sel.clear(); sel0.forEach(id => ed.sel.add(id));
        t.pts.pop();
      }
    },
    dibujar: (t, Ob, cur) => { if (t.pts.length) { previa(Ob, T.afinMover(V.sub(cur, t.pts[0]))); goma(Ob, t.pts[0], cur); } },
  });
  H.girar = () => conSeleccion({
    nombre: 'Girar',
    ayuda: t => t.pts.length ? 'Girar · escribe los grados (positivo = antihorario) o haz clic' : 'Girar · centro de giro',
    punto: (t, p) => { if (t.pts.length === 2) { aplicar(T.afinGirar(t.pts[0], V.ang(V.sub(p, t.pts[0])))); ponerHerramienta('sel'); } },
    valor: (t, n) => { if (t.pts.length === 1) { aplicar(T.afinGirar(t.pts[0], n * RAD)); ponerHerramienta('sel'); return true; } return false; },
    dibujar: (t, Ob, cur) => { if (t.pts.length) { const a = V.ang(V.sub(cur, t.pts[0])); previa(Ob, T.afinGirar(t.pts[0], a)); Ob.linea(t.pts[0], cur, null, [4, 3]); Ob.etiqueta(cur, T.fmt(T.deg(a), 1) + '°'); } },
  });
  H.simetria = () => {
    let borrar = false;
    return conSeleccion({
      nombre: 'Simetría',
      ayuda: t => (t.pts.length ? 'Simetría · segundo punto del eje' : 'Simetría · primer punto del eje de simetría') + ' · B: ' + (borrar ? 'se borra el original' : 'se conserva el original'),
      punto: (t, p) => {
        if (t.pts.length === 2) {
          if (V.dist(t.pts[0], p) < 1e-6) { t.pts.pop(); return; }
          aplicar(T.afinSimetria(t.pts[0], p), !borrar); ponerHerramienta('sel');
        }
      },
      letra: (t, l) => { if (l === 'b') { borrar = !borrar; msg(t.ayuda()); return true; } return false; },
      dibujar: (t, Ob, cur) => { if (t.pts.length && V.dist(t.pts[0], cur) > 1e-6) { previa(Ob, T.afinSimetria(t.pts[0], cur)); Ob.linea(t.pts[0], cur, '#b3261e', [8, 3, 2, 3]); } },
    });
  };
  H.escalar = () => conSeleccion({
    nombre: 'Escalar',
    ayuda: t => t.pts.length ? 'Escalar · escribe el factor e Intro (2 = el doble, 0.5 = la mitad)' : 'Escalar · punto base',
    punto: (t) => { if (t.pts.length > 1) t.pts.length = 1; },
    valor: (t, n) => { if (t.pts.length === 1 && n > 0) { aplicar(T.afinEscalar(t.pts[0], n)); ponerHerramienta('sel'); return true; } return false; },
    dibujar: (t, Ob, cur) => { if (t.pts.length) Ob.etiqueta(cur, 'escribe el factor'); },
  });
  H.borrar = () => {
    if (ed.sel.size) { const ids = idsSel(); ed.cambiar(() => ed.borrar(ids), 'borrar'); setTimeout(() => ponerHerramienta('sel')); }
    return { ayuda: () => 'Borrar · haz clic en los objetos que quieras borrar · Esc termina', clicEnt: true,
      clic: (p, sn, s) => { const id = tocar(s); if (id) ed.cambiar(() => ed.borrar([id]), 'borrar'); } };
  };
  /* recortar: quita el trozo pinchado hasta las intersecciones más próximas */
  H.recortar = () => ({
    ayuda: () => 'Recortar · haz clic en el trozo de línea, círculo o arco que quieras quitar · Esc termina',
    clic: (p, sn, s) => {
      const id = tocar(s, e => ['linea', 'polilinea', 'circulo', 'arco'].includes(e.tipo));
      if (!id) return;
      ed.cambiar(() => recortar(id, pantM(s)), 'editar');
    },
  });
  function recortar(id, m) {
    let e = ed.geo.ents.get(id);
    const cortes = [];
    for (const o of ed.doc.entidades) {
      if (o.id === id || ['cota', 'texto', 'rayado', 'hueco', 'suelo'].includes(o.tipo)) continue;
      cortes.push(...ed.geo.curvas(o));
    }
    if (e.tipo === 'polilinea') {
      // se descompone en líneas y se recorta la más cercana
      const n = e.pts.length, lineas = [];
      for (let i = 0; i < n - (e.cerrada ? 0 : 1); i++) lineas.push({ tipo: 'linea', a: e.pts[i], b: e.pts[(i + 1) % n], capa: e.capa, trazo: e.trazo, pluma: e.pluma, color: e.color });
      const resto = lineas.slice(); let mejor = 0, md = Infinity;
      lineas.forEach((l, i) => { const d = T.distSeg(m, l.a, l.b).d; if (d < md) { md = d; mejor = i; } });
      for (const l of resto) cortes.push({ s: [l.a, l.b] });
      ed.borrar([id]);
      lineas.forEach(l => ed.añadir(l));
      e = lineas[mejor];
      cortes.splice(cortes.findIndex(c => c.s && c.s[0] === e.a && c.s[1] === e.b), 1);
    }
    if (e.tipo === 'linea') {
      const ts = [];
      for (const c of cortes) for (const p of T.interCurvas({ s: [e.a, e.b] }, c)) { const t = T.distSeg(p, e.a, e.b).t; if (t > 1e-6 && t < 1 - 1e-6) ts.push(t); }
      const tc = T.distSeg(m, e.a, e.b).t;
      const lo = Math.max(-1, ...ts.filter(t => t < tc)), hi = Math.min(2, ...ts.filter(t => t > tc));
      const P = t => V.lerp(e.a, e.b, t);
      if (lo < 0 && hi > 1) { ed.borrar([e.id]); return; }
      if (lo < 0) { e.a = P(hi); return; }
      if (hi > 1) { e.b = P(lo); return; }
      const b0 = e.b; e.b = P(lo);
      ed.añadir({ tipo: 'linea', a: P(hi), b: b0, capa: e.capa, trazo: e.trazo, pluma: e.pluma, color: e.color });
    } else if (e.tipo === 'circulo' || e.tipo === 'arco') {
      const C = e.tipo === 'arco' ? { c: e.c, r: e.r, a0: e.a0, a1: e.a1 } : { c: e.c, r: e.r };
      const angs = [];
      for (const c of cortes) for (const p of T.interCurvas(C, c)) angs.push(T.norm360(T.deg(V.ang(V.sub(p, e.c)))));
      const am = T.norm360(T.deg(V.ang(V.sub(m, e.c))));
      if (e.tipo === 'circulo') {
        if (angs.length < 2) { aviso('Para recortar un círculo hacen falta al menos dos cortes'); return; }
        const rel = a => T.norm360(a - am);
        const despues = angs.reduce((x, y) => rel(y) < rel(x) ? y : x), antes = angs.reduce((x, y) => rel(y) > rel(x) ? y : x);
        Object.assign(e, { tipo: 'arco', a0: despues, a1: antes });
      } else {
        const rel = a => T.norm360(a - e.a0), sw = T.norm360(e.a1 - e.a0) || 360, rm = rel(am);
        const ins = angs.map(rel).filter(x => x > 1e-6 && x < sw - 1e-6);
        const lo = Math.max(-1, ...ins.filter(x => x < rm)), hi = Math.min(sw + 1, ...ins.filter(x => x > rm));
        if (lo < 0 && hi > sw) { ed.borrar([e.id]); return; }
        if (lo < 0) { e.a0 = T.norm360(e.a0 + hi); return; }
        if (hi > sw) { e.a1 = T.norm360(e.a0 + lo); return; }
        const a0o = e.a0, a1o = e.a1;
        e.a1 = T.norm360(a0o + lo);
        ed.añadir({ tipo: 'arco', c: e.c, r: e.r, a0: T.norm360(a0o + hi), a1: a1o, capa: e.capa, trazo: e.trazo, pluma: e.pluma, color: e.color });
      }
    }
  }

  /* --- medir --- */
  H.medir = () => {
    const t = { pts: [], cerr: false };
    ed.medicion = { pts: t.pts, cerr: false };
    const informar = () => {
      const n = t.pts.length;
      if (n < 2) { ed.medicion = { pts: t.pts }; opc.alMedicion && opc.alMedicion(null); return; }
      const L = T.perimetro(t.pts, t.cerr), d = V.sub(t.pts[n - 1], t.pts[n - 2]);
      const r = { longitud: L, tramos: n - 1 + (t.cerr ? 1 : 0), dx: d[0], dy: d[1], ang: T.norm360(T.deg(V.ang(d))) };
      if (t.cerr || n > 2) r.area = Math.abs(T.areaPoli(t.pts));
      ed.medicion = Object.assign({ pts: t.pts, cerr: t.cerr }, r);
      opc.alMedicion && opc.alMedicion(ed.medicion);
    };
    return {
      ayuda: () => t.pts.length ? 'Medir · sigue pinchando puntos para sumar tramos y ver el área · C cierra · Intro o Esc empieza de nuevo' : 'Medir · pincha el primer punto, o haz doble clic dentro de un objeto cerrado para ver su área',
      base: () => t.pts.length ? t.pts[t.pts.length - 1] : null,
      clic: p => { if (t.cerr) { t.pts.length = 0; t.cerr = false; } t.pts.push(p); informar(); msg(ed.herr.ayuda()); },
      dobleClic: (p, sn, s) => {
        const id = tocar(s); const e = id && ed.geo.ents.get(id);
        let area = null, per = null;
        if (e && e.tipo === 'circulo') { area = Math.PI * e.r * e.r; per = 2 * Math.PI * e.r; }
        else if (e && (e.tipo === 'polilinea' && e.cerrada || e.tipo === 'suelo')) { area = Math.abs(T.areaPoli(e.pts)); per = T.perimetro(e.pts, true); }
        else if (e && e.tipo === 'pared') { const g = ed.geo.paredes.get(e.id); area = g ? g.piezas.reduce((s, pz) => s + Math.abs(T.areaPoli(pz.pts)), 0) : null; }
        if (area != null) { ed.medicion = { pts: [], area, longitud: per, objeto: NOMBRE_ENT[e.tipo][0] }; opc.alMedicion && opc.alMedicion(ed.medicion); }
      },
      letra: l => { if (l === 'c' && t.pts.length > 2) { t.cerr = true; informar(); pedir(); return true; } return false; },
      enter: () => { t.pts.length = 0; t.cerr = false; informar(); pedir(); },
      esc: () => { if (t.pts.length) { t.pts.length = 0; t.cerr = false; informar(); pedir(); return true; } return false; },
      dibujar: (Ob, cur) => { if (t.pts.length && !t.cerr) goma(Ob, t.pts[t.pts.length - 1], cur); },
    };
  };

  /* --- cotas --- */
  const nuevaCota = c => { c.tipo = 'cota'; c.capa = 'cotas'; return c; };
  function dirLineal(p1, p2, pos) {
    const x0 = Math.min(p1[0], p2[0]), x1 = Math.max(p1[0], p2[0]), y0 = Math.min(p1[1], p2[1]), y1 = Math.max(p1[1], p2[1]);
    const dx = pos[0] < x0 ? x0 - pos[0] : pos[0] > x1 ? pos[0] - x1 : 0, dy = pos[1] < y0 ? y0 - pos[1] : pos[1] > y1 ? pos[1] - y1 : 0;
    if (dx === 0 && dy === 0) return Math.abs(p2[0] - p1[0]) >= Math.abs(p2[1] - p1[1]) ? 'h' : 'v';
    return dy >= dx ? 'h' : 'v';
  }
  function cotaDosPuntos(clase) {
    let forzar = null;
    const t = { pts: [], refs: [] };
    const cota = pos => {
      const [p1, p2] = t.pts;
      const c = nuevaCota({ clase, p1, p2, pos });
      if (clase === 'lineal') c.dir = forzar || dirLineal(p1, p2, pos);
      if (t.refs[0]) c.r1 = t.refs[0]; if (t.refs[1]) c.r2 = t.refs[1];
      return c;
    };
    return {
      ayuda: () => ['Cota · primer punto (usa el imán: extremos, medios, centros…)', 'Cota · segundo punto', 'Cota · dónde va la línea de cota' + (clase === 'lineal' ? ' · H horizontal · V vertical · A automática' : '')][t.pts.length],
      base: () => t.pts.length === 1 ? t.pts[0] : null,
      clic: (p, sn) => {
        if (t.pts.length < 2) {
          if (t.pts.length === 1 && V.dist(t.pts[0], p) < 1e-6) return;
          t.pts.push(p); t.refs.push(sn && sn.ref ? sn.ref : null);
        } else {
          const c = cota(p);
          ed.cambiar(() => { const e = ed.añadir(c); ed.ultimaCota = e.id; }, 'cota');
          t.pts = []; t.refs = []; forzar = null;
        }
        msg(ed.herr.ayuda());
      },
      letra: l => { if (clase !== 'lineal') return false; if (l === 'h' || l === 'v') { forzar = l; pedir(); return true; } if (l === 'a') { forzar = null; pedir(); return true; } return false; },
      esc: () => { if (t.pts.length) { t.pts = []; t.refs = []; pedir(); return true; } return false; },
      dibujar: (Ob, cur) => {
        if (t.pts.length === 1) Ob.linea(t.pts[0], cur, '#1f5bd0', [4, 3]);
        if (t.pts.length === 2) Ob.prims(T.primsEntidad(ed.doc, ed.geo, Object.assign({ id: '_vp' }, cota(cur))), '#1f5bd0', 0.3);
      },
    };
  }
  H['cota-lin'] = () => cotaDosPuntos('lineal');
  H['cota-ali'] = () => cotaDosPuntos('alineada');
  function cotaCurva(clase) {
    let obj = null;
    const c = pos => nuevaCota({ clase, c: obj.c, r: obj.r, pos, rc: { id: obj.id } });
    return {
      ayuda: () => obj ? 'Cota · lleva el ratón y haz clic donde quieres la cifra (dentro o fuera)' : 'Cota de ' + (clase === 'radio' ? 'radio' : 'diámetro') + ' · haz clic en un círculo o un arco',
      clic: (p, sn, s) => {
        if (!obj) { const id = tocar(s, e => e.tipo === 'circulo' || e.tipo === 'arco'); if (id) { obj = ed.geo.ents.get(id); msg(ed.herr.ayuda()); } return; }
        ed.cambiar(() => { ed.ultimaCota = ed.añadir(c(p)).id; }, 'cota'); obj = null; msg(ed.herr.ayuda());
      },
      esc: () => { if (obj) { obj = null; pedir(); return true; } return false; },
      dibujar: (Ob, cur) => { if (obj) Ob.prims(T.primsEntidad(ed.doc, ed.geo, Object.assign({ id: '_vp' }, c(cur))), '#1f5bd0', 0.3); },
      sinImanObj: true,
    };
  }
  H['cota-rad'] = () => cotaCurva('radio');
  H['cota-dia'] = () => cotaCurva('diametro');
  /* segmento recto bajo el cursor (línea o tramo de polilínea) con sus referencias */
  function segmentoEn(s) {
    const id = tocar(s, e => e.tipo === 'linea' || e.tipo === 'polilinea' || e.tipo === 'pared');
    if (!id) return null;
    const e = ed.geo.ents.get(id), m = pantM(s);
    if (e.tipo === 'linea') return { a: e.a, b: e.b, r: [{ id, k: 'a' }, { id, k: 'b' }] };
    if (e.tipo === 'pared') {
      const g = ed.geo.paredes.get(id); if (!g) return null;
      const lado = V.dot(V.sub(m, g.A), g.nl) >= 0 ? 'L' : 'R';
      return { a: g['a' + lado], b: g['b' + lado], r: [{ id, k: 'a' + lado }, { id, k: 'b' + lado }] };
    }
    const n = e.pts.length; let mejor = 0, md = Infinity;
    for (let i = 0; i < n - (e.cerrada ? 0 : 1); i++) { const d = T.distSeg(m, e.pts[i], e.pts[(i + 1) % n]).d; if (d < md) { md = d; mejor = i; } }
    const j = (mejor + 1) % n;
    return { a: e.pts[mejor], b: e.pts[j], r: [{ id, k: 'v' + mejor }, { id, k: 'v' + j }] };
  }
  H['cota-ang'] = () => {
    const ls = [];
    const c = pos => nuevaCota({ clase: 'angular', l1: [ls[0].a, ls[0].b], l2: [ls[1].a, ls[1].b], rl1: ls[0].r, rl2: ls[1].r, pos });
    return {
      ayuda: () => ['Cota angular · haz clic en la primera línea', 'Cota angular · haz clic en la segunda línea', 'Cota angular · dónde va el arco de cota'][ls.length],
      clic: (p, sn, s) => {
        if (ls.length < 2) { const sg = segmentoEn(s); if (sg) { if (ls.length === 1 && Math.abs(V.cross(V.norm(V.sub(sg.b, sg.a)), V.norm(V.sub(ls[0].b, ls[0].a)))) < 1e-6) { aviso('Esas dos líneas son paralelas: no forman ángulo'); return; } ls.push(sg); } msg(ed.herr.ayuda()); return; }
        ed.cambiar(() => { ed.ultimaCota = ed.añadir(c(p)).id; }, 'cota'); ls.length = 0; msg(ed.herr.ayuda());
      },
      esc: () => { if (ls.length) { ls.length = 0; pedir(); return true; } return false; },
      dibujar: (Ob, cur) => { ls.forEach(l => Ob.linea(l.a, l.b, '#1f5bd0')); if (ls.length === 2) Ob.prims(T.primsEntidad(ed.doc, ed.geo, Object.assign({ id: '_vp' }, c(cur))), '#1f5bd0', 0.3); },
      sinImanObj: true,
    };
  };
  /* serie y paralelo: parten de una cota lineal o alineada (la última o la que se pinche) */
  function cotaEncadenada(paralelo) {
    let base = null, previa = null, n = 0;
    const elegir = id => { const e = id && ed.geo.ents.get(id); if (e && e.tipo === 'cota' && (e.clase === 'lineal' || e.clase === 'alineada')) { base = e; previa = e; n = 0; return true; } return false; };
    elegir(ed.ultimaCota && ed.sel.size === 0 ? ed.ultimaCota : [...ed.sel][0]);
    const nueva = (p, sn) => {
      const c = clonar(base); delete c.id; delete c.texto; delete c.tol;
      if (paralelo) {
        // desde el primer punto de la cota base, cada vez más lejos
        const u = base.clase === 'alineada' ? V.norm(V.sub(base.p2, base.p1)) : (base.dir === 'v' ? [0, 1] : [1, 0]), nn = V.perp(u);
        let off = V.dot(V.sub(base.pos, base.p1), nn); const sg = off >= 0 ? 1 : -1;
        const sep = ed.doc.estiloCota.separacion / k();
        c.p1 = base.p1; c.r1 = base.r1; c.p2 = p; c.r2 = sn && sn.ref ? sn.ref : undefined;
        c.pos = V.add(base.pos, V.mul(nn, sg * sep * (n + 1)));
      } else {
        c.p1 = previa.p2; c.r1 = previa.r2; c.p2 = p; c.r2 = sn && sn.ref ? sn.ref : undefined; c.pos = previa.pos;
      }
      if (!c.r1) delete c.r1; if (!c.r2) delete c.r2;
      return nuevaCota(c);
    };
    return {
      ayuda: () => base ? (paralelo ? 'Cotas en paralelo' : 'Cotas en serie') + ' · pincha el siguiente punto · Intro o Esc termina' : (paralelo ? 'Cotas en paralelo' : 'Cotas en serie') + ' · primero haz clic en una cota lineal que ya exista',
      clic: (p, sn, s) => {
        if (!base) { if (!elegir(tocar(s, e => e.tipo === 'cota'))) aviso('Haz clic en una cota lineal o alineada'); msg(ed.herr.ayuda()); pedir(); return; }
        ed.cambiar(() => { const e = ed.añadir(nueva(p, sn)); previa = e; ed.ultimaCota = e.id; n++; }, 'cota');
        msg(ed.herr.ayuda());
      },
      base: () => base ? (paralelo ? base.p1 : previa.p2) : null,
      sinImanObj: false,
      dibujar: (Ob, cur) => { if (base) Ob.prims(T.primsEntidad(ed.doc, ed.geo, Object.assign({ id: '_vp' }, nueva(cur, null))), '#1f5bd0', 0.3); },
    };
  }
  H['cota-serie'] = () => cotaEncadenada(false);
  H['cota-base'] = () => cotaEncadenada(true);
  /* acotación rápida: clic en un objeto y luego dónde va la cota */
  H['cota-rapida'] = () => {
    let c0 = null;
    const conPos = pos => {
      const c = clonar(c0);
      if (c.clase === 'lineal' || c.clase === 'alineada') { c.pos = pos; if (c.clase === 'lineal' && !c.fija) c.dir = dirLineal(c.p1, c.p2, pos); }
      else c.pos = pos;
      delete c.fija;
      return nuevaCota(c);
    };
    return {
      ayuda: () => c0 ? 'Acotación rápida · lleva el ratón y haz clic donde va la cota' : 'Acotación rápida · haz clic en una línea, un círculo, un arco, una pared, un hueco o un mueble',
      clic: (p, sn, s) => {
        if (c0) { ed.cambiar(() => { ed.ultimaCota = ed.añadir(conPos(p)).id; }, 'cota'); c0 = null; msg(ed.herr.ayuda()); return; }
        const id = tocar(s, e => !['cota', 'texto', 'rayado', 'suelo'].includes(e.tipo));
        if (!id) return;
        const e = ed.geo.ents.get(id), m = pantM(s);
        if (e.tipo === 'circulo') c0 = { clase: 'diametro', c: e.c, r: e.r, rc: { id } };
        else if (e.tipo === 'arco') c0 = { clase: 'radio', c: e.c, r: e.r, rc: { id } };
        else if (e.tipo === 'linea' || e.tipo === 'polilinea' || e.tipo === 'pared') {
          const sg = segmentoEn(s); if (!sg) return;
          const d = V.sub(sg.b, sg.a), recta = Math.abs(d[0]) < 1e-6 || Math.abs(d[1]) < 1e-6;
          c0 = { clase: recta ? 'lineal' : 'alineada', p1: sg.a, p2: sg.b, r1: sg.r[0], r2: sg.r[1], dir: Math.abs(d[1]) < 1e-6 ? 'h' : 'v', fija: true };
        } else if (e.tipo === 'hueco') {
          const g = ed.geo.paredes.get(e.pared), lado = V.dot(V.sub(m, g.A), g.nl) >= 0 ? 'L' : 'R', h = ed.geo.hueco(e);
          const d = g.d, recta = Math.abs(d[0]) < 1e-6 || Math.abs(d[1]) < 1e-6;
          c0 = { clase: recta ? 'lineal' : 'alineada', p1: h['0' + lado], p2: h['1' + lado], r1: { id, k: '0' + lado }, r2: { id, k: '1' + lado }, dir: Math.abs(d[1]) < 1e-6 ? 'h' : 'v', fija: true };
        } else if (e.tipo === 'bloque') {
          const b = ed.geo.bloque(e), q = b.esquinas; let mejor = 0, md = Infinity;
          for (let i = 0; i < 4; i++) { const dd = T.distSeg(m, q[i], q[(i + 1) % 4]).d; if (dd < md) { md = dd; mejor = i; } }
          const j = (mejor + 1) % 4, d = V.sub(q[j], q[mejor]), recta = Math.abs(d[0]) < 1e-6 || Math.abs(d[1]) < 1e-6;
          c0 = { clase: recta ? 'lineal' : 'alineada', p1: q[mejor], p2: q[j], r1: { id, k: 'c' + mejor }, r2: { id, k: 'c' + j }, dir: Math.abs(d[1]) < 1e-6 ? 'h' : 'v', fija: true };
        }
        msg(ed.herr.ayuda()); pedir();
      },
      esc: () => { if (c0) { c0 = null; pedir(); return true; } return false; },
      dibujar: (Ob, cur) => { if (c0) Ob.prims(T.primsEntidad(ed.doc, ed.geo, Object.assign({ id: '_vp' }, conPos(cur))), '#1f5bd0', 0.3); },
      sinImanObj: true,
    };
  };

  /* ---------------------------------------------- revisar cotas */
  ed.revisarCotas = () => {
    const info = [...ed.lista.cotas.values()], prob = [];
    const add = (id, tipo, texto) => { if (!prob.some(p => p.id === id && p.tipo === tipo)) prob.push({ id, tipo, texto }); };
    // líneas de la pieza (en papel)
    const geom = [];
    for (const e of ed.doc.entidades) {
      if (['cota', 'texto', 'rayado', 'suelo'].includes(e.tipo)) continue;
      for (const p of ed.lista.porEnt.get(e.id) || []) if (p.k === 'L') for (let i = 0; i + 1 < p.p.length + (p.z ? 1 : 0); i++) geom.push([p.p[i], p.p[(i + 1) % p.p.length]]);
    }
    const cruza = (s, t, margen) => {
      const i = T.interSegSeg(s[0], s[1], t[0], t[1]);
      if (!i) return false;
      const m = margen == null ? 0.4 : margen;
      return V.dist(i.p, s[0]) > m && V.dist(i.p, s[1]) > m && V.dist(i.p, t[0]) > m && V.dist(i.p, t[1]) > m;
    };
    const ents = id => ed.geo.ents.get(id);
    for (let i = 0; i < info.length; i++) {
      const a = info[i], ea = ents(a.id);
      // 1 · cerca de la pieza
      if ((a.clase === 'lineal' || a.clase === 'alineada') && a.sep < 7 - 0.05) add(a.id, 'cerca', a.sep < 0.3 ? 'La línea de cota está encima de la pieza: llévala fuera, al menos a 7 mm · Place the dimension line outside the part.' : 'La línea de cota está a ' + T.fmt(a.sep, 1) + ' mm de la pieza: deja al menos 7 mm · Keep at least 7 mm from the part.');
      // 2 · cruces con la pieza
      if (!(a.clase === 'radio' || a.clase === 'diametro')) for (const s of a.lineas) { if (geom.some(g => cruza(s, g, 0.6))) { add(a.id, 'cruce', 'La línea de cota cruza una línea de la pieza · The dimension line crosses the drawing.'); break; } }
      for (const bx of a.cajas) { const seg = [[bx[0], bx[1]], [bx[1], bx[2]], [bx[2], bx[3]], [bx[3], bx[0]]]; if (geom.some(g => seg.some(s => cruza(s, g, 0)))) { add(a.id, 'cifra', 'Hay una línea que pasa por encima de la cifra: muévela para que se lea bien · A line crosses the number.'); break; } }
      for (let j = i + 1; j < info.length; j++) {
        const b = info[j], eb = ents(b.id);
        // 3 · repetidas
        let rep = false;
        if ((a.clase === 'radio' || a.clase === 'diametro') && (b.clase === 'radio' || b.clase === 'diametro')) rep = ea.c && eb.c && V.dist(ea.c, eb.c) < 0.01 && Math.abs(ea.r - eb.r) < 0.01;
        else if ((a.clase === 'lineal' || a.clase === 'alineada') && (b.clase === 'lineal' || b.clase === 'alineada') && a.dir && b.dir && Math.abs(V.cross(a.dir, b.dir)) < 0.01 && Math.abs(a.valor - b.valor) < 0.01) {
          const pa = [V.dot(a.A, a.dir), V.dot(a.B, a.dir)].sort((x, y) => x - y), pb = [V.dot(b.A, a.dir), V.dot(b.B, a.dir)].sort((x, y) => x - y);
          rep = Math.abs(pa[0] - pb[0]) < 0.3 && Math.abs(pa[1] - pb[1]) < 0.3;
          if (!rep && Math.abs(ea.p1 && eb.p1 ? 0 : 1) === 0) {
            // misma medida entre los mismos puntos de la pieza
            const mismos = (V.dist(ea.p1, eb.p1) < 0.01 && V.dist(ea.p2, eb.p2) < 0.01) || (V.dist(ea.p1, eb.p2) < 0.01 && V.dist(ea.p2, eb.p1) < 0.01);
            rep = mismos;
          }
        }
        if (rep) { add(b.id, 'repetida', 'Esta medida ya está acotada: no repitas cotas (cada medida, una sola vez) · Do not repeat dimensions.'); add(a.id, 'repetida', 'Esta medida está acotada dos veces: quita una de las dos · This size is dimensioned twice.'); }
        // 4 · cruces entre cotas
        let cr = false;
        for (const s of a.lineas) for (const t of b.lineas.concat(b.aux)) if (cruza(s, t)) cr = true;
        for (const s of b.lineas) for (const t of a.aux) if (cruza(s, t)) cr = true;
        if (cr) { add(a.id, 'cruce', 'Se cruza con otra cota: las líneas de cota no deben cruzarse · Dimension lines must not cross.'); add(b.id, 'cruce', 'Se cruza con otra cota: las líneas de cota no deben cruzarse · Dimension lines must not cross.'); }
        // 5 · demasiado juntas (cotas paralelas que se solapan)
        if (a.dir && b.dir && Math.abs(V.cross(a.dir, b.dir)) < 0.01) {
          const n = V.perp(a.dir), dist = Math.abs(V.dot(V.sub(b.A, a.A), n));
          const pa = [V.dot(a.A, a.dir), V.dot(a.B, a.dir)].sort((x, y) => x - y), pb = [V.dot(b.A, a.dir), V.dot(b.B, a.dir)].sort((x, y) => x - y);
          const solape = Math.min(pa[1], pb[1]) - Math.max(pa[0], pb[0]);
          if (dist > 0.3 && dist < 7 - 0.05 && solape > 0.5) { add(b.id, 'juntas', 'Está a ' + T.fmt(dist, 1) + ' mm de otra cota paralela: sepáralas al menos 7 mm · Keep 7 mm between parallel dimensions.'); }
        }
      }
    }
    ed.problemas = prob;
    pedir();
    return { problemas: prob, total: info.length };
  };

  /* ---------------------------------------------- caja de texto flotante */
  ed.pedirTexto = (p, inicial, cb) => {
    const q = mPant(p);
    caja.hidden = false; caja.value = inicial || '';
    caja.style.left = Math.min(Wpx - 220, q[0]) + 'px'; caja.style.top = Math.max(0, q[1] - 34) + 'px';
    setTimeout(() => { caja.focus(); caja.select(); }, 0);
    const fin = ok => { caja.onkeydown = null; caja.onblur = null; caja.hidden = true; cvO.focus(); if (ok) cb(caja.value.trim()); };
    caja.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); };
    caja.onblur = () => fin(true);
  };

  /* ---------------------------------------------- comando escrito */
  ed.comando = txt => {
    const t = ed.herr;
    if (!t) return false;
    const base = t.base ? t.base() : null;
    const cur = snap ? snap.p : (cursor ? pantM(cursor) : null);
    const r = T.leerCoordenadas(txt, base, base && cur ? V.sub(cur, base) : null, fUni());
    if (r.error) { aviso(r.error); return false; }
    if (r.valor != null && t.valor && t.valor(r.valor)) { pedir(); return true; }
    if (!r.p) { aviso(base ? 'Mueve el ratón hacia donde quieres ir y escribe la longitud' : 'Escribe el punto como x,y'); return false; }
    if (t.seleccionando && t.seleccionando()) { aviso('Primero selecciona los objetos y pulsa Intro'); return false; }
    if (t.clic) { t.clic(r.p, { p: r.p, t: 'teclado' }, mPant(r.p)); pedir(); return true; }
    return false;
  };

  /* ---------------------------------------------- ratón, panel táctil y dedos */
  const punteros = new Map();
  let pinza = null, espacio = false, abajo = null;
  const pos = ev => { const r = cvO.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  cvO.addEventListener('contextmenu', ev => ev.preventDefault());
  cvO.addEventListener('pointerdown', ev => {
    cvO.focus();
    const s = pos(ev);
    punteros.set(ev.pointerId, s);
    try { cvO.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
    if (punteros.size === 2) { const [a, b] = [...punteros.values()]; pinza = { d: V.dist(a, b), m: V.mid(a, b) }; abajo = null; arrastre = null; rectSel = null; return; }
    if (ev.button === 2) { abajo = { s, boton: 2 }; return; }
    if (ev.button === 1 || espacio || ed.herrId === 'mano') { abajo = { s, pan: true }; cvO.style.cursor = 'grabbing'; ev.preventDefault(); return; }
    abajo = { s, t: Date.now(), movido: false };
    if (ed.herrId === 'sel') {
      // agarre pinchado
      for (const g of agarres()) { const q = mPant(g.p); if (Math.abs(q[0] - s[0]) < 8 && Math.abs(q[1] - s[1]) < 8) { abajo.agarre = g; return; } }
      const id = tocar(s);
      if (id && ed.sel.has(id) && !ev.shiftKey) abajo.moverSel = imantar(s, null, new Set(ed.sel)).p;
      abajo.id = id;
    }
  });
  cvO.addEventListener('pointermove', ev => {
    const s = pos(ev);
    if (punteros.has(ev.pointerId)) punteros.set(ev.pointerId, s);
    if (pinza && punteros.size === 2) {
      const [a, b] = [...punteros.values()], d = V.dist(a, b), m = V.mid(a, b);
      desplazar(m[0] - pinza.m[0], m[1] - pinza.m[1]);
      if (pinza.d > 10) ed.zoom(d / pinza.d, m);
      pinza = { d, m };
      return;
    }
    cursor = s;
    if (abajo && abajo.pan) { desplazar(s[0] - abajo.s[0], s[1] - abajo.s[1]); abajo.s = s; return; }
    if (abajo && !abajo.movido && V.dist(s, abajo.s) > 4) abajo.movido = true;
    const herr = ed.herr;
    if (abajo && abajo.movido && ed.herrId === 'sel') {
      if (abajo.agarre) {
        if (!arrastre) arrastre = { agarre: abajo.agarre, copia: JSON.stringify(ed.doc) };
        const excl = new Set([abajo.agarre.id]);
        snap = imantar(s, null, excl);
        moverAgarre(abajo.agarre, snap.p, snap); ed.vivo();
        return;
      }
      if (abajo.moverSel) {
        if (!arrastre) arrastre = { mover: true, copia: JSON.stringify(ed.doc), ultimo: abajo.moverSel };
        snap = imantar(s, abajo.moverSel, new Set(ed.sel));
        const d = V.sub(snap.p, arrastre.ultimo);
        if (V.len(d) > 1e-9) { const F = T.afinMover(d); for (const id of ed.sel) { const e = ed.geo.ents.get(id); if (e && !capaBloqueada(e)) { if (e.tipo === 'hueco') { if (!ed.sel.has(e.pared)) { const g = ed.geo.paredes.get(e.pared); if (g) e.pos = Math.max(0, Math.min(g.L - e.ancho, e.pos + V.dot(d, g.d))); } } else transformarEnt(e, F, true); } } arrastre.ultimo = snap.p; ed.vivo(); }
        return;
      }
      rectSel = [abajo.s, s]; pedir(); return;
    }
    if (herr && herr.seleccionando && herr.seleccionando() && abajo && abajo.movido) { rectSel = [abajo.s, s]; pedir(); return; }
    // imán y vista previa
    if (ed.herrId === 'sel' || ed.herrId === 'mano' || (herr && herr.seleccionando && herr.seleccionando())) { snap = null; const h = tocar(s); if (h !== hover) { hover = h; } }
    else if (herr && (herr.clicEnt || herr.sinImanObj === true && !(herr.base && herr.base()))) {
      snap = herr.sinImanObj ? imantar(s, herr.base ? herr.base() : null) : null;
      hover = tocar(s);
    } else { hover = null; snap = imantar(s, herr && herr.base ? herr.base() : null); }
    if (herr && herr.mover) herr.mover(s);
    opc.alCursor && opc.alCursor(snap ? snap.p : pantM(s));
    pedir();
  });
  const soltar = ev => {
    const s = pos(ev);
    punteros.delete(ev.pointerId);
    if (pinza) { if (punteros.size < 2) pinza = null; abajo = null; return; }
    const a = abajo; abajo = null;
    if (!a) return;
    if (a.pan) { cvO.style.cursor = ed.herrId === 'mano' ? 'grab' : ed.herrId === 'sel' ? 'default' : 'crosshair'; return; }
    if (a.boton === 2) { if (ed.herr && ed.herr.enter) ed.herr.enter(); pedir(); return; }
    if (arrastre) { arrastre = null; trasCambio('editar'); return; }
    const herr = ed.herr;
    if (rectSel) {
      const [p, q] = rectSel; rectSel = null;
      const A = dePant(p), B = dePant(q), r = [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[0], B[0]), Math.max(A[1], B[1])];
      const cruce = q[0] < p[0];
      if (!ev.shiftKey) ed.sel.clear();
      for (const e of ed.doc.entidades) {
        if (capaBloqueada(e)) continue;
        const b = ed.cajas.get(e.id); if (!b) continue;
        const dentro = b[0] >= r[0] && b[1] >= r[1] && b[2] <= r[2] && b[3] <= r[3];
        const toca = b[0] <= r[2] && b[2] >= r[0] && b[1] <= r[3] && b[3] >= r[1];
        if (dentro || (cruce && toca)) ed.sel.add(e.id);
      }
      opc.alSeleccion && opc.alSeleccion(); pedir();
      if (herr && herr.seleccionando && herr.seleccionando()) msg(herr.ayuda());
      return;
    }
    if (a.movido) return;
    // clic
    if (ed.herrId === 'sel' || (herr && herr.seleccionando && herr.seleccionando())) {
      const id = tocar(s);
      if (ev.shiftKey || (herr && herr.seleccionando && herr.seleccionando())) { if (id) { if (ed.sel.has(id)) ed.sel.delete(id); else ed.sel.add(id); } }
      else { ed.sel.clear(); if (id) ed.sel.add(id); ed.problemas = ed.problemas.filter(p => p.id === id); if (!id) ed.problemas = []; }
      opc.alSeleccion && opc.alSeleccion(); pedir();
      if (herr && herr.seleccionando && herr.seleccionando()) msg(herr.ayuda());
      return;
    }
    if (herr && herr.clic) {
      const sn = herr.clicEnt ? null : imantar(s, herr.base ? herr.base() : null);
      herr.clic(sn ? sn.p : pantM(s), sn, s);
      pedir();
    }
  };
  cvO.addEventListener('pointerup', soltar);
  cvO.addEventListener('pointercancel', ev => { punteros.delete(ev.pointerId); pinza = null; abajo = null; arrastre = null; rectSel = null; pedir(); });
  cvO.addEventListener('pointerleave', () => { cursor = null; snap = null; hover = null; pedir(); });
  cvO.addEventListener('dblclick', ev => {
    const s = pos(ev);
    if (ed.herr && ed.herr.dobleClic) { ed.herr.dobleClic(pantM(s), null, s); return; }
    if (ed.herrId === 'polilinea' || ed.herrId === 'pared' || ed.herrId === 'linea') { ed.herr.enter && ed.herr.enter(); return; }
    if (ed.herrId !== 'sel') return;
    const id = tocar(s), e = id && ed.geo.ents.get(id);
    if (!e) return;
    if (e.tipo === 'texto') ed.pedirTexto(e.p, e.txt, txt => { if (txt !== e.txt && txt) ed.cambiar(() => { e.txt = txt; }, 'editar'); });
    else if (e.tipo === 'cota') {
      const real = T.cifraCota(Object.assign({}, e, { texto: null, tol: null }), ed.doc, T.valorCota(e));
      ed.pedirTexto(e.pos || e.p1, e.texto || real, txt => ed.cambiar(() => { e.texto = (txt && txt !== real) ? txt : null; }, 'editar'));
    } else opc.alDobleClic && opc.alDobleClic(e);
  });
  cvO.addEventListener('wheel', ev => {
    ev.preventDefault();
    const s = pos(ev);
    const rueda = ev.deltaMode === 1 || (ev.deltaX === 0 && Math.abs(ev.deltaY) >= 40 && Number.isInteger(ev.deltaY));
    if (ev.ctrlKey || rueda) ed.zoom(Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : ev.ctrlKey ? 0.012 : 0.0016)), s);
    else desplazar(-ev.deltaX, -ev.deltaY);
  }, { passive: false });

  /* ---------------------------------------------- teclado */
  const enCampo = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  ed.tecla = ev => {
    if (enCampo(document.activeElement) && document.activeElement !== cvO) return false;
    const k0 = ev.key, l = k0.length === 1 ? k0.toLowerCase() : '';
    if (ev.ctrlKey || ev.metaKey) {
      if (l === 'z' && !ev.shiftKey) { ed.deshacer(); return true; }
      if (l === 'y' || (l === 'z' && ev.shiftKey)) { ed.rehacer(); return true; }
      if (l === 'a') { ed.sel.clear(); ed.doc.entidades.forEach(e => { if (!capaBloqueada(e)) ed.sel.add(e.id); }); opc.alSeleccion && opc.alSeleccion(); pedir(); return true; }
      return false;
    }
    if (k0 === ' ') { espacio = true; return true; }
    if (k0 === 'Escape') { if (!(ed.herr && ed.herr.esc && ed.herr.esc())) { if (ed.herrId !== 'sel') ponerHerramienta('sel'); else if (ed.herr.esc) ed.herr.esc(); } pedir(); return true; }
    if (k0 === 'Enter') { ed.herr && ed.herr.enter && ed.herr.enter(); pedir(); return true; }
    if (k0 === 'Delete' || k0 === 'Backspace') { if (ed.sel.size) { const ids = idsSel(); ed.cambiar(() => ed.borrar(ids), 'borrar'); } return true; }
    if (k0 === 'F8') { ed.imanes.orto = !ed.imanes.orto; opc.alImanes && opc.alImanes(); return true; }
    if (k0 === 'F3') { ed.imanes.objetos = !ed.imanes.objetos; opc.alImanes && opc.alImanes(); return true; }
    if (k0 === 'F9') { ed.imanes.rejilla = !ed.imanes.rejilla; opc.alImanes && opc.alImanes(); return true; }
    if (k0 === 'F7') { ed.doc.rejilla.ver = !ed.doc.rejilla.ver; opc.alImanes && opc.alImanes(); pedir(true); return true; }
    if (k0 === '+' || k0 === '=') { ed.zoom(1.25); return true; }
    if (k0 === '-' && ed.herrId === 'sel') { ed.zoom(0.8); return true; }
    if (k0.startsWith('Arrow') && ed.sel.size && ed.herrId === 'sel') {
      const p = ed.doc.rejilla.paso || 10, d = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, p], ArrowDown: [0, -p] }[k0];
      aplicar(T.afinMover(d)); return true;
    }
    if (/^[0-9@<.;,-]$/.test(k0) && ed.herrId !== 'sel') { opc.alEscribir && opc.alEscribir(k0); return true; }
    if (l && ed.herr && ed.herr.letra && ed.herr.letra(l)) { pedir(); return true; }
    if (l) {
      const h = T.HERRAMIENTAS.find(x => x.tecla.toLowerCase() === l && (!opc.herramientas || opc.herramientas.includes(x.id)));
      if (h) { ponerHerramienta(h.id); return true; }
      if (l === '0') { ed.ajustar(); return true; }
    }
    return false;
  };
  W.addEventListener('keydown', ev => { if (opc.activo && !opc.activo()) return; if (ed.tecla(ev)) ev.preventDefault(); });
  W.addEventListener('keyup', ev => { if (ev.key === ' ') espacio = false; });

  /* ---------------------------------------------- exportar */
  ed.primsHoja = () => (opc.hoja ? T.hojaPrims(ed.doc) : []).concat(ed.lista.prims);
  ed.cajaDibujo = () => { const pts = []; for (const b of ed.cajas.values()) pts.push([b[0], b[1]], [b[2], b[3]]); return pts.length ? T.caja(pts) : null; };
  /* imagen PNG: la hoja entera (o el dibujo) a la resolución pedida en px por mm */
  ed.imagen = (pxmm, fondo) => {
    pxmm = pxmm || 6;
    let bb;
    if (opc.hoja) { const [a, b] = T.tamHoja(ed.doc); bb = [0, 0, a, b]; }
    else { bb = ed.cajaDibujo() || [0, 0, 100, 100]; const m = 8; bb = [bb[0] - m, bb[1] - m, bb[2] + m, bb[3] + m]; }
    const w = Math.round((bb[2] - bb[0]) * pxmm), h = Math.round((bb[3] - bb[1]) * pxmm);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    cx.fillStyle = fondo || '#ffffff'; cx.fillRect(0, 0, w, h);
    cx.setTransform(pxmm, 0, 0, pxmm, -bb[0] * pxmm, -bb[1] * pxmm);
    T.pintar(cx, ed.primsHoja(), { mm1px: 1 / pxmm });
    return cv;
  };

  ed.lienzo = cvO;
  ed.estaArrastrando = () => !!arrastre;
  redimensionar();
  ed.cargar(T.nuevoDoc());
  return ed;
};
})(window);
