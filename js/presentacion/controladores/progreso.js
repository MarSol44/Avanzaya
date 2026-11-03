/* ==========================================================================
   PRESENTACIÓN — controlador de Progreso: reto, logros y revisión semanal. Llama a los casos de uso (Progreso, Objetivos) y repinta.
   ========================================================================== */
(function () {
  'use strict';
  var ui = UIState;
  var action = UI.action, render = UI.render, refresh = UI.refresh, openSheet = UI.openSheet,
    grow = UI.grow, armedDelete = UI.armedDelete;
  function val(sel) { var el = document.querySelector(sel); return el ? el.value : ''; }

  /* --- revisión semanal --- */
  action('goReview', function () {
    ui.reviewWeek = null; ui.tab = 'progreso'; ui.screen = 'app';
    render(); openSheet({ t: 'review' });
  });
  action('revWeek', function (c) {
    var dd = +c.el.getAttribute('data-d');
    var base = ui.reviewWeek || Dates.weekStart(Dates.today());
    var next = dd === 0 ? Dates.weekStart(Dates.today()) : Dates.shift(base, dd);
    if (Dates.diff(Dates.weekStart(Dates.today()), next) > 0) return;   // no se revisa el futuro
    ui.reviewWeek = next; refresh();
  });

  /* --- reto --- */
  action('sheetChallenge', function () { openSheet({ t: 'challenge' }); });
  action('addChallenge', function () { Progreso.reto(val('[data-add="challenge"]'), val('#chDays')); refresh(); });
  action('chDay', function (c) { Progreso.retoDia(c.el.getAttribute('data-day')); refresh(); });
  action('chRestart', function () { Progreso.retoReiniciar(); refresh(); });
  action('chDel', function () { Progreso.retoBorrar(); refresh(); });

  /* --- logros --- */
  action('sheetWins', function () { openSheet({ t: 'wins' }); });
  action('addWin', function () {
    var r = Progreso.logro(val('[data-add="win"]'), val('#winDate'));
    if (!r.ok) { Pantalla.toast('Escribe qué has conseguido.'); return; }
    refresh();
  });
  action('winDel', function (c) { armedDelete(c.el, function () { Progreso.logroBorrar(c.id); refresh(); }); });

  /* --- campos --- */
  UI.onInput('chName', function (c) { Progreso.retoNombre(c.el.value); });
  UI.onInput('winText', function (c) { Progreso.logroTexto(c.id, c.el.value); });
  UI.onInput('revWon', function (c) { Progreso.revision(c.el.getAttribute('data-w'), 'won', c.el.value); grow(c.el); });
  UI.onInput('revAdjust', function (c) { Progreso.revision(c.el.getAttribute('data-w'), 'adjust', c.el.value); grow(c.el); });
  UI.onInput('revFocus', function (c) { Progreso.revision(c.el.getAttribute('data-w'), 'focus', c.el.value); });
})();
