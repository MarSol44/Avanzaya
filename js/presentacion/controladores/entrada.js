/* ==========================================================================
   PRESENTACIÓN — controlador de entrada: inicio, sesión, registro, Google,
   bienvenida y chequeo de vida. Lee los formularios, llama a los casos de
   uso (Cuentas, Chequeo) y enseña el resultado. No toca el estado.
   ========================================================================== */
(function () {
  'use strict';
  var S = Datos.estado(), ui = UIState;
  var action = UI.action, render = UI.render, refresh = UI.refresh, openSheet = UI.openSheet, closeSheetSilent = UI.closeSheetSilent,
    goApp = UI.goApp, grow = UI.grow, growAll = UI.growAll, armedDelete = UI.armedDelete, busyBtn = UI.busyBtn,
    isBusy = UI.isBusy, setBusy = UI.setBusy;
  function val(id) { return (document.getElementById(id) || {}).value || ''; }
  function top() { render(); window.scrollTo(0, 0); }
  // Tras entrar: la bienvenida si aún toca; si no, directamente a Hoy.
  function entrar() {
    if (Bienvenida.pendiente()) { ui.screen = 'bienvenida'; top(); }
    else goApp('hoy');
  }

  /* --- entrar --- */
  action('enterApp', function () { Cuentas.entrarApp(); entrar(); });
  action('google', function () { Cuentas.google(); });
  action('facebook', function () { Cuentas.facebook(); });

  action('dologin', function (c) { c.e.preventDefault(); doLogin(); });
  action('doregister', function (c) { c.e.preventDefault(); doRegister(); });

  function doLogin() {
    if (isBusy()) return;
    var err = document.getElementById('liErr'), keep = document.getElementById('liKeep');
    var r = Cuentas.iniciarSesion(val('liMail'), val('liPass'), !!(keep && keep.checked));
    if (!r.espera) { err.textContent = r.msg; return; }
    setBusy(true); err.style.color = 'var(--ink-2)'; err.textContent = 'Comprobando…';
    busyBtn('[data-a="dologin"]', true, 'Comprobando…');
    r.espera.then(function (res) {
      setBusy(false); busyBtn('[data-a="dologin"]', false);
      err.style.color = 'var(--bad)';
      var reenviar = document.getElementById('liReenviar');
      if (reenviar) reenviar.hidden = res.codigo !== 'sin-confirmar';
      if (!res.ok) { err.textContent = res.msg; return; }
      entrar();
    });
  }

  /* --- confirmar el correo --- */
  action('cfLogin', function () { ui.loginEmail = ui.confirmEmail || ''; ui.screen = 'login'; top(); });
  action('reenviar', function () {
    if (isBusy()) return;
    var msg = document.getElementById('cfMsg') || document.getElementById('liErr');
    var r = Cuentas.reenviarConfirmacion(ui.screen === 'confirmar' ? ui.confirmEmail : val('liMail'));
    msg.style.color = 'var(--bad)';
    if (!r.espera) { msg.textContent = r.msg; return; }
    setBusy(true); msg.style.color = 'var(--ink-2)'; msg.textContent = 'Enviando…';
    r.espera.then(function (res) {
      setBusy(false);
      msg.style.color = res.ok ? 'var(--ink-2)' : 'var(--bad)';
      msg.textContent = res.msg;
    });
  });
  // El enlace del correo trae aquí: ya está confirmado, falta entrar con la contraseña.
  Bus.on('auth:confirmado', function (correo) {
    ui.loginEmail = correo || ui.loginEmail || '';
    ui.screen = 'login'; top();
    Pantalla.toast('Correo confirmado. Inicia sesión para empezar.');
  });

  action('forgot', function (c) {
    c.e.preventDefault();
    if (isBusy()) return;
    var err = document.getElementById('liErr');
    var r = Cuentas.recuperar(val('liMail'));
    err.style.color = 'var(--bad)';
    if (!r.espera) { err.textContent = r.msg; return; }
    setBusy(true); err.style.color = 'var(--ink-2)'; err.textContent = 'Enviando…';
    r.espera.then(function (res) {
      setBusy(false);
      err.style.color = res.ok ? 'var(--ink-2)' : 'var(--bad)';
      err.textContent = res.msg;
    });
  });

  /* --- el enlace de recuperación trae aquí: solo se pide la nueva contraseña --- */
  Bus.on('auth:recuperar', function () { closeSheetSilent(); ui.screen = 'nuevaClave'; top(); });
  function guardarNuevaClave() {
    if (isBusy()) return;
    var err = document.getElementById('ncErr');
    var r = Cuentas.nuevaClave(val('ncPass'), val('ncPass2'));
    err.style.color = 'var(--bad)';
    if (!r.espera) { err.textContent = r.msg; return; }
    setBusy(true); busyBtn('[data-a="doNuevaClave"]', true, 'Guardando…');
    r.espera.then(function (res) {
      setBusy(false); busyBtn('[data-a="doNuevaClave"]', false);
      if (!res.ok) { err.textContent = res.msg; return; }
      ui.screen = 'login'; top();
      Pantalla.toast('Contraseña cambiada. Entra con la nueva.');
    });
  }
  action('doNuevaClave', function (c) { c.e.preventDefault(); guardarNuevaClave(); });
  action('cancelarClave', function () {
    Cuentas.cancelarRecuperacion();
    ui.screen = Datos.estado().session ? 'app' : 'splash'; top();
  });
  UI.onSubmit('claveForm', guardarNuevaClave);

  function doRegister() {
    if (isBusy()) return;                     // antes de llamar: el servicio ya empieza a trabajar
    var err = document.getElementById('rgErr'), terms = document.getElementById('rgTerms');
    var r = Cuentas.registrar({
      nombre: val('rgName'), correo: val('rgMail'), pass: val('rgPass'), pass2: val('rgPass2'),
      terminos: !!(terms && terms.checked), zona: V.guessTz()
    });
    if (!r.espera) { err.textContent = r.msg; return; }
    setBusy(true); err.style.color = 'var(--ink-2)'; err.textContent = 'Protegiendo tu contraseña…';
    busyBtn('[data-a="doregister"]', true, 'Protegiendo…');
    r.espera.then(function (res) {
      setBusy(false); busyBtn('[data-a="doregister"]', false);
      if (!res.ok) { err.style.color = 'var(--bad)'; err.textContent = res.msg; return; }
      if (res.confirmar) { ui.confirmEmail = res.correo; ui.screen = 'confirmar'; top(); return; }
      ui.regStep = 2; top();
    });
  }

  // Google o Facebook ya verificó quién es (aviso del adaptador de la nube por el bus).
  Bus.on('auth:red', function (d) {
    if (d && Cuentas.entrarConRed(d.user, d.proveedor, V.guessTz())) entrar();
  });

  /* --- chequeo de vida --- */
  function startRC() {
    Chequeo.empezar();
    ui.rcStep = 0; ui.rcOpen = false; ui.screen = 'rc';
    top();
  }
  action('skipProfile', startRC);
  action('startRC', startRC);
  action('newRC', function () { closeSheetSilent(); startRC(); });
  action('sheetRC', function () { openSheet({ t: 'rc' }); });
  action('rcAcc', function (c) {
    var acc = c.el.closest('.acc');
    ui.rcOpen = acc.getAttribute('data-open') !== 'true';
    acc.setAttribute('data-open', ui.rcOpen ? 'true' : 'false');
    if (ui.rcOpen) growAll(acc);
  });
  action('rcBack', function () { ui.rcStep = Math.max(0, ui.rcStep - 1); ui.rcOpen = false; top(); });
  action('rcNext', function () {
    Chequeo.aceptarPaso((Revision.AREAS[ui.rcStep].sliders || []).map(function (s) { return s.k; }), V.RC_INICIAL);
    if (ui.rcStep < Revision.AREAS.length - 1) { ui.rcStep++; ui.rcOpen = false; Chequeo.guardarAvance(); top(); return; }
    if (!Chequeo.terminar()) { Pantalla.toast('Mueve al menos un deslizador para guardar tu check.'); return; }
    ui.viewRC = null; ui.screen = 'rcsum'; top();
  });
  action('rcExit', function () {
    var had = Chequeo.salir();
    goApp('hoy');
    if (had) Pantalla.toast('Chequeo guardado. Lo tienes en Visión.');
  });
  action('viewRC', function (c) {
    var r = Util.byId(S.rc, c.id);
    if (r) { closeSheetSilent(); ui.viewRC = r; ui.screen = 'rcsum'; top(); }
  });
  action('rcDel', function (c) {
    armedDelete(c.el, function () { Chequeo.borrar(c.id); refresh(); Pantalla.toast('Chequeo eliminado.'); });
  });
  action('finishOnboarding', function () {
    var r = Chequeo.terminarBienvenida(val('firstStep'));
    goApp('hoy');
    Pantalla.toast(r.primerPaso ? 'Listo. Tu primer paso ya está en Metas.' : 'Listo. Tu visión está guardada.');
  });

  /* --- chequeo de vida: deslizadores y notas --- */
  UI.onInputWhen(function (el) { return el.hasAttribute('data-rc'); }, function (c) {
    var rc = c.el.getAttribute('data-rc'), v = +c.el.value;
    Chequeo.puntuar(rc, v);
    c.el.style.setProperty('--v', ((v - 1) / 9 * 100) + '%');
    var lab = document.querySelector('[data-sv="' + rc + '"]');
    if (lab) lab.textContent = v;
  });
  UI.onInputWhen(function (el) { return el.hasAttribute('data-rcadj'); }, function (c) { Chequeo.adjetivos(c.el.value); });
  UI.onInputWhen(function (el) { return el.hasAttribute('data-rcnote'); }, function (c) {
    Chequeo.nota(c.el.getAttribute('data-rcnote'), c.el.value); grow(c.el);
  });

  /* --- formularios --- */
  UI.onSubmit('loginForm', doLogin);
  UI.onSubmit('regForm', doRegister);
})();
