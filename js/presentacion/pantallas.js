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

// Cabecera de las pestañas: rótulo pequeño, título grande, una frase corta y,
// a la derecha, un detalle (anillo, racha…). La de Hoy sigue el mismo molde.
//   o: { kicker, titulo, sub, lado, perfil }  (lado y perfil ya son HTML)
V.cabecera = function (o) {
  return '<div class="appbar hoy-head">' +
    '<div class="hoy-top"><span class="hoy-date">' + Fmt.esc(o.kicker) + '</span>' + (o.perfil || '') + '</div>' +
    '<div class="hoy-hero"><div class="grow"><h1>' + Fmt.esc(o.titulo) + '</h1>' +
    (o.sub ? '<p class="hoy-frase">' + Fmt.esc(o.sub) + '</p>' : '') + '</div>' + (o.lado || '') + '</div></div>';
};
// Anillo pequeño para esas cabeceras: «17 %» y «1/6» debajo.
V.anilloCab = function (hecho, total, etiqueta) {
  if (!total) return '';
  var pct = Math.round(hecho / total * 100);
  return '<div class="hoy-ring" role="img" aria-label="' + Fmt.esc(etiqueta) + ': ' + hecho + ' de ' + total + '">' +
    Fmt.ring(pct, 98, 'var(--accent)', '<b>' + pct + '<small>%</small></b><small>' + hecho + '/' + total + '</small>') + '</div>';
};
