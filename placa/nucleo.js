/* ===================================================================
   PLACA VIRTUAL — núcleo compartido por el simulador y el corrector del profesor.
   Bloques y lo que hacen, simulación instantánea, comparación con la solución,
   retos, batería del examen, dibujo del programa y del cronograma, y el código del QR.
   © 2026 Juan Salguero Salguero · CC BY-NC-SA 4.0
   =================================================================== */
var PlacaNucleo = (function () {
  'use strict';
  const fmt = n => String(Math.round(n * 100) / 100).replace('.', ',');
  const fmt1 = n => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

  /* ---------- componentes ---------- */
  const LEDS = {
    'rojo':  { k: 'r', pin: 2, id: 'ledRojo',  col: '#ff4b3e', off: '#4a1714' },
    'ámbar': { k: 'a', pin: 3, id: 'ledAmbar', col: '#ffb000', off: '#4a3608' },
    'verde': { k: 'g', pin: 4, id: 'ledVerde', col: '#2ee66b', off: '#0f3d20' }
  };
  const KLED = { r: 'rojo', a: 'ámbar', g: 'verde' };
  const NOTES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do+'];
  const HZ = { 'Do': 262, 'Re': 294, 'Mi': 330, 'Fa': 349, 'Sol': 392, 'La': 440, 'Si': 494, 'Do+': 523 };
  // un color por nota (como los tubos sonoros del aula de música)
  const NCOL = { 'Do': '#e53935', 'Re': '#fb8c00', 'Mi': '#fdd835', 'Fa': '#43a047', 'Sol': '#00acc1', 'La': '#1e88e5', 'Si': '#8e24aa', 'Do+': '#d81b60' };
  const RGBN = ['apagado', 'rojo', 'verde', 'azul', 'amarillo', 'cian', 'morado', 'blanco'];
  const RGBC = { rojo: '#ff3b30', verde: '#2ee66b', azul: '#3b7bff', amarillo: '#ffd23f', cian: '#3fe3ff', morado: '#b54dff', blanco: '#f4f4f4' };
  const RGBP = { apagado: [0, 0, 0], rojo: [1, 0, 0], verde: [0, 1, 0], azul: [0, 0, 1], amarillo: [1, 1, 0], cian: [0, 1, 1], morado: [1, 0, 1], blanco: [1, 1, 1] };
  const MOTOR = ['parado', 'lento', 'rápido'];
  const SENS = {
    btn:  { ico: '●', lab: 'pulsador' },
    luz:  { ico: '☀', lab: 'luz', unit: '%', vals: [10, 30, 50, 70, 90] },
    dist: { ico: '⇥', lab: 'distancia', unit: 'cm', vals: [5, 10, 20, 50] },
    pot:  { ico: '◔', lab: 'potenciómetro', unit: '%', vals: [25, 50, 75] },
    temp: { ico: '°', lab: 'temperatura', unit: '°C', vals: [15, 20, 25, 30, 35] }
  };
  const SKEYS = ['btn', 'luz', 'dist', 'pot', 'temp'];
  const INDEF = { btn: 0, luz: 60, dist: 80, pot: 50, temp: 22 };
  const OUTK = ['r', 'a', 'g', 'bz', 'sv', 'rgb', 'mo', 'd7'];
  const COL = { led: '#0fbd8c', wait: '#ffab19', tone: '#9966ff', servo: '#4c97ff', 'if': '#ffab19', rep: '#ffab19', until: '#ffab19',
    rgb: '#e8508f', motor: '#6b7a8f', disp: '#d0532f', ev: '#e6a800', ct: '#ffab19' };

  function defCond(s) {
    if (s === 'btn') return { s: 'btn', op: '=', v: 1 };
    return { s, op: s === 'luz' || s === 'dist' ? '<' : '>', v: { luz: 30, dist: 20, pot: 50, temp: 25 }[s] };
  }
  function condText(c) {
    if (c.s === 'btn') return 'pulsador ' + (c.v ? 'pulsado' : 'suelto');
    const s = SENS[c.s]; return s.lab + ' ' + c.op + ' ' + c.v + ' ' + s.unit;
  }
  function test(c, read) {
    const v = read(c.s);
    if (c.s === 'btn') return (v ? 1 : 0) === c.v;
    return c.op === '<' ? v < c.v : v > c.v;
  }

  /* ---------- bloques: texto y comportamiento ----------
     go es un generador: produce un número cada vez que hay que esperar (en segundos). */
  const POLL = 0.025;
  const KIDS = { 'if': ['then', 'else'], rep: ['body'] };
  const B = {
    led:   { text: n => (n.v ? 'encender' : 'apagar') + ' LED ' + n.c, go: function* (n, x) { x.set(LEDS[n.c].k, n.v ? 1 : 0); } },
    wait:  { text: n => 'esperar ' + fmt(n.s) + ' s', go: function* (n) { yield n.s; } },
    tone:  { text: n => 'sonar zumbador ' + n.n + ' durante ' + fmt(n.s) + ' s', go: function* (n, x) { x.set('bz', n.n); yield n.s * 0.9; x.set('bz', null); yield n.s * 0.1; } },
    servo: { text: n => 'mover servo a ' + n.a + '°', go: function* (n, x) { x.set('sv', n.a); } },
    rgb:   { text: n => 'LED RGB en ' + n.col, go: function* (n, x) { x.set('rgb', n.col === 'apagado' ? null : n.col); } },
    motor: { text: n => 'motor ' + MOTOR[n.m], go: function* (n, x) { x.set('mo', n.m); } },
    disp:  { text: n => n.d < 0 ? 'apagar la pantalla' : 'mostrar ' + n.d + ' en la pantalla', go: function* (n, x) { x.set('d7', n.d < 0 ? null : n.d); } },
    'if':  { text: n => 'si ' + condText(n.cond) + ' entonces', go: function* (n, x) { if (test(n.cond, x.read)) yield* run(n.then, x); else if (n.else) yield* run(n.else, x); } },
    rep:   { text: n => 'repetir ' + n.n + ' veces', go: function* (n, x) { for (let i = 0; i < n.n; i++) yield* run(n.body, x); } },
    until: { text: n => 'esperar hasta que ' + condText(n.cond), go: function* (n, x) { let g = 0; while (!test(n.cond, x.read) && g++ < 200000) yield POLL; } }
  };
  function* run(list, x) {
    for (const n of list.slice()) { yield { n: n }; yield* B[n.t].go(n, x); }
  }
  function clean(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(n => n && B[n.t]).map(n => {
      if ((n.t === 'if' || n.t === 'until') && (!n.cond || !SENS[n.cond.s])) n.cond = defCond('btn');
      if (n.t === 'if') { n.then = clean(n.then); n.else = n.else ? clean(n.else) : null; }
      if (n.t === 'rep') { n.body = clean(n.body); if (!(n.n > 0)) n.n = 3; }
      return n;
    });
  }
  function scan(list, u) {
    list.forEach(n => {
      if (n.t === 'led') u[LEDS[n.c].k] = 1; else if (n.t === 'tone') u.bz = 1; else if (n.t === 'servo') u.sv = 1;
      else if (n.t === 'rgb') u.rgb = 1; else if (n.t === 'motor') u.mo = 1; else if (n.t === 'disp') u.d7 = 1;
      if (n.cond) u[n.cond.s] = 1;
      (KIDS[n.t] || []).forEach(k => { if (n[k]) scan(n[k], u); });
    });
    return u;
  }

  const On = c => ({ t: 'led', v: 1, c }), Off = c => ({ t: 'led', v: 0, c }), W = s => ({ t: 'wait', s }),
        T = (n, s) => ({ t: 'tone', n, s }), V = a => ({ t: 'servo', a }),
        IF = (s, op, v, th, els) => ({ t: 'if', cond: { s, op, v }, then: th, else: els || null }),
        C = col => ({ t: 'rgb', col }), M = m => ({ t: 'motor', m }), D = d => ({ t: 'disp', d }),
        REP = (n, body) => ({ t: 'rep', n, body }), UNTIL = (s, op, v) => ({ t: 'until', cond: { s, op, v } });

  /* ---------- cómo se mueven los sensores al comprobar ---------- */
  function steps(list) { return t => { let v = list[0][1]; for (const p of list) if (t >= p[0]) v = p[1]; return v; }; }
  const SC = {
    btn: t => ((t >= 1 && t < 3) || (t >= 5 && t < 5.6) || (t >= 7 && t < 9.5)) ? 1 : 0,
    luz: steps([[0, 80], [3, 20], [6, 50], [8, 10]]), luz2: steps([[0, 80], [2, 20], [5, 90], [7, 15]]),
    dist: steps([[0, 80], [2, 15], [5, 40], [7, 8]]), pot: steps([[0, 20], [3, 80], [6, 40], [8, 90]]),
    temp: steps([[0, 20], [3, 28], [6, 24], [8, 32]])
  };
  const SCENK = { btn: 'btn', luz: 'luz', luz2: 'luz', dist: 'dist', pot: 'pot', temp: 'temp' };
  const SCEN = {};
  Object.keys(SC).forEach(k => { SCEN[k] = t => { const o = Object.assign({}, INDEF); o[SCENK[k]] = SC[k](t); return o; }; });

  /* ---------- retos de práctica ---------- */
  const RETOS = {
    L1: [
      { id: 'semaforo', tit: 'Semáforo', txt: 'Rojo 5 s, verde 5 s y ámbar 2 s, y vuelta a empezar. Solo puede haber una luz encendida.', T: 24,
        sol: [On('rojo'), W(5), Off('rojo'), On('verde'), W(5), Off('verde'), On('ámbar'), W(2), Off('ámbar')] },
      { id: 'parpadeo', tit: 'LED que parpadea', txt: 'El LED rojo se enciende 1 s y se apaga 1 s, sin parar.', T: 6, sol: [On('rojo'), W(1), Off('rojo'), W(1)] },
      { id: 'dosled', tit: 'Dos LED a la vez', txt: 'El rojo y el verde se encienden juntos 1 s y se apagan juntos 1 s.', T: 6,
        sol: [On('rojo'), On('verde'), W(1), Off('rojo'), Off('verde'), W(1)] },
      { id: 'melodia', tit: 'Melodía', txt: '«Estrellita»: Do Do Sol Sol La La (0,5 s) y Sol (1 s); Fa Fa Mi Mi Re Re (0,5 s) y Do (1 s). Después espera 1 s.', T: 18,
        sol: [T('Do', .5), T('Do', .5), T('Sol', .5), T('Sol', .5), T('La', .5), T('La', .5), T('Sol', 1), T('Fa', .5), T('Fa', .5), T('Mi', .5), T('Mi', .5), T('Re', .5), T('Re', .5), T('Do', 1), W(1)] },
      { id: 'alarma', tit: 'Alarma', txt: 'El zumbador toca La y Mi de 0,25 s, una detrás de otra, sin parar.', T: 3, sol: [T('La', .25), T('Mi', .25)] },
      { id: 'parking', tit: 'Barrera de parking', txt: 'La barrera sube a 90°, espera 2 s, baja a 0° y espera 2 s.', T: 10, sol: [V(90), W(2), V(0), W(2)] },
      { id: 'limpia', tit: 'Limpiaparabrisas', txt: 'El servo va a 0°, espera 1 s, va a 180° y espera 1 s.', T: 6, sol: [V(0), W(1), V(180), W(1)] }
    ],
    B1: [
      { id: 'f-parpadeo', target: 'parpadeo', tit: 'El LED no parpadea', txt: 'Tendría que parpadear, pero el rojo parece siempre encendido. ¿Qué bloque falta?', prog: [On('rojo'), W(1), Off('rojo')] },
      { id: 'f-loco', target: 'semaforo', tit: 'Semáforo loco', txt: 'Al final se quedan las tres luces encendidas. Arréglalo.', prog: [On('rojo'), W(5), On('verde'), W(5), On('ámbar'), W(2)] },
      { id: 'f-verde', target: 'semaforo', tit: '¿Y el verde?', txt: 'El verde no se llega a ver nunca. ¿Por qué? Mira el cronograma.',
        prog: [On('rojo'), W(5), Off('rojo'), On('verde'), Off('verde'), On('ámbar'), W(2), Off('ámbar')] },
      { id: 'f-orden', target: 'semaforo', tit: 'Orden cambiado', txt: 'Después del rojo se enciende el ámbar. En un semáforo de verdad, ¿qué va después del rojo?',
        prog: [On('rojo'), W(5), Off('rojo'), On('ámbar'), W(2), Off('ámbar'), On('verde'), W(5), Off('verde')] }
    ],
    L2: [
      { id: 'timbre', tit: 'Timbre', txt: 'Mientras el pulsador esté pulsado, el zumbador toca Do de 0,25 s. Si no, silencio.', T: 11, scen: 'btn', sol: [IF('btn', '=', 1, [T('Do', .25)])] },
      { id: 'luzboton', tit: 'Luz con pulsador', txt: 'Si el pulsador está pulsado, se enciende el LED verde; si no, se apaga.', T: 11, scen: 'btn', sol: [IF('btn', '=', 1, [On('verde')], [Off('verde')])] },
      { id: 'farola', tit: 'Farola automática', txt: 'Si hay poca luz (menos del 30 %), se enciende el LED ámbar; si no, se apaga.', T: 10, scen: 'luz', sol: [IF('luz', '<', 30, [On('ámbar')], [Off('ámbar')])] },
      { id: 'aparca', tit: 'Sensor de aparcamiento', txt: 'Si hay algo a menos de 20 cm, se enciende el rojo y suena La de 0,25 s; si no, el rojo se apaga.', T: 10, scen: 'dist',
        sol: [IF('dist', '<', 20, [On('rojo'), T('La', .25)], [Off('rojo')])] },
      { id: 'barrera', tit: 'Barrera automática', txt: 'Si llega un coche (a menos de 20 cm), la barrera sube a 90° y espera 2 s; si no, baja a 0°.', T: 10, scen: 'dist',
        sol: [IF('dist', '<', 20, [V(90), W(2)], [V(0)])] },
      { id: 'giro', tit: 'Interruptor giratorio', txt: 'Si el potenciómetro pasa del 50 %, verde encendido y rojo apagado; si no, rojo encendido y verde apagado.', T: 10, scen: 'pot',
        sol: [IF('pot', '>', 50, [On('verde'), Off('rojo')], [On('rojo'), Off('verde')])] }
    ],
    B2: [
      { id: 'f-farola', target: 'farola', tit: 'La farola no se apaga', txt: 'Cuando se hace de día, la farola sigue encendida. ¿Qué le falta al «si»?', prog: [IF('luz', '<', 30, [On('ámbar')])] },
      { id: 'f-timbre', target: 'timbre', tit: 'Timbre al revés', txt: 'Suena justo cuando NO se pulsa. Arréglalo cambiando una sola casilla.', prog: [IF('btn', '=', 0, [T('Do', .25)])] }
    ],
    L3: [
      { id: 'arcoiris', tit: 'Arcoíris', txt: 'El LED RGB se pone rojo 1 s, verde 1 s y azul 1 s, sin parar.', T: 6, sol: [C('rojo'), W(1), C('verde'), W(1), C('azul'), W(1)] },
      { id: 'cuenta', tit: 'Cuenta atrás', txt: 'La pantalla muestra 3, 2 y 1 (1 s cada número); después muestra 0 y el zumbador toca La 1 s.', T: 10,
        sol: [D(3), W(1), D(2), W(1), D(1), W(1), D(0), T('La', 1)] },
      { id: 'ventilador', tit: 'Ventilador', txt: 'El motor gira rápido 5 s, lento 5 s y se para 2 s.', T: 24, sol: [M(2), W(5), M(1), W(5), M(0), W(2)] },
      { id: 'disco', tit: 'Luces de discoteca', txt: 'RGB morado con Do (0,5 s), RGB cian con Mi (0,5 s) y RGB amarillo con Sol (0,5 s), sin parar.', T: 6,
        sol: [C('morado'), T('Do', .5), C('cian'), T('Mi', .5), C('amarillo'), T('Sol', .5)] },
      { id: 'peatones', tit: 'Semáforo de peatones', txt: 'Rojo 5 s. Después verde con la cuenta atrás 3, 2, 1 en la pantalla (1 s cada número); al final se apagan el verde y la pantalla.', T: 16,
        sol: [On('rojo'), W(5), Off('rojo'), On('verde'), D(3), W(1), D(2), W(1), D(1), W(1), D(-1), Off('verde')] }
    ],
    B3: [
      { id: 'f-arcoiris', target: 'arcoiris', tit: '¿Dónde está el azul?', txt: 'El azul no se ve nunca. Ejecútalo, mira el cronograma y arréglalo.', prog: [C('rojo'), W(1), C('verde'), W(1), C('azul')] },
      { id: 'f-cuenta', target: 'cuenta', tit: 'Cuenta atrás liada', txt: 'Los números salen desordenados. Ponlos en su sitio.', prog: [D(3), W(1), D(1), W(1), D(2), W(1), D(0), T('La', 1)] }
    ],
    L4: [
      { id: 'tres', tit: 'Tres pitidos', txt: 'Repite 3 veces: Do de 0,25 s y esperar 0,5 s. Después espera 2 s.', T: 9, sol: [REP(3, [T('Do', .25), W(.5)]), W(2)] },
      { id: 'sos', tit: 'SOS', txt: 'En morse: 3 cortos (La 0,25 s + esperar 0,5 s), 3 largos (La 1 s + esperar 0,5 s) y 3 cortos. Después espera 2 s.', T: 22,
        sol: [REP(3, [T('La', .25), W(.5)]), REP(3, [T('La', 1), W(.5)]), REP(3, [T('La', .25), W(.5)]), W(2)] },
      { id: 'boton', tit: 'Paso con botón', txt: 'Verde encendido hasta que se pulse el pulsador. Entonces: ámbar 2 s y rojo 5 s, y vuelve a empezar.', T: 20, scen: 'btn',
        sol: [On('verde'), UNTIL('btn', '=', 1), Off('verde'), On('ámbar'), W(2), Off('ámbar'), On('rojo'), W(5), Off('rojo')] },
      { id: 'calefaccion', tit: 'Calefacción', txt: 'Si la temperatura baja de 25 °C, el LED RGB se pone rojo (calefacción encendida); si no, se apaga.', T: 10, scen: 'temp',
        sol: [IF('temp', '<', 25, [C('rojo')], [C('apagado')])] },
      { id: 'noche', tit: 'Luz de noche', txt: 'Espera hasta que la luz baje del 30 % y pon el RGB en blanco; luego espera hasta que la luz pase del 50 % y apágalo.', T: 10, scen: 'luz2',
        sol: [UNTIL('luz', '<', 30), C('blanco'), UNTIL('luz', '>', 50), C('apagado')] }
    ],
    B4: [
      { id: 'f-tres', target: 'tres', tit: 'Pitidos pegados', txt: 'Los tres pitidos suenan como uno solo y largo. ¿Qué falta dentro del «repetir»?', prog: [REP(3, [T('Do', .25)]), W(2)] }
    ]
  };

  /* ---------- batería del examen (no sale en la práctica) ----------
     ¡No cambiar el orden! El QR guarda la posición de cada ejercicio. Para añadir, al final. */
  const EXAM = [
    { lv: 1, tit: 'Semáforo rápido', txt: 'Verde 2 s, ámbar 1 s y rojo 2 s, y vuelta a empezar. Solo una luz encendida cada vez.', T: 20,
      sol: [On('verde'), W(2), Off('verde'), On('ámbar'), W(1), Off('ámbar'), On('rojo'), W(2), Off('rojo')] },
    { lv: 1, tit: 'Faro', txt: 'El LED ámbar se enciende 0,5 s y se apaga 2 s, sin parar.', T: 10, sol: [On('ámbar'), W(.5), Off('ámbar'), W(2)] },
    { lv: 1, tit: 'Luces de feria', txt: 'El rojo y el verde se turnan: rojo 0,5 s y verde 0,5 s, nunca los dos a la vez.', T: 4,
      sol: [On('rojo'), W(.5), Off('rojo'), On('verde'), W(.5), Off('verde')] },
    { lv: 1, tit: 'Timbre ding-dong', txt: 'El zumbador toca Mi 0,5 s y Do 1 s, y después espera 2 s.', T: 14, sol: [T('Mi', .5), T('Do', 1), W(2)] },
    { lv: 1, tit: 'Escala', txt: 'El zumbador toca Do, Re, Mi, Fa y Sol de 0,25 s cada una, y después espera 1 s.', T: 9,
      sol: [T('Do', .25), T('Re', .25), T('Mi', .25), T('Fa', .25), T('Sol', .25), W(1)] },
    { lv: 1, tit: 'Barrera de garaje', txt: 'La barrera sube a 180°, espera 5 s, baja a 0° y espera 2 s.', T: 14, sol: [V(180), W(5), V(0), W(2)] },
    { lv: 2, tit: 'Luz de cortesía', txt: 'Si se pulsa el pulsador, el LED ámbar se enciende y espera 5 s; si no, se apaga.', T: 14, scen: 'btn',
      sol: [IF('btn', '=', 1, [On('ámbar'), W(5)], [Off('ámbar')])] },
    { lv: 2, tit: 'Alarma de oscuridad', txt: 'Si hay poca luz (menos del 30 %), el zumbador toca La de 0,25 s; si no, silencio.', T: 10, scen: 'luz',
      sol: [IF('luz', '<', 30, [T('La', .25)])] },
    { lv: 2, tit: 'Radar', txt: 'Si hay algo a menos de 10 cm, rojo encendido y verde apagado; si no, verde encendido y rojo apagado.', T: 10, scen: 'dist',
      sol: [IF('dist', '<', 10, [On('rojo'), Off('verde')], [On('verde'), Off('rojo')])] },
    { lv: 2, tit: 'Selector', txt: 'Si el potenciómetro pasa del 75 %, el servo va a 180°; si no, va a 0°.', T: 10, scen: 'pot',
      sol: [IF('pot', '>', 75, [V(180)], [V(0)])] },
    { lv: 2, tit: 'Garaje lleno', txt: 'Si hay un coche a menos de 50 cm: rojo encendido, verde apagado y barrera a 0°. Si no: verde encendido, rojo apagado y barrera a 90°.', T: 10, scen: 'dist',
      sol: [IF('dist', '<', 50, [On('rojo'), Off('verde'), V(0)], [On('verde'), Off('rojo'), V(90)])] },
    { lv: 3, tit: 'Arcoíris lento', txt: 'El LED RGB se pone rojo 2 s, verde 2 s y azul 2 s, sin parar.', T: 12, sol: [C('rojo'), W(2), C('verde'), W(2), C('azul'), W(2)] },
    { lv: 3, tit: 'Despegue', txt: 'La pantalla muestra 5, 4, 3, 2 y 1 (1 s cada número); después 0 y el zumbador toca Do 1 s.', T: 12,
      sol: [D(5), W(1), D(4), W(1), D(3), W(1), D(2), W(1), D(1), W(1), D(0), T('Do', 1)] },
    { lv: 3, tit: 'Ventilador de verano', txt: 'El motor gira lento 5 s, rápido 5 s y se para 5 s.', T: 30, sol: [M(1), W(5), M(2), W(5), M(0), W(5)] },
    { lv: 3, tit: 'Fiesta', txt: 'RGB morado y motor lento 1 s; después RGB cian y motor rápido 1 s, sin parar.', T: 6,
      sol: [C('morado'), M(1), W(1), C('cian'), M(2), W(1)] },
    { lv: 4, tit: 'Cuatro destellos', txt: 'Repite 4 veces: encender verde, esperar 0,5 s, apagar verde y esperar 0,5 s. Después espera 2 s.', T: 12,
      sol: [REP(4, [On('verde'), W(.5), Off('verde'), W(.5)]), W(2)] },
    { lv: 4, tit: 'Espera al botón', txt: 'Espera hasta que se pulse el pulsador; entonces el LED RGB se pone azul 2 s y se apaga.', T: 11, scen: 'btn',
      sol: [UNTIL('btn', '=', 1), C('azul'), W(2), C('apagado')] },
    { lv: 4, tit: 'Ventilador automático', txt: 'Si la temperatura pasa de 25 °C, el motor gira rápido; si no, se para.', T: 10, scen: 'temp',
      sol: [IF('temp', '>', 25, [M(2)], [M(0)])] },
    { lv: 4, tit: 'Alarma de noche', txt: 'Espera hasta que la luz baje del 30 %; después repite 3 veces: La 0,5 s y esperar 0,5 s.', T: 10, scen: 'luz',
      sol: [UNTIL('luz', '<', 30), REP(3, [T('La', .5), W(.5)])] }
  ];
  const EXAM_N = 5, MINUTOS = 45;
  // reparte los 5 ejercicios entre los niveles elegidos (por turnos) y los ordena por nivel
  function elegirExamen(niveles, rand) {
    rand = rand || Math.random;
    const pools = {}, out = [];
    niveles.forEach(l => { pools[l] = []; EXAM.forEach((e, i) => { if (e.lv === l) pools[l].push(i); }); });
    for (let k = 0; out.length < EXAM_N && k < 50; k++) {
      const l = niveles[k % niveles.length], p = pools[l];
      if (p.length) out.push(p.splice(Math.floor(rand() * p.length), 1)[0]);
    }
    return out.sort((a, b) => EXAM[a].lv - EXAM[b].lv || a - b);
  }

  /* ---------- simulación instantánea ---------- */
  function simulate(main, scen, Tend, inp0) {
    const st = { r: 0, a: 0, g: 0, bz: null, sv: 0, rgb: null, mo: 0, d7: null }, ev = [];
    const inp = scen ? scen(0) : Object.assign({}, INDEF, inp0 || {});
    let t = 0, guard = 0;
    const x = { set(k, v) { if (st[k] !== v) { st[k] = v; ev.push([t, k, v]); } }, read(k) { return scen ? scen(t)[k] : inp[k]; } };
    const init = Object.assign({}, st, inp);
    while (t < Tend && guard < 600000) {
      const t0 = t, it = run(main, x); let r;
      while (!(r = it.next()).done) {
        guard++;
        if (typeof r.value === 'number') t += r.value;
        if (t >= Tend || guard >= 600000) break;
      }
      if (t === t0) t += POLL;
    }
    if (scen) {
      let prev = scen(0);
      for (let s = 0.05; s <= Tend; s += 0.05) {
        const v = scen(s);
        SKEYS.forEach(k => { if (v[k] !== prev[k]) ev.push([Math.round(s * 100) / 100, k, v[k]]); });
        prev = v;
      }
      ev.sort((a, b) => a[0] - b[0]);
    }
    return { init, ev };
  }
  function sampler(tr, k) {
    const evs = tr.ev.filter(e => e[1] === k); let i = 0, v = tr.init[k];
    return t => { while (i < evs.length && evs[i][0] <= t) { v = evs[i][2]; i++; } return v; };
  }
  function compare(base, main) {
    const scen = base.scen ? SCEN[base.scen] : null;
    const A = simulate(main, scen, base.T), Bt = simulate(base.sol, scen, base.T);
    const dt = 0.05, N = Math.floor(base.T / dt);
    let first = null, miss = 0, used = 0;
    OUTK.forEach(k => {
      const rel = A.ev.some(e => e[1] === k) || Bt.ev.some(e => e[1] === k);
      if (rel) used++;
      const sa = sampler(A, k), sb = sampler(Bt, k); let runN = 0, st = 0, want, got, found = false;
      for (let i = 0; i < N; i++) {
        const t = (i + .5) * dt, a = sa(t), b = sb(t);
        if (a !== b) {
          if (rel) miss++;
          if (!runN) { st = i * dt; want = b; got = a; }
          if (++runN >= 4 && !found) {
            found = true;
            // si empatan, se cuenta antes lo que falta (algo que debería estar encendido o sonando)
            if (!first || st < first.t - 1e-9 || (Math.abs(st - first.t) < 1e-9 && want && !first.want)) first = { t: st, k, want, got };
          }
        } else runN = 0;
      }
    });
    return { ok: !first, A, B: Bt, first, miss: used ? miss / (N * used) : 0 };
  }
  function scenCtx(key, t) {
    const i = SCEN[key](t + 0.01);
    return { btn: i.btn ? 'con el pulsador pulsado' : 'con el pulsador suelto', luz: 'con la luz al ' + i.luz + ' %', luz2: 'con la luz al ' + i.luz + ' %',
      dist: 'con el coche a ' + i.dist + ' cm', pot: 'con el potenciómetro al ' + i.pot + ' %', temp: 'con la temperatura a ' + i.temp + ' °C' }[key];
  }
  const NOMBRE = { r: 'el LED rojo', a: 'el LED ámbar', g: 'el LED verde', bz: 'el zumbador', sv: 'el servo', rgb: 'el LED RGB', mo: 'el motor', d7: 'la pantalla' };
  function valText(k, v) {
    if (k === 'bz') return v ? 'sonando ' + v : 'en silencio';
    if (k === 'sv') return 'a ' + v + '°';
    if (k === 'rgb') return v ? 'en ' + v : 'apagado';
    if (k === 'mo') return v ? 'girando ' + MOTOR[v] : 'parado';
    if (k === 'd7') return v == null ? 'apagada' : 'mostrando ' + v;
    return v ? 'encendido' : 'apagado';
  }
  function describe(f, base) {
    let when = 'A los ' + fmt1(f.t) + ' s';
    if (base.scen) when += ' (' + scenCtx(base.scen, f.t) + ')';
    return when + ', ' + NOMBRE[f.k] + ' debería estar ' + valText(f.k, f.want) + ', pero en tu programa está ' + valText(f.k, f.got) + '.';
  }
  // examen: 2 puntos si hace lo mismo que la solución, 1 si casi (fallos en menos del 10 % del tiempo), 0 si no
  function puntuar(res, main) {
    if (res.ok) return { pts: 2, est: 'perfecto' };
    if (main.length && res.miss <= 0.10) return { pts: 1, est: 'casi' };
    return { pts: 0, est: main.length ? 'no' : 'vacío' };
  }

  /* ---------- filas del cronograma ---------- */
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)); return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000; };
  const ROWS = {
    r: { k: 'r', lab: 'LED rojo', col: '#ff4b3e', ty: 'bin' }, a: { k: 'a', lab: 'LED ámbar', col: '#ffb000', ty: 'bin' },
    g: { k: 'g', lab: 'LED verde', col: '#2ee66b', ty: 'bin' },
    bz: { k: 'bz', lab: 'zumbador', col: '#c3a1ff', ty: 'tag', fill: v => NCOL[v] },
    sv: { k: 'sv', lab: 'servo', col: '#6cb6ff', ty: 'num', max: 180, f: v => v + '°' },
    rgb: { k: 'rgb', lab: 'LED RGB', col: '#ff8fbd', ty: 'tag', fill: v => RGBC[v] },
    mo: { k: 'mo', lab: 'motor', col: '#c2cad6', ty: 'num', max: 2, f: v => MOTOR[v] },
    d7: { k: 'd7', lab: 'pantalla', col: '#ff7a50', ty: 'tag', fill: () => '#b8361d' },
    btn: { k: 'btn', lab: 'pulsador', col: '#ffd23f', ty: 'bin' },
    luz: { k: 'luz', lab: 'luz', col: '#ffe9a0', ty: 'num', max: 100, f: v => v + ' %' },
    dist: { k: 'dist', lab: 'distancia', col: '#ff9f6b', ty: 'num', max: 100, f: v => v + ' cm' },
    pot: { k: 'pot', lab: 'potenc.', col: '#7fe0d0', ty: 'num', max: 100, f: v => v + ' %' },
    temp: { k: 'temp', lab: 'temperat.', col: '#ff8a80', ty: 'num', max: 40, f: v => v + ' °C' }
  };
  function rowsFor(lists, scenKey) {
    const u = {}; lists.forEach(l => scan(l, u));
    if (scenKey) u[SCENK[scenKey]] = 1;
    let out = OUTK.filter(k => u[k]);
    if (!out.length) out = ['r', 'a', 'g'];
    return out.concat(SKEYS.filter(k => u[k])).map(k => ROWS[k]);
  }
  function hexA(h, a) { return 'rgba(' + [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(',') + ',' + a + ')'; }
  function segs(tr, k, t0, tEnd) {
    const out = []; let v = tr.init[k], ta = 0;
    for (const e of tr.ev) { if (e[1] !== k) continue; if (e[0] > ta) out.push([ta, e[0], v]); v = e[2]; ta = e[0]; }
    out.push([ta, Infinity, v]);
    return out.filter(g => g[1] > t0 && g[0] < tEnd).map(g => [Math.max(g[0], t0), Math.min(g[1], tEnd), g[2]]);
  }
  // o: { fs, rows, t0, t1, series:[{tr, ghost, tEnd}], bad, now }
  function paintScope(c, W, H, o) {
    const fs = o.fs, LW = Math.round(fs * 7.4), axis = Math.round(fs * 1.7), n = o.rows.length;
    const gx0 = LW, gw = W - LW - fs * .8, rh = (H - axis) / n, span = o.t1 - o.t0;
    const px = t => gx0 + (t - o.t0) / span * gw;
    const mono = (w, s) => w + ' ' + Math.round(fs * s) + 'px "Martian Mono", monospace';
    c.fillStyle = '#0d1714'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#0a1210'; c.fillRect(0, 0, LW - fs * .4, H);
    const step = [0.5, 1, 2, 5, 10, 20].find(s => gw / span * s >= fs * 3.4) || 30;
    c.font = mono(600, .9); c.textBaseline = 'middle';
    for (let t = Math.ceil(o.t0 / step - 1e-9) * step; t <= o.t1 + 1e-9; t += step) {
      const x = Math.round(px(t)) + .5;
      c.strokeStyle = 'rgba(120,220,160,.14)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H - axis); c.stroke();
      c.fillStyle = 'rgba(200,240,215,.75)'; c.textAlign = x > W - fs * 1.8 ? 'right' : 'center'; c.fillText(fmt(t) + ' s', x, H - axis / 2);
    }
    o.rows.forEach((r, i) => {
      const y0 = i * rh;
      c.strokeStyle = 'rgba(120,220,160,.10)'; c.beginPath(); c.moveTo(0, Math.round(y0 + rh) + .5); c.lineTo(W, Math.round(y0 + rh) + .5); c.stroke();
      c.fillStyle = r.col; c.textAlign = 'left'; c.font = mono(700, Math.min(.95, rh / fs * .55));
      c.fillText(r.lab, fs * .6, y0 + rh / 2);
      const top = y0 + rh * .2, bot = y0 + rh * .8;
      o.series.forEach(s => {
        const sg = segs(s.tr, r.k, o.t0, s.tEnd == null ? o.t1 : s.tEnd);
        c.save(); c.beginPath(); c.rect(gx0, y0, gw + 1, rh); c.clip();
        if (s.ghost) { c.setLineDash([fs * .45, fs * .35]); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = Math.max(1.5, fs * .14); }
        else { c.setLineDash([]); c.strokeStyle = r.col; c.lineWidth = Math.max(2, fs * .2); }
        if (r.ty === 'tag') {
          sg.forEach(g => {
            if (g[2] == null) return;
            const x0 = px(g[0]), x1 = px(g[1]);
            if (s.ghost) c.strokeRect(x0 + 1, top, Math.max(1, x1 - x0 - 2), bot - top);
            else {
              const fc = r.fill(g[2]) || r.col;
              c.fillStyle = fc; c.globalAlpha = .85; c.fillRect(x0, top, x1 - x0, bot - top); c.globalAlpha = 1;
              if (x1 - x0 > fs * 1.6) { c.fillStyle = lum(fc) > 150 ? '#14201a' : '#fff'; c.font = mono(700, Math.min(.8, rh / fs * .45)); c.fillText(String(g[2]), x0 + fs * .25, (top + bot) / 2); }
            }
          });
          if (!s.ghost) { c.strokeStyle = hexA(r.col, .35); c.lineWidth = 1; c.beginPath(); c.moveTo(gx0, bot); c.lineTo(gx0 + gw, bot); c.stroke(); }
        } else {
          const mx = r.ty === 'num' ? r.max : 1;
          const yv = v => r.ty === 'bin' ? (v ? top : bot) : bot - Math.min(v, mx) / mx * (bot - top);
          c.beginPath();
          sg.forEach((g, j) => { const x0 = px(g[0]), x1 = px(g[1]), y = yv(g[2]); if (j === 0) c.moveTo(x0, y); else c.lineTo(x0, y); c.lineTo(x1, y); });
          c.stroke();
          if (!s.ghost && r.ty === 'bin') { c.fillStyle = hexA(r.col, .22); sg.forEach(g => { if (g[2]) c.fillRect(px(g[0]), top, px(g[1]) - px(g[0]), bot - top); }); }
          if (!s.ghost && r.ty === 'num' && rh > fs * 1.3) {
            c.fillStyle = hexA(r.col, .9); c.font = mono(600, .72);
            let last = -1e9;
            sg.forEach(g => { const x0 = px(g[0]); if (x0 - last > fs * 3.2) { const y = yv(g[2]); c.fillText(r.f(g[2]), x0 + 3, y - fs * .45 < y0 + fs * .5 ? y + fs * .55 : y - fs * .45); last = x0; } });
          }
        }
        c.restore();
      });
    });
    if (o.bad != null) {
      const x0 = px(o.bad), x1 = px(Math.min(o.t1, o.bad + .2));
      c.fillStyle = 'rgba(215,38,44,.35)'; c.fillRect(x0, 0, Math.max(3, x1 - x0), H - axis);
      c.strokeStyle = '#ff4b3e'; c.lineWidth = 2; c.setLineDash([]); c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0, H - axis); c.stroke();
    }
    if (o.now != null) {
      const x = px(o.now); c.strokeStyle = '#ffd23f'; c.lineWidth = 2; c.setLineDash([]); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H - axis); c.stroke();
    }
  }

  /* ---------- el programa dibujado (para la imagen, el PDF y el corrector) ---------- */
  const BODYF = '"Atkinson Hyperlegible Next","Atkinson Hyperlegible",sans-serif';
  function rr(c, x, y, w, h, r, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill(); }
  function cBar(c, x, y, txt, col) {
    c.font = '700 17px ' + BODYF; const w = Math.max(150, c.measureText(txt).width + 30);
    rr(c, x, y, w, 32, 6, col); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, y + 28, w, 4);
    c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(txt, x + 14, y + 16); return y + 32;
  }
  function cMouth(c, list, x, y, col) {
    const y0 = y; y += 3;
    list.forEach(n => {
      const ks = KIDS[n.t];
      if (ks) {
        const cc = COL[n.t];
        y = cBar(c, x + 18, y, B[n.t].text(n), cc);
        ks.forEach((k, i) => { if (!n[k]) return; if (i) y = cBar(c, x + 18, y, 'si no', cc); y = cMouth(c, n[k], x + 18, y, cc); });
        rr(c, x + 18, y, 110, 14, 5, cc); y += 17;
      } else y = cBar(c, x + 18, y, B[n.t].text(n), COL[n.t]) + 3;
    });
    y = Math.max(y, y0 + 20); c.fillStyle = col; c.fillRect(x, y0, 18, y - y0); return y;
  }
  function cProg(c, main, x, y) {
    y = cBar(c, x, y, 'al iniciar la placa', COL.ev) + 3;
    y = cBar(c, x, y, 'por siempre', COL.ct); y = cMouth(c, main, x, y, COL.ct);
    rr(c, x, y, 110, 14, 5, COL.ct); return y + 14;
  }
  function progWidth(main) {
    const c = document.createElement('canvas').getContext('2d'); let w = 160;
    (function walk(list, d) { list.forEach(n => { c.font = '700 17px ' + BODYF; w = Math.max(w, 18 * (d + 1) + c.measureText(B[n.t].text(n)).width + 30); (KIDS[n.t] || []).forEach(k => { if (n[k]) walk(n[k], d + 1); }); }); })(main, 0);
    return w;
  }

  /* ---------- código del examen (va dentro del QR) ----------
     Cada bloque: código + una casilla por campo (posición en su lista, o el número tal cual) + sus listas hijas.
     bytes: versión · inicio (s, 4) · duración (s, 2) · niveles (bits) · nº ejercicios · ejercicios · programas · nombre · curso · suma (2) → base64url */
  const DEF = {
    led: [1, [['c', ['rojo', 'ámbar', 'verde']], ['v', [0, 1]]]],
    wait: [2, [['s', [0.5, 1, 2, 5]]]],
    tone: [3, [['n', NOTES], ['s', [0.25, 0.5, 1]]]],
    servo: [4, [['a', [0, 90, 180]]]],
    'if': [5, [['cond.s', SKEYS], ['cond.op', ['=', '<', '>']], ['cond.v', null]]],
    rgb: [6, [['col', RGBN]]],
    motor: [7, [['m', [0, 1, 2]]]],
    disp: [8, [['d', [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]]]],
    rep: [9, [['n', [2, 3, 4, 5, 10]]]],
    until: [10, [['cond.s', SKEYS], ['cond.op', ['=', '<', '>']], ['cond.v', null]]]
  };
  const BYCODE = {}; Object.keys(DEF).forEach(t => { BYCODE[DEF[t][0]] = t; });
  const getP = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
  function setP(o, p, v) { const ks = p.split('.'); while (ks.length > 1) { const k = ks.shift(); o = o[k] = o[k] || {}; } o[ks[0]] = v; }
  function encList(list, out) {
    const l = list.slice(0, 250); out.push(l.length);
    l.forEach(n => {
      const d = DEF[n.t]; out.push(d[0]);
      d[1].forEach(f => { const v = getP(n, f[0]); out.push(f[1] ? Math.max(0, f[1].indexOf(v)) : (v | 0) & 255); });
      (KIDS[n.t] || []).forEach(k => { if (n[k] == null) out.push(255); else encList(n[k], out); });
    });
  }
  function decList(B, p) {
    const len = B[p.i++], list = [];
    for (let j = 0; j < len; j++) {
      const t = BYCODE[B[p.i++]]; if (!t) throw new Error('Bloque desconocido');
      const n = { t };
      DEF[t][1].forEach(f => { const b = B[p.i++]; setP(n, f[0], f[1] ? f[1][b] : b); });
      (KIDS[t] || []).forEach(k => { if (B[p.i] === 255) { p.i++; n[k] = null; } else n[k] = decList(B, p); });
      list.push(n);
    }
    return list;
  }
  const VER = 1;
  function utf8(s) { return Array.from(new TextEncoder().encode(s || '')); }
  function suma(bytes) { let h = 0x811c; for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = (h * 0x0193) & 0xffff; } return h; }
  function codificar(r) {
    const out = [VER], ini = Math.floor(r.inicio / 1000), dur = Math.min(65535, Math.round(r.duracion / 1000));
    out.push((ini >>> 24) & 255, (ini >>> 16) & 255, (ini >>> 8) & 255, ini & 255, (dur >>> 8) & 255, dur & 255);
    out.push(r.niveles.reduce((m, l) => m | (1 << (l - 1)), 0));
    out.push(r.ids.length); r.ids.forEach(i => out.push(i));
    r.progs.forEach(pg => encList(pg || [], out));
    [r.nombre, r.curso].forEach(s => { const u = utf8(s).slice(0, 60); out.push(u.length); out.push.apply(out, u); });
    const h = suma(out); out.push(h >> 8, h & 255);
    return btoa(String.fromCharCode.apply(null, out)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodificar(txt) {
    const m = /[#?&]r=([A-Za-z0-9_-]+)/.exec(txt); if (m) txt = m[1];
    txt = txt.trim().replace(/-/g, '+').replace(/_/g, '/'); while (txt.length % 4) txt += '=';
    const bin = atob(txt), Bs = []; for (let i = 0; i < bin.length; i++) Bs.push(bin.charCodeAt(i));
    if (Bs.length < 12) throw new Error('Código demasiado corto');
    const h = (Bs[Bs.length - 2] << 8) | Bs[Bs.length - 1], body = Bs.slice(0, -2);
    if (suma(body) !== h) throw new Error('El código está dañado o se ha modificado');
    if (body[0] !== VER) throw new Error('Versión de código desconocida');
    const p = { i: 1 };
    const ini = ((body[1] << 24) >>> 0) + (body[2] << 16) + (body[3] << 8) + body[4], dur = (body[5] << 8) | body[6]; p.i = 7;
    const mask = body[p.i++], niveles = [1, 2, 3, 4].filter(l => mask & (1 << (l - 1)));
    const n = body[p.i++], ids = body.slice(p.i, p.i + n); p.i += n;
    ids.forEach(i => { if (!EXAM[i]) throw new Error('Ejercicio desconocido'); });
    const progs = ids.map(() => decList(body, p));
    const txts = [];
    for (let t = 0; t < 2; t++) { const len = body[p.i++]; txts.push(new TextDecoder().decode(new Uint8Array(body.slice(p.i, p.i + len)))); p.i += len; }
    return { inicio: ini * 1000, duracion: dur * 1000, niveles, ids, progs, nombre: txts[0], curso: txts[1] };
  }
  function corregirExamen(d) {
    const ej = d.ids.map((id, i) => { const ex = EXAM[id], pg = d.progs[i] || [], res = compare(ex, pg), p = puntuar(res, pg); return { id, ex, prog: pg, res, pts: p.pts, est: p.est }; });
    const puntos = ej.reduce((a, e) => a + e.pts, 0), max = ej.length * 2;
    return { ej, puntos, max, nota: Math.round(puntos / max * 100) / 10 };
  }

  return {
    fmt, fmt1, LEDS, KLED, NOTES, HZ, NCOL, RGBN, RGBC, RGBP, MOTOR, SENS, SKEYS, INDEF, OUTK, COL, KIDS, POLL,
    defCond, condText, test, B, run, clean, scan, RETOS, EXAM, EXAM_N, MINUTOS, elegirExamen, SCEN, SCENK,
    simulate, compare, describe, puntuar, ROWS, rowsFor, paintScope, cProg, progWidth, rr,
    codificar, decodificar, corregirExamen, getP, setP
  };
})();
