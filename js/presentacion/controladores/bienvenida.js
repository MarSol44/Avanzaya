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

  // hasta tres áreas: se repinta para ver el orden (la primera es el punto de partida)
  action('bvArea', function (c) {
    if (Bienvenida.elegirArea(c.v).lleno) { Pantalla.toast('Hasta tres. Quita una si quieres elegir otra.'); return; }
    render();
  });
  // «No lo tengo claro»: tras el chequeo se elige por qué área empezar y se sigue aquí
  action('bvDesdeChequeo', function (c) { Bienvenida.desdeChequeo(c.el.getAttribute('data-c')); abrir(); });
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
  /* --- el borrador del plan --- */
  function indice(c) { return +c.el.getAttribute('data-i'); }
  UI.onInput('bvPlanNombre', function (c) { Bienvenida.nombrePlan(c.el.value); });
  UI.onInput('bvPasoNombre', function (c) { Bienvenida.pasoNombre(indice(c), c.el.value); UI.grow(c.el); });
  UI.onChange('bvPasoFecha', function (c) {
    if (!Bienvenida.pasoFecha(indice(c), c.el.value)) Pantalla.toast('Elige hoy o un día que aún no haya pasado.');
    render();
  });
  action('bvPasoQuitar', function (c) { Bienvenida.quitarPaso(indice(c)); render(); });
  action('bvPasoNuevo', function () {
    if (!Bienvenida.anadirPaso()) return;
    render();
    var t = document.querySelectorAll('[data-f="bvPasoNombre"]');
    if (t.length) t[t.length - 1].focus();
  });
  action('bvRealista', function (c) { Bienvenida.realista(c.v); render(); });
  action('bvAligerar', function () { Bienvenida.aligerar(); render(); });

  action('bvAceptar', function () {
    Bienvenida.aceptar();
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
  // (también desde el resultado del chequeo: «Prefiero elegir otra área» vuelve a las áreas)
  action('bvSeguir', function () { Bienvenida.seguir(); if (ui.screen === 'rcsum') Bienvenida.irA(0); abrir(); });
  action('bvDescartar', function () { Bienvenida.descartar(); render(); Pantalla.toast('Hecho. Puedes crear metas cuando quieras desde Metas.'); });
})();
