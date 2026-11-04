/* ==========================================================================
   APLICACIÓN — casos de uso de Progreso: los logros y la revisión de la semana.
   (Los retos son hábitos desde Hábitos v2: viven en Habitos. El reto antiguo,
   state.challenge, ya no se escribe: se conserva tal cual tras migrarlo.)
   ========================================================================== */
var Progreso = (function () {
  'use strict';
  var S = Store.S;

  /* ------------------------------------------------------------- logros */
  function logro(texto, fecha) {
    texto = String(texto || '').trim();
    if (!texto) return { ok: false, reason: 'empty' };
    S.wins.push({ id: Util.uid(), text: texto, date: fecha || Dates.today() });
    Store.save();
    return { ok: true };
  }
  function logroBorrar(id) { S.wins = S.wins.filter(function (x) { return x.id !== id; }); Store.save(); }
  function logroTexto(id, v) { var w = Util.byId(S.wins, id); if (w) w.text = v; Store.save(); }

  /* ------------------------------------------------- revisión semanal */
  var CAMPOS = { won: 1, adjust: 1, focus: 1 };
  function revision(semana, campo, v) {
    if (!CAMPOS[campo]) return { ok: false };
    Revision.review(semana)[campo] = v;
    Store.save();
    return { ok: true };
  }

  return {
    logro: logro, logroBorrar: logroBorrar, logroTexto: logroTexto, revision: revision
  };
})();
