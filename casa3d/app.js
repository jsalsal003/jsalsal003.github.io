/* ===========================================================================
   CASA 3D · la aplicación: planta (editor 2D común) + vista 3D + catálogo
   © 2026 Juan Salguero Salguero · CC BY-NC-SA 4.0
   =========================================================================== */
(function () {
'use strict';
const T = window.Taller, V = T.V;
const $ = s => document.querySelector(s);
const CLAVE = 'casa3d.doc', CLAVE_IMPORTAR = 'taller.casa3d.importar';
const modalAbierto = () => !!document.querySelector('.modal:not([hidden])');
let tAviso = 0;
function aviso(t) { const a = $('#aviso'); a.textContent = t; a.classList.add('ver'); clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('ver'), 3200); }
function abrir(id) { $(id).hidden = false; }
function cerrar(id) { $(id).hidden = true; }
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', ev => { if (ev.target === m || ev.target.closest('[data-cerrar]')) cerrar('#' + m.id); }));

/* ------------------------------------------------ editor de la planta */
const HERRS = ['sel', 'mano', 'pared', 'habitacion', 'suelo', 'mover', 'copiar', 'girar', 'simetria', 'borrar', 'cota-ali', 'cota-lin', 'cota-rapida', 'medir'];
let panel = null, vista = null, biblio = null, arq = null, herrHueco = null;
const c3d = $('#c3d');
const ed = T.Editor2D($('#lienzo'), {
  hoja: false, suelos: true, colorMuebles: true, rellenoPared: '#9d9584',
  herramientas: HERRS,
  activo: () => !modalAbierto() && document.activeElement !== c3d,
  alMensaje: t => { $('#msg').textContent = t; },
  alAviso: aviso,
  alCambiar: () => { guardarLocal(); refrescar(); pedir3d(); },
  alVivo: () => pedir3d(true),
  alSeleccion: () => { if (!panel) return; panel.actualizar(); if (ed.sel.size) mostrar('pProp'); vista && vista.marcar([...ed.sel]); },
  alHerramienta: id => { marcarHerramienta(id); panel && panel.actualizar(); },
  alCursor: p => { const f = T.UNI[ed.doc.unidad]; $('#xy').textContent = 'x ' + T.fmt(p[0] / f, 2) + ' · y ' + T.fmt(p[1] / f, 2) + ' ' + ed.doc.unidad; },
  alImanes: () => pintarEstado(),
  alEscribir: ch => { const c = $('#cmd'); c.focus(); c.value += ch; },
  alMedicion: () => { mostrar('pProp'); panel && panel.actualizar(); },
});
panel = T.Panel($('#pProp'), ed, { casa: true, ayudaVacia: 'Haz clic en una pared, una puerta o un mueble para ver sus medidas.' });

/* ------------------------------------------------ vista 3D */
let t3d = 0, ultimo3d = 0;
function pedir3d(vivo) {
  clearTimeout(t3d);
  const ahora = performance.now();
  if (vivo && ahora - ultimo3d < 160) { t3d = setTimeout(() => pedir3d(), 170); return; }
  t3d = setTimeout(() => { ultimo3d = performance.now(); vista.construir(ed.doc, ed.geo); }, vivo ? 0 : 60);
}
vista = T.Vista3D(c3d, {
  seleccion: () => [...ed.sel],
  alTocar: id => { ed.sel.clear(); if (id) { const e = ed.geo.ents.get(id); if (e) ed.sel.add(e.tipo === 'hueco' || e.tipo === 'pared' || e.tipo === 'bloque' || e.tipo === 'suelo' ? id : id); } ed.pedir(); panel.actualizar(); if (id) mostrar('pProp'); vista.marcar([...ed.sel]); },
  choca: p => {
    for (const g of ed.geo.paredes.values()) {
      for (const pz of g.piezas) if (T.dentroPoli(p, pz.pts) || pz.pts.some((q, i) => T.distSeg(p, q, pz.pts[(i + 1) % pz.pts.length]).d < 180)) return true;
      for (const h of g.huecos) if (h.e.clase === 'ventana' && T.distSeg(p, h.ini, h.fin).d < g.t / 2 + 180) return true;
    }
    return false;
  },
});
document.querySelectorAll('.p3d .modo button').forEach(b => b.addEventListener('click', () => {
  vista.modo = b.dataset.c;
  document.querySelectorAll('.p3d .modo button').forEach(x => x.classList.toggle('on', x === b));
  $('#pista').textContent = vista.modo === 'visitante' ? 'flechas o W A S D para andar · arrastra para mirar · haz clic aquí primero' : 'arrastra para girar · rueda para acercar · Mayús + arrastrar para desplazar';
  if (vista.modo === 'visitante') { colocarVisitante(); c3d.focus(); }
  vista.pedir();
}));
function colocarVisitante() {
  // en el centro de la habitación más grande, mirando hacia dentro
  const s = ed.doc.entidades.filter(e => e.tipo === 'suelo').sort((a, b) => Math.abs(T.areaPoli(b.pts)) - Math.abs(T.areaPoli(a.pts)))[0];
  let p;
  if (s) { const b = T.caja(s.pts); p = [(b[0] + b[2]) / 2, b[1] + (b[3] - b[1]) * 0.15]; }
  else { const b = ed.cajaDibujo(); p = b ? ed.Mi([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]) : [0, 0]; }
  vista.ponerVisitante(p, 0);
}
$('#bTecho').onclick = () => { vista.techo = !vista.techo; $('#bTecho').classList.toggle('on', vista.techo); vista.pedir(); };
$('#bSombras').onclick = () => { vista.sombras = !vista.sombras; $('#bSombras').classList.toggle('on', vista.sombras); vista.construir(ed.doc, ed.geo); aviso(vista.sombras ? 'Sombras activadas (va más lento)' : 'Sombras desactivadas'); };
$('#bEncuadrar').onclick = () => { vista.encuadrar(); };

/* planta, 3D o las dos */
document.querySelectorAll('.top .modo button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.top .modo button').forEach(x => x.classList.toggle('on', x === b));
  document.body.classList.toggle('solo-planta', b.dataset.v === 'planta');
  document.body.classList.toggle('solo-3d', b.dataset.v === '3d');
  setTimeout(() => { ed.redimensionar(); vista.pedir(); }, 30);
}));

