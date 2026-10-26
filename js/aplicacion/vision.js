/* ==========================================================================
   APLICACIÓN — casos de uso de Visión: visiones a 5 años, «Mi Yo del Futuro»
   por área y el tablero (frases e imágenes).
   ========================================================================== */
var Vision = (function () {
  'use strict';
  var S = Store.S;

  /* -------------------------------------------------- visión a 5 años */
  function nueva() { S.visions.push({ id: Util.uid(), text: '', date: Dates.today() }); Store.save(); }
  function borrar(id) { S.visions = S.visions.filter(function (x) { return x.id !== id; }); Store.save(); }
  function texto(id, v) { var x = Util.byId(S.visions, id); if (x) x.text = v; Store.save(); }

  /* -------------------------------------------------- Mi Yo del Futuro */
  var CAMPOS_FUTURO = { goal: 1, why: 1 };
  function futuro(area, campo, v) {
    if (!CAMPOS_FUTURO[campo]) return { ok: false };
    if (!S.future[area]) S.future[area] = { goal: '', why: '' };
    S.future[area][campo] = v;
    Store.save();
    return { ok: true };
  }
  function borrarFuturo(area) { delete S.future[area]; Store.save(); }
  function guardar() { Store.saveNow(); }

  /* ------------------------------------------------------------ tablero */
  function frase(textoInicial) { S.board.unshift({ id: Util.uid(), kind: 'quote', cap: textoInicial || '' }); Store.save(); }
  // Las imágenes pesan: si el navegador no tiene sitio, no se queda a medias.
  function imagen(src) {
    S.board.unshift({ id: Util.uid(), kind: 'img', src: src, cap: '' });
    if (Store.saveNow()) return { ok: true };
    S.board.shift();
    return { ok: false, reason: 'full' };
  }
  function textoTarjeta(i, v) { var t = S.board[i]; if (t) t.cap = v; Store.save(); }
  function borrarTarjeta(i) { S.board.splice(i, 1); Store.save(); }
  function moverTarjeta(i, d) {
    var j = i + d;
    if (j < 0 || j >= S.board.length) return { ok: false };
    var tmp = S.board[i]; S.board[i] = S.board[j]; S.board[j] = tmp;
    Store.save();
    return { ok: true };
  }

  return {
    nueva: nueva, borrar: borrar, texto: texto, futuro: futuro, borrarFuturo: borrarFuturo, guardar: guardar,
    frase: frase, imagen: imagen, textoTarjeta: textoTarjeta, borrarTarjeta: borrarTarjeta, moverTarjeta: moverTarjeta
  };
})();
