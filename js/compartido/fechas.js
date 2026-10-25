/* ==========================================================================
   COMPARTIDO — fechas en formato 'AAAA-MM-DD', en la hora local del teléfono.
   Sin textos para la pantalla (eso es presentación) y sin leer el estado: el
   primer día de la semana se le inyecta con configure().
   ========================================================================== */
var Dates = (function () {
  'use strict';

  var firstDay = function () { return 1; };   // lunes, salvo que la app diga otra cosa

  function dkey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseK(k) { var p = String(k).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return dkey(new Date()); }
  function shift(k, n) { var d = parseK(k); d.setDate(d.getDate() + n); return dkey(d); }
  // días de a a b (b - a)
  function diff(a, b) { return Math.round((parseK(b) - parseK(a)) / 86400000); }
  function inDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return dkey(d); }

  // La semana empieza el día que se configure (0 = domingo, 1 = lunes).
  function weekStart(k) {
    var ws = firstDay() === 0 ? 0 : 1;
    var off = (parseK(k).getDay() - ws + 7) % 7;
    return shift(k, -off);
  }
  function weekDays(start) {
    var out = []; for (var i = 0; i < 7; i++) out.push(shift(start, i));
    return out;
  }
  function configure(opt) { if (opt && typeof opt.firstDay === 'function') firstDay = opt.firstDay; }

  return {
    dkey: dkey, parseK: parseK, today: today, shift: shift, diff: diff, inDays: inDays,
    weekStart: weekStart, weekDays: weekDays, configure: configure
  };
})();