/* ------------------------------------------------ herramientas */
function construirCarril() {
  const c = $('#carril'); c.innerHTML = '';
  const grupos = [['General', ['sel', 'mano', 'medir']], ['Construir', ['pared', 'habitacion', 'puerta', 'ventana', 'abertura', 'suelo']], ['Editar', ['mover', 'copiar', 'girar', 'simetria', 'borrar']], ['Cotas', ['cota-ali', 'cota-lin', 'cota-rapida']]];
  for (const [tit, ids] of grupos) {
    const h = document.createElement('h3'); h.textContent = tit; c.appendChild(h);
    const g = document.createElement('div'); g.className = 'herrs'; c.appendChild(g);
    for (const id of ids) {
      const b = document.createElement('button'); b.className = 'herr'; b.dataset.h = id;
      if (['puerta', 'ventana', 'abertura'].includes(id)) {
        const nombres = { puerta: ['Puerta', 'Door'], ventana: ['Ventana', 'Window'], abertura: ['Abertura', 'Opening'] }[id];
        b.classList.add('hueco'); b.title = nombres[0] + ' · ' + nombres[1] + ' (clic encima de una pared)';
        b.innerHTML = T.icono(id);
        b.onclick = () => { const def = arq && arq.find(d => d.id === id) || { id, ref: 'arquitectura/' + id, hueco: id, nombre: nombres[0], factor: 10, medidas: id === 'ventana' ? { ancho: 120, alto: 120, antepecho: 90 } : { ancho: id === 'puerta' ? 80 : 90, alto: 210 } }; ed.herramienta('hueco', def); marcarHerramienta(id); };
      } else {
        const m = T.herramienta(id);
        b.innerHTML = T.icono(id) + (m.tecla && m.tecla.length === 1 ? '<span class="tk">' + m.tecla + '</span>' : '');
        b.title = m.nombre + ' · ' + m.en + (m.tecla ? ' (' + m.tecla + ')' : '');
        b.onclick = () => ed.herramienta(id);
      }
      g.appendChild(b);
    }
  }
}
function marcarHerramienta(id) {
  if (['puerta', 'ventana', 'abertura'].includes(id)) herrHueco = id; else if (id !== 'hueco') herrHueco = null;
  document.querySelectorAll('.herr[data-h]').forEach(b => b.classList.toggle('on', b.dataset.h === id || (id === 'hueco' && b.dataset.h === herrHueco)));
}

