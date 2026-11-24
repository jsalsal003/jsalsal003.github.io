/* ===========================================================================
   PLANO 2D · la aplicación (barra, paneles, archivos, exportar)
   El dibujo y la edición están en ../comun/editor2d.js
   © 2026 Juan Salguero Salguero · CC BY-NC-SA 4.0
   =========================================================================== */
(function () {
'use strict';
const T = window.Taller, V = T.V;
const $ = s => document.querySelector(s);
const CLAVE = 'plano2d.doc';
const CLAVE_CASA = 'taller.casa3d.importar';
const ESCALAS = [[1, 1], [1, 2], [1, 5], [1, 10], [1, 20], [1, 25], [1, 50], [1, 100], [1, 200], [2, 1], [5, 1], [10, 1]];
const modalAbierto = () => !!document.querySelector('.modal:not([hidden])');

/* ------------------------------------------------ avisos */
let tAviso = 0;
function aviso(t) {
  const a = $('#aviso'); a.textContent = t; a.classList.add('ver');
  clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('ver'), 3200);
}
function confirmar(titulo, texto, si) {
  $('#confTit').textContent = titulo; $('#confTxt').innerHTML = texto;
  abrir('#mConfirmar');
  $('#confOk').onclick = () => { cerrar('#mConfirmar'); si(); };
}
function abrir(id) { $(id).hidden = false; }
function cerrar(id) { $(id).hidden = true; ed.lienzo.focus(); }
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', ev => { if (ev.target === m || ev.target.closest('[data-cerrar]')) cerrar('#' + m.id); });
});

/* ------------------------------------------------ editor */
let panel = null, capas = null, biblio = null;
const ed = T.Editor2D($('#lienzo'), {
  hoja: true,
  herramientas: T.HERRAMIENTAS.map(h => h.id).filter(id => id !== 'suelo'),
  activo: () => !modalAbierto(),
  alMensaje: t => { $('#msg').textContent = t; },
  alAviso: aviso,
  alCambiar: () => { guardarLocal(); refrescar(); },
  alSeleccion: () => { panel && panel.actualizar(); },
  alHerramienta: id => { marcarHerramienta(id); panel && panel.actualizar(); },
  alCursor: p => { const f = T.UNI[ed.doc.unidad]; $('#xy').textContent = 'x ' + T.fmt(p[0] / f, 2) + ' · y ' + T.fmt(p[1] / f, 2) + ' ' + ed.doc.unidad; },
  alImanes: () => pintarEstado(),
  alEscribir: ch => { const c = $('#cmd'); c.focus(); c.value += ch; },
  alMedicion: () => { mostrar('pProp'); panel && panel.actualizar(); },
});
panel = T.Panel($('#pProp'), ed, { ayudaVacia: 'Consejo: escribe las medidas abajo, a la derecha, en vez de pinchar a ojo.' });
capas = T.PanelCapas($('#pCapas'), ed, () => panel.actualizar());
biblio = T.Biblioteca($('#pBloques'), {
  titulo: 'Bibliotecas', en: 'Block libraries',
  alElegir: def => {
    if (def.herramienta) { ed.herramienta(def.herramienta); return; }
    if (def.hueco) { ed.herramienta('hueco', def); return; }
    ed.herramienta('bloque', def);
  },
  pie: 'Al colocar un bloque, sus medidas se cambian en la pestaña <b>Objeto</b>. Las puertas y ventanas se ponen <b>encima de una pared</b>.',
});

