// Prueba que los datos nuevos sobreviven al saneado (js/infraestructura/seguridad.js),
// que se aplica al cargar, al restaurar un respaldo y al recibir la copia de la nube:
// si un campo no está en el esquema, se pierde en la siguiente recarga.
const vm = require('vm'), fs = require('fs'), path = require('path');
// raíz del proyecto: la carpeta de encima de tests/ (o la que se pase como argumento)
const raiz = process.argv[2] || path.join(__dirname, '..');
let fallos = 0;
function ok(cond, txt) { console.log((cond ? 'ok   ' : 'FALLO') + ' ' + txt); if (!cond) fallos++; }

const ctx = { crypto: require('crypto').webcrypto, TextEncoder, TextDecoder };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(raiz, 'js/infraestructura/seguridad.js'), 'utf8') + '\nglobalThis.Sec = Sec;', ctx);
const Sec = ctx.Sec;

const entrada = {
  start: '2026-11-30',
  goalsS: [{ id: 'g1', name: 'Corta', done: true, doneAt: '2026-12-02', priority: 'Alta', steps: [
    { id: 's1', name: 'Paso hito', done: true, doneAt: '2026-12-01', hito: true },
    { id: 's2', name: 'Sin hacer', done: false, doneAt: '2026-12-01', hito: 'sí' }],
    origen: { id: 'gL', sid: 'sL' } },
  { id: 'g2', name: 'Origen roto', steps: [], origen: { id: 'mal id!', sid: 'x' } }],
  goalsL: [{ id: 'gL', name: 'Larga', steps: [{ id: 'sL', name: 'Paso largo', due: '2027-01-10', promoted: true }] }],
  events: { '2026-12-01': [{ id: 'e1', title: 'Hecha', done: true, doneAt: '2026-12-01' }, { id: 'e2', title: 'Pendiente', done: false, doneAt: '2026-12-01' }] },
  profile: { areasClave: ['c1', 'c4', 'c4', 'c7', 'c8', '<x>'] },
  welcome: { done: false, area: 'c1', areas: ['c1', 'c4'] }
};
const out = Sec.sanitizeState(JSON.parse(JSON.stringify(entrada)), {});

const g1 = out.goalsS[0], g2 = out.goalsS[1];
ok(g1.origen && g1.origen.id === 'gL' && g1.origen.sid === 'sL', 'una meta corta conserva su vínculo con el paso de origen');
ok(g2.origen === undefined, 'un vínculo con identificadores inválidos se descarta (no se inventa otro)');
ok(g1.doneAt === '2026-12-02', 'una meta conseguida conserva su fecha');
ok(g1.steps[0].hito === true && g1.steps[0].doneAt === '2026-12-01', 'un hito hecho conserva marca y fecha');
ok(g1.steps[1].hito === undefined, 'solo true cuenta como hito');
ok(g1.steps[1].doneAt === undefined, 'un paso sin hacer no guarda fecha de hecho');
ok(out.goalsL[0].steps[0].promoted === true && out.goalsL[0].steps[0].due === '2027-01-10', 'el paso largo conserva fecha y estado');
ok(out.events['2026-12-01'][0].doneAt === '2026-12-01' && out.events['2026-12-01'][1].doneAt === undefined, 'las tareas guardan la fecha de hecho solo si están hechas');
ok(JSON.stringify(out.profile.areasClave) === '["c1","c4","c7"]', 'áreas importantes: hasta tres, sin repetir y solo identificadores válidos');
ok(JSON.stringify(out.welcome.areas) === '["c1","c4"]' && out.welcome.area === 'c1', 'la bienvenida conserva las áreas elegidas');
const viejo = Sec.sanitizeState({ profile: {}, welcome: { area: 'c5' } }, {});
ok(Array.isArray(viejo.profile.areasClave) && viejo.profile.areasClave.length === 0, 'datos de antes: sin áreas importantes, lista vacía');

console.log(fallos ? '\n' + fallos + ' fallos' : '\ntodo bien');
process.exit(fallos ? 1 : 0);
