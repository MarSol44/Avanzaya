/* Brújula de Vida — dominio de las rutinas, sus frecuencias, los retos y la racha.

   Reglas: qué toca cada día, qué se marcó, si un día está completo, a medias o
   vacío, cuántos días seguidos llevas y cómo va la cuota de un hábito flexible.
   No pinta ni guarda; no conoce el estado de la app: trabaja contra un
   repositorio pequeño que le inyectan.

   Dependencias:
     repo      — log(d) → registro del día o null · ensureLog(d) → registro (lo crea)
                 routines() → { day: [...], night: [...] } · start() → primer día de uso
                 rest() → { week: [días 0-6], dates: { fecha: true } } (opcional)
     today     — fecha de hoy 'AAAA-MM-DD' (la del dispositivo: su zona horaria)
     shift     — sumar días a una fecha
     diff      — días entre dos fechas (a, b) → b - a
     weekStart — (opcional) primer día de la semana de una fecha; sin él, el lunes

   Un hábito puede llevar:
     days       días de la semana en que toca (sin él ni freq: todos los días)
     freq       { t: 'semana', n } · { t: 'mes', n } · { t: 'libre' }: frecuencia
                flexible; se cumple por cuota del periodo, nunca «falla» un día
     reglaDesde desde cuándo rige la frecuencia actual (antes de esa fecha, el
                hábito solo cuenta si se marcó: un cambio no crea fallos atrás)
     paused     desde qué fecha está en pausa (lo anterior no cambia)
     since      fecha en que se creó (antes no tocaba)
     reto       { dias, inicio, estado: 'activo' | 'continuar' | 'terminado' }:
                el hábito es un reto de `dias` días desde `inicio`

   Cómo cuenta un hábito un día (clase):
     'no'       no existía, estaba en pausa o era día de descanso
     'toca'     obligatorio: si no se marca, ese día queda a medias o sin hacer
     'opcional' flexible, o anterior a su regla actual: suma solo si se marca  */
