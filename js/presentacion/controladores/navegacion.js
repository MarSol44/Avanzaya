/* ==========================================================================
   PRESENTACIÓN — controlador de navegación entre pantallas, hojas y documentos.
   Recibe lo que pide la pantalla (botones, campos, formularios), usa los
   servicios y repinta. Solo habla con el armazón por la interfaz UI.
   ========================================================================== */
(function () {
  'use strict';
  var ui = UIState, esc = Fmt.esc;
  var action = UI.action, render = UI.render, openSheet = UI.openSheet, closeSheet = UI.closeSheet, closeSheetSilent = UI.closeSheetSilent, goApp = UI.goApp, pushNav = UI.pushNav, popNav = UI.popNav;

  /* ------------------------------------------- resto de acciones de la app
     Registradas igual que las de Hoy: el manejador de clics de arriba solo
     despacha. Para añadir una acción, se registra aquí; no se toca nada más. */

  /* --- navegación --- */
  action('go', function (c) {
    var el = c.el, e = c.e, id = c.id, k = c.k, v = c.v, sid = c.sid;
    Pantalla.quitarToast();
    ui.screen = sid; ui.viewRC = null; render(); window.scrollTo(0, 0); return;
  });
  action('tab', function (c) {
    var el = c.el, e = c.e, id = c.id, k = c.k, v = c.v, sid = c.sid;
    var tt = el.getAttribute('data-t');
    // tocar la pestaña en la que ya estás te sube arriba del todo
    if (tt === ui.tab && ui.screen === 'app' && !ui.sheet) {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (er) { window.scrollTo(0, 0); }
      return;
    }
    closeSheetSilent();
    Pantalla.quitarToast();
    if (ui.tab === 'perfil' && tt !== 'perfil') popNav('perfil');
    goApp(tt);
    if (tt === 'perfil') pushNav('perfil');
    return;
  });
  action('sub', function (c) {
    var el = c.el, e = c.e, id = c.id, k = c.k, v = c.v, sid = c.sid;
    ui.subMetas = sid; render(); return;
  });
  action('subv', function (c) {
    var el = c.el, e = c.e, id = c.id, k = c.k, v = c.v, sid = c.sid;
    ui.subVision = sid; render(); return;
  });
  action('closeSheet', function (c) {
    var el = c.el, e = c.e, id = c.id, k = c.k, v = c.v, sid = c.sid;
    e.preventDefault(); closeSheet(); return;
  });

  action('togglepw', function (c) {
    var el = c.el, e = c.e, id = c.id, k = c.k, v = c.v, sid = c.sid;
    e.preventDefault();
    ui.showPw = !ui.showPw;
    var wrap = el.closest('form') || document;
    var pws = wrap.querySelectorAll('input[type="password"], input[data-pw]');
    var all = wrap.querySelectorAll('#liPass,#rgPass,#rgPass2,#ncPass,#ncPass2');
    for (var i = 0; i < all.length; i++) {
      all[i].type = ui.showPw ? 'text' : 'password';
      all[i].setAttribute('data-pw', '1');
    }
    el.innerHTML = I(ui.showPw ? 'eyeOff' : 'eye', 19);
    return;
  });
  var act_legal_sheetDoc = function (c) {
    var el = c.el, e = c.e, id = c.id, k = c.k, v = c.v, sid = c.sid;
    e.preventDefault(); openSheet({ t: 'doc', doc: el.getAttribute('data-doc') }); return;
  };
  action('legal', act_legal_sheetDoc);
  action('sheetDoc', act_legal_sheetDoc);
})();
