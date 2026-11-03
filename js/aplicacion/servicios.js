/* ==========================================================================
   APLICACIÓN — servicios de la app. Aquí se montan las piezas: cada servicio
   de dominio recibe un repositorio pequeño sobre el almacén y las utilidades
   de fechas (raíz de composición). Las capas de arriba usan estos servicios;
   las de abajo no saben que existen.

   Servicios que ofrece:
     TaskQueries / TaskCommands — tareas del plan (consultas / comandos)
     Goals      — metas
     Routines   — rutinas y racha
     Areas      — áreas de vida
     Revision   — chequeo de vida y revisión semanal
     Plan       — caso de uso del plan: comando de tareas + guardado
   ========================================================================== */
var TaskQueries, TaskCommands, Goals, Routines, Areas, Revision, Plan;
(function () {
  'use strict';
  var S = Store.S;

  // La semana empieza el día que la persona eligió en su perfil.
  Dates.configure({ firstDay: function () { return S.profile && S.profile.weekStart; } });

  /* -------------------------------------------- repositorios (adaptadores) */
  var goalRepo = { goals: function (kind) { return kind === 'S' ? S.goalsS : S.goalsL; } };
  var taskRepo = {
    day: function (d) { return S.events[d] || []; },
    ensureDay: function (d) { if (!S.events[d]) S.events[d] = []; return S.events[d]; },
    setDay: function (d, list) { if (list.length) S.events[d] = list; else delete S.events[d]; },
    days: function () { return Object.keys(S.events); },
    todo: function () { return S.todo; },
    setTodo: function (list) { S.todo = list; },
    goals: goalRepo.goals
  };
  var routineRepo = {
    log: function (k) { return S.rlog[k] || null; },
    ensureLog: function (k) { if (!S.rlog[k]) S.rlog[k] = { day: [], night: [] }; return S.rlog[k]; },
    routines: function () { return S.routines; },
    start: function () { return S.start; },
    rest: function () { return S.rest; }
  };

  /* ------------------------------------------------ servicios de dominio */
  var tasks = BdvTasks.create({ repo: taskRepo, shift: Dates.shift, uid: Util.uid });
  TaskQueries = tasks.queries;
  TaskCommands = tasks.commands;
  Goals = BdvGoals.create({ repo: goalRepo, today: Dates.today, diff: Dates.diff });
  Routines = BdvRoutines.create({ repo: routineRepo, today: Dates.today, shift: Dates.shift, diff: Dates.diff });
  Areas = BdvAreas.create({ repo: { cats: function () { return S.cats; } } });
  Revision = BdvRevision.create({
    repo: { rc: function () { return S.rc; }, notes: function () { return S.notes; }, reviews: function () { return S.reviews; } },
    routines: Routines, dates: Dates, uid: Util.uid
  });

  /* ------------------------------------------------- casos de uso: plan */
  // Cada comando del plan se aplica y, si salió bien, se guarda. La pantalla
  // solo pide la operación y enseña el resultado: no toca el almacén.
  function saved(r) { if (r && r.ok) Store.save(); return r; }
  Plan = {};
  Object.keys(TaskCommands).forEach(function (name) {
    Plan[name] = function () { return saved(TaskCommands[name].apply(null, arguments)); };
  });
})();