(function (root) {
  'use strict';

  function create(deps) {
    var repo = deps.repo, today = deps.today, shift = deps.shift, diff = deps.diff;
    var weekStart = deps.weekStart || function (k) { var w = weekday(k); return shift(k, -((w + 6) % 7)); };

    // Registro del día, siempre con sus dos listas (lo crea si no existe).
    function log(k) {
      var l = repo.ensureLog(k);
      if (!l.day) l.day = [];
      if (!l.night) l.night = [];
      return l;
    }

    function weekday(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getDay(); }
    function diasDelMes(k) { var p = k.split('-'); return new Date(+p[0], +p[1], 0).getDate(); }
    function marcado(kind, it, k) { var l = repo.log(k); return !!l && (l[kind] || []).indexOf(it.id) >= 0; }

    // ¿Es un día de descanso? Entonces no toca ningún hábito.
    function isRest(k) {
      var r = (repo.rest && repo.rest()) || {};
      return !!((r.dates && r.dates[k]) || (r.week && r.week.indexOf(weekday(k)) >= 0));
    }
    function flexible(it) { return !!(it.freq && (it.freq.t === 'semana' || it.freq.t === 'mes' || it.freq.t === 'libre')); }
    function existe(it, k) {
      if (it.since && k < it.since) return false;
      if (it.paused && k >= it.paused) return false;
      if (it.reto && it.reto.inicio && k < it.reto.inicio) return false;   // un reto que aún no empieza
      return true;
    }

    function clase(it, k) {
      if (!existe(it, k) || isRest(k)) return 'no';
      // la regla actual no se aplica hacia atrás: antes de ella, suma lo marcado y nada falla
      if (it.reglaDesde && k < it.reglaDesde) return 'opcional';
      if (flexible(it)) return 'opcional';
      if (it.days && it.days.indexOf(weekday(k)) < 0) return 'no';
      return 'toca';
    }
    // Compatibilidad: «toca» en sentido estricto (lo que antes era isDue).
    function isDue(it, k) { return clase(it, k) === 'toca'; }
    function dueOn(kind, k) {
      return (repo.routines()[kind] || []).filter(function (it) { return clase(it, k) === 'toca'; });
    }

    /* ---- cuotas de los hábitos flexibles ---- */
    function periodo(it, k) {
      if (!it.freq || it.freq.t === 'libre') return null;
      if (it.freq.t === 'semana') { var a = weekStart(k); return { desde: a, hasta: shift(a, 6), largo: 7, t: 'semana' }; }
      var m = k.slice(0, 8) + '01', n = diasDelMes(k);
      return { desde: m, hasta: m.slice(0, 8) + String(n).padStart(2, '0'), largo: n, t: 'mes' };
    }
    // Cuántas veces se hizo en el periodo de `k` y cuántas tocaban. En un periodo
    // incompleto (se creó, se pausó o empezó la regla a mitad) la cuota se reparte:
    // n × días disponibles / días del periodo, redondeado hacia arriba (mínimo 1).
    function cuota(kind, it, k) {
      var p = periodo(it, k); if (!p) return null;
      var hechos = 0, disponibles = 0;
      for (var d = p.desde; d <= p.hasta; d = shift(d, 1)) {
        var ok = existe(it, d) && !isRest(d) && !(it.reglaDesde && d < it.reglaDesde);
        if (ok) disponibles++;
        if (marcado(kind, it, d) && existe(it, d)) hechos++;
      }
      var n = Math.max(1, +it.freq.n || 1);
      var meta = disponibles ? Math.min(n, Math.max(1, Math.ceil(n * disponibles / p.largo))) : 0;
      return { hechos: hechos, meta: meta, t: p.t, cumplida: meta > 0 && hechos >= meta };
    }

    /* ---- retos ---- */
    function retoFin(it) { return it.reto && it.reto.inicio ? shift(it.reto.inicio, (+it.reto.dias || 30) - 1) : ''; }
    // Cómo va un reto: día actual, días marcados dentro del reto y si ya terminó.
    function reto(kind, it, hoy) {
      if (!it.reto || !it.reto.inicio) return null;
      var dias = +it.reto.dias || 30, fin = retoFin(it), hechos = 0;
      for (var d = it.reto.inicio; d <= fin && d <= hoy; d = shift(d, 1)) if (marcado(kind, it, d)) hechos++;
      var n = diff(it.reto.inicio, hoy) + 1;
      return { dia: Math.max(0, Math.min(n, dias)), dias: dias, hechos: hechos, fin: fin, empezado: n >= 1,
        terminado: hoy > fin, estado: it.reto.estado || 'activo' };
    }

    // Los hábitos que se ven un día: los que tocan, los flexibles que aún no han
    // cumplido su cuota (o se marcaron ese día) y los de «sin frecuencia fija».
    function visibleOn(kind, k) {
      return (repo.routines()[kind] || []).filter(function (it) {
        var c = clase(it, k);
        if (c === 'toca') return true;
        if (c !== 'opcional' || !flexible(it)) return c === 'opcional' && marcado(kind, it, k);
        if (marcado(kind, it, k) || it.freq.t === 'libre') return true;
        var q = cuota(kind, it, k);
        return !q || !q.cumplida;
      });
    }

    // Hechos y totales de un día: lo que tocaba, y lo opcional solo si se marcó
    // (así lo flexible nunca deja un día a medias).
    function dayTotals(k) {
      var done = 0, total = 0;
      ['day', 'night'].forEach(function (kind) {
        (repo.routines()[kind] || []).forEach(function (it) {
          var c = clase(it, k), m = marcado(kind, it, k);
          if (c === 'toca') { total++; if (m) done++; }
          else if (c === 'opcional' && m) { total++; done++; }
        });
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
    // seguidos. Esos días no suman. Lo flexible nunca la corta (no «toca» un día).
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

    // La semana que empieza en `desde`, hasta hoy: lo obligatorio día a día, y lo
    // semanal por su cuota (hecho como mucho hasta la cuota). Lo mensual y lo libre
    // suman lo que se marcó, sin penalizar.
    function semana(desde) {
      var hoy = today(), hechos = 0, tocaban = 0;
      ['day', 'night'].forEach(function (kind) {
        (repo.routines()[kind] || []).forEach(function (it) {
          if (it.freq && it.freq.t === 'semana') {
            var q = cuota(kind, it, desde);
            if (q && q.meta) { tocaban += q.meta; hechos += Math.min(q.hechos, q.meta); }
            return;
          }
          for (var i = 0; i < 7; i++) {
            var d = shift(desde, i); if (d > hoy) break;
            var c = clase(it, d), m = marcado(kind, it, d);
            if (c === 'toca') { tocaban++; if (m) hechos++; }
            else if (c === 'opcional' && m) { tocaban++; hechos++; }
          }
        });
      });
      return { hechos: hechos, tocaban: tocaban };
    }

    return {
      log: log, dayTotals: dayTotals, dayStatus: dayStatus, streak: streak, isRest: isRest, isDue: isDue, dueOn: dueOn,
      clase: clase, visibleOn: visibleOn, cuota: cuota, reto: reto, retoFin: retoFin, semana: semana, flexible: flexible
    };
  }

  root.BdvRoutines = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
