/* ==========================================================================
   APLICACIÓN — casos de uso de cuentas y sesión: entrar con o sin cuenta,
   registrarse, Google, cerrar sesión, cambiar la contraseña y revisar si la
   sesión sigue viva al abrir la app.

   No lee formularios ni pinta: recibe los datos y devuelve el resultado.
   Lo que es inmediato se devuelve como { msg } (error) u { ok: true }; lo que
   tiene que esperar (comprobar o proteger una contraseña) como { espera },
   una promesa que acaba en { ok } o { ok: false, msg }.
   ========================================================================== */
var Cuentas = (function () {
  'use strict';
  var S = Store.S;

  function abrirSesion(modo) {
    S.session = true; S.guest = false;
    S.sessionMode = modo === 'temp' ? 'temp' : 'keep';
    S.sessionAt = Date.now();
    Store.live.mark();
  }
  function cerrar() { S.session = false; S.sessionAt = 0; Store.live.clear(); }
  function asegurarCuenta() {
    if (!S.account) S.account = { name: '', email: '', pass: '', created: Dates.today() };
  }

  /* -------------------------------------------------------------- entrar */
  function entrarSinCuenta() {
    abrirSesion('keep'); S.guest = true; S.onboarded = true;
    Store.saveNow();
  }
  function entrarApp() { S.onboarded = true; Store.saveNow(); }

  function iniciarSesion(correo, pass, recordar) {
    var key = Store.findKey(correo);
    if (!key) return { msg: 'No hay ninguna cuenta con ese correo en este dispositivo. Regístrate o entra sin cuenta.' };
    if (key !== Store.curKey()) Store.switchUser(key);
    if (!S.account) return { msg: 'No hay ninguna cuenta en este dispositivo. Regístrate o entra sin cuenta.' };
    if (!S.account.pass) return { msg: 'Esta cuenta viene de un respaldo y no trae contraseña válida. Entra sin cuenta y créala desde Perfil › Seguridad.' };
    var left = Sec.lockLeft(S.auth);
    if (left) return { msg: 'Demasiados intentos seguidos. Espera ' + left + ' segundos antes de volver a probar.' };

    return {
      espera: Sec.verifyPass(pass, S.account.pass).then(function (okPass) {
        // Correo y contraseña se comprueban juntos y con el mismo mensaje:
        // así no se puede averiguar cuál de los dos era el correcto.
        var okMail = Sec.equal(String(correo).trim().toLowerCase(), String(S.account.email).toLowerCase());
        if (!okPass || !okMail) {
          Sec.noteFail(S.auth); Store.saveNow();
          var l2 = Sec.lockLeft(S.auth);
          return { ok: false, msg: 'El correo o la contraseña no coinciden.' +
            (l2 ? ' Espera ' + l2 + ' segundos.' : (S.auth.fails >= 3 ? ' Tras cinco fallos habrá que esperar.' : '')) };
        }
        Sec.noteOk(S.auth);
        abrirSesion(recordar ? 'keep' : 'temp');
        S.onboarded = true;
        Store.saveNow();
        Nube.sync().signIn(String(correo).trim(), pass);
        return { ok: true };
      }, function () {
        return { ok: false, msg: 'Este navegador no permite comprobar la contraseña de forma segura. Entra sin cuenta.' };
      })
    };
  }

  // datos: { nombre, correo, pass, pass2, terminos, zona }
  function registrar(d) {
    var n = String(d.nombre || ''), m = String(d.correo || ''), p = d.pass || '';
    if (!n.trim()) return { msg: 'Escribe tu nombre.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.trim())) return { msg: 'Ese correo no parece válido.' };
    var weak = Sec.passProblem(p);
    if (weak) return { msg: weak };
    if (p !== d.pass2) return { msg: 'Las dos contraseñas no coinciden.' };
    if (!d.terminos) return { msg: 'Tienes que aceptar los Términos y la Política de Privacidad.' };
    if (Store.findKey(m) && !(S.account && Store.findKey(m) === Store.curKey() && !S.account.pass)) {
      return { msg: 'Ya hay una cuenta con ese correo en este dispositivo. Inicia sesión.' };
    }
    // La contraseña nunca se guarda: se guarda su derivación PBKDF2 con sal.
    return {
      espera: Sec.hashPass(p).then(function (rec) {
        // si ya hay otra cuenta en este navegador, la nueva empieza con datos propios
        if (S.account && S.account.email) Store.switchUser(Store.newUserKey(m));
        S.account = { name: n.trim(), email: m.trim(), pass: rec, created: Dates.today() };
        S.auth = { fails: 0, until: 0 };
        Nube.sync().signUp(S.account.email, p);
        abrirSesion('keep');
        if (!S.profile.tz) S.profile.tz = d.zona || '';
        Store.saveNow();
        return { ok: true };
      }, function () {
        return { ok: false, msg: 'Este navegador no permite proteger la contraseña. Puedes entrar sin cuenta y usar todo igual.' };
      })
    };
  }

  function google() { Nube.sync().google(); }

  // Google ya verificó quién es: se abre la cuenta local de ese correo (se crea
  // sin contraseña propia si no existía). Devuelve true si se entró.
  function entrarConGoogle(user, zona) {
    var mail = String(user && user.email || '').trim();
    if (!mail) return false;
    if (S.session && S.account && String(S.account.email).toLowerCase() === mail.toLowerCase()) return false;
    var key = Store.findKey(mail);
    if (key && key !== Store.curKey()) Store.switchUser(key);
    else if (!key && S.account && S.account.email) Store.switchUser(Store.newUserKey(mail));
    if (!S.account) {
      var meta = user.user_metadata || {};
      S.account = { name: String(meta.full_name || meta.name || mail.split('@')[0]).slice(0, 80), email: mail, pass: '', created: Dates.today() };
      if (!S.profile.tz) S.profile.tz = zona || '';
    }
    abrirSesion('keep');
    S.onboarded = true;
    Store.saveNow();
    return true;
  }

  /* -------------------------------------------------------------- salir */
  function cerrarSesion() {
    cerrar();
    Nube.sync().signOut();
    Store.saveNow();
  }

  function cambiarContrasena(actual, nueva, nueva2) {
    var weak = Sec.passProblem(nueva);
    if (weak) return { msg: weak };
    if (nueva !== nueva2) return { msg: 'Las dos nuevas no coinciden.' };
    function aplicar() {
      return Sec.hashPass(nueva).then(function (rec) {
        S.account.pass = rec;
        S.auth = { fails: 0, until: 0 };
        Nube.sync().updatePassword(nueva);
        // Cambiar la contraseña invalida la sesión: hay que volver a entrar,
        // igual que en un servicio serio se cierran todas las sesiones abiertas.
        cerrar();
        Store.saveNow();
        return { ok: true };
      }, function () { return { ok: false, msg: 'No se pudo guardar la nueva contraseña en este navegador.' }; });
    }
    // reautenticación antes de una acción sensible
    if (!S.account.pass) return { espera: aplicar() };
    return {
      espera: Sec.verifyPass(actual, S.account.pass).then(function (ok) {
        return ok ? aplicar() : { ok: false, msg: 'La contraseña actual no es correcta.' };
      }, function () { return { ok: false, msg: 'No se pudo comprobar la contraseña actual.' }; })
    };
  }

  /* ------------------------------------------------------ datos de la cuenta */
  function nombre(v) { asegurarCuenta(); S.account.name = v; Store.save(); }
  function correo(v) { asegurarCuenta(); S.account.email = v; Store.save(); }
  function guardarAhora() { Store.saveNow(); }

  /* ------------------------------------------------------------ arranque */
  // Carga lo guardado y revisa la sesión: caduca al cerrar la pestaña si no se
  // pidió recordarla, y en cualquier caso a los 14 días. Devuelve si sigue viva.
  function arrancar() {
    Store.load();
    if (!S.start) { S.start = Dates.today(); Store.save(); }
    if (S.session) {
      var viva = S.sessionMode === 'temp' ? Store.live.is() : true;
      var vieja = S.sessionAt && (Date.now() - S.sessionAt) > 14 * 24 * 3600 * 1000;
      if (!viva || vieja) { S.session = false; S.sessionAt = 0; Store.save(); }
    }
    if (S.session) S.onboarded = true;
    return S.session;
  }

  return {
    entrarSinCuenta: entrarSinCuenta, entrarApp: entrarApp, iniciarSesion: iniciarSesion,
    registrar: registrar, google: google, entrarConGoogle: entrarConGoogle,
    cerrarSesion: cerrarSesion, cambiarContrasena: cambiarContrasena,
    nombre: nombre, correo: correo, guardarAhora: guardarAhora, arrancar: arrancar
  };
})();
