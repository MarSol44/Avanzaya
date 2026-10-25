/* ==========================================================================
   APLICACIÓN — casos de uso de rutinas, nota del día y avisos de Hoy.
   ========================================================================== */
var Habitos = (function () {
  'use strict';
  var S = Store.S;

  function marcar(dia, kind, id) {
    var lg = Routines.log(dia), arr = lg[kind], p = arr.indexOf(id);
    if (p >= 0) arr.splice(p, 1); else arr.push(id);
    Store.save();
  }
  function nuevo(kind, nombre) {
    nombre = String(nombre || '').trim();
    if (!nombre) return { ok: false, reason: 'empty' };
    S.routines[kind].push({ id: Util.uid(), name: nombre });
    Store.save();
    return { ok: true };
  }
  // Al borrar un hábito se quita también de lo marcado en días anteriores.
  function borrar(kind, id) {
    S.routines[kind] = S.routines[kind].filter(function (x) { return x.id !== id; });
    Object.keys(S.rlog).forEach(function (d) {
      if (S.rlog[d] && S.rlog[d][kind]) S.rlog[d][kind] = S.rlog[d][kind].filter(function (x) { return x !== id; });
    });
    Store.save();
  }
  function nombre(kind, id, v) { var it = Util.byId(S.routines[kind], id); if (it) it.name = v; Store.save(); }

  // La nota de un día; vacía, desaparece.
  function nota(dia, texto) {
    if (String(texto || '').trim()) S.notes[dia] = texto; else delete S.notes[dia];
    Store.save();
  }
  // Un aviso que la persona quitó no vuelve ese día.
  function descartarAviso(id) { S.dismissed[id] = Dates.today(); Store.save(); }

  return { marcar: marcar, nuevo: nuevo, borrar: borrar, nombre: nombre, nota: nota, descartarAviso: descartarAviso };
})();
