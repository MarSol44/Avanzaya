/* ==========================================================================
   PRESENTACIÓN — controlador de Visión: la visión escrita, las imágenes y
   frases, y «Mi Yo del Futuro». Llama a los casos de uso de Vision y repinta.
   ========================================================================== */
(function () {
  'use strict';
  var ui = UIState;
  var action = UI.action, render = UI.render, openSheet = UI.openSheet, closeSheet = UI.closeSheet,
    goApp = UI.goApp, grow = UI.grow, armedDelete = UI.armedDelete;
  function idx(c) { return +c.el.getAttribute('data-i'); }

  /* --- Mi Yo del Futuro --- */
  action('openFuture', function (c) { openSheet({ t: 'future', c: c.el.getAttribute('data-c') }); });
  action('saveFuture', function () { Vision.guardar(); closeSheet(); Pantalla.toast('Guardado.'); });
  action('clearFuture', function (c) { Vision.borrarFuturo(c.el.getAttribute('data-c')); closeSheet(); });
  // de la visión a la acción: una meta corta nueva, ya en su área
  action('metaDeArea', function (c) {
    var cid = c.el.getAttribute('data-c');
    Vision.guardar();
    var g = Objetivos.crear('S');
    Objetivos.campo('S', g.id, 'cat', cid);
    ui.sheetTab = 'desc';
    openSheet({ t: 'goal', k: 'S', id: g.id });
    setTimeout(function () { var el = document.querySelector('#sheet [data-f="gname"]'); if (el) el.focus(); }, 60);
  });
  action('saveFutureOnly', function () { Vision.guardar(); goApp('vision'); });

  /* --- imágenes y frases --- */
  // La frase nueva no se crea hasta que se guarda: cerrar sin escribir no deja nada.
  action('addQuote', function () { ui.fraseNueva = ''; openSheet({ t: 'tile', i: -1 }); });
  action('usarIdea', function (c) {
    var ta = document.getElementById('fraseNueva');
    if (!ta) return;
    ta.value = ui.fraseNueva = V.IDEAS_FRASE[idx(c)] || '';
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  });
  action('guardarFrase', function () {
    var v = String(ui.fraseNueva || '').trim();
    if (!v) { Pantalla.toast('Escribe la frase primero.'); return; }
    Vision.frase(v); ui.fraseNueva = '';
    closeSheet(); Pantalla.toast('Frase añadida.');
  });
  action('boardEdit', function (c) { openSheet({ t: 'tile', i: idx(c) }); });
  action('boardDel', function (c) {
    armedDelete(c.el, function () {
      Vision.borrarTarjeta(idx(c));
      if (ui.sheet && ui.sheet.t === 'tile') closeSheet(); else render();
      Pantalla.toast('Quitada.');
    });
  });
  // Mover desde la hoja: la hoja sigue abierta y acompaña a la pieza a su nuevo sitio.
  action('boardMove', function (c) {
    var i = idx(c), d = +c.el.getAttribute('data-d');
    if (!Vision.moverTarjeta(i, d).ok) return;
    if (ui.sheet && ui.sheet.t === 'tile') { ui.sheet.i = i + d; UI.refresh(); } else render();
  });

  /* --- visión a 5 años --- */
  action('visionAdd', function () {
    Vision.nueva(); render();
    var tas = document.querySelectorAll('[data-f="vision"]');
    if (tas.length) tas[tas.length - 1].focus();
  });
  action('visionDel', function (c) { armedDelete(c.el, function () { Vision.borrar(c.id); render(); }); });

  /* --- campos --- */
  UI.onInput('vision', function (c) { Vision.texto(c.id, c.el.value); grow(c.el); });
  UI.onInput('tilecap', function (c) { Vision.textoTarjeta(idx(c), c.el.value); grow(c.el); render(); });
  UI.onInputWhen(function (el) { return el.id === 'fraseNueva'; }, function (c) { ui.fraseNueva = c.el.value; grow(c.el); });
  UI.onInput('fgoal', function (c) { Vision.futuro(c.el.getAttribute('data-c'), 'goal', c.el.value); grow(c.el); });
  UI.onInput('fwhy', function (c) { Vision.futuro(c.el.getAttribute('data-c'), 'why', c.el.value); grow(c.el); });
  UI.onChangeWhen(function (el) { return el.id === 'boardImg'; }, function (c) {
    V.readImage(c.el.files && c.el.files[0], 720, function (data) {
      var r = Vision.imagen(data);
      render();
      // recién añadida: se pregunta qué significa, que es lo que la hace tuya
      if (r.ok) openSheet({ t: 'tile', i: 0, nueva: true });
    });
    c.el.value = '';   // poder elegir la misma imagen otra vez
  });
})();
