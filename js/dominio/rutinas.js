/* Brújula de Vida — dominio de las rutinas y la racha.

   Reglas: qué se marcó cada día, si un día está completo, a medias o vacío,
   y cuántos días seguidos llevas. No pinta ni guarda; no conoce el estado
   de la app: trabaja contra un repositorio pequeño que le inyectan.

   Dependencias:
     repo   — log(d) → registro del día o null · ensureLog(d) → registro (lo crea)
              routines() → { day: [...], night: [...] } · start() → primer día de uso
              rest() → { week: [días 0-6], dates: { fecha: true } } (opcional)
     today  — fecha de hoy 'AAAA-MM-DD'
     shift  — sumar días a una fecha
     diff   — días entre dos fechas (a, b) → b - a

   Un hábito puede llevar days (días de la semana en que toca; sin él, todos)
   y paused (fecha desde la que está en pausa; los días anteriores no cambian). */
(function (root) {
  'use strict';

  function create(deps) {
    var repo = deps.repo, today = deps.today, shift = deps.shift, diff = deps.diff;

    // Registro del día, siempre con sus dos listas (lo crea si no existe).
    function log(k) {
      var l = repo.ensureLog(k);
      if (!l.day) l.day = [];
      if (!l.night) l.night = [];
      return l;
    }

    function weekday(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getDay(); }

    // ¿Es un día de descanso? Entonces no toca ningún hábito.
    function isRest(k) {
      var r = (repo.rest && repo.rest()) || {};
      return !!((r.dates && r.dates[k]) || (r.week && r.week.indexOf(weekday(k)) >= 0));
    }
    function isDue(it, k) {
      if (it.paused && k >= it.paused) return false;
      return !it.days || it.days.indexOf(weekday(k)) >= 0;
    }
    // Los hábitos de una rutina que tocan ese día.
    function dueOn(kind, k) {
      if (isRest(k)) return [];
      return (repo.routines()[kind] || []).filter(function (it) { return isDue(it, k); });
    }

    function dayTotals(k) {
      var l = repo.log(k) || { day: [], night: [] }, done = 0, total = 0;
      ['day', 'night'].forEach(function (kind) {
        var marks = l[kind] || [], due = dueOn(kind, k);
        total += due.length;
        done += due.filter(function (it) { return marks.indexOf(it.id) >= 0; }).length;
      });
      return { done: done, total: total };
    }
    function anyMark(k) { var l = repo.log(k); return !!l && ((l.day || []).length + (l.night || []).length > 0); }

    // 's-good' = día completo · 's-warn' = a medias · 's-bad' = día pasado sin nada.
    // Antes de empezar a usar la app, el futuro y hoy sin marcar quedan neutros ('').
    function dayStatus(k) {
      if (diff(today(), k) > 0) return '';
      if (repo.start() && k < repo.start()) return '';
      var t = dayTotals(k);
      if (!t.total) return '';
      if (t.done >= t.total) return 's-good';
      if (t.done > 0) return 's-warn';
      return k === today() ? '' : 's-bad';
    }

    // Días con algún hábito marcado (hoy cuenta si ya hay algo). Un día en que no
    // tocaba nada no la corta, y un solo día sin marcar tampoco: se corta con dos
    // seguidos. Esos días no suman.
    function streak() {
      var cur = today(), n = 0, missed = 0, start = repo.start();
      if (!anyMark(cur)) cur = shift(cur, -1);
      for (var i = 0; i < 3660; i++) {          // tope por si no hay fecha de inicio
        if (start && cur < start) break;
        if (anyMark(cur)) { n++; missed = 0; }
        else if (dayTotals(cur).total > 0) { missed++; if (missed >= 2) break; }
        cur = shift(cur, -1);
      }
      return n;
    }

    return { log: log, dayTotals: dayTotals, dayStatus: dayStatus, streak: streak, isRest: isRest, isDue: isDue, dueOn: dueOn };
  }

  root.BdvRoutines = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
