/* ==========================================================================
   PRESENTACIÓN — servicios de pantalla: avisos (toast), tema claro/oscuro y
   el número de la racha sobre el icono de la app. Las capas de abajo no los
   llaman: emiten «aviso» o «saved» por el bus y aquí se escucha.
   ========================================================================== */
var Pantalla = (function () {
  'use strict';

  var toastT = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function applyTheme() {
    var p = Datos.estado().prefs, t = (p && p.theme) || 'auto';
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  // El icono de la app enseña la racha, a modo de «widget» mínimo.
  function updateBadge() {
    try {
      if (!navigator.setAppBadge) return;
      var n = Routines.streak();
      if (n > 0) navigator.setAppBadge(n).catch(function () { });
      else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(function () { });
    } catch (e) { }
  }

  Bus.on('aviso', toast);
  Bus.on('saved', updateBadge);
  Bus.on('remote:applied', function () { applyTheme(); updateBadge(); });
  setTimeout(updateBadge, 800);

  return { toast: toast, applyTheme: applyTheme, updateBadge: updateBadge };
})();
