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
