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
    // Bienvenida. Quien ya usaba la app antes de que existiera no la ve de golpe.
    var wc = objOf(d.welcome), wcNueva = !d.welcome && !d.onboarded;
    out.welcome = {
      done: d.welcome ? !!wc.done : !wcNueva, pospuesta: !!wc.pospuesta, paso: n(wc.paso, 0, 4, 0),
      area: /^[A-Za-z0-9_-]{1,40}$/.test(String(wc.area || '')) ? String(wc.area) : '',
      cambio: s(wc.cambio, 400), meta: s(wc.meta, 120), vision: s(wc.vision, 400),
      freno: /^[a-z]{1,20}$/.test(String(wc.freno || '')) ? String(wc.freno) : '',
      borrador: wc.borrador ? {
        nombre: s(objOf(wc.borrador).nombre, 120),
        pasos: arrOf(objOf(wc.borrador).pasos, 6, function (x) { x = objOf(x); return { name: s(x.name, 200), due: dateOf(x.due) }; })
      } : null,
      realista: ['si', 'justo', 'no'].indexOf(wc.realista) >= 0 ? wc.realista : ''
    };
    out.session = !!d.session;
    out.guest = !!d.guest;
    out.sessionMode = d.sessionMode === 'temp' ? 'temp' : 'keep';
    out.sessionAt = n(d.sessionAt, 0, 4102444800000, 0);
    out.auth = { fails: n(objOf(d.auth).fails, 0, 999, 0), until: n(objOf(d.auth).until, 0, 4102444800000, 0) };

    var acc = objOf(d.account);
    var pw = passOf(acc.pass);
    var LOGINS = { email: 1, tel: 1, usuario: 1, red: 1 }, REDES = { google: 1, facebook: 1 };
    var phone = /^\+?\d{8,15}$/.test(String(acc.phone || '')) ? String(acc.phone) : '';
    var uname = /^[a-z0-9._-]{3,30}$/.test(String(acc.username || '')) ? String(acc.username) : '';
    out.account = (acc.email || acc.name || phone || uname)
      ? {
        name: s(acc.name, 120), email: s(acc.email, 254), pass: pw, created: dateOf(acc.created),
        login: LOGINS[acc.login] ? acc.login : 'email',                 // las cuentas antiguas son de correo
        phone: phone, username: uname,
        provider: REDES[acc.provider] ? acc.provider : '',
        providerId: s(acc.providerId, 128),
        nube: s(acc.nube, 254)                                          // correo con el que la cuenta está en la nube
      }
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
    function diasOf(v) {
      return Array.isArray(v) ? v.filter(function (d, i) { return [0, 1, 2, 3, 4, 5, 6].indexOf(d) >= 0 && v.indexOf(d) === i; }) : [];
    }
    function rItem(x) {
      x = objOf(x);
      var it = { id: idOf(x.id), name: s(x.name, L.name) }, dias = diasOf(x.days);
      if (dias.length && dias.length < 7) it.days = dias;
      if (dateOf(x.paused)) it.paused = dateOf(x.paused);
      return it;
    }
    var rd = arrOf(rt.day, 60, rItem), rn = arrOf(rt.night, 60, rItem);
    if (rd.length || rn.length) out.routines = { day: rd, night: rn };

    var rs = objOf(d.rest);
    out.rest = { week: diasOf(rs.week), dates: {} };
    keysOf(rs.dates, L.keys).forEach(function (k) { if (dateOf(k) && rs.dates[k]) out.rest.dates[k] = true; });

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
