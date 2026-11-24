/* ===========================================================================
   TALLER · paneles laterales: propiedades del objeto, capas y bibliotecas
   © 2026 Juan Salguero Salguero · CC BY-NC-SA 4.0
   =========================================================================== */
(function (W) {
'use strict';
const T = W.Taller, V = T.V, RAD = T.RAD;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
T.esc = esc;
const NOMBRES_MEDIDA = { ancho: ['Ancho', 'Width'], fondo: ['Fondo', 'Depth'], alto: ['Alto', 'Height'], antepecho: ['Antepecho', 'Sill height'],
  peldanos: ['Peldaños', 'Steps'], baldas: ['Baldas', 'Shelves'], altura_suelo: ['Altura desde el suelo', 'Height above floor'] };
const CLASES_HUECO = [['puerta', 'Puerta', 'Door'], ['puerta-doble', 'Puerta doble', 'Double door'], ['corredera', 'Corredera', 'Sliding door'],
  ['ventana', 'Ventana', 'Window'], ['balconera', 'Balconera', 'French window'], ['abertura', 'Abertura', 'Opening']];
const TEXTURAS = [['parquet', 'Parqué', 'Parquet'], ['baldosa', 'Baldosa', 'Tiles'], ['moqueta', 'Moqueta', 'Carpet'], ['liso', 'Liso', 'Plain']];
T.TEXTURAS = TEXTURAS;

T.Panel = function (el, ed, opc) {
  opc = opc || {};
  const P = { el };
  const f = () => T.UNI[ed.doc.unidad];
  const u = () => ed.doc.unidad;
  const L = mm => T.fmt(mm / f(), 3);
  const cambiar = (fn, motivo) => ed.cambiar(fn, motivo || 'propiedad');
  let cola = 0;
  P.actualizar = () => { if (!cola) cola = requestAnimationFrame(pintar); };

  /* ------------------------------------------------ controles */
  function fila(es, en, control) {
    const d = document.createElement('label'); d.className = 'campo';
    d.innerHTML = '<span>' + es + (en ? '<small>' + en + '</small>' : '') + '</span>';
    d.appendChild(control); return d;
  }
  function entrada(valor, cb, k, extra) {
    const i = document.createElement('input'); i.type = 'text'; i.inputMode = 'decimal'; i.value = valor; i.dataset.k = k || '';
    i.addEventListener('change', () => cb(i.value, i));
    i.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); i.blur(); } ev.stopPropagation(); });
    if (extra) Object.assign(i, extra);
    return i;
  }
  function num(valor, cb, k, unidad) {
    const i = entrada(valor, (v, inp) => { const n = T.num(v); if (isNaN(n)) { inp.value = valor; return; } cb(n); }, k);
    if (!unidad) return i;
    const w = document.createElement('span'); w.className = 'uni'; w.appendChild(i); const em = document.createElement('em'); em.textContent = unidad; w.appendChild(em); return w;
  }
  function longitud(mm, cb, k) { return num(L(mm), n => cb(n * f()), k, u()); }
  function par(a, b) { const d = document.createElement('div'); d.className = 'xy2'; d.appendChild(a); d.appendChild(b); return d; }
  function punto(p, cb, k) { return par(longitud(p[0], x => cb([x, p[1]]), k + 'x'), longitud(p[1], y => cb([p[0], y]), k + 'y')); }
  function lista(opciones, valor, cb, k) {
    const s = document.createElement('select'); s.dataset.k = k || '';
    for (const o of opciones) { const op = document.createElement('option'); op.value = o[0]; op.textContent = o[1] + (o[2] ? ' · ' + o[2] : ''); if (String(o[0]) === String(valor)) op.selected = true; s.appendChild(op); }
    s.addEventListener('change', () => cb(s.value));
    s.addEventListener('keydown', ev => ev.stopPropagation());
    return s;
  }
  function marca(valor, cb, k) { const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!valor; i.dataset.k = k || ''; i.addEventListener('change', () => cb(i.checked)); return i; }
  function color(valor, cb, k) { const i = document.createElement('input'); i.type = 'color'; i.value = valor || '#cccccc'; i.dataset.k = k || ''; i.addEventListener('change', () => cb(i.value)); return i; }
  function boton(txt, cb, clase) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip ' + (clase || ''); b.innerHTML = txt; b.addEventListener('click', cb); return b; }
  function sub(txt) { const d = document.createElement('div'); d.className = 'sub'; d.textContent = txt; return d; }
  function nota(html, clase) { const d = document.createElement('p'); d.className = 'nota ' + (clase || ''); d.innerHTML = html; return d; }
  const capasOp = () => ed.doc.capas.map(c => [c.id, c.nombre, c.en]);
  const trazoOp = [['', 'Según la capa', 'By layer'], ['continua', 'Continua', 'Continuous'], ['oculta', 'Discontinua', 'Dashed'], ['eje', 'Trazo y punto', 'Chain']];
  const grosorOp = [['', 'Según la capa', 'By layer']].concat(T.GROSORES.map(g => [g, T.fmt(g, 2) + ' mm', g >= 0.5 ? 'gruesa' : g >= 0.35 ? 'media' : 'fina']));
  function estilo(cont, ents) {
    const e0 = ents[0], igual = k => ents.every(e => (e[k] || '') === (e0[k] || ''));
    cont.appendChild(fila('Capa', 'Layer', lista(capasOp(), igual('capa') ? e0.capa : '', v => cambiar(() => ents.forEach(e => { e.capa = v; })), 'capa')));
    if (ents.every(e => ['linea', 'polilinea', 'circulo', 'arco', 'bloque', 'pared'].includes(e.tipo))) {
      cont.appendChild(fila('Tipo de línea', 'Linetype', lista(trazoOp, igual('trazo') ? (e0.trazo || '') : '', v => cambiar(() => ents.forEach(e => { if (v) e.trazo = v; else delete e.trazo; })), 'trazo')));
      cont.appendChild(fila('Grosor', 'Lineweight', lista(grosorOp, igual('pluma') ? (e0.pluma == null ? '' : e0.pluma) : '', v => cambiar(() => ents.forEach(e => { if (v === '') delete e.pluma; else e.pluma = +v; })), 'pluma')));
    }
  }

  /* ------------------------------------------------ pintar el panel */
  function pintar() {
    cola = 0;
    const foco = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset.k : null;
    el.innerHTML = '';
    const ids = [...ed.sel].filter(id => ed.geo.ents.has(id));
    if (!ids.length) sinSeleccion();
    else if (ids.length === 1) una(ed.geo.ents.get(ids[0]));
    else varias(ids.map(id => ed.geo.ents.get(id)));
    if (opc.alPintar) opc.alPintar(el, ids);
    if (foco) { const n = el.querySelector('[data-k="' + foco + '"]'); if (n) { n.focus(); if (n.select) n.select(); } }
  }
  function cabecera(tit, en, borrar) {
    const h = document.createElement('h4'); h.innerHTML = esc(tit) + ' <small>' + esc(en) + '</small>';
    el.appendChild(h);
    if (borrar) { const b = boton('⌫ Borrar', () => cambiar(() => ed.borrar([...ed.sel]), 'borrar'), 'peligro'); b.style.marginLeft = 'auto'; h.appendChild(b); }
  }
  function sinSeleccion() {
    cabecera('Nada seleccionado', 'Nothing selected');
    el.appendChild(nota('Haz clic en un objeto para ver y cambiar sus medidas. Con un recuadro de izquierda a derecha se cogen los objetos que quedan dentro; de derecha a izquierda, también los que toca.'));
    const id = ed.herrId;
    if (ed.medicion && (ed.medicion.longitud != null || ed.medicion.area != null)) medicion();
    if (id === 'texto') { el.appendChild(sub('Texto nuevo · New text')); el.appendChild(fila('Altura de letra', 'Text height (mm)', lista([[2.5, '2,5 mm'], [3.5, '3,5 mm'], [5, '5 mm'], [7, '7 mm'], [10, '10 mm']], ed.opcTexto.h, v => { ed.opcTexto.h = +v; ed.herramienta('texto'); }, 'th'))); }
    if (id === 'rayado') {
      el.appendChild(sub('Rayado nuevo · New hatch'));
      el.appendChild(fila('Ángulo', 'Angle (°)', num(T.fmt(ed.opcRayado.ang, 1), n => { ed.opcRayado.ang = n; ed.herramienta('rayado'); }, 'ra')));
      el.appendChild(fila('Separación', 'Spacing (mm papel)', num(T.fmt(ed.opcRayado.sep, 2), n => { if (n > 0.3) ed.opcRayado.sep = n; ed.herramienta('rayado'); }, 'rs')));
    }
    if (id === 'pared' || id === 'habitacion') {
      el.appendChild(sub('Paredes nuevas · New walls'));
      el.appendChild(fila('Grosor', 'Thickness', longitud(ed.opcPared.grosor, n => { if (n > 0) ed.opcPared.grosor = n; ed.herramienta(id); }, 'pg')));
      el.appendChild(fila('Altura', 'Height', longitud(ed.opcPared.altura, n => { if (n > 0) ed.opcPared.altura = n; ed.herramienta(id); }, 'ph')));
      if (id === 'habitacion') {
        el.appendChild(fila('Ancho interior', 'Inner width', longitud(ed.opcHabitacion.ancho, n => { if (n > 0) ed.opcHabitacion.ancho = n; ed.herramienta(id); }, 'hx')));
        el.appendChild(fila('Largo interior', 'Inner length', longitud(ed.opcHabitacion.largo, n => { if (n > 0) ed.opcHabitacion.largo = n; ed.herramienta(id); }, 'hy')));
      }
    }
    el.appendChild(sub('Para los objetos nuevos · New objects'));
    el.appendChild(fila('Capa actual', 'Current layer', lista(capasOp(), ed.doc.capaActual, v => { ed.doc.capaActual = v; opc.alCapa && opc.alCapa(); }, 'ca')));
    if (opc.ayudaVacia) el.appendChild(nota(opc.ayudaVacia, 'mano'));
  }
  function medicion() {
    const m = ed.medicion, d = document.createElement('div'); d.className = 'medida';
    let h = '<div class="sub" style="margin-top:0">Medición · Measurement</div>';
    if (m.objeto) h += m.objeto + '<br>';
    if (m.longitud != null) h += (m.area != null && m.objeto ? 'Perímetro' : 'Longitud') + ': <b>' + L(m.longitud) + ' ' + u() + '</b><br>';
    if (m.dx != null && m.tramos === 1) h += 'Δx ' + L(m.dx) + ' · Δy ' + L(m.dy) + ' · ' + T.fmt(m.ang, 1) + '°<br>';
    if (m.area != null) h += 'Área: <b>' + T.fmt(m.area / (f() * f()), 2) + ' ' + u() + '²</b>' + (u() !== 'm' ? ' (' + T.fmt(m.area / 1e6, 3) + ' m²)' : '');
    d.innerHTML = h; el.appendChild(d);
  }
  function varias(ents) {
    const cuenta = {};
    ents.forEach(e => { const n = (T.NOMBRE_ENT[e.tipo] || [e.tipo])[0]; cuenta[n] = (cuenta[n] || 0) + 1; });
    cabecera(ents.length + ' objetos', 'Selection', true);
    el.appendChild(nota(Object.entries(cuenta).map(([n, c]) => c + ' × ' + n).join(' · ')));
    estilo(el, ents);
    const fl = document.createElement('div'); fl.className = 'filas';
    ['mover', 'copiar', 'girar', 'simetria', 'escalar'].forEach(h => { const m = T.herramienta(h); fl.appendChild(boton(T.icono(h) + m.nombre, () => ed.herramienta(h))); });
    el.appendChild(fl);
  }
  function una(e) {
    const [es, en] = T.NOMBRE_ENT[e.tipo] || [e.tipo, ''];
    let titulo = es, ingles = en;
    if (e.tipo === 'bloque') { const d = T.defBloque(ed.doc, ed.cat, e.ref); if (d) { titulo = d.nombre; ingles = d.en || en; } }
    if (e.tipo === 'hueco') { const c = CLASES_HUECO.find(x => x[0] === e.clase); if (c) { titulo = c[1]; ingles = c[2]; } }
    if (e.tipo === 'cota') { titulo = { lineal: 'Cota lineal', alineada: 'Cota alineada', angular: 'Cota angular', radio: 'Cota de radio', diametro: 'Cota de diámetro' }[e.clase]; ingles = 'Dimension'; }
    cabecera(titulo, ingles, true);
    const C = el, add = n => C.appendChild(n);
    const ch = (fn) => cambiar(fn);
    switch (e.tipo) {
      case 'linea': {
        add(fila('Punto A', 'Start (x, y)', punto(e.a, p => ch(() => { e.a = p; }), 'a')));
        add(fila('Punto B', 'End (x, y)', punto(e.b, p => ch(() => { e.b = p; }), 'b')));
        const l = V.dist(e.a, e.b), ang = T.norm360(T.deg(V.ang(V.sub(e.b, e.a))));
        add(fila('Longitud', 'Length', longitud(l, n => ch(() => { e.b = V.polar(e.a, n, ang * RAD); }), 'l')));
        add(fila('Ángulo', 'Angle (°)', num(T.fmt(ang, 2), n => ch(() => { e.b = V.polar(e.a, l, n * RAD); }), 'ang')));
        break;
      }
      case 'polilinea': {
        add(fila('Cerrada', 'Closed', marca(e.cerrada, v => ch(() => { e.cerrada = v; }), 'cer')));
        add(nota(e.pts.length + ' vértices · longitud ' + L(T.perimetro(e.pts, e.cerrada)) + ' ' + u() + (e.cerrada ? ' · área ' + T.fmt(Math.abs(T.areaPoli(e.pts)) / (f() * f()), 2) + ' ' + u() + '²' : '')));
        e.pts.slice(0, 12).forEach((p, i) => add(fila('Vértice ' + (i + 1), 'Vertex', punto(p, q => ch(() => { e.pts[i] = q; }), 'v' + i))));
        break;
      }
      case 'circulo':
        add(fila('Centro', 'Center (x, y)', punto(e.c, p => ch(() => { e.c = p; }), 'c')));
        add(fila('Radio', 'Radius', longitud(e.r, n => n > 0 && ch(() => { e.r = n; }), 'r')));
        add(fila('Diámetro', 'Diameter', longitud(2 * e.r, n => n > 0 && ch(() => { e.r = n / 2; }), 'd')));
        break;
      case 'arco':
        add(fila('Centro', 'Center (x, y)', punto(e.c, p => ch(() => { e.c = p; }), 'c')));
        add(fila('Radio', 'Radius', longitud(e.r, n => n > 0 && ch(() => { e.r = n; }), 'r')));
        add(fila('Ángulo inicial', 'Start angle (°)', num(T.fmt(e.a0, 2), n => ch(() => { e.a0 = T.norm360(n); }), 'a0')));
        add(fila('Ángulo final', 'End angle (°)', num(T.fmt(e.a1, 2), n => ch(() => { e.a1 = T.norm360(n); }), 'a1')));
        break;
      case 'texto':
        add(fila('Texto', 'Text', entrada(e.txt, v => ch(() => { e.txt = v; }), 'txt')));
        add(fila('Altura', 'Height (mm papel)', lista([[2.5, '2,5 mm'], [3.5, '3,5 mm'], [5, '5 mm'], [7, '7 mm'], [10, '10 mm'], [14, '14 mm']], e.h || 3.5, v => ch(() => { e.h = +v; }), 'h')));
        add(fila('Ángulo', 'Angle (°)', num(T.fmt(e.ang || 0, 2), n => ch(() => { e.ang = n; }), 'ang')));
        add(fila('Alineación', 'Alignment', lista([['l', 'Izquierda', 'Left'], ['c', 'Centro', 'Center'], ['r', 'Derecha', 'Right']], e.al || 'l', v => ch(() => { e.al = v; }), 'al')));
        add(fila('Posición', 'Insertion (x, y)', punto(e.p, p => ch(() => { e.p = p; }), 'p')));
        break;
      case 'rayado':
        add(fila('Ángulo', 'Angle (°)', num(T.fmt(e.ang != null ? e.ang : 45, 1), n => ch(() => { e.ang = n; }), 'ang')));
        add(fila('Separación', 'Spacing (mm papel)', num(T.fmt(e.sep || 2.5, 2), n => n > 0.3 && ch(() => { e.sep = n; }), 'sep')));
        add(fila('Relleno sólido', 'Solid fill', marca(e.solido, v => ch(() => { e.solido = v; }), 'sol')));
        break;
      case 'pared': {
        const g = ed.geo.paredes.get(e.id), l = V.dist(e.a, e.b), d = V.norm(V.sub(e.b, e.a));
        add(fila('Largo del eje', 'Length (axis)', longitud(l, n => n > 0 && ch(() => { const nb = V.add(e.a, V.mul(d, n)); for (const w of ed.doc.entidades) if (w.tipo === 'pared' && w !== e) { if (V.dist(w.a, e.b) < 1) w.a = nb.slice(); if (V.dist(w.b, e.b) < 1) w.b = nb.slice(); } e.b = nb; }), 'l')));
        add(fila('Grosor', 'Thickness', longitud(e.grosor || 150, n => n > 0 && ch(() => { e.grosor = n; }), 'g')));
        add(fila('Altura', 'Height', longitud(e.altura || ed.doc.casa.altura, n => n > 0 && ch(() => { e.altura = n; }), 'h')));
        if (opc.casa) add(fila('Color', 'Colour', color(e.colorPared || ed.doc.casa.colorPared, v => ch(() => { e.colorPared = v; }), 'col')));
        if (g) add(nota('Caras: ' + L(V.dist(g.aL, g.bL)) + ' y ' + L(V.dist(g.aR, g.bR)) + ' ' + u() + '. Los extremos unidos a otras paredes se mueven con ellas.'));
        add(fila('Punto A', 'Start (x, y)', punto(e.a, p => ch(() => { moverExtremo(e, 'a', p); }), 'a')));
        add(fila('Punto B', 'End (x, y)', punto(e.b, p => ch(() => { moverExtremo(e, 'b', p); }), 'b')));
        break;
      }
      case 'hueco': {
        const g = ed.geo.paredes.get(e.pared), h = ed.geo.hueco(e);
        add(fila('Tipo', 'Type', lista(CLASES_HUECO, e.clase, v => ch(() => { e.clase = v; if ((v === 'ventana') && !e.antepecho) { e.antepecho = 900; e.alto = 1200; } if (v === 'balconera') { e.antepecho = 0; e.alto = 2100; } }), 'cl')));
        add(fila('Ancho', 'Width', longitud(e.ancho, n => n > 0 && ch(() => { e.ancho = n; }), 'w')));
        add(fila('Alto', 'Height', longitud(e.alto || 2100, n => n > 0 && ch(() => { e.alto = n; }), 'h')));
        if (e.clase === 'ventana' || e.clase === 'balconera') add(fila('Antepecho', 'Sill height', longitud(e.antepecho || 0, n => n >= 0 && ch(() => { e.antepecho = n; }), 'ap')));
        if (g && h) {
          const lado = ed.ladoInterior(g), dd = T.distEsquinas(g, h, lado);
          add(sub('Posición (por la cara interior)'));
          add(fila('Hasta la esquina ⟵', 'To corner (start)', longitud(dd.ini, n => ch(() => { e.pos = Math.max(0, Math.min(g.L - e.ancho, dd.s0 + n)); }), 'di')));
          add(fila('Hasta la esquina ⟶', 'To corner (end)', longitud(dd.fin, n => ch(() => { e.pos = Math.max(0, Math.min(g.L - e.ancho, dd.s1 - n - e.ancho)); }), 'df')));
        }
        const fl = document.createElement('div'); fl.className = 'filas';
        if (e.clase !== 'ventana' && e.clase !== 'abertura') fl.appendChild(boton('⇅ Abrir hacia el otro lado', () => ch(() => { e.abre = -(e.abre || 1); })));
        if (e.clase === 'puerta') fl.appendChild(boton('⇆ Bisagra al otro lado', () => ch(() => { e.bisagra = e.bisagra === 'fin' ? 'ini' : 'fin'; })));
        add(fl);
        if (opc.casa) add(fila('Color', 'Colour', color(e.color || '#b07a4a', v => ch(() => { e.color = v; }), 'col')));
        break;
      }
      case 'bloque': {
        const def = T.defBloque(ed.doc, ed.cat, e.ref), b = ed.geo.bloque(e);
        for (const k in e.med || {}) { const nm = NOMBRES_MEDIDA[k] || [k[0].toUpperCase() + k.slice(1), '']; add(fila(nm[0], nm[1], longitud(e.med[k], n => n > 0 && ch(() => { e.med[k] = n; }), 'm' + k))); }
        for (const k in e.par || {}) { const nm = NOMBRES_MEDIDA[k] || [k[0].toUpperCase() + k.slice(1), '']; add(fila(nm[0], nm[1], num(T.fmt(e.par[k], 2), n => ch(() => { e.par[k] = n; }), 'p' + k))); }
        add(fila('Giro', 'Rotation (°)', num(T.fmt(e.giro || 0, 2), n => ch(() => { const c = V.mid(b.esquinas[0], b.esquinas[2]); e.giro = T.norm360(n); const b2 = T.geoBloque(def, e); e.p = V.add(e.p, V.sub(c, V.mid(b2.esquinas[0], b2.esquinas[2]))); }), 'giro')));
        add(fila('Simetría', 'Mirrored', marca(e.espejo, v => ch(() => { const c = V.mid(b.esquinas[0], b.esquinas[2]); e.espejo = v; const b2 = T.geoBloque(def, e); e.p = V.add(e.p, V.sub(c, V.mid(b2.esquinas[0], b2.esquinas[2]))); }), 'esp')));
        if (opc.casa) add(fila('Color', 'Colour', color(e.color || (def && def.color), v => ch(() => { e.color = v; }), 'col')));
        add(fila('Esquina', 'Insertion (x, y)', punto(e.p, p => ch(() => { e.p = p; }), 'p')));
        const fl = document.createElement('div'); fl.className = 'filas';
        fl.appendChild(boton('↻ Girar 90°', () => ch(() => { const c = V.mid(b.esquinas[0], b.esquinas[2]); e.giro = T.norm360((e.giro || 0) + 90); const b2 = T.geoBloque(def, e); e.p = V.add(e.p, V.sub(c, V.mid(b2.esquinas[0], b2.esquinas[2]))); })));
        if (def && def.medidas) fl.appendChild(boton('Medidas originales', () => ch(() => { e.med = T.medidasDef(def); })));
        add(fl);
        if (!def) add(nota('No encuentro la definición de este bloque («' + esc(e.ref) + '»): se dibuja como una caja.'));
        break;
      }
      case 'suelo':
        add(fila('Nombre', 'Room name', entrada(e.nombre || '', v => ch(() => { e.nombre = v; }), 'n')));
        add(nota('Superficie: <b>' + T.fmt(Math.abs(T.areaPoli(e.pts)) / 1e6, 2) + ' m²</b>'));
        add(fila('Color del suelo', 'Floor colour', color(e.color || ed.doc.casa.colorSuelo, v => ch(() => { e.color = v; }), 'col')));
        add(fila('Textura', 'Texture', lista(TEXTURAS, e.textura || 'liso', v => ch(() => { e.textura = v; }), 'tx')));
        add(fila('Con techo', 'Ceiling', marca(e.techo !== false, v => ch(() => { e.techo = v; }), 'te')));
        break;
      case 'cota': cotaCampos(e, add, ch); break;
    }
    if (!['cota', 'suelo', 'hueco'].includes(e.tipo)) { add(sub('Estilo · Style')); estilo(el, [e]); }
  }
  function moverExtremo(e, k, p) {
    const viejo = e[k];
    for (const w of ed.doc.entidades) if (w.tipo === 'pared' && w !== e) { if (V.dist(w.a, viejo) < 1) w.a = p.slice(); if (V.dist(w.b, viejo) < 1) w.b = p.slice(); }
    e[k] = p;
  }
  function cotaCampos(e, add, ch) {
    const real = T.valorCota(e), E = ed.doc.estiloCota;
    if (e.clase === 'lineal' || e.clase === 'alineada') add(fila('Dirección', 'Direction', lista([['h', 'Horizontal', 'Horizontal'], ['v', 'Vertical', 'Vertical'], ['a', 'Alineada', 'Aligned']], e.clase === 'alineada' ? 'a' : e.dir, v => ch(() => { if (v === 'a') e.clase = 'alineada'; else { e.clase = 'lineal'; e.dir = v; } }), 'dir')));
    if (e.clase === 'radio' || e.clase === 'diametro') add(fila('Tipo', 'Type', lista([['radio', 'Radio (R)', 'Radius'], ['diametro', 'Diámetro (Ø)', 'Diameter']], e.clase, v => ch(() => { e.clase = v; }), 'cl')));
    if (e.clase === 'angular') add(nota('Ángulo medido: <b>' + T.fmt(real, 2) + '°</b>'));
    else add(nota('Medida real: <b>' + T.fmt(real / f(), 3) + ' ' + u() + '</b> (se calcula sola y cambia si cambias la pieza)'));
    add(sub('Cifra de cota · Dimension text'));
    const auto = T.cifraCota(Object.assign({}, e, { texto: null, tol: null }), ed.doc, real);
    const inp = entrada(e.texto || '', v => ch(() => { e.texto = v.trim() && v.trim() !== auto ? v.trim() : null; }), 'txt', { placeholder: auto + ' (automática)' });
    add(fila('Cifra a mano', 'Override text', inp));
    if (e.texto) { add(nota('<span class="editada">⚠ Cifra escrita a mano: no es la medida real (' + esc(auto) + '). Se ve en otro color.</span>')); const b = boton('Volver a la medida real', () => ch(() => { e.texto = null; })); add(b); }
    if (e.clase !== 'angular') {
      add(fila('Tolerancia ±', 'Tolerance', num(e.tol ? T.fmt(e.tol / f(), 3) : '', n => ch(() => { e.tol = n > 0 ? n * f() : null; }), 'tol', u())));
      add(fila('Prefijo', 'Symbol', lista([['', 'Automático', 'Auto'], ['-', 'Ninguno', 'None'], ['Ø', 'Ø diámetro', 'Diameter'], ['R', 'R radio', 'Radius'], ['□', '□ cuadrado', 'Square']], e.prefijo == null ? '' : (e.prefijo === '' ? '-' : e.prefijo), v => ch(() => { if (v === '') delete e.prefijo; else e.prefijo = v === '-' ? '' : v; }), 'pre')));
      add(fila('Unidades', 'Units', lista([['', 'Las del plano (' + u() + ')', 'Drawing'], ['mm', 'mm'], ['cm', 'cm'], ['m', 'm']], e.unidad || '', v => ch(() => { if (v) e.unidad = v; else delete e.unidad; }), 'uni')));
    }
    add(fila('Decimales', 'Decimals', lista([['', 'Según el estilo (' + (e.clase === 'angular' ? E.decAng : E.decimales) + ')'], [0, '0'], [1, '1'], [2, '2'], [3, '3']], e.dec == null ? '' : e.dec, v => ch(() => { if (v === '') delete e.dec; else e.dec = +v; }), 'dec')));
    add(fila('Altura de cifra', 'Text height (mm)', lista([['', 'Según el estilo (' + T.fmt(E.texto, 1) + ')'], [2.5, '2,5 mm'], [3.5, '3,5 mm'], [5, '5 mm'], [7, '7 mm']], e.h || '', v => ch(() => { if (v) e.h = +v; else delete e.h; }), 'h')));
    if (e.clase === 'lineal' || e.clase === 'alineada') add(fila('Cifra por fuera', 'Text outside', marca(e.fuera, v => ch(() => { e.fuera = v; }), 'fue')));
    const unida = e.r1 || e.r2 || e.rc || e.rl1;
    add(nota(unida ? '🔗 Cota asociativa: unida a la pieza. Si la mueves o la estiras, la cota se actualiza.' : 'Esta cota no está unida a ninguna pieza (se hizo sin imán o se separó).'));
    add(sub('Estilo · Style'));
    estilo(el, [e]);
  }
  return P;
};

