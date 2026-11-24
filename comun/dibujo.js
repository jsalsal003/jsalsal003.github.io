/* ===========================================================================
   TALLER · dibujo del plano
   Convierte las entidades (en mm reales) en una lista de trazos sobre el papel
   (en mm de papel, con el eje Y hacia abajo). La misma lista se pinta en la
   pantalla, en el PNG y en el PDF: por eso la escala del PDF es exacta.
   Incluye la hoja, el cajetín y las cotas según UNE-EN ISO 129.
   © 2026 Juan Salguero Salguero · CC BY-NC-SA 4.0
   =========================================================================== */
(function (W) {
'use strict';
const T = W.Taller, V = T.V, RAD = T.RAD;
const FUENTE = 'Helvetica, Arial, "Liberation Sans", Arimo, sans-serif';
const CAP = 0.716; // altura de las mayúsculas respecto al tamaño de letra
T.FUENTE = FUENTE; T.CAP = CAP;
let mctx = null;
T.anchoTexto = (s, h) => {
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  mctx.font = '100px ' + FUENTE;
  return mctx.measureText(String(s)).width / 100 * (h / CAP);
};
T.COLOR_EDITADA = '#d9480f';

/* ------------------------------------------------------------------ hoja */
T.tamHoja = doc => {
  const [a, b] = T.HOJAS[doc.hoja.formato] || T.HOJAS.A4;
  return doc.hoja.orientacion === 'vertical' ? [Math.min(a, b), Math.max(a, b)] : [Math.max(a, b), Math.min(a, b)];
};
T.CAMPOS = {
  titulo: ['Título', 'Title'], nombre: ['Nombre', 'Name'], curso: ['Curso', 'Group'], fecha: ['Fecha', 'Date'],
  escala: ['Escala', 'Scale'], numero: ['Nº plano', 'Drawing no.'], centro: ['Centro', 'School'],
};
T.cajetin = doc => {
  const [Wd, H] = T.tamHoja(doc), m = doc.hoja.margen;
  const compacto = doc.hoja.cajetin === 'compacto' || (Wd - 2 * m) < 182;
  const ancho = compacto ? 75 : 180, alto = compacto ? 48 : 24;
  const x0 = Wd - m - ancho, y0 = H - m - alto;
  const celdas = compacto
    ? [['titulo', 0, 0, 75, 12], ['nombre', 0, 12, 75, 9], ['curso', 0, 21, 37.5, 9], ['fecha', 37.5, 21, 37.5, 9], ['escala', 0, 30, 37.5, 9], ['numero', 37.5, 30, 37.5, 9], ['centro', 0, 39, 75, 9]]
    : [['titulo', 0, 0, 110, 12], ['escala', 110, 0, 30, 12], ['numero', 140, 0, 40, 12], ['nombre', 0, 12, 70, 12], ['curso', 70, 12, 30, 12], ['fecha', 100, 12, 35, 12], ['centro', 135, 12, 45, 12]];
  return { x: x0, y: y0, w: ancho, h: alto, celdas: celdas.map(c => ({ campo: c[0], x: x0 + c[1], y: y0 + c[2], w: c[3], h: c[4] })) };
};
function valorCampo(doc, campo) {
  if (campo === 'escala') return T.textoEscala(doc) + '   (' + doc.unidad + ')';
  return String(doc.hoja.datos[campo] || '');
}
T.hojaPrims = doc => {
  const [Wd, H] = T.tamHoja(doc), m = doc.hoja.margen, P = [];
  const ink = '#14201a', gris = '#55605a';
  P.push({ k: 'L', p: [[m, m], [Wd - m, m], [Wd - m, H - m], [m, H - m]], z: true, w: 0.7, c: ink });
  // marcas de centrado (ISO 5457)
  P.push({ k: 'L', p: [[Wd / 2, 0], [Wd / 2, m]], w: 0.5, c: ink }, { k: 'L', p: [[Wd / 2, H - m], [Wd / 2, H]], w: 0.5, c: ink });
  P.push({ k: 'L', p: [[0, H / 2], [m, H / 2]], w: 0.5, c: ink }, { k: 'L', p: [[Wd - m, H / 2], [Wd, H / 2]], w: 0.5, c: ink });
  const cj = T.cajetin(doc);
  for (const c of cj.celdas) {
    P.push({ k: 'L', p: [[c.x, c.y], [c.x + c.w, c.y], [c.x + c.w, c.y + c.h], [c.x, c.y + c.h]], z: true, w: 0.25, c: ink });
    const [es, en] = T.CAMPOS[c.campo];
    P.push({ k: 'T', x: c.x + 1, y: c.y + 2.6, s: (es + ' · ' + en).toUpperCase(), h: 1.5, a: 0, c: gris });
    let v = valorCampo(doc, c.campo), h = c.campo === 'titulo' ? 4.5 : 3;
    if (c.h < 10) h = Math.min(h, 2.8);
    const disp = c.w - 2;
    let tw = T.anchoTexto(v, h);
    if (tw > disp) { h = Math.max(1.6, h * disp / tw); tw = T.anchoTexto(v, h); }
    if (tw > disp) while (v.length > 1 && T.anchoTexto(v + '...', h) > disp) v = v.slice(0, -1);
    P.push({ k: 'T', x: c.x + 1, y: c.y + c.h - 1.6, s: v, h, a: 0, c: ink, campo: c.campo });
  }
  P.push({ k: 'L', p: [[cj.x, cj.y], [cj.x + cj.w, cj.y], [cj.x + cj.w, cj.y + cj.h], [cj.x, cj.y + cj.h]], z: true, w: 0.5, c: ink });
  return P;
};

/* ------------------------------------------------------------ estilos y ayudas */
function contexto(doc, geo, opc) {
  const k = T.k(doc), o = doc.hoja.origen || [0, 0];
  const capas = new Map(doc.capas.map(c => [c.id, c]));
  const C = {
    doc, geo, opc, k, o,
    M: p => [o[0] + p[0] * k, o[1] - p[1] * k],
    capa: id => capas.get(id) || capas.get('0') || doc.capas[0],
  };
  C.estilo = (e, capaDef) => {
    const c = C.capa(e.capa || capaDef);
    const trazo = T.TRAZOS[e.trazo || c.trazo] || T.TRAZOS.continua;
    return { c: e.color || c.color, w: e.pluma != null ? e.pluma : c.grosor, d: trazo.d };
  };
  return C;
}
const ring = (cx, cy, r, n) => { const out = []; for (let i = 0; i < n; i++) out.push([cx + r * Math.cos(i / n * 2 * Math.PI), cy + r * Math.sin(i / n * 2 * Math.PI)]); return out; };
function segsCirculo(rPapel, barrido) { return Math.max(8, Math.min(240, Math.ceil(barrido / 360 * Math.max(24, rPapel * 2.4)))); }

/* extremos de cota: flecha rellena, trazo oblicuo o punto.
   dir = vector unitario desde la punta hacia la cola */
function extremo(P, tip, dir, E, col, w) {
  const L = E.flecha;
  if (E.extremo === 'oblicuo') {
    const v = V.rot(dir, -Math.PI / 4);
    P.push({ k: 'L', p: [V.sub(tip, V.mul(v, L / 2.2)), V.add(tip, V.mul(v, L / 2.2))], w: Math.max(w, 0.35), c: col });
  } else if (E.extremo === 'punto') {
    P.push({ k: 'F', r: [ring(tip[0], tip[1], Math.max(0.35, L / 6), 12)], c: col });
  } else {
    const b = V.add(tip, V.mul(dir, L)), n = V.perp(dir), hw = L * 0.17;
    P.push({ k: 'F', r: [[tip, V.add(b, V.mul(n, hw)), V.sub(b, V.mul(n, hw))]], c: col });
  }
}
/* dirección de lectura: de izquierda a derecha o de abajo arriba (legible desde abajo o desde la derecha) */
function lectura(t) {
  const a = Math.atan2(-t[1], t[0]) / RAD;
  return (a > 90.5 || a <= -89.5) ? V.mul(t, -1) : t;
}
const arriba = t => [t[1], -t[0]];
T.anchoCifra = (s, h) => s.startsWith('□') ? h * 1.25 + T.anchoTexto(s.slice(1), h) : T.anchoTexto(s, h);
function texto(P, s, base, t, h, col) {
  const a = Math.atan2(-t[1], t[0]);
  if (s.startsWith('□')) {
    const q = h, up = arriba(t);
    const p0 = base, p1 = V.add(p0, V.mul(t, q)), p2 = V.add(p1, V.mul(up, q)), p3 = V.add(p0, V.mul(up, q));
    P.push({ k: 'L', p: [p0, p1, p2, p3], z: true, w: 0.25, c: col });
    base = V.add(base, V.mul(t, q + h * 0.25)); s = s.slice(1);
  }
  P.push({ k: 'T', x: base[0], y: base[1], s, h, a, c: col });
}
/* caja del texto (para revisar cruces) */
function cajaTexto(base, t, w, h) { const up = arriba(t); return [base, V.add(base, V.mul(t, w)), V.add(V.add(base, V.mul(t, w)), V.mul(up, h)), V.add(base, V.mul(up, h))]; }

/* ------------------------------------------------------------------ cotas */
T.cifraCota = (c, doc, valor) => {
  const E = doc.estiloCota, uni = c.unidad || E.unidad || doc.unidad;
  if (c.clase === 'angular') {
    let s = (c.texto != null && c.texto !== '') ? c.texto : T.fmt(valor, c.dec != null ? c.dec : E.decAng) + '°';
    return s;
  }
  const dec = c.dec != null ? c.dec : E.decimales;
  const pre = c.prefijo != null ? c.prefijo : (c.clase === 'diametro' ? 'Ø' : c.clase === 'radio' ? 'R' : '');
  let s = (c.texto != null && c.texto !== '') ? c.texto : pre + T.fmt(valor / T.UNI[uni], dec);
  if (c.tol) s += ' ±' + T.fmt(c.tol / T.UNI[uni], 3);
  return s;
};
T.valorCota = c => {
  if (c.clase === 'lineal') return Math.abs(c.dir === 'v' ? c.p2[1] - c.p1[1] : c.p2[0] - c.p1[0]);
  if (c.clase === 'alineada') return V.dist(c.p1, c.p2);
  if (c.clase === 'radio') return c.r;
  if (c.clase === 'diametro') return 2 * c.r;
  if (c.clase === 'angular') { const g = geoAngular(c); return g ? g.sw : 0; }
  return 0;
};
function geoAngular(c) {
  const [a1, b1] = c.l1, [a2, b2] = c.l2;
  const Vx = T.interLineas(a1, V.sub(b1, a1), a2, V.sub(b2, a2));
  if (!Vx) return null;
  const lejos = (a, b) => V.dist(a, Vx) > V.dist(b, Vx) ? a : b;
  const r1 = V.norm(V.sub(lejos(a1, b1), Vx)), r2 = V.norm(V.sub(lejos(a2, b2), Vx));
  const aq = T.deg(V.ang(V.sub(c.pos, Vx)));
  let mejor = null;
  for (const s1 of [1, -1]) for (const s2 of [1, -1]) {
    let A1 = T.deg(V.ang(V.mul(r1, s1))), A2 = T.deg(V.ang(V.mul(r2, s2)));
    let sw = T.norm360(A2 - A1);
    if (sw > 180) { const x = A1; A1 = A2; A2 = x; sw = 360 - sw; }
    if (sw < 1e-6) continue;
    if (T.enArco(aq, A1, A1 + sw) && (!mejor || sw < mejor.sw)) mejor = { ini: A1, sw };
  }
  if (!mejor) return null;
  return { Vx, ini: mejor.ini, sw: mejor.sw, R: V.dist(c.pos, Vx) };
}
T.geoAngular = geoAngular;

function cotaPrims(c, C) {
  const doc = C.doc, E = doc.estiloCota, P = [];
  const st = C.estilo(c, 'cotas'), col = st.c, w = st.w;
  const colT = (c.texto != null && c.texto !== '') ? T.COLOR_EDITADA : col;
  const h = c.h || E.texto, L = E.flecha, gap = E.hueco, over = E.sobresale;
  const info = { id: c.id, clase: c.clase, lineas: [], aux: [], cajas: [], puntos: [], valor: 0, sep: Infinity };
  const espacio = E.extremo === 'flecha' ? L : 1;
  const linea = (a, b) => { P.push({ k: 'L', p: [a, b], w, c: col }); };
  if (c.clase === 'lineal' || c.clase === 'alineada') {
    let u = c.clase === 'alineada' ? V.norm(V.sub(c.p2, c.p1)) : (c.dir === 'v' ? [0, 1] : [1, 0]);
    if (c.clase === 'alineada' && V.dist(c.p1, c.p2) < 1e-9) u = [1, 0];
    const n = V.perp(u);
    const valor = Math.abs(V.dot(V.sub(c.p2, c.p1), u));
    info.valor = valor;
    const D1m = V.add(c.p1, V.mul(n, V.dot(V.sub(c.pos, c.p1), n)));
    const D2m = V.add(c.p2, V.mul(n, V.dot(V.sub(c.pos, c.p2), n)));
    const P1 = C.M(c.p1), P2 = C.M(c.p2), D1 = C.M(D1m), D2 = C.M(D2m);
    info.puntos = [P1, P2];
    // líneas auxiliares
    for (const [Pp, D] of [[P1, D1], [P2, D2]]) {
      const v = V.sub(D, Pp), dl = V.len(v);
      info.sep = Math.min(info.sep, dl);
      if (dl > gap + 0.05) {
        const e = V.mul(v, 1 / dl), seg = [V.add(Pp, V.mul(e, gap)), V.add(D, V.mul(e, over))];
        linea(seg[0], seg[1]); info.aux.push(seg);
      }
    }
    let t = V.sub(D2, D1);
    if (V.len(t) < 1e-9) t = C.M(V.add(c.pos, u)), t = V.sub(t, C.M(c.pos));
    t = lectura(V.norm(t));
    const up = arriba(t);
    const [A, B] = V.dot(D1, t) <= V.dot(D2, t) ? [D1, D2] : [D2, D1];
    const len = V.dist(A, B), s = T.cifraCota(c, doc, valor), tw = T.anchoCifra(s, h);
    const flechasDentro = len >= 2 * espacio + 1;
    const textoDentro = !c.fuera && len >= tw + 2 * espacio + 2;
    let l0 = A, l1 = B;
    if (!flechasDentro) { l0 = V.sub(A, V.mul(t, L + 2)); l1 = V.add(B, V.mul(t, L + 2)); }
    let base;
    if (textoDentro) base = V.add(V.sub(V.mid(A, B), V.mul(t, tw / 2)), V.mul(up, 0.9));
    else {
      base = V.add(V.add(B, V.mul(t, flechasDentro ? 1.5 : L + 3)), V.mul(up, 0.9));
      l1 = V.add(B, V.mul(t, (flechasDentro ? 1.5 : L + 3) + tw));
    }
    linea(l0, l1); info.lineas.push([A, B]);
    extremo(P, A, flechasDentro ? t : V.mul(t, -1), E, col, w);
    extremo(P, B, flechasDentro ? V.mul(t, -1) : t, E, col, w);
    texto(P, s, base, t, h, colT);
    info.cajas.push(cajaTexto(base, t, tw, h));
    info.dir = V.norm(V.sub(B, A)); info.A = A; info.B = B;
  } else if (c.clase === 'radio' || c.clase === 'diametro') {
    const k = C.k, cen = C.M(c.c), r = c.r * k, Q = C.M(c.pos);
    let v = V.sub(Q, cen); if (V.len(v) < 1e-6) v = [1, -1]; v = V.norm(v);
    const Pc = V.add(cen, V.mul(v, r));
    const valor = c.clase === 'diametro' ? 2 * c.r : c.r;
    info.valor = valor; info.puntos = [cen];
    const s = T.cifraCota(c, doc, valor), tw = T.anchoCifra(s, h);
    const dQ = V.dist(Q, cen);
    const cabe = c.clase === 'diametro' ? 2 * r >= tw + 2 * espacio + 3 : r >= tw + espacio + 2.5;
    if (dQ <= r + 0.5 && cabe) {
      const t = lectura(v), up = arriba(t);
      if (c.clase === 'diametro') {
        const P2 = V.sub(cen, V.mul(v, r));
        linea(P2, Pc); info.lineas.push([P2, Pc]);
        extremo(P, Pc, V.mul(v, -1), E, col, w); extremo(P, P2, v, E, col, w);
        const m = tw / 2 + espacio + 1 < r ? V.add(cen, V.mul(v, Math.min(r / 2, r - tw / 2 - espacio - 0.5))) : cen;
        const base = V.add(V.sub(m, V.mul(t, tw / 2)), V.mul(up, 0.9));
        texto(P, s, base, t, h, colT); info.cajas.push(cajaTexto(base, t, tw, h));
      } else {
        linea(cen, Pc); info.lineas.push([cen, Pc]);
        extremo(P, Pc, V.mul(v, -1), E, col, w);
        const m = V.add(cen, V.mul(v, Math.max(tw / 2 + 0.5, (r - espacio) / 2)));
        const base = V.add(V.sub(m, V.mul(t, tw / 2)), V.mul(up, 0.9));
        texto(P, s, base, t, h, colT); info.cajas.push(cajaTexto(base, t, tw, h));
      }
    } else {
      const Qe = dQ > r + 0.5 ? Q : V.add(cen, V.mul(v, r + L + 8));
      linea(Pc, Qe); info.lineas.push([Pc, Qe]);
      extremo(P, Pc, v, E, col, w);
      const sx = v[0] >= 0 ? 1 : -1, fin = [Qe[0] + sx * (tw + 1), Qe[1]];
      linea(Qe, fin); info.lineas.push([Qe, fin]);
      const base = sx > 0 ? [Qe[0] + 0.5, Qe[1] - 0.9] : [Qe[0] - tw - 0.5, Qe[1] - 0.9];
      texto(P, s, base, [1, 0], h, colT); info.cajas.push(cajaTexto(base, [1, 0], tw, h));
    }
  } else if (c.clase === 'angular') {
    const g = geoAngular(c);
    if (!g) return { P: [{ k: 'T', x: C.M(c.pos)[0], y: C.M(c.pos)[1], s: '¿ángulo?', h, a: 0, c: '#d7262c' }], info };
    info.valor = g.sw;
    const k = C.k, Rp = g.R * k, n = segsCirculo(Rp, g.sw), pts = [];
    for (let i = 0; i <= n; i++) pts.push(C.M(V.polar(g.Vx, g.R, (g.ini + g.sw * i / n) * RAD)));
    P.push({ k: 'L', p: pts, w, c: col });
    for (let i = 0; i < pts.length - 1; i++) info.lineas.push([pts[i], pts[i + 1]]);
    extremo(P, pts[0], V.norm(V.sub(pts[1], pts[0])), E, col, w);
    extremo(P, pts[n], V.norm(V.sub(pts[n - 1], pts[n])), E, col, w);
    // líneas auxiliares si el arco queda más allá de las líneas
    for (const [lin, ang] of [[c.l1, g.ini], [c.l2, g.ini + g.sw]]) {
      const dir = V.polar([0, 0], 1, ang * RAD);
      const alc = Math.max(V.dot(V.sub(lin[0], g.Vx), dir), V.dot(V.sub(lin[1], g.Vx), dir));
      if (alc < g.R - (gap / k)) {
        const a = C.M(V.add(g.Vx, V.mul(dir, alc))), b = C.M(V.add(g.Vx, V.mul(dir, g.R)));
        const e = V.norm(V.sub(b, a)), seg = [V.add(a, V.mul(e, gap)), V.add(b, V.mul(e, over))];
        linea(seg[0], seg[1]); info.aux.push(seg);
      }
    }
    const s = T.cifraCota(c, doc, g.sw), tw = T.anchoCifra(s, h);
    const pm = C.M(V.polar(g.Vx, g.R, (g.ini + g.sw / 2) * RAD)), rp = V.norm(V.sub(pm, C.M(g.Vx)));
    const cen = V.add(pm, V.mul(rp, 1.2 + 0.5 * (Math.abs(rp[0]) * tw + Math.abs(rp[1]) * h)));
    const base = [cen[0] - tw / 2, cen[1] + h / 2];
    texto(P, s, base, [1, 0], h, colT); info.cajas.push(cajaTexto(base, [1, 0], tw, h));
    info.puntos = [C.M(g.Vx)];
  }
  return { P, info };
}

/* ----------------------------------------------------------- símbolos de huecos */
function huecoPrims(e, C) {
  const geo = C.geo, g = geo.paredes.get(e.pared), H = geo.hueco(e);
  if (!g || !H) return [];
  const P = [], col = C.capa(e.capa || 'paredes').color, fina = 0.25, M = C.M;
  const abre = e.abre === -1 ? -1 : 1, n = V.mul(g.nl, abre), t = g.t, w = H.w;
  const cara = (p, lado) => V.add(p, V.mul(g.nl, lado * t / 2));
  const arco = (cen, r, a0, sw) => { const pts = [], nn = segsCirculo(r * C.k, Math.abs(sw)); for (let i = 0; i <= nn; i++) pts.push(M(V.polar(cen, r, (a0 + sw * i / nn) * RAD))); return pts; };
  const L = (pts, ww, d) => P.push({ k: 'L', p: pts, w: ww, c: col, d: d || null });
  const clase = e.clase || 'puerta';
  if (clase === 'puerta' || clase === 'puerta-doble') {
    const hojas = clase === 'puerta-doble' ? [[H.ini, H.fin, w / 2], [H.fin, H.ini, w / 2]] : [[e.bisagra === 'fin' ? H.fin : H.ini, e.bisagra === 'fin' ? H.ini : H.fin, w]];
    for (const [bis, otro, ww] of hojas) {
      const h0 = V.add(bis, V.mul(n, t / 2));
      const dirOtro = V.norm(V.sub(otro, bis));
      const punta = V.add(h0, V.mul(n, ww));
      L([M(h0), M(punta)], 0.35);
      const a0 = T.deg(V.ang(n)), a1 = T.deg(V.ang(dirOtro));
      let sw = T.norm360(a1 - a0); if (sw > 180) sw -= 360;
      L(arco(h0, ww, a0, sw), fina);
    }
    // umbral fino
    L([M(cara(H.ini, -abre)), M(cara(H.fin, -abre))], 0.13);
  } else if (clase === 'corredera') {
    const m = V.mid(H.ini, H.fin), e1 = V.mul(g.nl, t * 0.12), e2 = V.mul(g.nl, -t * 0.12), g2 = V.mul(g.d, 30);
    const rect = (a, b, off) => { const q0 = V.add(a, off), q1 = V.add(b, off), o2 = V.mul(g.nl, t * 0.1 * Math.sign(V.dot(off, g.nl) || 1)); return [q0, q1, V.add(q1, o2), V.add(q0, o2)].map(M); };
    P.push({ k: 'L', p: rect(H.ini, V.add(m, g2), e1), z: true, w: fina, c: col });
    P.push({ k: 'L', p: rect(V.sub(m, g2), H.fin, e2), z: true, w: fina, c: col });
  } else if (clase === 'ventana' || clase === 'balconera') {
    L([M(cara(H.ini, 1)), M(cara(H.fin, 1))], fina);
    L([M(cara(H.ini, -1)), M(cara(H.fin, -1))], fina);
    const v1 = V.mul(g.nl, t * 0.08);
    L([M(V.add(H.ini, v1)), M(V.add(H.fin, v1))], fina);
    L([M(V.sub(H.ini, v1)), M(V.sub(H.fin, v1))], fina);
  } else {
    L([M(cara(H.ini, 1)), M(cara(H.fin, 1))], fina, [3, 1.5]);
    L([M(cara(H.ini, -1)), M(cara(H.fin, -1))], fina, [3, 1.5]);
  }
  return P;
}

/* ------------------------------------------------------------------ construir */
const ORDEN = { suelo: 0, rayado: 1, pared: 2, hueco: 3, bloque: 4, linea: 5, polilinea: 5, circulo: 5, arco: 5, texto: 6, cota: 7 };
T.construir = (doc, geo, opc) => {
  opc = opc || {};
  const C = contexto(doc, geo, opc);
  const prims = [], porEnt = new Map(), cotas = new Map();
  const visible = e => { const c = C.capa(e.capa || capaPorDefecto(e)); return !c || c.visible !== false; };
  const ents = doc.entidades.filter(visible).slice().sort((a, b) => (ORDEN[a.tipo] || 5) - (ORDEN[b.tipo] || 5));
  const k = C.k, M = C.M;
  // las paredes: primero todos los contornos (doble de gruesos) y luego todos los rellenos
  const paredes = ents.filter(e => e.tipo === 'pared');
  const rellenoPared = opc.rellenoPared || '#cfc8b6';
  const fondoP = [], frenteP = [];
  for (const e of paredes) {
    const g = geo.paredes.get(e.id); if (!g) continue;
    const st = C.estilo(e, 'paredes'), propios = [];
    for (const pz of g.piezas) {
      const pts = pz.pts.map(M);
      fondoP.push({ k: 'L', p: pts, z: true, w: st.w * 2 + 0.3, c: st.c, j: 'round' });
      frenteP.push({ k: 'F', r: [pts], c: e.relleno || rellenoPared, b: 0.3 }); // el borde del color del relleno tapa las juntas
      propios.push({ k: 'L', p: pts, z: true, w: st.w, c: st.c });
    }
    porEnt.set(e.id, propios);
  }
  let paredesPuestas = false;
  for (const e of ents) {
    let P = [];
    const st = C.estilo(e, capaPorDefecto(e));
    switch (e.tipo) {
      case 'pared':
        if (!paredesPuestas) { prims.push(...fondoP, ...frenteP); paredesPuestas = true; }
        continue;
      case 'suelo': {
        if (!opc.suelos) continue;
        const pts = e.pts.map(M);
        P.push({ k: 'F', r: [pts], c: e.color || '#e8dcc6', a: 0.55 });
        if (opc.areas !== false) {
          const a = Math.abs(T.areaPoli(e.pts)) / 1e6, cen = V.mul(e.pts.reduce((s, p) => V.add(s, p), [0, 0]), 1 / e.pts.length);
          const txt = (e.nombre ? e.nombre + ' · ' : '') + T.fmt(a, 2) + ' m²', hh = 3;
          const q = M(cen); P.push({ k: 'T', x: q[0] - T.anchoTexto(txt, hh) / 2, y: q[1] + hh / 2, s: txt, h: hh, a: 0, c: '#55605a' });
        }
        break;
      }
      case 'linea': P.push({ k: 'L', p: [M(e.a), M(e.b)], w: st.w, d: st.d, c: st.c }); break;
      case 'polilinea': P.push({ k: 'L', p: e.pts.map(M), z: !!e.cerrada, w: st.w, d: st.d, c: st.c }); break;
      case 'circulo': {
        const n = segsCirculo(e.r * k, 360), pts = [];
        for (let i = 0; i < n; i++) pts.push(M(V.polar(e.c, e.r, i / n * 2 * Math.PI)));
        P.push({ k: 'L', p: pts, z: true, w: st.w, d: st.d, c: st.c });
        break;
      }
      case 'arco': {
        const sw = T.norm360(e.a1 - e.a0) || 360, n = segsCirculo(e.r * k, sw), pts = [];
        for (let i = 0; i <= n; i++) pts.push(M(V.polar(e.c, e.r, (e.a0 + sw * i / n) * RAD)));
        P.push({ k: 'L', p: pts, w: st.w, d: st.d, c: st.c });
        break;
      }
      case 'texto': {
        const h = e.h || 3.5, a = (e.ang || 0) * RAD, t = [Math.cos(a), -Math.sin(a)], tw = T.anchoTexto(e.txt || '', h);
        let base = M(e.p);
        if (e.al === 'c') base = V.sub(base, V.mul(t, tw / 2)); else if (e.al === 'r') base = V.sub(base, V.mul(t, tw));
        P.push({ k: 'T', x: base[0], y: base[1], s: e.txt || '', h, a, c: st.c });
        P.caja = cajaTexto(base, t, tw, h);
        break;
      }
      case 'rayado': {
        const anillos = e.anillos || [];
        if (e.solido) P.push({ k: 'F', r: anillos.map(r => r.map(M)), c: e.color || st.c, a: 0.35 });
        else for (const s of T.lineasRayado(anillos, e.ang != null ? e.ang : 45, (e.sep || 2.5) / k)) P.push({ k: 'L', p: [M(s[0]), M(s[1])], w: st.w, c: st.c });
        break;
      }
      case 'hueco': P = huecoPrims(e, C); break;
      case 'bloque': {
        const b = geo.bloque(e), cap = C.capa(e.capa || 'mobiliario');
        if (opc.colorMuebles && b.lineas[0]) P.push({ k: 'F', r: [b.esquinas.map(M)], c: e.color || '#d9cdb4', a: 0.5 });
        for (const l of b.lineas) {
          const ww = e.pluma != null ? e.pluma : (l.gruesa ? 0.5 : cap.grosor);
          const tr = T.TRAZOS[l.trazo || e.trazo || cap.trazo] || T.TRAZOS.continua;
          const pts = l.pts.map(M);
          if (l.relleno) P.push({ k: 'F', r: [pts], c: l.relleno });
          P.push({ k: 'L', p: pts, z: !!l.cerr, w: ww, d: tr.d, c: e.colorLinea || cap.color });
        }
        for (const tx of b.textos) { const q = M(tx.p), tw = T.anchoTexto(tx.txt, tx.h); P.push({ k: 'T', x: q[0] - tw / 2, y: q[1] + tx.h / 2, s: tx.txt, h: tx.h, a: 0, c: cap.color }); }
        P.caja = b.esquinas.map(M);
        break;
      }
      case 'cota': {
        const r = cotaPrims(e, C); P = r.P; cotas.set(e.id, r.info);
        break;
      }
      default: continue;
    }
    prims.push(...P);
    porEnt.set(e.id, P);
  }
  if (!paredesPuestas && fondoP.length) prims.unshift(...fondoP, ...frenteP);
  return { prims, porEnt, cotas, C };
};
/* trazos de una sola entidad (vistas previas mientras se dibuja) */
T.primsEntidad = (doc, geo, e, opc) => {
  if (e.tipo === 'cota') return cotaPrims(e, contexto(doc, geo, opc || {})).P;
  const ents = [e];
  if (e.tipo === 'hueco') { const w = geo.ents.get(e.pared); if (w) ents.unshift(w); }
  const d2 = Object.assign({}, doc, { entidades: ents });
  const r = T.construir(d2, T.Geo(d2, geo.cat), opc);
  return r.porEnt.get(e.id) || [];
};
function capaPorDefecto(e) {
  return { cota: 'cotas', pared: 'paredes', hueco: 'paredes', bloque: 'mobiliario', rayado: 'rayado', texto: 'texto', suelo: 'paredes' }[e.tipo] || '0';
}
T.capaPorDefecto = capaPorDefecto;

/* ------------------------------------------------------------------- pintar */
/* cx ya tiene la transformación papel(mm) → píxeles; mm1px = mm de papel que ocupa un píxel */
T.pintar = (cx, prims, opc) => {
  opc = opc || {};
  const mm1px = opc.mm1px || 0.1, color = opc.color || null, extra = opc.extra || 0;
  cx.lineJoin = 'miter'; cx.lineCap = 'butt';
  for (const p of prims) {
    if (p.k === 'L') {
      if (p.p.length < 2) continue;
      cx.beginPath(); cx.moveTo(p.p[0][0], p.p[0][1]);
      for (let i = 1; i < p.p.length; i++) cx.lineTo(p.p[i][0], p.p[i][1]);
      if (p.z) cx.closePath();
      const minPx = p.w >= 0.45 ? 1.8 : 1;
      cx.lineWidth = Math.max(p.w, minPx * mm1px) + extra * mm1px;
      cx.setLineDash(p.d && !opc.sinTrazos ? p.d : []);
      cx.strokeStyle = color || p.c;
      cx.lineJoin = p.j || 'miter';
      cx.stroke();
    } else if (p.k === 'F') {
      if (opc.sinRellenos) continue;
      cx.beginPath();
      for (const r of p.r) { if (!r.length) continue; cx.moveTo(r[0][0], r[0][1]); for (let i = 1; i < r.length; i++) cx.lineTo(r[i][0], r[i][1]); cx.closePath(); }
      cx.globalAlpha = (p.a != null ? p.a : 1) * (opc.alfa != null ? opc.alfa : 1);
      cx.fillStyle = color || p.c; cx.fill('evenodd');
      if (p.b && !color) { cx.lineWidth = p.b; cx.setLineDash([]); cx.strokeStyle = p.c; cx.stroke(); }
      cx.globalAlpha = 1;
    } else if (p.k === 'T') {
      cx.save(); cx.translate(p.x, p.y); if (p.a) cx.rotate(-p.a);
      cx.font = (p.h / CAP) + 'px ' + FUENTE; cx.fillStyle = color || p.c; cx.textBaseline = 'alphabetic';
      cx.fillText(p.s, 0, 0); cx.restore();
    }
  }
  cx.setLineDash([]);
};
T.pintarPDF = (pdf, prims) => {
  pdf.setLineJoin('miter'); pdf.setLineCap('butt');
  pdf.setFont('helvetica', 'normal');
  for (const p of prims) {
    if (p.k === 'L') {
      if (p.p.length < 2) continue;
      pdf.setLineWidth(p.w); pdf.setDrawColor(p.c); pdf.setLineDashPattern(p.d || [], 0); pdf.setLineJoin(p.j || 'miter');
      const d = []; for (let i = 1; i < p.p.length; i++) d.push([p.p[i][0] - p.p[i - 1][0], p.p[i][1] - p.p[i - 1][1]]);
      pdf.lines(d, p.p[0][0], p.p[0][1], [1, 1], 'S', !!p.z);
    } else if (p.k === 'F') {
      pdf.setFillColor(p.c);
      if (p.a != null && p.a < 1 && pdf.GState) { pdf.setGState(new pdf.GState({ opacity: p.a })); }
      if (p.b) { pdf.setDrawColor(p.c); pdf.setLineWidth(p.b); pdf.setLineDashPattern([], 0); }
      for (const r of p.r) { if (r.length < 3) continue; const d = []; for (let i = 1; i < r.length; i++) d.push([r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]]); pdf.lines(d, r[0][0], r[0][1], [1, 1], p.b ? 'FD' : 'F', true); }
      if (p.a != null && p.a < 1 && pdf.GState) pdf.setGState(new pdf.GState({ opacity: 1 }));
    } else if (p.k === 'T') {
      if (!p.s) continue;
      pdf.setFontSize(p.h / CAP / 0.352778); pdf.setTextColor(p.c);
      pdf.text(p.s, p.x, p.y, { angle: p.a ? p.a / RAD : 0, baseline: 'alphabetic' });
    }
  }
  pdf.setLineDashPattern([], 0);
};

})(window);
