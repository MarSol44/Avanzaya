// Escenarios de las simulaciones (Lucía, Andrés, Marisol) contra la app real sin pantalla:
// se cargan las capas de dominio, infraestructura y aplicación de index.html, con un
// reloj controlado y un localStorage en memoria. «Recargar» es crear otra instancia
// sobre los mismos datos guardados (como abrir la app otro día).
const vm = require('vm'), fs = require('fs'), path = require('path');
// raíz del proyecto: la carpeta de encima de tests/ (o la que se pase como argumento)
const raiz = process.argv[2] || path.join(__dirname, '..');
let fallos = 0;
function ok(cond, txt) { console.log((cond ? 'ok   ' : 'FALLO') + ' ' + txt); if (!cond) fallos++; }

// los mismos archivos y en el mismo orden que index.html, hasta la capa de aplicación
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const todos = [...html.matchAll(/src="\/(js\/[^"]+\.js)"/g)].map(m => m[1]);
const ARCHIVOS = todos.slice(0, todos.indexOf('js/aplicacion/bienvenida.js') + 1);

function app(mem, dia) {
  const Real = Date; let fijo = new Real(dia + 'T10:00:00').getTime();
  class D extends Real { constructor(...a) { if (a.length) super(...a); else super(fijo); } static now() { return fijo; } }
  const ls = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; },
    key: i => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
  const ctx = { Date: D, localStorage: ls, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    crypto: require('crypto').webcrypto, TextEncoder, TextDecoder, console, Math, JSON,
    setTimeout: f => { f(); return 0; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    document: { addEventListener() {}, visibilityState: 'visible' }, navigator: {}, location: { hash: '', search: '', pathname: '/', origin: 'http://local' } };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; ctx.addEventListener = () => {};
  vm.createContext(ctx);
  for (const f of ARCHIVOS) vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f });
  ctx.Store.load();
  ctx.dia = d => { fijo = new Real(d + 'T10:00:00').getTime(); };
  return ctx;
}
const reabrir = (mem, d) => { const a = app(mem, d); a.Habitos.migrar(); return a; };   // como arranque.js

/* ================================ Lucía ================================= */
{
  const mem = {};
  let a = app(mem, '2026-11-09');
  const S = () => a.Store.S;
  a.Habitos.nuevo('day', 'Mover el cuerpo 20 min'); a.Habitos.nuevo('day', 'Beber agua');
  const idMover = S().routines.day[0].id;
  a.Habitos.marcar('2026-11-09', 'day', idMover);
  a.dia('2026-11-11'); a.Habitos.nuevo('night', 'Leer');   // de noche, creado el miércoles
  a.Habitos.marcar('2026-11-11', 'day', idMover);
  const sem = a.Routines.semana('2026-11-09');
  ok(sem.tocaban === 7, 'Lucía: el hábito de noche creado el miércoles no cuenta lunes ni martes (7, no 9)');
  // el reto antiguo (como lo tenía ella) y abrir la app con la versión nueva
  S().challenge = { name: 'Salir a correr 10 minutos', days: 30, start: '2026-11-11', done: { '2026-11-11': true } };
  a.Store.saveNow();
  a = reabrir(mem, '2026-11-12');
  const reto = S().routines.day.find(x => x.reto);
  ok(reto && reto.reto.migrado && reto.name === 'Salir a correr 10 minutos', 'Lucía: su reto pasa a ser un hábito con reto');
  ok(a.Routines.reto('day', reto, '2026-11-12').dia === 2 && a.Routines.reto('day', reto, '2026-11-12').hechos === 1, 'Lucía: «día 2 de 30», con el día 1 hecho');
  ok(S().challenge && S().challenge.name === 'Salir a correr 10 minutos', 'Lucía: el reto original se conserva');
  a.Habitos.marcar('2026-11-12', 'day', reto.id);
  ok(a.Routines.reto('day', reto, '2026-11-12').hechos === 2, 'Lucía: marcarlo en Hoy cuenta para el reto');
  a = reabrir(mem, '2026-11-13');
  ok(S().routines.day.filter(x => x.reto).length === 1, 'Lucía: al volver a abrir no se duplica');
  // día de descanso: la racha sigue
  a.Habitos.descansarHoy();
  ok(a.Routines.streak() >= 1 && a.Routines.dayTotals('2026-11-13').total === 0, 'Lucía: el descanso no rompe la racha');
}

