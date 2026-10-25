/* ==========================================================================
   PRESENTACIÓN — controlador de Visión: tablero, visión a 5 años y «Mi Yo
   del Futuro». Llama a los casos de uso de Vision y repinta.
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
  action('saveFutureOnly', function () { Vision.guardar(); goApp('vision'); });

  /* --- tablero --- */
  action('addQuote', function () { Vision.frase(''); render(); openSheet({ t: 'tile', i: 0 }); });
  action('plantillas', function () { openSheet({ t: 'plantillas' }); });
  action('addPlantilla', function (c) { Vision.frase(V.PLANTILLAS[idx(c)]); closeSheet(); Pantalla.toast('Frase añadida al tablero.'); });
  action('boardEdit', function (c) { openSheet({ t: 'tile', i: idx(c) }); });
  action('boardDel', function (c) {
    Vision.borrarTarjeta(idx(c));
    if (ui.sheet && ui.sheet.t === 'tile') closeSheet(); else render();
    Pantalla.toast('Tarjeta eliminada.');
  });
  action('boardMove', function (c) { if (Vision.moverTarjeta(idx(c), +c.el.getAttribute('data-d')).ok) render(); });

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
  UI.onInput('fgoal', function (c) { Vision.futuro(c.el.getAttribute('data-c'), 'goal', c.el.value); grow(c.el); });
  UI.onInput('fwhy', function (c) { Vision.futuro(c.el.getAttribute('data-c'), 'why', c.el.value); grow(c.el); });
  UI.onChangeWhen(function (el) { return el.id === 'boardImg'; }, function (c) {
    V.readImage(c.el.files && c.el.files[0], 720, function (data) {
      var r = Vision.imagen(data);
      render();
      if (r.ok) Pantalla.toast('Imagen añadida.');
    });
  });
})();