/* ------------------------------------------------ panel derecho */
function mostrar(id) {
  document.querySelectorAll('#pestanas button').forEach(b => b.classList.toggle('on', b.dataset.p === id));
  ['pCat', 'pProp', 'pCasa'].forEach(p => { $('#' + p).hidden = p !== id; });
  if (id === 'pCasa') pintarCasa();
}
document.querySelectorAll('#pestanas button').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.p)));
biblio = T.Biblioteca($('#pCat'), {
  titulo: 'Catálogo', en: 'Furniture & openings',
  filtro: d => !d.herramienta || d.herramienta === 'habitacion' || d.herramienta === 'pared',
  alElegir: def => { if (def.herramienta) { ed.herramienta(def.herramienta); return; } if (def.hueco) { ed.herramienta('hueco', def); return; } ed.herramienta('bloque', def); },
  pie: 'Haz clic en un mueble y luego en la planta. <b>R</b> lo gira 90° antes de colocarlo.',
});
function pintarCasa() {
  const el = $('#pCasa'), c = ed.doc.casa, f = T.UNI[ed.doc.unidad];
  el.innerHTML = '<h4>La casa <small>House settings</small></h4><p class="nota">Valores por defecto para las paredes y los suelos nuevos, y para las que no tienen uno propio.</p>';
  const fila = (es, en, html) => { const l = document.createElement('label'); l.className = 'campo'; l.innerHTML = '<span>' + es + '<small>' + en + '</small></span>' + html; el.appendChild(l); return l.lastElementChild; };
  const alt = fila('Altura de las paredes', 'Wall height (' + ed.doc.unidad + ')', '<input value="' + T.fmt(c.altura / f, 2) + '">');
  alt.onchange = () => { const n = T.num(alt.value); if (n > 0) ed.cambiar(() => { const viejo = c.altura; c.altura = n * f; ed.opcPared.altura = c.altura; ed.doc.entidades.forEach(e => { if (e.tipo === 'pared' && (!e.altura || e.altura === viejo)) e.altura = c.altura; }); }, 'casa'); };
  alt.onkeydown = ev => ev.stopPropagation();
  const gro = fila('Grosor de paredes nuevas', 'New wall thickness (' + ed.doc.unidad + ')', '<input value="' + T.fmt(ed.opcPared.grosor / f, 2) + '">');
  gro.onchange = () => { const n = T.num(gro.value); if (n > 0) { ed.opcPared.grosor = n * f; c.grosor = n * f; guardarLocal(); } };
  gro.onkeydown = ev => ev.stopPropagation();
  const cp = fila('Color de las paredes', 'Wall colour', '<input type="color" value="' + c.colorPared + '">');
  cp.onchange = () => ed.cambiar(() => { c.colorPared = cp.value; }, 'casa');
  const cs = fila('Color de los suelos nuevos', 'Floor colour', '<input type="color" value="' + c.colorSuelo + '">');
  cs.onchange = () => ed.cambiar(() => { c.colorSuelo = cs.value; }, 'casa');
  const tx = fila('Textura de los suelos nuevos', 'Floor texture', '<select>' + T.TEXTURAS.map(t => '<option value="' + t[0] + '"' + (t[0] === c.texturaSuelo ? ' selected' : '') + '>' + t[1] + ' · ' + t[2] + '</option>').join('') + '</select>');
  tx.onchange = () => ed.cambiar(() => { c.texturaSuelo = tx.value; }, 'casa');
  const ct = fila('Color del techo', 'Ceiling colour', '<input type="color" value="' + c.colorTecho + '">');
  ct.onchange = () => ed.cambiar(() => { c.colorTecho = ct.value; }, 'casa');
  const b = document.createElement('button'); b.className = 'chip'; b.textContent = 'Aplicar color y textura a todos los suelos'; b.style.marginTop = '.5rem';
  b.onclick = () => ed.cambiar(() => ed.doc.entidades.forEach(e => { if (e.tipo === 'suelo') { e.color = c.colorSuelo; e.textura = c.texturaSuelo; } }), 'casa');
  el.appendChild(b);
  const n = { pared: 0, hueco: 0, bloque: 0, suelo: 0 }; ed.doc.entidades.forEach(e => { if (e.tipo in n) n[e.tipo]++; });
  const area = ed.doc.entidades.filter(e => e.tipo === 'suelo').reduce((s, e) => s + Math.abs(T.areaPoli(e.pts)), 0) / 1e6;
  const p = document.createElement('p'); p.className = 'medida'; p.style.marginTop = '.8rem';
  p.innerHTML = n.pared + ' paredes · ' + n.hueco + ' puertas y ventanas · ' + n.bloque + ' muebles<br>' + n.suelo + ' habitaciones · <b>' + T.fmt(area, 2) + ' m²</b> útiles';
  el.appendChild(p);
}

