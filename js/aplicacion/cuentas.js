/* ==========================================================================
   APLICACIÓN — casos de uso de cuentas y sesión: entrar con o sin cuenta,
   registrarse (con correo, teléfono o nombre de usuario), entrar con Google
   o Facebook, cerrar sesión, cambiar la contraseña y revisar si la sesión
   sigue viva al abrir la app.

   No lee formularios ni pinta: recibe los datos y devuelve el resultado.
   Lo que es inmediato se devuelve como { msg } (error) u { ok: true }; lo que
   tiene que esperar (comprobar o proteger una contraseña) como { espera },
   una promesa que acaba en { ok } o { ok: false, msg }.
   ========================================================================== */
var Cuentas = (function () {
  'use strict';
  var S = Store.S, Id = BdvIdentidad;
  var NO_EXISTE = 'No hay ninguna cuenta con ese correo, teléfono o usuario en este dispositivo. Regístrate o entra sin cuenta.';

  function abrirSesion(modo) {
    S.session = true; S.guest = false;
    S.sessionMode = modo === 'temp' ? 'temp' : 'keep';
    S.sessionAt = Date.now();
    Store.live.mark();
  }
  function cerrar() { S.session = false; S.sessionAt = 0; Store.live.clear(); }
  function asegurarCuenta() {
    if (!S.account) S.account = { name: '', email: '', pass: '', created: Dates.today(), login: 'email' };
  }
  function tieneCuenta() { return !!(S.account && (Id.deCuenta(S.account) || S.account.pass)); }
  // El espacio sin cuenta no guarda cuentas: si en él se crea una, sus datos
  // pasan a la clave propia de esa cuenta.
  function salirDeInvitado(clave) {
    if (Store.esInvitado()) Store.moverA(Store.newUserKey(clave || Util.uid()));
  }
  // con qué correo existe la cuenta en la nube (el interno si es de usuario o teléfono)
  function correoNube(acc) { return acc ? (acc.nube || acc.email || '') : ''; }

  /* -------------------------------------------------------------- entrar */
  // Entrar sin cuenta nunca abre los datos de una cuenta de este dispositivo:
  // si los datos abiertos son de una cuenta, se pasa al espacio sin cuenta.
  function entrarSinCuenta() {
    if (tieneCuenta()) {
      salirDeInvitado(Id.deCuenta(S.account));   // p. ej. una cuenta restaurada de un respaldo
      Store.switchUser(Store.GUEST_KEY);
    }
    abrirSesion('keep'); S.guest = true; S.onboarded = true;
    Store.saveNow();
  }
  function entrarApp() { S.onboarded = true; Store.saveNow(); }

  // identificador: correo, teléfono o nombre de usuario (se reconoce solo)
  function iniciarSesion(identificador, pass, recordar) {
    var id = Id.parse(identificador);
    var key = id.ok ? Store.findKey(id.clave) : null;
    if (!key) return { msg: NO_EXISTE };
    if (key !== Store.curKey()) Store.switchUser(key);
    if (!S.account) return { msg: NO_EXISTE };
    if (!S.account.pass) return { msg: 'Esta cuenta no tiene contraseña de la app (por ejemplo, si se creó con Google o Facebook). Entra como la creaste, o restaura un respaldo y crea la contraseña desde Perfil › Seguridad.' };
    var left = Sec.lockLeft(S.auth);
    if (left) return { msg: 'Demasiados intentos seguidos. Espera ' + left + ' segundos antes de volver a probar.' };

    return {
      espera: Sec.verifyPass(pass, S.account.pass).then(function (okPass) {
        // El identificador y la contraseña se comprueban juntos y con el mismo
        // mensaje: así no se puede averiguar cuál de los dos era el correcto.
        var okId = Sec.equal(id.clave, Id.deCuenta(S.account));
        if (!okPass || !okId) {
          Sec.noteFail(S.auth); Store.saveNow();
          var l2 = Sec.lockLeft(S.auth);
          return { ok: false, msg: 'Los datos de acceso o la contraseña no coinciden.' +
            (l2 ? ' Espera ' + l2 + ' segundos.' : (S.auth.fails >= 3 ? ' Tras cinco fallos habrá que esperar.' : '')) };
        }
        Sec.noteOk(S.auth);
        abrirSesion(recordar ? 'keep' : 'temp');
        S.onboarded = true;
        Store.saveNow();
        Nube.sync().signIn(correoNube(S.account), pass);
        return { ok: true };
      }, function () {
        return { ok: false, msg: 'Este navegador no permite comprobar la contraseña de forma segura. Entra sin cuenta.' };
      })
    };
  }

  // datos: { nombre, tipo: 'email'|'tel'|'usuario', identificador, pass, pass2, terminos, zona }
  function registrar(d) {
    var n = String(d.nombre || ''), p = d.pass || '';
    if (!n.trim()) return { msg: 'Escribe tu nombre.' };
    var id = Id.parse(d.identificador, d.tipo || 'email');
    if (!id.ok) return { msg: id.msg };
    var weak = Sec.passProblem(p);
    if (weak) return { msg: weak };
    if (p !== d.pass2) return { msg: 'Las dos contraseñas no coinciden.' };
    if (!d.terminos) return { msg: 'Tienes que aceptar los Términos y la Política de Privacidad.' };
    var existe = Store.findKey(id.clave);
    if (existe && !(S.account && existe === Store.curKey() && !S.account.pass)) {
      return { msg: 'Ya hay una cuenta con ese ' + ({ email: 'correo', tel: 'teléfono', usuario: 'nombre de usuario' })[id.tipo] + ' en este dispositivo. Inicia sesión.' };
    }
    // La contraseña nunca se guarda: se guarda su derivación PBKDF2 con sal.
    return {
      espera: Sec.hashPass(p).then(function (rec) {
        // si ya hay otra cuenta en este navegador, la nueva empieza con datos propios;
        // si se viene del espacio sin cuenta, esos datos pasan a la cuenta nueva
        if (tieneCuenta()) Store.switchUser(Store.newUserKey(id.clave));
        else salirDeInvitado(id.clave);
        S.account = {
          name: n.trim(), login: id.tipo, created: Dates.today(), pass: rec,
          email: id.tipo === 'email' ? id.valor : '',
          phone: id.tipo === 'tel' ? id.valor : '',
          username: id.tipo === 'usuario' ? id.valor : '',
          nube: id.emailNube
        };
        S.auth = { fails: 0, until: 0 };
        Nube.sync().signUp(id.emailNube, p);
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
  function facebook() { Nube.sync().facebook(); }

  // Una red social (Google o Facebook) ya verificó quién es: se abre la cuenta
  // local de esa persona (se crea, sin contraseña propia, si no existía).
  // Devuelve true si se entró.
  function entrarConRed(user, proveedor, zona) {
    if (!user) return false;
    var clave = Id.deRed(proveedor, user);
    if (S.session && S.account && Id.deCuenta(S.account) === clave) return false;
    var key = Store.findKey(clave);
    if (key && key !== Store.curKey()) Store.switchUser(key);
    else if (!key && tieneCuenta()) Store.switchUser(Store.newUserKey(clave));
    if (!S.account) {
      salirDeInvitado(clave);
      var meta = user.user_metadata || {}, mail = String(user.email || '').trim().toLowerCase();
      S.account = {
        name: String(meta.full_name || meta.name || (mail ? mail.split('@')[0] : 'Sin nombre')).slice(0, 80),
        email: mail, login: 'red', provider: proveedor, providerId: String(user.id || ''),
        nube: mail, pass: '', created: Dates.today()
      };
      if (!S.profile.tz) S.profile.tz = zona || '';
    }
    abrirSesion('keep');
    S.onboarded = true;
    Store.saveNow();
    return true;
  }
  function entrarConGoogle(user, zona) { return entrarConRed(user, 'google', zona); }

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
  // En una cuenta de correo cambia el correo con el que se entra; en una de
  // teléfono o usuario es solo un correo de contacto opcional.
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
    registrar: registrar, google: google, facebook: facebook,
    entrarConRed: entrarConRed, entrarConGoogle: entrarConGoogle,
    cerrarSesion: cerrarSesion, cambiarContrasena: cambiarContrasena,
    nombre: nombre, correo: correo, guardarAhora: guardarAhora, arrancar: arrancar
  };
})();
