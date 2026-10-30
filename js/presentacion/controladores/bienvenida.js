/* ==========================================================================
   PRESENTACIÓN — controlador de la bienvenida: responde a las preguntas,
   avanza (o salta), retrocede, deja para luego y acepta el primer plan.
   Llama a los casos de uso de Bienvenida; no toca el estado.
   ========================================================================== */
(function () {
  'use strict';
  var ui = UIState, action = UI.action, render = UI.render, goApp = UI.goApp;
  function top() { render(); window.scrollTo(0, 0); }
  function abrir() { ui.screen = 'bienvenida'; top(); }

  function marcar(sel, v) {
    var b = document.querySelectorAll(sel);
    for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-pressed', b[i].getAttribute('data-v') === v ? 'true' : 'false');
  }
  // El botón de abajo dice «Saltar esta pregunta» hasta que hay respuesta.
  // Se cambia sin repintar, para no perder lo que se está escribiendo.
  function boton() {
    var b = document.querySelector('[data-a="bvNext"]');
    if (!b) return;
    var ok = Bienvenida.respondida(), t = b.querySelector('span');
    b.classList.toggle('accent', ok); b.classList.toggle('soft', !ok);
    if (t) t.textContent = ok ? b.getAttribute('data-ok') : 'Saltar esta pregunta';
  }

  action('bvArea', function (c) { Bienvenida.elegirArea(c.v); marcar('[data-a="bvArea"]', Bienvenida.datos().area); boton(); });
  action('bvFreno', function (c) { Bienvenida.freno(c.v); marcar('[data-a="bvFreno"]', Bienvenida.datos().freno); boton(); });
  UI.onInput('bvCambio', function (c) { Bienvenida.cambio(c.el.value); UI.grow(c.el); boton(); });
  UI.onInput('bvMeta', function (c) { Bienvenida.meta(c.el.value); boton(); });
  UI.onInput('bvVision', function (c) { Bienvenida.vision(c.el.value); UI.grow(c.el); boton(); });

  action('bvNext', function () { Bienvenida.irA(Bienvenida.paso() + 1); top(); });
  action('bvBack', function () {
    Bienvenida.irA(Bienvenida.paso() === Bienvenida.PLAN ? 0 : Bienvenida.paso() - 1); top();
  });
  action('bvSkip', function () {
    Bienvenida.posponer(); goApp('hoy');
    Pantalla.toast('Guardado. Puedes seguir cuando quieras desde Hoy.');
  });
  action('bvAceptar', function () {
    var nombres = [].map.call(document.querySelectorAll('[data-bvpaso]'), function (el) { return el.value; });
    Bienvenida.aceptar((document.getElementById('bvNombre') || {}).value, nombres);
    top();   // pantalla final: qué se guardó y dónde
  });
  action('bvFin', function () { ui.planDay = Dates.today(); goApp('hoy'); });
  action('bvVer', function (c) {
    if (c.v === 'metas') ui.subMetas = 'goals';
    ui.planDay = Dates.today();
    goApp(c.v);
  });
  action('bvChequeo', function () {
    Chequeo.empezar(); ui.rcStep = 0; ui.rcOpen = false; ui.screen = 'rc'; top();
  });

  // Desde Hoy: seguir donde se dejó, o no volver a ofrecerla.
  action('bvSeguir', function () { Bienvenida.seguir(); abrir(); });
  action('bvDescartar', function () { Bienvenida.descartar(); render(); Pantalla.toast('Hecho. Puedes crear metas cuando quieras desde Metas.'); });
})();