/* ================================ Andrés ================================ */
{
  const mem = {};
  const a = app(mem, '2026-11-23');
  const S = () => a.Store.S;
  a.Habitos.nuevo('day', 'Ir al gimnasio');
  const gym = S().routines.day[0];
  a.Habitos.frecuencia('day', gym.id, 'dias'); [2, 4].forEach(d => a.Habitos.dia('day', gym.id, d));   // L-X-V
  ok(JSON.stringify(gym.days) === '[1,3,5]' && !gym.reglaDesde, 'Andrés: gimnasio lunes, miércoles y viernes (creado hoy: sin regla anterior)');
  ok(a.Routines.clase(gym, '2026-11-24') === 'no' && a.Routines.clase(gym, '2026-11-25') === 'toca', 'Andrés: el martes no toca, el miércoles sí');
  // una meta con un paso que no le da tiempo a hacer: atrasado y luego a mañana
  const g = a.Objetivos.crear('S'); a.Objetivos.campo('S', g.id, 'name', 'Ahorrar 500 soles');
  a.Objetivos.pasoNuevo('S', g.id, 'Revisar gastos'); const paso = S().goalsS[0].steps[0];
  a.Objetivos.pasoFecha('S', g.id, paso.id, '2026-11-24');
  a.dia('2026-11-26');
  ok(a.TaskQueries.overdueSteps('2026-11-26').some(x => x.s.id === paso.id), 'Andrés: el paso no hecho aparece como atrasado');
  a.Plan.postpone('2026-11-26', '2026-11-27');
  ok(paso.due === '2026-11-27' && S().goalsS[0].steps.length === 1, 'Andrés: «Pasar a mañana» lo reprograma sin duplicarlo');
  a.Plan.toggleStep('S', g.id, paso.id);
  ok(paso.done && paso.doneAt === '2026-11-26', 'Andrés: completarlo apunta el día');
  // cambiar después el gimnasio a 3 veces por semana: lo anterior no se recalcula
  a.Habitos.frecuencia('day', gym.id, 'semana', 3);
  ok(gym.freq.t === 'semana' && !gym.days && gym.reglaDesde === '2026-11-26', 'Andrés: pasa a «3 veces por semana» desde hoy');
  ok(a.Routines.clase(gym, '2026-11-25') === 'opcional' && a.Routines.dayTotals('2026-11-25').total === 0, 'Andrés: el miércoles que no fue no se vuelve un fallo');
}

