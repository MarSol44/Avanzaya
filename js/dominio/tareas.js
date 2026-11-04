/* Brújula de Vida — dominio de las tareas del plan.

   Solo reglas de negocio: qué es una tarea hecha, qué pasos de metas tocan
   un día, cómo se mueve o se añade una tarea. No pinta, no guarda y no sabe
   cómo está organizado el estado de la app.

   Dependencias (inversión de dependencias): se le inyecta
     repo   — dónde viven las tareas (interfaz pequeña, ver REPO más abajo)
     shift  — sumar días a una fecha 'AAAA-MM-DD'
     uid    — generar identificadores
   La app le pasa un adaptador sobre su estado; las pruebas, uno en memoria.

   Interfaces separadas (segregación de interfaces):
     queries  — solo lectura; es lo único que necesitan las pantallas
     commands — cambian datos; los usan las acciones
   Los comandos devuelven { ok: true, ... } o { ok: false, reason }. Qué
   mensaje enseñar lo decide la pantalla, no estas reglas.

   REPO:
     day(d)          → lista de tareas del día (puede ser [] si no hay)
     ensureDay(d)    → lista del día, creándola si no existe
     setDay(d, list) → sustituye la lista (vacía = el día desaparece)
     days()          → fechas que tienen tareas
     todo()          → pendientes sin fecha
     setTodo(list)   → sustituye los pendientes sin fecha
     goals(kind)     → metas 'S' (corto plazo) o 'L' (largo plazo)          */
