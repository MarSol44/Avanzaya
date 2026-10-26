/* Brújula de Vida — dominio de las metas.

   Reglas: cuánto avanza una meta, si va bien, atrasada o completada, cuántos
   días le quedan y cuáles vencen antes. Sin textos ni HTML: cómo se enseña
   («En 3 días», colores…) es cosa de la pantalla.

   Dependencias:
     repo  — goals(kind) → metas 'S' (corto plazo) o 'L' (largo plazo)
     today — fecha de hoy 'AAAA-MM-DD'
     diff  — días entre dos fechas (a, b) → b - a                              */
(function (root) {
  'use strict';

  var SOON_DAYS = 45;

  function create(deps) {
    var repo = deps.repo, today = deps.today, diff = deps.diff;

    function byId(list, id) {
      for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
      return null;
    }

    function all() { return repo.goals('S').concat(repo.goals('L')); }
    function find(kind, id) { return byId(repo.goals(kind), id); }

    // Porcentaje hecho: 100 si está completada; si no, la parte de pasos hechos.
    function pct(g) {
      if (!g) return 0;
      if (g.done) return 100;
      if (!g.steps || !g.steps.length) return 0;
      var d = 0; g.steps.forEach(function (s) { if (s.done) d++; });
      return Math.round(d / g.steps.length * 100);
    }

    // 'good' = completada · 'bad' = atrasada · 'warn' = en marcha
    function state(g) {
      if (g.done) return 'good';
      if (g.due && diff(today(), g.due) < 0) return 'bad';
      return 'warn';
    }

    // Días hasta la fecha límite (negativo si ya pasó; null si no tiene fecha).
    function daysLeft(k) { return k ? diff(today(), k) : null; }

    // Las metas sin terminar con fecha más cercana. Si ninguna vence pronto se
    // dan igualmente las más cercanas: Hoy tiene que estar conectado con las metas.
    function upcoming(n) {
      var out = [];
      ['S', 'L'].forEach(function (kind) {
        repo.goals(kind).forEach(function (g) { if (!g.done && g.due) out.push({ g: g, kind: kind }); });
      });
      out.sort(function (a, b) { return a.g.due < b.g.due ? -1 : 1; });
      var soon = out.filter(function (x) { return daysLeft(x.g.due) <= SOON_DAYS; });
      return (soon.length ? soon : out).slice(0, n || 3);
    }

    return { all: all, find: find, pct: pct, state: state, daysLeft: daysLeft, upcoming: upcoming };
  }

  root.BdvGoals = { create: create, SOON_DAYS: SOON_DAYS };
})(typeof window !== 'undefined' ? window : globalThis);
