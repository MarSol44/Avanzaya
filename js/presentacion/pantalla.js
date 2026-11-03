/* ==========================================================================
   PRESENTACIÓN — servicios de pantalla: avisos (toast), tema claro/oscuro y
   el número de la racha sobre el icono de la app. Las capas de abajo no los
   llaman: emiten «aviso» o «saved» por el bus y aquí se escucha.
   ========================================================================== */
var Pantalla = (function () {
  'use strict';

  var toastT = null;
  // deshacer (opcional): función que recupera lo que se acaba de hacer.
  // Los mensajes largos duran más: hay que poder leerlos.
  function toast(msg, deshacer) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('con-accion', !!deshacer);
    if (deshacer) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'toast-btn'; b.textContent = 'Deshacer';
      b.addEventListener('click', function () { quitarToast(); deshacer(); });
      el.appendChild(b);
    }
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(quitarToast, deshacer ? 6000 : Math.max(2600, String(msg).length * 60));
  }
  function quitarToast() {
    var el = document.getElementById('toast');
    clearTimeout(toastT);
    if (el) el.classList.remove('show', 'con-accion');
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

  return { toast: toast, quitarToast: quitarToast, applyTheme: applyTheme, updateBadge: updateBadge };
})();
