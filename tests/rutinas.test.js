// Prueba el dominio de rutinas (js/dominio/rutinas.js) con la regla `since`.
const vm = require('vm'), fs = require('fs'), path = require('path');
// raíz del proyecto: la carpeta de encima de tests/ (o la que se pase como argumento)
const raiz = process.argv[2] || require('path').join(__dirname, '..');
let fallos = 0;
function ok(cond, txt) { console.log((cond ? 'ok   ' : 'FALLO') + ' ' + txt); if (!cond) fallos++; }

const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, 'js/dominio/rutinas.js'), 'utf8'), ctx);

function shift(k, n) { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function diff(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }

const estado = {
  routines: { day: [{ id: 'agua', name: 'Agua' }], night: [{ id: 'leer', name: 'Leer', since: '2026-11-11' }] },
  rlog: { '2026-11-09': { day: ['agua'], night: [] }, '2026-11-10': { day: ['agua'], night: [] }, '2026-11-11': { day: ['agua'], night: ['leer'] } },
  rest: { week: [], dates: {} }
};
let hoy = '2026-11-11';
const R = ctx.BdvRoutines.create({
  repo: {
    log: d => estado.rlog[d] || null,
    ensureLog: d => estado.rlog[d] || (estado.rlog[d] = { day: [], night: [] }),
    routines: () => estado.routines, start: () => '2026-11-09', rest: () => estado.rest
  },
  today: () => hoy, shift, diff
});

ok(R.dayTotals('2026-11-09').total === 1, 'antes de crearse, el hábito de noche no tocaba el lunes');
ok(R.dayStatus('2026-11-09') === 's-good', 'el lunes queda completo (no a medias)');
ok(R.dayTotals('2026-11-11').total === 2, 'el día en que se crea ya toca');
ok(R.dueOn('night', '2026-11-10').length === 0, 'dueOn respeta since');
ok(R.dueOn('day', '2026-11-10').length === 1, 'un hábito sin since toca siempre');
ok(R.streak() === 3, 'la racha sigue contando los tres días');
hoy = '2026-11-13';
ok(R.streak() === 3, 'un día suelto sin marcar no rompe la racha');
hoy = '2026-11-14';
ok(R.streak() === 0, 'dos días seguidos sin marcar la cortan');

console.log(fallos ? '\n' + fallos + ' fallos' : '\ntodo bien');
process.exit(fallos ? 1 : 0);
