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
  meta('description', 'Brújula de Vida: define quién quieres ser, mide si avanzas y ajusta cada semana. Crea tu cuenta o entra con Google o Facebook, y tenlo en todos tus dispositivos.');
  meta('color-scheme', 'light dark');

  // Cuando llegan datos de la nube o cambia el estado de la sincronización,
  // se repinta. La pantalla no sabe quién lo provoca: solo escucha el aviso.
  // (lo que llega puede venir de una versión anterior: antes de pintar, se migra)
  Bus.on('remote:applied', function () { Habitos.migrar(); render(); });
  Bus.on('account:switched', function () { Habitos.migrar(); });
  Bus.on('sync:changed', render);

  var sesion = Cuentas.arrancar();
  Habitos.migrar();
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

  // Con sesión abierta y la bienvenida a medias, se sigue donde se dejó.
  ui.screen = !sesion ? 'splash' : Bienvenida.pendiente() ? 'bienvenida' : 'app';
  render();
  // con la tipografía ya cargada, los textos largos se miden otra vez (si no, se quedan cortos)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { UI.growAll(document); });
  if (Cuentas.veniaSinCuenta()) Pantalla.toast('Ahora la app se usa con cuenta. Regístrate y lo que tenías aquí pasará a ella.');

  // Si la app se queda abierta de un día para otro, al volver mira el día nuevo.
  var diaPintado = Dates.today();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || Dates.today() === diaPintado) return;
    diaPintado = Dates.today();
    ui.selDay = diaPintado; ui.planDay = diaPintado; ui.calMonth = diaPintado.slice(0, 7);
    render();
  });
})();
