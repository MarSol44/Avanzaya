/* ==========================================================================
   PRESENTACIÓN — controlador de Metas: metas, pasos y calendario. Llama a
   los casos de uso de Objetivos y repinta. No toca el estado.
   ========================================================================== */
(function () {
  'use strict';
  var ui = UIState;
  var action = UI.action, render = UI.render, renderSheet = UI.renderSheet, openSheet = UI.openSheet,
    closeSheet = UI.closeSheet, grow = UI.grow, armedDelete = UI.armedDelete;
  function both() { renderSheet(); render(); }
  function avisarAscenso(r) { if (r && r.nombre) Pantalla.toast('«' + r.nombre + '» ya es una meta de corto plazo.'); }

  /* --- el mes de hábitos (en Progreso; solo estado de la interfaz) --- */
  action('cal', function (c) {
    var y = +ui.calMonth.slice(0, 4), m = +ui.calMonth.slice(5, 7) + (+c.el.getAttribute('data-d'));
    var nd = new Date(y, m - 1, 1);
    ui.calMonth = nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0');
    render();
  });
  action('calToday', function () { ui.selDay = Dates.today(); ui.calMonth = ui.selDay.slice(0, 7); render(); });
  // un día del mes se abre en Hoy: ahí se ven (y se marcan) sus hábitos, tareas y nota
  action('pickDay', function (c) {
    var dia = c.el.getAttribute('data-day');
    ui.selDay = dia; ui.planDay = dia > Dates.today() ? Dates.today() : dia; ui.tab = 'hoy'; ui.moveId = null;
    render(); window.scrollTo(0, 0);
  });
  // «Programar» desde las fechas de Metas: la meta abierta por sus pasos, ya en modo programar
  action('programarMeta', function (c) {
    ui.sheetTab = 'steps'; ui.programar = true;
    openSheet({ t: 'goal', k: c.k, id: c.id });
  });

  /* --- metas --- */
  action('newGoal', function (c) {
    var g = Objetivos.crear(c.k);
    ui.sheetTab = 'desc';
    render();
    openSheet({ t: 'goal', k: c.k, id: g.id });
    setTimeout(function () { var el = document.querySelector('#sheet [data-f="gname"]'); if (el) el.focus(); }, 60);
  });
  // Se abre por los pasos (lo que hay que hacer); una meta aún sin nombre, por sus detalles.
  action('openGoal', function (c) {
    var g = Goals.find(c.k, c.id);
    ui.sheetTab = g && String(g.name || '').trim() ? 'steps' : 'desc';
    ui.programar = false;
    openSheet({ t: 'goal', k: c.k, id: c.id });
  });
  action('sheetTab', function (c) { ui.sheetTab = c.sid; renderSheet(); });
  action('gdone', function (c) { Objetivos.alternar(c.k, c.id); render(); });
  action('gdel', function (c) {
    armedDelete(c.el, function () { Objetivos.borrar(c.k, c.id); render(); Pantalla.toast('Meta eliminada.'); });
  });
  action('gdelSheet', function (c) {
    armedDelete(c.el, function () { Objetivos.borrar(c.k, c.id); closeSheet(); Pantalla.toast('Meta eliminada.'); });
  });
  action('gprio', function (c) { Objetivos.prioridad(c.id, c.v); both(); });
  action('clearQ', function () { ui.goalQ = ''; ui.refocus = 'goalSearch'; render(); });
  action('filter', function (c) { ui.goalFilter = c.v; render(); });
  action('progCat', function (c) { ui.progCat = c.v; render(); });
  action('goGoals', function () { ui.tab = 'metas'; ui.subMetas = 'goals'; ui.goalFilter = ''; render(); window.scrollTo(0, 0); });

  /* --- pasos --- */
  action('stepAdd', function (c) {
    var si = document.querySelector('#sheet [data-add="step"]');
    var r = Objetivos.pasoNuevo(c.k, c.id, si && si.value);
    if (!r.ok) { if (r.reason === 'empty') Pantalla.toast('Escribe el paso.'); return; }
    both();
  });
  action('stepDone', function (c) { Objetivos.pasoHecho(c.k, c.id, c.sid); both(); });
  action('stepDel', function (c) {
    armedDelete(c.el, function () {
      var copia = Objetivos.pasoBorrar(c.k, c.id, c.sid); both();
      Pantalla.toast('Paso eliminado.', function () { Objetivos.pasoRestaurar(copia); both(); });
    });
  });
  action('promote', function (c) { avisarAscenso(Objetivos.ascender(c.id, c.sid)); both(); });
  action('stepHito', function (c) { Objetivos.pasoHito(c.k, c.id, c.sid); both(); });
  // «Programar pasos»: muestra en cada paso pendiente Hoy / Mañana / Sin fecha.
  // Solo cambia la fecha del propio paso: no crea tareas ni metas nuevas.
  action('programar', function () { ui.programar = !ui.programar; renderSheet(); });
  action('stepDia', function (c) {
    Objetivos.pasoFecha(c.k, c.id, c.sid, c.v); both();
    Pantalla.toast(!c.v ? 'Paso sin fecha.' : c.v === Dates.today() ? 'En tu plan de hoy.' : 'Programado para ' + Fmt.cuando(c.v) + '.');
  });

  /* --- campos --- */
  UI.onInput('goalQ', function (c) { ui.goalQ = c.el.value; ui.refocus = 'goalSearch'; render(); });
  UI.onInput('gname', function (c) { Objetivos.campo(c.k, c.id, 'name', c.el.value); render(); });
  UI.onInput('gmot', function (c) { Objetivos.campo(c.k, c.id, 'motivation', c.el.value); grow(c.el); });
  UI.onInput('grew', function (c) { Objetivos.campo('S', c.id, 'reward', c.el.value); });
  // el nombre de un paso es una línea: el salto de línea se quita al escribir
  UI.onInput('sname', function (c) {
    if (/\n/.test(c.el.value)) { c.el.value = c.el.value.replace(/\s*\n+\s*/g, ' '); c.el.blur(); }
    Objetivos.pasoNombre(c.k, c.id, c.sid, c.el.value); grow(c.el);
  });
  UI.onInput('sdesc', function (c) { Objetivos.pasoDesc(c.k, c.id, c.sid, c.el.value); });
  UI.onChange('gdue', function (c) { Objetivos.campo(c.k, c.id, 'due', c.el.value); both(); });
  UI.onChange('gcat', function (c) {
    if (c.el.value === '__new') { ui.newCatColor = '#5b6ee1'; ui.catBack = { k: c.k, id: c.id }; openSheet({ t: 'cat' }); return; }
    Objetivos.campo(c.k, c.id, 'cat', c.el.value); render();
  });
  UI.onChange('sdue', function (c) { avisarAscenso(Objetivos.pasoFecha(c.k, c.id, c.sid, c.el.value)); both(); });
})();