/* =============================== Marisol ================================ */
{
  const mem = {};
  let a = app(mem, '2026-11-30');
  const S = () => a.Store.S;
  // bienvenida con varias áreas
  ['c1', 'c4', 'c5', 'c7'].forEach(c => a.Bienvenida.elegirArea(c));
  ok(S().welcome.areas.join() === 'c1,c4,c5' && S().welcome.area === 'c1', 'Marisol: hasta tres áreas, la primera es el punto de partida');
  a.Bienvenida.meta('Elegir una idea de proyecto con IA'); a.Bienvenida.freno('empezar'); a.Bienvenida.aceptar();
  ok(S().profile.areasClave.join() === 'c1,c4,c5' && S().goalsS.length === 1, 'Marisol: el plan se crea y sus áreas quedan como importantes');
  ok(/opciones/.test(S().goalsS[0].steps[0].name), 'Marisol: con «no sé por dónde empezar», pasos concretos');
  // muchos hábitos; uno pasa a semanal y otro a pausa
  ['Entrenar 30 minutos', 'Practicar inglés', 'Aprender IA', 'Leer'].forEach(n => a.Habitos.nuevo('day', n));
  const [entrenar, , ia] = S().routines.day;
  a.Habitos.pausar('day', ia.id);
  a.dia('2026-12-02'); a.Habitos.frecuencia('day', entrenar.id, 'semana', 3);
  a.Habitos.marcar('2026-12-02', 'day', entrenar.id);
  const q = a.Routines.cuota('day', entrenar, '2026-12-02');
  ok(q.hechos === 1 && q.meta === 3, 'Marisol: entrenar «1 de 3 esta semana»');
  ok(!a.Routines.visibleOn('day', '2026-12-02').some(x => x.id === ia.id), 'Marisol: el hábito en pausa no sale en Hoy');
  // un reto nuevo con fecha de inicio
  const r = a.Habitos.nuevoReto('Escribir cada noche', 21, '2026-12-03', 'night');
  ok(r.ok && a.Routines.visibleOn('night', '2026-12-02').every(x => x.id !== r.id) && a.Routines.visibleOn('night', '2026-12-03').some(x => x.id === r.id), 'Marisol: el reto empieza el día elegido');
  // meta larga: poner fecha a un paso no la convierte; convertir a mano la deja unida
  const L = a.Objetivos.crear('L'); a.Objetivos.campo('L', L.id, 'name', 'Viajar sola a otro continente');
  a.Objetivos.pasoNuevo('L', L.id, 'Elegir destino'); a.Objetivos.pasoNuevo('L', L.id, 'Abrir cuenta de ahorro');
  const [destino, cuenta] = S().goalsL[0].steps;
  const nCortas = S().goalsS.length;
  a.Objetivos.pasoFecha('L', L.id, destino.id, '2026-12-10');
  ok(S().goalsS.length === nCortas && !destino.promoted, 'Marisol: fechar un paso largo no crea otra meta');
  a.Objetivos.pasoFecha('L', L.id, cuenta.id, '2027-02-01'); a.Objetivos.ascender(L.id, cuenta.id);
  const corta = S().goalsS.find(x => x.origen); a.Objetivos.alternar('S', corta.id);
  ok(cuenta.done && cuenta.doneAt === '2026-12-02', 'Marisol: completar la meta corta completa su paso de origen');
  // persistencia: todo lo nuevo sobrevive a cerrar y abrir
  a.Store.saveNow();
  a = reabrir(mem, '2026-12-03');
  const e2 = S().routines.day.find(x => x.name === 'Entrenar 30 minutos');
  ok(e2.freq && e2.freq.n === 3 && e2.reglaDesde === '2026-12-02' && S().routines.night.some(x => x.reto && x.reto.dias === 21), 'Marisol: frecuencia y reto se guardan y se recuperan');
  ok(S().goalsS.find(x => x.origen) && S().goalsL[0].steps[1].doneAt === '2026-12-02' && S().profile.areasClave.length === 3, 'Marisol: vínculo, fecha de hecho y áreas importantes se recuperan');
  // retos: al terminar, seguir como hábito o terminarlo
  const rr = S().routines.night.find(x => x.reto);
  a.dia('2026-12-24');
  ok(a.Routines.reto('night', rr, '2026-12-24').terminado, 'Marisol: el reto termina tras sus 21 días');
  a.Habitos.retoDecision('night', rr.id, 'continuar');
  ok(rr.reto.estado === 'continuar' && !rr.paused && a.Routines.visibleOn('night', '2026-12-24').some(x => x.id === rr.id), 'Marisol: «Seguir como hábito» lo mantiene en Hoy');
  // borrar un hábito y deshacer, con su historial
  const leer = S().routines.day.find(x => x.name === 'Leer'); a.Habitos.marcar('2026-12-24', 'day', leer.id);
  const copia = a.Habitos.borrar('day', leer.id); a.Habitos.restaurar(copia);
  ok(S().routines.day.some(x => x.id === leer.id) && S().rlog['2026-12-24'].day.includes(leer.id), 'Marisol: borrar y deshacer devuelve el hábito y su historial');
}

console.log(fallos ? '\n' + fallos + ' fallos' : '\ntodo bien');
process.exit(fallos ? 1 : 0);
