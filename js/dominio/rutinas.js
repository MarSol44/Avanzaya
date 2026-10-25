/* Brújula de Vida — dominio de las rutinas y la racha.

   Reglas: qué se marcó cada día, si un día está completo, a medias o vacío,
   y cuántos días seguidos llevas. No pinta ni guarda; no conoce el estado
   de la app: trabaja contra un repositorio pequeño que le inyectan.

   Dependencias:
     repo   — log(d) → registro del día o null · ensureLog(d) → registro (lo crea)
              routines() → { day: [...], night: [...] } · start() → primer día de uso
     today  — fecha de hoy 'AAAA-MM-DD'
     shift  — sumar días a una fecha
     diff   — días entre dos fechas (a, b) → b - a                              */
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

    function dayTotals(k) {
      var l = repo.log(k) || { day: [], night: [] }, r = repo.routines();
      return { done: (l.day || []).length + (l.night || []).length, total: r.day.length + r.night.length };
    }

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

    // Días seguidos con al menos un hábito marcado (hoy cuenta si ya hay algo).
    function streak() {
      var cur = today(), n = 0;
      if (dayTotals(cur).done === 0) cur = shift(cur, -1);
      while (dayTotals(cur).done > 0) { n++; cur = shift(cur, -1); }
      return n;
    }

    return { log: log, dayTotals: dayTotals, dayStatus: dayStatus, streak: streak };
  }

  root.BdvRoutines = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
