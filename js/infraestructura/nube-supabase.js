/* ==========================================================================
   INFRAESTRUCTURA — adaptador de Supabase para el puerto de la nube (nube.js):
   sincronización del estado, cuentas y recordatorio push.

   Todo es opcional y aditivo: si algo falla, o la persona usa la app sin
   cuenta, el resto sigue funcionando en local como siempre. No entra en el
   estado: usa Nube.state (interfaz estrecha), escucha el Bus («saved»,
   «account:switched») y se ofrece como implementación con Nube.provide().
   Los mensajes para la persona salen por el bus («aviso»): no pinta nada.
   ========================================================================== */
(function () {
  'use strict';

  var state = Nube.state, bus = Bus;

  var SUPABASE_URL = 'https://fgpwhdfvqtlvfmmzhxsy.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHdoZGZ2cXRsdmZtbXpoeHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjI1MDgsImV4cCI6MjA4MjYzODUwOH0.KIIlA7_CC8i8OysF1zZGuH0xXFTVNyZDmpCBTt2ydcY';
  // Clave pública VAPID (la privada solo vive en los secretos de Supabase, nunca aquí).
  var VAPID_PUBLIC_KEY = 'BG73dIlubuUs02IG16JYuMSNmmeLUXmzdYnymoB8c6oPJtsngZJalWDCq8mL2MoMI7L8osz-qNjIVsMomwestds';

  var CLOCK_KEY = 'brujula.sync.clock';
  var HOUR_KEY = 'bdv.push.hour';
  var $ = function (id) { return document.getElementById(id); };

  var sb = null;
  try {
    if (window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'brujula.sb.auth' }
      });
    }
  } catch (e) { sb = null; }

  // Cada cuenta del dispositivo lleva su propio reloj; la primera conserva el nombre de siempre.
  function clockKey() { var id = state.storeId(); return id ? CLOCK_KEY + '.' + id : CLOCK_KEY; }
  function clock() { return +(localStorage.getItem(clockKey()) || 0); }
  function setClock(v) { try { localStorage.setItem(clockKey(), String(v)); } catch (e) { } }
  function repaint() { bus.emit('sync:changed'); }

  /* ------------------------------------------------------- alta y entrada */
  function signUp(email, password) {
    if (!sb || !email || !password) return;
    sb.auth.signUp({ email: email, password: password }).then(function (res) {
      // las cuentas de usuario o teléfono usan un correo interno que nadie recibe:
      // a ellas no se les pide confirmar nada (en Supabase, «Confirm email» va apagado)
      if (!res.error && (!res.data || !res.data.session) && !BdvIdentidad.esInterno(email)) {
        bus.emit('aviso', 'Cuenta creada. Confirma tu correo para sincronizar en otros dispositivos.');
      }
    });
  }

  function signIn(email, password) {
    if (!sb || !email || !password) return;
    sb.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      // Cuentas creadas antes de que existiera la sincronización: se dan de
      // alta en Supabase de forma transparente, con la misma contraseña.
      if (res.error && /invalid login credentials/i.test(res.error.message || '')) {
        sb.auth.signUp({ email: email, password: password });
      }
    });
  }

  // Entrar con una red social (Google o Facebook) a través de Supabase.
  var NOMBRES = { google: 'Google', facebook: 'Facebook' };
  function red(proveedor) {
    var nombre = NOMBRES[proveedor];
    if (!sb) { bus.emit('aviso', 'El acceso con ' + nombre + ' no está disponible ahora mismo.'); return; }
    sb.auth.signInWithOAuth({
      provider: proveedor,
      options: { redirectTo: location.origin + location.pathname }
    }).then(function (res) {
      if (res.error) bus.emit('aviso', 'No se pudo abrir ' + nombre + '. Revisa que esté activado en Supabase.');
    });
  }
  function google() { red('google'); }
  function facebook() { red('facebook'); }

  function signOut() {
    clearTimeout(pushTimer); pushAgain = false;
    if (sb) sb.auth.signOut();
  }

  function updatePassword(newPassword) {
    if (!sb || !newPassword) return;
    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) sb.auth.updateUser({ password: newPassword });
    });
  }

  var currentUser = null;
  function onAuthChange(session) {
    currentUser = session ? session.user : null;
    // Entrada con Google: primero se abre la cuenta local de ese correo y
    // solo después se sincroniza, para no mezclar datos de dos cuentas.
    var prov = currentUser && currentUser.app_metadata && currentUser.app_metadata.provider;
    if (NOMBRES[prov]) {
      bus.emit('auth:red', { user: currentUser, proveedor: prov });
    }
    refreshReminderState();
    if (currentUser) { pullThenMaybePush(); maybeOfferReminder(); }
    repaint();
  }

  /* --------------------------------------------------------------- estado */
  function pullThenMaybePush() {
    if (!sb || !currentUser) return;
    sb.from('states').select('state, updated_at').eq('user_id', currentUser.id).maybeSingle().then(function (res) {
      if (res.error || !res.data) { pushNow(); return; }
      var row = res.data, remoteTime = new Date(row.updated_at).getTime();
      if (remoteTime > clock()) {
        // Por si el dispositivo tenía datos locales propios sin sincronizar,
        // se guarda una copia aparte antes de sustituirlos por los de la nube.
        try { sessionStorage.setItem('brujula.presync', state.rawLocal()); } catch (e) { }
        setClock(remoteTime);
        state.apply(row.state);
        bus.emit('aviso', 'Sincronizado con la nube.');
      } else {
        pushNow();
      }
    });
  }

  var pushTimer = null, pushBusy = false, pushAgain = false;
  function schedulePush() {
    if (!sb) return;
    if (!state.accountEmail()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 1500);
  }
  function pushNow() {
    if (!sb || !currentUser) return;
    if (pushBusy) { pushAgain = true; return; }
    pushBusy = true;
    sb.from('states').upsert({ user_id: currentUser.id, state: state.snapshot(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('updated_at').single().then(function (res) {
        pushBusy = false;
        if (!res.error && res.data) setClock(new Date(res.data.updated_at).getTime());
        if (pushAgain) { pushAgain = false; pushNow(); }
      });
  }

  /* ----------------------------------------------------------- recordatorio */
  var reminderState = { supported: pushSupported(), active: false, hour: +(localStorage.getItem(HOUR_KEY) || 20), checked: false };

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function refreshReminderState() {
    reminderState.supported = pushSupported();
    if (!reminderState.supported) { reminderState.checked = true; repaint(); return; }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) { reminderState.checked = true; reminderState.active = false; repaint(); return; }
      reg.pushManager.getSubscription().then(function (sub) {
        reminderState.checked = true;
        reminderState.active = !!sub;
        repaint();
        // Si se rotaron las claves VAPID, la suscripción vieja ya no recibe
        // nada: se renueva sola con la clave nueva y la misma hora.
        if (sub && !sameKey(sub) && currentUser && sb && Notification.permission === 'granted') {
          renewSub(reg, sub).then(function (fresh) { saveSubscription(fresh, reminderState.hour, true); })
            .catch(function () { reminderState.active = false; repaint(); });
        }
      });
    });
  }

  // ¿La suscripción se hizo con la clave pública VAPID actual?
  function sameKey(sub) {
    try {
      var k = sub.options && sub.options.applicationServerKey;
      if (!k) return true;   // el navegador no lo dice: no se toca
      var a = new Uint8Array(k), b = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    } catch (e) { return true; }
  }
  // Da de baja la suscripción vieja (también su fila) y crea otra con la clave actual.
  function renewSub(reg, old) {
    var endpoint = old.endpoint;
    return old.unsubscribe().then(function () {
      if (sb) sb.from('push_subscriptions').delete().eq('endpoint', endpoint).then(function () { });
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    });
  }

  function urlBase64ToUint8Array(base64) {
    var padding = '='.repeat((4 - base64.length % 4) % 4);
    var safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(safe), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function maybeOfferReminder() {
    if (!reminderState.supported || !sb) return;
    if (Notification.permission !== 'default') return;
    var bar = $('remindbar');
    if (!bar) return;
    var dismissed = localStorage.getItem('bdv.recordar.no');
    if (dismissed && (Date.now() - Number(dismissed)) < 30 * 864e5) return;
    setTimeout(function () { bar.hidden = false; }, 1500);
  }
  function enableReminder(hour) {
    if (!sb || !currentUser) { bus.emit('aviso', 'El recordatorio necesita cuenta y sincronización activas.'); return; }
    if (!pushSupported()) { bus.emit('aviso', 'Este navegador no admite notificaciones.'); return; }
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { bus.emit('aviso', 'No se activó: permiso denegado.'); return; }
      navigator.serviceWorker.ready.then(function (reg) {
        reg.pushManager.getSubscription().then(function (existing) {
          if (existing) return sameKey(existing) ? existing : renewSub(reg, existing);
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }).then(function (sub) { saveSubscription(sub, hour); })
          .catch(function () { bus.emit('aviso', 'No se pudo activar el recordatorio.'); });
      });
    });
  }
  function saveSubscription(sub, hour, silent) {
    if (!sb || !sub || !currentUser) return;
    var j = sub.toJSON();
    sb.from('push_subscriptions').upsert({
      user_id: currentUser.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
      reminder_hour: hour, tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    }, { onConflict: 'endpoint' }).then(function (res) {
      if (res.error) { if (!silent) bus.emit('aviso', 'No se pudo guardar el recordatorio.'); return; }
      try { localStorage.setItem(HOUR_KEY, String(hour)); } catch (e) { }
      reminderState.active = true; reminderState.hour = hour; repaint();
      if (!silent) bus.emit('aviso', 'Recordatorio diario activado a las ' + String(hour).padStart(2, '0') + ':00.');
    });
  }
  function disableReminder() {
    if (!pushSupported()) return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      reg.pushManager.getSubscription().then(function (sub) {
        if (!sub) { reminderState.active = false; repaint(); return; }
        var endpoint = sub.endpoint;
        sub.unsubscribe().then(function () {
          reminderState.active = false; repaint();
          if (sb) sb.from('push_subscriptions').delete().eq('endpoint', endpoint).then(function () { });
          bus.emit('aviso', 'Recordatorio desactivado.');
        });
      });
    });
  }

  /* -------------------------------------------------------------- arranque */
  Nube.provide({
    signUp: signUp, signIn: signIn, signOut: signOut, google: google, facebook: facebook, updatePassword: updatePassword,
    pullNow: pullThenMaybePush,
    reminderState: function () { return reminderState; },
    enableReminder: enableReminder, disableReminder: disableReminder
  });
  // Lo que pasa en la app y le interesa a la sincronización.
  bus.on('saved', schedulePush);
  bus.on('account:switched', signOut);

  document.addEventListener('DOMContentLoaded', function () {
    var bar = $('remindbar');
    if (!bar) return;
    var okBtn = $('remindbar-ok'), noBtn = $('remindbar-no'), timeInput = $('remindbar-time');
    if (okBtn) okBtn.addEventListener('click', function () {
      var h = 20;
      if (timeInput && timeInput.value) h = +timeInput.value.split(':')[0];
      bar.hidden = true;
      enableReminder(h);
    });
    if (noBtn) noBtn.addEventListener('click', function () {
      try { localStorage.setItem('bdv.recordar.no', String(Date.now())); } catch (e) { }
      bar.hidden = true;
    });
  });

  refreshReminderState();

  if (sb) {
    sb.auth.onAuthStateChange(function (_event, session) { onAuthChange(session); });
    sb.auth.getSession().then(function (r) { onAuthChange(r.data && r.data.session); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') pullThenMaybePush();
    });
    setInterval(function () {
      if (document.visibilityState === 'visible') pullThenMaybePush();
    }, 120000);
  }

})();
