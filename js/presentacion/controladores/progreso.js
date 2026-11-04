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
    ui.reviewWeek = V.semanaARevisar(); ui.tab = 'progreso'; ui.screen = 'app';
    render(); openSheet({ t: 'review' });
  });
  action('revWeek', function (c) {
    var dd = +c.el.getAttribute('data-d');
    var base = ui.reviewWeek || Dates.weekStart(Dates.today());
    var next = dd === 0 ? Dates.weekStart(Dates.today()) : Dates.shift(base, dd);
    if (Dates.diff(Dates.weekStart(Dates.today()), next) > 0) return;   // no se revisa el futuro
    ui.reviewWeek = next; refresh();
  });

  /* --- retos: hábitos con duración e inicio (Hábitos v2) --- */
  action('sheetChallenge', function () { openSheet({ t: 'challenge' }); });
  // un reto sin nombre no se puede sostener: primero, qué es
  action('addChallenge', function () {
    if (!val('[data-add="challenge"]').trim()) {
      Pantalla.toast('Escribe qué vas a sostener estos días.');
      UI.focusAdd('challenge');
      return;
    }
    var r = Habitos.nuevoReto(val('[data-add="challenge"]'), val('#chDays'), val('#chInicio'));
    if (!r.ok) { Pantalla.toast(r.reason === 'fecha' ? 'Elige un inicio entre hace dos meses y dentro de un año.' : 'Escribe qué vas a sostener estos días.'); return; }
    refresh();
    Pantalla.toast('Reto empezado: lo marcas en Hoy, con tus hábitos.');
  });
  // un día del reto se marca igual que el hábito ese día (no hay días futuros)
  action('chDay', function (c) { Habitos.marcar(c.el.getAttribute('data-day'), c.k, c.id); refresh(); });
  action('chRestart', function (c) { Habitos.retoReiniciar(c.k, c.id); refresh(); });
  action('chDel', function (c) {
    Habitos.retoDecision(c.k, c.id, 'terminado'); refresh();
    Pantalla.toast('Reto terminado. Su historial se queda.');
  });

  /* --- logros --- */
  action('sheetWins', function () { openSheet({ t: 'wins' }); });
  action('addWin', function () {
    var r = Progreso.logro(val('[data-add="win"]'), val('#winDate'));
    if (!r.ok) { Pantalla.toast('Escribe qué has conseguido.'); return; }
    refresh();
  });
  action('winDel', function (c) { armedDelete(c.el, function () { Progreso.logroBorrar(c.id); refresh(); }); });

  /* --- campos --- */
  UI.onInput('chName', function (c) { Habitos.nombre(c.k, c.id, c.el.value); });
  UI.onInput('winText', function (c) { Progreso.logroTexto(c.id, c.el.value); });
  UI.onInput('revWon', function (c) { Progreso.revision(c.el.getAttribute('data-w'), 'won', c.el.value); grow(c.el); });
  UI.onInput('revAdjust', function (c) { Progreso.revision(c.el.getAttribute('data-w'), 'adjust', c.el.value); grow(c.el); });
  UI.onInput('revFocus', function (c) { Progreso.revision(c.el.getAttribute('data-w'), 'focus', c.el.value); });
})();