/* ------------------------------------------------ barra de herramientas */
const GRUPOS = [
  ['General', ['sel', 'mano', 'medir']],
  ['Dibujo · Draw', ['linea', 'polilinea', 'rect', 'circulo', 'arco', 'texto', 'rayado', 'pared', 'habitacion']],
  ['Edición · Modify', ['mover', 'copiar', 'girar', 'simetria', 'escalar', 'recortar', 'borrar']],
  ['Cotas · Dimensions', ['cota-lin', 'cota-ali', 'cota-ang', 'cota-rad', 'cota-dia', 'cota-serie', 'cota-base', 'cota-rapida', 'revisar']],
];
function construirCarril() {
  const c = $('#carril'); c.innerHTML = '';
  for (const [tit, ids] of GRUPOS) {
    const h = document.createElement('h3'); h.textContent = tit; c.appendChild(h);
    const g = document.createElement('div'); g.className = 'herrs'; c.appendChild(g);
    for (const id of ids) {
      const b = document.createElement('button'); b.className = 'herr'; b.dataset.h = id;
      if (id === 'revisar') {
        b.innerHTML = T.icono('revisar'); b.title = 'Revisar cotas · Check dimensions'; b.classList.add('accion');
        b.onclick = revisar;
      } else {
        const m = T.herramienta(id);
        b.innerHTML = T.icono(id) + (m.tecla && m.tecla.length === 1 ? '<span class="tk">' + m.tecla + '</span>' : '');
        b.title = m.nombre + ' · ' + m.en + (m.tecla ? ' (' + m.tecla + ')' : '');
        b.onclick = () => ed.herramienta(id);
      }
      g.appendChild(b);
    }
  }
  const h = document.createElement('h3'); h.textContent = 'Tipo de línea'; c.appendChild(h);
  const t = document.createElement('div'); t.className = 'trazos'; c.appendChild(t);
  for (const st of T.ESTILOS) {
    const b = document.createElement('button'); b.dataset.st = st.id; b.title = st.nombre + ' · ' + st.en;
    if (st.id === 'capa') { b.className = 'capa'; b.textContent = 'POR CAPA'; }
    else b.innerHTML = '<i class="' + st.id + '"></i>';
    b.onclick = () => {
      ed.estiloNuevo = st.id;
      const geo = [...ed.sel].map(id => ed.geo.ents.get(id)).filter(e => e && ['linea', 'polilinea', 'circulo', 'arco'].includes(e.tipo));
      if (geo.length) ed.cambiar(() => geo.forEach(e => { if (st.trazo) { e.trazo = st.trazo; e.pluma = st.grosor; } else { delete e.trazo; delete e.pluma; } }), 'estilo');
      marcarEstilo();
      aviso(st.nombre + (geo.length ? ' · aplicado a ' + geo.length + ' objeto(s)' : ' · para lo que dibujes ahora'));
    };
    t.appendChild(b);
  }
  marcarEstilo();
}
function marcarHerramienta(id) { document.querySelectorAll('.herr[data-h]').forEach(b => b.classList.toggle('on', b.dataset.h === id)); }
function marcarEstilo() { document.querySelectorAll('.trazos button').forEach(b => b.classList.toggle('on', b.dataset.st === ed.estiloNuevo)); }

/* ------------------------------------------------ pestañas del panel derecho */
function mostrar(id) {
  document.querySelectorAll('#pestanas button').forEach(b => b.classList.toggle('on', b.dataset.p === id));
  ['pProp', 'pCapas', 'pBloques', 'pRevision'].forEach(p => { $('#' + p).hidden = p !== id; });
  if (id === 'pCapas') capas.actualizar();
  if (id === 'pBloques') biblio.actualizar();
}
document.querySelectorAll('#pestanas button').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.p)));

