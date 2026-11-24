/* ===========================================================================
   CASA 3D · la vista en tres dimensiones (three.js r159, la misma de AulaCAD)
   Pocos polígonos, sin sombras por defecto, se dibuja solo cuando algo cambia
   y con la densidad de píxeles limitada: pensado para Chromebooks modestos.
   Coordenadas: el plano (x, y) en mm → three (X = x, Y = altura, Z = −y) en metros.
   © 2026 Juan Salguero Salguero · CC BY-NC-SA 4.0
   =========================================================================== */
(function (W) {
'use strict';
const T = W.Taller, V = T.V, RAD = T.RAD, THREE = W.THREE;
const M = 1 / 1000;

/* texturas sencillas dibujadas con canvas (sin descargar imágenes) */
const texCache = new Map();
function textura(tipo, color) {
  const k = tipo + color;
  if (texCache.has(k)) return texCache.get(k);
  const n = 128, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const cx = cv.getContext('2d'), c = new THREE.Color(color);
  const tono = f => '#' + c.clone().multiplyScalar(f).getHexString();
  cx.fillStyle = color; cx.fillRect(0, 0, n, n);
  let rep = 1; // metros que ocupa la textura
  if (tipo === 'parquet') {
    rep = 0.8;
    for (let i = 0; i < 8; i++) { cx.fillStyle = tono(0.86 + ((i * 37) % 5) * 0.05); cx.fillRect(0, i * 16, n, 15); cx.fillStyle = tono(0.7); cx.fillRect(((i * 53) % 4) * 32 + 20, i * 16, 1.5, 16); }
    cx.fillStyle = tono(0.65); for (let i = 0; i < 8; i++) cx.fillRect(0, i * 16 + 15, n, 1);
  } else if (tipo === 'baldosa') {
    rep = 0.6; cx.strokeStyle = tono(0.72); cx.lineWidth = 2;
    for (let i = 0; i <= 2; i++) { cx.beginPath(); cx.moveTo(i * 64, 0); cx.lineTo(i * 64, n); cx.moveTo(0, i * 64); cx.lineTo(n, i * 64); cx.stroke(); }
  } else if (tipo === 'moqueta') {
    rep = 0.5;
    for (let i = 0; i < 1400; i++) { cx.fillStyle = tono(0.85 + Math.random() * 0.25); cx.fillRect(Math.random() * n, Math.random() * n, 2, 2); }
  } else return null;
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.userData = { rep };
  texCache.set(k, t);
  return t;
}

T.Vista3D = function (canvas, opc) {
  opc = opc || {};
  const v = { sombras: false, techo: false, modo: 'orbita' };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(W.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe8ec');
  const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb9ae96, 1.25); scene.add(hemi);
  const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(-6, 12, 8); scene.add(sol); scene.add(sol.target);
  sol.shadow.mapSize.set(1024, 1024); sol.shadow.bias = -0.0005;
  const amb = new THREE.AmbientLight(0xffffff, 0.25); scene.add(amb);
  const suelo0 = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshLambertMaterial({ color: '#c9d4bf' }));
  suelo0.rotation.x = -Math.PI / 2; suelo0.position.y = -0.004; suelo0.receiveShadow = true; scene.add(suelo0);
  let grupo = new THREE.Group(); scene.add(grupo);
  let marco = null;
  const caja1 = new THREE.BoxGeometry(1, 1, 1), cil1 = new THREE.CylinderGeometry(1, 1, 1, 14);
  const mats = new Map();
  const mat = (color, op) => {
    const k = color + '|' + (op || 1);
    if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color, transparent: !!op && op < 1, opacity: op || 1, depthWrite: !(op && op < 1) }));
    return mats.get(k);
  };
  /* objetivo de la órbita */
  const orb = { obj: new THREE.Vector3(1.6, 0.8, -1.4), dist: 9, az: -0.6, el: 0.9 };
  const vis = { pos: new THREE.Vector3(1.6, 1.6, -1.4), yaw: 0, pitch: -0.08 };
  let caja = null;

  /* ------------------------------------------------ construir la escena */
  function prisma(pts, z0, z1, material, sombra) {
    if (z1 - z0 < 1e-6 || pts.length < 3) return null;
    const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0] * M, p[1] * M)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: (z1 - z0) * M, bevelEnabled: false });
    const m = new THREE.Mesh(g, material);
    m.rotation.x = -Math.PI / 2; m.position.y = z0 * M;
    m.castShadow = m.receiveShadow = !!sombra;
    return m;
  }
  v.construir = (doc, geo) => {
    scene.remove(grupo);
    grupo.traverse(o => { if (o.geometry && o.geometry !== caja1 && o.geometry !== cil1) o.geometry.dispose(); });
    grupo = new THREE.Group(); scene.add(grupo);
    const S = v.sombras, casa = doc.casa || {};
    const pts = [];
    // paredes
    for (const g of geo.paredes.values()) {
      const e = g.e, H = e.altura || casa.altura || 2500, m = mat(e.colorPared || casa.colorPared || '#f4efe4');
      for (const pz of g.piezas) { const ms = prisma(pz.pts, 0, H, m, S); if (ms) { ms.userData.id = e.id; grupo.add(ms); } pts.push(...pz.pts); }
      for (const h of g.huecos) {
        // ventanas: el hueco va del antepecho hasta antepecho + alto; puertas: del suelo hasta su alto
        const he = h.e, esVentana = he.clase === 'ventana' || he.clase === 'balconera';
        const ap = esVentana ? Math.max(0, he.antepecho || 0) : 0;
        const alto = Math.min(ap + (he.alto || (esVentana ? 1200 : 2100)), H);
        const q = [h['0R'], h['1R'], h['1L'], h['0L']];
        if (H > alto) { const ms = prisma(q, alto, H, m, S); if (ms) { ms.userData.id = e.id; grupo.add(ms); } }
        if (ap > 0) { const ms = prisma(q, 0, ap, m, S); if (ms) { ms.userData.id = e.id; grupo.add(ms); } }
        const n = g.nl, tt = g.t;
        if (he.clase === 'ventana' || he.clase === 'balconera') {
          const vid = [V.add(h.ini, V.mul(n, -tt * 0.04)), V.add(h.fin, V.mul(n, -tt * 0.04)), V.add(h.fin, V.mul(n, tt * 0.04)), V.add(h.ini, V.mul(n, tt * 0.04))];
          const cr = prisma(vid, ap, alto, mat('#9fc6e8', 0.35)); if (cr) { cr.userData.id = he.id; grupo.add(cr); }
          const mc = mat('#f7f7f5');
          const marcoV = (a, b, z0, z1) => { const ms = prisma([V.add(a, V.mul(n, -tt * 0.07)), V.add(b, V.mul(n, -tt * 0.07)), V.add(b, V.mul(n, tt * 0.07)), V.add(a, V.mul(n, tt * 0.07))], z0, z1, mc); if (ms) { ms.userData.id = he.id; grupo.add(ms); } };
          const d = g.d, f = 45;
          marcoV(h.ini, V.add(h.ini, V.mul(d, f)), ap, alto); marcoV(V.sub(h.fin, V.mul(d, f)), h.fin, ap, alto);
          marcoV(h.ini, h.fin, ap, ap + f); marcoV(h.ini, h.fin, alto - f, alto);
          if (h.w > 900) marcoV(V.add(V.mid(h.ini, h.fin), V.mul(d, -f / 2)), V.add(V.mid(h.ini, h.fin), V.mul(d, f / 2)), ap, alto);
        } else if (he.clase === 'puerta' || he.clase === 'puerta-doble' || he.clase === 'corredera') {
          const abre = he.abre === -1 ? -1 : 1, nn = V.mul(n, abre), md = mat(he.color || '#b07a4a');
          const hoja = (bis, otro, w) => {
            const h0 = V.add(bis, V.mul(nn, tt / 2)), dd = V.norm(V.sub(otro, bis));
            // la hoja abierta a unos 80°
            const ang = 80 * RAD, dir = V.add(V.mul(nn, Math.sin(ang)), V.mul(dd, Math.cos(ang)));
            const pd = V.mul(V.perp(dir), V.dot(V.perp(dir), dd) >= 0 ? 40 : -40);
            const q2 = [h0, V.add(h0, V.mul(dir, w)), V.add(V.add(h0, V.mul(dir, w)), pd), V.add(h0, pd)];
            const ms = prisma(q2, 5, alto - 5, md, S); if (ms) { ms.userData.id = he.id; grupo.add(ms); }
          };
          if (he.clase === 'puerta') { const ini = he.bisagra === 'fin' ? h.fin : h.ini, fin = he.bisagra === 'fin' ? h.ini : h.fin; hoja(ini, fin, h.w); }
          else if (he.clase === 'puerta-doble') { hoja(h.ini, h.fin, h.w / 2); hoja(h.fin, h.ini, h.w / 2); }
          else { const q2 = [V.add(h.ini, V.mul(n, tt * 0.05)), V.add(V.lerp(h.ini, h.fin, 0.55), V.mul(n, tt * 0.05)), V.add(V.lerp(h.ini, h.fin, 0.55), V.mul(n, tt * 0.25)), V.add(h.ini, V.mul(n, tt * 0.25))]; const ms = prisma(q2, 5, alto - 5, md, S); if (ms) { ms.userData.id = he.id; grupo.add(ms); } }
        }
      }
    }
    // suelos y techos
    for (const e of doc.entidades) {
      if (e.tipo !== 'suelo' || e.pts.length < 3) continue;
      const sh = new THREE.Shape(e.pts.map(p => new THREE.Vector2(p[0] * M, p[1] * M)));
      const g = new THREE.ShapeGeometry(sh);
      const col = e.color || casa.colorSuelo || '#c8a27a', tx = textura(e.textura || 'liso', col);
      let m;
      if (tx) {
        const rep = tx.userData.rep, uv = g.attributes.uv, pos = g.attributes.position;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / rep, pos.getY(i) / rep);
        const k = 'tx' + e.textura + col;
        if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ map: tx }));
        m = mats.get(k);
      } else m = mat(col);
      const ms = new THREE.Mesh(g, m); ms.rotation.x = -Math.PI / 2; ms.position.y = 0.002; ms.receiveShadow = S; ms.userData.id = e.id;
      grupo.add(ms); pts.push(...e.pts);
      if (e.techo !== false) {
        const H = casa.altura || 2500;
        const t2 = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshLambertMaterial({ color: casa.colorTecho || '#ffffff', side: THREE.BackSide }));
        t2.rotation.x = -Math.PI / 2; t2.position.y = H * M; t2.userData.techo = true; t2.visible = v.techo || v.modo === 'visitante';
        grupo.add(t2);
      }
    }
    // muebles
    for (const e of doc.entidades) {
      if (e.tipo !== 'bloque') continue;
      const b = geo.bloque(e), def = T.defBloque(doc, geo.cat, e.ref);
      const gr = new THREE.Group();
      gr.position.set(e.p[0] * M, 0, -e.p[1] * M); gr.rotation.y = (e.giro || 0) * RAD; if (e.espejo) gr.scale.x = -1;
      gr.userData.id = e.id;
      const base = e.color || (def && def.color) || '#cccccc';
      for (const p of b.piezas) {
        const m = p.mate === 'cristal' ? mat(p.color || '#cfe3ef', 0.35) : mat(p.color || base);
        let ms;
        if (p.tipo === 'caja') { if (p.w <= 0 || p.d <= 0 || p.h <= 0) continue; ms = new THREE.Mesh(caja1, m); ms.scale.set(p.w * M, p.h * M, p.d * M); ms.position.set((p.x + p.w / 2) * M, (p.z + p.h / 2) * M, -(p.y + p.d / 2) * M); }
        else {
          if (p.r <= 0 || p.h <= 0) continue;
          ms = new THREE.Mesh(cil1, m); ms.scale.set(p.r * M, p.h * M, p.r * M);
          if (p.eje === 'x') { ms.rotation.z = Math.PI / 2; ms.position.set((p.x + p.h / 2) * M, p.z * M, -p.y * M); }
          else if (p.eje === 'y') { ms.rotation.x = Math.PI / 2; ms.position.set(p.x * M, p.z * M, -(p.y + p.h / 2) * M); }
          else ms.position.set(p.x * M, (p.z + p.h / 2) * M, -p.y * M);
        }
        ms.castShadow = ms.receiveShadow = S; ms.userData.id = e.id;
        gr.add(ms);
      }
      grupo.add(gr); pts.push(...b.esquinas);
    }
    caja = pts.length ? T.caja(pts) : null;
    // sombras: el sol abarca la casa
    renderer.shadowMap.enabled = S; sol.castShadow = S;
    if (caja) {
      const cx = (caja[0] + caja[2]) / 2 * M, cz = -(caja[1] + caja[3]) / 2 * M, r = Math.max(caja[2] - caja[0], caja[3] - caja[1]) * M * 0.75 + 2;
      sol.position.set(cx - 6, 12, cz + 8); sol.target.position.set(cx, 0, cz);
      Object.assign(sol.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 40 }); sol.shadow.camera.updateProjectionMatrix();
    }
    v.marcar(opc.seleccion ? opc.seleccion() : []);
    v.pedir();
  };
  v.marcar = ids => {
    if (marco) { scene.remove(marco); marco.geometry.dispose(); marco = null; }
    const set = new Set(ids || []);
    if (!set.size) { v.pedir(); return; }
    const objs = [];
    grupo.traverse(o => { if ((o.isMesh || o.isGroup) && set.has(o.userData.id) && o !== grupo) objs.push(o); });
    if (!objs.length) { v.pedir(); return; }
    const bb = new THREE.Box3(); objs.forEach(o => bb.expandByObject(o));
    marco = new THREE.Box3Helper(bb, 0xff6a1f); scene.add(marco);
    v.pedir();
  };
  v.encuadrar = () => {
    if (!caja) { orb.obj.set(0, 0, 0); orb.dist = 8; v.pedir(); return; }
    const cx = (caja[0] + caja[2]) / 2 * M, cz = -(caja[1] + caja[3]) / 2 * M, r = Math.max(caja[2] - caja[0], caja[3] - caja[1]) * M;
    const rr = canvas.parentElement.getBoundingClientRect(), asp = rr.width / Math.max(1, rr.height);
    orb.obj.set(cx, 0.6, cz); orb.dist = Math.max(3, (r * 1.25 + 1.5) * Math.max(1, 1.25 / asp)); orb.az = -0.55; orb.el = 0.85;
    vis.pos.set(cx, 1.6, cz); vis.yaw = 0; vis.pitch = -0.08;
    v.pedir();
  };
  v.ponerVisitante = (p, yaw) => { vis.pos.set(p[0] * M, 1.6, -p[1] * M); if (yaw != null) vis.yaw = yaw; v.pedir(); };

  /* ------------------------------------------------ cámara y dibujo bajo demanda */
  let raf = 0, ancho = 1, alto = 1;
  v.pedir = () => { if (!raf) raf = requestAnimationFrame(pintar); };
  function colocarCamara() {
    if (v.modo === 'visitante') {
      cam.position.copy(vis.pos);
      const d = new THREE.Vector3(Math.sin(vis.yaw) * Math.cos(vis.pitch), Math.sin(vis.pitch), -Math.cos(vis.yaw) * Math.cos(vis.pitch));
      cam.lookAt(vis.pos.clone().add(d)); cam.fov = 65;
    } else {
      const ce = Math.cos(orb.el);
      cam.position.set(orb.obj.x + orb.dist * ce * Math.sin(orb.az), orb.obj.y + orb.dist * Math.sin(orb.el), orb.obj.z + orb.dist * ce * Math.cos(orb.az));
      cam.lookAt(orb.obj); cam.fov = 50;
    }
    cam.updateProjectionMatrix();
  }
  function pintar() {
    raf = 0;
    const r = canvas.parentElement.getBoundingClientRect();
    if (Math.round(r.width) !== ancho || Math.round(r.height) !== alto) { ancho = Math.max(1, Math.round(r.width)); alto = Math.max(1, Math.round(r.height)); renderer.setSize(ancho, alto, false); cam.aspect = ancho / alto; }
    grupo.traverse(o => { if (o.userData.techo) o.visible = v.techo || v.modo === 'visitante'; });
    colocarCamara();
    renderer.render(scene, cam);
    if (mover()) v.pedir();
  }
  if (W.ResizeObserver) new ResizeObserver(() => v.pedir()).observe(canvas.parentElement);

  /* ------------------------------------------------ ratón, panel táctil y teclado */
  const punteros = new Map(); let arr = null, pinza = null;
  canvas.addEventListener('contextmenu', ev => ev.preventDefault());
  canvas.addEventListener('pointerdown', ev => {
    canvas.focus();
    punteros.set(ev.pointerId, [ev.clientX, ev.clientY]);
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
    if (punteros.size === 2) { const [a, b] = [...punteros.values()]; pinza = { d: V.dist(a, b) }; arr = null; return; }
    arr = { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, pan: ev.button === 2 || ev.button === 1 || ev.shiftKey, movido: false };
  });
  canvas.addEventListener('pointermove', ev => {
    if (punteros.has(ev.pointerId)) punteros.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (pinza && punteros.size === 2) { const [a, b] = [...punteros.values()], d = V.dist(a, b); if (pinza.d > 10) zoom(pinza.d / d); pinza.d = d; return; }
    if (!arr) return;
    const dx = ev.clientX - arr.x, dy = ev.clientY - arr.y; arr.x = ev.clientX; arr.y = ev.clientY;
    if (Math.abs(ev.clientX - arr.x0) + Math.abs(ev.clientY - arr.y0) > 4) arr.movido = true;
    if (v.modo === 'visitante') { vis.yaw += dx * 0.005; vis.pitch = Math.max(-1.2, Math.min(1.2, vis.pitch - dy * 0.004)); }
    else if (arr.pan) {
      const s = orb.dist * 0.0016, rx = new THREE.Vector3(Math.cos(orb.az), 0, -Math.sin(orb.az)), fz = new THREE.Vector3(Math.sin(orb.az), 0, Math.cos(orb.az));
      orb.obj.addScaledVector(rx, -dx * s).addScaledVector(fz, -dy * s);
    } else { orb.az -= dx * 0.006; orb.el = Math.max(0.05, Math.min(1.5, orb.el + dy * 0.005)); }
    v.pedir();
  });
  const fin = ev => {
    punteros.delete(ev.pointerId);
    if (pinza) { if (punteros.size < 2) pinza = null; arr = null; return; }
    if (arr && !arr.movido && opc.alTocar) {
      const r = canvas.getBoundingClientRect(), ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1), cam);
      const hit = ray.intersectObjects(grupo.children, true).find(h => h.object.visible && h.object.userData.id);
      opc.alTocar(hit ? hit.object.userData.id : null);
    }
    arr = null;
  };
  canvas.addEventListener('pointerup', fin);
  canvas.addEventListener('pointercancel', ev => { punteros.delete(ev.pointerId); arr = null; pinza = null; });
  function zoom(f) {
    if (v.modo === 'visitante') { cam.fov = Math.max(30, Math.min(90, cam.fov * f)); return v.pedir(); }
    orb.dist = Math.max(1, Math.min(80, orb.dist * f)); v.pedir();
  }
  v.zoom = zoom;
  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    if (v.modo === 'visitante') { andar(-Math.sign(ev.deltaY) * 0.3, 0); return; }
    const rueda = ev.deltaMode === 1 || (ev.deltaX === 0 && Math.abs(ev.deltaY) >= 40 && Number.isInteger(ev.deltaY));
    if (ev.ctrlKey || rueda) zoom(Math.exp(ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0015)));
    else { orb.az -= ev.deltaX * 0.004; orb.el = Math.max(0.05, Math.min(1.5, orb.el + ev.deltaY * 0.004)); v.pedir(); }
  }, { passive: false });
  /* paseo con las flechas: se choca con las paredes */
  const teclas = new Set();
  canvas.addEventListener('keydown', ev => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(ev.key)) {
      ev.preventDefault(); ev.stopPropagation();
      if (v.modo !== 'visitante') { if (ev.key.startsWith('Arrow')) { if (ev.key === 'ArrowLeft') orb.az += 0.08; if (ev.key === 'ArrowRight') orb.az -= 0.08; if (ev.key === 'ArrowUp') zoom(0.9); if (ev.key === 'ArrowDown') zoom(1.1); v.pedir(); } return; }
      teclas.add(ev.key.toLowerCase()); v.pedir();
    }
  });
  canvas.addEventListener('keyup', ev => teclas.delete(ev.key.toLowerCase()));
  canvas.addEventListener('blur', () => teclas.clear());
  let ultimo = 0;
  function mover() {
    if (v.modo !== 'visitante' || !teclas.size) { ultimo = 0; return false; }
    const t = performance.now(), dt = ultimo ? Math.min(0.06, (t - ultimo) / 1000) : 0.016; ultimo = t;
    let ad = 0, gi = 0;
    if (teclas.has('arrowup') || teclas.has('w')) ad += 1.4 * dt;
    if (teclas.has('arrowdown') || teclas.has('s')) ad -= 1.4 * dt;
    if (teclas.has('arrowleft') || teclas.has('a')) gi -= 1.6 * dt;
    if (teclas.has('arrowright') || teclas.has('d')) gi += 1.6 * dt;
    andar(ad, gi);
    return true;
  }
  function andar(ad, gi) {
    vis.yaw += gi;
    const nx = vis.pos.x + Math.sin(vis.yaw) * ad, nz = vis.pos.z - Math.cos(vis.yaw) * ad;
    const p = [nx / M, -nz / M];
    if (!opc.choca || !opc.choca(p)) { vis.pos.x = nx; vis.pos.z = nz; }
    v.pedir();
  }
  v.andar = andar;
  v.captura = () => new Promise(ok => { colocarCamara(); renderer.render(scene, cam); canvas.toBlob(ok, 'image/png'); });
  v.renderer = renderer; v.escena = scene; v.camara = cam;
  return v;
};
})(window);
