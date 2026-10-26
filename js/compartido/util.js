/* ==========================================================================
   COMPARTIDO — utilidades sin dependencias que puede usar cualquier capa.
   ========================================================================== */
var Util = (function () {
  'use strict';

  // Identificadores no adivinables y no correlativos (crypto, nunca Math.random).
  function uid() {
    var a = new Uint8Array(8), s = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
    else throw new Error('Este navegador no ofrece aleatoriedad segura.');
    for (var i = 0; i < a.length; i++) s += a[i].toString(16).padStart(2, '0');
    return s;
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function byId(list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  return { uid: uid, clamp: clamp, byId: byId };
})();
