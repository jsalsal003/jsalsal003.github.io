/* ===================================================================
   VISTAS 3D — núcleo compartido por la herramienta (modo Reto) y el corrector del profesor.
   Batería del Reto, cálculo de las vistas correctas, nota y código que va dentro del QR.
   © 2026 Juan Salguero Salguero · CC BY-NC-SA 4.0
   =================================================================== */
var VistasNucleo = (function () {
  'use strict';

  /* ---------- batería del Reto: 30 piezas que no salen en la práctica ----------
     t: tipo (1 = cubos 2×2×2, 2 = cubos 3×3×3, 3 = 2×2×2 con caras inclinadas).
     Tipos 1 y 2: capas de abajo arriba; en cada capa, filas de atrás a delante; "1" = cubo.
     Tipo 3: celdas [x, y, z, tipo] como en el Nivel 3 de la herramienta. */
  var BATERIA = [
    // tipo 1 (12)
    { t: 1, p: ['11 11', '01 00'] }, { t: 1, p: ['11 11', '00 01'] }, { t: 1, p: ['11 11', '01 01'] },
    { t: 1, p: ['11 11', '11 01'] }, { t: 1, p: ['11 11', '01 11'] }, { t: 1, p: ['01 11', '01 01'] },
    { t: 1, p: ['11 01', '11 01'] }, { t: 1, p: ['10 11', '10 00'] }, { t: 1, p: ['11 01', '01 00'] },
    { t: 1, p: ['01 11', '00 11'] }, { t: 1, p: ['10 11', '00 11'] }, { t: 1, p: ['11 00', '01 01'] },
    // tipo 2 (8)
    { t: 2, p: ['111 111 111', '111 010 000', '010 000 000'] },
    { t: 2, p: ['111 111 111', '110 100 000', '000 000 000'] },
    { t: 2, p: ['111 101 111', '111 101 111', '000 000 000'] },
    { t: 2, p: ['111 111 111', '001 001 001', '001 001 001'] },
    { t: 2, p: ['110 110 110', '110 110 110', '100 100 100'] },
    { t: 2, p: ['111 111 111', '010 010 010', '010 010 010'] },
    { t: 2, p: ['111 000 111', '111 000 111', '111 111 111'] },
    { t: 2, p: ['111 111 111', '100 111 001', '100 000 001'] },
    // tipo 3 (10)
    { t: 3, p: [[0, 0, 0, '1'], [1, 0, 0, '1'], [0, 1, 0, '1'], [1, 1, 0, '1'], [0, 0, 1, 'y10'], [0, 1, 1, 'y10'], [1, 0, 1, '1'], [1, 1, 1, '1']] },
    { t: 3, p: [[0, 0, 0, '1'], [1, 0, 0, '1'], [0, 1, 0, 'x00'], [1, 1, 0, 'x00'], [0, 0, 1, 'x00'], [1, 0, 1, 'x00']] },
    { t: 3, p: [[0, 0, 0, '1'], [1, 0, 0, '1'], [0, 1, 0, '1'], [1, 1, 0, '1'], [0, 1, 1, '1'], [1, 1, 1, '1'], [0, 0, 1, 'x10'], [1, 0, 1, 'x10']] },
    { t: 3, p: [[0, 0, 0, '1'], [1, 0, 0, '1'], [0, 1, 0, '1'], [1, 1, 0, '1'], [0, 0, 1, '1'], [0, 1, 1, '1'], [1, 1, 1, 'y00']] },
    { t: 3, p: [[0, 1, 0, '1'], [1, 1, 0, '1'], [0, 0, 0, 'z11'], [1, 0, 0, 'z01'], [0, 1, 1, '1'], [1, 1, 1, '1']] },
    { t: 3, p: [[0, 0, 0, '1'], [1, 0, 0, '1'], [0, 1, 0, '1'], [1, 1, 0, '1'], [0, 1, 1, '1'], [1, 1, 1, 'y00'], [0, 0, 1, 'x10']] },
    { t: 3, p: [[0, 0, 0, 'x10'], [1, 0, 0, 'x10'], [0, 1, 0, '1'], [1, 1, 0, '1'], [0, 1, 1, '1'], [1, 1, 1, '1']] },
    { t: 3, p: [[0, 0, 0, '1'], [0, 1, 0, '1'], [1, 1, 0, '1'], [1, 0, 0, 'z01'], [0, 0, 1, '1'], [0, 1, 1, '1'], [1, 1, 1, '1'], [1, 0, 1, 'z01']] },
    { t: 3, p: [[0, 0, 0, '1'], [1, 0, 0, '1'], [0, 1, 0, '1'], [1, 1, 0, '1'], [0, 0, 1, 'x10'], [1, 0, 1, 'x10'], [0, 1, 1, 'x00'], [1, 1, 1, 'x00']] },
    { t: 3, p: [[0, 0, 0, '1'], [1, 0, 0, 'y00'], [0, 1, 0, '1'], [1, 1, 0, '1'], [0, 0, 1, '1'], [0, 1, 1, 'x00']] }
  ];
  var RECETA = { 1: 2, 2: 1, 3: 2 }; // cuántas piezas de cada tipo salen en un Reto (en este orden)
  var MINUTOS = 30;

  function tam(b) { return b.t === 2 ? 3 : 2; }
  function diag(b) { return b.t === 3; }
  // occ[x][y][z]: 0 vacío, 1 cubo, {ax, a, b} cuña
  function ocupacion(b) {
    var N = tam(b), o = [];
    for (var x = 0; x < N; x++) { o.push([]); for (var y = 0; y < N; y++) { o[x].push([]); for (var z = 0; z < N; z++) o[x][y].push(0); } }
    if (b.t === 3) b.p.forEach(function (c) { o[c[0]][c[1]][c[2]] = c[3] === '1' ? 1 : { ax: c[3][0], a: +c[3][1], b: +c[3][2] }; });
    else b.p.forEach(function (capa, z) { capa.split(' ').forEach(function (f, i) { for (var x = 0; x < N; x++) o[x][N - 1 - i][z] = f[x] === '1' ? 1 : 0; }); });
    return o;
  }

  /* ---------- tramos de la plantilla ---------- */
  function claves(N, conDiag) {
    var k = [];
    if (conDiag) for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) { k.push('d' + i + ',' + j + ',0'); k.push('d' + i + ',' + j + ',1'); }
    for (var b = 0; b <= N; b++) for (var c = 0; c < N; c++) { k.push('v' + b + ',' + c); k.push('h' + c + ',' + b); }
    return k;
  }
  function segUV(key) {
    var p = key.slice(1).split(',').map(Number), t = key[0];
    if (t === 'h') return [p[0], p[1], p[0] + 1, p[1]];
    if (t === 'v') return [p[0], p[1], p[0], p[1] + 1];
    return p[2] === 0 ? [p[0], p[1], p[0] + 1, p[1] + 1] : [p[0] + 1, p[1], p[0], p[1] + 1];
  }

  /* ---------- vistas correctas por rayos (vale para cubos y cuñas) ---------- */
  function solucion(b, vista) {
    var N = tam(b), occ = ocupacion(b), out = {}, E = 0.02;
    function cell(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < N && y < N && z < N ? occ[x][y][z] : 0; }
    function dentro(x, y, z) {
      var cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z), c = cell(cx, cy, cz);
      if (!c) return false; if (c === 1) return true;
      var l = { x: x - cx, y: y - cy, z: z - cz }, pq = c.ax === 'x' ? ['y', 'z'] : c.ax === 'y' ? ['x', 'z'] : ['x', 'y'];
      var p = l[pq[0]], q = l[pq[1]];
      return (c.a ? 1 - p : p) + (c.b ? 1 - q : q) <= 1;
    }
    var RAY = {
      alzado: function (U, V, D) { return [U, D, V]; }, planta: function (U, V, D) { return [U, V, N - D]; },
      izq: function (U, V, D) { return [D, N - U, V]; }, der: function (U, V, D) { return [N - D, U, V]; }
    }[vista];
    function cruces(U, V) {
      var res = [], step = 1 / 64, prev = false;
      function ins(D) { var p = RAY(U, V, D); return dentro(p[0], p[1], p[2]); }
      for (var D = -step; D <= N + step; D += step) {
        var now = ins(D);
        if (now !== prev) { var lo = D - step, hi = D; for (var i = 0; i < 22; i++) { var m = (lo + hi) / 2; if (ins(m) === prev) lo = m; else hi = m; } res.push((lo + hi) / 2); prev = now; }
      }
      return res;
    }
    claves(N, diag(b)).forEach(function (key) {
      var s = segUV(key), du = s[2] - s[0], dv = s[3] - s[1], L = Math.hypot(du, dv), nu = -dv / L, nv = du / L, vis = 0, hid = 0;
      [0.2, 0.35, 0.5, 0.65, 0.8].forEach(function (t) {
        var u = s[0] + du * t, v = s[1] + dv * t;
        var A1 = cruces(u + nu * E, v + nv * E), A3 = cruces(u + nu * 3 * E, v + nv * 3 * E), B1 = cruces(u - nu * E, v - nv * E), B3 = cruces(u - nu * 3 * E, v - nv * 3 * E);
        function surf(X1, X3, sg) { if (X1.length !== X3.length) return null; return X1.map(function (d, i) { var sl = (X3[i] - d) / (2 * E); return { d: d - sl * E, s: sl * sg }; }); }
        var a = surf(A1, A3, 1), c = surf(B1, B3, -1);
        function igual(x, y) { return Math.abs(x.d - y.d) < 0.006 && Math.abs(x.s - y.s) < 0.25; }
        if (!a || !c) { hid++; return; }
        var primera = (a.length === 0) !== (c.length === 0) || (a.length && c.length && !igual(a[0], c[0]));
        var alguna = a.length !== c.length || a.some(function (x, i) { return !igual(x, c[i]); });
        if (primera) vis++; else if (alguna) hid++;
      });
      if (vis >= 3) out[key] = 'solid'; else if (vis + hid >= 3) out[key] = 'dashed';
    });
    return out;
  }

  /* ---------- corrección de una vista ---------- */
  function corregirVista(sol, mia) {
    var faltan = [], sobran = [], tipo = [];
    Object.keys(sol).forEach(function (k) { if (!mia[k]) faltan.push(k); else if (mia[k] !== sol[k]) tipo.push(k); });
    Object.keys(mia).forEach(function (k) { if (!sol[k]) sobran.push(k); });
    return { ok: !faltan.length && !sobran.length && !tipo.length, faltan: faltan, sobran: sobran, tipo: tipo };
  }
  // reto = { piezas:[idx…], perfil:'izq'|'der', dibujos:[{alzado:{},planta:{},izq:{},der:{}}…] }
  function corregir(reto) {
    var vistas = ['alzado', 'planta', reto.perfil], bien = 0, total = 0;
    var piezas = reto.piezas.map(function (idx, i) {
      var b = BATERIA[idx], d = reto.dibujos[i] || {}, res = {};
      vistas.forEach(function (v) { var r = corregirVista(solucion(b, v), d[v] || {}); res[v] = r; total++; if (r.ok) bien++; });
      return { idx: idx, tipo: b.t, vistas: res };
    });
    return { piezas: piezas, bien: bien, total: total, nota: Math.round(bien / total * 100) / 10 };
  }

  /* ---------- elegir las piezas de un Reto ---------- */
  function elegir(rand) {
    rand = rand || Math.random;
    var out = [];
    [1, 2, 3].forEach(function (t) {
      var pool = []; BATERIA.forEach(function (b, i) { if (b.t === t) pool.push(i); });
      for (var n = 0; n < RECETA[t]; n++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    });
    return out;
  }

  /* ---------- código del QR (compacto; lleva los dibujos para poder corregir) ----------
     bytes: versión · inicio (s, 4) · duración (s, 2) · perfil · 5 índices · tramos (2 bits: 0 nada, 1 continua, 2 discontinua)
            · nombre y curso (UTF-8 con su longitud) · suma de control (2) → base64url */
  var VER = 1;
  function utf8(s) { return Array.from(new TextEncoder().encode(s || '')); }
  function suma(bytes) { var h = 0x811c; for (var i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = (h * 0x0193) & 0xffff; } return h; }
  function codificar(r) {
    var B = [VER], ini = Math.floor(r.inicio / 1000), dur = Math.min(65535, Math.round(r.duracion / 1000));
    B.push((ini >>> 24) & 255, (ini >>> 16) & 255, (ini >>> 8) & 255, ini & 255, (dur >>> 8) & 255, dur & 255, r.perfil === 'der' ? 1 : 0);
    r.piezas.forEach(function (i) { B.push(i); });
    var bits = [];
    r.piezas.forEach(function (idx, i) {
      var b = BATERIA[idx], d = r.dibujos[i] || {};
      ['alzado', 'planta', r.perfil].forEach(function (v) {
        var m = d[v] || {};
        claves(tam(b), diag(b)).forEach(function (k) { var s = m[k] === 'solid' ? 1 : m[k] === 'dashed' ? 2 : 0; bits.push(s >> 1, s & 1); });
      });
    });
    for (var i = 0; i < bits.length; i += 8) { var by = 0; for (var j = 0; j < 8; j++) by = (by << 1) | (bits[i + j] || 0); B.push(by); }
    [r.nombre, r.curso].forEach(function (s) { var u = utf8(s).slice(0, 60); B.push(u.length); B.push.apply(B, u); });
    var h = suma(B); B.push(h >> 8, h & 255);
    var bin = String.fromCharCode.apply(null, B);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodificar(txt) {
    var m = /[#?&]r=([A-Za-z0-9_-]+)/.exec(txt); if (m) txt = m[1];
    txt = txt.trim().replace(/-/g, '+').replace(/_/g, '/'); while (txt.length % 4) txt += '=';
    var bin = atob(txt), B = []; for (var i = 0; i < bin.length; i++) B.push(bin.charCodeAt(i));
    if (B.length < 20) throw new Error('Código demasiado corto');
    var h = (B[B.length - 2] << 8) | B[B.length - 1], body = B.slice(0, -2);
    if (suma(body) !== h) throw new Error('El código está dañado o se ha modificado');
    if (body[0] !== VER) throw new Error('Versión de código desconocida');
    var p = 1, ini = ((body[p] << 24) >>> 0) + (body[p + 1] << 16) + (body[p + 2] << 8) + body[p + 3]; p += 4;
    var dur = (body[p] << 8) | body[p + 1]; p += 2;
    var perfil = body[p++] ? 'der' : 'izq', piezas = body.slice(p, p + 5); p += 5;
    var nbits = 0; piezas.forEach(function (idx) { var b = BATERIA[idx]; nbits += 3 * claves(tam(b), diag(b)).length * 2; });
    var nbytes = Math.ceil(nbits / 8), bits = [];
    body.slice(p, p + nbytes).forEach(function (by) { for (var j = 7; j >= 0; j--) bits.push((by >> j) & 1); }); p += nbytes;
    var bi = 0, dibujos = piezas.map(function (idx) {
      var b = BATERIA[idx], d = {};
      ['alzado', 'planta', perfil].forEach(function (v) {
        d[v] = {};
        claves(tam(b), diag(b)).forEach(function (k) { var s = bits[bi] * 2 + bits[bi + 1]; bi += 2; if (s) d[v][k] = s === 1 ? 'solid' : 'dashed'; });
      });
      return d;
    });
    var txts = [];
    for (var t = 0; t < 2; t++) { var len = body[p++]; txts.push(new TextDecoder().decode(new Uint8Array(body.slice(p, p + len)))); p += len; }
    return { inicio: ini * 1000, duracion: dur * 1000, perfil: perfil, piezas: piezas, dibujos: dibujos, nombre: txts[0], curso: txts[1] };
  }

  return { BATERIA: BATERIA, MINUTOS: MINUTOS, tam: tam, diag: diag, ocupacion: ocupacion, claves: claves, segUV: segUV,
    solucion: solucion, corregir: corregir, corregirVista: corregirVista, elegir: elegir, codificar: codificar, decodificar: decodificar };
})();