(function (root) {
  'use strict';

  var LIMITS = { day: 60, todo: 200, overdueDays: 14 };
  var TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
  var DATE = /^\d{4}-\d\d-\d\d$/;

  function byId(list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function cleanTime(t) { return TIME.test(t || '') ? t : ''; }
  function cleanKind(k) { return k === 'appt' ? 'appt' : 'task'; }

  function create(deps) {
    var repo = deps.repo, shift = deps.shift, uid = deps.uid;
    // (opcional) hoy, para apuntar cuándo se completó algo: doneAt. Lo de antes no
    // tiene fecha y no se le inventa.
    var today = deps.today || function () { return ''; };
    function marcarHecho(x, hecho) { x.done = hecho; if (hecho && today()) x.doneAt = today(); else delete x.doneAt; }

    /* --------------------------------------------------------- consultas */
    function find(day, id) { return byId(repo.day(day), id); }

    function goalById(id) {
      var g = byId(repo.goals('S'), id);
      if (g) return { g: g, k: 'S' };
      g = byId(repo.goals('L'), id);
      return g ? { g: g, k: 'L' } : null;
    }
    // Una tarea puede venir de un paso de meta (goalId + sid).
    function stepLink(e) {
      if (!e || !e.goalId || !e.sid || e.sid === '__due') return null;
      var x = goalById(e.goalId);
      return x ? byId(x.g.steps || [], e.sid) : null;
    }
    // Si viene de un paso, «hecha» es el estado del paso: se marca en un sitio y se ve en los dos.
    function isDone(e) { var s = stepLink(e); return !!(e.done || (s && s.done)); }

    // ¿Ya hay una tarea (en cualquier día o sin fecha) para este paso? Así nunca se duplica.
    function linked(gid, sid) {
      var same = function (x) { return x.goalId === gid && x.sid === sid; };
      return repo.days().some(function (d) { return repo.day(d).some(same); }) || repo.todo().some(same);
    }

    // Pasos de metas (y fechas límite) que caen ese día y aún no son tareas.
    function goalsForDay(day) {
      var out = [];
      ['S', 'L'].forEach(function (kind) {
        repo.goals(kind).forEach(function (g) {
          (g.steps || []).forEach(function (s) {
            // un paso de largo plazo ascendido ya vive como meta corta: no se repite
            if (s.due === day && !(kind === 'L' && s.promoted) && !linked(g.id, s.id)) out.push({ k: kind, g: g, s: s });
          });
          if (g.due === day && !g.done && !linked(g.id, '__due')) out.push({ k: kind, g: g, s: null });
        });
      });
      return out;
    }

    // Tareas sin hacer de los días anteriores (dos semanas).
    function overdue(today) {
      var out = [];
      for (var i = LIMITS.overdueDays; i >= 1; i--) {
        var k = shift(today, -i);
        repo.day(k).forEach(function (e) { if (!isDone(e)) out.push({ e: e, day: k }); });
      }
      return out;
    }

    // Pasos de metas sin hacer cuyo día ya pasó (dos semanas). Sin esto, un paso
    // que no se hizo a tiempo desaparecía de Hoy y solo quedaba dentro de su meta.
    function overdueSteps(today) {
      var out = [];
      for (var i = LIMITS.overdueDays; i >= 1; i--) {
        var k = shift(today, -i);
        goalsForDay(k).forEach(function (x) { if (x.s && !x.s.done && !x.g.done) out.push({ k: x.k, g: x.g, s: x.s, day: k }); });
      }
      return out;
    }

    // Lo que se hizo ese día: tareas y pasos de metas (para la revisión de la semana).
    function doneOn(day) {
      return repo.day(day).filter(isDone).length +
        goalsForDay(day).filter(function (x) { return x.s && x.s.done; }).length;
    }

    // Lo que queda por hacer ese día: tareas y pasos de metas.
    function pending(day) {
      return repo.day(day).filter(function (e) { return !isDone(e); }).length +
        goalsForDay(day).filter(function (x) { return x.s && !x.s.done; }).length;
    }

    /* ---------------------------------------------------------- comandos */
    function without(list, id) { return list.filter(function (x) { return x.id !== id; }); }
    function hasRoom(day) { return repo.day(day).length < LIMITS.day; }

    function add(day, data) {
      var title = String((data && data.title) || '').trim();
      if (!title) return { ok: false, reason: 'empty' };
      if (!DATE.test(day || '')) return { ok: false, reason: 'date' };
      if (!hasRoom(day)) return { ok: false, reason: 'full' };
      var e = { id: uid(), title: title, goalId: '', sid: '', time: cleanTime(data.time), done: false, kind: cleanKind(data.kind) };
      repo.ensureDay(day).push(e);
      return { ok: true, event: e };
    }

    // Apuntar algo sin día: va directo a los pendientes sin fecha.
    function addTodo(data) {
      var title = String((data && data.title) || '').trim();
      if (!title) return { ok: false, reason: 'empty' };
      if (repo.todo().length >= LIMITS.todo) return { ok: false, reason: 'todoFull' };
      var x = { id: uid(), title: title, kind: cleanKind(data.kind), goalId: '', sid: '' };
      repo.setTodo([x].concat(repo.todo()));
      return { ok: true, todo: x };
    }

    function remove(day, id) {
      var e = find(day, id);
      repo.setDay(day, without(repo.day(day), id));
      return { ok: true, event: e };
    }
    // «Deshacer» de lo anterior.
    function restore(day, e) {
      if (!e) return { ok: false, reason: 'missing' };
      repo.ensureDay(day).push(e);
      return { ok: true };
    }

    function toggle(day, id) {
      var e = find(day, id);
      if (!e) return { ok: false, reason: 'missing' };
      var nv = !isDone(e), st = stepLink(e);
      marcarHecho(e, nv);
      if (st) marcarHecho(st, nv);        // el paso de la meta se marca a la vez
      return { ok: true, done: nv };
    }

    function toggleStep(kind, gid, sid) {
      var g = byId(repo.goals(kind), gid), s = g && byId(g.steps || [], sid);
      if (!s) return { ok: false, reason: 'missing' };
      marcarHecho(s, !s.done);
      return { ok: true, done: s.done };
    }

    // Un paso de meta pasa a ser tarea enlazada en su propio día (para ponerle hora o moverlo).
    function materializeStep(kind, gid, sid, fallbackDay) {
      var g = byId(repo.goals(kind), gid), s = g && byId(g.steps || [], sid);
      if (!s) return { ok: false, reason: 'missing' };
      var day = s.due || fallbackDay;
      if (!hasRoom(day)) return { ok: false, reason: 'full' };
      var e = { id: uid(), title: s.name || 'Paso', goalId: g.id, sid: s.id, time: '', done: !!s.done, kind: 'task' };
      repo.ensureDay(day).push(e);
      return { ok: true, event: e };
    }

    // Pasa una tarea a otro día; con `to` vacío va a los pendientes sin fecha.
    function move(from, id, to) {
      var e = find(from, id);
      if (!e || to === from) return { ok: false, reason: 'missing' };
      if (to && !DATE.test(to)) return { ok: false, reason: 'date' };
      if (to && !hasRoom(to)) return { ok: false, reason: 'full' };
      if (!to && repo.todo().length >= LIMITS.todo) return { ok: false, reason: 'todoFull' };
      repo.setDay(from, without(repo.day(from), id));
      if (to) {
        repo.ensureDay(to).push(e);
        // reprogramar un paso de meta también cambia su fecha, para que el
        // calendario no lo vuelva a colocar en el día antiguo
        var st = stepLink(e);
        if (st) st.due = to;
      } else {
        repo.setTodo([{ id: e.id, title: e.title, kind: e.kind, goalId: e.goalId || '', sid: e.sid || '' }].concat(repo.todo()));
        // un paso sin día deja de tener fecha también en su meta
        var st2 = stepLink(e);
        if (st2) st2.due = '';
      }
      return { ok: true, to: to };
    }

    function setTime(day, id, time) {
      var e = find(day, id);
      if (!e) return { ok: false, reason: 'missing' };
      e.time = cleanTime(time);
      return { ok: true };
    }

    function pullTodo(id, day) {
      var x = byId(repo.todo(), id);
      if (!x) return { ok: false, reason: 'missing' };
      if (!hasRoom(day)) return { ok: false, reason: 'full' };
      var e = { id: uid(), title: x.title, goalId: x.goalId || '', sid: x.sid || '', time: '', done: false, kind: x.kind };
      repo.ensureDay(day).push(e);
      var st = stepLink(e); if (st) st.due = day;
      repo.setTodo(without(repo.todo(), id));
      return { ok: true, event: e };
    }

    function removeTodo(id) {
      var x = byId(repo.todo(), id);
      repo.setTodo(without(repo.todo(), id));
      return { ok: true, todo: x };
    }
    function restoreTodo(x) {
      if (!x) return { ok: false, reason: 'missing' };
      repo.setTodo([x].concat(repo.todo()));
      return { ok: true };
    }

    // Trae a hoy todas las atrasadas sin hacer (tareas y pasos de metas); las
    // hechas se quedan en su día.
    function moveOverdue(today) {
      var moved = 0;
      overdueSteps(today).forEach(function (x) { x.s.due = today; moved++; });
      for (var i = LIMITS.overdueDays; i >= 1; i--) {
        var day = shift(today, -i), keep = [];
        repo.day(day).forEach(function (x) {
          if (!isDone(x) && hasRoom(today)) {
            repo.ensureDay(today).push(x); moved++;
            var st = stepLink(x); if (st) st.due = today;
          } else keep.push(x);
        });
        if (repo.day(day).length) repo.setDay(day, keep);
      }
      return { ok: moved > 0, moved: moved, reason: moved ? '' : 'full' };
    }

    // Al final de un día que no dio para todo: lo atrasado y lo que queda de hoy
    // pasa a `to`. Lo de hoy con hora no se mueve: seguramente ya pasó (una cita).
    function postpone(today, to) {
      var moved = 0;
      var steps = overdueSteps(today).concat(goalsForDay(today).filter(function (x) { return x.s && !x.s.done && !x.g.done; }));
      for (var i = LIMITS.overdueDays; i >= 0; i--) {
        var day = shift(today, -i), keep = [];
        repo.day(day).forEach(function (x) {
          if (!isDone(x) && !(i === 0 && x.time) && hasRoom(to)) {
            repo.ensureDay(to).push(x); moved++;
            var st = stepLink(x); if (st) st.due = to;
          } else keep.push(x);
        });
        if (repo.day(day).length) repo.setDay(day, keep);
      }
      steps.forEach(function (x) { x.s.due = to; moved++; });
      return { ok: moved > 0, moved: moved, reason: moved ? '' : 'none' };
    }

    return {
      queries: {
        find: find, goalById: goalById, stepLink: stepLink, isDone: isDone, linked: linked,
        goalsForDay: goalsForDay, overdue: overdue, overdueSteps: overdueSteps, doneOn: doneOn, pending: pending
      },
      commands: {
        add: add, addTodo: addTodo, remove: remove, restore: restore, toggle: toggle, toggleStep: toggleStep,
        materializeStep: materializeStep, move: move, setTime: setTime,
        pullTodo: pullTodo, removeTodo: removeTodo, restoreTodo: restoreTodo, moveOverdue: moveOverdue, postpone: postpone
      }
    };
  }

  root.BdvTasks = { create: create, LIMITS: LIMITS };
})(typeof window !== 'undefined' ? window : globalThis);
