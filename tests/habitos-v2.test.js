// Hábitos v2: frecuencias flexibles, retos como hábitos y migración del reto antiguo.
const vm = require('vm'), fs = require('fs'), path = require('path');
// raíz del proyecto: la carpeta de encima de tests/ (o la que se pase como argumento)
const raiz = process.argv[2] || path.join(__dirname, '..');
let fallos = 0;
function ok(cond, txt) { console.log((cond ? 'ok   ' : 'FALLO') + ' ' + txt); if (!cond) fallos++; }

const ctx = { crypto: require('crypto').webcrypto, TextEncoder, TextDecoder };
ctx.globalThis = ctx; vm.createContext(ctx);
['js/dominio/rutinas.js', 'js/dominio/migraciones.js', 'js/infraestructura/seguridad.js'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8') + (f.includes('seguridad') ? '\nglobalThis.Sec = Sec;' : ''), ctx));
const { BdvRoutines, BdvMigraciones, Sec } = ctx;

function shift(k, n) { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function diff(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
function mundo(routines, rlog, hoy, opts) {
  const e = { routines, rlog: rlog || {}, rest: (opts && opts.rest) || { week: [], dates: {} } };
  const R = BdvRoutines.create({
    repo: { log: d => e.rlog[d] || null, ensureLog: d => e.rlog[d] || (e.rlog[d] = { day: [], night: [] }),
      routines: () => e.routines, start: () => (opts && opts.start) || '2026-01-01', rest: () => e.rest },
    today: () => e.hoy, shift, diff, weekStart: opts && opts.weekStart
  });
  e.hoy = hoy; return { e, R };
}
const marcas = (id, dias) => Object.fromEntries(dias.map(d => [d, { day: [id], night: [] }]));

/* ---------- frecuencias ---------- */
// semana del lunes 7 al domingo 13 de diciembre de 2026
let { e, R } = mundo({ day: [{ id: 'g', name: 'Gimnasio', since: '2026-11-01', freq: { t: 'semana', n: 3 } }], night: [] },
  marcas('g', ['2026-12-07', '2026-12-09']), '2026-12-10');
let q = R.cuota('day', e.routines.day[0], '2026-12-10');
ok(q.hechos === 2 && q.meta === 3 && !q.cumplida, '3 veces por semana: «2 de 3 esta semana»');
ok(R.visibleOn('day', '2026-12-10').length === 1, 'se ve en Hoy mientras no se cumple la cuota');
ok(R.dayTotals('2026-12-08').total === 0, 'un día sin marcar no cuenta como incumplido');
ok(R.dayTotals('2026-12-09').done === 1 && R.dayTotals('2026-12-09').total === 1, 'un día marcado suma');
e.rlog['2026-12-10'] = { day: ['g'], night: [] };
ok(R.cuota('day', e.routines.day[0], '2026-12-11').cumplida && R.visibleOn('day', '2026-12-11').length === 0, 'cumplida la cuota, deja de salir el resto de la semana');
ok(R.visibleOn('day', '2026-12-14').length === 1, 'la semana siguiente vuelve a salir');
ok(R.semana('2026-12-07').hechos === 3 && R.semana('2026-12-07').tocaban === 3, 'Progreso: la semana cuenta la cuota (3/3)');

// semana incompleta: creado el sábado 12 → 2 días disponibles → ceil(3·2/7) = 1
({ e, R } = mundo({ day: [{ id: 'g', name: 'G', since: '2026-12-12', freq: { t: 'semana', n: 3 } }], night: [] }, {}, '2026-12-12'));
ok(R.cuota('day', e.routines.day[0], '2026-12-12').meta === 1, 'semana incompleta: la cuota se reparte (creado el sábado → 1)');
({ e, R } = mundo({ day: [{ id: 'g', name: 'G', since: '2026-12-09', freq: { t: 'semana', n: 3 } }], night: [] }, {}, '2026-12-09'));
ok(R.cuota('day', e.routines.day[0], '2026-12-09').meta === 3, 'creado el miércoles (5 días) → 3');
// pausa a mitad de semana: el jueves 10 → disponibles L-X (3) → ceil(3·3/7) = 2
({ e, R } = mundo({ day: [{ id: 'g', name: 'G', since: '2026-11-01', paused: '2026-12-10', freq: { t: 'semana', n: 3 } }], night: [] }, {}, '2026-12-09'));
ok(R.cuota('day', e.routines.day[0], '2026-12-09').meta === 2, 'pausa a mitad de semana: la cuota se reduce');
ok(R.visibleOn('day', '2026-12-11').length === 0, 'en pausa no se ve');

// semana que empieza en domingo (preferencia de la persona)
const domingo = k => shift(k, -new Date(k + 'T12:00:00').getDay());
({ e, R } = mundo({ day: [{ id: 'g', name: 'G', since: '2026-11-01', freq: { t: 'semana', n: 2 } }], night: [] },
  marcas('g', ['2026-12-13']), '2026-12-14', { weekStart: domingo }));
ok(R.cuota('day', e.routines.day[0], '2026-12-14').hechos === 1, 'con la semana en domingo, el domingo 13 cuenta para la semana del 13');

// mensual: 8 al mes; creado el 16 de diciembre (16 de 31 días) → ceil(8·16/31) = 5
({ e, R } = mundo({ day: [{ id: 'm', name: 'Llamar a casa', since: '2026-12-16', freq: { t: 'mes', n: 8 } }], night: [] },
  marcas('m', ['2026-12-16', '2026-12-20']), '2026-12-21'));
q = R.cuota('day', e.routines.day[0], '2026-12-21');
ok(q.t === 'mes' && q.hechos === 2 && q.meta === 5, 'mensual: «2 de 5 este mes» con el mes incompleto');
ok(R.cuota('day', e.routines.day[0], '2027-01-05').meta === 8 && R.cuota('day', e.routines.day[0], '2027-01-05').hechos === 0, 'mes nuevo: cuota completa, desde cero');

// sin frecuencia fija
({ e, R } = mundo({ day: [{ id: 'l', name: 'Libre', since: '2026-12-01', freq: { t: 'libre' } }], night: [] }, marcas('l', ['2026-12-03']), '2026-12-05'));
ok(R.visibleOn('day', '2026-12-05').length === 1 && R.dayTotals('2026-12-04').total === 0 && R.dayTotals('2026-12-03').done === 1, 'sin frecuencia fija: siempre visible, nunca incumplido, suma al marcar');
ok(R.cuota('day', e.routines.day[0], '2026-12-05') === null, 'sin frecuencia fija no tiene cuota');

// días concretos y creación
({ e, R } = mundo({ day: [{ id: 'd', name: 'LXV', since: '2026-12-01', days: [1, 3, 5] }], night: [] }, {}, '2026-12-10'));
ok(R.clase(e.routines.day[0], '2026-12-07') === 'toca' && R.clase(e.routines.day[0], '2026-12-08') === 'no', 'días concretos: toca lunes, no martes');
ok(R.clase(e.routines.day[0], '2026-11-30') === 'no', 'antes de crearse no toca');

// cambio de regla: diaria con fallos y pasa a días concretos el 10 → lo anterior no se recalcula como fallo
({ e, R } = mundo({ day: [{ id: 'c', name: 'C', since: '2026-12-01', days: [1, 3, 5], reglaDesde: '2026-12-10' }], night: [] }, marcas('c', ['2026-12-08']), '2026-12-12'));
ok(R.clase(e.routines.day[0], '2026-12-07') === 'opcional' && R.dayTotals('2026-12-07').total === 0, 'antes de la regla nueva: no cuenta como fallo');
ok(R.dayTotals('2026-12-08').done === 1, '…pero lo que se marcó sigue sumando (aunque hoy ese día no tocaría)');
ok(R.clase(e.routines.day[0], '2026-12-11') === 'toca', 'desde la regla nueva, rige');

// descanso: ningún hábito toca, tampoco los flexibles
({ e, R } = mundo({ day: [{ id: 'g', name: 'G', since: '2026-12-01', freq: { t: 'semana', n: 3 } }, { id: 'a', name: 'A', since: '2026-12-01' }], night: [] }, {}, '2026-12-12',
  { rest: { week: [], dates: { '2026-12-12': true } } }));
ok(R.visibleOn('day', '2026-12-12').length === 0 && R.dayTotals('2026-12-12').total === 0, 'día de descanso: nada toca');

// racha: los flexibles no la cortan
({ e, R } = mundo({ day: [{ id: 'g', name: 'G', since: '2026-12-01', freq: { t: 'semana', n: 2 } }], night: [] },
  marcas('g', ['2026-12-01', '2026-12-08']), '2026-12-08', { start: '2026-12-01' }));
ok(R.streak() === 2, 'la racha no se corta por días sin marcar un hábito flexible');

/* ---------- retos ---------- */
({ e, R } = mundo({ day: [{ id: 'r', name: 'Correr', since: '2026-12-01', reto: { dias: 10, inicio: '2026-12-01', estado: 'activo' } }], night: [] },
  marcas('r', ['2026-12-01', '2026-12-02', '2026-12-04']), '2026-12-05'));
let rt = R.reto('day', e.routines.day[0], '2026-12-05');
ok(rt.dia === 5 && rt.dias === 10 && rt.hechos === 3 && !rt.terminado, 'reto: «Día 5 de 10», 3 días hechos');
rt = R.reto('day', e.routines.day[0], '2026-12-11');
ok(rt.terminado && rt.fin === '2026-12-10', 'reto: terminado al pasar su último día');
({ e, R } = mundo({ day: [{ id: 'r', name: 'R', since: '2026-12-05', reto: { dias: 7, inicio: '2026-12-20', estado: 'activo' } }], night: [] }, {}, '2026-12-10'));
ok(R.visibleOn('day', '2026-12-10').length === 0 && R.visibleOn('day', '2026-12-20').length === 1, 'reto con inicio futuro: no sale hasta su día');

/* ---------- migración del reto antiguo ---------- */
let n = 0; const uid = () => 'nuevo' + (++n);
const base = (challenge, extra) => Object.assign({ routines: { day: [], night: [] }, rlog: {}, challenge }, extra || {});
function migra(st, hoy) { const antes = JSON.stringify(st); const r = BdvMigraciones.retoAHabito(st, hoy, uid); return Object.assign(r, { intacto: JSON.stringify(st) === antes }); }

// 1. activo con historial
let r = migra(base({ name: 'Sin azúcar', days: 30, start: '2026-12-01', done: { '2026-12-01': true, '2026-12-02': true } }), '2026-12-05');
let h = r.state.routines.day[0];
ok(r.cambiado && h.name === 'Sin azúcar' && h.reto.dias === 30 && h.reto.inicio === '2026-12-01' && h.reto.migrado && h.reto.estado === 'activo' && !h.paused, '1. reto activo con historial → hábito con reto activo');
ok(r.info.copiados === 2 && r.state.rlog['2026-12-02'].day.includes(h.id), '1. copia sus días al registro de hábitos');
ok(r.intacto && r.state.challenge.name === 'Sin azúcar', '1. el estado de entrada no se toca y el reto original se conserva');
// 2. activo sin historial
r = migra(base({ name: 'Meditar', days: 21, start: '2026-12-04', done: {} }), '2026-12-05');
ok(r.cambiado && r.info.copiados === 0 && r.state.routines.day[0].reto.dias === 21, '2. reto activo sin historial');
// 3. terminado
r = migra(base({ name: 'Leer', days: 7, start: '2026-11-01', done: { '2026-11-01': true, '2026-11-03': true } }), '2026-12-05');
h = r.state.routines.day[0];
ok(h.reto.estado === 'terminado' && h.paused === '2026-11-08' && r.info.copiados === 2, '3. reto terminado → en pausa desde el día siguiente a su fin, con su historial');
// 4. incompleto
r = migra(base({ name: '', days: 999, done: { '2026-12-02': true } }), '2026-12-05');
h = r.state.routines.day[0];
ok(h.name === 'Reto' && h.reto.dias === 30 && h.reto.inicio === '2026-12-02', '4. incompleto: nombre «Reto», 30 días, empieza el primer día marcado');
r = migra(base({}), '2026-12-05');
ok(!r.cambiado && r.info.motivo === 'reto vacío', '4. reto vacío: no se crea nada');
// 5. fechas fuera del reto y futuras
r = migra(base({ name: 'X', days: 5, start: '2026-12-01', done: { '2026-11-30': true, '2026-12-03': true, '2026-12-06': true, '2026-12-09': true } }), '2026-12-04');
ok(r.info.copiados === 1 && r.info.omitidos === 3, '5. días antes del inicio, después del fin o futuros: omitidos (y contados)');
// 6. inválidos y duplicados
r = migra(base({ name: 'Y', days: 10, start: '2026-12-01', done: { 'no-es-fecha': true, '2026-12-02': false, '2026-12-03': true } },
  { rlog: { '2026-12-03': { day: ['nuevo999'], night: [] } } }), '2026-12-05');
h = r.state.routines.day[0];
ok(r.info.copiados === 1 && r.state.rlog['2026-12-03'].day.filter(x => x === h.id).length === 1 && r.state.rlog['2026-12-03'].day.includes('nuevo999'), '6. claves inválidas y «false» se ignoran; sin duplicar y sin pisar lo que había');
// 7. dos veces
const una = migra(base({ name: 'Z', days: 10, start: '2026-12-01', done: { '2026-12-01': true } }), '2026-12-05');
const dos = BdvMigraciones.retoAHabito(una.state, '2026-12-06', uid);
ok(!dos.cambiado && dos.info.motivo === 'ya migrado' && una.state.routines.day.length === 1, '7. migrar dos veces no duplica nada');
const sinMarca = JSON.parse(JSON.stringify(una.state)); delete sinMarca.migraciones;
ok(!BdvMigraciones.retoAHabito(sinMarca, '2026-12-06', uid).cambiado, '7. aunque se pierda el registro, el hábito migrado lo impide');
// 7b. ida y vuelta de versión: la anterior quita las marcas (las desconoce) y deja un hábito normal
const limpio = JSON.parse(JSON.stringify(una.state)); delete limpio.migraciones;
limpio.routines.day.forEach(x => { delete x.reto; });
ok(!BdvMigraciones.retoAHabito(limpio, '2026-12-07', uid).cambiado, '7. tras volver de una versión anterior, no se migra otra vez');
// 8. con hábitos previos
r = migra(base({ name: 'W', days: 10, start: '2026-12-01', done: {} }, { routines: { day: [{ id: 'a', name: 'Agua' }], night: [{ id: 'b', name: 'Leer' }] } }), '2026-12-05');
ok(r.state.routines.day.length === 2 && r.state.routines.day[0].name === 'Agua' && r.state.routines.night.length === 1, '8. los hábitos que había siguen igual; el reto va al final');

/* ---------- el saneado conserva lo nuevo ---------- */
const s = Sec.sanitizeState(JSON.parse(JSON.stringify(una.state.routines ? Object.assign({}, una.state, {
  routines: { day: una.state.routines.day.concat([{ id: 'f', name: 'F', freq: { t: 'semana', n: 9 }, days: [1], reglaDesde: '2026-12-10' }, { id: 'l', name: 'L', freq: { t: 'raro' } }]), night: [] } }) : {})), {});
const f = s.routines.day.find(x => x.id === 'f'), l = s.routines.day.find(x => x.id === 'l'), z = s.routines.day.find(x => x.reto);
ok(f.freq.t === 'semana' && f.freq.n === 7 && !f.days && f.reglaDesde === '2026-12-10', 'saneado: frecuencia válida (n acotado a 7), sin días a la vez, con reglaDesde');
ok(!l.freq, 'saneado: una frecuencia desconocida se descarta (queda diaria)');
ok(z.reto.migrado === true && z.reto.inicio === '2026-12-01' && s.migraciones.reto.habito === z.id && s.challenge.name === 'Z', 'saneado: reto, marca de migración y reto original se conservan');

console.log(fallos ? '\n' + fallos + ' fallos' : '\ntodo bien');
process.exit(fallos ? 1 : 0);
