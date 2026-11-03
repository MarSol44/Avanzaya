/* ==========================================================================
   APLICACIÓN — casos de uso de cuentas y sesión: entrar,
   registrarse con correo (que se confirma con un enlace), entrar con Google
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
  var NO_EXISTE = 'No encontramos esa cuenta. Revisa los datos o regístrate.';
  var NO_COINCIDEN = 'El correo o la contraseña no son correctos.';
  var SIN_CONEXION = 'No se pudo comprobar tu cuenta en la nube. Revisa la conexión e inténtalo otra vez.';
  function mensajeEntrada(codigo) {
    if (codigo === 'credenciales') return NO_COINCIDEN;
    if (codigo === 'sin-confirmar') return 'Aún no has confirmado tu correo. Abre el enlace que te enviamos y vuelve a intentarlo.';
    return SIN_CONEXION;
  }

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
  // Los datos de quien usaba la app sin cuenta (cuando se podía) no son de
  // ninguna cuenta, aunque se escribiera un correo en Perfil.
  function tieneCuenta() { return !S.guest && !!(S.account && (Id.deCuenta(S.account) || S.account.pass)); }
  // El antiguo espacio sin cuenta no guarda cuentas: si en él se crea una, sus datos
  // pasan a la clave propia de esa cuenta.
  function salirDeInvitado(clave) {
    if (Store.esInvitado()) Store.moverA(Store.newUserKey(clave || Util.uid()));
  }
  // con qué correo existe la cuenta en la nube (el interno si es de usuario o teléfono)
  function correoNube(acc) { return acc ? (acc.nube || acc.email || '') : ''; }

  /* -------------------------------------------------------------- entrar */
  function entrarApp() { S.onboarded = true; Store.saveNow(); }

  // La cuenta no está en este dispositivo: se comprueba en la nube y, si es
  // buena, se abre con un espacio propio y la copia que había allí.
  function entrarDesdeNube(id, pass, recordar) {
    return Sec.hashPass(pass).then(function (rec) {
      return Nube.sync().entrada(id.emailNube, pass).then(function (r) {
        if (!r.ok) return { ok: false, msg: mensajeEntrada(r.codigo), codigo: r.codigo };
        // lo que tuviera aquí de cuando se usaba sin cuenta pasa a su cuenta nueva
        if (S.guest && !r.estado) salirDeInvitado(id.clave);
        else Store.switchUser(Store.newUserKey(id.clave));
        if (r.estado) Nube.state.apply(r.estado);
        var a = S.account || { name: '', email: '', created: Dates.today() };
        a.login = id.tipo; a.nube = id.emailNube; a.pass = rec;
        if (id.tipo === 'email') a.email = id.valor;
        if (id.tipo === 'tel') a.phone = id.valor;
        if (id.tipo === 'usuario') a.username = id.valor;
        if (!a.name) a.name = r.nombre || (id.tipo === 'email' ? id.valor.split('@')[0] : id.valor);
        S.account = a;
        Sec.noteOk(S.auth);
        abrirSesion(recordar ? 'keep' : 'temp');
        S.onboarded = true;
        Store.saveNow();
        Nube.sync().entradaLista(r.hora);
        return { ok: true };
      });
    }, function () {
      return { ok: false, msg: 'Este navegador no permite comprobar la contraseña de forma segura. Prueba con otro navegador actualizado.' };
    });
  }

  // La contraseña de este dispositivo no vale (quizá se cambió en otro o con el
  // enlace de recuperación): la última palabra la tiene la nube.
  function comprobarEnNube(pass, recordar) {
    return Sec.hashPass(pass).then(function (rec) {
      return Nube.sync().entrada(correoNube(S.account), pass).then(function (r) {
        if (!r.ok) return r;
        S.account.pass = rec;
        Sec.noteOk(S.auth);
        abrirSesion(recordar ? 'keep' : 'temp');
        S.onboarded = true;
        Store.saveNow();
        Nube.sync().entradaLista();
        return { ok: true };
      });
    });
  }

  // Se entra con el correo. (Las cuentas antiguas de teléfono o usuario de este
  // dispositivo se siguen reconociendo: Id.parse sin tipo las adivina.)
  function iniciarSesion(identificador, pass, recordar) {
    var id = Id.parse(identificador);
    if (id.ok && id.tipo !== 'email' && !Store.findKey(id.clave)) return { msg: 'Escribe el correo con el que te registraste.' };
    if (!id.ok) return { msg: id.msg };
    if (!pass) return { msg: 'Escribe tu contraseña.' };
    var key = Store.findKey(id.clave);
    if (!key) return { espera: entrarDesdeNube(id, pass, recordar) };
    if (key !== Store.curKey()) Store.switchUser(key);
    if (!S.account) return { msg: NO_EXISTE };
    if (S.guest) return { msg: 'Estos datos se crearon sin cuenta. Regístrate con este mismo correo y pasarán a tu cuenta.' };
    var left = Sec.lockLeft(S.auth);
    if (left) return { msg: 'Demasiados intentos seguidos. Espera ' + left + ' segundos antes de volver a probar.' };

    function rechazar(extra) {
      // El identificador y la contraseña se comprueban juntos y con el mismo
      // mensaje: así no se puede averiguar cuál de los dos era el correcto.
      Sec.noteFail(S.auth); Store.saveNow();
      var l2 = Sec.lockLeft(S.auth);
      return { ok: false, msg: NO_COINCIDEN + (extra || '') +
        (l2 ? ' Espera ' + l2 + ' segundos.' : (S.auth.fails >= 3 ? ' Tras cinco fallos habrá que esperar.' : '')) };
    }
    function enNube() {
      return comprobarEnNube(pass, recordar).then(function (r) {
        if (r.ok) return r;
        // sin conexión, una contraseña local errónea también cuenta como intento fallido;
        // se avisa por si la cambió en otro dispositivo y aquí aún no se sabe
        if (S.account.pass) return rechazar(r.codigo === 'credenciales' ? '' : ' Si la cambiaste hace poco, conéctate a internet y vuelve a probar.');
        return { ok: false, msg: mensajeEntrada(r.codigo) };
      });
    }
    if (!S.account.pass) {
      // restaurada de un respaldo: la contraseña no viajaba en él, pero la nube la conoce
      if (S.account.login !== 'red' && correoNube(S.account)) return { espera: enNube() };
      return { msg: 'Esta cuenta no tiene contraseña de la app (por ejemplo, si se creó con Google o Facebook). Entra como la creaste, o restaura un respaldo y crea la contraseña desde Perfil › Seguridad.' };
    }

    return {
      espera: Sec.verifyPass(pass, S.account.pass).then(function (okPass) {
        var okId = Sec.equal(id.clave, Id.deCuenta(S.account));
        if (okId && !okPass && correoNube(S.account)) return enNube();
        if (!okPass || !okId) return rechazar();
        Sec.noteOk(S.auth);
        abrirSesion(recordar ? 'keep' : 'temp');
        S.onboarded = true;
        Store.saveNow();
        Nube.sync().signIn(correoNube(S.account), pass);
        return { ok: true };
      }, function () {
        return { ok: false, msg: 'Este navegador no permite comprobar la contraseña de forma segura. Prueba con otro navegador actualizado.' };
      })
    };
  }

  /* ------------------------------------------------- contraseña olvidada */
  function recuperar(identificador) {
    if (!String(identificador || '').trim()) return { msg: 'Escribe arriba tu correo y vuelve a pulsar.' };
    var id = Id.parse(identificador);
    if (!id.ok || id.tipo !== 'email') return { msg: 'Escribe arriba el correo con el que te registraste.' };
    return {
      espera: Nube.sync().recuperar(id.valor).then(function (r) {
        // el mismo mensaje exista o no la cuenta: así no se puede averiguar quién está registrado
        return r.ok ? { ok: true, msg: 'Si hay una cuenta con ese correo, te llegará un enlace para cambiar la contraseña. Mira también en spam.' }
          : { ok: false, msg: 'No se pudo enviar el enlace. Revisa la conexión o inténtalo en unos minutos.' };
      })
    };
  }
  function nuevaClave(nueva, nueva2) {
    var weak = Sec.passProblem(nueva);
    if (weak) return { msg: weak };
    if (nueva !== nueva2) return { msg: 'Las dos contraseñas no coinciden.' };
    return {
      espera: Nube.sync().claveRecuperada(nueva).then(function (r) {
        if (r.ok) { cerrar(); Store.saveNow(); return { ok: true }; }
        return { ok: false, msg: r.codigo === 'misma' ? 'Elige una contraseña distinta de la anterior.'
          : r.codigo === 'debil' ? 'Esa contraseña es demasiado débil. Prueba con otra más larga.'
          : 'No se pudo cambiar. El enlace puede haber caducado: pide otro.' };
      })
    };
  }
  function cancelarRecuperacion() { Nube.sync().entradaCancelada(); }

  // Eliminar la cuenta: en la nube (cuenta, copia y recordatorios) y en este
  // dispositivo. Con contraseña se pide otra vez; con Google o Facebook, que se
  // escriba ELIMINAR. Devuelve { msg } o { espera }.
  function conContrasena() { return !!(S.account && S.account.login !== 'red' && S.account.pass); }
  function eliminarCuenta(pass, confirmacion) {
    if (!S.account || !S.session) return { msg: 'Inicia sesión para eliminar tu cuenta.' };
    if (conContrasena() && !pass) return { msg: 'Escribe tu contraseña para confirmar.' };
    if (!conContrasena() && String(confirmacion || '').trim().toUpperCase() !== 'ELIMINAR') return { msg: 'Escribe ELIMINAR para confirmar.' };
    function borrarAqui() { cerrar(); Store.wipe(); return { ok: true }; }
    var correo = correoNube(S.account);
    // cuentas antiguas que nunca llegaron a la nube: solo hay datos aquí
    if (!correo) {
      return { espera: Sec.verifyPass(pass, S.account.pass).then(function (ok) {
        return ok ? borrarAqui() : { ok: false, msg: 'La contraseña no es correcta.' };
      }) };
    }
    return {
      espera: Nube.sync().eliminarCuenta(correo, conContrasena() ? pass : '').then(function (r) {
        if (r.ok) return borrarAqui();
        return { ok: false, msg: r.codigo === 'credenciales' ? 'La contraseña no es correcta.'
          : r.codigo === 'sin-sesion' ? 'Tu sesión en la nube caducó. Cierra sesión, vuelve a entrar y repítelo.'
          : r.codigo === 'sin-nube' ? 'Necesitas conexión a internet para eliminar la cuenta.'
          : 'No se pudo eliminar la cuenta. Revisa la conexión e inténtalo otra vez.' };
      })
    };
  }

  function reenviarConfirmacion(correo) {
    var id = Id.parse(correo, 'email');
    if (!id.ok) return { msg: 'Escribe arriba el correo con el que te registraste.' };
    return {
      espera: Nube.sync().reenviar(id.valor).then(function (r) {
        return r.ok ? { ok: true, msg: 'Te hemos enviado otro enlace a ' + id.valor + '. Mira también en spam.' }
          : { ok: false, msg: 'No se pudo enviar. Espera unos minutos y vuelve a intentarlo.' };
      })
    };
  }

  // datos: { nombre, correo, pass, pass2, terminos, zona }
  // La cuenta se crea en la nube y, si Supabase pide confirmar el correo (lo normal),
  // no se abre hasta entonces: devuelve { ok, confirmar, correo }.
  function registrar(d) {
    var n = String(d.nombre || ''), p = d.pass || '';
    if (!n.trim()) return { msg: 'Escribe tu nombre.' };
    var id = Id.parse(d.correo, 'email');
    if (!id.ok) return { msg: id.msg };
    var weak = Sec.passProblem(p);
    if (weak) return { msg: weak };
    if (p !== d.pass2) return { msg: 'Las dos contraseñas no coinciden.' };
    if (!d.terminos) return { msg: 'Tienes que aceptar los Términos y la Política de Privacidad.' };
    var existe = Store.findKey(id.clave);
    if (existe && !(S.account && existe === Store.curKey() && !S.account.pass)) {
      return { msg: 'Ya hay una cuenta con ese correo en este dispositivo. Inicia sesión.' };
    }
    var RECHAZOS = {
      existe: 'Ya hay una cuenta con ese correo. Inicia sesión para traer tus datos.',
      correo: 'No se pudo validar ese correo. Revisa que esté bien escrito.',
      debil: 'Esa contraseña es demasiado débil. Prueba con otra más larga.'
    };
    // La contraseña nunca se guarda: se guarda su derivación PBKDF2 con sal.
    return {
      espera: Sec.hashPass(p).then(function (rec) {
        return Nube.sync().alta(id.emailNube, p, n.trim()).then(function (res) {
          if (!res.ok) {
            Nube.sync().entradaCancelada();
            return { ok: false, msg: RECHAZOS[res.codigo] || 'No se pudo crear la cuenta. Revisa la conexión e inténtalo otra vez.' };
          }
          // Hay que confirmar el correo: la cuenta se abre al entrar después.
          if (!res.conSesion) { Nube.sync().entradaCancelada(); return { ok: true, confirmar: true, correo: id.valor }; }
          // si ya hay otra cuenta en este navegador, la nueva empieza con datos propios;
          // si había datos de cuando se usaba sin cuenta, pasan a la cuenta nueva
          if (tieneCuenta()) Store.switchUser(Store.newUserKey(id.clave));
          else salirDeInvitado(id.clave);
          S.account = { name: n.trim(), login: 'email', created: Dates.today(), pass: rec, email: id.valor, phone: '', username: '', nube: id.emailNube };
          S.auth = { fails: 0, until: 0 };
          abrirSesion('keep');
          if (!S.profile.tz) S.profile.tz = d.zona || '';
          Store.saveNow();
          Nube.sync().entradaLista();
          return { ok: true };
        });
      }, function () {
        return { ok: false, msg: 'Este navegador no permite proteger la contraseña. Prueba con otro navegador actualizado.' };
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
    if (!S.account || S.guest) {
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
  // Solo para las cuentas antiguas de teléfono o usuario (un correo de contacto):
  // en las de correo, ese es con el que se entra y no se cambia desde aquí.
  function correo(v) {
    asegurarCuenta();
    if (S.account.login === 'tel' || S.account.login === 'usuario') { S.account.email = v; Store.save(); }
  }
  function guardarAhora() { Store.saveNow(); }

  /* ------------------------------------------------------------ arranque */
  // Carga lo guardado y revisa la sesión: caduca al cerrar la pestaña si no se
  // pidió recordarla, y tras 14 días sin abrir la app. Devuelve si sigue viva.
  var veniaSinCuenta = false;
  function arrancar() {
    Store.load();
    if (!S.start) { S.start = Dates.today(); Store.save(); }
    // La app ya no se usa sin cuenta: quien venía así ve la entrada, y lo que
    // tenía en este dispositivo pasa a la cuenta que cree.
    if (S.session && S.guest) { S.session = false; S.sessionAt = 0; Store.save(); veniaSinCuenta = true; }
    if (S.session) {
      var viva = S.sessionMode === 'temp' ? Store.live.is() : true;
      var vieja = S.sessionAt && (Date.now() - S.sessionAt) > 14 * 24 * 3600 * 1000;
      if (!viva || vieja) { S.session = false; S.sessionAt = 0; Store.save(); }
      else { S.sessionAt = Date.now(); Store.save(); }
    }
    if (S.session) S.onboarded = true;
    return S.session;
  }

  return {
    entrarApp: entrarApp, iniciarSesion: iniciarSesion,
    veniaSinCuenta: function () { return veniaSinCuenta; },
    registrar: registrar, google: google, facebook: facebook,
    entrarConRed: entrarConRed, entrarConGoogle: entrarConGoogle,
    cerrarSesion: cerrarSesion, cambiarContrasena: cambiarContrasena,
    recuperar: recuperar, nuevaClave: nuevaClave, cancelarRecuperacion: cancelarRecuperacion,
    reenviarConfirmacion: reenviarConfirmacion, eliminarCuenta: eliminarCuenta, conContrasena: conContrasena,
    nombre: nombre, correo: correo, guardarAhora: guardarAhora, arrancar: arrancar
  };
})();
