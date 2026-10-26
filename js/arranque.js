/* ==========================================================================
   ARRANQUE — pone la app en marcha cuando todas las capas están cargadas:
   carga lo guardado y revisa la sesión (caso de uso de Cuentas), aplica el
   tema, decide la primera pantalla y la pinta.
   ========================================================================== */
(function () {
  'use strict';
  var ui = UIState;
  var render = UI.render, paintChrome = UI.paintChrome, meta = UI.meta;

  document.documentElement.lang = 'es';
  meta('description', 'Brújula de Vida: define quién quieres ser, mide si avanzas y ajusta cada semana. Úsala sin cuenta o crea una para sincronizar entre dispositivos.');
  meta('color-scheme', 'light dark');

  // Cuando llegan datos de la nube o cambia el estado de la sincronización,
  // se repinta. La pantalla no sabe quién lo provoca: solo escucha el aviso.
  Bus.on('remote:applied', render);
  Bus.on('sync:changed', render);

  var sesion = Cuentas.arrancar();
  Pantalla.applyTheme();
  paintChrome();
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', paintChrome);
  } catch (e) { }

  // Atajos del icono de la pantalla de inicio: /?ir=hoy|metas|vision|progreso
  try {
    var ir = new URLSearchParams(location.search).get('ir');
    if (ir && ['hoy', 'metas', 'vision', 'progreso'].indexOf(ir) !== -1) ui.tab = ir;
  } catch (e) { }

  ui.screen = sesion ? 'app' : 'splash';
  render();
})();
