/* ==========================================================================
   APLICACIÓN — casos de uso de Progreso: el reto, los logros y la revisión
   de la semana.
   ========================================================================== */
var Progreso = (function () {
  'use strict';
  var S = Store.S;

  /* -------------------------------------------------------------- reto */
  function reto(nombre, dias) {
    S.challenge = { name: String(nombre || '').trim() || 'Reto de 30 días', days: Util.clamp(+dias || 30, 3, 365), start: Dates.today(), done: {} };
    Store.save();
  }
  function retoDia(dia) {
    if (!S.challenge) return;
    if (!S.challenge.done) S.challenge.done = {};
    if (S.challenge.done[dia]) delete S.challenge.done[dia]; else S.challenge.done[dia] = true;
    Store.save();
  }
  function retoReiniciar() { if (!S.challenge) return; S.challenge.start = Dates.today(); S.challenge.done = {}; Store.save(); }
  function retoBorrar() { S.challenge = null; Store.save(); }
  function retoNombre(v) { if (S.challenge) S.challenge.name = v; Store.save(); }

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
    reto: reto, retoDia: retoDia, retoReiniciar: retoReiniciar, retoBorrar: retoBorrar, retoNombre: retoNombre,
    logro: logro, logroBorrar: logroBorrar, logroTexto: logroTexto, revision: revision
  };
})();
