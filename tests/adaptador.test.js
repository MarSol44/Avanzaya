// Ejecuta el adaptador real (nube-supabase.js) contra un cliente de Supabase falso.
const vm = require('vm'), fs = require('fs'), path = require('path');
// raíz del proyecto: la carpeta de encima de tests/ (o la que se pase como argumento)
const raiz = process.argv[2] || require('path').join(__dirname, '..');
const dormir = ms => new Promise(r => setTimeout(r, ms));
let fallos = 0;
function ok(cond, txt) { console.log((cond ? 'ok   ' : 'FALLO') + ' ' + txt); if (!cond) fallos++; }

async function montar(hash, leerEstado, sesionInicial) {
  const llamadas = [];
  const res = {};
  let oyente = null;
  const sbFalso = {
    auth: {
      onAuthStateChange(fn) { oyente = fn; },
      // como supabase-js: con un enlace de recuperación de verdad, la sesión ya está guardada aquí
      getSession() { return Promise.resolve({ data: { session: sesionInicial || null } }); },
      signUp(c) { llamadas.push('signUp'); res.ultimaAlta = c; return Promise.resolve({ data: { user: { id: 'u1', identities: [{}] }, session: { user: { id: 'u1' } } } }); },
      signInWithPassword(c) {
        llamadas.push('signIn');
        if (c.password === 'mala') return Promise.resolve({ data: {}, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } });
        const s = { access_token: 'tok-nuevo', user: { id: 'u1', email: 'real@correo.com', app_metadata: { provider: 'email' } } };
        oyente && oyente('SIGNED_IN', s);
        return Promise.resolve({ data: { user: s.user, session: s } });
      },
      signOut(o) { llamadas.push('signOut' + (o && o.scope ? ':' + o.scope : '')); return Promise.resolve({}); },
      resetPasswordForEmail(e, o) { llamadas.push('reset:' + o.redirectTo); return Promise.resolve({}); },
      updateUser() { llamadas.push('updateUser'); return Promise.resolve({ data: {} }); }
    },
    from() {
      return {
        select() { return { eq() { return { maybeSingle() { llamadas.push('leer'); return Promise.resolve(leerEstado()); } }; } }; },
        upsert() { llamadas.push('SUBIR'); return { select() { return { single() { return Promise.resolve({ data: { updated_at: new Date().toISOString() } }); } }; } }; },
        delete() { return { eq() { return Promise.resolve({}); } }; }
      };
    }
  };
  const subs = {};
  const emitidos = [];
  const Bus = { on(e, f) { (subs[e] = subs[e] || []).push(f); }, emit(e, d) { emitidos.push([e, d]); (subs[e] || []).forEach(f => f(d)); } };
  let cuenta = '';
  const aplicado = [];
  const Nube = {
    state: {
      accountEmail: () => cuenta, snapshot: () => ({}), rawLocal: () => '',
      apply: r => aplicado.push(r), storeId: () => ''
    },
    provide(impl) { Nube.impl = impl; }
  };
  const mem = {};
  const peticiones = [];
  let respuestaFuncion = { ok: true, status: 200 };
  const ctx = {
    fetch: (url, o) => { peticiones.push({ url, o }); llamadas.push('FUNCION'); return Promise.resolve(respuestaFuncion); },
    Nube, Bus, BdvIdentidad: { esInterno: () => false }, console, Promise, Date, setTimeout, clearTimeout, setInterval: () => 0,
    location: { hash, origin: 'https://app', pathname: '/', search: '' },
    history: { replaceState() {} },
    localStorage: { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; } },
    sessionStorage: { setItem() {} },
    document: { addEventListener() {}, getElementById: () => null, visibilityState: 'hidden' },
    navigator: {}, Intl
  };
  ctx.window = ctx;
  ctx.supabase = { createClient: () => sbFalso };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(raiz, 'js/infraestructura/nube-supabase.js'), 'utf8'), ctx);
  await dormir(10);
  return { peticiones, setRespuesta: r => { respuestaFuncion = r; }, emitidos, get ultimaAlta() { return res.ultimaAlta; }, impl: Nube.impl, llamadas, Bus, aplicado, oyente: () => oyente, setCuenta: c => { cuenta = c; } };
}