/* ------------------------------------------------ revisar cotas */
function revisar() {
  const r = ed.revisarCotas(), el = $('#pRevision');
  $('#tabRevision').hidden = false;
  el.innerHTML = '<h4>Revisar cotas <small>Check dimensions</small></h4>';
  if (!r.total) el.innerHTML += '<p class="nota">Todavía no hay cotas en el plano.</p>';
  else if (!r.problemas.length) el.innerHTML += '<p class="bien">¡Bien! No veo fallos.</p><p class="nota">He mirado ' + r.total + ' cotas. Comprueba tú que están <b>todas</b> las medidas necesarias para fabricar la pieza.</p>';
  else {
    el.innerHTML += '<p class="total">' + r.problemas.length + ' aviso(s) en ' + r.total + ' cotas. Pulsa uno para ver la cota (va marcada en rojo).</p>';
    const tipos = { repetida: 'Cota repetida', cruce: 'Se cruza', cerca: 'Muy cerca de la pieza', juntas: 'Cotas muy juntas', cifra: 'Cifra tapada' };
    for (const p of r.problemas) {
      const d = document.createElement('div'); d.className = 'problema';
      d.innerHTML = '<b>' + (tipos[p.tipo] || p.tipo) + '</b>' + T.esc(p.texto);
      d.onclick = () => { ed.sel.clear(); ed.sel.add(p.id); ed.pedir(); panel.actualizar(); };
      el.appendChild(d);
    }
  }
  el.innerHTML += '<div class="reglas"><b>Recuerda</b><br>Las cotas deben ser <b>mínimas</b> (solo las necesarias), <b>suficientes</b> (que se pueda fabricar) y <b>adecuadas</b> (claras y fáciles de leer). No repitas medidas y no cruces líneas de cota. Deja al menos <b>7 mm</b> entre la pieza y la primera cota, y entre cotas paralelas.</div>';
  el.querySelectorAll('.problema').forEach((d, i) => { d.onclick = () => { const p = r.problemas[i]; ed.sel.clear(); ed.sel.add(p.id); ed.pedir(); }; });
  mostrar('pRevision');
}

/* ------------------------------------------------ barra de estado */
function pintarEstado() {
  $('#tRejilla').classList.toggle('on', !!ed.doc.rejilla.ver);
  $('#tIman').classList.toggle('on', ed.imanes.rejilla);
  $('#tObjetos').classList.toggle('on', ed.imanes.objetos);
  $('#tOrto').classList.toggle('on', ed.imanes.orto);
  const f = T.UNI[ed.doc.unidad];
  if (document.activeElement !== $('#paso')) $('#paso').value = T.fmt(ed.doc.rejilla.paso / f, 3);
  $('#pasoU').textContent = ed.doc.unidad;
  $('#unidad').value = ed.doc.unidad;
  const s = $('#escala'), act = ed.doc.escala.join(':');
  const ops = ESCALAS.map(e => e.join(':'));
  if (!ops.includes(act)) ops.push(act);
  s.innerHTML = ops.map(o => '<option' + (o === act ? ' selected' : '') + '>' + o + '</option>').join('') + '<option value="otra">Otra…</option>';
}
$('#tRejilla').onclick = () => { ed.doc.rejilla.ver = !ed.doc.rejilla.ver; ed.pedir(true); pintarEstado(); guardarLocal(); };
$('#tIman').onclick = () => { ed.imanes.rejilla = !ed.imanes.rejilla; pintarEstado(); };
$('#tObjetos').onclick = () => { ed.imanes.objetos = !ed.imanes.objetos; pintarEstado(); };
$('#tOrto').onclick = () => { ed.imanes.orto = !ed.imanes.orto; pintarEstado(); };
$('#paso').addEventListener('change', () => { const n = T.num($('#paso').value); if (n > 0) ed.cambiar(() => { ed.doc.rejilla.paso = n * T.UNI[ed.doc.unidad]; }, 'rejilla'); pintarEstado(); });
$('#paso').addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') ed.lienzo.focus(); });
$('#unidad').addEventListener('change', () => { ed.cambiar(() => { ed.doc.unidad = $('#unidad').value; }, 'unidad'); });
$('#escala').addEventListener('change', () => {
  const v = $('#escala').value;
  if (v === 'otra') { abrirHoja(); pintarEstado(); return; }
  const [a, b] = v.split(':').map(Number);
  ed.cambiar(() => { ed.doc.escala = [a, b]; }, 'escala');
  aviso('Escala ' + v + ': el dibujo sigue teniendo las mismas medidas reales');
});

