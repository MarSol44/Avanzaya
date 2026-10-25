/* ==========================================================================
   Seguridad. Esta app no tiene servidor, así que la mayoría de defensas
   clásicas (control de acceso, SQL, CORS, CSRF, SSRF) no tienen dónde
   aplicarse: no hay backend al que atacar ni datos de otras personas que
   proteger. Lo que sí existe y sí se defiende aquí:

     · La contraseña local  → PBKDF2-SHA256 con sal aleatoria, nunca en claro.
     · La comparación       → tiempo constante, sin fugas por temporización.
     · La aleatoriedad      → crypto.getRandomValues, nunca Math.random.
     · La fuerza bruta      → bloqueo progresivo tras varios fallos.
     · Las imágenes subidas → tipo, tamaño y dimensiones validados, y
                              recodificadas para descartar EXIF y SVG con script.
     · El respaldo pegado   → es la única entrada externa real de la app;
                              se valida campo a campo contra un esquema estricto
                              antes de tocar el estado.
   ========================================================================== */
var Sec = (function () {
  'use strict';

  var SUB = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto.subtle : null;
  var ITER = 210000;

  /* ---------------------------------------------------- aleatoriedad fuerte */
  function bytes(n) {
    var a = new Uint8Array(n);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
    else throw new Error('Este navegador no ofrece aleatoriedad segura.');
    return a;
  }
  function hex(a) {
    var s = '';
    for (var i = 0; i < a.length; i++) s += a[i].toString(16).padStart(2, '0');
    return s;
  }
  function unhex(s) {
    var a = new Uint8Array(s.length / 2);
    for (var i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16);
    return a;
  }
  // Identificadores no adivinables y no correlativos.
  function uid() { return hex(bytes(8)); }

  /* --------------------------------------------------------- contraseñas */
  function derive(pass, salt, iter) {
    if (!SUB) return Promise.reject(new Error('sin-crypto'));
    var enc = new TextEncoder();
    return SUB.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return SUB.deriveBits({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, key, 256);
      })
      .then(function (bits) { return hex(new Uint8Array(bits)); });
  }
  function hashPass(pass) {
    var salt = bytes(16);
    return derive(pass, salt, ITER).then(function (h) {
      return { alg: 'PBKDF2-SHA256', iter: ITER, salt: hex(salt), hash: h };
    });
  }
  function verifyPass(pass, rec) {
    if (!rec || typeof rec !== 'object' || !rec.salt || !rec.hash) return Promise.resolve(false);
    return derive(pass, unhex(rec.salt), rec.iter || ITER)
      .then(function (h) { return equal(h, rec.hash); })
      .catch(function () { return false; });
  }
  // Comparación en tiempo constante: no revela cuántos caracteres coinciden.
  function equal(a, b) {
    a = String(a); b = String(b);
    var r = a.length ^ b.length, n = Math.max(a.length, b.length);
    for (var i = 0; i < n; i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return r === 0;
  }

  var COMMON = ['12345678', '123456789', '1234567890', 'password', 'contrasena', 'contraseña',
    'qwertyui', 'qwerty123', 'iloveyou', 'princess', 'password1', 'password123', 'admin123',
    'welcome1', 'abc12345', '11111111', '00000000', 'football', 'baseball', 'sunshine',
    'letmein1', 'trustno1', 'dragon12', 'monkey12', 'superman', 'michael1', 'shadow12',
    '87654321', 'qwertyuiop', 'asdfghjk', 'zxcvbnm1', 'contrasena1', 'usuario1'];

  // Devuelve null si la contraseña vale, o el motivo por el que no.
  function passProblem(p) {
    if (!p || p.length < 8) return 'La contraseña necesita al menos 8 caracteres.';
    if (p.length > 200) return 'La contraseña es demasiado larga.';
    var low = p.toLowerCase();
    if (COMMON.indexOf(low) >= 0) return 'Esa contraseña está en todas las listas de las más usadas. Elige otra.';
    if (/^(.)\1+$/.test(p)) return 'No repitas el mismo carácter: es de las primeras que se prueban.';
    if (/^(012|123|234|345|456|567|678|789|abc|qwe|asd)/.test(low) && p.length < 12) {
      return 'Empieza por una secuencia obvia. Alárgala o cámbiala.';
    }
    var classes = 0;
    if (/[a-z]/.test(p)) classes++;
    if (/[A-Z]/.test(p)) classes++;
    if (/[0-9]/.test(p)) classes++;
    if (/[^\w]/.test(p)) classes++;
    if (classes < 2 && p.length < 12) return 'Mezcla al menos dos tipos de carácter (letras y números, por ejemplo) o hazla más larga.';
    return null;
  }

  /* ------------------------------------------------- freno a la fuerza bruta */
  // Espera creciente tras fallos seguidos, para que probar contraseñas a mano
  // deje de ser viable aunque alguien se siente delante del dispositivo.
  function lockLeft(auth) {
    if (!auth || !auth.until) return 0;
    return Math.max(0, Math.ceil((auth.until - Date.now()) / 1000));
  }
  function noteFail(auth) {
    auth.fails = (auth.fails || 0) + 1;
    if (auth.fails >= 5) {
      var extra = Math.min(auth.fails - 4, 6);          // 30 s, 60 s, 120 s… hasta 16 min
      auth.until = Date.now() + 30000 * Math.pow(2, extra - 1);
    }
    return auth;
  }
  function noteOk(auth) { auth.fails = 0; auth.until = 0; return auth; }

  /* -------------------------------------------------- validación de imágenes */
  var MAX_FILE = 8 * 1024 * 1024;        // 8 MB
  var MAX_PIXELS = 40 * 1000 * 1000;     // 40 Mpx: freno a bombas de descompresión
  var OK_TYPES = /^image\/(png|jpeg|jpg|webp|gif|bmp|avif)$/i;

  function imageProblem(file) {
    if (!file) return 'No se recibió ningún archivo.';
    // El tipo que declara el navegador no es de fiar por sí solo, pero sirve
    // para descartar lo evidente antes de leer nada.
    if (/svg/i.test(file.type) || /\.svgz?$/i.test(file.name || '')) {
      return 'Los SVG no se admiten: pueden llevar scripts dentro. Usa PNG, JPG o WebP.';
    }
    if (!OK_TYPES.test(file.type || '')) return 'Ese archivo no es una imagen admitida (PNG, JPG, WebP o GIF).';
    if (file.size > MAX_FILE) return 'La imagen pesa más de 8 MB. Elige una más ligera.';
    return null;
  }
  function pixelProblem(w, h) {
    if (!w || !h) return 'No se pudo leer la imagen.';
    if (w * h > MAX_PIXELS) return 'La imagen tiene demasiados píxeles para procesarla aquí.';
    return null;
  }

  /* ============================================================================
     Validación del respaldo. Es la única entrada externa de la app: un texto
     que alguien pega. Nunca se mezcla tal cual con el estado; se reconstruye
     campo a campo, con tipos, longitudes y formatos fijos.
     ============================================================================ */
  var L = { txt: 20000, name: 300, list: 400, keys: 3000, img: 4000000, board: 80 };

  function s(v, max) { return typeof v === 'string' ? v.slice(0, max || L.name) : ''; }
  function n(v, lo, hi, def) { var x = +v; return isFinite(x) ? Math.max(lo, Math.min(hi, x)) : def; }
  function idOf(v) {
    var x = typeof v === 'string' ? v.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) : '';
    return x || uid();
  }
  function dateOf(v) { return (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? v : ''; }
  function colorOf(v) { return (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v)) ? v : '#5b6ee1'; }
  function emojiOf(v) { return typeof v === 'string' ? v.slice(0, 8) : '⭐'; }
  function imgOf(v) {
    return (typeof v === 'string' && v.length <= L.img &&
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) ? v : '';
  }
  function objOf(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
  function arrOf(v, max, fn) {
    if (!Array.isArray(v)) return [];
    var out = [], lim = Math.min(v.length, max);
    for (var i = 0; i < lim; i++) { var r = fn(v[i]); if (r) out.push(r); }
    return out;
  }
  function keysOf(v, max) { return Object.keys(objOf(v)).slice(0, max); }

  function stepOf(x) {
    x = objOf(x);
    return { id: idOf(x.id), name: s(x.name, L.name), desc: s(x.desc, 1000), due: dateOf(x.due), done: !!x.done, promoted: !!x.promoted };
  }
  function goalOf(x) {
    x = objOf(x);
    return {
      id: idOf(x.id), name: s(x.name, L.name), done: !!x.done, cat: s(x.cat, 40),
      motivation: s(x.motivation, 4000), reward: s(x.reward, L.name), due: dateOf(x.due),
      priority: ['Alta', 'Media', 'Baja'].indexOf(x.priority) >= 0 ? x.priority : 'Media',
      steps: arrOf(x.steps, 200, stepOf)
    };
  }
  function passOf(x) {
    // Solo se acepta un registro PBKDF2 bien formado. Una contraseña en claro
    // dentro de un respaldo antiguo se descarta: se pedirá crearla de nuevo.
    x = objOf(x);
    if (!/^[0-9a-f]{32}$/.test(String(x.salt)) || !/^[0-9a-f]{64}$/.test(String(x.hash))) return null;
    return { alg: 'PBKDF2-SHA256', iter: n(x.iter, 10000, 2000000, ITER), salt: x.salt, hash: x.hash };
  }

  function sanitizeState(raw, base) {
    var d = objOf(raw), out = base;   // `base` son los valores por defecto ya creados

    out.start = dateOf(d.start);
    out.onboarded = !!d.onboarded;
    out.session = !!d.session;
    out.guest = !!d.guest;
    out.sessionMode = d.sessionMode === 'temp' ? 'temp' : 'keep';
    out.sessionAt = n(d.sessionAt, 0, 4102444800000, 0);
    out.auth = { fails: n(objOf(d.auth).fails, 0, 999, 0), until: n(objOf(d.auth).until, 0, 4102444800000, 0) };

    var acc = objOf(d.account);
    var pw = passOf(acc.pass);
    out.account = (acc.email || acc.name)
      ? { name: s(acc.name, 120), email: s(acc.email, 254), pass: pw, created: dateOf(acc.created) }
      : null;

    var pr = objOf(d.profile);
    out.profile = {
      photo: imgOf(pr.photo), tz: s(pr.tz, 80),
      lang: ['es', 'en', 'pt'].indexOf(pr.lang) >= 0 ? pr.lang : 'es',
      weekStart: +pr.weekStart === 0 ? 0 : 1
    };
    var pf = objOf(d.prefs);
    out.prefs = {
      theme: ['auto', 'light', 'dark'].indexOf(pf.theme) >= 0 ? pf.theme : 'auto',
      notifs: pf.notifs !== false
    };

    var cats = arrOf(d.cats, 30, function (c) {
      c = objOf(c);
      return { id: idOf(c.id), emoji: emojiOf(c.emoji), name: s(c.name, 120) || 'Área', color: colorOf(c.color) };
    });
    if (cats.length) out.cats = cats;

    out.rc = arrOf(d.rc, 300, function (r) {
      r = objOf(r);
      var sc = {}, no = {}, so = objOf(r.scores), nRaw = objOf(r.notes);
      keysOf(so, 60).forEach(function (k) { if (/^[A-Za-z0-9_-]{1,40}$/.test(k)) sc[k] = n(so[k], 0, 10, 5); });
      keysOf(nRaw, 80).forEach(function (k) { if (/^[A-Za-z0-9_-]{1,60}$/.test(k)) no[k] = s(nRaw[k], 4000); });
      return { id: idOf(r.id), date: dateOf(r.date) || '', scores: sc, notes: no, adjectives: s(r.adjectives, 400) };
    });
    out.rcDraft = null;

    var fu = objOf(d.future); out.future = {};
    keysOf(fu, 60).forEach(function (k) {
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(k)) return;
      var f = objOf(fu[k]);
      out.future[k] = { goal: s(f.goal, 2000), why: s(f.why, 2000) };
    });
    out.firstStep = s(d.firstStep, L.name);

    out.visions = arrOf(d.visions, 60, function (v) {
      v = objOf(v);
      return { id: idOf(v.id), text: s(v.text, L.txt), date: dateOf(v.date) };
    });
    out.board = arrOf(d.board, L.board, function (t) {
      t = objOf(t);
      var kind = t.kind === 'img' ? 'img' : 'quote';
      var src = kind === 'img' ? imgOf(t.src) : '';
      if (kind === 'img' && !src) kind = 'quote';
      return { id: idOf(t.id), kind: kind, src: src, cap: s(t.cap, 1000) };
    });

    out.goalsS = arrOf(d.goalsS, L.list, goalOf);
    out.goalsL = arrOf(d.goalsL, L.list, goalOf);

    var hid = objOf(d.hidden); out.hidden = {};
    keysOf(hid, L.list).forEach(function (k) { if (/^[A-Za-z0-9_-]{1,40}$/.test(k) && hid[k]) out.hidden[k] = true; });

    var rt = objOf(d.routines);
    function rItem(x) { x = objOf(x); return { id: idOf(x.id), name: s(x.name, L.name) }; }
    var rd = arrOf(rt.day, 60, rItem), rn = arrOf(rt.night, 60, rItem);
    if (rd.length || rn.length) out.routines = { day: rd, night: rn };

    var rl = objOf(d.rlog); out.rlog = {};
    keysOf(rl, L.keys).forEach(function (k) {
      if (!dateOf(k)) return;
      var e = objOf(rl[k]);
      out.rlog[k] = {
        day: arrOf(e.day, 60, function (x) { return typeof x === 'string' ? idOf(x) : null; }),
        night: arrOf(e.night, 60, function (x) { return typeof x === 'string' ? idOf(x) : null; })
      };
    });
    var nt = objOf(d.notes); out.notes = {};
    keysOf(nt, L.keys).forEach(function (k) { if (dateOf(k)) out.notes[k] = s(nt[k], L.txt); });

    var ev = objOf(d.events); out.events = {};
    keysOf(ev, L.keys).forEach(function (k) {
      if (!dateOf(k)) return;
      out.events[k] = arrOf(ev[k], 60, function (x) {
        x = objOf(x);
        return {
          id: idOf(x.id), title: s(x.title, 400), goalId: x.goalId ? idOf(x.goalId) : '', sid: s(x.sid, 40),
          time: /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time) ? x.time : '',
          done: !!x.done, kind: x.kind === 'appt' ? 'appt' : 'task'
        };
      });
    });
    // Pendientes que todavía no tienen día.
    out.todo = arrOf(d.todo, 200, function (x) {
      x = objOf(x);
      return { id: idOf(x.id), title: s(x.title, 400), kind: x.kind === 'appt' ? 'appt' : 'task', goalId: x.goalId ? idOf(x.goalId) : '', sid: s(x.sid, 40) };
    });

    var ch = objOf(d.challenge);
    if (ch && (ch.name || ch.start)) {
      var done = {}, dd = objOf(ch.done);
      keysOf(dd, 400).forEach(function (k) { if (dateOf(k) && dd[k]) done[k] = true; });
      out.challenge = { name: s(ch.name, L.name), days: n(ch.days, 3, 365, 30), start: dateOf(ch.start) || '', done: done };
    } else out.challenge = null;

    var dm = objOf(d.dismissed); out.dismissed = {};
    keysOf(dm, 40).forEach(function (k) {
      if (/^[a-zA-Z]{1,30}$/.test(k) && dateOf(dm[k])) out.dismissed[k] = dm[k];
    });
    out.lastBackup = dateOf(d.lastBackup);

    var rv = objOf(d.reviews); out.reviews = {};
    keysOf(rv, 600).forEach(function (k) {
      if (!dateOf(k)) return;
      var e = objOf(rv[k]);
      out.reviews[k] = { won: s(e.won, 4000), adjust: s(e.adjust, 4000), focus: s(e.focus, 1000) };
    });

    out.wins = arrOf(d.wins, 500, function (w) {
      w = objOf(w);
      return { id: idOf(w.id), text: s(w.text, 1000), date: dateOf(w.date) };
    });
    out.feedback = s(d.feedback, L.txt);

    return out;
  }

  return {
    uid: uid, bytes: bytes, hex: hex, equal: equal,
    hashPass: hashPass, verifyPass: verifyPass, passProblem: passProblem, hasCrypto: !!SUB,
    lockLeft: lockLeft, noteFail: noteFail, noteOk: noteOk,
    imageProblem: imageProblem, pixelProblem: pixelProblem,
    sanitizeState: sanitizeState, colorOf: colorOf
  };
})();
/* ==========================================================================
   Sistema de iconos. Trazo monocromo, mismo grosor y mismo tamaño óptico
   en toda la app, dibujados sobre una rejilla de 24. Sustituyen a los emojis
   que antes hacían de icono en la interfaz.

   Los emojis NO desaparecen del todo, y es a propósito: los de las áreas de
   vida los elige la persona (💪 Salud, 💰 Finanzas…). Ahí son contenido suyo,
   no decoración nuestra, y por eso se quedan.
   ========================================================================== */
var Icons = (function () {
  'use strict';

  var P = {
    /* navegación principal */
    target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z|M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
    leaf: 'M20.5 3.5c0 8.5-5.5 13.5-13 13.5 0-8.5 5.5-13.5 13-13.5z|M8 21c.8-4 2.8-7 6-9',
    chart: 'M4.5 20.5v-7|M12 20.5V5|M19.5 20.5v-10|M3 20.5h18',
    user: 'M12 4.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5z|M4.5 20.5c1.3-3.6 4.1-5.5 7.5-5.5s6.2 1.9 7.5 5.5',

    /* estructura */
    calendar: 'M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5z|M3.5 10h17|M8 3.5v4|M16 3.5v4',
    list: 'M8.5 6.5h12|M8.5 12h12|M8.5 17.5h12|M4 6.5h.01|M4 12h.01|M4 17.5h.01',
    search: 'M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z|M15.8 15.8 20.5 20.5',
    filter: 'M4 6.5h16|M7 12h10|M10 17.5h4',
    grid: 'M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h6v6h-6z',

    /* acciones */
    plus: 'M12 5v14|M5 12h14',
    x: 'M6 6l12 12|M18 6 6 18',
    check: 'M4.5 12.5 9 17l10.5-10.5',
    trash: 'M4 6.5h16|M9.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5|M6.5 6.5l.9 13a1.4 1.4 0 0 0 1.4 1.3h6.4a1.4 1.4 0 0 0 1.4-1.3l.9-13|M10 10.5v6|M14 10.5v6',
    pencil: 'M4 20h4.2L20 8.2a2.3 2.3 0 0 0-3.2-3.2L5 16.8V20z|M15 6l3 3',
    refresh: 'M20 5.5v5h-5|M4 18.5v-5h5|M19.2 10.5a7.5 7.5 0 0 0-13-3.2L4 10.5|M4.8 13.5a7.5 7.5 0 0 0 13 3.2l2.2-3.2',
    copy: 'M9 9.5h9a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 9 9.5z|M4.5 14.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5h9A1.5 1.5 0 0 1 14.5 4v.5',
    rotate: 'M4 5.5v5h5|M4.6 10.5a7.5 7.5 0 1 1-.4 4',
    upRight: 'M7.5 16.5 16.5 7.5|M8.5 7.5h8v8',

    /* flechas */
    left: 'M14.5 5.5 8 12l6.5 6.5',
    right: 'M9.5 5.5 16 12l-6.5 6.5',
    up: 'M5.5 14.5 12 8l6.5 6.5',
    down: 'M5.5 9.5 12 16l6.5-6.5',
    arrowRight: 'M4.5 12h15|M13.5 6l6 6-6 6',
    swap: 'M4 8.5h13l-3.5-3.5|M20 15.5H7l3.5 3.5',

    /* estado y sistema */
    eye: 'M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z|M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',
    eyeOff: 'M4 4l16 16|M9.6 5.9A9.6 9.6 0 0 1 12 5.6c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.2 3.9|M6.4 7.6A17 17 0 0 0 2.5 11.8S6 18 12 18a9.4 9.4 0 0 0 3.4-.6|M10 10.1a2.8 2.8 0 0 0 3.9 3.9',
    lock: 'M5.5 10.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z|M8 10.5V7.5a4 4 0 0 1 8 0v3',
    shield: 'M12 3.2l7.5 2.8v5.5c0 4.6-3.2 7.7-7.5 9-4.3-1.3-7.5-4.4-7.5-9V6l7.5-2.8z|M9 12.2l2 2 4-4',
    bell: 'M18 9.5a6 6 0 1 0-12 0c0 5-2.2 6.5-2.2 6.5h16.4S18 14.5 18 9.5z|M10.2 19.5a2.2 2.2 0 0 0 3.6 0',
    save: 'M12 3.5v11|M8 10.5l4 4 4-4|M4.5 20.5h15',
    help: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z|M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.1-2.5 3.7|M12 17h.01',
    mail: 'M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 17V7A1.5 1.5 0 0 1 4 5.5z|M2.8 7.2 12 13l9.2-5.8',
    file: 'M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5z|M13.5 3.5V8a.5.5 0 0 0 .5.5h4.5|M8.5 13h7|M8.5 16.5h4.5',
    logout: 'M14.5 4.5H18A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-3.5|M10 15.5 6.5 12 10 8.5|M6.5 12h9',
    image: 'M4.5 4.5h15A1 1 0 0 1 20.5 5.5v13a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1z|M8.8 8.3a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z|M3.8 17.5 9 12.5l3.6 3.4 2.8-2.6 4.8 4.2',
    quote: 'M9.5 6.5C6.9 7.7 5.5 9.9 5.5 13v4.5h5.2V12H8.1c.1-1.7.8-2.9 2.4-3.7l-1-1.8z|M19.5 6.5c-2.6 1.2-4 3.4-4 6.5v4.5h5.2V12h-2.6c.1-1.7.8-2.9 2.4-3.7l-1-1.8z',
    flame: 'M12 3.2s5.2 4.4 5.2 9a5.2 5.2 0 0 1-10.4 0c0-1.7.7-3.1 1.6-4.2.3 1.4 1 2.2 1.9 2.2 1.4 0 .9-4.2 1.7-7z',
    zap: 'M13.5 3 5.5 13.5h5.3L10 21l8-10.5h-5.3L13.5 3z',
    mountain: 'M2.5 19.5 9 8.5l4.2 6.3 2.4-3.4 5.9 8.1z',
    note: 'M5.5 4.5h11A2 2 0 0 1 18.5 6.5v13H8a2.5 2.5 0 0 1-2.5-2.5v-12.5z|M5.5 17a2.5 2.5 0 0 1 2.5-2.5h10.5|M9 8.5h6',
    trophy: 'M8 4.5h8V9a4 4 0 0 1-8 0V4.5z|M8 6H5.5v.8A3.2 3.2 0 0 0 8.4 10|M16 6h2.5v.8A3.2 3.2 0 0 1 15.6 10|M12 13v3.5|M9 20.5h6|M9.5 16.5h5',
    sunrise: 'M4 19.5h16|M7.8 19.5a4.2 4.2 0 0 1 8.4 0|M12 3.5v3.5|M6 7l1.6 1.6|M18 7l-1.6 1.6|M2.5 13H4|M20 13h1.5',
    moon: 'M20 14.6A8.6 8.6 0 1 1 9.4 4a7 7 0 0 0 10.6 10.6z',
    sun: 'M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8z|M12 2.5V4|M12 20v1.5|M4.4 4.4 5.5 5.5|M18.5 18.5l1.1 1.1|M2.5 12H4|M20 12h1.5|M4.4 19.6 5.5 18.5|M18.5 5.5l1.1-1.1',
    monitor: 'M4 4.5h16A1.5 1.5 0 0 1 21.5 6v9a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5z|M8.5 20.5h7|M12 16.5v4',
    pin: 'M12 21s6.2-5.9 6.2-10.4a6.2 6.2 0 1 0-12.4 0C5.8 15.1 12 21 12 21z|M12 8.2a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z',
    compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M15.5 8.5 13.4 13.4 8.5 15.5l2.1-4.9 4.9-2.1z',
    sparkle: 'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5z|M18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z',
    ladder: 'M7.5 3v18|M16.5 3v18|M7.5 8h9|M7.5 13h9|M7.5 18h9',
    sleep: 'M14 4.5h6l-6 7h6|M4 13.5h5l-5 6h5',
    info: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z|M12 11v5.5|M12 7.6h.01',
    loader: 'M12 3.5v3.5|M12 17v3.5|M4.5 12H8|M16 12h3.5|M6.7 6.7 9.2 9.2|M14.8 14.8l2.5 2.5|M6.7 17.3 9.2 14.8|M14.8 9.2l2.5-2.5'
  };

  function ico(name, size) {
    var d = P[name];
    if (!d) return '';
    var s = size || 20;
    var paths = d.split('|').map(function (p) { return '<path d="' + p + '"/>'; }).join('');
    return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }
  ico.has = function (n) { return !!P[n]; };
  return ico;
})();
var I = Icons;
/* ==========================================================================
   Brújula de Vida — núcleo: estado, almacenamiento, fechas y utilidades.
   Todo vive en el navegador. No hay servidor ni cuentas reales.
   ========================================================================== */