/* ------------------------------------------------ habitaciones automáticas */
function detectarHabitaciones(silencio) {
  const curvas = ed.geo.curvasHabitaciones();
  if (!curvas.length) { if (!silencio) aviso('Primero dibuja las paredes'); return 0; }
  const zonas = T.habitaciones(curvas, 25, 0.6e6);
  const existentes = ed.doc.entidades.filter(e => e.tipo === 'suelo');
  let nuevas = 0;
  ed.cambiar(() => {
    zonas.forEach(an => {
      const ext = an.reduce((a, b) => Math.abs(T.areaPoli(b)) > Math.abs(T.areaPoli(a)) ? b : a);
      const c = ext.reduce((s, p) => V.add(s, p), [0, 0]).map(x => x / ext.length);
      if (existentes.some(s => T.dentroPoli(c, s.pts))) return;
      ed.añadir({ tipo: 'suelo', pts: ext, nombre: 'Habitación ' + (existentes.length + nuevas + 1), color: ed.doc.casa.colorSuelo, textura: ed.doc.casa.texturaSuelo, techo: true });
      nuevas++;
    });
  }, 'suelos');
  if (!silencio) aviso(nuevas ? nuevas + ' habitación(es) con suelo' : 'No hay habitaciones nuevas cerradas por paredes');
  return nuevas;
}
$('#bHabitaciones').onclick = () => detectarHabitaciones();

/* ------------------------------------------------ estado, guardar */
function pintarEstado() {
  $('#tRejilla').classList.toggle('on', !!ed.doc.rejilla.ver);
  $('#tIman').classList.toggle('on', ed.imanes.rejilla);
  $('#tObjetos').classList.toggle('on', ed.imanes.objetos);
  $('#tOrto').classList.toggle('on', ed.imanes.orto);
  const f = T.UNI[ed.doc.unidad];
  if (document.activeElement !== $('#paso')) $('#paso').value = T.fmt(ed.doc.rejilla.paso / f, 3);
  $('#pasoU').textContent = ed.doc.unidad; $('#unidad').value = ed.doc.unidad;
}
$('#tRejilla').onclick = () => { ed.doc.rejilla.ver = !ed.doc.rejilla.ver; ed.pedir(true); pintarEstado(); };
$('#tIman').onclick = () => { ed.imanes.rejilla = !ed.imanes.rejilla; pintarEstado(); };
$('#tObjetos').onclick = () => { ed.imanes.objetos = !ed.imanes.objetos; pintarEstado(); };
$('#tOrto').onclick = () => { ed.imanes.orto = !ed.imanes.orto; pintarEstado(); };
$('#paso').addEventListener('change', () => { const n = T.num($('#paso').value); if (n > 0) ed.cambiar(() => { ed.doc.rejilla.paso = n * T.UNI[ed.doc.unidad]; }, 'rejilla'); });
$('#paso').addEventListener('keydown', ev => ev.stopPropagation());
$('#unidad').addEventListener('change', () => ed.cambiar(() => { ed.doc.unidad = $('#unidad').value; }, 'unidad'));
const cmd = $('#cmd');
cmd.addEventListener('keydown', ev => {
  ev.stopPropagation();
  if (ev.key === 'Enter') { ev.preventDefault(); const v = cmd.value.trim(); if (!v) { ed.lienzo.focus(); ed.tecla({ key: 'Enter' }); return; } if (/^[a-zA-Z]$/.test(v)) { cmd.value = ''; ed.lienzo.focus(); ed.tecla({ key: v }); return; } if (ed.comando(v)) { cmd.value = ''; ed.lienzo.focus(); } }
  else if (ev.key === 'Escape') { cmd.value = ''; ed.lienzo.focus(); }
});
let tGuardar = 0;
function guardarLocal() {
  clearTimeout(tGuardar);
  tGuardar = setTimeout(() => { const ok = T.lsSet(CLAVE, ed.doc); $('#guardado').textContent = ok ? '✓ guardado en este navegador' : '⚠ no se puede guardar en el navegador: usa «Guardar archivo»'; }, 350);
}
function refrescar() {
  if ($('#nombre') !== document.activeElement) $('#nombre').value = ed.doc.nombre;
  pintarEstado();
  if (!$('#pCasa').hidden) pintarCasa();
}
$('#nombre').addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') ed.lienzo.focus(); });
$('#nombre').addEventListener('change', () => { const v = $('#nombre').value.trim() || 'Mi casa'; ed.cambiar(() => { ed.doc.nombre = v; }, 'nombre'); });

