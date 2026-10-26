/* ==========================================================================
   APLICACIÓN — lectura del estado y servicios pequeños que necesita la
   presentación. La presentación no habla con la infraestructura: pasa por aquí.

     Datos.estado()        — el estado, SOLO PARA LEER (las vistas pintan con él).
                             Para cambiar algo se usa el caso de uso que toque.
     Preferencias          — qué está plegado, etc. (de este dispositivo)
     Archivos              — comprobaciones de las imágenes que se suben
   ========================================================================== */
var Datos = {
  estado: function () { return Store.S; }
};

var Preferencias = {
  get: function (clave, porDefecto) { return Prefs.get(clave, porDefecto); },
  set: function (clave, valor) { Prefs.set(clave, valor); }
};

var Archivos = {
  // Devuelven el motivo del problema (texto) o '' si la imagen vale.
  problemaImagen: function (file) { return Sec.imageProblem(file); },
  problemaPixeles: function (ancho, alto) { return Sec.pixelProblem(ancho, alto); }
};