var App = (function () {
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

  /* ------------------------------------------------------------ utilidades */
  // Identificadores aleatorios de crypto, nunca Math.random ni contadores.
  function uid() { return Sec.uid(); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* --------------------------------------------------------------- fechas */
  function dkey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseK(k) { var p = String(k).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return dkey(new Date()); }
  function shift(k, n) { var d = parseK(k); d.setDate(d.getDate() + n); return dkey(d); }
  function diff(a, b) { return Math.round((parseK(b) - parseK(a)) / 86400000); }
  function fmt(k) {
    if (!k) return '';
    try { return parseK(k).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return k; }
  }
  function fmtLong(k) {
    try { return parseK(k).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return k; }
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function inDays(n) {
    var d = new Date(); d.setDate(d.getDate() + n); return dkey(d);
  }

  /* --------------------------------------------- categorías (áreas de vida) */
  function baseCats() {
    return [
      { id: 'c1', emoji: '🎓', name: 'Carrera o Estudios', color: '#5b6ee1' },
      { id: 'c2', emoji: '🤝', name: 'Relaciones Personales', color: '#e07a45' },
      { id: 'c3', emoji: '❤️', name: 'Relaciones Románticas', color: '#d9527a' },
      { id: 'c4', emoji: '💰', name: 'Finanzas', color: '#c9971f' },
      { id: 'c5', emoji: '💪', name: 'Salud Física', color: '#2f9268' },
      { id: 'c6', emoji: '🧘', name: 'Salud Mental', color: '#3d9bb0' },
      { id: 'c7', emoji: '🌱', name: 'Personalidad y Crecimiento', color: '#7a63d6' },
      { id: 'c8', emoji: '🎨', name: 'Otros (Ocio, Hobbies)', color: '#b06ab8' }
    ];
  }

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

      cats: baseCats(),

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
        day: [{ id: uid(), name: 'Mover el cuerpo 20 min' }, { id: uid(), name: 'Leer 10 páginas' }],
        night: [{ id: uid(), name: 'Repasar el día' }, { id: uid(), name: 'Dejar el móvil fuera' }]
      },
      rlog: {},                      // { fecha: { day:[ids], night:[ids] } }
      notes: {},                     // { fecha: 'texto' }
      events: {},                    // { fecha: [{ id, title, goalId, sid, time:'HH:MM'|'', done, kind:'task'|'appt' }] }
      todo: [],                      // pendientes sin día: [{ id, title, kind }]

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

  // La sincronización y el badge de racha son aditivos: si sync.js no ha
  // cargado (o falló), estas llamadas no hacen nada y el guardado local sigue igual.
  function afterSave() {
    if (window.Sync) window.Sync.markDirty();
    if (window.SyncBadge) window.SyncBadge();
  }

  var t1 = null, dirty = false;
  function save() {
    clearTimeout(t1);
    dirty = true;
    t1 = setTimeout(function () {
      dirty = false;
      try { localStorage.setItem(curKey, JSON.stringify(S)); indexUser(); }
      catch (e) { toast('No se pudo guardar: el navegador está lleno. Borra alguna imagen del tablero.'); }
      afterSave();
    }, 200);
  }
  function saveNow() {
    clearTimeout(t1); dirty = false;
    try { localStorage.setItem(curKey, JSON.stringify(S)); indexUser(); afterSave(); return true; }
    catch (e) { toast('No se pudo guardar: el navegador está lleno.'); return false; }
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
    if (!S.start) S.start = today();
    // La sesión de la nube es de la cuenta anterior: se cierra para que sus datos no pisen los de ésta.
    if (window.Sync && window.Sync.signOut) window.Sync.signOut();
  }

  /* ------------------------------------------------------ estado de interfaz */
  var ui = {
    screen: 'splash',
    tab: 'hoy',
    subMetas: 'goals',
    subVision: 'board',
    rcStep: 0,
    selDay: today(),
    calMonth: today().slice(0, 7),
    openGoal: null,       // { kind:'S'|'L', id }
    sheetTab: 'desc',
    goalQ: '',
    goalFilter: '',
    progCat: '',
    regStep: 1,
    showPw: false
  };

  /* ------------------------------------------------------------- categorías */
  function cat(id) { return byId(S.cats, id); }
  function catName(id) { var c = cat(id); return c ? c.name : 'Sin categoría'; }
  function catEmoji(id) { var c = cat(id); return c ? c.emoji : '•'; }
  function catColor(id) { var c = cat(id); return c ? c.color : 'var(--ink-3)'; }

  function catOptions(sel) {
    var h = '<option value="">Sin categoría</option>';
    S.cats.forEach(function (c) {
      h += '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.emoji + '  ' + c.name) + '</option>';
    });
    return h + '<option value="__new">＋ Nueva categoría…</option>';
  }

  /* ------------------------------------------------------- estado de metas */
  // Devuelve { txt, cls } describiendo cuánto falta para la fecha límite.
  function due(k, done) {
    if (done) return { txt: 'Completada', cls: 'good' };
    if (!k) return { txt: 'Sin fecha', cls: '' };
    var n = diff(today(), k);
    if (n < 0) return { txt: 'Atrasado', cls: 'bad' };
    if (n === 0) return { txt: 'Hoy', cls: 'warn' };
    if (n < 7) return { txt: 'En ' + plural(n, 'día', 'días'), cls: 'warn' };
    if (n <= 28) return { txt: 'En ' + plural(Math.round(n / 7), 'semana', 'semanas'), cls: '' };
    return { txt: 'En ' + plural(Math.round(n / 30), 'mes', 'meses'), cls: '' };
  }

  function goalPct(g) {
    if (!g) return 0;
    if (g.done) return 100;
    if (!g.steps || !g.steps.length) return 0;
    var d = 0; g.steps.forEach(function (s) { if (s.done) d++; });
    return Math.round(d / g.steps.length * 100);
  }
  // verde = completada, rojo = atrasada, ámbar = en marcha
  function goalState(g) {
    if (g.done) return 'good';
    if (g.due && diff(today(), g.due) < 0) return 'bad';
    return 'warn';
  }
  function allGoals() { return S.goalsS.concat(S.goalsL); }
  // Las metas con fecha más cercana, para la pantalla de Hoy.
  function upcoming(n) {
    var out = [];
    S.goalsS.forEach(function (g) { if (!g.done && g.due) out.push({ g: g, kind: 'S' }); });
    S.goalsL.forEach(function (g) { if (!g.done && g.due) out.push({ g: g, kind: 'L' }); });
    out.sort(function (a, b) { return a.g.due < b.g.due ? -1 : 1; });
    var soon = out.filter(function (x) { return diff(today(), x.g.due) <= 45; });
    // Si nada vence pronto, se enseñan igualmente las más cercanas: Hoy tiene
    // que estar conectado con las metas aunque todas queden lejos.
    return (soon.length ? soon : out).slice(0, n || 3);
  }
  function findGoal(kind, id) { return byId(kind === 'S' ? S.goalsS : S.goalsL, id); }

  /* ------------------------------------------------- rutinas y días activos */
  function rlog(k) {
    if (!S.rlog[k]) S.rlog[k] = { day: [], night: [] };
    if (!S.rlog[k].day) S.rlog[k].day = [];
    if (!S.rlog[k].night) S.rlog[k].night = [];
    return S.rlog[k];
  }
  function dayTotals(k) {
    var l = S.rlog[k] || { day: [], night: [] };
    var total = S.routines.day.length + S.routines.night.length;
    var done = (l.day || []).length + (l.night || []).length;
    return { done: done, total: total };
  }
  // verde = día completo, ámbar = a medias, rojo = día pasado sin nada.
  // Los días anteriores a empezar a usar la app, el futuro y el día de hoy
  // sin marcar quedan neutros: no tiene sentido teñir de rojo lo que nunca existió.
  function dayStatus(k) {
    if (diff(today(), k) > 0) return '';
    if (S.start && k < S.start) return '';
    var t = dayTotals(k);
    if (!t.total) return '';
    if (t.done >= t.total) return 's-good';
    if (t.done > 0) return 's-warn';
    return k === today() ? '' : 's-bad';
  }
  function streak() {
    var cur = today(), n = 0;
    if (dayTotals(cur).done === 0) cur = shift(cur, -1);
    while (dayTotals(cur).done > 0) { n++; cur = shift(cur, -1); }
    return n;
  }

  /* ------------------------------------------------------- revisión semanal */
  // La semana empieza el día que la persona haya elegido en su perfil.
  function weekStart(k) {
    var ws = S.profile && S.profile.weekStart === 0 ? 0 : 1;
    var off = (parseK(k).getDay() - ws + 7) % 7;
    return shift(k, -off);
  }
  function weekDays(start) {
    var out = []; for (var i = 0; i < 7; i++) out.push(shift(start, i));
    return out;
  }
  function weekLabel(start) {
    var end = shift(start, 6);
    var a = parseK(start), b = parseK(end);
    var sameMonth = a.getMonth() === b.getMonth();
    try {
      return a.toLocaleDateString('es-ES', { day: 'numeric', month: sameMonth ? undefined : 'short' }) +
        ' – ' + b.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (e) { return start + ' – ' + end; }
  }
  // Lo que de verdad pasó esa semana, sin pedirle nada a la persona.
  function weekStats(start) {
    var days = weekDays(start), t = today();
    var full = 0, partial = 0, marks = 0, notes = 0, elapsed = 0;
    days.forEach(function (d) {
      if (diff(t, d) > 0) return;          // los días que aún no han llegado no cuentan
      elapsed++;
      var x = dayTotals(d);
      marks += x.done;
      if (x.total && x.done >= x.total) full++;
      else if (x.done > 0) partial++;
      if ((S.notes[d] || '').trim()) notes++;
    });
    return { full: full, partial: partial, marks: marks, notes: notes, elapsed: elapsed, days: days };
  }
  function review(start) {
    if (!S.reviews[start]) S.reviews[start] = { won: '', adjust: '', focus: '' };
    return S.reviews[start];
  }

  /* ---------------------------------------------------------- reality check */
  var RC_AREAS = [
    {
      id: 'c1', title: 'Carrera o Estudios', emoji: '🎓',
      lead: 'Mira dónde estás hoy',
      sliders: [{ k: 'c1', q: '¿Qué tan satisfecho estás?' }],
      notes: ['¿Qué obstáculos enfrentas?', '¿Te sientes estancado o avanzando?']
    },
    {
      id: 'c2', title: 'Relaciones Personales', emoji: '🤝',
      lead: 'Registra tu estado actual',
      sliders: [{ k: 'c2', q: '¿Cómo te sientes con tus amigos?' }, { k: 'c2b', q: '¿Cómo te sientes con tu familia?' }],
      notes: ['¿Cómo describirías la calidad de tus relaciones ahora mismo?', '¿Quieres conocer gente, reforzar amistades o mejorar con tu familia?', '¿Te sientes valorado y respetado en tu círculo?']
    },
    {
      id: 'c3', title: 'Relaciones Románticas', emoji: '❤️',
      lead: 'Conoce en qué momento de tu vida estás',
      sliders: [{ k: 'c3', q: '¿Cómo te sientes en tu situación romántica actual?' }],
      notes: ['¿Hay alguien con quien quisieras conectar más a fondo?', '¿Cómo podrías mejorar la relación con tu pareja?']
    },
    {
      id: 'c4', title: 'Finanzas', emoji: '💰',
      lead: 'Mira dónde estás hoy',
      three: { k: 'c4', q: '¿Te sientes cómodo con tu situación financiera?' },
      notes: ['¿Quieres ahorrar más, invertir o buscar un trabajo a tiempo parcial?', '¿Qué mejorarías de tu gestión financiera?']
    },
    {
      id: 'c5', title: 'Salud Física y Mental', emoji: '🧘',
      lead: 'Registra tu estado actual',
      sliders: [{ k: 'c5', q: '¿Cómo calificarías tu salud física?' }, { k: 'c6', q: '¿Cómo calificarías tu salud mental?' }],
      notes: ['¿Con qué frecuencia aparecen el estrés, la ansiedad o el agotamiento?', '¿Estás haciendo ejercicio, descansando y comiendo bien?']
    },
    {
      id: 'c7', title: 'Personalidad y Crecimiento', emoji: '🌱',
      lead: 'Conoce en qué momento de tu vida estás',
      adjectives: true,
      sliders: [{ k: 'c7', q: '¿Cómo te ves a ti mismo hoy?' }],
      notes: ['¿Qué aspectos de tu personalidad te gustan y cuáles cambiarías?', '¿Sientes que estás creciendo, o te falta algo para avanzar?']
    },
    {
      id: 'c8', title: 'Otros: ocio e intereses', emoji: '🎨',
      lead: 'Mira dónde estás hoy',
      sliders: [{ k: 'c8', q: '¿Dedicas suficiente tiempo a lo que te gusta?' }],
      notes: ['¿Qué cosas nuevas te gustaría probar o aprender?', '¿Cuáles son tus pasatiempos más emocionantes?']
    }
  ];

  function newDraft() {
    return { id: uid(), date: today(), scores: {}, notes: {}, adjectives: '' };
  }
  function lastRC() { return S.rc.length ? S.rc[S.rc.length - 1] : null; }
  // Puntuación media 1-10 de un Reality Check
  function rcAvg(r) {
    if (!r) return 0;
    var ks = Object.keys(r.scores || {}), s = 0, n = 0;
    ks.forEach(function (k) { s += +r.scores[k]; n++; });
    return n ? Math.round(s / n * 10) / 10 : 0;
  }
  // Valor por categoría (promedia c2/c2b en c2)
  function rcCat(r, cid) {
    if (!r || !r.scores) return null;
    if (cid === 'c2') {
      var a = r.scores.c2, b = r.scores.c2b;
      if (a == null && b == null) return null;
      if (a == null) return +b; if (b == null) return +a;
      return (+a + +b) / 2;
    }
    return r.scores[cid] == null ? null : +r.scores[cid];
  }

  /* ---------------------------------------------------------------- avisos */
  var toastT = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* ----------------------------------------------------------------- tema */
  function applyTheme() {
    var t = (S.prefs && S.prefs.theme) || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  /* -------------------------------------------------------------- gráficos */
  // Anillo de progreso reutilizable
  function ring(pct, size, color, inner) {
    var r = size / 2 - 7, C = 2 * Math.PI * r;
    var off = C - C * clamp(pct / 100, 0, 1);
    return '<div class="ringwrap" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="color-mix(in srgb, var(--ink) 11%, transparent)" stroke-width="9"></circle>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="' + color + '" stroke-width="9" ' +
      'stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"></circle></svg>' +
      '<div class="ringmid">' + inner + '</div></div>';
  }

  // Radar de 8 ejes con los valores del Reality Check
  function radar(r) {
    var size = 260, c = size / 2, R = c - 42, n = S.cats.length;
    function pt(i, v) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n, rr = R * clamp(v / 10, 0, 1);
      return [c + rr * Math.cos(a), c + rr * Math.sin(a)];
    }
    var h = '<svg class="radar" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="Resumen por área de vida">';
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var pts = [];
      for (var i = 0; i < n; i++) pts.push(pt(i, 10 * f).map(function (x) { return x.toFixed(1); }).join(','));
      h += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="var(--line)" stroke-width="1"></polygon>';
    });
    for (var i = 0; i < n; i++) {
      var e = pt(i, 10);
      h += '<line x1="' + c + '" y1="' + c + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" stroke="var(--line)" stroke-width="1"></line>';
    }
    // Un eje sin medir se dibuja a la altura de la media, no en cero:
    // en cero parecería que esa área está fatal, y lo cierto es que no se preguntó.
    var vals = [];
    for (var w = 0; w < n; w++) { var vw = rcCat(r, S.cats[w].id); if (vw != null) vals.push(vw); }
    var mean = vals.length ? vals.reduce(function (a2, b2) { return a2 + b2; }, 0) / vals.length : 0;
    var poly = [], any = vals.length > 0;
    for (var j = 0; j < n; j++) {
      var v = rcCat(r, S.cats[j].id);
      poly.push(pt(j, v == null ? mean : v).map(function (x) { return x.toFixed(1); }).join(','));
    }
    if (any) {
      h += '<polygon points="' + poly.join(' ') + '" fill="var(--accent)" fill-opacity=".22" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"></polygon>';
      for (var m = 0; m < n; m++) {
        var vv = rcCat(r, S.cats[m].id);
        if (vv == null) continue;
        var p = pt(m, vv);
        h += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" fill="' + S.cats[m].color + '" stroke="var(--surface)" stroke-width="1.5"></circle>';
      }
    }
    for (var q = 0; q < n; q++) {
      var lp = pt(q, 12.4);
      h += '<text x="' + lp[0].toFixed(1) + '" y="' + lp[1].toFixed(1) + '" font-size="15" text-anchor="middle" dominant-baseline="middle">' + S.cats[q].emoji + '</text>';
    }
    return h + '</svg>';
  }

  return {
    KEY: KEY, S: S, ui: ui, RC_AREAS: RC_AREAS,
    curKey: function () { return curKey; }, findKey: findKey, newUserKey: newUserKey, switchUser: switchUser,
    uid: uid, esc: esc, clamp: clamp, byId: byId, plural: plural,
    dkey: dkey, parseK: parseK, today: today, shift: shift, diff: diff,
    fmt: fmt, fmtLong: fmtLong, cap: cap, inDays: inDays,
    defaults: defaults, baseCats: baseCats, load: load, save: save, saveNow: saveNow,
    cat: cat, catName: catName, catEmoji: catEmoji, catColor: catColor, catOptions: catOptions,
    due: due, goalPct: goalPct, goalState: goalState, allGoals: allGoals, findGoal: findGoal, upcoming: upcoming,
    rlog: rlog, dayTotals: dayTotals, dayStatus: dayStatus, streak: streak,
    newDraft: newDraft, lastRC: lastRC, rcAvg: rcAvg, rcCat: rcCat,
    weekStart: weekStart, weekDays: weekDays, weekLabel: weekLabel, weekStats: weekStats, review: review,
    toast: toast, applyTheme: applyTheme, ring: ring, radar: radar
  };
})();
/* ==========================================================================
   Pantallas de entrada: inicio, sesión, registro, Reality Check,
   Mi Yo del Futuro y la comparación Hoy vs 5 años.
   ========================================================================== */
var V = {};

