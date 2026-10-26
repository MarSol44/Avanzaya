/* ==========================================================================
   PRESENTACIÓN — controlador de Hoy: plan del día, tareas, rutinas, nota y
   avisos. Llama a los casos de uso (Plan, Habitos, Objetivos) y repinta.
   No toca el estado.
   ========================================================================== */
(function () {
  'use strict';
  var ui = UIState;
  var action = UI.action, render = UI.render, grow = UI.grow, armedDelete = UI.armedDelete, focusAdd = UI.focusAdd;

  // Las tareas se cambian con el caso de uso Plan (capa de aplicación), que
  // aplica el comando y guarda; este controlador solo pide y repinta.
  var Tasks = Plan;

  // Traduce el motivo de un comando de Tasks a un mensaje para la persona.
  var REASONS = {
    full: 'Ese día ya está lleno.',
    todoFull: 'Ya tienes muchos pendientes sin fecha: quita alguno.',
    empty: 'Escribe primero qué es.'
  };
  function explain(r) { if (r && !r.ok && REASONS[r.reason]) Pantalla.toast(REASONS[r.reason]); }
  function commit() { render(); }

  // El día que se está mirando en Hoy, sin volver al pasado (para añadir o traer).
  function targetDay() {
    var t = Dates.today();
    return ui.planDay && ui.planDay >= t ? ui.planDay : t;
  }

  // Pasa una tarea a otro día; con `to` vacío vuelve a los pendientes sin fecha.
  function moveTask(from, id, to) {
    var r = Tasks.move(from, id, to);
    if (!r.ok) { explain(r); return; }
    ui.moveId = null;
    commit();
    Pantalla.toast(to ? 'Pasada al ' + Fmt.fmt(to) + '.' : 'Guardada en pendientes sin fecha.');
  }

  /* --- Hoy: elegir día ----------------------------------------------- */
  action('planDay', function (c) { ui.planDay = c.el.getAttribute('data-day'); ui.moveId = null; ui.ntDate = ''; render(); });
  action('planWeek', function (c) { ui.planDay = Dates.shift(ui.planDay || Dates.today(), +c.v); ui.moveId = null; render(); });

  /* --- Hoy: tareas --------------------------------------------------- */
  action('evdone', function (c) { var r = Tasks.toggle(c.el.getAttribute('data-day'), c.id); if (r.ok) commit(); });
  action('evdel', function (c) { Tasks.remove(c.el.getAttribute('data-day'), c.id); commit(); });
  action('evmove', function (c) { ui.moveId = ui.moveId === c.id ? null : c.id; render(); });
  action('evto', function (c) { moveTask(c.el.getAttribute('data-day'), c.id, c.el.getAttribute('data-to')); });
  action('overdueAll', function () {
    var r = Tasks.moveOverdue(Dates.today());
    commit();
    Pantalla.toast(r.moved ? Fmt.plural(r.moved, 'tarea pasada', 'tareas pasadas') + ' a hoy.' : 'Hoy ya está lleno.');
  });

  /* --- Hoy: pasos de metas dentro del plan ---------------------------- */
  action('gsDone', function (c) { if (Tasks.toggleStep(c.k, c.id, c.sid).ok) commit(); });
  action('gsEdit', function (c) {
    // el paso pasa a ser una tarea enlazada en su día, para ponerle hora o moverlo
    var r = Tasks.materializeStep(c.k, c.id, c.sid, Dates.today());
    if (!r.ok) { explain(r); return; }
    ui.moveId = r.event.id;
    commit();
  });

  /* --- Hoy: añadir ----------------------------------------------------- */
  action('ntMore', function () { ui.ntMore = !ui.ntMore; render(); });
  action('ntKind', function (c) { ui.ntKind = c.v === 'appt' ? 'appt' : 'task'; render(); });
  action('ntAdd', function () {
    var day = /^\d{4}-\d\d-\d\d$/.test(ui.ntDate || '') ? ui.ntDate : targetDay();
    var r = Tasks.add(day, { title: ui.ntTitle, time: ui.ntTime, kind: ui.ntKind });
    if (!r.ok) { explain(r); return; }
    ui.ntTitle = ''; ui.ntTime = ''; ui.ntDate = ''; ui.ntMore = false;
    commit();
    // si no es el día que se está mirando, no aparece en la lista: se avisa de dónde quedó
    if (day !== (ui.planDay || Dates.today())) Pantalla.toast('Añadida al ' + Fmt.fmt(day) + '.');
  });

  /* --- Hoy: pendientes sin fecha --------------------------------------- */
  action('todoPull', function (c) { var r = Tasks.pullTodo(c.id, targetDay()); if (!r.ok) { explain(r); return; } commit(); });
  action('tododel', function (c) { Tasks.removeTodo(c.id); commit(); });

  /* --- secciones plegables (preferencias de este dispositivo) ---------- */
  action('toggleNight', function () { ui.nightOpen = true; render(); });
  action('toggleRoutines', function () {
    ui.routinesClosed = !ui.routinesClosed;
    Preferencias.set('rutinas.cerradas', ui.routinesClosed);
    render();
  });
  action('goRoutines', function () {
    ui.routinesClosed = false;
    Preferencias.set('rutinas.cerradas', false);
    render();
    var rt = document.getElementById('rutinas');
    if (rt && rt.scrollIntoView) { try { rt.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (er) { rt.scrollIntoView(); } }
  });
  action('dismiss', function (c) { Habitos.descartarAviso(c.id); render(); });
  action('openAddRoutine', function (c) { ui.addRoutine = c.k; ui.editRoutine = null; render(); focusAdd('r' + c.k); });
  action('editRoutine', function (c) { ui.editRoutine = ui.editRoutine === c.k ? null : c.k; ui.addRoutine = null; render(); });
  action('openNote', function () {
    ui.noteOpen = true; render();
    var na = document.querySelector('[data-f="note"]'); if (na) na.focus();
  });
  action('suggest', function (c) {
    Objetivos.sugerida(c.k, c.v, c.el.getAttribute('data-c'));
    render();
    Pantalla.toast('«' + c.v + '» añadida. Ábrela para ponerle pasos.');
  });

  /* --- rutinas --- */
  action('rtoggle', function (c) { Habitos.marcar(ui.selDay, c.k, c.id); render(); });
  action('radd', function (c) {
    var inp = document.querySelector('[data-add="r' + c.k + '"]');
    var r = Habitos.nuevo(c.k, inp && inp.value);
    if (!r.ok) { Pantalla.toast('Escribe el nombre del hábito.'); return; }
    ui.addRoutine = c.k;
    render(); focusAdd('r' + c.k);
    Pantalla.toast('Hábito añadido.');
  });
  action('rdel', function (c) { armedDelete(c.el, function () { Habitos.borrar(c.k, c.id); render(); }); });

  UI.onInput('ntTitle', function (c) {
    var el = c.el, id = c.id, k = c.k, sid = c.sid, g;
    ui.ntTitle = el.value; return;
  });
  UI.onInput('ntTime', function (c) {
    var el = c.el, id = c.id, k = c.k, sid = c.sid, g;
    ui.ntTime = el.value; return;
  });
  UI.onInput('ntDate', function (c) {
    var el = c.el, id = c.id, k = c.k, sid = c.sid, g;
    ui.ntDate = el.value; return;
  });
  UI.onInput('note', function (c) { Habitos.nota(ui.selDay, c.el.value); grow(c.el); });
  UI.onInput('rname', function (c) { Habitos.nombre(c.k, c.id, c.el.value); });
  UI.onChange('evdate', function (c) {
    var el = c.el, id = c.id, k = c.k, sid = c.sid, g;
    moveTask(el.getAttribute('data-day'), id, el.value); return;
  });
  UI.onChange('evtime', function (c) {
    var el = c.el, id = c.id, k = c.k, sid = c.sid, g;
    if (Tasks.setTime(el.getAttribute('data-day'), id, el.value).ok) render(); return;
  });
})();