/* ------------------------------------------------ archivos */
function prepararDoc(d) {
  d = T.normalizar(d);
  d.app = 'taller-casa3d';
  if (!(d.escala[1] >= 20)) d.escala = [1, 50]; // una pieza a 1:1 se ve igual; las cotas, a 1:50
  return d;
}
function cargar(d, auto) {
  ed.cargar(prepararDoc(d));
  ed.opcPared.grosor = ed.doc.casa.grosor || 150; ed.opcPared.altura = ed.doc.casa.altura || 2500;
  if (auto && !ed.doc.entidades.some(e => e.tipo === 'suelo')) detectarHabitaciones(true);
  ed.hist.reiniciar(JSON.stringify(ed.doc));
  guardarLocal(); refrescar(); panel.actualizar();
  vista.construir(ed.doc, ed.geo); vista.encuadrar();
}
function guardarArchivo() {
  T.descargar(new Blob([JSON.stringify(ed.doc, null, 1)], { type: 'application/json' }), T.nombreArchivo(ed.doc.nombre) + '.casa3d.json');
  aviso('Guardado en Descargas: ' + T.nombreArchivo(ed.doc.nombre) + '.casa3d.json');
}
async function abrirArchivo() {
  try {
    const f = await T.abrirArchivo('.json,application/json');
    const d = JSON.parse(f.texto);
    if (!d || !Array.isArray(d.entidades)) throw new Error('no es un archivo de Plano 2D ni de Casa 3D');
    if (!d.nombre) d.nombre = f.nombre.replace(/\.(plano|casa3d)?\.?json$/i, '');
    cargar(d, true);
    aviso('Abierto: ' + f.nombre);
  } catch (e) { if (e && e.message !== 'Ningún archivo') aviso('No se puede abrir: ' + e.message); }
}
$('#bGuardar').onclick = guardarArchivo;
$('#bAbrir').onclick = abrirArchivo;
document.addEventListener('keydown', ev => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); guardarArchivo(); }
  else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'o') { ev.preventDefault(); abrirArchivo(); }
  else if (ev.key === 'F1') { ev.preventDefault(); abrir('#mAyuda'); }
  else if (ev.key === 'Escape' && modalAbierto()) document.querySelectorAll('.modal').forEach(m => { m.hidden = true; });
});

/* ------------------------------------------------ capturas */
$('#bCaptura').onclick = ev => { ev.stopPropagation(); $('#mCaptura').hidden = !$('#mCaptura').hidden; };
document.addEventListener('click', ev => { if (!ev.target.closest('.menu')) $('#mCaptura').hidden = true; });
$('#mCaptura').addEventListener('click', async ev => {
  const b = ev.target.closest('button'); if (!b) return;
  $('#mCaptura').hidden = true;
  const n = T.nombreArchivo(ed.doc.nombre);
  if (b.dataset.x === '3d') { const bl = await vista.captura(); T.descargar(bl, n + '-3d.png'); aviso('Vista 3D guardada en Descargas'); }
  else { const cv = ed.imagen(4); cv.toBlob(bl => { T.descargar(bl, n + '-planta.png'); aviso('Planta guardada en Descargas'); }, 'image/png'); }
});