(async () => {
  // 1. Entrar desde un dispositivo nuevo: nada se sube ni se aplica hasta que la cuenta local está lista.
  let a = await montar('', () => ({ data: { state: { goalsS: [1] }, updated_at: '2026-11-01T00:00:00Z' } }));
  a.setCuenta('');
  let r = await a.impl.entrada('real@correo.com', 'x');
  ok(r.ok && r.estado.goalsS.length === 1, 'entrada devuelve la copia de la nube');
  a.Bus.emit('saved');                 // lo que guarda el cambio de espacio local
  a.Bus.emit('account:switched');      // el cambio de cuenta no puede cerrar la sesión recién abierta
  a.setCuenta('real@correo.com');
  a.Bus.emit('saved');
  await dormir(1700);
  ok(!a.llamadas.includes('SUBIR'), 'durante la entrada no se sube nada');
  ok(!a.llamadas.includes('signOut'), 'cambiar de espacio no cierra la sesión nueva');
  ok(a.aplicado.length === 0, 'durante la entrada no se aplica nada al estado');
  a.impl.entradaLista(Date.parse('2026-11-01T00:00:00Z'));
  await dormir(20);
  ok(a.aplicado.length === 0, 'con el reloj puesto, la misma copia no se vuelve a aplicar');

  // 2. Si no se puede leer la copia, la entrada se cancela: no se abre una cuenta vacía.
  a = await montar('', () => ({ error: { message: 'boom' } }));
  r = await a.impl.entrada('real@correo.com', 'x');
  ok(!r.ok && r.codigo === 'red', 'sin poder leer la copia, la entrada falla');
  ok(a.llamadas.includes('signOut') && !a.llamadas.includes('SUBIR'), 'y se cierra sin subir nada');

  // 3. Error de lectura en la sincronización normal: no se pisa la nube.
  a = await montar('', () => ({ error: { message: 'boom' } }));
  a.setCuenta('real@correo.com');
  a.oyente()('SIGNED_IN', { user: { id: 'u1', email: 'real@correo.com', app_metadata: { provider: 'email' } } });
  await dormir(20);
  ok(a.llamadas.includes('leer') && !a.llamadas.includes('SUBIR'), 'un error al leer ya no sube los datos locales');

  // 4. Sin copia en la nube, sí se sube la primera.
  a = await montar('', () => ({ data: null }));
  a.setCuenta('real@correo.com');
  a.oyente()('SIGNED_IN', { user: { id: 'u1', email: 'real@correo.com', app_metadata: { provider: 'email' } } });
  await dormir(20);
  ok(a.llamadas.includes('SUBIR'), 'sin copia en la nube se sube la primera');

  // 5. Sin cuenta local (invitado) con una sesión de Supabase: ni se lee ni se sube.
  a = await montar('', () => ({ data: { state: {}, updated_at: '2030-01-01T00:00:00Z' } }));
  a.setCuenta('');
  a.oyente()('SIGNED_IN', { user: { id: 'u1', email: 'real@correo.com', app_metadata: { provider: 'email' } } });
  await dormir(20);
  ok(!a.llamadas.includes('leer') && !a.llamadas.includes('SUBIR') && !a.aplicado.length, 'un invitado no recibe ni sube datos de una sesión ajena');

  // 6. Volver del enlace de recuperación: se pide la clave y no se sincroniza.
  const s = { user: { id: 'u1', email: 'real@correo.com', app_metadata: { provider: 'email' } } };
  a = await montar('#access_token=abc&type=recovery', () => ({ data: { state: {}, updated_at: '2030-01-01T00:00:00Z' } }), s);
  a.setCuenta('real@correo.com');
  let pidio = 0; a.Bus.on('auth:recuperar', () => pidio++);
  a.oyente()('SIGNED_IN', s);
  a.oyente()('PASSWORD_RECOVERY', s);
  await dormir(20);
  ok(pidio === 1, 'el enlace lleva a pedir la nueva contraseña');
  ok(!a.llamadas.includes('leer') && !a.llamadas.includes('SUBIR') && !a.aplicado.length, 'mientras tanto no se sincroniza');
  r = await a.impl.claveRecuperada('Nueva-123456');
  ok(r.ok && a.llamadas.includes('updateUser') && a.llamadas.includes('signOut'), 'cambiar la clave cierra la sesión para volver a entrar');

  // 8. La sesión de la nube es de otra persona: no se lee ni se sube nada.
  a = await montar('', () => ({ data: null }));
  a.setCuenta('mia@correo.com');
  a.oyente()('SIGNED_IN', { user: { id: 'u2', email: 'otra@correo.com', app_metadata: { provider: 'email' } } });
  await dormir(20);
  ok(!a.llamadas.includes('leer') && !a.llamadas.includes('SUBIR'), 'con la sesión de otra cuenta no se sincroniza nada');

  // 9. Vuelve del enlace de confirmación: se cierra esa sesión y se pide entrar.
  const sc = { user: { id: 'u3', email: 'nueva@correo.com', app_metadata: { provider: 'email' } } };
  a = await montar('#access_token=abc&type=signup', () => ({ data: null }), sc);
  a.setCuenta('mia@correo.com');
  a.oyente()('SIGNED_IN', sc);
  await dormir(20);
  ok(a.emitidos.some(x => x[0] === 'auth:confirmado' && x[1] === 'nueva@correo.com'), 'el enlace de confirmación lleva a iniciar sesión con ese correo');
  ok(a.llamadas.includes('signOut') && !a.llamadas.includes('leer') && !a.llamadas.includes('SUBIR'), 'y no toca los datos de la cuenta abierta');

  // 10. El alta pide confirmar el correo y vuelve a la app.
  a = await montar('', () => ({ data: null }));
  r = await a.impl.alta('nueva@correo.com', 'x', 'Ana');
  ok(r.ok && a.ultimaAlta.options.emailRedirectTo === 'https://app/' && a.ultimaAlta.options.data.name === 'Ana', 'el alta lleva el enlace de vuelta y el nombre');

  // 11. Eliminar la cuenta con contraseña: se comprueba, se llama a la función con esa sesión y se cierra.
  a = await montar('', () => ({ data: null }));
  a.setCuenta('real@correo.com');
  a.Bus.emit('saved');
  r = await a.impl.eliminarCuenta('real@correo.com', 'buena');
  await dormir(1700);
  ok(r.ok && a.peticiones.length === 1 && /\/functions\/v1\/delete-account$/.test(a.peticiones[0].url), 'eliminar llama a la función de borrado');
  ok(a.peticiones[0].o.headers.Authorization === 'Bearer tok-nuevo', 'con la sesión recién comprobada');
  ok(!a.llamadas.includes('SUBIR') && !a.llamadas.includes('leer'), 'sin volver a subir los datos que se borran');
  ok(a.llamadas.includes('signOut:local'), 'y cierra la sesión al terminar');

  // 12. Contraseña mal: no se llama a la función.
  a = await montar('', () => ({ data: null }));
  r = await a.impl.eliminarCuenta('real@correo.com', 'mala');
  ok(!r.ok && r.codigo === 'credenciales' && a.peticiones.length === 0, 'con la contraseña mal no se borra nada');

  // 13. Sin contraseña (Google): la sesión abierta tiene que ser la de esa cuenta.
  a = await montar('', () => ({ data: null }), { access_token: 't', user: { id: 'u9', email: 'otra@correo.com' } });
  r = await a.impl.eliminarCuenta('real@correo.com', '');
  ok(!r.ok && r.codigo === 'sin-sesion' && a.peticiones.length === 0, 'con la sesión de otra cuenta no se borra nada');

  // 14. Si la función falla, se avisa y no se da por borrada.
  a = await montar('', () => ({ data: null }));
  a.setRespuesta({ ok: false, status: 500 });
  r = await a.impl.eliminarCuenta('real@correo.com', 'buena');
  ok(!r.ok && r.codigo === 'red', 'si el servidor falla, la cuenta no se da por eliminada');

  // 7. Enlace de recuperación apuntando a la propia app.
  a = await montar('', () => ({ data: null }));
  await a.impl.recuperar('real@correo.com');
  ok(a.llamadas.includes('reset:https://app/'), 'el correo de recuperación vuelve a la app');

  console.log(fallos ? '\n' + fallos + ' fallos' : '\ntodo bien');
  process.exit(fallos ? 1 : 0);
})();