(function () {
  'use strict';
  var S = App.S, ui = App.ui, esc = App.esc;

  /* Reduce una imagen antes de guardarla: el navegador tiene poco espacio. */
  function readImage(file, max, cb) {
    // Tipo, extensión y peso se comprueban antes de leer un solo byte.
    var bad = Sec.imageProblem(file);
    if (bad) { App.toast(bad); return; }
    App.toast('Procesando la imagen…');
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var bad2 = Sec.pixelProblem(img.width, img.height);
        if (bad2) { App.toast(bad2); return; }
        // Se vuelve a codificar a JPEG: eso descarta EXIF, capas raras y
        // cualquier cosa que no sea realmente una imagen.
        var w = img.width, h = img.height, s = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * s); cv.height = Math.round(h * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        try { cb(cv.toDataURL('image/jpeg', 0.72)); }
        catch (e) { App.toast('No se pudo procesar la imagen.'); }
      };
      img.onerror = function () { App.toast('No se pudo leer la imagen.'); };
      img.src = fr.result;
    };
    fr.onerror = function () { App.toast('No se pudo leer el archivo.'); };
    fr.readAsDataURL(file);
  }
  V.readImage = readImage;

  /* Marca propia de la app: una flor de cuatro pétalos en el violeta del logo. */
  function mark(size) {
    var s = size || 104;
    return '<svg class="mark" width="' + s + '" height="' + s + '" viewBox="0 0 120 120" role="img" aria-label="Brújula de Vida">' +
      '<defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#6255d8"/><stop offset="1" stop-color="#3a30a8"/>' +
      '</linearGradient></defs>' +
      '<g fill="url(#bg1)">' +
      '<ellipse cx="60" cy="36" rx="16" ry="30" opacity=".92"/>' +
      '<ellipse cx="60" cy="84" rx="16" ry="30" opacity=".72"/>' +
      '<ellipse cx="36" cy="60" rx="30" ry="16" opacity=".82"/>' +
      '<ellipse cx="84" cy="60" rx="30" ry="16" opacity=".62"/>' +
      '</g><circle cx="60" cy="60" r="9" fill="var(--sand)"/><circle cx="60" cy="60" r="4" fill="url(#bg1)"/></svg>';
  }
  V.mark = mark;

  /* ------------------------------------------------------ pantalla de inicio */
  V.splash = function () {
    return '<div class="scroll nonav" style="display:flex;flex-direction:column;justify-content:center;min-height:100dvh;gap:26px;padding-top:40px">' +
      '<div class="stack" style="gap:18px">' + mark() +
      '<div class="brand">Brújula de Vida</div>' +
      '<p class="hero-quote" style="text-align:center;color:var(--ink-2);font-size:1.05rem">“Organiza tus sueños y metas.”</p>' +
      '</div>' +
      '<div class="stack sm" style="margin-top:18px">' +
      '<button class="btn accent block" data-a="guest" style="padding:15px 20px;font-size:16px">Empezar</button>' +
      '<button class="btn ghost block" data-a="go" data-s="login">Ya tengo una cuenta</button>' +
      '</div>' +
      '<p class="tiny" style="text-align:center;max-width:34ch;margin:0 auto">Sin registro y sin correo. Todo lo que escribas se guarda solo en este dispositivo; si luego quieres una contraseña, se la pones.</p>' +
      '</div>';
  };

  /* ----------------------------------------------------------- iniciar sesión */
  V.login = function () {
    var t = ui.showPw ? 'text' : 'password';
    return '<div class="appbar"><div class="appbar-row">' +
      '<button class="iconbtn" data-a="go" data-s="splash" aria-label="Volver">' + I('left') + '</button>' +
      '<h1>Iniciar sesión</h1></div></div>' +
      '<div class="scroll nonav"><form class="stack" id="loginForm" novalidate>' +
      '<label class="field"><span>Correo electrónico</span>' +
      '<input class="inp" type="email" id="liMail" autocomplete="email" placeholder="tu@correo.com"></label>' +
      '<label class="field"><span>Contraseña</span><span class="pwwrap">' +
      '<input class="inp" type="' + t + '" id="liPass" autocomplete="current-password" placeholder="Tu contraseña">' +
      '<button type="button" class="pweye" data-a="togglepw" aria-label="Ver u ocultar contraseña">' + I(ui.showPw ? 'eyeOff' : 'eye', 19) + '</button>' +
      '</span></label>' +
      '<label class="checkrow"><input type="checkbox" id="liKeep" checked>Mantener la sesión iniciada</label>' +
      '<p id="liErr" class="tiny" style="color:var(--bad);min-height:16px"></p>' +
      '<button class="btn block" type="submit" data-a="dologin">Iniciar sesión</button>' +
      '<button class="btn soft block" type="button" data-a="google">Continuar con Google</button>' +
      '<button class="btn ghost block" type="button" data-a="forgot">¿Olvidaste tu contraseña?</button>' +
      '<button class="btn soft block" type="button" data-a="go" data-s="register">Crear una cuenta nueva</button>' +
      '<p class="notice">La cuenta vive solo en este navegador: no hay servidor que verifique nada ni correo de recuperación. Guarda tu respaldo desde Perfil.</p>' +
      '</form></div>';
  };

  /* ---------------------------------------------------------------- registro */
  V.register = function () {
    if (ui.regStep === 2) return V.profileStep();
    var t = ui.showPw ? 'text' : 'password';
    return '<div class="appbar"><div class="appbar-row">' +
      '<button class="iconbtn" data-a="go" data-s="splash" aria-label="Volver">' + I('left') + '</button>' +
      '<h1>Crear cuenta</h1></div>' +
      '<div class="stepper"><div class="track"><span style="width:50%"></span></div><span class="n">Paso 1 de 2</span></div></div>' +
      '<div class="scroll nonav"><form class="stack" id="regForm" novalidate>' +
      '<label class="field"><span>Nombre</span>' +
      '<input class="inp" id="rgName" autocomplete="given-name" placeholder="Solo tu nombre"></label>' +
      '<label class="field"><span>Correo electrónico</span>' +
      '<input class="inp" type="email" id="rgMail" autocomplete="email" placeholder="tu@correo.com"></label>' +
      '<label class="field"><span>Contraseña</span><span class="pwwrap">' +
      '<input class="inp" type="' + t + '" id="rgPass" autocomplete="new-password" placeholder="Mínimo 8 caracteres">' +
      '<button type="button" class="pweye" data-a="togglepw" aria-label="Ver u ocultar contraseña">' + I(ui.showPw ? 'eyeOff' : 'eye', 19) + '</button>' +
      '</span></label>' +
      '<label class="field"><span>Confirmar contraseña</span>' +
      '<input class="inp" type="' + t + '" id="rgPass2" autocomplete="new-password" placeholder="Repite la contraseña"></label>' +
      '<label class="checkrow"><input type="checkbox" id="rgTerms">' +
      '<span>Acepto los <a href="#" data-a="legal" data-doc="terminos">Términos y Condiciones</a> y la <a href="#" data-a="legal" data-doc="privacidad">Política de Privacidad</a>.</span></label>' +
      '<p id="rgErr" class="tiny" style="color:var(--bad);min-height:16px"></p>' +
      '<button class="btn block" type="submit" data-a="doregister">Crear cuenta</button>' +
      '<button class="btn soft block" type="button" data-a="google">Continuar con Google</button>' +
      '</form></div>';
  };

  V.profileStep = function () {
    var p = S.profile;
    var av = p.photo
      ? '<img class="avatar" src="' + esc(p.photo) + '" alt="Tu foto">'
      : '<div class="avatar">' + esc((S.account && S.account.name ? S.account.name : '·').charAt(0).toUpperCase()) + '</div>';
    return '<div class="appbar"><div class="appbar-row">' +
      '<h1>Tu perfil</h1>' +
      '<button class="iconbtn" data-a="enterApp" aria-label="Saltar este paso">' + I('x') + '</button></div>' +
      '<div class="stepper"><div class="track"><span style="width:100%"></span></div><span class="n">Paso 2 de 2</span></div></div>' +
      '<div class="scroll nonav"><div class="stack">' +
      '<p class="muted">Nada de esto bloquea el acceso. Puedes cambiarlo cuando quieras desde Perfil.</p>' +
      '<div class="row" style="gap:16px">' + av +
      '<div class="stack sm grow"><span class="label">Foto de perfil</span>' +
      '<label class="btn soft sm" style="align-self:flex-start">Elegir imagen' +
      '<input type="file" accept="image/*" id="pfPhoto" style="display:none"></label>' +
      (p.photo ? '<button class="btn ghost xs" style="align-self:flex-start" data-a="rmPhoto">Quitar foto</button>' : '') +
      '</div></div>' +
      '<label class="field"><span>Idioma</span><select class="sel" data-p="lang">' +
      '<option value="es"' + (p.lang === 'es' ? ' selected' : '') + '>Español</option>' +
      '<option value="en"' + (p.lang === 'en' ? ' selected' : '') + '>English</option>' +
      '<option value="pt"' + (p.lang === 'pt' ? ' selected' : '') + '>Português</option>' +
      '</select></label>' +
      '<label class="field"><span>Zona horaria</span>' +
      '<input class="inp" data-p="tz" value="' + esc(p.tz || guessTz()) + '"></label>' +
      '<div class="field"><span>Primer día de la semana</span><div class="seg3" style="grid-template-columns:1fr 1fr">' +
      '<button type="button" data-a="week" data-v="1" aria-pressed="' + (p.weekStart === 1) + '">Lunes</button>' +
      '<button type="button" data-a="week" data-v="0" aria-pressed="' + (p.weekStart === 0) + '">Domingo</button>' +
      '</div></div>' +
      '<button class="btn block" data-a="enterApp">Continuar</button>' +
      '</div></div>';
  };

  function guessTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  }
  V.guessTz = guessTz;

  /* ------------------------------------------------------------ reality check */
  V.rc = function () {
    var a = App.RC_AREAS[ui.rcStep], d = S.rcDraft || (S.rcDraft = App.newDraft());
    var n = App.RC_AREAS.length, pct = (ui.rcStep + 1) / n * 100;

    var h = '<div class="appbar"><div class="appbar-row">' +
      (ui.rcStep > 0 ? '<button class="iconbtn" data-a="rcBack" aria-label="Anterior">' + I('left') + '</button>' : '<span style="width:38px"></span>') +
      '<h1 style="text-align:center;font-size:1.3rem">Chequeo de vida</h1>' +
      '<button class="iconbtn" data-a="rcExit" aria-label="Salir">' + I('x') + '</button></div>' +
      '<div class="stepper"><div class="track"><span style="width:' + pct + '%"></span></div>' +
      '<span class="n">' + (ui.rcStep + 1) + ' de ' + n + '</span></div></div>';

    h += '<div class="scroll nonav"><div class="stack lg">';
    h += '<p class="hero-quote" style="text-align:center;color:var(--ink-2)">“' + esc(a.lead) + '”</p>';
    h += '<div class="card"><div class="stack">' +
      '<div class="sect-title"><span style="font-size:1.3em">' + a.emoji + '</span>' + esc(a.title) + '</div>';

    (a.sliders || []).forEach(function (s) {
      var v = d.scores[s.k] == null ? 5 : +d.scores[s.k];
      h += '<div class="stack sm">' +
        '<span style="font-size:13.5px;font-weight:600;color:var(--ink-2)">' + esc(s.q) + '</span>' +
        '<div class="row" style="gap:16px"><span class="scaleval" data-sv="' + s.k + '">' + v + '</span>' +
        '<input class="slider grow" type="range" min="1" max="10" step="1" value="' + v + '" data-rc="' + s.k + '" ' +
        'style="--v:' + ((v - 1) / 9 * 100) + '%" aria-label="' + esc(s.q) + '"></div>' +
        '<div class="scalerow"><span>1 · muy insatisfecho</span><span>10 · pleno</span></div></div>';
    });

    if (a.three) {
      var cur = d.scores[a.three.k];
      var opts = [['2', 'Muy mal', '😖'], ['5.5', 'Neutral', '😐'], ['9', 'Muy bien', '😄']];
      h += '<div class="stack sm"><span style="font-size:13.5px;font-weight:600;color:var(--ink-2)">' + esc(a.three.q) + '</span><div class="seg3">';
      opts.forEach(function (o) {
        h += '<button type="button" data-rc3="' + a.three.k + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === o[0]) + '">' +
          '<span class="e">' + o[2] + '</span>' + o[1] + '</button>';
      });
      h += '</div></div>';
    }

    if (a.adjectives) {
      h += '<label class="field"><span>Escribe 5 adjetivos que te describan hoy</span>' +
        '<input class="inp" data-rcadj value="' + esc(d.adjectives || '') + '" placeholder="curiosa, dispersa, tenaz, impaciente, leal"></label>';
    }

    var open = ui.rcOpen ? 'true' : 'false';
    h += '<div class="acc" data-open="' + open + '"><button type="button" data-a="rcAcc">' +
      '<span class="caret">' + I('right', 17) + '</span>¿Quieres reflexionar un poco más?</button><div>';
    a.notes.forEach(function (q, i) {
      var k = a.id + '_' + i;
      h += '<label class="field"><span>' + esc(q) + '</span>' +
        '<textarea class="ta" data-rcnote="' + k + '" placeholder="Escribe lo que se te ocurra…">' + esc(d.notes[k] || '') + '</textarea></label>';
    });
    h += '</div></div>';

    h += '</div></div>';
    h += '<button class="btn block" data-a="rcNext">' + (ui.rcStep === n - 1 ? 'Ver mi resumen' : 'Siguiente →') + '</button>';
    h += '<p class="tiny" style="text-align:center">Puedes salir cuando quieras: lo que respondas se guarda solo.</p>';
    h += '</div></div>';
    return h;
  };

  /* ------------------------------------------------------- resumen del check */
  V.rcsum = function (fromHistory) {
    var r = fromHistory || App.lastRC();
    if (!r) return V.rc();
    var avg = App.rcAvg(r);
    var rows = S.cats.map(function (c) {
      var v = App.rcCat(r, c.id);
      return { c: c, v: v };
    });
    var weak = rows.filter(function (x) { return x.v != null; }).sort(function (a, b) { return a.v - b.v; }).slice(0, 2);

    var h = '<div class="appbar"><div class="appbar-row">' +
      '<h1>Tu foto de hoy</h1>' +
      '<button class="iconbtn" data-a="tab" data-t="hoy" aria-label="Cerrar">' + I('x') + '</button>' +
      '</div><span class="sub">Chequeo del ' + esc(App.fmt(r.date)) + '</span></div>';

    h += '<div class="scroll nonav"><div class="stack lg">';
    h += '<div class="card"><div class="stack">' + App.radar(r) +
      '<div class="row" style="justify-content:center;gap:10px">' +
      '<span class="pill accent num">Media ' + avg + '/10</span>' +
      '<span class="pill num">' + App.plural(rows.filter(function (x) { return x.v != null; }).length, 'área medida', 'áreas medidas') + '</span>' +
      '</div></div></div>';

    h += '<div class="card"><div class="stack"><div class="sect-title">' + I('chart') + 'Área por área</div><div class="barlist">';
    rows.forEach(function (x) {
      var v = x.v == null ? 0 : x.v;
      h += '<div class="barrow"><span class="bl">' + x.c.emoji + ' ' + esc(x.c.name.split(' (')[0]) + '</span>' +
        '<span class="bar grow"><span style="width:' + (v * 10) + '%;background:' + x.c.color + '"></span></span>' +
        '<span class="bv num" style="color:' + (x.v == null ? 'var(--ink-2)' : 'var(--ink)') + '">' + (x.v == null ? '—' : (Math.round(v * 10) / 10)) + '</span></div>';
    });
    h += '</div></div></div>';

    if (weak.length) {
      h += '<div class="card sunk"><div class="stack sm"><div class="label">Lo que más pide atención</div>' +
        '<p style="font-size:14px;line-height:1.55">Hoy tus dos áreas más bajas son <strong>' +
        weak.map(function (w) { return esc(w.c.name.split(' (')[0]); }).join('</strong> y <strong>') +
        '</strong>. No hace falta arreglarlo todo: empieza por una.</p></div></div>';
    }

    if (S.rc.length > 1 && !fromHistory) {
      var prev = S.rc[S.rc.length - 2], d = Math.round((avg - App.rcAvg(prev)) * 10) / 10;
      h += '<div class="card flat"><div class="spread"><span class="muted">Frente a tu chequeo anterior (' + esc(App.fmt(prev.date)) + ')</span>' +
        '<span class="pill ' + (d > 0 ? 'good' : d < 0 ? 'bad' : '') + ' num">' + (d > 0 ? I('up', 13) + '+' : d < 0 ? I('down', 13) : '') + (d === 0 ? '0' : d) + '</span></div></div>';
    }

    var hasFuture = false;
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) hasFuture = true; });
    if (!hasFuture) {
      h += '<button class="btn accent block" data-a="go" data-s="future">Ahora di a dónde quieres llegar' + I('arrowRight', 19) + '</button>';
      h += '<p class="tiny" style="text-align:center">O cierra y sigue con tu día: el chequeo ya está guardado.</p>';
    } else {
      h += '<button class="btn block" data-a="tab" data-t="hoy">Volver a Hoy</button>';
    }
    h += '</div></div>';
    return h;
  };

  /* -------------------------------------------------------- mi yo del futuro */
  V.future = function () {
    var done = 0;
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) done++; });

    var h = '<div class="appbar"><div class="appbar-row">' +
      '<h1>Mi Yo del Futuro</h1>' +
      '<button class="iconbtn" data-a="tab" data-t="vision" aria-label="Cerrar">' + I('x') + '</button></div>' +
      '<span class="sub">Elige las áreas que quieres construir para la vida que imaginaste.</span></div>';

    h += '<div class="scroll nonav"><div class="stack">';
    S.cats.forEach(function (c) {
      var f = S.future[c.id] || {};
      h += '<button class="goal" data-a="openFuture" data-c="' + esc(c.id) + '">' +
        '<span class="thumb" style="background:' + c.color + '22">' + c.emoji + '</span>' +
        '<span class="grow"><span class="gname" style="display:block">' + esc(c.name) + '</span>' +
        '<span class="muted" style="display:block;margin-top:3px;font-size:12.5px">' +
        (f.goal ? '“' + esc(f.goal) + '”' : 'Cómo quiero sentirme y vivir aquí') + '</span></span>' +
        (f.goal ? '<span class="pill good">' + I('check', 13) + '</span>' : '<span class="tiny">' + I('plus', 16) + '</span>') +
        '</button>';
    });
    h += '<p class="tiny" style="text-align:center">' + done + ' de ' + S.cats.length + ' áreas definidas. Con una ya puedes seguir.</p>';
    h += '<button class="btn accent block" data-a="go" data-s="vs">Ver Hoy frente a En 5 años' + I('arrowRight', 19) + '</button>';
    h += '<button class="btn ghost block" data-a="saveFutureOnly">Guardar y salir</button>';
    h += '</div></div>';
    return h;
  };

  /* ------------------------------------------------- hoy vs dentro de 5 años */
  V.vs = function () {
    var r = App.lastRC();
    var words = [];
    if (r) {
      if (r.adjectives) words = r.adjectives.split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 5);
      if (!words.length) {
        S.cats.forEach(function (c) {
          var v = App.rcCat(r, c.id);
          if (v != null && v <= 5) words.push(c.name.split(' (')[0].toLowerCase());
        });
        words = words.slice(0, 4);
      }
    }
    var fut = [];
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) fut.push({ c: c, g: S.future[c.id].goal }); });

    var h = '<div class="appbar"><div class="appbar-row"><h1>Tu transformación</h1></div>' +
      '<span class="sub">Aquí estás hoy. Aquí quieres estar en 5 años.</span></div>';

    h += '<div class="scroll nonav"><div class="stack lg">';
    h += '<div class="vs">' +
      '<div><div class="vt">Hoy</div>' +
      (r ? App.ring(App.rcAvg(r) * 10, 92, 'var(--accent)', '<b>' + App.rcAvg(r) + '</b><small>de 10</small>') : '<p class="tiny">Sin datos</p>') +
      '<div class="chips" style="margin-top:12px">' +
      (words.length ? words.map(function (w) { return '<span class="pill">' + esc(w) + '</span>'; }).join('') : '<span class="tiny">Sin palabras clave</span>') +
      '</div></div>' +
      '<div><div class="vt">En 5 años</div>' +
      (fut.length
        ? '<div class="stack sm">' + fut.slice(0, 4).map(function (f) {
            return '<div class="row" style="gap:7px;align-items:flex-start"><span>' + f.c.emoji + '</span>' +
              '<span style="font-size:12.5px;line-height:1.4">' + esc(f.g) + '</span></div>';
          }).join('') + (fut.length > 4 ? '<span class="tiny">y ' + (fut.length - 4) + ' más</span>' : '') + '</div>'
        : '<p class="tiny">Aún no definiste tus metas de 5 años.</p>') +
      '</div></div>';

    h += '<div class="card"><div class="stack sm">' +
      '<div class="sect-title">' + I('target') + '¿Qué paso pequeño podrías dar esta semana?</div>' +
      '<p class="muted">Lo convertimos en tu primera meta de corto plazo, con fecha para dentro de 7 días.</p>' +
      '<input class="inp" id="firstStep" value="' + esc(S.firstStep || '') + '" placeholder="Ej. Apuntarme al gimnasio y ir dos veces">' +
      '</div></div>';

    h += '<button class="btn accent block" data-a="finishOnboarding">Guardar y volver a Hoy' + I('arrowRight', 19) + '</button>';
    h += '</div></div>';
    return h;
  };
})();
/* ==========================================================================
   Pestaña METAS — calendario con rutinas y notas, y las metas de corto
   y largo plazo con su buscador, filtros y lista.
   ========================================================================== */
(function () {
  'use strict';
  var S = App.S, ui = App.ui, esc = App.esc;

  var DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var DOW_SUN = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  function profileBtn() {
    return '<button class="iconbtn solid" data-a="tab" data-t="perfil" aria-label="Perfil">' +
      (S.profile.photo ? '<img src="' + esc(S.profile.photo) + '" alt="">' : I('user', 19)) + '</button>';
  }

  /* ------------------------------------------------------------- calendario */
  function calendar() {
    var ym = ui.calMonth, y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    var first = new Date(y, m - 1, 1), t = App.today();
    var ws = S.profile.weekStart === 0 ? 0 : 1;
    var offset = (first.getDay() - ws + 7) % 7;
    var total = new Date(y, m, 0).getDate();
    var label = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    var h = '<div class="sect">' +
      '<div class="sect-head">' +
      '<span class="sect-title" style="font-size:1.05rem">' + esc(App.cap(label)) + '</span>' +
      '<span class="row" style="gap:0">' +
      '<button class="iconbtn" data-a="cal" data-d="-1" aria-label="Mes anterior">' + I('left') + '</button>' +
      '<button class="iconbtn" data-a="calToday" aria-label="Ir a hoy">' + I('pin', 18) + '</button>' +
      '<button class="iconbtn" data-a="cal" data-d="1" aria-label="Mes siguiente">' + I('right') + '</button></span></div>';

    h += '<div class="cal">';
    (ws === 0 ? DOW_SUN : DOW).forEach(function (d) { h += '<span class="dow">' + d + '</span>'; });
    for (var i = 0; i < offset; i++) h += '<span class="pad"></span>';
    for (var d2 = 1; d2 <= total; d2++) {
      var k = y + '-' + String(m).padStart(2, '0') + '-' + String(d2).padStart(2, '0');
      var st = App.dayStatus(k), ev = (S.events[k] || []).length;
      var cls = [st, k === t ? 'today' : '', k === ui.selDay ? 'sel' : ''].filter(Boolean).join(' ');
      h += '<button data-a="pickDay" data-day="' + k + '" class="' + cls + '" aria-label="' + esc(App.fmt(k)) + '">' + d2 +
        (ev ? '<span class="ev"></span>' : '') + '</button>';
    }
    h += '</div>';

    h += '<div class="callegend">' +
      '<span><i style="background:var(--good)"></i>Día completo</span>' +
      '<span><i style="background:var(--warn)"></i>A medias</span>' +
      '<span><i style="background:var(--bad)"></i>Sin avance</span>' +
      '<span><i style="background:var(--accent)"></i>Con tareas</span></div>';
    return h + '</div>';
  }

  // Un solo panel para el día que se toca en el calendario: tareas, rutinas
  // y nota. Si el día elegido es hoy, se remite a la pestaña Hoy en vez de
  // repetir aquí lo mismo.
  function dayPanel() {
    var k = ui.selDay, evs = S.events[k] || [], tot = App.dayTotals(k);
    var isToday = k === App.today();
    var note = S.notes[k] || '';

    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' +
      esc(App.cap(App.fmtLong(k))) + '</span>' +
      '<span class="pill num ' + (tot.total && tot.done >= tot.total ? 'good' : tot.done ? 'warn' : '') + '">' +
      tot.done + ' de ' + tot.total + '</span></div>';

    if (isToday) {
      h += '<button class="btn soft block" data-a="tab" data-t="hoy" style="justify-content:flex-start">' +
        I('sunrise', 18) + 'Marcar la rutina de hoy</button>';
    } else {
      h += '<div class="list">';
      ['day', 'night'].forEach(function (kind) {
        var log = S.rlog[k] || { day: [], night: [] }, marks = log[kind] || [];
        (S.routines[kind] || []).forEach(function (it) {
          var on = marks.indexOf(it.id) >= 0;
          h += '<div class="listrow" style="padding:10px 14px">' +
            '<button class="chk" role="checkbox" aria-checked="' + on + '" data-a="rtoggle" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-label="' + esc(it.name) + '">' + I('check', 15) + '</button>' +
            '<span class="grow"' + (on ? ' style="color:var(--ink-2);text-decoration:line-through"' : '') + '>' + esc(it.name) + '</span>' +
            I(kind === 'day' ? 'sunrise' : 'moon', 16) + '</div>';
        });
      });
      h += '</div>';
    }

    if (evs.length) {
      h += '<div class="list">';
      evs.forEach(function (e) {
        h += '<div class="listrow" style="padding:10px 10px 10px 14px">' +
          '<span class="catdot" style="background:var(--accent)"></span>' +
          '<span class="grow" style="font-size:13.5px">' + esc(e.title) + '</span>' +
          '<button class="delbtn" data-a="evdel" data-day="' + k + '" data-id="' + esc(e.id) + '" aria-label="Quitar tarea">' + I('trash', 17) + '</button></div>';
      });
      h += '</div>';
    }

    if (note || ui.noteOpen) {
      h += '<textarea class="ta" data-f="note" placeholder="Nota de este día">' + esc(note) + '</textarea>';
    } else {
      h += '<button class="btn ghost sm" data-a="openNote" style="align-self:flex-start">' +
        I('pencil', 15) + (isToday ? 'Escribir la nota de hoy' : 'Escribir una nota de este día') + '</button>';
    }
    return h + '</div>';
  }

  /* ------------------------------------------------------------ fila de meta */
  function goalCard(g, kind) {
    var pct = App.goalPct(g), d = App.due(g.due, g.done), c = App.cat(g.cat);
    var steps = (g.steps || []).length;
    return '<div class="goal' + (g.done ? ' done' : '') + '">' +
      '<button class="chk" role="checkbox" aria-checked="' + !!g.done + '" data-a="gdone" data-k="' + kind + '" data-id="' + esc(g.id) + '" aria-label="Marcar como completada">' + I('check', 15) + '</button>' +
      '<button class="row grow top" style="background:none;border:0;padding:0;text-align:left;gap:12px" data-a="openGoal" data-k="' + kind + '" data-id="' + esc(g.id) + '">' +
      '<span class="thumb" style="background:' + (c ? esc(c.color) + '1f' : 'color-mix(in srgb,var(--ink) 6%,transparent)') + '">' + (c ? esc(c.emoji) : I('target', 20)) + '</span>' +
      '<span class="grow"><span class="gname">' + esc(g.name || 'Meta sin nombre') + '</span>' +
      '<span class="gmeta">' +
      (g.due ? '<span class="pill num">' + I('calendar', 13) + esc(App.fmt(g.due)) + '</span>' : '') +
      '<span class="pill ' + d.cls + '">' + (d.cls === 'bad' ? I('flame', 13) : '') + esc(d.txt) + '</span>' +
      (g.priority && g.priority !== 'Media' ? '<span class="pill">' + esc(g.priority) + '</span>' : '') +
      (steps ? '<span class="pill num">' + App.plural(steps, 'paso', 'pasos') + '</span>' : '') +
      '</span>' +
      '<span class="bar thin" style="margin-top:9px"><span style="width:' + pct + '%;background:var(--' +
      (App.goalState(g) === 'good' ? 'good' : App.goalState(g) === 'bad' ? 'bad' : 'warn') + ')"></span></span>' +
      '</span></button>' +
      '<button class="delbtn" data-a="gdel" data-k="' + kind + '" data-id="' + esc(g.id) + '" aria-label="Eliminar meta" title="Eliminar meta">' + I('trash', 17) + '</button>' +
      '</div>';
  }

  function matches(g) {
    var q = (ui.goalQ || '').trim().toLowerCase();
    if (q && (g.name || '').toLowerCase().indexOf(q) < 0 && (g.motivation || '').toLowerCase().indexOf(q) < 0) return false;
    var f = ui.goalFilter;
    if (f === 'late') return !g.done && g.due && App.diff(App.today(), g.due) < 0;
    if (f === 'week') return !g.done && g.due && App.diff(App.today(), g.due) >= 0 && App.diff(App.today(), g.due) <= 7;
    if (f === 'alta') return g.priority === 'Alta';
    if (f === 'done') return !!g.done;
    return true;
  }

  function goalSection(kind, title, sub, icon) {
    var all = kind === 'S' ? S.goalsS : S.goalsL;
    var list = all.filter(matches);
    var doneN = all.filter(function (g) { return g.done; }).length;
    var pct = all.length ? Math.round(doneN / all.length * 100) : 0;

    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title">' + I(icon) + title + '</span>' +
      '<button class="fab sm" data-a="newGoal" data-k="' + kind + '" aria-label="Añadir meta a ' + title + '">' + I('plus', 22) + '</button></div>' +
      '<p class="tiny" style="margin-top:-6px">' + sub + '</p>';

    if (all.length) {
      h += '<div class="row" style="gap:11px">' +
        '<span class="bar grow"><span style="width:' + pct + '%"></span></span>' +
        '<span class="tiny num" style="font-weight:700">' + doneN + '/' + all.length + '</span></div>';
    }

    if (!list.length) {
      h += '<div class="empty"><span class="ee">' + I(icon, 30) + '</span><p>' +
        (all.length
          ? (ui.goalQ.trim() ? 'Ninguna meta contiene «' + esc(ui.goalQ.trim()) + '».' : 'Ninguna meta encaja con ese filtro.')
          : (kind === 'S'
            ? 'Empieza con tres como máximo: más de tres suele significar ninguna.'
            : 'Aquí van las que tardan más de un año. Sus pasos se convierten solos en metas de corto plazo.')) +
        '</p>' +
        (all.length ? '' : '<div class="chips" style="justify-content:center;margin-top:6px">' +
          (kind === 'S'
            ? [['Correr 5 km seguidos', 'c5'], ['Leer un libro al mes', 'c7'], ['Ahorrar mi primer mes de gastos', 'c4']]
            : [['Comprar mi casa', 'c4'], ['Hablar inglés con soltura', 'c1'], ['Correr una maratón', 'c5']]
          ).map(function (sug) {
            return '<button class="chipbtn" data-a="suggest" data-k="' + kind + '" data-v="' + esc(sug[0]) + '" data-c="' + sug[1] + '">' +
              I('plus', 13) + esc(sug[0]) + '</button>';
          }).join('') + '</div>') +
        '</div>';
    } else {
      h += '<div class="list">';
      list.forEach(function (g) { h += goalCard(g, kind); });
      h += '</div>';
    }
    return h + '</div>';
  }

  /* ------------------------------------------------------------- la pestaña */
  V.metas = function () {
    var h = '<div class="appbar bordered"><div class="appbar-row"><h1>Metas</h1>' + profileBtn() + '</div>' +
      '<div class="seg" role="tablist">' +
      '<button role="tab" aria-selected="' + (ui.subMetas === 'cal') + '" data-a="sub" data-s="cal">Calendario</button>' +
      '<button role="tab" aria-selected="' + (ui.subMetas === 'goals') + '" data-a="sub" data-s="goals">Mis metas</button>' +
      '</div></div>';

    h += '<div class="scroll"><div class="page">';

    if (ui.subMetas === 'cal') {
      h += calendar();
      h += dayPanel();
    } else {
      h += '<div class="sect" style="gap:11px">' +
        '<div class="row" style="background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:0 13px;gap:9px">' +
        '<span style="color:var(--ink-3)">' + I('search', 18) + '</span>' +
        '<input class="inp-plain grow" style="padding:11px 0" id="goalSearch" data-f="goalQ" value="' + esc(ui.goalQ) + '" placeholder="Buscar entre tus metas" aria-label="Buscar metas">' +
        (ui.goalQ ? '<button class="delbtn" data-a="clearQ" aria-label="Limpiar búsqueda">' + I('x', 16) + '</button>' : '') +
        '</div>' +
        '<div class="chips">' +
        [['', 'Todas'], ['late', 'Atrasadas'], ['week', 'Esta semana'], ['alta', 'Prioridad alta'], ['done', 'Completadas']]
          .map(function (f) {
            return '<button class="chipbtn" data-a="filter" data-v="' + f[0] + '" aria-pressed="' + (ui.goalFilter === f[0]) + '">' + f[1] + '</button>';
          }).join('') +
        '</div></div>';
      h += goalSection('S', 'Corto plazo', 'Lo que quieres conseguir en menos de un año.', 'zap');
      h += goalSection('L', 'Largo plazo', 'Más de un año. Sus pasos con fecha cercana pasan solos a corto plazo.', 'mountain');
    }

    h += '</div></div>';
    return h;
  };

  V.goalCard = goalCard;
})();
/* ==========================================================================
   Pestaña HOY — la pantalla de inicio.
   Responde a una sola pregunta: ¿qué hago ahora? Todo lo demás está detrás.
   Aquí se marca la rutina del día, se ve la racha y aparece —como mucho—
   un aviso a la vez sugiriendo el siguiente paso.
   ========================================================================== */