/* ------------------------------------------------ nuevo y ejemplos */
let ejemplos = [];
async function cargarEjemplos() {
  try { ejemplos = (await (await fetch('ejemplos/indice.json', { cache: 'no-cache' })).json()).ejemplos || []; } catch (e) { ejemplos = []; }
}
function abrirNuevo() {
  $('#nuevoAviso').innerHTML = ed.doc.entidades.length ? '⚠ El proyecto que tienes ahora se sustituye. Si lo quieres conservar, primero <b>Guardar archivo</b>.' : 'Elige cómo empezar.';
  const el = $('#ejemplos'); el.innerHTML = '';
  const lista = [{ nombre: 'En blanco', en: 'Blank', icono: '+', descripcion: 'Sin paredes: empieza con Habitación o Pared.', vacio: true }].concat(ejemplos);
  for (const p of lista) {
    const t = document.createElement('button'); t.className = 'tarjeta';
    t.innerHTML = '<div class="vista">' + T.esc(p.icono || '⌂') + '</div><b>' + T.esc(p.nombre) + '</b><span>' + T.esc(p.descripcion || '') + (p.en ? ' · <i>' + T.esc(p.en) + '</i>' : '') + '</span>';
    t.onclick = async () => {
      try {
        let d;
        if (p.vacio) { d = T.nuevoDoc({ nombre: 'Mi casa', escala: [1, 50] }); d.app = 'taller-casa3d'; }
        else d = await (await fetch('ejemplos/' + p.archivo, { cache: 'no-cache' })).json();
        cerrar('#mNuevo'); cargar(d, true); aviso(p.vacio ? 'Proyecto nuevo' : 'Ejemplo «' + p.nombre + '»');
      } catch (e) { aviso('No se puede abrir el ejemplo: ' + e.message); }
    };
    el.appendChild(t);
  }
  abrir('#mNuevo');
}
$('#bNuevo').onclick = abrirNuevo;

/* ------------------------------------------------ otros */
$('#zMas').onclick = () => ed.zoom(1.25);
$('#zMenos').onclick = () => ed.zoom(0.8);
$('#zAjustar').onclick = () => ed.ajustar();
$('#bAyuda').onclick = () => abrir('#mAyuda');
$('#bPantalla').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => aviso('El navegador no deja poner la pantalla completa')); };
$('#atajos').innerHTML = [['Pared', 'W'], ['Habitación rectangular', 'B'], ['Suelo de una habitación', 'F'], ['Mover', 'M'], ['Copiar', 'O'], ['Girar', 'G'], ['Simetría', 'S'], ['Borrar', 'Supr'], ['Cota alineada', 'J'], ['Acotación rápida', 'Q'], ['Medir', 'I'], ['Girar el mueble al colocarlo', 'R'],
  ['Deshacer · Undo', 'Ctrl+Z'], ['Rehacer · Redo', 'Ctrl+Y'], ['Guardar archivo', 'Ctrl+S'], ['Abrir archivo', 'Ctrl+O'], ['Cerrar las paredes', 'C'], ['Terminar · Cancelar', 'Intro · Esc'],
  ['Visitante: andar y girar', '↑ ↓ ← →'], ['Ver todo', '0']].map(f => '<div><span>' + f[0] + '</span><kbd>' + f[1] + '</kbd></div>').join('');

/* ------------------------------------------------ arranque */
construirCarril();
(async function inicio() {
  const params = new URLSearchParams(location.search);
  const importado = params.get('desde') === 'plano' ? T.lsGet(CLAVE_IMPORTAR) : null;
  if (importado && Array.isArray(importado.entidades)) {
    T.lsDel(CLAVE_IMPORTAR);
    cargar(importado, true);
    aviso('Plano «' + (importado.nombre || '') + '» levantado en 3D');
    history.replaceState(null, '', location.pathname);
  } else {
    const g = T.lsGet(CLAVE);
    if (g && Array.isArray(g.entidades)) { cargar(g, false); $('#guardado').textContent = '✓ recuperado de este navegador'; }
    else {
      try { cargar(await (await fetch('ejemplos/dormitorio-amueblado.casa3d.json')).json(), true); }
      catch (e) { cargar(T.nuevoDoc({ nombre: 'Mi casa', escala: [1, 50] }), false); }
    }
  }
  marcarHerramienta('sel');
  cargarEjemplos();
  const cat = await T.cargarCatalogos('../comun/catalogos/');
  ed.cat = cat; arq = (cat.listas.find(l => l.categoria === 'arquitectura') || { bloques: [] }).bloques;
  ed.reconstruir(); biblio.poner(cat); panel.actualizar(); vista.construir(ed.doc, ed.geo);
})();
window.addEventListener('beforeunload', () => T.lsSet(CLAVE, ed.doc));
window.casaEditor = ed; window.casaVista = vista; // para las pruebas automáticas
})();
