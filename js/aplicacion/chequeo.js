/* ==========================================================================
   APLICACIÓN — casos de uso del chequeo de vida (Reality Check) y del final
   de la bienvenida (primer paso y visión inicial).
   ========================================================================== */
var Chequeo = (function () {
  'use strict';
  var S = Store.S;

  function empezar() { S.rcDraft = Revision.newDraft(); Store.save(); }
  function borrador() { if (!S.rcDraft) S.rcDraft = Revision.newDraft(); return S.rcDraft; }
  function puntuar(clave, valor) { borrador().scores[clave] = +valor; Store.save(); }
  function adjetivos(v) { borrador().adjectives = v; Store.save(); }
  function nota(clave, v) { borrador().notes[clave] = v; Store.save(); }
  function guardarAvance() { Store.save(); }
  // Seguir adelante da por bueno el valor que se ve, aunque no se haya movido.
  function aceptarPaso(claves, valor) {
    var d = borrador();
    claves.forEach(function (k) { if (d.scores[k] == null) d.scores[k] = valor; });
    Store.save();
  }

  // Pasa el borrador al historial si tiene al menos una puntuación.
  function confirmar() {
    var d = S.rcDraft;
    S.rcDraft = null;
    if (d && Object.keys(d.scores || {}).length) { S.rc.push(d); return true; }
    return false;
  }
  function terminar() { var ok = confirmar(); if (ok) Store.save(); return ok; }
  function salir() { var had = confirmar(); S.onboarded = true; Store.save(); return had; }
  function borrar(id) { S.rc = S.rc.filter(function (x) { return x.id !== id; }); Store.save(); }

  // Final de la bienvenida: guarda el chequeo, monta la visión con lo escrito
  // en «Mi Yo del Futuro» y convierte el primer paso en una meta corta.
  function terminarBienvenida(primerPaso) {
    S.firstStep = String(primerPaso || '').trim();
    confirmar();
    if (!S.visions.length) {
      var lines = [];
      S.cats.forEach(function (c) {
        var f = S.future[c.id];
        if (f && f.goal) lines.push(c.emoji + ' ' + f.goal);
      });
      if (lines.length) S.visions.push({ id: Util.uid(), text: 'En 5 años:\n\n' + lines.join('\n'), date: Dates.today() });
    }
    if (S.firstStep) {
      S.goalsS.unshift({
        id: Util.uid(), name: S.firstStep, done: false, cat: '',
        motivation: 'El primer paso que elegiste al empezar.', reward: '',
        priority: 'Alta', due: Dates.inDays(7), steps: []
      });
    }
    S.onboarded = true;
    Store.saveNow();
    return { primerPaso: !!S.firstStep };
  }

  return {
    empezar: empezar, puntuar: puntuar, adjetivos: adjetivos, nota: nota, guardarAvance: guardarAvance, aceptarPaso: aceptarPaso,
    terminar: terminar, salir: salir, borrar: borrar, terminarBienvenida: terminarBienvenida
  };
})();
