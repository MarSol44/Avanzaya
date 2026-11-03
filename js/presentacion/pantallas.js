/* ==========================================================================
   Registro de pantallas (V). Cada vista se da de alta aquí; el controlador
   construye el enrutado y la barra de pestañas a partir de este registro.
   ========================================================================== */
var V = {};
// Registro de pantallas. Cada vista se da de alta ella misma con V.screen()
// (pantallas sueltas) o V.tab() (pestañas). El enrutado y la barra de abajo
// se construyen a partir de aquí: añadir una pantalla es registrarla, sin
// tocar el enrutado (abierto a extensión, cerrado a modificación).
V.screens = {};
V.tabs = [];
V.screen = function (name, view) { V.screens[name] = view; };
V.tab = function (def) {
  // def: { id, label, icon, order, view, badge?: () => número, inBar?: false, parent?: id }
  V.tabs.push(def);
  V.tabs.sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
};

// Cabecera de las pestañas: título, una línea de contexto y el acceso al perfil.
// Sin anillos ni insignias: cada cifra vive en un solo sitio.
//   o: { kicker?, titulo, sub?, cita?, extra?, perfil }  (extra y perfil ya son HTML)
//   kicker: rótulo pequeño encima (en Hoy, la fecha) · cita: el sub va en cursiva
V.cabecera = function (o) {
  var top = o.kicker
    ? '<div class="cab-top"><span class="cab-kick">' + Fmt.esc(o.kicker) + '</span>' + (o.perfil || '') + '</div><h1>' + Fmt.esc(o.titulo) + '</h1>'
    : '<div class="cab-top"><h1>' + Fmt.esc(o.titulo) + '</h1>' + (o.perfil || '') + '</div>';
  return '<div class="appbar cab">' + top +
    (o.sub ? '<p class="cab-sub' + (o.cita ? ' cita' : '') + '">' + Fmt.esc(o.sub) + '</p>' : '') + (o.extra || '') + '</div>';
};
// Los siete días como botones. `activo(d)` dice cuáles están marcados; `attrs`,
// lo que lleva cada botón además del día (data-a, data-id…).
V.diasSemana = function (etiqueta, attrs, activo) {
  return '<span class="dchips" role="group" aria-label="' + Fmt.esc(etiqueta) + '">' +
    [[1, 'L', 'lunes'], [2, 'M', 'martes'], [3, 'X', 'miércoles'], [4, 'J', 'jueves'], [5, 'V', 'viernes'], [6, 'S', 'sábado'], [0, 'D', 'domingo']].map(function (d) {
      return '<button type="button" class="dchip" ' + attrs + ' data-v="' + d[0] + '" aria-label="' + d[2] + '" aria-pressed="' + !!activo(d[0]) + '">' + d[1] + '</button>';
    }).join('') + '</span>';
};
