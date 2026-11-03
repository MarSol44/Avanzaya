/* ==========================================================================
   PRESENTACIÓN — instalación, modo sin conexión y aviso de versión nueva.
   Va aparte a propósito: si algo de esto falla, la app sigue abriendo.
   Lo que recuerda (cuándo se rechazó instalar) pasa por Preferencias.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

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
  var rechazada = Preferencias.get('instalar.no', null);
  /* si dijo «ahora no», no se le vuelve a preguntar en 30 días */
  var callar = rechazada && (Date.now() - Number(rechazada)) < 30 * 864e5;

  var sePuede = false;   // el navegador ya dejó claro que se puede instalar

  function esconder() { bar.hidden = true; }
  // Se sugiere en la app, a quien ya la ha probado: otro día, o tras marcar su primer hábito.
  function buenMomento() {
    var S = Datos.estado(), t = Dates.today();
    var recordar = $('remindbar');
    return UIState.screen === 'app' && !UIState.sheet && (!recordar || recordar.hidden) &&
      (S.start !== t || Routines.dayTotals(t).done > 0);
  }
  function enseñar() { if (sePuede && !instalada && !callar && buenMomento()) bar.hidden = false; }

  Bus.on('pintado', function (pantalla) {
    if (pantalla !== 'app') esconder(); else enseñar();
  });

  $('installbar-no').addEventListener('click', function () {
    Preferencias.set('instalar.no', Date.now());
    callar = true;
    esconder();
  });

  /* Android y escritorio: el navegador nos avisa de que se puede instalar */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    prompt = e;
    sePuede = true;
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
    $('installbar-title').textContent = 'Tenla a un toque';
    $('installbar-sub').textContent = 'Toca Compartir y luego «Añadir a pantalla de inicio».';
    $('installbar-ok').hidden = true;
    /* se espera un poco: que primero vea la app, después la sugerencia */
    setTimeout(function () { sePuede = true; enseñar(); }, 25000);
  }
})();