(function () {
  'use strict';
  var S = App.S, ui = App.ui, esc = App.esc;

  function profileBtn() {
    return '<button class="iconbtn solid" data-a="tab" data-t="perfil" aria-label="Tu perfil">' +
      (S.profile.photo ? '<img src="' + esc(S.profile.photo) + '" alt="">' : I('user', 19)) + '</button>';
  }

  /* ------------------------------------------------------------- el aviso */
  // Uno solo, el más útil en este momento. Con X para quitarlo.
  function nudge() {
    var t = App.today();
    var used = S.start ? App.diff(S.start, t) : 0;

    // Si hoy ya quitaste un aviso, no te ponemos otro en su sitio.
    var keys = Object.keys(S.dismissed);
    for (var i = 0; i < keys.length; i++) if (S.dismissed[keys[i]] === t) return null;

    function off(id, days) {
      var d = S.dismissed[id];
      return d && App.diff(d, t) < days;
    }

    if (!S.rc.length && !off('chequeo', 5)) {
      return { id: 'chequeo', icon: 'compass', title: 'Descubre cómo estás hoy',
        body: 'Siete preguntas cortas, unos tres minutos. Al terminar verás qué área de tu vida pide atención.',
        cta: 'Hacer el chequeo', act: 'newRC' };
    }

    var wStart = App.weekStart(t);
    var last = App.shift(wStart, 6);
    var rv = S.reviews[wStart];
    if (App.diff(t, last) <= 1 && (!rv || !rv.focus) && !off('revision', 3)) {
      return { id: 'revision', icon: 'rotate', title: 'Cierra tu semana',
        body: 'Dos minutos: qué funcionó, qué ajustas y tu foco para la semana que viene.',
        cta: 'Revisar la semana', act: 'goReview' };
    }

    if (S.rc.length) {
      var lastRC = S.rc[S.rc.length - 1].date;
      var since = lastRC ? App.diff(lastRC, t) : 0;
      if (since >= 60 && !off('rechequeo', 14)) {
        return { id: 'rechequeo', icon: 'compass', title: 'Han pasado ' + since + ' días desde tu último chequeo',
          body: 'Repetirlo te dice si de verdad has avanzado, no solo si te lo parece.',
          cta: 'Hacer otro chequeo', act: 'newRC' };
      }
    }

    if (S.guest && used >= 5 && !off('cuenta', 10)) {
      return { id: 'cuenta', icon: 'lock', title: 'Ponle una contraseña a tus datos',
        body: 'Llevas ' + App.plural(used, 'día', 'días') + ' usando la app. Con una cuenta, nadie que coja este dispositivo puede abrirla.',
        cta: 'Crear cuenta', act: 'go', attr: ' data-s="register"' };
    }

    if (used >= 10 && !S.lastBackup && !off('respaldo', 14)) {
      return { id: 'respaldo', icon: 'save', title: 'Guarda una copia de lo que llevas',
        body: 'Todo vive en este navegador. Si lo borras, se va contigo. Copiar tu respaldo tarda diez segundos.',
        cta: 'Hacer copia', act: 'sheetBackup' };
    }
    return null;
  }

  function nudgeCard() {
    var n = nudge();
    if (!n) return '';
    return '<div class="nudge">' +
      '<span class="nic">' + I(n.icon, 20) + '</span>' +
      '<div class="grow"><strong>' + esc(n.title) + '</strong>' +
      '<p class="tiny" style="margin-top:4px">' + esc(n.body) + '</p>' +
      '<button class="btn accent sm" style="margin-top:11px" data-a="' + n.act + '"' + (n.attr || '') + '>' + esc(n.cta) + '</button></div>' +
      '<button class="delbtn" data-a="dismiss" data-id="' + n.id + '" aria-label="Quitar este aviso">' + I('x', 16) + '</button>' +
      '</div>';
  }

  /* ------------------------------------------------------------- rutinas */
  function routine(kind, label, icon) {
    var t = App.today(), log = S.rlog[t] || { day: [], night: [] };
    var list = S.routines[kind] || [], marks = log[kind] || [];
    var open = ui.addRoutine === kind, editing = ui.editRoutine === kind;

    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' + I(icon) + label + '</span>' +
      '<span class="row" style="gap:8px">' +
      (list.length ? '<button class="btn ghost xs" data-a="editRoutine" data-k="' + kind + '">' +
        (editing ? 'Listo' : 'Editar') + '</button>' : '') +
      '<span class="pill num' + (list.length && marks.length >= list.length ? ' good' : '') + '">' +
      marks.length + ' de ' + list.length + '</span></span></div>';

    if (!list.length) {
      h += '<p class="muted">Sin hábitos aquí todavía.</p>';
    } else {
      h += '<div class="list">';
      list.forEach(function (it) {
        var on = marks.indexOf(it.id) >= 0;
        h += '<div class="listrow" style="padding:11px 12px 11px 14px">' +
          '<button class="chk" role="checkbox" aria-checked="' + on + '" data-a="rtoggle" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-label="' + esc(it.name) + '">' + I('check', 15) + '</button>' +
          (editing
            ? '<span class="grow"><input class="inp-plain" data-f="rname" data-k="' + kind + '" data-id="' + esc(it.id) + '" value="' + esc(it.name) + '"></span>' +
              '<button class="delbtn" data-a="rdel" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-label="Eliminar ' + esc(it.name) + '">' + I('trash', 17) + '</button>'
            : '<span class="grow"' + (on ? ' style="color:var(--ink-2);text-decoration:line-through"' : '') + '>' + esc(it.name) + '</span>') +
          '</div>';
      });
      h += '</div>';
    }

    if (open) {
      h += '<div class="row" style="gap:8px"><input class="inp grow" data-add="r' + kind + '" placeholder="Ej. Beber un vaso de agua" autofocus>' +
        '<button class="fab sm" data-a="radd" data-k="' + kind + '" aria-label="Guardar hábito">' + I('check') + '</button></div>';
    } else {
      h += '<button class="btn ghost sm" data-a="openAddRoutine" data-k="' + kind + '" style="align-self:flex-start">' +
        I('plus', 15) + 'Añadir hábito</button>';
    }
    return h + '</div>';
  }

  /* ------------------------------------------------- tareas de hoy y plan */
  var WD = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  // Una tarea puede venir de un paso de meta (goalId + sid). Entonces su
  // estado «hecha» es el del paso: se marca en un sitio y se ve en los dos.
  function goalById(id) {
    var g = App.byId(S.goalsS, id);
    if (g) return { g: g, k: 'S' };
    g = App.byId(S.goalsL, id);
    return g ? { g: g, k: 'L' } : null;
  }
  function stepLink(e) {
    if (!e || !e.goalId || !e.sid || e.sid === '__due') return null;
    var x = goalById(e.goalId);
    return x ? App.byId(x.g.steps || [], e.sid) : null;
  }
  function isDone(e) { var s = stepLink(e); return !!(e.done || (s && s.done)); }
  // ¿Ya hay una tarea (en cualquier día o sin fecha) para este paso? Así nunca se duplica.
  function linked(gid, sid) {
    var k;
    for (k in S.events) {
      if (Object.prototype.hasOwnProperty.call(S.events, k) &&
        S.events[k].some(function (e) { return e.goalId === gid && e.sid === sid; })) return true;
    }
    return S.todo.some(function (x) { return x.goalId === gid && x.sid === sid; });
  }
  // Pasos de metas (y fechas límite) que caen hoy y aún no están en el calendario.
  function goalsToday(t) {
    var out = [];
    [['S', S.goalsS], ['L', S.goalsL]].forEach(function (p) {
      p[1].forEach(function (g) {
        (g.steps || []).forEach(function (s) {
          // Un paso de largo plazo ascendido ya vive como meta corta: no se repite.
          if (s.due === t && !(p[0] === 'L' && s.promoted) && !linked(g.id, s.id)) out.push({ k: p[0], g: g, s: s });
        });
        if (g.due === t && !g.done && !linked(g.id, '__due')) out.push({ k: p[0], g: g, s: null });
      });
    });
    return out;
  }
  V.stepLink = stepLink; V.isDone = isDone; V.goalById = goalById;

  function nowHM() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  // Con hora primero y por orden; el resto va aparte, en «Cuando puedas».
  function planRow(e, day, opt) {
    opt = opt || {};
    var open = ui.moveId === e.id, appt = e.kind === 'appt', done = isDone(e);
    var h = '<div class="listrow plan' + (done ? ' is-done' : '') + '">' +
      '<button class="chk" role="checkbox" aria-checked="' + done + '" data-a="evdone" data-day="' + day + '" data-id="' + esc(e.id) + '" aria-label="Marcar «' + esc(e.title) + '» como hecha">' + I('check', 15) + '</button>' +
      '<span class="grow plan-txt">' + esc(e.title) +
      '<span class="plan-meta">' +
      (opt.next ? '<span class="pill accent">Próxima</span>' : '') +
      (opt.showDate ? '<span class="pill bad">' + esc(App.fmt(day)) + '</span>' : '') +
      (e.time ? '<span class="pill num">' + esc(e.time) + '</span>' : '') +
      (appt ? '<span class="pill accent">' + I('calendar', 13) + 'Cita</span>' : '') +
      (e.goalId && goalById(e.goalId) ? '<span class="pill">' + I('target', 13) + 'Meta</span>' : '') +
      '</span></span>' +
      '<button class="iconbtn" data-a="evmove" data-id="' + esc(e.id) + '" aria-expanded="' + open + '" aria-label="Cambiar día u hora">' + I('pencil', 16) + '</button>' +
      '<button class="delbtn" data-a="evdel" data-day="' + day + '" data-id="' + esc(e.id) + '" aria-label="Quitar tarea">' + I('trash', 17) + '</button></div>';
    if (open) {
      var t = App.today();
      h += '<div class="plan-move">' +
        '<span class="tiny">Pasar a</span>' +
        (day !== t ? '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + esc(e.id) + '" data-to="' + t + '">Hoy</button>' : '') +
        '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + esc(e.id) + '" data-to="' + App.shift(day < t ? t : day, 1) + '">Mañana</button>' +
        '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + esc(e.id) + '" data-to="' + App.shift(day < t ? t : day, 7) + '">En 7 días</button>' +
        '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + esc(e.id) + '" data-to="">Sin fecha</button>' +
        '<input class="inp" type="date" data-f="evdate" data-day="' + day + '" data-id="' + esc(e.id) + '" value="' + day + '" aria-label="Otro día">' +
        '<span class="tiny">Hora</span>' +
        '<input class="inp" type="time" data-f="evtime" data-day="' + day + '" data-id="' + esc(e.id) + '" value="' + esc(e.time || '') + '" aria-label="Hora (opcional)">' +
        '</div>';
    }
    return h;
  }

  // Un paso de meta de hoy que aún no es tarea: se muestra en el plan y, al
  // editarlo, se convierte en tarea real (enlazada al paso, sin duplicarse).
  function goalRow(x) {
    var c = App.cat(x.g.cat);
    if (!x.s) {
      return '<button class="listrow plan" data-a="openGoal" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '">' +
        '<span class="thumb plan-ic">' + (c ? esc(c.emoji) : I('target', 15)) + '</span>' +
        '<span class="grow plan-txt">' + esc(x.g.name || 'Meta sin nombre') +
        '<span class="plan-meta"><span class="pill bad">' + I('flame', 13) + 'Vence hoy</span></span></span>' +
        I('right', 16) + '</button>';
    }
    var done = !!x.s.done, title = (x.g.name || 'Meta') + ' · ' + (x.s.name || 'paso');
    return '<div class="listrow plan' + (done ? ' is-done' : '') + '">' +
      '<button class="chk" role="checkbox" aria-checked="' + done + '" data-a="gsDone" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '" aria-label="Marcar «' + esc(title) + '» como hecha">' + I('check', 15) + '</button>' +
      '<span class="grow plan-txt">' + esc(title) +
      '<span class="plan-meta"><span class="pill">' + I('target', 13) + 'Meta</span></span></span>' +
      '<button class="iconbtn" data-a="gsEdit" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '" aria-label="Cambiar día u hora">' + I('pencil', 16) + '</button></div>';
  }

  function taskList(day, empty, extra) {
    var list = S.events[day] || [], extraRows = extra || [];
    if (!list.length && !extraRows.length) return '<p class="muted">' + empty + '</p>';
    var timed = list.filter(function (e) { return e.time; }).sort(function (x, y) { return x.time < y.time ? -1 : x.time > y.time ? 1 : 0; });
    var loose = list.filter(function (e) { return !e.time; });
    // La siguiente con hora que aún no se ha hecho, solo en el día de hoy.
    var nextId = '';
    if (day === App.today()) {
      var now = nowHM(), nx = timed.filter(function (e) { return !isDone(e) && e.time >= now; })[0];
      if (nx) nextId = nx.id;
    }
    var h = '<div class="list">';
    timed.forEach(function (e) { h += planRow(e, day, { next: e.id === nextId }); });
    if (loose.length || extraRows.length) h += '<div class="plan-group">' + (timed.length ? 'Cuando puedas' : 'Sin horario') + '</div>';
    extraRows.forEach(function (x) { h += goalRow(x); });
    loose.forEach(function (e) { h += planRow(e, day); });
    return h + '</div>';
  }

  // Tareas de días anteriores (dos semanas) que se quedaron sin hacer.
  function overdue(t) {
    var out = [];
    for (var i = 14; i >= 1; i--) {
      var k = App.shift(t, -i);
      (S.events[k] || []).forEach(function (e) { if (!isDone(e)) out.push({ e: e, day: k }); });
    }
    return out;
  }

  /* «Plan de hoy»: tareas con horario, pendientes flexibles, y añadir o quitar */
  function planSection(t) {
    var evs = S.events[t] || [], gt = goalsToday(t), late = overdue(t);
    var steps = gt.filter(function (x) { return x.s; });
    var total = evs.length + steps.length;
    var doneN = evs.filter(isDone).length + steps.filter(function (x) { return x.s.done; }).length;
    var kind = ui.ntKind === 'appt' ? 'appt' : 'task';

    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' + I('list') + 'Plan de hoy</span>' +
      (total ? '<span class="pill num' + (doneN === total ? ' good' : '') + '">' + doneN + ' de ' + total + '</span>' : '') + '</div>';

    if (late.length) {
      h += '<div class="list"><div class="plan-group spread">Atrasadas' +
        '<button class="btn ghost xs" data-a="overdueAll">Pasar todas a hoy</button></div>';
      late.slice(0, 5).forEach(function (x) { h += planRow(x.e, x.day, { showDate: true }); });
      if (late.length > 5) h += '<p class="tiny" style="padding:6px 14px 10px">Y ' + (late.length - 5) + ' más.</p>';
      h += '</div>';
    }

    h += taskList(t, 'Nada planeado para hoy. Añade lo primero que quieras hacer.', gt);

    /* añadir: lo justo a la vista; día y tipo, si se piden */
    h += '<div class="plan-add">' +
      '<div class="row" style="gap:8px"><input class="inp grow" data-f="ntTitle" data-add="task" value="' + esc(ui.ntTitle || '') + '" placeholder="Añadir una tarea o cita" aria-label="Nueva tarea" enterkeyhint="done">' +
      '<button class="fab sm" data-a="ntAdd" aria-label="Añadir al plan">' + I('plus') + '</button></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">' +
      '<input class="inp" type="time" style="width:auto" data-f="ntTime" value="' + esc(ui.ntTime || '') + '" aria-label="Hora (opcional)">' +
      '<button class="btn ghost sm" data-a="ntAddTodo">Guardar sin fecha</button>' +
      '<button class="btn ghost sm" data-a="ntMore" aria-expanded="' + !!ui.ntMore + '">' + (ui.ntMore ? 'Menos' : 'Más opciones') + '</button></div>';
    if (ui.ntMore) {
      h += '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">' +
        '<input class="inp" type="date" style="width:auto" data-f="ntDate" value="' + esc(ui.ntDate || t) + '" aria-label="Día">' +
        '<span class="seg" role="group" aria-label="Tipo">' +
        '<button type="button" data-a="ntKind" data-v="task" aria-pressed="' + (kind === 'task') + '">Tarea</button>' +
        '<button type="button" data-a="ntKind" data-v="appt" aria-pressed="' + (kind === 'appt') + '">Cita o trámite</button></span></div>';
    }
    h += '</div>';

    if (S.todo.length) {
      h += '<div class="list"><div class="plan-group">Pendientes sin fecha</div>';
      S.todo.forEach(function (x) {
        h += '<div class="listrow plan">' +
          '<span class="grow plan-txt">' + esc(x.title) +
          '<span class="plan-meta">' +
            (x.kind === 'appt' ? '<span class="pill accent">' + I('calendar', 13) + 'Cita</span>' : '') +
            (x.goalId && goalById(x.goalId) ? '<span class="pill">' + I('target', 13) + 'Meta</span>' : '') + '</span></span>' +
          '<button class="btn soft xs" data-a="todoPull" data-id="' + esc(x.id) + '">' + I('plus', 13) + 'A hoy</button>' +
          '<button class="delbtn" data-a="tododel" data-id="' + esc(x.id) + '" aria-label="Quitar pendiente">' + I('trash', 17) + '</button></div>';
      });
      h += '</div>';
    }
    return h + '</div>';
  }

  /* metas que vencen pronto */
  function soonSection() {
    var soon = App.upcoming(3);
    if (!soon.length) return '';
    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' + I('target') + 'Vence pronto</span>' +
      '<button class="btn ghost xs" data-a="tab" data-t="metas">Ver todas</button></div>' +
      '<div class="list">';
    soon.forEach(function (x) {
      var d = App.due(x.g.due, false), c = App.cat(x.g.cat);
      h += '<button class="listrow" data-a="openGoal" data-k="' + x.kind + '" data-id="' + esc(x.g.id) + '">' +
        '<span class="thumb" style="width:34px;height:34px;border-radius:10px;font-size:16px;background:' +
        (c ? esc(c.color) + '1f' : 'color-mix(in srgb,var(--ink) 6%,transparent)') + '">' + (c ? esc(c.emoji) : I('target', 17)) + '</span>' +
        '<span class="grow" style="font-size:14px">' + esc(x.g.name || 'Meta sin nombre') + '</span>' +
        '<span class="pill ' + d.cls + '">' + (d.cls === 'bad' ? I('flame', 13) : '') + esc(d.txt) + '</span></button>';
    });
    return h + '</div></div>';
  }

  /* lo que viene después: la semana en una tira y el día elegido (mañana por defecto) */
  function upcomingSection(t) {
    var d = ui.planDay;
    if (!d || !/^\d{4}-\d\d-\d\d$/.test(d)) d = ui.planDay = App.shift(t, 1);
    var days = App.weekDays(App.weekStart(d));
    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' + I('calendar') + 'Lo que viene</span></div>' +
      '<div class="wstrip" role="group" aria-label="Días de la semana">' +
      '<button class="iconbtn" data-a="planWeek" data-v="-7" aria-label="Semana anterior">' + I('left', 17) + '</button>';
    days.forEach(function (k) {
      var pend = (S.events[k] || []).filter(function (e) { return !isDone(e); }).length;
      h += '<button class="wday" data-a="planDay" data-day="' + k + '" aria-pressed="' + (k === d) + '"' + (k === t ? ' data-today="1"' : '') +
        ' aria-label="' + esc(App.cap(App.fmtLong(k))) + (pend ? ', ' + pend + ' pendientes' : '') + '">' +
        '<span class="wd">' + WD[App.parseK(k).getDay()] + '</span><span class="wn">' + +k.slice(8) + '</span>' +
        '<span class="wdot">' + (pend ? pend : '') + '</span></button>';
    });
    h += '<button class="iconbtn" data-a="planWeek" data-v="7" aria-label="Semana siguiente">' + I('right', 17) + '</button></div>';
    if (d === t) h += '<p class="muted">Es hoy: tu plan está arriba.</p>';
    else h += '<p class="tiny">' + esc(App.cap(App.fmtLong(d))) + '</p>' + taskList(d, 'Nada planeado para este día.');
    return h + '</div>';
  }

  /* --------------------------------------------------------------- la vista */
  V.hoy = function () {
    var t = App.today(), st = App.streak();
    var tot = App.dayTotals(t);
    var name = (S.account && S.account.name) ? S.account.name.split(' ')[0] : '';
    var hora = new Date().getHours();
    var saludo = hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

    // Resumen del día en el subtítulo: lo que queda por hacer.
    var evs = S.events[t] || [];
    var steps = goalsToday(t).filter(function (x) { return x.s; });
    var pend = evs.filter(function (e) { return !isDone(e); }).length + steps.filter(function (x) { return !x.s.done; }).length;
    var timedPend = evs.filter(function (e) { return e.time && !isDone(e); }).length;
    var resumen = !(evs.length + steps.length) ? 'Sin plan todavía'
      : !pend ? 'Todo hecho'
        : App.plural(pend, 'pendiente', 'pendientes') + (timedPend ? ' · ' + timedPend + ' con hora' : '');

    // Una frase motivadora por día en lugar del saludo. Sale de la fecha, así que
    // no cambia al repintar la pantalla y recorre toda la lista antes de repetir.
    var F = window.FRASES || [];
    var dayN = Math.round(App.parseK(t).getTime() / 864e5);
    var titulo = F.length ? '<h1 class="frase">' + esc(F[((dayN % F.length) + F.length) % F.length]) + '</h1>'
      : '<h1>' + esc(saludo) + (name ? ', ' + esc(name) : '') + '</h1>';

    var h = '<div class="appbar"><div class="appbar-row">' +
      titulo + profileBtn() + '</div>' +
      '<span class="sub">' + esc(App.cap(App.fmtLong(t))) + ' · ' + esc(resumen) + '</span></div>';

    h += '<div class="scroll"><div class="page">';

    /* 1. el plan de hoy, lo primero */
    h += planSection(t);

    /* 2. rutinas: la de día a la vista; la de noche plegada hasta las 18:00 */
    h += routine('day', 'Rutina de día', 'sunrise');
    var nightList = S.routines.night || [], nightMarks = (S.rlog[t] || { night: [] }).night || [];
    if (hora >= 18 || ui.nightOpen) {
      h += routine('night', 'Rutina de noche', 'moon');
    } else {
      h += '<div class="sect"><button class="btn ghost block" data-a="toggleNight" style="justify-content:space-between">' +
        '<span class="row" style="gap:8px">' + I('moon', 17) + 'Rutina de noche</span>' +
        '<span class="pill num">' + nightMarks.length + ' de ' + nightList.length + '</span></button></div>';
    }

    /* 3. la nota del día, cerca y a un toque */
    var note = S.notes[t] || '';
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' + I('note') + 'Nota de hoy</span></div>';
    if (note || ui.noteOpen) {
      h += '<textarea class="ta" data-f="note" placeholder="¿Qué te acercó hoy a donde quieres llegar, y qué te alejó?">' + esc(note) + '</textarea>';
    } else {
      h += '<button class="btn soft block" data-a="openNote" style="justify-content:flex-start;color:var(--ink-2);font-weight:500">' +
        I('pencil', 17) + 'Escribir cómo ha ido el día</button>';
    }
    h += '</div>';

    /* 4. la racha y las metas próximas, después del plan */
    h += '<div class="sect" style="gap:10px">';
    if (st > 0) {
      h += '<div class="kpi"><span class="display">' + st + '</span>' +
        '<span class="unit" style="padding-bottom:7px">' + (st === 1 ? 'día seguido' : 'días seguidos') + '<br>sin romper la cadena</span></div>';
    } else {
      h += '<div class="kpi"><span class="display">' + tot.done + '<span style="font-size:.45em;color:var(--ink-2)">/' + tot.total + '</span></span>' +
        '<span class="unit" style="padding-bottom:7px">' + (tot.done ? 'hecho hoy.<br>Sigue así.' : 'Marca lo primero<br>y empieza tu racha.') + '</span></div>';
    }
    if (st > 0 && tot.done < tot.total) {
      h += '<p class="tiny">Te faltan ' + App.plural(tot.total - tot.done, 'hábito', 'hábitos') + ' para cerrar el día completo.</p>';
    }
    h += '</div>';

    h += soonSection();

    /* 5. la semana y, al final, los avisos de la app */
    h += upcomingSection(t);
    h += nudgeCard();

    h += '</div></div>';
    return h;
  };
})();
/* ==========================================================================
   Pestañas VISIÓN y PROGRESO.
   Cada pantalla responde a una sola pregunta y cabe casi de una vez:
     Visión   → ¿a dónde voy?
     Progreso → ¿estoy avanzando?
   Lo que es una tarea (revisar la semana, llevar un reto, apuntar un logro)
   no vive aquí: se abre en su propia hoja cuando hace falta.
   ========================================================================== */
(function () {
  'use strict';
  var S = App.S, ui = App.ui, esc = App.esc;

  var PLANTILLAS = [
    'Mi cuerpo es mi casa: lo cuido.',
    'Hago cosas difíciles y me alegro después.',
    'El dinero es libertad, no estatus.',
    'La gente que quiero sabe que la quiero.',
    'Primero lo importante, luego lo urgente.',
    'Descansar también es avanzar.'
  ];
  V.PLANTILLAS = PLANTILLAS;

  function profileBtn() {
    return '<button class="iconbtn solid" data-a="tab" data-t="perfil" aria-label="Tu perfil">' +
      (S.profile.photo ? '<img src="' + esc(S.profile.photo) + '" alt="">' : I('user', 19)) + '</button>';
  }
  function row(icon, title, value, action, extra) {
    return '<button class="listrow" data-a="' + action + '"' + (extra || '') + '>' +
      I(icon, 19) + '<span class="grow">' + title + '</span>' +
      (value ? '<span class="tiny num" style="flex:none">' + value + '</span>' : '') +
      I('right', 17) + '</button>';
  }

  /* ========================================================= TABLERO VISIÓN */
  function board() {
    var h = '<div class="page">';
    h += '<div class="sect">' +
      '<div class="chips">' +
      '<label class="btn soft sm">' + I('image', 17) + 'Imagen<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" id="boardImg" style="display:none"></label>' +
      '<button class="btn soft sm" data-a="addQuote">' + I('quote', 17) + 'Frase</button>' +
      '<button class="btn ghost sm" data-a="plantillas">' + I('sparkle', 17) + 'Plantillas</button>' +
      '</div>';

    if (!S.board.length) {
      h += '<div class="empty"><span class="ee">' + I('image', 30) + '</span>' +
        '<p>Sube fotos de lo que quieres construir y añade frases que te recuerden por qué.</p></div>';
    } else {
      h += '<div class="board">';
      S.board.forEach(function (t, i) {
        var isImg = t.kind === 'img' && t.src;
        h += '<div class="tile' + (isImg ? ' hasimg' : ' quote') + '">' +
          (isImg ? '<img src="' + esc(t.src) + '" alt="' + esc(t.cap || 'Imagen del tablero') + '">' : '') +
          '<span class="acts">' +
          (i > 0 ? '<button data-a="boardMove" data-i="' + i + '" data-d="-1" aria-label="Mover antes">' + I('up', 15) + '</button>' : '') +
          (i < S.board.length - 1 ? '<button data-a="boardMove" data-i="' + i + '" data-d="1" aria-label="Mover después">' + I('down', 15) + '</button>' : '') +
          '<button data-a="boardEdit" data-i="' + i + '" aria-label="Editar texto">' + I('pencil', 15) + '</button>' +
          '<button data-a="boardDel" data-i="' + i + '" aria-label="Eliminar">' + I('trash', 15) + '</button>' +
          '</span>' +
          (t.cap ? '<span class="cap">' + esc(t.cap) + '</span>' : (isImg ? '' : '<span class="cap tiny">Sin texto</span>')) +
          '</div>';
      });
      h += '</div>';
    }
    return h + '</div></div>';
  }

  /* ======================================================= VISIÓN A 5 AÑOS */
  function visionPage() {
    var h = '<div class="page">';

    h += '<div class="sect">' +
      '<div class="sect-head"><span class="label">Tu mejor versión en 5 años</span>' +
      '<button class="btn ghost xs" data-a="visionAdd">' + I('plus', 14) + 'Añadir</button></div>';
    if (!S.visions.length) {
      h += '<div class="empty"><span class="ee">' + I('leaf', 30) + '</span>' +
        '<p>Aún no has escrito a dónde quieres llegar. Sin destino no hay forma de saber si avanzas.</p>' +
        '<button class="btn accent sm" data-a="visionAdd">Escribirla ahora</button></div>';
    } else {
      S.visions.forEach(function (v, i) {
        h += '<div class="card' + (i ? '' : ' raised') + '">' +
          '<textarea class="ta" style="border:0;padding:0;background:transparent;font-size:15.5px" data-f="vision" data-id="' + esc(v.id) + '" placeholder="En 5 años quiero…">' + esc(v.text) + '</textarea>' +
          '<div class="spread" style="margin-top:12px;padding-top:11px;border-top:1px solid var(--line)">' +
          '<span class="tiny num">Escrita el ' + esc(App.fmt(v.date)) + '</span>' +
          '<button class="delbtn" data-a="visionDel" data-id="' + esc(v.id) + '" aria-label="Eliminar visión">' + I('trash', 17) + '</button>' +
          '</div></div>';
      });
    }
    h += '</div>';

    /* todo lo demás, en tres filas */
    var fut = 0;
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) fut++; });
    var last = App.lastRC();

    h += '<div class="sect">' +
      '<div class="sect-head"><span class="label">Profundizar</span></div>' +
      '<div class="list">' +
      row('sparkle', 'Mi Yo del Futuro', fut ? App.plural(fut, 'área', 'áreas') : 'sin definir', 'go', ' data-s="future"') +
      (last ? row('swap', 'Hoy frente a 5 años', '', 'go', ' data-s="vs"') : '') +
      row('compass', 'Chequeos de vida',
        last ? 'último ' + App.rcAvg(last) + '/10' : 'ninguno', 'sheetRC') +
      '</div></div>';

    return h + '</div>';
  }

  V.vision = function () {
    var h = '<div class="appbar bordered"><div class="appbar-row"><h1>Visión</h1>' + profileBtn() + '</div>' +
      '<div class="seg" role="tablist">' +
      '<button role="tab" aria-selected="' + (ui.subVision === 'five') + '" data-a="subv" data-s="five">A 5 años</button>' +
      '<button role="tab" aria-selected="' + (ui.subVision === 'board') + '" data-a="subv" data-s="board">Tablero</button>' +
      '</div></div>';
    h += '<div class="scroll">' + (ui.subVision === 'board' ? board() : visionPage()) + '</div>';
    return h;
  };

  /* ============================================================== PROGRESO */
  // Una sola tabla con las metas que más piden atención, cortas y largas juntas.
  function goalTable() {
    var all = [];
    S.goalsS.forEach(function (g) { if (!S.hidden[g.id]) all.push({ g: g, k: 'S' }); });
    S.goalsL.forEach(function (g) { if (!S.hidden[g.id]) all.push({ g: g, k: 'L' }); });
    var rank = { bad: 0, warn: 1, good: 2 };
    all.sort(function (a, b) {
      var d = rank[App.goalState(a.g)] - rank[App.goalState(b.g)];
      return d !== 0 ? d : (a.g.due < b.g.due ? -1 : 1);
    });
    var hiddenN = App.allGoals().filter(function (g) { return S.hidden[g.id]; }).length;
    var shown = all.slice(0, 6);

    if (!all.length) {
      return '<div class="empty" style="padding:18px 0"><span class="ee">' + I('target', 30) + '</span>' +
        '<p>' + (App.allGoals().length ? 'Todas tus metas están ocultas de esta vista.' : 'Cuando tengas metas, su avance aparecerá aquí.') + '</p>' +
        '<button class="btn soft sm" data-a="goGoals" data-s="S">Ir a Metas</button></div>' +
        (hiddenN ? '<button class="btn ghost xs" data-a="showAll" data-k="all" style="align-self:flex-start">' +
          I('eye', 14) + 'Mostrar las ocultas</button>' : '');
    }

    var h = '<div class="tblwrap"><table class="tbl"><thead><tr>' +
      '<th>Meta</th><th class="r">Avance</th><th class="r" style="width:34px"></th>' +
      '</tr></thead><tbody>';
    shown.forEach(function (x) {
      var pct = App.goalPct(x.g), st = App.goalState(x.g);
      var col = st === 'good' ? 'good' : st === 'bad' ? 'bad' : 'warn';
      h += '<tr><td class="name"><span class="cell" style="font-weight:600">' + esc(x.g.name || 'Sin nombre') + '</span>' +
        '<span class="bar thin" style="margin-top:6px;max-width:190px"><span style="width:' + pct + '%;background:var(--' + col + ')"></span></span></td>' +
        '<td class="r num" style="font-weight:700;color:var(--' + col + ');padding-left:12px">' + pct + '%</td>' +
        '<td class="r"><button class="delbtn" data-a="hideGoal" data-id="' + esc(x.g.id) + '" aria-label="Ocultar del progreso">' + I('eyeOff', 17) + '</button></td></tr>';
    });
    h += '</tbody></table></div>';
    if (all.length > 6) {
      h += '<p class="tiny">Y ' + App.plural(all.length - 6, 'meta más', 'metas más') + '.</p>';
    }
    if (hiddenN) {
      h += '<button class="btn ghost xs" data-a="showAll" data-k="all" style="align-self:flex-start">' +
        I('eye', 14) + 'Mostrar ' + App.plural(hiddenN, 'meta oculta', 'metas ocultas') + '</button>';
    }
    return h;
  }

  V.progreso = function () {
    var doneS = S.goalsS.filter(function (g) { return g.done; }).length;
    var pctS = S.goalsS.length ? Math.round(doneS / S.goalsS.length * 100) : 0;
    var st = App.streak(), r = App.lastRC();
    var wStart = App.weekStart(App.today());
    var w = App.weekStats(wStart), rv = S.reviews[wStart];
    var c = S.challenge, chTxt = 'sin reto';
    if (c) {
      var days = +c.days || 30, doneN = Object.keys(c.done || {}).length;
      chTxt = doneN >= days ? 'completado' : Math.round(doneN / days * 100) + '%';
    }

    var h = '<div class="appbar bordered"><div class="appbar-row"><h1>Progreso</h1>' + profileBtn() + '</div></div>';
    h += '<div class="scroll"><div class="page">';

    /* 1 — ¿estoy siendo constante? */
    h += '<div class="sect" style="gap:14px">' +
      '<span class="label">Constancia</span>' +
      '<div class="kpi"><span class="display">' + st + '</span>' +
      '<span class="unit" style="padding-bottom:6px">' + (st === 1 ? 'día seguido' : 'días seguidos') + '<br>cumpliendo rutinas</span></div>' +
      '<div class="divider"></div>' +
      '<div class="row" style="gap:20px">' +
      App.ring(pctS, 92, 'var(--good)', '<b style="font-size:1.35rem">' + pctS + '%</b>') +
      '<div class="grow"><p class="muted" style="margin-bottom:7px">' +
      (S.goalsS.length === 1 ? 'De tu única meta a corto plazo:' : 'De tus ' + S.goalsS.length + ' metas a corto plazo:') + '</p>' +
      '<p class="tiny num" style="line-height:1.75"><strong style="color:var(--good)">' + doneS + '</strong> completadas · <strong>' +
      (S.goalsS.length - doneS) + '</strong> en marcha</p>' +
      (r ? '<p class="tiny" style="margin-top:6px">Último chequeo: <strong class="num">' + App.rcAvg(r) + '/10</strong></p>' : '') +
      '</div></div></div>';

    /* 2 — ¿cómo van mis metas? */
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="label">Tus metas</span>' +
      '<button class="btn ghost xs" data-a="goGoals" data-s="S">Ver todas</button></div>' +
      goalTable() + '</div>';

    /* 3 — lo que se hace, no lo que se mira */
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="label">Cada cierto tiempo</span></div>' +
      '<div class="list">' +
      row('rotate', 'Revisión semanal',
        (rv && rv.focus ? 'hecha' : w.full + ' de ' + (w.elapsed || 7) + ' días'), 'goReview') +
      row('zap', 'Reto de 30 días', chTxt, 'sheetChallenge') +
      row('trophy', 'Todo lo que has logrado', String(S.wins.length), 'sheetWins') +
      '</div></div>';

    h += '</div></div>';
    return h;
  };
})();
/* ==========================================================================
   Pestaña PERFIL — cuenta, seguridad, preferencias, respaldo y legal.
   Listas agrupadas con filete en lugar de una pila de tarjetas iguales.
   ========================================================================== */
