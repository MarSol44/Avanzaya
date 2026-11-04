/* ==========================================================================
   PRESENTACIÓN — controlador de Perfil: cuenta, apariencia, recordatorio,
   áreas de vida y respaldo. Lee lo que pide la pantalla, llama al caso de
   uso de la capa de aplicación (Ajustes, Cuentas, Recordatorio) y repinta.
   No toca el almacenamiento ni el estado directamente.
   ========================================================================== */
(function () {
  'use strict';
  var ui = UIState;
  var action = UI.action, render = UI.render, renderSheet = UI.renderSheet, openSheet = UI.openSheet, closeSheet = UI.closeSheet,
    grow = UI.grow, popNav = UI.popNav, armedDelete = UI.armedDelete, busyBtn = UI.busyBtn, isBusy = UI.isBusy, setBusy = UI.setBusy,
    paintChrome = UI.paintChrome;
  function val(id) { return (document.getElementById(id) || {}).value || ''; }

  /* --- secciones plegables (preferencia de este dispositivo) --- */
  action('pfSect', function (c) {
    var po = ui.pfOpen || {};
    if (po[c.v]) delete po[c.v]; else po[c.v] = true;
    ui.pfOpen = po;
    Preferencias.set('perfil.abiertas', po);
    render();
  });

  /* --- preferencias de la cuenta --- */
  action('week', function (c) { Ajustes.semana(c.v); render(); });
  action('rmPhoto', function () { Ajustes.quitarFoto(); render(); });
  action('theme', function (c) { Ajustes.tema(c.v); Pantalla.applyTheme(); paintChrome(); render(); });
  action('notifs', function () { Ajustes.alternarAvisos(); render(); });
  action('pushReminder', function () { Recordatorio.alternar(); });
  action('saveAccount', function () { Cuentas.guardarAhora(); Pantalla.toast('Cambios guardados.'); });
  action('logout', function () {
    // al volver a entrar, el correo ya está escrito: solo falta la contraseña
    var a = Datos.estado().account;
    ui.loginEmail = a && a.login === 'email' ? a.email || '' : '';
    Cuentas.cerrarSesion();
    ui.screen = 'splash'; render(); window.scrollTo(0, 0);
    Pantalla.toast('Sesión cerrada. Tus datos siguen en este dispositivo.');
  });

  /* --- eliminar la cuenta --- */
  action('sheetEliminar', function () { openSheet({ t: 'eliminar' }); });
  action('doEliminar', function () {
    if (isBusy()) return;
    var msg = document.getElementById('elMsg');
    var r = Cuentas.eliminarCuenta(val('elPass'), val('elConfirma'));
    if (!r.espera) { msg.textContent = r.msg; return; }
    setBusy(true); msg.style.color = 'var(--ink-2)'; msg.textContent = 'Eliminando…';
    busyBtn('#sheet [data-a="doEliminar"]', true, 'Eliminando…');
    r.espera.then(function (res) {
      setBusy(false); busyBtn('#sheet [data-a="doEliminar"]', false);
      if (!res.ok) { msg.style.color = 'var(--bad)'; msg.textContent = res.msg; return; }
      ui.sheet = null; renderSheet(); popNav('sheet');
      ui.screen = 'splash'; ui.tab = 'hoy'; render(); window.scrollTo(0, 0);
      Pantalla.toast('Tu cuenta se ha eliminado.');
    });
  });

  /* --- áreas de vida --- */
  action('newCat', function () { ui.newCatColor = '#5b6ee1'; openSheet({ t: 'cat' }); });
  action('ncColor', function (c) {
    ui.newCatColor = c.v;
    var sw = document.querySelectorAll('#sheet [data-a="ncColor"]');
    for (var q = 0; q < sw.length; q++) sw[q].setAttribute('aria-pressed', sw[q].getAttribute('data-v') === c.v);
  });
  action('addCat', function () {
    var r = Ajustes.areaNueva(val('ncEmoji'), val('ncName'), ui.newCatColor);
    if (!r.ok) { Pantalla.toast('Ponle un nombre al área.'); return; }
    closeSheet(); Pantalla.toast('Área creada.');
  });
  action('areaClave', function (c) {
    if (Ajustes.areaClave(c.id).lleno) { Pantalla.toast('Ya tienes tres importantes: quita una antes de marcar otra.'); return; }
    render();
  });
  action('catDel', function (c) {
    armedDelete(c.el, function () { Ajustes.areaBorrar(c.id); render(); });
  });

  /* --- seguridad --- */
  action('sheetPass', function () { openSheet({ t: 'pass' }); });
  action('savePass', function () { savePass(); });

  function savePass() {
    var msg = document.getElementById('pwMsg');
    function bad(t) { msg.style.color = 'var(--bad)'; msg.textContent = t; }
    if (isBusy()) return;                     // antes de llamar: el servicio ya empieza a trabajar
    var r = Cuentas.cambiarContrasena(val('pwOld'), val('pwNew'), val('pwNew2'));
    if (!r.espera) { bad(r.msg); return; }
    setBusy(true); msg.style.color = 'var(--ink-2)'; msg.textContent = 'Comprobando…';
    busyBtn('#sheet [data-a="savePass"]', true, 'Comprobando…');
    r.espera.then(function (res) {
      setBusy(false); busyBtn('#sheet [data-a="savePass"]', false);
      if (!res.ok) { bad(res.msg); return; }
      ui.sheet = null; renderSheet(); popNav('sheet');
      ui.screen = 'splash'; render(); window.scrollTo(0, 0);
      Pantalla.toast('Contraseña actualizada. Vuelve a entrar con la nueva.');
    });
  }

  /* --- respaldo --- */
  action('sheetBackup', function () { openSheet({ t: 'backup' }); });
  action('bkCopy', function () {
    var box = document.getElementById('bkBox'); box.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (er) { ok = false; }
    if (!ok && navigator.clipboard) { navigator.clipboard.writeText(box.value).then(function () { }, function () { }); ok = true; }
    if (ok) Ajustes.respaldoCopiado();
    document.getElementById('bkMsg').textContent = ok ? 'Copiado. Pégalo en una nota y ya tienes tu respaldo.' : 'Selecciona el texto y cópialo a mano.';
  });
  action('bkRestore', function () {
    var msg = document.getElementById('bkMsg');
    var r = Ajustes.restaurar(val('bkBox'));
    if (!r.ok) {
      msg.style.color = 'var(--bad)';
      msg.textContent = 'Ese texto no es un respaldo válido. Pega el bloque entero, desde la primera llave hasta la última.';
      return;
    }
    Pantalla.applyTheme();
    msg.style.color = 'var(--good)';
    msg.textContent = 'Respaldo restaurado.' + (r.sinContrasena ? ' La contraseña no viajaba en él: créala desde Seguridad.' : '');
    render();
  });
  action('bkWipe', function (c) {
    var el = c.el;
    if (el.getAttribute('data-armed') !== '1') {
      el.setAttribute('data-armed', '1'); el.textContent = '¿Seguro? Pulsa otra vez';
      setTimeout(function () { if (el.parentNode) { el.removeAttribute('data-armed'); el.textContent = 'Borrar todo'; } }, 4000);
      return;
    }
    Ajustes.borrarTodo();
    ui.screen = 'splash'; ui.tab = 'metas';
    Pantalla.applyTheme(); closeSheet(); render();
    Pantalla.toast('Todo borrado.');
  });

  /* --- campos --- */
  UI.onInput('catEmoji', function (c) { Ajustes.areaEmoji(c.id, c.el.value); });
  UI.onInput('catName', function (c) { Ajustes.areaNombre(c.id, c.el.value); });
  UI.onInput('acName', function (c) { Cuentas.nombre(c.el.value); });
  UI.onInput('acMail', function (c) { Cuentas.correo(c.el.value); });
  UI.onInput('feedback', function (c) { Ajustes.comentario(c.el.value); grow(c.el); });
  UI.onInputWhen(function (el) { return el.hasAttribute('data-p'); }, function (c) {
    Ajustes.campoPerfil(c.el.getAttribute('data-p'), c.el.value);
  });
  UI.onChangeWhen(function (el) { return el.id === 'pushHour'; }, function (c) {
    Recordatorio.hora(c.el.value.split(':')[0]);
  });
  UI.onChangeWhen(function (el) { return el.id === 'pfPhoto' || el.id === 'pfPhoto2'; }, function (c) {
    V.readImage(c.el.files && c.el.files[0], 256, function (data) {
      Ajustes.foto(data); render(); Pantalla.toast('Foto actualizada.');
    });
  });
})();
