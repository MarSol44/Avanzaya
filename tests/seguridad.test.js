// Pruebas de los arreglos de seguridad que no necesitan Supabase.
const fs = require('fs'), path = require('path'), vm = require('vm');
// raíz del proyecto: la carpeta de encima de tests/ (o la que se pase como argumento)
const raiz = process.argv[2] || require('path').join(__dirname, '..');
let fallos = 0;
function ok(c, t) { console.log((c ? 'ok   ' : 'FALLO') + ' ' + t); if (!c) fallos++; }

// 1. El correo semanal: datos con cualquier forma no lo tumban, y no lleva texto del usuario.
let src = fs.readFileSync(path.join(raiz, 'supabase/functions/send-weekly-email/index.ts'), 'utf8');
const desde = src.indexOf('function dkey'), hasta = src.indexOf('Deno.serve');
// (se quitan las anotaciones de tipo para poder ejecutarlo como JavaScript)
let ts = src.slice(desde, hasta)
  .replace(/type Obj = Record<string, unknown>;/, '')
  .replace(/\): Obj =>/g, ') =>').replace(/ as (Obj|unknown\[\])/g, '')
  .replace(/(\w+): (string|number|unknown|Date|Obj|ReturnType<typeof computeStats>)(?=[,)])/g, '$1');
const ctx = {}; vm.createContext(ctx); vm.runInContext(ts + ';this.computeStats=computeStats;this.emailHtml=emailHtml;', ctx);
const raros = [null, 42, 'texto', [], { rlog: null }, { rlog: { '2026-10-26': null } }, { rlog: { '2026-10-26': { day: 'abc' } } },
  { notes: { '2026-10-26': 5 } }, { routines: 'x', profile: null }, { rlog: [1, 2] }];
let todos = true;
for (const r of raros) { try { ctx.computeStats(r); } catch (e) { todos = false; console.log('   rompe con', JSON.stringify(r), e.message); } }
ok(todos, 'el resumen semanal aguanta estados con cualquier forma');
const html = ctx.emailHtml(ctx.computeStats({ account: { name: '<b>visita-mi-web.com</b>' } }));
ok(!/visita-mi-web|<b>/.test(html), 'el correo no incluye texto escrito por la cuenta');

// Hábitos v2 en el correo: un hábito diario hecho cada día y uno semanal marcado
// a veces → semana completa (lo flexible no deja días a medias)
const dk = d => new Date(d).toISOString().slice(0, 10);
const ultimos = Array.from({ length: 21 }, (_, i) => dk(Date.now() - i * 864e5));
const rlogTodo = Object.fromEntries(ultimos.map((k, i) => [k, { day: i % 3 ? ['d'] : ['d', 'w'], night: [] }]));
let st = ctx.computeStats({ routines: { day: [{ id: 'd', name: 'D' }, { id: 'w', name: 'W', freq: { t: 'semana', n: 3 } }], night: [] }, rlog: rlogTodo });
ok(st.full === 7 && st.partial === 0, 'correo: lo semanal no deja días a medias (7 completos)');
const rlogSoloW = Object.fromEntries(ultimos.map(k => [k, { day: ['w'], night: [] }]));
st = ctx.computeStats({ routines: { day: [{ id: 'd', name: 'D' }, { id: 'w', name: 'W', freq: { t: 'semana', n: 3 } }], night: [] }, rlog: rlogSoloW });
ok(st.full === 0 && st.partial === 7, 'correo: sin el diario, los días quedan a medias');
st = ctx.computeStats({ routines: { day: [{ id: 'd', name: 'D', paused: '2000-01-01' }], night: [] }, rlog: {} });
ok(st.full === 0 && st.partial === 0, 'correo: un hábito en pausa no cuenta');

// 2. Un «#type=recovery» sin sesión detrás no deja la sincronización parada.
(async () => {
  const llamadas = []; let oyente;
  const sb = {
    auth: {
      onAuthStateChange(fn) { oyente = fn; }, getSession() { return Promise.resolve({ data: { session: null } }); },
      signOut() { return Promise.resolve({}); }
    },
    from() { return { select() { return { eq() { return { maybeSingle() { llamadas.push('leer'); return Promise.resolve({ data: null }); } }; } }; },
      upsert() { llamadas.push('SUBIR'); return { select() { return { single() { return Promise.resolve({ data: { updated_at: new Date().toISOString() } }); } }; } }; } }; }
  };
  const subs = {}, Bus = { on(e, f) { (subs[e] = subs[e] || []).push(f); }, emit(e, d) { (subs[e] || []).forEach(f => f(d)); } };
  const Nube = { state: { accountEmail: () => 'real@correo.com', snapshot: () => ({}), rawLocal: () => '', apply() {} }, provide(i) { Nube.impl = i; } };
  const c = { Nube, Bus, BdvIdentidad: { esInterno: () => false }, console, Promise, Date, setTimeout, clearTimeout, setInterval: () => 0,
    location: { hash: '#type=recovery', origin: 'https://app', pathname: '/', search: '' }, history: { replaceState() {} },
    localStorage: { getItem: () => null, setItem() {} }, sessionStorage: { setItem() {} },
    document: { addEventListener() {}, getElementById: () => null, visibilityState: 'hidden' }, navigator: {}, Intl };
  c.window = c; c.supabase = { createClient: () => sb };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js/infraestructura/nube-supabase.js'), 'utf8'), c);
  await new Promise(r => setTimeout(r, 20));
  oyente('SIGNED_IN', { user: { id: 'u1', email: 'real@correo.com', app_metadata: { provider: 'email' } } });
  await new Promise(r => setTimeout(r, 20));
  ok(llamadas.includes('leer'), 'un enlace de recuperación falso no bloquea la sincronización');

  // 3. La notificación solo abre páginas de la app.
  const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
  const h = {}; const self = { addEventListener(e, f) { h[e] = f; }, location: { origin: 'https://app' }, registration: {} };
  let abierta = null;
  const cs = { self, caches: {}, fetch() {}, URL, clients: { matchAll: () => Promise.resolve([]), openWindow: u => { abierta = u; return Promise.resolve(); } } };
  vm.createContext(cs); vm.runInContext(sw, cs);
  const prueba = async url => { abierta = null; await new Promise(r => h.notificationclick({ notification: { close() {}, data: { url } }, waitUntil: p => p.then(r) })); return abierta; };
  ok(await prueba('https://evil.example/robar') === '/', 'una notificación con enlace ajeno abre la app');
  ok(await prueba('/?ir=hoy&fuente=push') === '/?ir=hoy&fuente=push', 'el enlace propio sigue funcionando');

  console.log(fallos ? '\n' + fallos + ' fallos' : '\ntodo bien');
  process.exit(fallos ? 1 : 0);
})();
