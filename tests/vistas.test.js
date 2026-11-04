// Las pantallas se pintan sin errores con datos de Hábitos v2 (sin navegador):
// se cargan todas las capas de index.html salvo el arranque y la nube real, con un
// DOM mínimo de mentira, y se generan las vistas y hojas como texto. No comprueba
// cómo se ven (eso pide un navegador), sino que no fallan y dicen lo que deben.
const vm = require('vm'), fs = require('fs'), path = require('path');
// raíz del proyecto: la carpeta de encima de tests/ (o la que se pase como argumento)
const raiz = process.argv[2] || path.join(__dirname, '..');
let fallos = 0;
function ok(cond, txt) { console.log((cond ? 'ok   ' : 'FALLO') + ' ' + txt); if (!cond) fallos++; }

const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const ARCHIVOS = [...html.matchAll(/src="\/(js\/[^"]+\.js)"/g)].map(m => m[1])
  .filter(f => f !== 'js/arranque.js' && f !== 'js/infraestructura/nube-supabase.js');

// un objeto que acepta cualquier cosa: propiedades, llamadas y asignaciones
function cualquiera() {
  const f = function () { return cualquiera(); };
  return new Proxy(f, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : k === 'matches' ? false : cualquiera(),
    set: () => true, apply: () => cualquiera() });
}
const Real = Date; const fijo = new Real('2026-12-09T10:00:00').getTime();
class D extends Real { constructor(...a) { if (a.length) super(...a); else super(fijo); } static now() { return fijo; } }
const mem = {};
const ctx = { Date: D, console, Math, JSON, crypto: require('crypto').webcrypto, TextEncoder, TextDecoder,
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: () => null, length: 0 },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
  document: cualquiera(), navigator: { userAgent: 'node' }, location: { hash: '', search: '', pathname: '/', origin: 'http://local', href: 'http://local/' },
  history: { replaceState() {}, pushState() {}, back() {} }, matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, removeEventListener() {} };
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ARCHIVOS) vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f });
const { Store, Habitos, Objetivos, V, UIState } = ctx;

// datos: hábitos con cada frecuencia, un reto activo, uno terminado y el reto antiguo migrado
const S = Store.S;
S.start = '2026-11-30'; S.onboarded = true;
['Agua', 'Gimnasio', 'Llamar a casa', 'Pasear', 'Inglés'].forEach(n => Habitos.nuevo('day', n));
const [agua, gym, casa, pasear, ingles] = S.routines.day;
Object.assign(agua, { since: '2026-11-30' }); Object.assign(gym, { since: '2026-11-30' }); Object.assign(casa, { since: '2026-11-30' });
Habitos.frecuencia('day', gym.id, 'semana', 3); Habitos.frecuencia('day', casa.id, 'mes', 4); Habitos.frecuencia('day', pasear.id, 'libre');
Habitos.frecuencia('day', ingles.id, 'dias');
Habitos.marcar('2026-12-07', 'day', gym.id); Habitos.marcar('2026-12-08', 'day', gym.id);
const viejo = Habitos.nuevoReto('Meditar', 7, '2026-11-30');
Habitos.nuevoReto('Escribir', 30, '2026-12-01', 'night');
S.challenge = { name: 'Sin azúcar', days: 30, start: '2026-12-01', done: { '2026-12-02': true } };
const info = Habitos.migrar();
ok(info && info.habito && info.copiados === 1, 'la migración se ejecuta sobre el estado de la app');

const pinta = (nombre, fn) => { try { const s = fn(); ok(typeof s === 'string' && s.length > 100, 'se pinta ' + nombre); return s || ''; } catch (e) { ok(false, nombre + ' falla: ' + e.message); return ''; } };
UIState.tab = 'hoy'; UIState.planDay = '2026-12-09';
const hoy = pinta('Hoy', V.hoy);
ok(/2 de 3 esta semana/.test(hoy), 'Hoy: el gimnasio dice «2 de 3 esta semana»');
ok(/0 de \d+ este mes/.test(hoy), 'Hoy: lo mensual dice su cuota del mes');
ok(/Sin frecuencia fija/.test(hoy), 'Hoy: lo libre se ve como «Sin frecuencia fija»');
ok(/Reto · día 9 de 30/.test(hoy) && /Reto · día 9 de 30/.test(hoy), 'Hoy: los retos muestran su día');
ok(/Reto terminado: 0 de 7 días/.test(hoy) && /data-a="retoSeguir"/.test(hoy), 'Hoy: un reto terminado pregunta si seguir o terminar');
UIState.editRoutine = 'todas';
const editando = pinta('Hoy editando hábitos', V.hoy);
ok(/data-f="rfreq"/.test(editando) && /Veces por semana/.test(editando) && /data-f="rfreqN"/.test(editando), 'Editar: selector de frecuencia y número de veces');
ok(/data-a="rDia"/.test(editando), 'Editar: días concretos con sus días');
UIState.editRoutine = null;
const prog = pinta('Progreso', V.progreso);
ok(/Retos/.test(prog) && !/Reto de 30 días/.test(prog), 'Progreso: la fila de retos lee los hábitos (no el reto antiguo)');
UIState.sheet = { t: 'challenge' };
const hojaRetos = pinta('la hoja de retos', V.sheet);
ok(/Sin azúcar/.test(hojaRetos) && /Meditar/.test(hojaRetos) && /Empezar el reto/.test(hojaRetos), 'Retos: lista el migrado y los nuevos, y deja empezar otro');
pinta('Metas', V.metas); pinta('Visión', V.vision);
UIState.sheet = { t: 'wins' }; pinta('la hoja de logros', V.sheet);
UIState.sheet = { t: 'review' }; pinta('la revisión semanal', V.sheet);
ok(viejo.ok, 'datos de prueba creados');

console.log(fallos ? '\n' + fallos + ' fallos' : '\ntodo bien');
process.exit(fallos ? 1 : 0);