/* ------------------------------------------------ entrada de coordenadas */
const cmd = $('#cmd');
cmd.addEventListener('keydown', ev => {
  ev.stopPropagation();
  if (ev.key === 'Enter') {
    ev.preventDefault();
    const v = cmd.value.trim();
    if (!v) { ed.lienzo.focus(); ed.tecla({ key: 'Enter' }); return; }
    if (/^[a-zA-Z]$/.test(v)) { cmd.value = ''; ed.lienzo.focus(); ed.tecla({ key: v }); return; }
    if (ed.comando(v)) { cmd.value = ''; ed.lienzo.focus(); }
  } else if (ev.key === 'Escape') { cmd.value = ''; ed.lienzo.focus(); }
});

/* ------------------------------------------------ guardar en el navegador */
let tGuardar = 0;
function guardarLocal() {
  clearTimeout(tGuardar);
  tGuardar = setTimeout(() => {
    const ok = T.lsSet(CLAVE, ed.doc);
    $('#guardado').textContent = ok ? '✓ guardado en este navegador' : '⚠ no se puede guardar en el navegador: usa «Guardar archivo»';
  }, 350);
}
function refrescar() {
  if ($('#nombre') !== document.activeElement) $('#nombre').value = ed.doc.nombre;
  pintarEstado();
  if (!$('#pCapas').hidden) capas.actualizar();
}
$('#nombre').addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') ed.lienzo.focus(); });
$('#nombre').addEventListener('change', () => { const v = $('#nombre').value.trim() || 'Plano sin título'; ed.cambiar(() => { ed.doc.nombre = v; }, 'nombre'); });

/* ------------------------------------------------ archivos */
function guardarArchivo() {
  const txt = JSON.stringify(ed.doc, null, 1);
  T.descargar(new Blob([txt], { type: 'application/json' }), T.nombreArchivo(ed.doc.nombre) + '.plano.json');
  aviso('Guardado en Descargas: ' + T.nombreArchivo(ed.doc.nombre) + '.plano.json');
}
async function abrirArchivo() {
  try {
    const f = await T.abrirArchivo('.json,application/json');
    const d = JSON.parse(f.texto);
    if (!d || !Array.isArray(d.entidades)) throw new Error('no es un plano');
    if (!d.nombre) d.nombre = f.nombre.replace(/\.(plano|casa3d)?\.?json$/i, '');
    ed.cargar(d); guardarLocal(); refrescar(); panel.actualizar();
    aviso('Abierto: ' + f.nombre);
  } catch (e) { if (e && e.message !== 'Ningún archivo') aviso('No se puede abrir: ' + e.message); }
}
$('#bGuardar').onclick = guardarArchivo;
$('#bAbrir').onclick = abrirArchivo;
document.addEventListener('keydown', ev => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); guardarArchivo(); }
  else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'o') { ev.preventDefault(); abrirArchivo(); }
  else if (ev.key === 'F1' || (ev.key === '?' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) { ev.preventDefault(); abrir('#mAyuda'); }
  else if (ev.key === 'Escape' && modalAbierto()) { document.querySelectorAll('.modal').forEach(m => { m.hidden = true; }); ed.lienzo.focus(); }
});

