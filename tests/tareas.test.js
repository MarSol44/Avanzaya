// Prueba el dominio de tareas (js/dominio/tareas.js): pasos atrasados, pasar a mañana y lo hecho.
const vm = require('vm'), fs = require('fs'), path = require('path');
// raíz del proyecto: la carpeta de encima de tests/ (o la que se pase como argumento)
const raiz = process.argv[2] || require('path').join(__dirname, '..');
let fallos = 0;
function ok(cond, txt) { console.log((cond ? 'ok   ' : 'FALLO') + ' ' + txt); if (!cond) fallos++; }

const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, 'js/dominio/tareas.js'), 'utf8'), ctx);
function shift(k, n) { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
let n = 0; const uid = () => 'id' + (++n);

function mundo() {
  const est = {
    events: {
      '2026-11-27': [{ id: 'a', title: 'Informe', goalId: '', sid: '', time: '', done: false, kind: 'task' }],
      '2026-11-28': [{ id: 'b', title: 'Reunión', goalId: '', sid: '', time: '09:00', done: false, kind: 'task' },
                     { id: 'c', title: 'Llamar', goalId: '', sid: '', time: '', done: false, kind: 'task' },
                     { id: 'd', title: 'Hecha', goalId: '', sid: '', time: '', done: true, kind: 'task' }]
    },
    todo: [],
    S: [{ id: 'g1', name: 'Meta', done: false, steps: [
      { id: 's1', name: 'Paso viejo', due: '2026-11-26', done: false },
      { id: 's2', name: 'Paso de hoy', due: '2026-11-28', done: false },
      { id: 's3', name: 'Paso hecho', due: '2026-11-28', done: true },
      { id: 's4', name: 'Sin fecha', due: '', done: false }] }],
    L: []
  };
  const T = ctx.BdvTasks.create({
    repo: {
      day: d => est.events[d] || [], ensureDay: d => est.events[d] || (est.events[d] = []),
      setDay: (d, l) => { if (l.length) est.events[d] = l; else delete est.events[d]; },
      days: () => Object.keys(est.events), todo: () => est.todo, setTodo: l => { est.todo = l; },
      goals: k => est[k]
    }, shift, uid
  });
  return { est, T };
}

let { est, T } = mundo();
const hoy = '2026-11-28', man = '2026-11-29';
const at = T.queries.overdueSteps(hoy);
ok(at.length === 1 && at[0].s.id === 's1' && at[0].day === '2026-11-26', 'un paso sin hacer de hace dos días sale como atrasado');
ok(T.queries.doneOn(hoy) === 2, 'lo hecho hoy cuenta tareas y pasos (1 + 1)');

let r = T.commands.postpone(hoy, man);
ok(r.moved === 4, 'pasar a mañana mueve 4: tarea atrasada, tarea de hoy sin hora, paso atrasado y paso de hoy');
ok((est.events[man] || []).map(e => e.id).sort().join() === 'a,c', 'las tareas quedan en mañana');
ok(est.events[hoy].some(e => e.id === 'b'), 'la reunión de hoy con hora no se mueve');
ok(est.events[hoy].some(e => e.id === 'd'), 'lo hecho se queda en su día');
ok(est.S[0].steps[0].due === man && est.S[0].steps[1].due === man, 'los pasos pasan a mañana');
ok(est.S[0].steps[2].due === hoy && est.S[0].steps[3].due === '', 'los pasos hechos y sin fecha no se tocan');
ok(T.queries.overdueSteps(man).length === 0, 'mañana ya no hay atrasados');

({ est, T } = mundo());
r = T.commands.moveOverdue(hoy);
ok(est.S[0].steps[0].due === hoy, 'pasar a hoy también trae el paso atrasado');
ok(r.moved === 2, 'pasar a hoy cuenta tarea y paso');

// Con «hoy» inyectado: se apunta cuándo se hizo algo (y se borra al desmarcar).
({ est, T } = (function () {
  const m = mundo();
  const T2 = ctx.BdvTasks.create({
    repo: {
      day: d => m.est.events[d] || [], ensureDay: d => m.est.events[d] || (m.est.events[d] = []),
      setDay: (d, l) => { if (l.length) m.est.events[d] = l; else delete m.est.events[d]; },
      days: () => Object.keys(m.est.events), todo: () => m.est.todo, setTodo: l => { m.est.todo = l; },
      goals: k => m.est[k]
    }, shift, uid, today: () => hoy
  });
  return { est: m.est, T: T2 };
})());
T.commands.toggleStep('S', 'g1', 's2');
ok(est.S[0].steps[1].done && est.S[0].steps[1].doneAt === hoy, 'completar un paso apunta el día');
T.commands.toggleStep('S', 'g1', 's2');
ok(!est.S[0].steps[1].done && est.S[0].steps[1].doneAt === undefined, 'desmarcarlo lo borra');
// un paso traído al plan (tarea enlazada) y pasado a «Sin fecha» deja de tener fecha en su meta
const r2 = T.commands.materializeStep('S', 'g1', 's2', hoy);
T.commands.move(hoy, r2.event.id, '');
ok(est.S[0].steps[1].due === '' && est.todo.some(x => x.sid === 's2'), 'sin fecha: el paso sigue en su meta, sin fecha, y queda en pendientes');
ok(T.queries.goalsForDay(hoy).every(x => !x.s || x.s.id !== 's2'), 'y no se duplica en el plan del día');

console.log(fallos ? '\n' + fallos + ' fallos' : '\ntodo bien');
process.exit(fallos ? 1 : 0);
