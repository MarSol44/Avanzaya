/* ==========================================================================
   INFRAESTRUCTURA — preferencias de pantalla de este dispositivo (qué está
   plegado, etc.). Un único sitio habla con localStorage para esto; si no está
   disponible, se usan los valores por defecto y la app sigue funcionando.
   ========================================================================== */
var Prefs = (function () {
  'use strict';
  return {
    get: function (key, fallback) {
      try { var v = localStorage.getItem('bdv.' + key); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem('bdv.' + key, JSON.stringify(value)); } catch (e) { }
    }
  };
})();