/* ------------------------------------------------ exportar */
$('#bExportar').onclick = ev => { ev.stopPropagation(); $('#mExportar').hidden = !$('#mExportar').hidden; };
document.addEventListener('click', ev => { if (!ev.target.closest('.menu')) $('#mExportar').hidden = true; });
$('#mExportar').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  $('#mExportar').hidden = true;
  ({ pdf: exportarPDF, png: exportarPNG, casa: abrirEnCasa, casajson: archivoCasa })[b.dataset.x]();
});
function exportarPNG() {
  const cv = ed.imagen(6); // 6 px por mm ≈ 150 ppp
  cv.toBlob(b => { T.descargar(b, T.nombreArchivo(ed.doc.nombre) + '.png'); aviso('Imagen guardada en Descargas (150 ppp)'); }, 'image/png');
}
function cargarScript(src) {
  return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('sin conexión')); document.head.appendChild(s); });
}
async function exportarPDF() {
  try {
    if (!window.jspdf) { aviso('Preparando el PDF…'); await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); }
    const [W, H] = T.tamHoja(ed.doc);
    const pdf = new window.jspdf.jsPDF({ orientation: W > H ? 'landscape' : 'portrait', unit: 'mm', format: ed.doc.hoja.formato.toLowerCase(), compress: true });
    pdf.setProperties({ title: ed.doc.hoja.datos.titulo || ed.doc.nombre, author: ed.doc.hoja.datos.nombre || '', creator: 'Plano 2D · Taller Virtual' });
    T.pintarPDF(pdf, ed.primsHoja());
    pdf.save(T.nombreArchivo(ed.doc.nombre) + '.pdf');
    aviso('PDF en Descargas. Para que la escala sea exacta, imprímelo al 100 % («Tamaño real»), sin «Ajustar a la página».');
  } catch (e) { aviso('No se pudo hacer el PDF (' + e.message + '). Hace falta internet la primera vez.'); }
}
function docCasa() {
  const d = JSON.parse(JSON.stringify(ed.doc));
  const quedan = new Set(d.entidades.filter(e => ['pared', 'hueco', 'bloque', 'suelo'].includes(e.tipo)).map(e => e.id));
  d.entidades = d.entidades.filter(e => quedan.has(e.id) || (e.tipo === 'cota' && [e.r1, e.r2].every(r => r && quedan.has(r.id))));
  d.app = 'taller-casa3d';
  return d;
}
function abrirEnCasa() {
  const d = docCasa();
  if (!d.entidades.some(e => e.tipo === 'pared')) { aviso('Este plano no tiene paredes: dibújalas con la herramienta Pared (W) o Habitación (B)'); return; }
  if (!T.lsSet(CLAVE_CASA, d)) { aviso('El navegador no deja pasar el plano: usa «Archivo para Casa 3D»'); return; }
  guardarLocal();
  setTimeout(() => { location.href = '../casa3d/?desde=plano'; }, 400);
}
function archivoCasa() {
  T.descargar(new Blob([JSON.stringify(docCasa(), null, 1)], { type: 'application/json' }), T.nombreArchivo(ed.doc.nombre) + '.casa3d.json');
  aviso('Guardado en Descargas. Ábrelo en Casa 3D con «Abrir archivo».');
}

/* ------------------------------------------------ nuevo y plantillas */
const BLANCOS = [
  { nombre: 'Pieza', en: 'Part', txt: 'A4 apaisado · 1:1 · mm', icono: '1:1', doc: { unidad: 'mm', escala: [1, 1], paso: 5, origen: [30, 160] } },
  { nombre: 'Habitación', en: 'Room', txt: 'A4 apaisado · 1:20 · cm', icono: '1:20', doc: { unidad: 'cm', escala: [1, 20], paso: 100, origen: [35, 165], cajetin: 'compacto' } },
  { nombre: 'Vivienda o aula', en: 'House', txt: 'A4 apaisado · 1:50 · cm', icono: '1:50', doc: { unidad: 'cm', escala: [1, 50], paso: 100, origen: [30, 170] } },
  { nombre: 'Hoja A3', en: 'A3 sheet', txt: 'A3 apaisado · 1:1 · mm', icono: 'A3', doc: { unidad: 'mm', escala: [1, 1], paso: 5, origen: [40, 240], formato: 'A3' } },
];
let plantillas = null;
async function cargarPlantillas() {
  try {
    const r = await fetch('plantillas/indice.json', { cache: 'no-cache' });
    plantillas = (await r.json()).plantillas || [];
  } catch (e) { plantillas = []; }
}
function abrirNuevo() {
  $('#nuevoAviso').innerHTML = ed.doc.entidades.length ? '⚠ El plano que tienes ahora se sustituye. Si lo quieres conservar, primero <b>Guardar archivo</b>.' : 'Elige cómo empezar.';
  const bl = $('#blancos'); bl.innerHTML = '';
  for (const b of BLANCOS) {
    const t = document.createElement('button'); t.className = 'tarjeta';
    t.innerHTML = '<div class="vista">' + b.icono + '</div><b>' + b.nombre + '</b><span>' + b.txt + '</span>';
    t.onclick = () => {
      const d = T.nuevoDoc({ nombre: b.nombre + ' nueva', unidad: b.doc.unidad, escala: b.doc.escala });
      d.rejilla.paso = b.doc.paso; // en mm
      d.hoja.origen = b.doc.origen; if (b.doc.formato) d.hoja.formato = b.doc.formato; if (b.doc.cajetin) d.hoja.cajetin = b.doc.cajetin;
      d.nombre = b.nombre === 'Pieza' ? 'Pieza nueva' : b.nombre + ' nuevo';
      cerrar('#mNuevo'); ed.cargar(d); guardarLocal(); refrescar(); panel.actualizar();
    };
    bl.appendChild(t);
  }
  const pl = $('#plantillas'); pl.innerHTML = '';
  if (!plantillas || !plantillas.length) pl.innerHTML = '<p class="nota">No hay plantillas (se cargan desde la web).</p>';
  for (const p of plantillas || []) {
    const t = document.createElement('button'); t.className = 'tarjeta';
    t.innerHTML = '<div class="vista">' + T.esc(p.icono || '▤') + '</div><b>' + T.esc(p.nombre) + '</b><span>' + T.esc(p.descripcion || '') + (p.en ? ' · <i>' + T.esc(p.en) + '</i>' : '') + '</span>';
    t.onclick = async () => {
      try {
        const r = await fetch('plantillas/' + p.archivo, { cache: 'no-cache' });
        const d = await r.json();
        cerrar('#mNuevo'); ed.cargar(d); guardarLocal(); refrescar(); panel.actualizar();
        aviso('Plantilla «' + p.nombre + '» abierta');
      } catch (e) { aviso('No se puede abrir la plantilla: ' + e.message); }
    };
    pl.appendChild(t);
  }
  abrir('#mNuevo');
}
$('#bNuevo').onclick = abrirNuevo;

