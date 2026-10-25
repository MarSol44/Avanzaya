/* ==========================================================================
   INFRAESTRUCTURA — puerto de la nube (sincronización, cuentas, recordatorio).

   El resto de la app solo habla con Nube.sync(). Por defecto responde un
   objeto nulo (la app funciona entera sin nube); el adaptador de Supabase
   (nube-supabase.js) aporta la implementación real con Nube.provide().

   Nube.state es lo único del estado que necesita el adaptador: una interfaz
   estrecha para que no entre en el almacén, la seguridad ni la pantalla.
   ========================================================================== */
var Nube = (function () {
  'use strict';

  function noop() { }
  var NULL_SYNC = {
    signIn: noop, signUp: noop, signOut: noop, updatePassword: noop, pullNow: noop,
    google: function () { Bus.emit('aviso', 'El acceso con Google no está disponible ahora mismo.'); },
    reminderState: function () { return { supported: false, active: false, hour: 20, checked: true }; },
    enableReminder: noop, disableReminder: noop
  };
  var impl = null;

  function sync() { return impl || NULL_SYNC; }
  function provide(real) {
    impl = {};
    Object.keys(NULL_SYNC).forEach(function (k) {
      impl[k] = real && typeof real[k] === 'function' ? real[k] : NULL_SYNC[k];
    });
  }

  var state = {
    snapshot: function () { return Store.S; },
    // Aplica lo que llega de la nube (validado) y avisa; la pantalla repinta al oírlo.
    apply: function (remote) { Sec.sanitizeState(remote, Store.S); Store.saveNow(); Bus.emit('remote:applied'); },
    accountEmail: function () { return Store.S.account && Store.S.account.email ? Store.S.account.email : ''; },
    storeId: function () { return Store.curKey() === Store.KEY ? '' : Store.curKey(); },
    rawLocal: function () { return Store.rawLocal(); }
  };

  return { sync: sync, provide: provide, state: state };
})();