(function () {
  'use strict';
  var S = App.S, esc = App.esc;

  function sect(label, inner, extra) {
    return '<div class="sect"><div class="sect-head"><span class="label">' + label + '</span>' +
      (extra || '') + '</div>' + inner + '</div>';
  }
  function link(icon, text, action, extra) {
    return '<button class="listrow" data-a="' + action + '"' + (extra || '') + '>' +
      I(icon, 19) + '<span class="grow">' + text + '</span>' + I('right', 17) + '</button>';
  }

  V.perfil = function () {
    var a = S.account, p = S.profile;
    var name = (a && a.name) ? a.name : 'Invitada';
    var av = p.photo
      ? '<img class="avatar" src="' + esc(p.photo) + '" alt="Tu foto">'
      : '<div class="avatar">' + esc(String(name).charAt(0).toUpperCase()) + '</div>';

    var h = '<div class="appbar bordered"><div class="appbar-row"><h1>Perfil</h1></div></div>';
    h += '<div class="scroll"><div class="page">';

    /* --- cabecera, sin tarjeta --- */
    h += '<div class="row" style="gap:16px;padding-top:4px">' + av +
      '<div class="grow" style="min-width:0">' +
      '<div style="font-family:var(--disp);font-size:1.5rem;font-weight:600;line-height:1.15;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(name) + '</div>' +
      '<div class="tiny" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(a && a.email ? a.email : 'Estás usando la app sin cuenta') + '</div></div>' +
      '<label class="btn soft xs">' + I('image', 14) + 'Foto<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" id="pfPhoto2" style="display:none"></label>' +
      '</div>';

    if (S.guest) {
      h += '<div class="notice">Estás sin cuenta. Todo funciona igual y se guarda en este navegador; si creas una cuenta, tus datos actuales se conservan.' +
        '<div style="margin-top:11px"><button class="btn accent sm" data-a="go" data-s="register">Crear una cuenta</button></div></div>';
    }

    /* --- cuenta --- */
    h += sect('Cuenta',
      '<div class="list"><div class="listpad">' +
      '<label class="field"><span>Nombre de usuario</span><input class="inp" data-f="acName" value="' + esc(a ? a.name : '') + '" placeholder="Tu nombre"></label>' +
      '<label class="field" style="margin-top:12px"><span>Correo</span><input class="inp" type="email" data-f="acMail" value="' + esc(a ? a.email : '') + '" placeholder="tu@correo.com"></label>' +
      '<button class="btn sm" data-a="saveAccount" style="margin-top:14px">Guardar cambios</button>' +
      '</div></div>');

    /* --- seguridad --- */
    h += sect('Seguridad',
      '<div class="list">' +
      link('lock', (a && a.pass) ? 'Cambiar contraseña' : 'Crear contraseña', 'sheetPass') +
      link('shield', 'Cómo se protege tu cuenta', 'sheetDoc', ' data-doc="seguridad"') +
      '</div>');

    /* --- apariencia --- */
    var th = (S.prefs.theme || 'auto');
    h += sect('Apariencia',
      '<div class="seg3">' +
      '<button data-a="theme" data-v="auto" aria-pressed="' + (th === 'auto') + '">' + I('monitor', 19) + 'Automático</button>' +
      '<button data-a="theme" data-v="light" aria-pressed="' + (th === 'light') + '">' + I('sun', 19) + 'Claro</button>' +
      '<button data-a="theme" data-v="dark" aria-pressed="' + (th === 'dark') + '">' + I('moon', 19) + 'Oscuro</button>' +
      '</div>' +
      '<div class="list"><div class="listrow">' + I('bell', 19) +
      '<span class="grow">Recordatorios dentro de la app</span>' +
      '<button class="switch" role="switch" aria-checked="' + (!!S.prefs.notifs) + '" data-a="notifs" aria-label="Recordatorios"><i></i></button>' +
      '</div></div>');

    /* --- notificaciones (push real, con la app cerrada) --- */
    var rs = window.Sync ? window.Sync.reminderState() : { supported: false, active: false, hour: 20 };
    var hasAcc = !!(a && a.email);
    var canPush = rs.supported && hasAcc;
    var pushHint = !rs.supported ? 'Este navegador no admite notificaciones push.'
      : !hasAcc ? 'Necesitas una cuenta con sincronización activada para usarlo.'
      : rs.active ? 'Te avisamos a esta hora aunque tengas la app cerrada.'
      : 'Elige una hora y te avisamos aunque tengas la app cerrada.';
    h += sect('Recordatorio diario',
      '<div class="list"><div class="listrow">' + I('bell', 19) +
      '<span class="grow">Avisar aunque la app esté cerrada</span>' +
      '<button class="switch" role="switch" aria-checked="' + (!!rs.active) + '" data-a="pushReminder" aria-label="Recordatorio diario"' + (canPush ? '' : ' disabled') + '><i></i></button>' +
      '</div>' +
      (rs.active ? '<div class="listpad"><label class="field"><span>Hora</span><input class="inp" type="time" id="pushHour" value="' + esc(String(rs.hour || 20).padStart(2, '0') + ':00') + '"></label></div>' : '') +
      '</div>' +
      '<p class="tiny">' + pushHint + '</p>');

    /* --- uso --- */
    h += sect('Uso',
      '<div class="list"><div class="listpad">' +
      '<label class="field"><span>Idioma</span><select class="sel" data-p="lang">' +
      '<option value="es"' + (p.lang === 'es' ? ' selected' : '') + '>Español</option>' +
      '<option value="en"' + (p.lang === 'en' ? ' selected' : '') + '>English</option>' +
      '<option value="pt"' + (p.lang === 'pt' ? ' selected' : '') + '>Português</option>' +
      '</select></label>' +
      '<p class="tiny" style="margin-top:7px">La interfaz está solo en español; el idioma queda guardado para cuando se traduzca.</p>' +
      '<div class="field" style="margin-top:14px"><span>Primer día de la semana</span>' +
      '<div class="seg3" style="grid-template-columns:1fr 1fr;margin-top:5px">' +
      '<button data-a="week" data-v="1" aria-pressed="' + (p.weekStart === 1) + '">Lunes</button>' +
      '<button data-a="week" data-v="0" aria-pressed="' + (p.weekStart === 0) + '">Domingo</button>' +
      '</div></div>' +
      '<label class="field" style="margin-top:14px"><span>Zona horaria</span>' +
      '<input class="inp" data-p="tz" value="' + esc(p.tz || V.guessTz()) + '"></label>' +
      '</div></div>');

    /* --- áreas de vida --- */
    h += sect('Áreas de vida',
      '<p class="muted">Se usan en el Reality Check, en las metas y en el progreso. El emoji lo eliges tú.</p>' +
      '<div class="list">' +
      S.cats.map(function (c) {
        return '<div class="listrow" style="padding:8px 10px 8px 12px">' +
          '<input class="inp-plain" style="width:42px;flex:none;text-align:center;font-size:19px" data-f="catEmoji" data-id="' + esc(c.id) + '" value="' + esc(c.emoji) + '" maxlength="4" aria-label="Emoji del área">' +
          '<span class="grow"><input class="inp-plain" data-f="catName" data-id="' + esc(c.id) + '" value="' + esc(c.name) + '"></span>' +
          '<span class="catdot" style="background:' + esc(c.color) + ';width:13px;height:13px"></span>' +
          (S.cats.length > 1 ? '<button class="delbtn" data-a="catDel" data-id="' + esc(c.id) + '" aria-label="Eliminar área">' + I('trash', 17) + '</button>' : '') +
          '</div>';
      }).join('') +
      '</div>',
      '<button class="btn ghost xs" data-a="newCat">' + I('plus', 14) + 'Nueva</button>');

    /* --- respaldo --- */
    h += sect('Respaldo',
      '<div class="list">' + link('save', 'Copia de seguridad', 'sheetBackup') + '</div>' +
      '<p class="tiny">No hay Google Drive ni iCloud: eso necesitaría un servidor. Tu copia es un texto que puedes guardar donde quieras y pegar en otro dispositivo.</p>');

    /* --- soporte y legal --- */
    h += sect('Soporte',
      '<div class="list">' +
      link('help', 'Cómo funciona la app', 'sheetDoc', ' data-doc="ayuda"') +
      link('mail', 'Enviar feedback', 'sheetDoc', ' data-doc="feedback"') +
      link('file', 'Términos y condiciones', 'sheetDoc', ' data-doc="terminos"') +
      link('lock', 'Política de privacidad', 'sheetDoc', ' data-doc="privacidad"') +
      '</div>');

    h += '<div class="sect">' +
      '<button class="btn danger block" data-a="logout">' + I('logout', 18) + 'Cerrar sesión</button>' +
      '<p class="tiny" style="text-align:center">Brújula de Vida · todo se guarda en este navegador</p></div>';

    h += '</div></div>';
    return h;
  };
})();
/* ==========================================================================
   Hojas emergentes: detalle de meta (Descripción / Pasos), Mi Yo del Futuro,
   edición del tablero, respaldo, contraseña, categorías y documentos.
   ========================================================================== */