/* ------------------------------------------------ hoja y escala */
function abrirHoja() {
  const d = ed.doc, h = d.hoja, E = d.estiloCota, f = T.UNI[d.unidad];
  const op = (v, t, a) => '<option value="' + v + '"' + (String(a) === String(v) ? ' selected' : '') + '>' + t + '</option>';
  const campo = (es, en, ctrl) => '<label class="campo"><span>' + es + '<small>' + en + '</small></span>' + ctrl + '</label>';
  const dato = k => '<input data-dato="' + k + '" value="' + T.esc(h.datos[k] || '') + '">';
  $('#hojaCuerpo').innerHTML =
    '<div class="cols"><div>' +
    '<div class="seccion"><b>Hoja · Sheet</b>' +
      campo('Formato', 'Size', '<select id="hFormato">' + op('A4', 'A4 (297 × 210 mm)', h.formato) + op('A3', 'A3 (420 × 297 mm)', h.formato) + '</select>') +
      campo('Orientación', 'Orientation', '<select id="hOrient">' + op('apaisada', 'Apaisada · Landscape', h.orientacion) + op('vertical', 'Vertical · Portrait', h.orientacion) + '</select>') +
      campo('Margen', 'Margin (mm)', '<input id="hMargen" value="' + h.margen + '">') +
      campo('Cajetín', 'Title block', '<select id="hCajetin">' + op('ancho', 'Normal (180 × 24 mm)', h.cajetin) + op('compacto', 'Compacto (75 × 48 mm)', h.cajetin) + '</select>') +
    '</div>' +
    '<div class="seccion"><b>Escala y unidades · Scale</b>' +
      campo('Unidades', 'Units', '<select id="hUnidad">' + op('mm', 'Milímetros (mm)', d.unidad) + op('cm', 'Centímetros (cm)', d.unidad) + op('m', 'Metros (m)', d.unidad) + '</select>') +
      campo('Escala', 'Scale', '<span class="escalas"><input id="hE1" value="' + d.escala[0] + '"> : <input id="hE2" value="' + d.escala[1] + '"></span>') +
      campo('Paso de rejilla', 'Grid step (' + d.unidad + ')', '<input id="hPaso" value="' + T.fmt(d.rejilla.paso / f, 3) + '">') +
      '<p class="nota">1:20 quiere decir que 1 cm del papel son 20 cm de verdad. 2:1 es una ampliación (el doble).</p>' +
      '<button class="chip" id="hCentrar" type="button">⊕ Centrar el dibujo en la hoja</button>' +
    '</div></div><div>' +
    '<div class="seccion"><b>Cajetín · Title block</b>' +
      campo('Título', 'Title', dato('titulo')) + campo('Nombre', 'Name', dato('nombre')) + campo('Curso', 'Group', dato('curso')) +
      campo('Fecha', 'Date', dato('fecha')) + campo('Nº de plano', 'Drawing no.', dato('numero')) + campo('Centro', 'School', dato('centro')) +
    '</div>' +
    '<div class="seccion"><b>Estilo de cota · Dimension style</b>' +
      campo('Altura de la cifra', 'Text height (mm)', '<select id="eTexto">' + [2.5, 3.5, 5, 7].map(v => op(v, T.fmt(v, 1) + ' mm', E.texto)).join('') + '</select>') +
      campo('Extremos', 'Terminators', '<select id="eExtremo">' + op('flecha', 'Flecha rellena · Arrow', E.extremo) + op('oblicuo', 'Trazo oblicuo · Oblique', E.extremo) + op('punto', 'Punto · Dot', E.extremo) + '</select>') +
      campo('Tamaño de flecha', 'Arrow size (mm)', '<input id="eFlecha" value="' + T.fmt(E.flecha, 2) + '">') +
      campo('Sobresale', 'Extension (mm)', '<input id="eSobre" value="' + T.fmt(E.sobresale, 2) + '">') +
      campo('Hueco con la pieza', 'Offset (mm)', '<input id="eHueco" value="' + T.fmt(E.hueco, 2) + '">') +
      campo('Separación en paralelo', 'Baseline spacing (mm)', '<input id="eSep" value="' + T.fmt(E.separacion, 2) + '">') +
      campo('Decimales', 'Decimals', '<select id="eDec">' + [0, 1, 2, 3].map(v => op(v, v, E.decimales)).join('') + '</select>') +
      campo('Unidades de cota', 'Dimension units', '<select id="eUni">' + op('', 'Las del plano', E.unidad || '') + op('mm', 'mm', E.unidad) + op('cm', 'cm', E.unidad) + op('m', 'm', E.unidad) + '</select>') +
    '</div></div></div>';
  $('#hojaCuerpo').querySelectorAll('input').forEach(i => i.addEventListener('keydown', ev => ev.stopPropagation()));
  $('#hCentrar').onclick = () => { centrar(); aviso('Dibujo centrado en la hoja'); };
  abrir('#mHoja');
}
function centrar() {
  const ents = ed.doc.entidades; if (!ents.length) return;
  const pts = []; for (const b of ed.cajas.values()) pts.push([b[0], b[1]], [b[2], b[3]]);
  const bb = T.caja(pts), [W, H] = T.tamHoja(ed.doc), m = ed.doc.hoja.margen, cj = T.cajetin(ed.doc);
  const zona = [m, m, W - m, cj.y];
  const dx = (zona[0] + zona[2]) / 2 - (bb[0] + bb[2]) / 2, dy = (zona[1] + zona[3]) / 2 - (bb[1] + bb[3]) / 2;
  ed.cambiar(() => { ed.doc.hoja.origen = [ed.doc.hoja.origen[0] + dx, ed.doc.hoja.origen[1] + dy]; }, 'hoja');
}
$('#hojaOk').onclick = () => {
  const d = ed.doc, num = id => T.num($(id).value);
  const e1 = num('#hE1'), e2 = num('#hE2'), mg = num('#hMargen'), paso = num('#hPaso');
  ed.cambiar(() => {
    d.hoja.formato = $('#hFormato').value; d.hoja.orientacion = $('#hOrient').value; d.hoja.cajetin = $('#hCajetin').value;
    if (mg >= 0 && mg <= 30) d.hoja.margen = mg;
    d.unidad = $('#hUnidad').value;
    if (e1 > 0 && e2 > 0) d.escala = [e1, e2];
    if (paso > 0) d.rejilla.paso = paso * T.UNI[d.unidad];
    document.querySelectorAll('[data-dato]').forEach(i => { d.hoja.datos[i.dataset.dato] = i.value; });
    const E = d.estiloCota;
    E.texto = +$('#eTexto').value; E.extremo = $('#eExtremo').value; E.decimales = +$('#eDec').value; E.unidad = $('#eUni').value || null;
    for (const [id, k] of [['#eFlecha', 'flecha'], ['#eSobre', 'sobresale'], ['#eHueco', 'hueco'], ['#eSep', 'separacion']]) { const v = num(id); if (v >= 0 && v < 30) E[k] = v; }
  }, 'hoja');
  cerrar('#mHoja'); ed.ajustar(); pintarEstado();
};
$('#bHoja').onclick = abrirHoja;
/* doble clic en el cajetín: datos de la hoja */
ed.lienzo.addEventListener('dblclick', ev => {
  const r = ed.lienzo.getBoundingClientRect(), P = ed.M(ed.pantM([ev.clientX - r.left, ev.clientY - r.top])), c = T.cajetin(ed.doc);
  if (P[0] >= c.x && P[0] <= c.x + c.w && P[1] >= c.y && P[1] <= c.y + c.h) abrirHoja();
});

