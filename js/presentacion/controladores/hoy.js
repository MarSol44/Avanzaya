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
    Pantalla.toast(to ? 'Pasada ' + Fmt.aDia(to) + '.' : 'Guardada en pendientes sin fecha.');
  }

  /* --- Hoy: elegir día ----------------------------------------------- */
  action('planDay', function (c) { ui.planDay = c.el.getAttribute('data-day'); ui.moveId = null; ui.ntDate = ''; render(); });
  action('planWeek', function (c) { ui.planDay = Dates.shift(ui.planDay || Dates.today(), +c.v); ui.moveId = null; render(); });

  /* --- Hoy: tareas --------------------------------------------------- */
  action('evdone', function (c) {
    var day = c.el.getAttribute('data-day'), r = Tasks.toggle(day, c.id);
    if (!r.ok) return;
    commit();
    // una atrasada hecha sale de la lista: que se note, y que se pueda deshacer
    if (r.done && day < Dates.today()) Pantalla.toast('Hecha.', function () { Tasks.toggle(day, c.id); commit(); });
  });
  action('evdel', function (c) {
    var day = c.el.getAttribute('data-day'), r = Tasks.remove(day, c.id);
    ui.moveId = null;
    // si era un paso de una meta, sale del plan pero sigue en su meta (sin fecha):
    // la meta no pierde nada y se puede volver a programar (con «Deshacer», como estaba)
    var e = r.event, x = e && e.goalId && e.sid && e.sid !== '__due' && TaskQueries.goalById(e.goalId);
    var st = x && Util.byId(x.g.steps || [], e.sid), antes = st ? st.due : '';
    if (st) Objetivos.pasoFecha(x.k, x.g.id, e.sid, '');
    commit();
    Pantalla.toast(st ? 'Fuera de tu plan. El paso sigue en «' + (x.g.name || 'su meta') + '», sin fecha.' : 'Tarea quitada.', function () {
      if (st) Objetivos.pasoFecha(x.k, x.g.id, e.sid, antes);
      Tasks.restore(day, r.event); commit();
    });
  });
  action('evmove', function (c) { ui.moveId = ui.moveId === c.id ? null : c.id; render(); });
  action('evto', function (c) { moveTask(c.el.getAttribute('data-day'), c.id, c.el.getAttribute('data-to')); });
  action('postponeAll', function () {
    var r = Tasks.postpone(Dates.today(), Dates.shift(Dates.today(), 1));
    commit();
    Pantalla.toast(r.moved ? Fmt.plural(r.moved, 'pendiente pasado', 'pendientes pasados') + ' a mañana.' : 'No queda nada por pasar.');
  });
  action('overdueAll', function () {
    var r = Tasks.moveOverdue(Dates.today());
    commit();
    Pantalla.toast(r.moved ? Fmt.plural(r.moved, 'tarea pasada', 'tareas pasadas') + ' a hoy.' : 'Hoy ya está lleno.');
  });

  /* --- Hoy: pasos de metas dentro del plan ---------------------------- */
  action('gsDone', function (c) { if (Tasks.toggleStep(c.k, c.id, c.sid).ok) commit(); });
  // poner día al siguiente paso de una meta corta (desde «Siguiente paso de tus metas»)
  action('pasoDia', function (c) {
    Objetivos.pasoFecha(c.k === 'L' ? 'L' : 'S', c.id, c.sid, c.v);
    commit();
    Pantalla.toast(c.v === Dates.today() ? 'En tu plan de hoy.' : 'En tu plan de ' + Fmt.cuando(c.v) + '.');
  });
  action('gsEdit', function (c) {
    // el paso pasa a ser una tarea enlazada en su día, para ponerle hora o moverlo
    var r = Tasks.materializeStep(c.k, c.id, c.sid, Dates.today());
    if (!r.ok) { explain(r); return; }
    ui.moveId = r.event.id;
    commit();
  });

  /* --- Hoy: añadir ----------------------------------------------------- */
  function anadirTarea() {
    var day = /^\d{4}-\d\d-\d\d$/.test(ui.ntDate || '') ? ui.ntDate : targetDay();
    var r = Tasks.add(day, { title: ui.ntTitle, time: ui.ntTime });
    if (!r.ok) { explain(r); return; }
    ui.ntTitle = ''; ui.ntTime = ''; ui.ntDate = ''; ui.ntMore = false;
    commit();
    // si no es el día que se está mirando, no aparece en la lista: se avisa de dónde quedó
    if (day !== (ui.planDay || Dates.today())) Pantalla.toast('Añadida para ' + Fmt.cuando(day) + '.');
  }
  action('ntMore', function () { ui.ntMore = !ui.ntMore; render(); });
  action('ntDia', function (c) { ui.ntDate = c.v; render(); });
  action('ntAdd', anadirTarea);
  // «Guardar» en el panel del día: con algo escrito, la tarea se añade ya;
  // sin nada, se cierra el panel y se vuelve al campo para escribirla.
  action('ntListo', function () {
    if (String(ui.ntTitle || '').trim()) { anadirTarea(); return; }
    ui.ntMore = false; render(); focusAdd('task');
  });

  /* --- el «+» de la barra: apuntar algo desde cualquier pantalla ---------- */
  function nuevoApunte() { return { title: '', when: 'hoy', time: '', date: '', rutina: 'day', days: [0, 1, 2, 3, 4, 5, 6] }; }
  function quick() { return ui.quick || (ui.quick = nuevoApunte()); }
  action('quick', function () {
    ui.quick = nuevoApunte();
    UI.openSheet({ t: 'quick' });
    setTimeout(function () { var el = document.querySelector('#sheet [data-f="qTitle"]'); if (el) el.focus(); }, 60);
  });
  action('qWhen', function (c) {
    var q = quick();
    // «Elegir fecha» y «Se repite» se desmarcan tocándolos otra vez
    q.when = q.when === c.v && (c.v === 'fecha' || c.v === 'repite') ? 'hoy' : c.v;
    if (q.when === 'sin' || q.when === 'repite') q.time = '';
    UI.renderSheet();
  });
  action('qDia', function (c) {
    var q = quick(), d = +c.v, p = q.days.indexOf(d);
    if (p >= 0 && q.days.length === 1) { Pantalla.toast('Deja al menos un día.'); return; }
    if (p >= 0) q.days.splice(p, 1); else q.days.push(d);
    UI.renderSheet();
  });
  action('qRutina', function (c) { quick().rutina = c.v === 'night' ? 'night' : 'day'; UI.renderSheet(); });
  UI.onChange('qDate', function (c) { quick().date = c.el.value; UI.renderSheet(); });
  UI.onInput('qTitle', function (c) { quick().title = c.el.value; });
  UI.onInput('qTime', function (c) { quick().time = c.el.value; });
  UI.onChange('qTime', function (c) { quick().time = c.el.value; });

  // Apunta lo escrito donde toca. Devuelve true si se apuntó.
  function apuntar() {
    var q = quick(), r;
    if (q.when === 'repite') {
      r = Habitos.nuevo(q.rutina, q.title, q.days);
    } else if (q.when === 'sin') {
      r = Tasks.addTodo({ title: q.title, kind: 'task' });
    } else if (q.when === 'fecha') {
      if (!q.date || q.date < Dates.today()) { Pantalla.toast('Elige hoy o un día que aún no haya pasado.'); return false; }
      r = Tasks.add(q.date, { title: q.title, time: q.time });
    } else {
      r = Tasks.add(q.when === 'manana' ? Dates.shift(Dates.today(), 1) : Dates.today(), { title: q.title, time: q.time });
    }
    if (!r.ok) { explain(r); return false; }
    return true;
  }
  action('qSave', function () {
    var q = quick(), when = q.when;
    if (!apuntar()) return;
    UI.closeSheet(); render();
    Pantalla.toast(when === 'sin' ? 'Guardada en pendientes sin fecha.' : when === 'repite' ? 'Hábito añadido a tu rutina ' + (q.rutina === 'night' ? 'de noche.' : 'de día.') :
      when === 'fecha' ? 'Apuntada para ' + Fmt.cuando(q.date) + '.' : when === 'manana' ? 'Apuntada para mañana.' : 'Apuntada en el plan de hoy.');
  });
  action('qMore', function () {
    var q = quick();
    if (!apuntar()) return;
    q.title = ''; q.time = '';   // el día se conserva; la hora, no
    UI.renderSheet(); render();
    var el = document.querySelector('#sheet [data-f="qTitle"]'); if (el) el.focus();
    Pantalla.toast('Apuntada. Escribe la siguiente.');
  });

  /* --- Hoy: pendientes sin fecha --------------------------------------- */
  action('todoPull', function (c) { var r = Tasks.pullTodo(c.id, targetDay()); if (!r.ok) { explain(r); return; } commit(); });
  action('tododel', function (c) {
    var r = Tasks.removeTodo(c.id);
    commit();
    Pantalla.toast('Pendiente quitado.', function () { Tasks.restoreTodo(r.todo); commit(); });
  });

  /* --- secciones plegables (preferencias de este dispositivo) ---------- */
  action('toggleNight', function () { ui.nightOpen = true; render(); });
  action('toggleRoutines', function () {
    ui.routinesClosed = !ui.routinesClosed;
    Preferencias.set('rutinas.cerradas', ui.routinesClosed);
    render();
  });
  action('toggleNote', function () {
    ui.noteClosed = !ui.noteClosed;
    Preferencias.set('nota.cerrada', ui.noteClosed);
    render();
  });
  action('dismiss', function (c) { Habitos.descartarAviso(c.id); render(); });
  // Cambiar entre «Día» y «Noche» no borra lo que ya se había escrito.
  action('openAddRoutine', function (c) {
    var prev = document.querySelector('[data-add="rday"],[data-add="rnight"]');
    if (prev) ui.rTexto = prev.value;
    ui.addRoutine = c.k; ui.editRoutine = null; render(); focusAdd('r' + c.k);
  });
  action('editRoutine', function () { ui.editRoutine = ui.editRoutine ? null : 'todas'; ui.addRoutine = null; render(); });
  action('openNote', function () {
    ui.noteOpen = true; render();
    var na = document.querySelector('[data-f="note"]'); if (na) na.focus();
  });
  // la meta sugerida se abre ya por sus pasos: es lo siguiente que hay que hacer con ella
  action('suggest', function (c) {
    var g = Objetivos.sugerida(c.k, c.v, c.el.getAttribute('data-c'));
    ui.sheetTab = 'steps';
    render();
    UI.openSheet({ t: 'goal', k: c.k, id: g.id });
    setTimeout(function () { UI.focusAdd('step'); }, 60);
  });

  /* --- rutinas --- */
  action('rtoggle', function (c) { Habitos.marcar(c.el.getAttribute('data-day'), c.k, c.id); render(); });
  // Al llegar al cuarto hábito se dice una vez, sin bloquear, que tantos a la vez
  // cuesta sostenerlos (y cómo aparcar alguno); el resto de veces, solo «añadido».
  function avisoHabito() {
    var S = Datos.estado(), n = S.routines.day.length + S.routines.night.length;
    Pantalla.toast(n === 4 ? 'Hábito añadido. Llevas cuatro: con más de tres a la vez suele costar sostenerlos. Si alguno puede esperar, ponlo en pausa en «Editar».' : 'Hábito añadido.');
  }
  action('rSugerir', function (c) { Habitos.nuevo(c.k, c.v); render(); avisoHabito(); });
  action('radd', function (c) {
    var inp = document.querySelector('[data-add="r' + c.k + '"]');
    var r = Habitos.nuevo(c.k, inp && inp.value);
    if (!r.ok) { Pantalla.toast('Escribe el nombre del hábito.'); return; }
    ui.addRoutine = c.k; ui.rTexto = '';
    render(); focusAdd('r' + c.k);
    avisoHabito();
  });
  action('rdel', function (c) {
    armedDelete(c.el, function () {
      var copia = Habitos.borrar(c.k, c.id);
      render();
      Pantalla.toast('Hábito eliminado.', function () { Habitos.restaurar(copia); render(); });
    });
  });

  action('rDia', function (c) {
    if (!Habitos.dia(c.k, c.id, +c.v).ok) { Pantalla.toast('Deja al menos un día, o ponlo en pausa.'); return; }
    render();
  });
  action('rPausa', function (c) { Habitos.pausar(c.k, c.id); render(); });
  // frecuencia: diaria, días concretos, n veces por semana o al mes, o sin frecuencia fija
  UI.onChange('rfreq', function (c) { Habitos.frecuencia(c.k, c.id, c.el.value); render(); });
  UI.onChange('rfreqN', function (c) {
    var it = Util.byId(Datos.estado().routines[c.k] || [], c.id);
    if (it && it.freq) Habitos.frecuencia(c.k, c.id, it.freq.t, c.el.value);
    render();
  });
  // un reto que termina: seguir como hábito o terminarlo (en pausa, con su historial)
  action('retoSeguir', function (c) { Habitos.retoDecision(c.k, c.id, 'continuar'); render(); Pantalla.toast('Sigue como hábito. Bien hecho.'); });
  action('retoTerminar', function (c) {
    Habitos.retoDecision(c.k, c.id, 'terminado'); render();
    Pantalla.toast('Reto terminado. Su historial se queda; lo reanudas en «Editar».');
  });
  action('restDia', function (c) { Habitos.descansoSemanal(+c.v); render(); });
  action('restHoy', function () {
    Habitos.descansarHoy(); render();
    if (Routines.isRest(Dates.today())) Pantalla.toast('Hoy descansas. Tu racha sigue igual.', function () { Habitos.descansarHoy(); render(); });
  });

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
  // elegido en el calendario: «Hoy» y «Mañana» dejan de verse marcados
  UI.onChange('ntDate', function (c) { ui.ntDate = c.el.value; render(); });
  UI.onInput('note', function (c) { Habitos.nota(c.el.getAttribute('data-day'), c.el.value); grow(c.el); });
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