(function () {
  'use strict';
  var S = App.S, ui = App.ui, esc = App.esc;

  var DOCS = {
    terminos: ['file', 'Términos y condiciones',
      'Brújula de Vida es una herramienta personal que funciona por completo dentro de tu navegador.\n\n' +
      '1. No hay servidor. No enviamos, recibimos ni almacenamos nada fuera de tu dispositivo.\n' +
      '2. La app se ofrece tal cual, sin garantía de disponibilidad ni de conservación de tus datos.\n' +
      '3. Tú eres responsable de tus copias de seguridad. Si borras los datos del navegador, tu contenido desaparece.\n' +
      '4. No es asesoramiento médico, psicológico ni financiero. Es un cuaderno con estructura.\n' +
      '5. Puedes dejar de usarla cuando quieras: borrar los datos desde Perfil elimina todo de forma inmediata y definitiva.'],
    privacidad: ['lock', 'Política de privacidad',
      'La versión corta: no recogemos nada.\n\n' +
      '• Qué se guarda: tus textos, metas, rutinas, fotos del tablero y ajustes, en el almacenamiento local de este navegador.\n' +
      '• Quién puede verlo: quien tenga acceso a este dispositivo y a este navegador. Nadie más.\n' +
      '• Contraseña: nunca se guarda. Se guarda una derivación PBKDF2-SHA256 con sal aleatoria, de la que no se puede volver atrás.\n' +
      '• Cookies y rastreo: ninguno. No hay analítica, ni publicidad, ni terceros.\n' +
      '• Salidas a internet: solo las tipografías de Google, sin enviar la dirección de esta página. Ninguna otra petición.\n' +
      '• Tu respaldo no lleva la contraseña: si restauras en otro dispositivo, tendrás que crear una nueva.\n' +
      '• Tus derechos: puedes exportar todo o borrarlo entero desde Perfil › Copia de seguridad.'],
    seguridad: ['shield', 'Cómo se protege tu cuenta',
      'Lo primero, con honestidad: esta app no tiene servidor. La pantalla de inicio de sesión protege tus datos de quien coja el móvil, no de quien controle el dispositivo. Quien tenga acceso al navegador puede leer el almacenamiento local. No guardes aquí nada que no dejarías en un cuaderno sobre la mesa.\n\n' +
      'Dicho eso, lo que sí se puede hacer bien, está hecho:\n\n' +
      '• Contraseña — se deriva con PBKDF2-SHA256, 210.000 iteraciones y una sal aleatoria de 16 bytes. Nunca se guarda lo que escribes.\n' +
      '• Comparación — en tiempo constante, para no filtrar información por lo que tarda en responder.\n' +
      '• Reglas — mínimo 8 caracteres, se rechazan las más usadas y las secuencias obvias.\n' +
      '• Fuerza bruta — tras cinco fallos seguidos hay que esperar, y la espera se dobla en cada intento.\n' +
      '• Sesión — caduca a los 14 días; si no marcas «mantener la sesión», al cerrar la pestaña.\n' +
      '• Cambio de contraseña — pide la actual y cierra la sesión, para que haya que volver a entrar.\n' +
      '• Mensajes de error — nunca dicen si falló el correo o la contraseña.\n' +
      '• Aleatoriedad — todos los identificadores salen de crypto.getRandomValues, no de Math.random, y no son correlativos.\n' +
      '• Imágenes — se comprueba tipo, peso y tamaño, se rechazan los SVG (pueden llevar scripts) y todo se recodifica a JPEG, lo que descarta los metadatos EXIF.\n' +
      '• Respaldos — el texto que pegas se valida campo a campo contra un esquema estricto antes de tocar nada.\n' +
      '• Sin código dinámico — no se usa eval ni se carga ningún script externo.'],
    ayuda: ['help', 'Cómo funciona',
      '1. Hoy — es la pantalla de inicio. Marca la rutina de día y la de noche y tu racha empieza a contar. Con eso solo, la app ya sirve.\n\n' +
      '2. Chequeo de vida — siete pantallas cortas para medir cómo estás en cada área. Repítelo cada pocos meses; el historial te muestra si subes o bajas.\n\n' +
      '3. Mi Yo del Futuro — una frase por área sobre dónde quieres estar en 5 años. De ahí sale tu Visión.\n\n' +
      '4. Metas — corto plazo (menos de 1 año) y largo plazo. Dentro de cada una defines los pasos; el porcentaje sale solo de los pasos marcados.\n\n' +
      '5. Pasos a metas — cuando un paso de una meta de largo plazo tiene fecha a menos de un año, puedes convertirlo en meta de corto plazo con un botón.\n\n' +
      '6. Sincronizar — reparte los pasos de una meta por el calendario para que aparezcan el día que toca. El calendario vive dentro de la app: no se conecta con Google Calendar porque eso necesitaría un servidor y permisos de tu cuenta.\n\n' +
      '7. Rutinas — marca la rutina de día y la de noche; el calendario se pinta de verde, ámbar o rojo según lo que cumplas, y de ahí sale tu racha.\n\n' +
      'Consejo: haz una copia de seguridad de vez en cuando desde Perfil.'],
    feedback: ['mail', 'Enviar feedback',
      'Esta versión no tiene servidor, así que no puede enviar mensajes por sí sola.\n\n' +
      'Si algo no funciona o echas algo en falta, apúntalo aquí abajo: se guarda con el resto de tus datos y aparecerá en tu copia de seguridad, de forma que puedas copiarlo y mandarlo por donde prefieras.']
  };

  var COLORS = ['#5b6ee1', '#e07a45', '#d9527a', '#c9971f', '#2f9268', '#3d9bb0', '#7a63d6', '#b06ab8'];

  function head(icon, title, extra) {
    return '<div class="sheet-head"><div class="grabber"></div>' +
      '<div class="appbar-row">' + (icon ? '<span style="color:var(--ink-3)">' + I(icon, 21) + '</span>' : '') +
      '<h1>' + title + '</h1>' +
      '<button class="iconbtn" data-a="closeSheet" aria-label="Cerrar">' + I('x') + '</button></div>' +
      (extra || '') + '</div>';
  }

  /* ------------------------------------------------------------ meta: hoja */
  function goalSheet(k, id) {
    var g = App.findGoal(k, id);
    if (!g) return head('target', 'Meta') + '<div class="sheet-body"><p class="muted">Esta meta ya no existe.</p></div>';
    var isS = k === 'S';

    var tabs = '<div class="seg" role="tablist">' +
      '<button role="tab" aria-selected="' + (ui.sheetTab === 'desc') + '" data-a="sheetTab" data-s="desc">Descripción</button>' +
      '<button role="tab" aria-selected="' + (ui.sheetTab === 'steps') + '" data-a="sheetTab" data-s="steps">Pasos</button></div>';

    var h = head(isS ? 'zap' : 'mountain', isS ? 'Meta a corto plazo' : 'Meta a largo plazo', tabs);
    h += '<div class="sheet-body">';

    if (ui.sheetTab === 'desc') {
      h += '<label class="field"><span>Nombre</span>' +
        '<input class="inp" data-f="gname" data-k="' + k + '" data-id="' + esc(id) + '" value="' + esc(g.name || '') + '" placeholder="¿Qué quieres conseguir?"></label>';

      h += '<label class="field"><span>' + (isS ? 'Motivación' : 'Por qué') + '</span>' +
        '<textarea class="ta" data-f="gmot" data-k="' + k + '" data-id="' + esc(id) + '" placeholder="' +
        (isS ? '¿Por qué esta meta y no otra?' : '¿Qué cambia en tu vida si lo consigues?') + '">' + esc(g.motivation || '') + '</textarea></label>';

      if (isS) {
        h += '<label class="field"><span>Recompensa</span>' +
          '<input class="inp" data-f="grew" data-k="S" data-id="' + esc(id) + '" value="' + esc(g.reward || '') + '" placeholder="¿Cómo lo vas a celebrar?"></label>';
      }

      h += '<label class="field"><span>' + (isS ? 'Plazo' : 'Fecha límite') + '</span>' +
        '<input class="inp" type="date" data-f="gdue" data-k="' + k + '" data-id="' + esc(id) + '" value="' + esc(g.due || '') + '"></label>';

      h += '<label class="field"><span>Categoría</span>' +
        '<select class="sel" data-f="gcat" data-k="' + k + '" data-id="' + esc(id) + '">' + App.catOptions(g.cat) + '</select></label>';

      if (isS) {
        h += '<div class="field"><span>Prioridad</span><div class="seg3" style="margin-top:4px">' +
          ['Alta', 'Media', 'Baja'].map(function (p) {
            return '<button data-a="gprio" data-id="' + esc(id) + '" data-v="' + p + '" aria-pressed="' + (g.priority === p) + '">' +
              '<span class="catdot" style="width:11px;height:11px;background:var(--' + (p === 'Alta' ? 'bad' : p === 'Media' ? 'warn' : 'good') + ')"></span>' + p + '</button>';
          }).join('') + '</div></div>';
      }

      var d = App.due(g.due, g.done);
      h += '<div class="card sunk"><div class="spread"><span class="muted">Estado</span>' +
        '<span class="pill ' + d.cls + '">' + (d.cls === 'bad' ? I('flame', 13) : '') + esc(d.txt) + '</span></div></div>';

    } else {
      var steps = g.steps || (g.steps = []);
      h += '<p class="tiny">El porcentaje de la meta sale de los pasos que marques aquí.' +
        (isS ? '' : ' Un paso con fecha a menos de un año puede pasar a ser una meta de corto plazo.') + '</p>';

      if (!steps.length) {
        h += '<div class="empty" style="padding:18px 0"><span class="ee">' + I('ladder', 30) + '</span><p>Sin pasos todavía. Divide la meta en trozos que quepan en una tarde.</p></div>';
      } else {
        h += '<div class="steps">';
        steps.forEach(function (s) {
          var near = s.due && App.diff(App.today(), s.due) >= 0 && App.diff(App.today(), s.due) < 365;
          h += '<div class="step' + (s.done ? ' done' : '') + '">' +
            '<button class="chk sm" role="checkbox" aria-checked="' + !!s.done + '" data-a="stepDone" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" aria-label="Marcar paso">' + I('check', 15) + '</button>' +
            '<span class="sfields">' +
            '<input class="inp-plain" style="font-weight:600" data-f="sname" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" value="' + esc(s.name || '') + '" placeholder="Nombre del paso">' +
            '<input class="inp-plain" style="font-size:12.5px;color:var(--ink-2)" data-f="sdesc" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" value="' + esc(s.desc || '') + '" placeholder="Descripción (opcional)">' +
            '<span class="row" style="gap:8px;margin-top:5px">' +
            '<input class="inp" type="date" style="padding:5px 9px;font-size:12.5px;width:auto" data-f="sdue" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" value="' + esc(s.due || '') + '" aria-label="Fecha del paso">' +
            (!isS && near ? '<button class="btn ghost xs" data-a="promote" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '">' + I('upRight', 14) + 'A corto plazo</button>' : '') +
            '</span></span>' +
            '<button class="delbtn" data-a="stepDel" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" aria-label="Eliminar paso" title="Eliminar paso">' + I('trash', 17) + '</button>' +
            '</div>';
        });
        h += '</div>';
      }
      h += '<div class="row" style="gap:8px"><input class="inp grow" data-add="step" placeholder="Añadir un paso">' +
        '<button class="fab sm" data-a="stepAdd" data-k="' + k + '" data-id="' + esc(id) + '" aria-label="Añadir paso">' + I('plus') + '</button></div>';
      h += '<button class="btn soft block" data-a="sync" data-k="' + k + '" data-id="' + esc(id) + '">' + I('refresh', 18) + 'Sincronizar con el calendario</button>';
      h += '<p class="tiny">Sincronizar coloca cada paso con fecha en su día del calendario, dentro de la app.</p>';
    }

    h += '<div class="divider"></div>' +
      '<button class="btn danger block" data-a="gdelSheet" data-k="' + k + '" data-id="' + esc(id) + '">' + I('trash', 17) + 'Eliminar esta meta</button>';
    h += '</div>';
    return h;
  }

  /* -------------------------------------------------- mi yo del futuro: hoja */
  function futureSheet(cid) {
    var c = App.cat(cid), f = S.future[cid] || {};
    return head('', esc(c ? c.emoji + '  ' + c.name : 'Área')) +
      '<div class="sheet-body">' +
      '<label class="field"><span>En 5 años quiero…</span>' +
      '<textarea class="ta" data-f="fgoal" data-c="' + esc(cid) + '" placeholder="Una sola frase. Concreta y en presente.">' + esc(f.goal || '') + '</textarea></label>' +
      '<label class="field"><span>¿Por qué esto importa? (opcional)</span>' +
      '<textarea class="ta" data-f="fwhy" data-c="' + esc(cid) + '" placeholder="Lo que te vas a decir el día que te dé pereza.">' + esc(f.why || '') + '</textarea></label>' +
      '<button class="btn block" data-a="saveFuture">Guardar</button>' +
      (f.goal ? '<button class="btn danger block" data-a="clearFuture" data-c="' + esc(cid) + '">Borrar esta área</button>' : '') +
      '</div>';
  }

  /* ----------------------------------------------------- tablero: editar tile */
  function tileSheet(i) {
    var t = S.board[i];
    if (!t) return head('image', 'Tarjeta') + '<div class="sheet-body"><p class="muted">Ya no existe.</p></div>';
    return head(t.kind === 'img' ? 'image' : 'quote', t.kind === 'img' ? 'Texto de la imagen' : 'Frase') +
      '<div class="sheet-body">' +
      '<label class="field"><span>' + (t.kind === 'img' ? 'Pie de la imagen' : 'Tu frase') + '</span>' +
      '<textarea class="ta" data-f="tilecap" data-i="' + i + '" placeholder="' +
      (t.kind === 'img' ? 'Qué representa para ti' : 'Lo que quieres recordar cada día') + '">' + esc(t.cap || '') + '</textarea></label>' +
      '<button class="btn block" data-a="closeSheet">Listo</button>' +
      '<button class="btn danger block" data-a="boardDel" data-i="' + i + '">' + I('trash', 17) + 'Eliminar tarjeta</button>' +
      '</div>';
  }

  /* --------------------------------------------------------------- plantillas */
  function plantillasSheet() {
    return head('sparkle', 'Frases para empezar') +
      '<div class="sheet-body">' +
      '<p class="muted">Toca una para añadirla a tu tablero. Después puedes editarla.</p>' +
      '<div class="stack sm">' +
      V.PLANTILLAS.map(function (p, i) {
        return '<button class="btn soft block" style="justify-content:flex-start;text-align:left;white-space:normal;border-radius:var(--r-sm)" data-a="addPlantilla" data-i="' + i + '">' + esc(p) + '</button>';
      }).join('') +
      '</div></div>';
  }

  /* ------------------------------------------------------------ nueva categoría */
  function catSheet() {
    return head('grid', 'Nueva área de vida') +
      '<div class="sheet-body">' +
      '<div class="row" style="gap:10px">' +
      '<input class="inp" id="ncEmoji" value="⭐" maxlength="4" style="width:64px;text-align:center;font-size:20px" aria-label="Emoji">' +
      '<input class="inp grow" id="ncName" placeholder="Nombre del área"></div>' +
      '<div class="field"><span>Color</span><div class="chips" style="margin-top:4px">' +
      COLORS.map(function (c, i) {
        return '<button class="chipbtn" data-a="ncColor" data-v="' + c + '" aria-pressed="' + (i === 0) + '" style="background:' + c + ';border-color:' + c + ';color:#fff;width:38px">&nbsp;</button>';
      }).join('') + '</div></div>' +
      '<button class="btn block" data-a="addCat">Crear área</button></div>';
  }

  /* ------------------------------------------------------------- contraseña */
  function passSheet() {
    return head('lock', S.account && S.account.pass ? 'Cambiar contraseña' : 'Crear contraseña') +
      '<div class="sheet-body">' +
      (S.account
        ? (S.account.pass
            ? '<label class="field"><span>Contraseña actual</span><input class="inp" type="password" id="pwOld"></label>'
            : '<p class="notice">Esta cuenta no tiene contraseña (viene de un respaldo: las contraseñas no viajan en él). Crea una nueva.</p>') +
          '<label class="field"><span>Nueva contraseña</span><input class="inp" type="password" id="pwNew" placeholder="Mínimo 8 caracteres"></label>' +
          '<label class="field"><span>Repite la nueva</span><input class="inp" type="password" id="pwNew2"></label>' +
          '<p class="tiny" id="pwMsg" style="min-height:16px"></p>' +
          '<button class="btn block" data-a="savePass">Guardar</button>' +
          '<p class="notice">La contraseña solo desbloquea la app en este dispositivo y se guarda sin cifrar. No uses la de tu correo.</p>'
        : '<p class="muted">Estás usando la app sin cuenta, así que no hay contraseña que cambiar.</p>' +
          '<button class="btn block" data-a="go" data-s="register">Crear una cuenta</button>') +
      '</div>';
  }

  /* ---------------------------------------------------------------- respaldo */
  function backupSheet() {
    return head('save', 'Copia de seguridad') +
      '<div class="sheet-body">' +
      '<p class="muted">Este texto es todo lo que hay en la app. Cópialo y guárdalo donde quieras; para restaurarlo, pégalo aquí y pulsa Restaurar.</p>' +
      '<textarea class="ta" id="bkBox" spellcheck="false" style="height:180px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px">' +
      esc(JSON.stringify(S)) + '</textarea>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap">' +
      '<button class="btn sm" data-a="bkCopy">' + I('copy', 16) + 'Copiar</button>' +
      '<button class="btn soft sm" data-a="bkRestore">Restaurar</button>' +
      '<button class="btn danger sm" data-a="bkWipe">Borrar todo</button></div>' +
      '<p class="tiny" id="bkMsg" style="min-height:16px"></p>' +
      '</div>';
  }

  /* ------------------------------------------------------------- documentos */
  function docSheet(key) {
    var d = DOCS[key] || ['info', 'Documento', ''];
    var h = head(d[0], esc(d[1])) + '<div class="sheet-body">' +
      '<p style="white-space:pre-wrap;font-size:14px;line-height:1.65;color:var(--ink-2)">' + esc(d[2]) + '</p>';
    if (key === 'feedback') {
      h += '<label class="field"><span>Tu nota</span>' +
        '<textarea class="ta" data-f="feedback" placeholder="Qué te gustaría que hiciera la app…">' + esc(S.feedback || '') + '</textarea></label>';
    }
    h += '<button class="btn block" data-a="closeSheet">Cerrar</button></div>';
    return h;
  }

  /* --------------------------------------------------- revisión de la semana */
  function reviewSheet() {
    var wStart = ui.reviewWeek || App.weekStart(App.today());
    var w = App.weekStats(wStart), rv = App.review(wStart);
    var prev = App.weekStats(App.shift(wStart, -7));
    var dFull = w.full - prev.full;
    var isThis = wStart === App.weekStart(App.today());
    var comparable = prev.elapsed && S.start && App.diff(S.start, App.shift(wStart, -7)) >= 0;

    var nav = '<div class="spread">' +
      '<span class="muted">' + esc(App.cap(App.weekLabel(wStart))) + (isThis ? ' · en curso' : '') + '</span>' +
      '<span class="row" style="gap:0">' +
      '<button class="iconbtn" data-a="revWeek" data-d="-7" aria-label="Semana anterior">' + I('left', 18) + '</button>' +
      '<button class="iconbtn" data-a="revWeek" data-d="0" aria-label="Esta semana">' + I('pin', 17) + '</button>' +
      '<button class="iconbtn" data-a="revWeek" data-d="7" aria-label="Semana siguiente"' +
      (isThis ? ' disabled style="opacity:.3"' : '') + '>' + I('right', 18) + '</button></span></div>';

    var h = head('rotate', 'Revisión semanal', nav) + '<div class="sheet-body">';

    h += '<div class="row" style="gap:16px;align-items:flex-start">' +
      '<div><div class="display" style="font-size:2.6rem">' + w.full + '</div>' +
      '<div class="tiny">' + (w.full === 1 ? 'día completo' : 'días completos') + ' de ' + w.elapsed + '</div></div>' +
      '<div class="grow" style="padding-top:5px"><p class="tiny num" style="line-height:1.9">' +
      '<strong style="color:var(--warn)">' + w.partial + '</strong> ' + (w.partial === 1 ? 'día a medias' : 'días a medias') + '<br>' +
      '<strong>' + w.marks + '</strong> ' + (w.marks === 1 ? 'hábito marcado' : 'hábitos marcados') + '<br>' +
      '<strong>' + w.notes + '</strong> ' + (w.notes === 1 ? 'nota escrita' : 'notas escritas') + '</p></div>' +
      (comparable ? '<span class="pill num ' + (dFull > 0 ? 'good' : dFull < 0 ? 'bad' : '') + '">' +
        (dFull > 0 ? I('up', 13) + '+' + dFull : dFull < 0 ? I('down', 13) + Math.abs(dFull) : '=') + '</span>' : '') +
      '</div>';

    h += '<div class="divider"></div>';
    h += '<label class="field"><span>¿Qué funcionó?</span>' +
      '<textarea class="ta" style="min-height:62px" data-f="revWon" data-w="' + wStart + '" placeholder="Lo que repetirías tal cual.">' + esc(rv.won) + '</textarea></label>';
    h += '<label class="field"><span>¿Qué ajustas?</span>' +
      '<textarea class="ta" style="min-height:62px" data-f="revAdjust" data-w="' + wStart + '" placeholder="Un cambio concreto, no una promesa general.">' + esc(rv.adjust) + '</textarea></label>';
    h += '<label class="field"><span>Tu foco para la semana que viene</span>' +
      '<input class="inp" data-f="revFocus" data-w="' + wStart + '" value="' + esc(rv.focus) + '" placeholder="Una sola cosa."></label>';

    var pf = S.reviews[App.shift(wStart, -7)];
    if (pf && pf.focus) h += '<p class="tiny">El foco de la semana pasada fue: <strong>' + esc(pf.focus) + '</strong></p>';

    h += '<button class="btn block" data-a="closeSheet">Listo</button></div>';
    return h;
  }

  /* ------------------------------------------------------------------ reto */
  function challengeSheet() {
    var c = S.challenge;
    var h = head('zap', 'Reto de 30 días') + '<div class="sheet-body">';
    if (!c) {
      h += '<p class="muted">Elige una sola cosa y sostenla 30 días: suficiente para saber si te sirve, corto para no rendirte.</p>' +
        '<div class="row" style="gap:8px"><input class="inp grow" data-add="challenge" placeholder="Ej. 30 días sin azúcar">' +
        '<input class="inp num" id="chDays" type="number" min="3" max="365" value="30" style="width:72px" aria-label="Días"></div>' +
        '<button class="btn accent block" data-a="addChallenge">Empezar el reto</button></div>';
      return h;
    }
    var days = +c.days || 30, doneN = Object.keys(c.done || {}).length;
    var dayIdx = App.clamp(App.diff(c.start, App.today()) + 1, 1, days);
    var status = doneN >= days ? 'good' : (App.diff(c.start, App.today()) + 1 > days ? 'bad' : 'warn');
    var label = status === 'good' ? I('trophy', 13) + 'Completado' : status === 'bad' ? I('sleep', 13) + 'Fallido' : I('zap', 13) + 'Activo';

    h += '<div class="spread"><input class="inp-plain" style="font-weight:650;font-size:15px" data-f="chName" value="' + esc(c.name) + '">' +
      '<span class="pill ' + status + '">' + label + '</span></div>' +
      '<div class="row" style="gap:11px"><span class="bar grow"><span style="width:' + (doneN / days * 100).toFixed(1) + '%;background:var(--warn)"></span></span>' +
      '<span class="bv num">' + Math.round(doneN / days * 100) + '%</span></div>' +
      '<p class="tiny num" style="margin-top:-6px">Día ' + dayIdx + ' de ' + days + ' · ' + App.plural(doneN, 'día marcado', 'días marcados') + '</p>' +
      '<div class="cal" style="grid-template-columns:repeat(auto-fill,minmax(32px,1fr))">';
    var t = App.today();
    for (var i = 1; i <= days; i++) {
      var dk = App.shift(c.start, i - 1), on = !!(c.done || {})[dk], future = App.diff(t, dk) > 0;
      h += '<button data-a="chDay" data-day="' + dk + '"' + (future ? ' disabled' : '') +
        ' class="' + (on ? 's-warn' : '') + (dk === t ? ' today' : '') + '" title="' + esc(App.fmt(dk)) + '">' + i + '</button>';
    }
    h += '</div><div class="row" style="gap:8px">' +
      '<button class="btn ghost xs" data-a="chRestart">' + I('rotate', 14) + 'Reiniciar</button>' +
      '<button class="btn danger xs" data-a="chDel">' + I('trash', 14) + 'Eliminar</button></div>';
    return h + '</div>';
  }

  /* ---------------------------------------------------------------- logros */
  function winsSheet() {
    var wins = S.wins.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var h = head('trophy', 'Todo lo que has logrado') + '<div class="sheet-body">';
    h += '<p class="muted">La memoria guarda mal las victorias y muy bien los fallos. Esta lista corrige ese sesgo.</p>';
    h += '<div class="row" style="gap:8px;flex-wrap:wrap"><input class="inp grow" data-add="win" placeholder="¿Qué has conseguido?" style="min-width:150px">' +
      '<input class="inp" type="date" id="winDate" value="' + App.today() + '" aria-label="Fecha del logro">' +
      '<button class="fab sm" data-a="addWin" aria-label="Añadir logro">' + I('plus') + '</button></div>';
    if (wins.length) {
      h += '<div class="steps">';
      wins.forEach(function (w) {
        h += '<div class="step" style="align-items:center">' +
          '<span style="color:var(--warn)">' + I('trophy', 17) + '</span>' +
          '<span class="sfields"><input class="inp-plain" data-f="winText" data-id="' + esc(w.id) + '" value="' + esc(w.text) + '"></span>' +
          '<span class="tiny num">' + esc(App.fmt(w.date)) + '</span>' +
          '<button class="delbtn" data-a="winDel" data-id="' + esc(w.id) + '" aria-label="Eliminar logro">' + I('trash', 17) + '</button></div>';
      });
      h += '</div>';
    } else {
      h += '<div class="empty" style="padding:16px 0"><span class="ee">' + I('trophy', 30) + '</span>' +
        '<p>Empieza por algo de este mismo año que ya dabas por hecho: cuenta igual.</p></div>';
    }
    return h + '</div>';
  }

  /* --------------------------------------------------- historial de chequeos */
  function rcSheet() {
    var h = head('compass', 'Chequeos de vida') + '<div class="sheet-body">';
    h += '<button class="btn accent block" data-a="newRC">' + I('plus', 17) + 'Hacer un chequeo ahora</button>';
    if (!S.rc.length) {
      h += '<div class="empty" style="padding:18px 0"><span class="ee">' + I('compass', 30) + '</span>' +
        '<p>Son siete pantallas cortas que miden cómo estás en cada área de tu vida. Repetirlo cada pocos meses te enseña si de verdad avanzas.</p></div>';
      return h + '</div>';
    }
    h += '<div class="steps">';
    S.rc.slice().reverse().forEach(function (r, idx) {
      var i = S.rc.length - 1 - idx;
      var avg = App.rcAvg(r), prev = i > 0 ? App.rcAvg(S.rc[i - 1]) : null;
      var d = prev == null ? null : Math.round((avg - prev) * 10) / 10;
      h += '<div class="step" style="align-items:center">' +
        '<button class="row grow" style="background:none;border:0;padding:0;gap:11px;text-align:left" data-a="viewRC" data-id="' + esc(r.id) + '">' +
        '<span class="thumb" style="width:34px;height:34px;border-radius:10px">' + I('eye', 17) + '</span>' +
        '<span class="grow"><span style="display:block;font-weight:650;font-size:14px">' + esc(App.cap(App.fmt(r.date))) + '</span>' +
        '<span class="tiny num">Media ' + avg + ' de 10</span></span>' +
        (d == null ? '' : '<span class="pill num ' + (d > 0 ? 'good' : d < 0 ? 'bad' : '') + '">' +
          (d > 0 ? I('up', 13) + '+' + d : d < 0 ? I('down', 13) + d : '0') + '</span>') +
        '</button>' +
        '<button class="delbtn" data-a="rcDel" data-id="' + esc(r.id) + '" aria-label="Eliminar chequeo">' + I('trash', 17) + '</button>' +
        '</div>';
    });
    return h + '</div></div>';
  }

  /* ------------------------------------------------------------- despachador */
  V.sheet = function () {
    var s = ui.sheet;
    if (!s) return '';
    if (s.t === 'goal') return goalSheet(s.k, s.id);
    if (s.t === 'future') return futureSheet(s.c);
    if (s.t === 'tile') return tileSheet(s.i);
    if (s.t === 'plantillas') return plantillasSheet();
    if (s.t === 'cat') return catSheet();
    if (s.t === 'pass') return passSheet();
    if (s.t === 'backup') return backupSheet();
    if (s.t === 'doc') return docSheet(s.doc);
    if (s.t === 'review') return reviewSheet();
    if (s.t === 'challenge') return challengeSheet();
    if (s.t === 'wins') return winsSheet();
    if (s.t === 'rc') return rcSheet();
    return '';
  };
  V.DOCS = DOCS;
})();
/* ==========================================================================
   Enrutado, pintado y todas las acciones de la app.
   ========================================================================== */
(function () {
  'use strict';
  var S = App.S, ui = App.ui, esc = App.esc;

  /* ------------------------------------------------------------- pintado */
  function tabbar() {
    var items = [['hoy', 'sunrise', 'Hoy'], ['metas', 'target', 'Metas'], ['vision', 'leaf', 'Visión'], ['progreso', 'chart', 'Progreso']];
    return '<nav class="tabbar" role="tablist">' + items.map(function (it) {
      return '<button role="tab" aria-selected="' + (ui.tab === it[0] || (it[0] === 'hoy' && ui.tab === 'perfil')) + '" data-a="tab" data-t="' + it[0] + '">' +
        '<span class="ti">' + I(it[1], 21) + '</span>' + it[2] + '</button>';
    }).join('') + '</nav>';
  }

  function grow(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 60) + 'px';
  }
  function growAll(scope) {
    var t = scope.querySelectorAll('textarea');
    for (var i = 0; i < t.length; i++) grow(t[i]);
  }

  var SCREENS = { splash: 1, login: 1, register: 1, rc: 1, rcsum: 1, future: 1, vs: 1, app: 1 };

  function render() {
    var root = document.getElementById('root'), h = '', s = ui.screen;
    if (!SCREENS[s]) {
      root.innerHTML = '<div class="scroll nonav" style="display:flex;flex-direction:column;justify-content:center;min-height:100dvh;gap:18px;text-align:center">' +
        '<span style="color:var(--ink-3);margin:0 auto">' + I('compass', 44) + '</span>' +
        '<h1 style="font-family:var(--disp);font-size:1.9rem;font-weight:600;letter-spacing:-.02em">Aquí no hay nada</h1>' +
        '<p class="muted" style="max-width:30ch;margin:0 auto">Esa pantalla no existe. Tus datos siguen intactos.</p>' +
        '<button class="btn block" data-a="tab" data-t="metas" style="margin-top:8px">Volver a Metas</button></div>';
      return;
    }
    if (s === 'splash') h = V.splash();
    else if (s === 'login') h = V.login();
    else if (s === 'register') h = V.register();
    else if (s === 'rc') h = V.rc();
    else if (s === 'rcsum') h = V.rcsum(ui.viewRC);
    else if (s === 'future') h = V.future();
    else if (s === 'vs') h = V.vs();
    else {
      h = ui.tab === 'hoy' ? V.hoy()
        : ui.tab === 'metas' ? V.metas()
          : ui.tab === 'vision' ? V.vision()
            : ui.tab === 'progreso' ? V.progreso() : V.perfil();
      h += tabbar();
    }
    root.innerHTML = h;
    growAll(root);
    if (ui.refocus) {
      var el = document.getElementById(ui.refocus);
      if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { } }
      ui.refocus = null;
    }
  }

  var FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  var lastFocus = null;

  function renderSheet() {
    var w = document.getElementById('sheetWrap'), box = document.getElementById('sheet');
    if (!ui.sheet) { w.classList.remove('open'); box.innerHTML = ''; return; }
    box.innerHTML = V.sheet();
    w.classList.add('open');
    growAll(box);
  }
  // Al cerrar una hoja se vuelve a pintar la pantalla entera, así que el
  // botón que la abrió ya no es el mismo nodo: se recuerda cómo encontrarlo.
  function openerSelector(el) {
    if (!el || !el.getAttribute) return null;
    var a = el.getAttribute('data-a');
    if (!a || !/^[a-zA-Z]+$/.test(a)) return null;
    var sel = '[data-a="' + a + '"]';
    ['data-id', 'data-doc', 'data-k', 'data-i'].forEach(function (k) {
      var v = el.getAttribute(k);
      if (v != null && /^[A-Za-z0-9_-]*$/.test(v)) sel += '[' + k + '="' + v + '"]';
    });
    return sel;
  }
  function openSheet(o) {
    lastFocus = openerSelector(document.activeElement);
    ui.sheet = o; renderSheet();
    var box = document.getElementById('sheet');
    var f = box.querySelector(FOCUSABLE);
    if (f) f.focus();
  }
  function closeSheet() {
    var back = lastFocus; lastFocus = null;
    ui.sheet = null; renderSheet(); render();
    if (back) {
      var t = document.querySelector(back);
      if (t) { try { t.focus(); } catch (e) { } }
    }
  }

  // Mientras la hoja está abierta, el tabulador no se escapa detrás de ella.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !ui.sheet) return;
    var box = document.getElementById('sheet');
    var f = box.querySelectorAll(FOCUSABLE);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  });

  function goApp(tab) { ui.screen = 'app'; if (tab) ui.tab = tab; render(); window.scrollTo(0, 0); }

  // Cuando se toca algo que se ve a la vez en la pantalla y en una hoja
  // abierta, hay que repintar las dos.
  function refresh() { render(); if (ui.sheet) renderSheet(); }

  function focusAdd(name) {
    var el = document.querySelector('[data-add="' + name + '"]');
    if (el) el.focus();
  }
  function scrollToReview() {
    setTimeout(function () {
      var els = document.querySelectorAll('.label');
      for (var i = 0; i < els.length; i++) {
        if (/revisi/i.test(els[i].textContent)) { els[i].scrollIntoView({ block: 'start' }); return; }
      }
    }, 60);
  }

  /* ------------------------------------------------------------ acciones */
  function startRC() {
    S.rcDraft = App.newDraft();
    ui.rcStep = 0; ui.rcOpen = false; ui.screen = 'rc';
    App.save(); render(); window.scrollTo(0, 0);
  }

  function commitDraft() {
    var d = S.rcDraft;
    if (d && Object.keys(d.scores || {}).length) { S.rc.push(d); S.rcDraft = null; return true; }
    S.rcDraft = null; return false;
  }

  function newGoal(kind) {
    var g = {
      id: App.uid(), name: '', done: false, cat: '', motivation: '', steps: [],
      due: kind === 'S' ? App.inDays(30) : App.inDays(730)
    };
    if (kind === 'S') { g.reward = ''; g.priority = 'Media'; S.goalsS.unshift(g); }
    else S.goalsL.unshift(g);
    App.save();
    ui.sheetTab = 'desc';
    render();
    openSheet({ t: 'goal', k: kind, id: g.id });
    setTimeout(function () {
      var el = document.querySelector('#sheet [data-f="gname"]');
      if (el) el.focus();
    }, 60);
  }

  // Pasa una tarea a otro día; con `to` vacío vuelve a los pendientes sin fecha.
  function moveEvent(from, id, to) {
    var list = S.events[from] || [], e = list.filter(function (x) { return x.id === id; })[0];
    if (!e || to === from) return;
    if (to && !/^\d{4}-\d\d-\d\d$/.test(to)) return;
    if (to && (S.events[to] || []).length >= 60) { App.toast('Ese día ya está lleno.'); return; }
    if (!to && S.todo.length >= 200) { App.toast('Ya tienes muchos pendientes sin fecha: quita alguno.'); return; }
    S.events[from] = list.filter(function (x) { return x.id !== id; });
    if (!S.events[from].length) delete S.events[from];
    if (to) {
      (S.events[to] = S.events[to] || []).push(e);
      // Reprogramar un paso de meta también cambia su fecha en Metas, para
      // que el calendario no vuelva a colocarlo en el día antiguo.
      var st = V.stepLink(e);
      if (st) st.due = to;
    }
    else S.todo.unshift({ id: e.id, title: e.title, kind: e.kind, goalId: e.goalId || '', sid: e.sid || '' });
    ui.moveId = null;
    App.save(); render();
    App.toast(to ? 'Pasada al ' + App.fmt(to) + '.' : 'Guardada en pendientes sin fecha.');
  }

  function promote(goalId, stepId) {
    var g = App.byId(S.goalsL, goalId); if (!g) return;
    var st = App.byId(g.steps || [], stepId); if (!st || st.promoted) return;
    st.promoted = true;
    S.goalsS.unshift({
      id: App.uid(), name: st.name || 'Paso sin nombre', done: !!st.done, cat: g.cat,
      motivation: 'Paso de la meta «' + (g.name || 'sin nombre') + '»',
      reward: '', priority: 'Media', due: st.due || App.inDays(90), steps: []
    });
    App.save();
    App.toast('«' + (st.name || 'El paso') + '» ya es una meta de corto plazo.');
  }

  function sync(kind, id) {
    var g = App.findGoal(kind, id); if (!g) return;
    var n = 0;
    function put(day, title, sid) {
      if (!day) return;
      if (!S.events[day]) S.events[day] = [];
      var dup = S.events[day].some(function (e) { return e.goalId === g.id && e.sid === sid; });
      if (dup) return;
      S.events[day].push({ id: App.uid(), title: title, goalId: g.id, sid: sid });
      n++;
    }
    (g.steps || []).forEach(function (s) {
      put(s.due, (g.name || 'Meta') + ' · ' + (s.name || 'paso'), s.id);
    });
    put(g.due, 'Fecha límite · ' + (g.name || 'meta'), '__due');
    App.save(); render();
    App.toast(n ? n + (n === 1 ? ' tarea colocada en el calendario.' : ' tareas colocadas en el calendario.') : 'Nada nuevo que colocar: pon fechas a los pasos.');
  }

  function armedDelete(el, run) {
    if (el.getAttribute('data-armed') === '1') { run(); return; }
    el.setAttribute('data-armed', '1');
    el.innerHTML = I('check', 17);
    el.setAttribute('title', 'Pulsa otra vez para confirmar');
    App.toast('Pulsa otra vez para confirmar.');
    setTimeout(function () {
      if (!el.parentNode) return;
      el.removeAttribute('data-armed'); el.innerHTML = I('trash', 17);
    }, 3500);
  }

  /* --------------------------------------------------------------- clics */
  document.addEventListener('click', function (e) {
    /* escala de tres valores del Reality Check */
    var three = e.target.closest('[data-rc3]');
    if (three) {
      var tk = three.getAttribute('data-rc3');
      S.rcDraft.scores[tk] = +three.getAttribute('data-v');
      var sibs = document.querySelectorAll('[data-rc3="' + tk + '"]');
      for (var z = 0; z < sibs.length; z++) sibs[z].setAttribute('aria-pressed', sibs[z] === three ? 'true' : 'false');
      App.save();
      return;
    }

    var el = e.target.closest('[data-a]');
    if (!el) return;
    var a = el.getAttribute('data-a'),
      id = el.getAttribute('data-id'),
      k = el.getAttribute('data-k'),
      v = el.getAttribute('data-v'),
      sid = el.getAttribute('data-s');

    /* --- navegación --- */
    if (a === 'go') { ui.screen = sid; ui.viewRC = null; render(); window.scrollTo(0, 0); return; }
    if (a === 'tab') { closeSheetSilent(); goApp(el.getAttribute('data-t')); return; }
    if (a === 'sub') { ui.subMetas = sid; render(); return; }
    if (a === 'subv') { ui.subVision = sid; render(); return; }
    if (a === 'closeSheet') { e.preventDefault(); closeSheet(); return; }

    if (a === 'togglepw') {
      e.preventDefault();
      ui.showPw = !ui.showPw;
      var wrap = el.closest('form') || document;
      var pws = wrap.querySelectorAll('input[type="password"], input[data-pw]');
      var all = wrap.querySelectorAll('#liPass,#rgPass,#rgPass2');
      for (var i = 0; i < all.length; i++) {
        all[i].type = ui.showPw ? 'text' : 'password';
        all[i].setAttribute('data-pw', '1');
      }
      el.innerHTML = I(ui.showPw ? 'eyeOff' : 'eye', 19);
      return;
    }
    if (a === 'forgot') {
      e.preventDefault();
      App.toast('No hay servidor que envíe correos. Si olvidaste la contraseña, entra sin cuenta: tus datos siguen ahí.');
      return;
    }
    if (a === 'legal' || a === 'sheetDoc') { e.preventDefault(); openSheet({ t: 'doc', doc: el.getAttribute('data-doc') }); return; }

    /* --- entrada --- */
    if (a === 'guest') {
      openSession('keep'); S.guest = true; S.onboarded = true;
      App.saveNow(); goApp('hoy');
      return;
    }
    if (a === 'enterApp') { S.onboarded = true; App.saveNow(); goApp('hoy'); return; }
    if (a === 'goReview') {
      ui.reviewWeek = null; ui.tab = 'progreso'; ui.screen = 'app';
      render(); openSheet({ t: 'review' });
      return;
    }
    if (a === 'sheetChallenge') { openSheet({ t: 'challenge' }); return; }
    if (a === 'sheetWins') { openSheet({ t: 'wins' }); return; }
    if (a === 'sheetRC') { openSheet({ t: 'rc' }); return; }
    if (a === 'dismiss') { S.dismissed[id] = App.today(); App.save(); render(); return; }
    if (a === 'openAddRoutine') { ui.addRoutine = k; ui.editRoutine = null; render(); focusAdd('r' + k); return; }
    if (a === 'editRoutine') { ui.editRoutine = ui.editRoutine === k ? null : k; ui.addRoutine = null; render(); return; }
    if (a === 'openNote') { ui.noteOpen = true; render(); var na = document.querySelector('[data-f="note"]'); if (na) na.focus(); return; }
    if (a === 'suggest') {
      var kk = k;
      (kk === 'S' ? S.goalsS : S.goalsL).unshift({
        id: App.uid(), name: v, done: false, cat: el.getAttribute('data-c') || '',
        motivation: '', reward: '', priority: 'Media',
        due: App.inDays(kk === 'S' ? 90 : 730), steps: []
      });
      App.save(); render();
      App.toast('«' + v + '» añadida. Ábrela para ponerle pasos.');
      return;
    }
    if (a === 'google') {
      if (window.Sync && window.Sync.google) window.Sync.google();
      else App.toast('El acceso con Google no está disponible ahora mismo.');
      return;
    }
    if (a === 'dologin') { e.preventDefault(); doLogin(); return; }
    if (a === 'doregister') { e.preventDefault(); doRegister(); return; }
    if (a === 'skipProfile') { startRC(); return; }
    if (a === 'startRC') { startRC(); return; }
    if (a === 'week') { S.profile.weekStart = +v; App.save(); render(); return; }
    if (a === 'rmPhoto') { S.profile.photo = ''; App.save(); render(); return; }

    /* --- reality check --- */
    if (a === 'rcAcc') {
      var acc = el.closest('.acc');
      ui.rcOpen = acc.getAttribute('data-open') !== 'true';
      acc.setAttribute('data-open', ui.rcOpen ? 'true' : 'false');
      if (ui.rcOpen) growAll(acc);
      return;
    }
    if (a === 'rcBack') { ui.rcStep = Math.max(0, ui.rcStep - 1); ui.rcOpen = false; render(); window.scrollTo(0, 0); return; }
    if (a === 'rcNext') {
      if (ui.rcStep < App.RC_AREAS.length - 1) { ui.rcStep++; ui.rcOpen = false; App.save(); render(); window.scrollTo(0, 0); }
      else {
        if (!commitDraft()) { App.toast('Mueve al menos un deslizador para guardar tu check.'); return; }
        App.save(); ui.viewRC = null; ui.screen = 'rcsum'; render(); window.scrollTo(0, 0);
      }
      return;
    }
    if (a === 'rcExit') {
      var had = commitDraft();
      S.onboarded = true; App.save();
      goApp('hoy');
      if (had) App.toast('Chequeo guardado. Lo tienes en Visión.');
      return;
    }
    if (a === 'newRC') { closeSheetSilent(); startRC(); return; }
    if (a === 'viewRC') {
      var r = App.byId(S.rc, id);
      if (r) { closeSheetSilent(); ui.viewRC = r; ui.screen = 'rcsum'; render(); window.scrollTo(0, 0); }
      return;
    }
    if (a === 'rcDel') {
      armedDelete(el, function () {
        S.rc = S.rc.filter(function (x) { return x.id !== id; });
        App.save(); refresh(); App.toast('Chequeo eliminado.');
      });
      return;
    }

    /* --- mi yo del futuro --- */
    if (a === 'openFuture') { openSheet({ t: 'future', c: el.getAttribute('data-c') }); return; }
    if (a === 'saveFuture') { App.saveNow(); closeSheet(); App.toast('Guardado.'); return; }
    if (a === 'clearFuture') { delete S.future[el.getAttribute('data-c')]; App.save(); closeSheet(); return; }
    if (a === 'saveFutureOnly') { App.saveNow(); goApp('vision'); return; }
    if (a === 'finishOnboarding') { finishOnboarding(); return; }

    /* --- calendario --- */
    if (a === 'cal') {
      var y = +ui.calMonth.slice(0, 4), m = +ui.calMonth.slice(5, 7) + (+el.getAttribute('data-d'));
      var nd = new Date(y, m - 1, 1);
      ui.calMonth = nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0');
      render(); return;
    }
    if (a === 'calToday') { ui.selDay = App.today(); ui.calMonth = ui.selDay.slice(0, 7); render(); return; }
    if (a === 'pickDay') { ui.selDay = el.getAttribute('data-day'); render(); return; }
    if (a === 'evdel') {
      var day = el.getAttribute('data-day');
      S.events[day] = (S.events[day] || []).filter(function (x) { return x.id !== id; });
      if (!S.events[day].length) delete S.events[day];
      App.save(); render(); return;
    }

    /* --- Hoy: preparar el día, plan semanal, completar y reprogramar --- */
    if (a === 'planDay') { ui.planDay = el.getAttribute('data-day'); ui.moveId = null; render(); return; }
    if (a === 'planWeek') { ui.planDay = App.shift(ui.planDay || App.today(), +v); ui.moveId = null; render(); return; }
    if (a === 'evdone') {
      var ed = (S.events[el.getAttribute('data-day')] || []).filter(function (x) { return x.id === id; })[0];
      if (ed) {
        var nv = !V.isDone(ed), lst = V.stepLink(ed);
        ed.done = nv;
        if (lst) lst.done = nv;        // el paso de la meta se marca a la vez
        App.save(); render();
      }
      return;
    }
    if (a === 'gsDone') {
      var gx = App.findGoal(k, id), gs = gx && App.byId(gx.steps || [], sid);
      if (gs) { gs.done = !gs.done; App.save(); render(); }
      return;
    }
    if (a === 'gsEdit') {
      // El paso pasa a ser una tarea de hoy enlazada; así se le puede poner hora o moverlo.
      var gy = App.findGoal(k, id), gs2 = gy && App.byId(gy.steps || [], sid), td = App.today();
      if (!gs2) return;
      if (!S.events[td]) S.events[td] = [];
      if (S.events[td].length >= 60) { App.toast('Ese día ya está lleno.'); return; }
      var ne = { id: App.uid(), title: (gy.name || 'Meta') + ' · ' + (gs2.name || 'paso'), goalId: gy.id, sid: gs2.id, time: '', done: !!gs2.done, kind: 'task' };
      S.events[td].push(ne);
      ui.moveId = ne.id;
      App.save(); render(); return;
    }
    if (a === 'overdueAll') {
      var tdy = App.today(), moved = 0;
      if (!S.events[tdy]) S.events[tdy] = [];
      for (var oi = 14; oi >= 1; oi--) {
        var od = App.shift(tdy, -oi), keep = [];
        (S.events[od] || []).forEach(function (x) {
          if (!V.isDone(x) && S.events[tdy].length < 60) {
            S.events[tdy].push(x); moved++;
            var ls = V.stepLink(x); if (ls) ls.due = tdy;
          } else keep.push(x);
        });
        if (S.events[od]) { if (keep.length) S.events[od] = keep; else delete S.events[od]; }
      }
      App.save(); render();
      App.toast(moved ? App.plural(moved, 'tarea pasada', 'tareas pasadas') + ' a hoy.' : 'Hoy ya está lleno.');
      return;
    }
    if (a === 'ntMore') { ui.ntMore = !ui.ntMore; render(); return; }
    if (a === 'toggleNight') { ui.nightOpen = true; render(); return; }
    if (a === 'evmove') { ui.moveId = ui.moveId === id ? null : id; render(); return; }
    if (a === 'evto') { moveEvent(el.getAttribute('data-day'), id, el.getAttribute('data-to')); return; }
    if (a === 'ntKind') { ui.ntKind = v === 'appt' ? 'appt' : 'task'; render(); return; }
    if (a === 'ntAdd' || a === 'ntAddTodo') {
      var ntT = String(ui.ntTitle || '').trim();
      if (!ntT) { App.toast('Escribe primero qué es.'); return; }
      var ntK = ui.ntKind === 'appt' ? 'appt' : 'task';
      if (a === 'ntAddTodo') {
        if (S.todo.length >= 200) { App.toast('Ya tienes muchos pendientes sin fecha: quita alguno.'); return; }
        S.todo.unshift({ id: App.uid(), title: ntT, kind: ntK });
      } else {
        var pd = /^\d{4}-\d\d-\d\d$/.test(ui.ntDate || '') ? ui.ntDate : App.today();
        if (!S.events[pd]) S.events[pd] = [];
        if (S.events[pd].length >= 60) { App.toast('Ese día ya está lleno.'); return; }
        S.events[pd].push({ id: App.uid(), title: ntT, goalId: '', sid: '', time: /^([01]\d|2[0-3]):[0-5]\d$/.test(ui.ntTime || '') ? ui.ntTime : '', done: false, kind: ntK });
      }
      ui.ntTitle = ''; ui.ntTime = ''; ui.ntDate = '';
      App.save(); render(); return;
    }
    if (a === 'todoPull') {
      var tp = S.todo.filter(function (x) { return x.id === id; })[0];
      if (!tp) return;
      var pd2 = App.today();
      if (!S.events[pd2]) S.events[pd2] = [];
      if (S.events[pd2].length >= 60) { App.toast('Ese día ya está lleno.'); return; }
      S.events[pd2].push({ id: App.uid(), title: tp.title, goalId: tp.goalId || '', sid: tp.sid || '', time: '', done: false, kind: tp.kind });
      var tps = V.stepLink(S.events[pd2][S.events[pd2].length - 1]); if (tps) tps.due = pd2;
      S.todo = S.todo.filter(function (x) { return x.id !== id; });
      App.save(); render(); return;
    }
    if (a === 'tododel') { S.todo = S.todo.filter(function (x) { return x.id !== id; }); App.save(); render(); return; }

    /* --- rutinas --- */
    if (a === 'rtoggle') {
      var lg = App.rlog(ui.selDay), arr = lg[k], p = arr.indexOf(id);
      if (p >= 0) arr.splice(p, 1); else arr.push(id);
      if (!lg.day.length && !lg.night.length && ui.selDay !== App.today()) { /* se conserva para marcar el día en rojo */ }
      App.save(); render(); return;
    }
    if (a === 'radd') {
      var inp = document.querySelector('[data-add="r' + k + '"]');
      var nm = inp && inp.value.trim();
      if (!nm) { App.toast('Escribe el nombre del hábito.'); return; }
      S.routines[k].push({ id: App.uid(), name: nm });
      ui.addRoutine = k;
      App.save(); render(); focusAdd('r' + k);
      App.toast('Hábito añadido.');
      return;
    }
    if (a === 'rdel') {
      armedDelete(el, function () {
        S.routines[k] = S.routines[k].filter(function (x) { return x.id !== id; });
        Object.keys(S.rlog).forEach(function (d) {
          if (S.rlog[d] && S.rlog[d][k]) S.rlog[d][k] = S.rlog[d][k].filter(function (x) { return x !== id; });
        });
        App.save(); render();
      });
      return;
    }

    /* --- metas --- */
    if (a === 'newGoal') { newGoal(k); return; }
    if (a === 'openGoal') { ui.sheetTab = 'desc'; openSheet({ t: 'goal', k: k, id: id }); return; }
    if (a === 'sheetTab') { ui.sheetTab = sid; renderSheet(); return; }
    if (a === 'gdone') {
      var g = App.findGoal(k, id);
      if (g) { g.done = !g.done; if (g.done && g.steps) g.steps.forEach(function (s) { s.done = true; }); }
      App.save(); render(); return;
    }
    if (a === 'gdel') {
      armedDelete(el, function () {
        if (k === 'S') S.goalsS = S.goalsS.filter(function (x) { return x.id !== id; });
        else S.goalsL = S.goalsL.filter(function (x) { return x.id !== id; });
        App.save(); render(); App.toast('Meta eliminada.');
      });
      return;
    }
    if (a === 'gdelSheet') {
      if (k === 'S') S.goalsS = S.goalsS.filter(function (x) { return x.id !== id; });
      else S.goalsL = S.goalsL.filter(function (x) { return x.id !== id; });
      App.save(); closeSheet(); App.toast('Meta eliminada.');
      return;
    }
    if (a === 'gprio') {
      var gg = App.findGoal('S', id); if (gg) gg.priority = v;
      App.save(); renderSheet(); render(); return;
    }
    if (a === 'clearQ') { ui.goalQ = ''; ui.refocus = 'goalSearch'; App.save(); render(); return; }
    if (a === 'filter') { ui.goalFilter = v; render(); return; }
    if (a === 'progCat') { ui.progCat = v; render(); return; }
    if (a === 'revWeek') {
      var dd = +el.getAttribute('data-d');
      var base = ui.reviewWeek || App.weekStart(App.today());
      var next = dd === 0 ? App.weekStart(App.today()) : App.shift(base, dd);
      if (App.diff(App.weekStart(App.today()), next) > 0) return;   // no se revisa el futuro
      ui.reviewWeek = next; refresh(); return;
    }
    if (a === 'goGoals') { ui.tab = 'metas'; ui.subMetas = 'goals'; ui.goalFilter = ''; render(); window.scrollTo(0, 0); return; }

    /* --- pasos --- */
    if (a === 'stepAdd') {
      var si = document.querySelector('#sheet [data-add="step"]');
      var nm2 = si && si.value.trim();
      if (!nm2) { App.toast('Escribe el paso.'); return; }
      var g2 = App.findGoal(k, id); if (!g2) return;
      if (!g2.steps) g2.steps = [];
      g2.steps.push({ id: App.uid(), name: nm2, desc: '', due: '', done: false });
      App.save(); renderSheet(); render(); return;
    }
    if (a === 'stepDone') {
      var g3 = App.findGoal(k, id); if (!g3) return;
      var st = App.byId(g3.steps || [], sid); if (st) st.done = !st.done;
      App.save(); renderSheet(); render(); return;
    }
    if (a === 'stepDel') {
      armedDelete(el, function () {
        var g4 = App.findGoal(k, id); if (!g4) return;
        g4.steps = (g4.steps || []).filter(function (x) { return x.id !== sid; });
        App.save(); renderSheet(); render(); App.toast('Paso eliminado.');
      });
      return;
    }
    if (a === 'promote') { promote(id, sid); renderSheet(); render(); return; }
    if (a === 'sync') { sync(k, id); return; }

    /* --- tablero de visión --- */
    if (a === 'addQuote') {
      S.board.unshift({ id: App.uid(), kind: 'quote', cap: '' });
      App.save(); render(); openSheet({ t: 'tile', i: 0 }); return;
    }
    if (a === 'plantillas') { openSheet({ t: 'plantillas' }); return; }
    if (a === 'addPlantilla') {
      S.board.unshift({ id: App.uid(), kind: 'quote', cap: V.PLANTILLAS[+el.getAttribute('data-i')] });
      App.save(); closeSheet(); App.toast('Frase añadida al tablero.'); return;
    }
    if (a === 'boardEdit') { openSheet({ t: 'tile', i: +el.getAttribute('data-i') }); return; }
    if (a === 'boardDel') {
      var bi = +el.getAttribute('data-i');
      S.board.splice(bi, 1); App.save();
      if (ui.sheet && ui.sheet.t === 'tile') { closeSheet(); } else { render(); }
      App.toast('Tarjeta eliminada.'); return;
    }
    if (a === 'boardMove') {
      var i2 = +el.getAttribute('data-i'), d2 = +el.getAttribute('data-d'), j = i2 + d2;
      if (j < 0 || j >= S.board.length) return;
      var tmp = S.board[i2]; S.board[i2] = S.board[j]; S.board[j] = tmp;
      App.save(); render(); return;
    }

    /* --- visión a 5 años --- */
    if (a === 'visionAdd') {
      S.visions.push({ id: App.uid(), text: '', date: App.today() });
      App.save(); render();
      var tas = document.querySelectorAll('[data-f="vision"]');
      if (tas.length) tas[tas.length - 1].focus();
      return;
    }
    if (a === 'visionDel') {
      armedDelete(el, function () {
        S.visions = S.visions.filter(function (x) { return x.id !== id; });
        App.save(); render();
      });
      return;
    }

    /* --- progreso --- */
    if (a === 'hideGoal') { S.hidden[id] = true; App.save(); render(); App.toast('Meta oculta del progreso.'); return; }
    if (a === 'showAll') {
      (k === 'all' ? App.allGoals() : (k === 'S' ? S.goalsS : S.goalsL))
        .forEach(function (g) { delete S.hidden[g.id]; });
      App.save(); render(); return;
    }

    /* --- reto --- */
    if (a === 'addChallenge') {
      var ci = document.querySelector('[data-add="challenge"]'), cd = document.getElementById('chDays');
      var nm3 = (ci && ci.value.trim()) || 'Reto de 30 días';
      S.challenge = { name: nm3, days: App.clamp(+(cd && cd.value) || 30, 3, 365), start: App.today(), done: {} };
      App.save(); refresh(); return;
    }
    if (a === 'chDay') {
      var dk = el.getAttribute('data-day');
      if (!S.challenge.done) S.challenge.done = {};
      if (S.challenge.done[dk]) delete S.challenge.done[dk]; else S.challenge.done[dk] = true;
      App.save(); refresh(); return;
    }
    if (a === 'chRestart') { S.challenge.start = App.today(); S.challenge.done = {}; App.save(); refresh(); return; }
    if (a === 'chDel') { S.challenge = null; App.save(); refresh(); return; }

    /* --- logros --- */
    if (a === 'addWin') {
      var wi = document.querySelector('[data-add="win"]'), wd = document.getElementById('winDate');
      var tx = wi && wi.value.trim();
      if (!tx) { App.toast('Escribe qué has conseguido.'); return; }
      S.wins.push({ id: App.uid(), text: tx, date: (wd && wd.value) || App.today() });
      App.save(); refresh(); return;
    }
    if (a === 'winDel') {
      armedDelete(el, function () {
        S.wins = S.wins.filter(function (x) { return x.id !== id; });
        App.save(); refresh();
      });
      return;
    }

    /* --- perfil --- */
    if (a === 'theme') { S.prefs.theme = v; App.applyTheme(); paintChrome(); App.save(); render(); return; }
    if (a === 'notifs') { S.prefs.notifs = !S.prefs.notifs; App.save(); render(); return; }
    if (a === 'pushReminder') {
      if (!window.Sync) return;
      var rs3 = window.Sync.reminderState();
      if (rs3.active) window.Sync.disableReminder();
      else window.Sync.enableReminder(rs3.hour || 20);
      return;
    }
    if (a === 'saveAccount') { App.saveNow(); App.toast('Cambios guardados.'); return; }
    if (a === 'logout') {
      S.session = false; S.sessionAt = 0;
      try { sessionStorage.removeItem('brujula.live'); } catch (er0) { }
      if (window.Sync && window.Sync.signOut) window.Sync.signOut();
      ui.screen = 'splash'; App.saveNow(); render(); window.scrollTo(0, 0);
      App.toast('Sesión cerrada. Tus datos siguen en este dispositivo.');
      return;
    }
    if (a === 'newCat') { ui.newCatColor = '#5b6ee1'; openSheet({ t: 'cat' }); return; }
    if (a === 'ncColor') {
      ui.newCatColor = v;
      var sw = document.querySelectorAll('#sheet [data-a="ncColor"]');
      for (var q = 0; q < sw.length; q++) sw[q].setAttribute('aria-pressed', sw[q].getAttribute('data-v') === v);
      return;
    }
    if (a === 'addCat') {
      var ne = document.getElementById('ncEmoji'), nn = document.getElementById('ncName');
      var nmc = nn && nn.value.trim();
      if (!nmc) { App.toast('Ponle un nombre al área.'); return; }
      S.cats.push({ id: App.uid(), emoji: (ne && ne.value.trim()) || '⭐', name: nmc, color: ui.newCatColor || '#5b6ee1' });
      App.save(); closeSheet(); App.toast('Área creada.'); return;
    }
    if (a === 'catDel') {
      armedDelete(el, function () {
        S.cats = S.cats.filter(function (c) { return c.id !== id; });
        App.allGoals().forEach(function (g) { if (g.cat === id) g.cat = ''; });
        delete S.future[id];
        App.save(); render();
      });
      return;
    }
    if (a === 'sheetPass') { openSheet({ t: 'pass' }); return; }
    if (a === 'savePass') { savePass(); return; }
    if (a === 'sheetBackup') { openSheet({ t: 'backup' }); return; }
    if (a === 'bkCopy') {
      var box = document.getElementById('bkBox'); box.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (er) { ok = false; }
      if (!ok && navigator.clipboard) { navigator.clipboard.writeText(box.value).then(function () { }, function () { }); ok = true; }
      if (ok) { S.lastBackup = App.today(); App.saveNow(); }
      document.getElementById('bkMsg').textContent = ok ? 'Copiado. Pégalo en una nota y ya tienes tu respaldo.' : 'Selecciona el texto y cópialo a mano.';
      return;
    }
    if (a === 'bkRestore') { restore(); return; }
    if (a === 'bkWipe') {
      if (el.getAttribute('data-armed') !== '1') {
        el.setAttribute('data-armed', '1'); el.textContent = '¿Seguro? Pulsa otra vez';
        setTimeout(function () { if (el.parentNode) { el.removeAttribute('data-armed'); el.textContent = 'Borrar todo'; } }, 4000);
        return;
      }
      var fresh = App.defaults(), kk;
      for (kk in fresh) if (Object.prototype.hasOwnProperty.call(fresh, kk)) S[kk] = fresh[kk];
      try { localStorage.removeItem(App.curKey()); } catch (er2) { }
      try { sessionStorage.removeItem('brujula.live'); } catch (er3) { }
      ui.screen = 'splash'; ui.tab = 'metas';
      App.applyTheme(); closeSheet(); render();
      App.toast('Todo borrado.');
      return;
    }
  });

  function closeSheetSilent() { ui.sheet = null; var w = document.getElementById('sheetWrap'); if (w) w.classList.remove('open'); }

  document.getElementById('sheetWrap').addEventListener('click', function (e) {
    if (e.target === this) closeSheet();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.sheet) closeSheet();
  });

  /* -------------------------------------------------- entrada y registro */
  var busy = false;

  // Nada de botones que no responden: mientras se calcula, se ve que se calcula.
  function busyBtn(sel, on, label) {
    var b = document.querySelector(sel);
    if (!b) return;
    if (on) {
      if (!b.getAttribute('data-prev')) b.setAttribute('data-prev', b.innerHTML);
      b.setAttribute('data-busy', '1');
      b.innerHTML = I('loader', 18) + (label || 'Un momento…');
    } else {
      b.removeAttribute('data-busy');
      var prev = b.getAttribute('data-prev');
      if (prev) { b.innerHTML = prev; b.removeAttribute('data-prev'); }
    }
  }

  function markLive() {
    try { sessionStorage.setItem('brujula.live', '1'); } catch (e) { /* modo privado */ }
  }
  function openSession(mode) {
    S.session = true; S.guest = false;
    S.sessionMode = mode === 'temp' ? 'temp' : 'keep';
    S.sessionAt = Date.now();
    markLive();
  }

  function doLogin() {
    if (busy) return;
    var m = (document.getElementById('liMail') || {}).value || '';
    var p = (document.getElementById('liPass') || {}).value || '';
    var keep = document.getElementById('liKeep');
    var err = document.getElementById('liErr');
    var userKey = App.findKey(m);
    if (!userKey) { err.textContent = 'No hay ninguna cuenta con ese correo en este dispositivo. Regístrate o entra sin cuenta.'; return; }
    if (userKey !== App.curKey()) App.switchUser(userKey);
    if (!S.account) { err.textContent = 'No hay ninguna cuenta en este dispositivo. Regístrate o entra sin cuenta.'; return; }
    if (!S.account.pass) {
      err.textContent = 'Esta cuenta viene de un respaldo y no trae contraseña válida. Entra sin cuenta y créala desde Perfil › Seguridad.';
      return;
    }
    var left = Sec.lockLeft(S.auth);
    if (left) {
      err.textContent = 'Demasiados intentos seguidos. Espera ' + left + ' segundos antes de volver a probar.';
      return;
    }
    busy = true; err.style.color = 'var(--ink-2)'; err.textContent = 'Comprobando…';
    busyBtn('[data-a="dologin"]', true, 'Comprobando…');
    Sec.verifyPass(p, S.account.pass).then(function (okPass) {
      busy = false; busyBtn('[data-a="dologin"]', false);
      err.style.color = 'var(--bad)';
      // Correo y contraseña se comprueban juntos y con el mismo mensaje:
      // así no se puede averiguar cuál de los dos era el correcto.
      var okMail = Sec.equal(m.trim().toLowerCase(), String(S.account.email).toLowerCase());
      if (!okPass || !okMail) {
        Sec.noteFail(S.auth); App.saveNow();
        var l2 = Sec.lockLeft(S.auth);
        err.textContent = 'El correo o la contraseña no coinciden.' +
          (l2 ? ' Espera ' + l2 + ' segundos.' : (S.auth.fails >= 3 ? ' Tras cinco fallos habrá que esperar.' : ''));
        return;
      }
      Sec.noteOk(S.auth);
      openSession(keep && keep.checked ? 'keep' : 'temp');
      App.saveNow();
      if (window.Sync) window.Sync.signIn(m.trim(), p);
      S.onboarded = true; goApp('hoy');
    }, function () {
      busy = false; busyBtn('[data-a="dologin"]', false); err.style.color = 'var(--bad)';
      err.textContent = 'Este navegador no permite comprobar la contraseña de forma segura. Entra sin cuenta.';
    });
  }

  // Google ya verificó quién es: se abre la sesión de la cuenta local de ese
  // correo (se crea sin contraseña propia si no existía) y se entra a la app.
  window.appGoogleLogin = function (user) {
    var mail = String(user && user.email || '').trim();
    if (!mail) return;
    if (S.session && S.account && String(S.account.email).toLowerCase() === mail.toLowerCase()) return;
    var key = App.findKey(mail);
    if (key && key !== App.curKey()) App.switchUser(key);
    else if (!key) {
      if (S.account && S.account.email) App.switchUser(App.newUserKey(mail));
    }
    if (!S.account) {
      var meta = user.user_metadata || {};
      S.account = { name: String(meta.full_name || meta.name || mail.split('@')[0]).slice(0, 80), email: mail, pass: '', created: App.today() };
      if (!S.profile.tz) S.profile.tz = V.guessTz();
    }
    openSession('keep');
    S.onboarded = true;
    App.saveNow();
    goApp('hoy');
  };

  function doRegister() {
    var n = (document.getElementById('rgName') || {}).value || '';
    var m = (document.getElementById('rgMail') || {}).value || '';
    var p = (document.getElementById('rgPass') || {}).value || '';
    var p2 = (document.getElementById('rgPass2') || {}).value || '';
    var t = document.getElementById('rgTerms');
    var err = document.getElementById('rgErr');
    if (!n.trim()) { err.textContent = 'Escribe tu nombre.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.trim())) { err.textContent = 'Ese correo no parece válido.'; return; }
    var weak = Sec.passProblem(p);
    if (weak) { err.textContent = weak; return; }
    if (p !== p2) { err.textContent = 'Las dos contraseñas no coinciden.'; return; }
    if (!t || !t.checked) { err.textContent = 'Tienes que aceptar los Términos y la Política de Privacidad.'; return; }
    if (App.findKey(m) && !(S.account && App.findKey(m) === App.curKey() && !S.account.pass)) {
      err.textContent = 'Ya hay una cuenta con ese correo en este dispositivo. Inicia sesión.'; return;
    }
    if (busy) return;
    busy = true; err.style.color = 'var(--ink-2)'; err.textContent = 'Protegiendo tu contraseña…';
    busyBtn('[data-a="doregister"]', true, 'Protegiendo…');
    // La contraseña nunca se guarda: se guarda su derivación PBKDF2 con sal.
    Sec.hashPass(p).then(function (rec) {
      busy = false; busyBtn('[data-a="doregister"]', false);
      // Si ya hay otra cuenta en este navegador, la nueva empieza con datos propios.
      if (S.account && S.account.email) App.switchUser(App.newUserKey(m));
      S.account = { name: n.trim(), email: m.trim(), pass: rec, created: App.today() };
      S.auth = { fails: 0, until: 0 };
      if (window.Sync) window.Sync.signUp(S.account.email, p);
      openSession('keep');
      if (!S.profile.tz) S.profile.tz = V.guessTz();
      ui.regStep = 2; App.saveNow(); render(); window.scrollTo(0, 0);
    }, function () {
      busy = false; busyBtn('[data-a="doregister"]', false); err.style.color = 'var(--bad)';
      err.textContent = 'Este navegador no permite proteger la contraseña. Puedes entrar sin cuenta y usar todo igual.';
    });
  }

  function savePass() {
    var o = (document.getElementById('pwOld') || {}).value || '';
    var n = (document.getElementById('pwNew') || {}).value || '';
    var n2 = (document.getElementById('pwNew2') || {}).value || '';
    var msg = document.getElementById('pwMsg');
    function bad(t) { msg.style.color = 'var(--bad)'; msg.textContent = t; }
    var weak = Sec.passProblem(n);
    if (weak) { bad(weak); return; }
    if (n !== n2) { bad('Las dos nuevas no coinciden.'); return; }
    if (busy) return;

    function apply() {
      Sec.hashPass(n).then(function (rec) {
        busy = false; busyBtn('#sheet [data-a="savePass"]', false);
        S.account.pass = rec;
        S.auth = { fails: 0, until: 0 };
        if (window.Sync) window.Sync.updatePassword(n);
        // Cambiar la contraseña invalida la sesión: hay que volver a entrar,
        // igual que en un servicio serio se cierran todas las sesiones abiertas.
        S.session = false; S.sessionAt = 0;
        try { sessionStorage.removeItem('brujula.live'); } catch (e) { }
        App.saveNow();
        ui.sheet = null; renderSheet();
        ui.screen = 'splash'; render(); window.scrollTo(0, 0);
        App.toast('Contraseña actualizada. Vuelve a entrar con la nueva.');
      }, function () { busy = false; busyBtn('#sheet [data-a="savePass"]', false); bad('No se pudo guardar la nueva contraseña en este navegador.'); });
    }

    busy = true; msg.style.color = 'var(--ink-2)'; msg.textContent = 'Comprobando…';
    busyBtn('#sheet [data-a="savePass"]', true, 'Comprobando…');
    // Reautenticación antes de una acción sensible.
    if (!S.account.pass) { apply(); return; }
    Sec.verifyPass(o, S.account.pass).then(function (ok) {
      if (!ok) { busy = false; busyBtn('#sheet [data-a="savePass"]', false); bad('La contraseña actual no es correcta.'); return; }
      apply();
    }, function () { busy = false; busyBtn('#sheet [data-a="savePass"]', false); bad('No se pudo comprobar la contraseña actual.'); });
  }

  function restore() {
    var box = document.getElementById('bkBox'), msg = document.getElementById('bkMsg');
    try {
      // El texto pegado es la única entrada externa de la app. No se mezcla
      // con el estado: se reconstruye campo a campo contra el esquema.
      var d = JSON.parse(box.value);
      var clean = Sec.sanitizeState(d, App.defaults()), kk;
      for (kk in clean) if (Object.prototype.hasOwnProperty.call(clean, kk)) S[kk] = clean[kk];
      if (!S.start) S.start = App.today();
      App.saveNow(); App.applyTheme();
      msg.style.color = 'var(--good)';
      msg.textContent = 'Respaldo restaurado.' + (S.account && !S.account.pass ? ' La contraseña no viajaba en él: créala desde Seguridad.' : '');
      render();
    } catch (e) {
      msg.style.color = 'var(--bad)';
      msg.textContent = 'Ese texto no es un respaldo válido. Pega el bloque entero, desde la primera llave hasta la última.';
    }
  }

  function finishOnboarding() {
    var fs = document.getElementById('firstStep');
    S.firstStep = fs ? fs.value.trim() : '';
    commitDraft();

    if (!S.visions.length) {
      var lines = [];
      S.cats.forEach(function (c) {
        var f = S.future[c.id];
        if (f && f.goal) lines.push(c.emoji + ' ' + f.goal);
      });
      if (lines.length) S.visions.push({ id: App.uid(), text: 'En 5 años:\n\n' + lines.join('\n'), date: App.today() });
    }
    if (S.firstStep) {
      S.goalsS.unshift({
        id: App.uid(), name: S.firstStep, done: false, cat: '',
        motivation: 'El primer paso que elegiste al empezar.', reward: '',
        priority: 'Alta', due: App.inDays(7), steps: []
      });
    }
    S.onboarded = true;
    App.saveNow();
    goApp('hoy');
    App.toast(S.firstStep ? 'Listo. Tu primer paso ya está en Metas.' : 'Listo. Tu visión está guardada.');
  }

  /* ------------------------------------------------------------- escritura */
  document.addEventListener('input', function (e) {
    var el = e.target;

    /* perfil (idioma, zona horaria) */
    var pf = el.getAttribute && el.getAttribute('data-p');
    if (pf) { S.profile[pf] = el.value; App.save(); return; }

    /* deslizadores del reality check */
    var rc = el.getAttribute && el.getAttribute('data-rc');
    if (rc) {
      var val = +el.value;
      S.rcDraft.scores[rc] = val;
      el.style.setProperty('--v', ((val - 1) / 9 * 100) + '%');
      var lab = document.querySelector('[data-sv="' + rc + '"]');
      if (lab) lab.textContent = val;
      App.save(); return;
    }
    if (el.hasAttribute && el.hasAttribute('data-rcadj')) { S.rcDraft.adjectives = el.value; App.save(); return; }
    var rn = el.getAttribute && el.getAttribute('data-rcnote');
    if (rn) { S.rcDraft.notes[rn] = el.value; grow(el); App.save(); return; }

    var f = el.getAttribute && el.getAttribute('data-f');
    if (!f) return;
    var id = el.getAttribute('data-id'), k = el.getAttribute('data-k'), sid = el.getAttribute('data-s');
    var g;

    if (f === 'ntTitle') { ui.ntTitle = el.value; return; }
    if (f === 'ntTime') { ui.ntTime = el.value; return; }
    if (f === 'ntDate') { ui.ntDate = el.value; return; }
    if (f === 'note') { if (el.value.trim()) S.notes[ui.selDay] = el.value; else delete S.notes[ui.selDay]; grow(el); App.save(); return; }
    if (f === 'vision') { var vv = App.byId(S.visions, id); if (vv) vv.text = el.value; grow(el); App.save(); return; }
    if (f === 'goalQ') { ui.goalQ = el.value; ui.refocus = 'goalSearch'; App.save(); render(); return; }
    if (f === 'rname') { var it = App.byId(S.routines[k], id); if (it) it.name = el.value; App.save(); return; }
    if (f === 'chName') { if (S.challenge) S.challenge.name = el.value; App.save(); return; }
    if (f === 'winText') { var w = App.byId(S.wins, id); if (w) w.text = el.value; App.save(); return; }
    if (f === 'revWon') { App.review(el.getAttribute('data-w')).won = el.value; grow(el); App.save(); return; }
    if (f === 'revAdjust') { App.review(el.getAttribute('data-w')).adjust = el.value; grow(el); App.save(); return; }
    if (f === 'revFocus') { App.review(el.getAttribute('data-w')).focus = el.value; App.save(); return; }
    if (f === 'catEmoji') { var c1 = App.cat(id); if (c1) c1.emoji = el.value; App.save(); return; }
    if (f === 'catName') { var c2 = App.cat(id); if (c2) c2.name = el.value; App.save(); return; }
    if (f === 'acName') { ensureAccount(); S.account.name = el.value; App.save(); return; }
    if (f === 'acMail') { ensureAccount(); S.account.email = el.value; App.save(); return; }
    if (f === 'feedback') { S.feedback = el.value; grow(el); App.save(); return; }
    if (f === 'tilecap') { var t2 = S.board[+el.getAttribute('data-i')]; if (t2) t2.cap = el.value; grow(el); App.save(); render(); return; }
    if (f === 'fgoal') { fut(el.getAttribute('data-c')).goal = el.value; grow(el); App.save(); return; }
    if (f === 'fwhy') { fut(el.getAttribute('data-c')).why = el.value; grow(el); App.save(); return; }

    if (f === 'gname') { g = App.findGoal(k, id); if (g) g.name = el.value; App.save(); render(); return; }
    if (f === 'gmot') { g = App.findGoal(k, id); if (g) g.motivation = el.value; grow(el); App.save(); return; }
    if (f === 'grew') { g = App.findGoal('S', id); if (g) g.reward = el.value; App.save(); return; }
    if (f === 'sname') { g = App.findGoal(k, id); var s1 = g && App.byId(g.steps || [], sid); if (s1) s1.name = el.value; App.save(); return; }
    if (f === 'sdesc') { g = App.findGoal(k, id); var s2 = g && App.byId(g.steps || [], sid); if (s2) s2.desc = el.value; App.save(); return; }
  });

  function ensureAccount() {
    if (!S.account) S.account = { name: '', email: '', pass: '', created: App.today() };
  }
  function fut(c) {
    if (!S.future[c]) S.future[c] = { goal: '', why: '' };
    return S.future[c];
  }

  /* ---------------------------------------------------------- cambios (change) */
  document.addEventListener('change', function (e) {
    var el = e.target;

    if (el.id === 'pushHour') {
      if (window.Sync) window.Sync.enableReminder(+el.value.split(':')[0] || 20);
      return;
    }
    if (el.id === 'pfPhoto' || el.id === 'pfPhoto2') {
      V.readImage(el.files && el.files[0], 256, function (data) {
        S.profile.photo = data; App.save(); render(); App.toast('Foto actualizada.');
      });
      return;
    }
    if (el.id === 'boardImg') {
      V.readImage(el.files && el.files[0], 720, function (data) {
        S.board.unshift({ id: App.uid(), kind: 'img', src: data, cap: '' });
        if (App.saveNow()) { render(); App.toast('Imagen añadida.'); }
        else { S.board.shift(); render(); }
      });
      return;
    }

    var f = el.getAttribute && el.getAttribute('data-f');
    if (!f) return;
    var id = el.getAttribute('data-id'), k = el.getAttribute('data-k'), sid = el.getAttribute('data-s'), g;

    if (f === 'evdate') { moveEvent(el.getAttribute('data-day'), id, el.value); return; }
    if (f === 'evtime') {
      var et = (S.events[el.getAttribute('data-day')] || []).filter(function (x) { return x.id === id; })[0];
      if (et) { et.time = /^([01]\d|2[0-3]):[0-5]\d$/.test(el.value) ? el.value : ''; App.save(); render(); }
      return;
    }
    if (f === 'gdue') { g = App.findGoal(k, id); if (g) g.due = el.value; App.save(); renderSheet(); render(); return; }
    if (f === 'gcat') {
      if (el.value === '__new') { ui.newCatColor = '#5b6ee1'; ui.catBack = { k: k, id: id }; openSheet({ t: 'cat' }); return; }
      g = App.findGoal(k, id); if (g) g.cat = el.value; App.save(); render(); return;
    }
    if (f === 'sdue') {
      g = App.findGoal(k, id); if (!g) return;
      var st = App.byId(g.steps || [], sid); if (!st) return;
      st.due = el.value;
      var auto = k === 'L' && st.due && !st.promoted && App.diff(App.today(), st.due) >= 0 && App.diff(App.today(), st.due) < 365;
      App.save();
      if (auto) promote(id, sid);
      renderSheet(); render();
      return;
    }
  });

  /* ------------------------------------------------------- envío de formularios */
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    if (e.target.id === 'loginForm') doLogin();
    if (e.target.id === 'regForm') doRegister();
  });

  /* --------------------------------------------------------- Enter para añadir */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var el = e.target, add = el.getAttribute && el.getAttribute('data-add');
    if (!add) return;
    e.preventDefault();
    var btn = null;
    if (add === 'rday') btn = document.querySelector('[data-a="radd"][data-k="day"]');
    if (add === 'rnight') btn = document.querySelector('[data-a="radd"][data-k="night"]');
    if (add === 'task') btn = document.querySelector('[data-a="ntAdd"]');
    if (add === 'step') btn = document.querySelector('#sheet [data-a="stepAdd"]');
    if (add === 'win') btn = document.querySelector('[data-a="addWin"]');
    if (add === 'challenge') btn = document.querySelector('[data-a="addChallenge"]');
    if (btn) btn.click();
  });

  /* -------------------------------------------------------------- arranque */
  // Ningún error suelto debe acabar enseñando una traza al usuario.
  var lastErr = 0;
  function friendly() {
    if (Date.now() - lastErr < 4000) return;
    lastErr = Date.now();
    App.toast('Algo no ha ido bien, pero tus datos están a salvo.');
  }
  window.addEventListener('error', friendly);
  window.addEventListener('unhandledrejection', friendly);

  // Detalles que hacen que parezca hecho por alguien: color de la barra del
  // navegador acorde al tema y descripción para cuando se comparte el enlace.
  function meta(name, content) {
    var m = document.querySelector('meta[name="' + name + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); }
    m.setAttribute('content', content);
  }
  function paintChrome() {
    var bg = getComputedStyle(document.body).backgroundColor || '#f2cfae';
    meta('theme-color', bg);
  }
  document.documentElement.lang = 'es';
  meta('description', 'Brújula de Vida: define quién quieres ser, mide si avanzas y ajusta cada semana. Funciona entero en tu navegador, sin cuentas ni servidor.');
  meta('color-scheme', 'light dark');

  // sync.js necesita poder repintar la pantalla cuando trae datos de la nube.
  window.appRender = render;

  App.load();
  if (!S.start) { S.start = App.today(); App.save(); }
  App.applyTheme();
  paintChrome();
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', paintChrome);
  } catch (e) { }

  // La sesión caduca: por cierre de pestaña si no se pidió recordarla,
  // y en cualquier caso a los 14 días.
  if (S.session) {
    var live = true;
    if (S.sessionMode === 'temp') {
      try { live = sessionStorage.getItem('brujula.live') === '1'; } catch (e) { live = false; }
    }
    var stale = S.sessionAt && (Date.now() - S.sessionAt) > 14 * 24 * 3600 * 1000;
    if (!live || stale) { S.session = false; S.sessionAt = 0; App.save(); }
  }

  // Atajos del icono de la pantalla de inicio: /?ir=hoy|metas|vision|progreso
  try {
    var ir = new URLSearchParams(location.search).get('ir');
    if (ir && ['hoy', 'metas', 'vision', 'progreso'].indexOf(ir) !== -1) ui.tab = ir;
  } catch (e) { }

  if (S.session) { ui.screen = 'app'; S.onboarded = true; }
  else ui.screen = 'splash';
  if (ui.screen === 'rc' && !S.rcDraft) S.rcDraft = App.newDraft();
  render();
})();
