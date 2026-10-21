/* Brújula de Vida — instalación, modo sin conexión y aviso de versión nueva.
   Va aparte de app.js a propósito: si algo de esto falla, la app sigue abriendo. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ─────────────────────────────────────────────── service worker */
  var esperando = null;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').then(function (reg) {

        if (reg.waiting) mostrarUpdate(reg.waiting);

        reg.addEventListener('updatefound', function () {
          var nuevo = reg.installing;
          if (!nuevo) return;
          nuevo.addEventListener('statechange', function () {
            /* hay controlador = no es la primera instalación = es una actualización */
            if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
              mostrarUpdate(nuevo);
            }
          });
        });
      }).catch(function () { /* sin service worker la app funciona igual, solo que necesita red */ });

      var recargando = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (recargando) return;
        recargando = true;
        location.reload();
      });
    });
  }

  function mostrarUpdate(sw) {
    esperando = sw;
    var bar = $('updatebar');
    if (!bar) return;
    bar.hidden = false;
    $('updatebar-ok').addEventListener('click', function () {
      bar.hidden = true;
      if (esperando) esperando.postMessage('ya');
    });
  }

  /* ──────────────────────────────────────────────── instalación */
  var prompt = null;
  var bar = $('installbar');
  if (!bar) return;

  var instalada = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;
  var rechazada = LS.get('bdv.instalar.no');
  /* si dijo «ahora no», no se le vuelve a preguntar en 30 días */
  var callar = rechazada && (Date.now() - Number(rechazada)) < 30 * 864e5;

  function esconder() { bar.hidden = true; }
  function enseñar() { if (!instalada && !callar) bar.hidden = false; }

  $('installbar-no').addEventListener('click', function () {
    LS.set('bdv.instalar.no', String(Date.now()));
    esconder();
  });

  /* Android y escritorio: el navegador nos avisa de que se puede instalar */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    prompt = e;
    enseñar();
  });

  $('installbar-ok').addEventListener('click', function () {
    if (prompt) {
      prompt.prompt();
      prompt.userChoice.then(function () { prompt = null; esconder(); });
    } else {
      esconder();
    }
  });

  window.addEventListener('appinstalled', function () {
    instalada = true;
    esconder();
  });

  /* iPhone y iPad: Safari no avisa de nada, hay que explicarlo con palabras */
  var ua = navigator.userAgent;
  var esIOS = /iPad|iPhone|iPod/.test(ua) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var esSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);

  if (esIOS && esSafari && !instalada && !callar) {
    $('installbar-title').textContent = 'Ténla a un toque';
    $('installbar-sub').textContent = 'Toca Compartir y luego «Añadir a pantalla de inicio».';
    $('installbar-ok').hidden = true;
    /* se espera un poco: que primero vea la app, después la sugerencia */
    setTimeout(enseñar, 25000);
  }
})();
