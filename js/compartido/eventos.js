/* ==========================================================================
   COMPARTIDO — bus de eventos. Las capas de abajo avisan de lo que pasa
   («guardado», «cambio de cuenta», «aviso») y las de arriba escuchan. Así
   nada de abajo depende de la pantalla ni de la nube.

   Eventos de la app:
     saved            — se guardó el estado
     account:switched — se cambió de cuenta en este dispositivo
     remote:applied   — llegaron datos de la nube y ya están aplicados
     sync:changed     — cambió algo de la sincronización (repintar)
     auth:google      — Google confirmó a una persona (dato: el usuario)
     aviso            — un mensaje para enseñar a la persona (dato: el texto)
   ========================================================================== */
var Bus = (function () {
  'use strict';
  var subs = {};
  return {
    on: function (ev, fn) { (subs[ev] = subs[ev] || []).push(fn); },
    emit: function (ev, data) {
      (subs[ev] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) { } });
    }
  };
})();
