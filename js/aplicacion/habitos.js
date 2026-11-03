/* ==========================================================================
   APLICACIÓN — casos de uso de rutinas, nota del día y avisos de Hoy.
   ========================================================================== */
var Habitos = (function () {
  'use strict';
  var S = Store.S;

  // Los días que aún no han llegado no se pueden marcar.
  function marcar(dia, kind, id) {
    if (dia > Dates.today()) return;
    var lg = Routines.log(dia), arr = lg[kind], p = arr.indexOf(id);
    if (p >= 0) arr.splice(p, 1); else arr.push(id);
    Store.save();
  }
  // `dias` (opcional): en qué días de la semana toca; sin él o con los siete, todos.
  function nuevo(kind, nombre, dias) {
    nombre = String(nombre || '').trim();
    if (!nombre) return { ok: false, reason: 'empty' };
    // since: desde cuándo existe. Los días de antes no le tocaban y no cuentan como fallo.
    var it = { id: Util.uid(), name: nombre, since: Dates.today() };
    if (dias && dias.length && dias.length < 7) it.days = dias.slice();
    S.routines[kind].push(it);
    Store.save();
    return { ok: true };
  }
  // Al borrar un hábito se quita también de lo marcado en días anteriores.
  // Devuelve lo necesario para deshacerlo: el hábito, su sitio y sus días marcados.
  function borrar(kind, id) {
    var lista = S.routines[kind], pos = -1, dias = [];
    lista.forEach(function (x, i) { if (x.id === id) pos = i; });
    var item = pos >= 0 ? lista[pos] : null;
    S.routines[kind] = lista.filter(function (x) { return x.id !== id; });
    Object.keys(S.rlog).forEach(function (d) {
      var l = S.rlog[d] && S.rlog[d][kind];
      if (l && l.indexOf(id) >= 0) { dias.push(d); S.rlog[d][kind] = l.filter(function (x) { return x !== id; }); }
    });
    Store.save();
    return { kind: kind, item: item, pos: pos, dias: dias };
  }
  function restaurar(copia) {
    if (!copia || !copia.item || Util.byId(S.routines[copia.kind], copia.item.id)) return;
    S.routines[copia.kind].splice(Math.max(0, copia.pos), 0, copia.item);
    copia.dias.forEach(function (d) { Routines.log(d)[copia.kind].push(copia.item.id); });
    Store.save();
  }
  function nombre(kind, id, v) { var it = Util.byId(S.routines[kind], id); if (it) it.name = v; Store.save(); }

  // Días de la semana en que toca. Siempre queda al menos uno; con los siete, se quita la regla.
  function dia(kind, id, d) {
    var it = Util.byId(S.routines[kind], id); if (!it) return { ok: false };
    var dias = it.days ? it.days.slice() : [0, 1, 2, 3, 4, 5, 6], p = dias.indexOf(d);
    if (p >= 0) dias.splice(p, 1); else dias.push(d);
    if (!dias.length) return { ok: false, reason: 'ninguno' };
    if (dias.length === 7) delete it.days; else it.days = dias;
    Store.save();
    return { ok: true };
  }
  // La pausa empieza hoy: lo ya hecho en días anteriores no cambia.
  function pausar(kind, id) {
    var it = Util.byId(S.routines[kind], id); if (!it) return;
    if (it.paused) delete it.paused; else it.paused = Dates.today();
    Store.save();
  }
  function descansoSemanal(d) {
    var w = S.rest.week, p = w.indexOf(d);
    if (p >= 0) w.splice(p, 1); else w.push(d);
    Store.save();
  }
  function descansarHoy() {
    var t = Dates.today();
    if (S.rest.dates[t]) delete S.rest.dates[t]; else S.rest.dates[t] = true;
    Store.save();
  }

  // La nota de un día; vacía, desaparece.
  function nota(dia, texto) {
    if (String(texto || '').trim()) S.notes[dia] = texto; else delete S.notes[dia];
    Store.save();
  }
  // Un aviso que la persona quitó no vuelve ese día.
  function descartarAviso(id) { S.dismissed[id] = Dates.today(); Store.save(); }

  return { marcar: marcar, nuevo: nuevo, borrar: borrar, restaurar: restaurar, nombre: nombre, dia: dia, pausar: pausar, descansoSemanal: descansoSemanal, descansarHoy: descansarHoy, nota: nota, descartarAviso: descartarAviso };
})();