/* ------------------------------------------------ capas */
T.PanelCapas = function (el, ed, alCambio) {
  const P = {};
  P.actualizar = () => {
    el.innerHTML = '';
    const h = document.createElement('h4'); h.innerHTML = 'Capas <small>Layers</small>'; el.appendChild(h);
    const cab = document.createElement('div'); cab.className = 'capa'; cab.style.fontFamily = 'var(--mono)'; cab.style.fontSize = '.45rem'; cab.style.color = 'var(--ink-2)';
    cab.innerHTML = '<span title="Capa actual">ACT.</span><span>VER</span><span>BLOQ.</span><span>COL.</span><span>NOMBRE</span><span>Nº</span>'; el.appendChild(cab);
    const cuenta = {}; ed.doc.entidades.forEach(e => { const c = e.capa || '0'; cuenta[c] = (cuenta[c] || 0) + 1; });
    for (const c of ed.doc.capas) {
      const r = document.createElement('div'); r.className = 'capa';
      const rad = document.createElement('input'); rad.type = 'radio'; rad.name = 'capaAct'; rad.checked = ed.doc.capaActual === c.id; rad.title = 'Dibujar en esta capa';
      rad.onchange = () => { ed.doc.capaActual = c.id; alCambio && alCambio(); };
      const ver = document.createElement('button'); ver.textContent = '👁'; ver.title = 'Ver u ocultar · Show / hide'; if (c.visible === false) ver.className = 'off';
      ver.onclick = () => ed.cambiar(() => { c.visible = c.visible === false; }, 'capas');
      const bl = document.createElement('button'); bl.textContent = c.bloqueada ? '🔒' : '🔓'; bl.title = 'Bloquear (no se puede seleccionar) · Lock'; if (!c.bloqueada) bl.className = 'off';
      bl.onclick = () => ed.cambiar(() => { c.bloqueada = !c.bloqueada; }, 'capas');
      const col = document.createElement('input'); col.type = 'color'; col.value = c.color; col.title = 'Color';
      col.onchange = () => ed.cambiar(() => { c.color = col.value; }, 'capas');
      const nom = document.createElement('input'); nom.type = 'text'; nom.value = c.nombre; nom.title = (c.en || '') + ' · trazo ' + c.trazo + ', ' + T.fmt(c.grosor, 2) + ' mm';
      nom.onkeydown = ev => ev.stopPropagation();
      nom.onchange = () => ed.cambiar(() => { c.nombre = nom.value || c.nombre; }, 'capas');
      const n = document.createElement('span'); n.className = 'cnt'; n.textContent = cuenta[c.id] || '';
      r.append(rad, ver, bl, col, nom, n);
      el.appendChild(r);
      const det = document.createElement('div'); det.className = 'campo'; det.style.gridTemplateColumns = '1fr 1fr'; det.style.margin = '0 0 .2rem 1.4rem';
      const tr = document.createElement('select'); [['continua', 'Continua'], ['oculta', 'Discontinua'], ['eje', 'Trazo y punto']].forEach(o => { const op = new Option(o[1], o[0]); op.selected = c.trazo === o[0]; tr.appendChild(op); });
      tr.onchange = () => ed.cambiar(() => { c.trazo = tr.value; }, 'capas');
      const gr = document.createElement('select'); T.GROSORES.forEach(g => { const op = new Option(T.fmt(g, 2) + ' mm', g); op.selected = Math.abs(c.grosor - g) < 1e-6; gr.appendChild(op); });
      gr.onchange = () => ed.cambiar(() => { c.grosor = +gr.value; }, 'capas');
      det.append(tr, gr); el.appendChild(det);
      if (!['0', 'cotas', 'paredes', 'mobiliario', 'rayado', 'texto', 'ocultas', 'ejes'].includes(c.id) && !cuenta[c.id]) {
        const b = document.createElement('button'); b.className = 'chip peligro'; b.textContent = 'Borrar capa vacía'; b.style.margin = '0 0 .3rem 1.4rem';
        b.onclick = () => ed.cambiar(() => { ed.doc.capas = ed.doc.capas.filter(x => x !== c); if (ed.doc.capaActual === c.id) ed.doc.capaActual = '0'; }, 'capas');
        el.appendChild(b);
      }
    }
    const nueva = document.createElement('button'); nueva.className = 'chip go'; nueva.textContent = '+ Capa nueva · New layer'; nueva.style.marginTop = '.6rem';
    nueva.onclick = () => ed.cambiar(() => { const id = 'c' + Date.now().toString(36); ed.doc.capas.push({ id, nombre: 'Capa ' + (ed.doc.capas.length + 1), en: 'Layer', color: '#14201a', trazo: 'continua', grosor: 0.35, visible: true, bloqueada: false }); ed.doc.capaActual = id; }, 'capas');
    el.appendChild(nueva);
    const p = document.createElement('p'); p.className = 'nota'; p.innerHTML = 'Las cotas van solas a la capa <b>Cotas</b>; las paredes y huecos a <b>Paredes</b>; los muebles a <b>Mobiliario</b>. Lo demás, a la capa actual.'; el.appendChild(p);
  };
  return P;
};

