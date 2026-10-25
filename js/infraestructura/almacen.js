/* ==========================================================================
   INFRAESTRUCTURA — almacén del estado en este navegador (localStorage).
   Carga, valida y guarda; lleva varias cuentas en el mismo dispositivo.
   No pinta nada: si algo falla, lo cuenta por el bus («aviso») y la capa de
   presentación decide cómo enseñarlo.
   ========================================================================== */
var Store = (function () {
  'use strict';

  var KEY = 'brujula.v2';

  // Varias cuentas en el mismo navegador: cada una guarda su estado en su
  // propia clave y un índice correo → clave permite encontrarla al entrar.
  var USERS_KEY = KEY + '.users', ACTIVE_KEY = KEY + '.active';
  var curKey = KEY;
  try { curKey = localStorage.getItem(ACTIVE_KEY) || KEY; } catch (e) { curKey = KEY; }
  function lc(m) { return String(m || '').trim().toLowerCase(); }
  function users() {
    try { var u = JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); return u && typeof u === 'object' ? u : {}; }
    catch (e) { return {}; }
  }
  function indexUser() {
    if (!S.account || !S.account.email) return;
    var u = users(), m = lc(S.account.email), k;
    for (k in u) if (Object.prototype.hasOwnProperty.call(u, k) && u[k] === curKey && k !== m) delete u[k];
    u[m] = curKey;
    try { localStorage.setItem(USERS_KEY, JSON.stringify(u)); } catch (e) { }
  }
  function newUserKey(m) { return KEY + '.u.' + encodeURIComponent(lc(m)); }
  function findKey(m) {
    var u = users(), k = lc(m);
    if (Object.prototype.hasOwnProperty.call(u, k) && typeof u[k] === 'string' && u[k].indexOf(KEY) === 0) return u[k];
    if (S.account && lc(S.account.email) === k) return curKey;
    return null;
  }

  /* --------------------------------------------- forma del estado guardado */
  function defaults() {
    return {
      v: 2,
      start: '',                     // primer día que se usó la app
      account: null,                 // { name, email, pass:{salt,hash,iter}, created }
      session: false,
      sessionMode: 'keep',           // 'keep' = recordar, 'temp' = solo esta pestaña
      sessionAt: 0,                  // cuándo se inició (caduca a los 14 días)
      auth: { fails: 0, until: 0 },  // freno a la fuerza bruta
      guest: false,
      profile: { photo: '', lang: 'es', tz: '', weekStart: 1 },
      prefs: { theme: 'auto', notifs: true },
      onboarded: false,

      cats: BdvAreas.base(),

      rc: [],                        // historial de Reality Check
      rcDraft: null,                 // el que se está rellenando
      future: {},                    // { catId: { goal, why } }
      firstStep: '',                 // "¿qué paso pequeño esta semana?"

      visions: [],                   // [{ id, text, date }]
      board: [],                     // [{ id, kind:'img'|'quote', src, cap }]

      goalsS: [],                    // corto plazo
      goalsL: [],                    // largo plazo
      hidden: {},                    // { goalId: true } — ocultas en Progreso

      routines: {
        day: [{ id: Util.uid(), name: 'Mover el cuerpo 20 min' }, { id: Util.uid(), name: 'Leer 10 páginas' }],
        night: [{ id: Util.uid(), name: 'Repasar el día' }, { id: Util.uid(), name: 'Dejar el móvil fuera' }]
      },
      rlog: {},                      // { fecha: { day:[ids], night:[ids] } }
      notes: {},                     // { fecha: 'texto' }
      events: {},                    // { fecha: [{ id, title, goalId, sid, time:'HH:MM'|'', done, kind:'task'|'appt' }] }
      todo: [],                      // pendientes sin día: [{ id, title, kind, goalId, sid }]

      challenge: null,               // { name, days, start, done:{} }
      reviews: {},                   // { lunesDeLaSemana: { won, adjust, focus } }
      dismissed: {},                 // avisos que la persona ya quitó
      lastBackup: '',                // último día que copió su respaldo
      wins: []                       // [{ id, text, date }]
    };
  }

  var S = defaults();

  // Lo guardado también se valida al leerlo: si el almacenamiento se manipula
  // desde fuera de la app, nada llega al estado sin pasar por el esquema.
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(curKey); } catch (e) { return; }
    if (!raw) return;
    var d = null;
    try { d = JSON.parse(raw); } catch (e) { return; }
    try { Sec.sanitizeState(d, S); }
    catch (e) { var f = defaults(), k; for (k in f) if (Object.prototype.hasOwnProperty.call(f, k)) S[k] = f[k]; }
  }

  // Se avisa de que se guardó; la sincronización y el badge de racha escuchan.
  function afterSave() { Bus.emit('saved'); }

  var t1 = null, dirty = false;
  function save() {
    clearTimeout(t1);
    dirty = true;
    t1 = setTimeout(function () {
      dirty = false;
      try { localStorage.setItem(curKey, JSON.stringify(S)); indexUser(); }
      catch (e) { Bus.emit('aviso', 'No se pudo guardar: el navegador está lleno. Borra alguna imagen del tablero.'); }
      afterSave();
    }, 200);
  }
  function saveNow() {
    clearTimeout(t1); dirty = false;
    try { localStorage.setItem(curKey, JSON.stringify(S)); indexUser(); afterSave(); return true; }
    catch (e) { Bus.emit('aviso', 'No se pudo guardar: el navegador está lleno.'); return false; }
  }

  // Si se cierra o se oculta la pestaña antes de que salte el guardado
  // diferido, lo último que se escribió se guarda en ese momento.
  function flush() { if (dirty) saveNow(); }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

  // Cambia a la cuenta guardada en `key` (o a una vacía si no existe todavía).
  function switchUser(key) {
    saveNow();
    var f = defaults(), k;
    for (k in f) if (Object.prototype.hasOwnProperty.call(f, k)) S[k] = f[k];
    curKey = key;
    try { localStorage.setItem(ACTIVE_KEY, key); } catch (e) { }
    load();
    if (!S.start) S.start = Dates.today();
    // la sesión de la nube es de la cuenta anterior: quien sincroniza la cierra al oír esto
    Bus.emit('account:switched');
  }
  // Borra los datos de la cuenta activa de este navegador.
  function wipe() {
    var f = defaults(), k;
    for (k in f) if (Object.prototype.hasOwnProperty.call(f, k)) S[k] = f[k];
    try { localStorage.removeItem(curKey); } catch (e) { }
  }
  function rawLocal() { try { return localStorage.getItem(curKey) || ''; } catch (e) { return ''; } }

  // Marca de «esta pestaña tiene la sesión abierta» (para las sesiones que no
  // se recuerdan al cerrar). Vive en sessionStorage, que se borra al cerrar.
  var live = {
    mark: function () { try { sessionStorage.setItem('brujula.live', '1'); } catch (e) { /* modo privado */ } },
    clear: function () { try { sessionStorage.removeItem('brujula.live'); } catch (e) { } },
    is: function () { try { return sessionStorage.getItem('brujula.live') === '1'; } catch (e) { return false; } }
  };

  return {
    KEY: KEY, S: S, defaults: defaults, load: load, save: save, saveNow: saveNow,
    curKey: function () { return curKey; }, findKey: findKey, newUserKey: newUserKey,
    switchUser: switchUser, wipe: wipe, rawLocal: rawLocal, live: live
  };
})();