/* ------------------------------------------------ otros botones */
$('#zMas').onclick = () => ed.zoom(1.25);
$('#zMenos').onclick = () => ed.zoom(0.8);
$('#zAjustar').onclick = () => ed.ajustar();
$('#bAyuda').onclick = () => abrir('#mAyuda');
$('#bPantalla').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => aviso('El navegador no deja poner la pantalla completa')); };
(function atajos() {
  const filas = T.HERRAMIENTAS.filter(h => h.tecla && h.id !== 'suelo').map(h => [h.nombre.replace(/ \(.*\)$/, ''), h.tecla]);
  filas.push(['Deshacer · Undo', 'Ctrl+Z'], ['Rehacer · Redo', 'Ctrl+Y'], ['Guardar archivo', 'Ctrl+S'], ['Abrir archivo', 'Ctrl+O'], ['Seleccionar todo', 'Ctrl+A'],
    ['Ortogonal · Ortho', 'F8'], ['Referencia a objetos', 'F3'], ['Imán a la rejilla', 'F9'], ['Ver rejilla', 'F7'], ['Ver la hoja entera', '0'], ['Acercar / alejar', '+ / −'],
    ['Terminar', 'Intro'], ['Cancelar', 'Esc'], ['Cerrar (línea, pared)', 'C'], ['Girar el bloque al colocarlo', 'R'], ['Mover lo seleccionado', '← ↑ → ↓']);
  $('#atajos').innerHTML = filas.map(f => '<div><span>' + f[0] + '</span><kbd>' + f[1] + '</kbd></div>').join('');
})();

/* ------------------------------------------------ arranque */
construirCarril();
(function inicio() {
  const g = T.lsGet(CLAVE);
  if (g && Array.isArray(g.entidades)) ed.cargar(g);
  else { const d = T.nuevoDoc({ nombre: 'Plano sin título' }); ed.cargar(d); }
  refrescar(); panel.actualizar(); pintarEstado();
  $('#guardado').textContent = g ? '✓ recuperado de este navegador' : '';
  marcarHerramienta('sel');
})();
T.cargarCatalogos('../comun/catalogos/').then(cat => {
  ed.cat = cat; ed.reconstruir(); biblio.poner(cat); panel.actualizar();
  if (cat.errores.length) console.warn('Catálogos:', cat.errores);
});
cargarPlantillas();
window.addEventListener('beforeunload', () => { T.lsSet(CLAVE, ed.doc); });
window.planoEditor = ed; // para las pruebas automáticas
})();