/* ------------------------------------------------ bibliotecas de bloques */
T.miniatura = (def, w, h) => {
  const cv = document.createElement('canvas'), d = Math.min(2, W.devicePixelRatio || 1);
  cv.width = w * d; cv.height = h * d;
  const cx = cv.getContext('2d');
  cx.scale(d, d);
  cx.strokeStyle = '#14201a'; cx.lineWidth = 1.1; cx.lineJoin = 'round';
  if (def.hueco || def.herramienta) {
    cx.translate(w / 2, h / 2);
    cx.fillStyle = '#cfc8b6';
    const muro = (x0, x1) => { cx.fillRect(x0, -4, x1 - x0, 8); cx.strokeRect(x0, -4, x1 - x0, 8); };
    if (def.herramienta === 'pared') { muro(-26, 26); return cv; }
    if (def.herramienta === 'habitacion') { cx.lineWidth = 3; cx.strokeRect(-22, -15, 44, 30); return cv; }
    muro(-28, -14); muro(14, 28);
    cx.lineWidth = 1;
    if (def.hueco === 'puerta') { cx.beginPath(); cx.moveTo(-14, -4); cx.lineTo(-14, -32 + 4); cx.stroke(); cx.beginPath(); cx.arc(-14, -4, 28, -Math.PI / 2, 0); cx.stroke(); }
    else if (def.hueco === 'puerta-doble') { cx.beginPath(); cx.moveTo(-14, -4); cx.lineTo(-14, -18); cx.moveTo(14, -4); cx.lineTo(14, -18); cx.stroke(); cx.beginPath(); cx.arc(-14, -4, 14, -Math.PI / 2, 0); cx.stroke(); cx.beginPath(); cx.arc(14, -4, 14, Math.PI, -Math.PI / 2); cx.stroke(); }
    else if (def.hueco === 'corredera') { cx.strokeRect(-14, -3, 16, 2.5); cx.strokeRect(-2, 0.5, 16, 2.5); }
    else if (def.hueco === 'abertura') { cx.setLineDash([3, 2]); cx.beginPath(); cx.moveTo(-14, -4); cx.lineTo(14, -4); cx.moveTo(-14, 4); cx.lineTo(14, 4); cx.stroke(); }
    else { cx.beginPath(); cx.moveTo(-14, -4); cx.lineTo(14, -4); cx.moveTo(-14, 4); cx.lineTo(14, 4); cx.moveTo(-14, -0.8); cx.lineTo(14, -0.8); cx.moveTo(-14, 0.8); cx.lineTo(14, 0.8); cx.stroke(); }
    return cv;
  }
  const g = T.geoBloque(def, { p: [0, 0], giro: 0, med: T.medidasDef(def) });
  const pts = []; g.lineas.forEach(l => pts.push(...l.pts)); if (!pts.length) return cv;
  const b = T.caja(pts), s = Math.min((w - 8) / ((b[2] - b[0]) || 1), (h - 8) / ((b[3] - b[1]) || 1));
  const X = p => [w / 2 + (p[0] - (b[0] + b[2]) / 2) * s, h / 2 - (p[1] - (b[1] + b[3]) / 2) * s];
  if (def.color) { cx.fillStyle = def.color; cx.globalAlpha = 0.35; const q = g.esquinas.map(X); cx.beginPath(); q.forEach((p, i) => i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1])); cx.fill(); cx.globalAlpha = 1; }
  for (const l of g.lineas) {
    cx.beginPath(); l.pts.map(X).forEach((p, i) => i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1])); if (l.cerr) cx.closePath();
    cx.setLineDash(l.trazo === 'oculta' ? [3, 2] : []); cx.lineWidth = l.gruesa ? 1.8 : 1;
    if (l.relleno) { cx.fillStyle = l.relleno; cx.fill(); }
    cx.stroke();
  }
  return cv;
};
T.Biblioteca = function (el, opc) {
  const P = { cat: null, filtro: opc.filtro || (() => true) };
  let actual = null, texto = '';
  P.poner = cat => { P.cat = cat; P.actualizar(); };
  P.actualizar = () => {
    el.innerHTML = '';
    const cat = P.cat;
    if (!cat) { el.innerHTML = '<p class="nota">Cargando catálogos…</p>'; return; }
    const listas = cat.listas.filter(l => l.bloques.some(P.filtro));
    const h = document.createElement('h4'); h.innerHTML = (opc.titulo || 'Bibliotecas') + ' <small>' + (opc.en || 'Block libraries') + '</small>'; el.appendChild(h);
    if (cat.errores.length) { const n = document.createElement('p'); n.className = 'nota'; n.innerHTML = '⚠ ' + cat.errores.map(T.esc).join('<br>'); el.appendChild(n); }
    const b = document.createElement('input'); b.className = 'buscar'; b.placeholder = 'Buscar · Search'; b.value = texto;
    b.oninput = () => { texto = b.value; pintarTiles(); }; b.onkeydown = ev => ev.stopPropagation();
    el.appendChild(b);
    const cats = document.createElement('div'); cats.className = 'cats'; el.appendChild(cats);
    if (!actual || !listas.some(l => l.categoria === actual)) actual = listas[0] ? listas[0].categoria : null;
    for (const l of listas) {
      const c = document.createElement('button'); c.className = 'chip' + (l.categoria === actual ? ' on' : ''); c.textContent = l.nombre; c.title = l.enCategoria || '';
      c.onclick = () => { actual = l.categoria; texto = ''; P.actualizar(); };
      cats.appendChild(c);
    }
    const tiles = document.createElement('div'); tiles.className = 'tiles'; el.appendChild(tiles);
    function pintarTiles() {
      tiles.innerHTML = '';
      const q = texto.trim().toLowerCase();
      const defs = q ? listas.flatMap(l => l.bloques) : (listas.find(l => l.categoria === actual) || { bloques: [] }).bloques;
      for (const d of defs.filter(P.filtro)) {
        if (q && !((d.nombre || '') + ' ' + (d.en || '')).toLowerCase().includes(q)) continue;
        const t = document.createElement('button'); t.className = 'tile'; t.title = d.nombre + ' · ' + (d.en || '');
        t.appendChild(T.miniatura(d, 58, 44));
        const s = document.createElement('span'); s.textContent = d.nombre; t.appendChild(s);
        const sm = document.createElement('small'); sm.textContent = d.en || ''; t.appendChild(sm);
        t.onclick = () => opc.alElegir(d);
        tiles.appendChild(t);
      }
      if (!tiles.children.length) tiles.innerHTML = '<p class="nota">No hay nada con ese nombre.</p>';
    }
    pintarTiles();
    if (opc.pie) { const p = document.createElement('p'); p.className = 'nota'; p.innerHTML = opc.pie; el.appendChild(p); }
  };
  return P;
};
})(window);
