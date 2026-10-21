/* Brújula de Vida — sincronización en la nube (Supabase) y recordatorio push.
   Todo esto es opcional y aditivo: si algo falla, o la persona usa la app
   sin cuenta, el resto sigue funcionando enteramente en local como siempre. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://fgpwhdfvqtlvfmmzhxsy.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHdoZGZ2cXRsdmZtbXpoeHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjI1MDgsImV4cCI6MjA4MjYzODUwOH0.KIIlA7_CC8i8OysF1zZGuH0xXFTVNyZDmpCBTt2ydcY';
  // Clave pública VAPID (la privada solo vive en los secretos de Supabase, nunca aquí).
  var VAPID_PUBLIC_KEY = 'BCJBsw2SkMr2W1hUKbdOpFyET_9trsBcPEIJpkKNBjvTqp-9tw47035GaPsmUv9Wz7r6HzxGq-I45ey4pB29KzE';

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

  function clock() { return +(localStorage.getItem(CLOCK_KEY) || 0); }
  function setClock(v) { try { localStorage.setItem(CLOCK_KEY, String(v)); } catch (e) { } }
  function repaint() { if (window.appRender) try { window.appRender(); } catch (e) { } }

  /* ------------------------------------------------------- alta y entrada */
  function signUp(email, password) {
    if (!sb || !email || !password) return;
    sb.auth.signUp({ email: email, password: password }).then(function (res) {
      if (!res.error && (!res.data || !res.data.session)) {
        App.toast('Cuenta creada. Confirma tu correo para sincronizar en otros dispositivos.');
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

  function updatePassword(newPassword) {
    if (!sb || !newPassword) return;
    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) sb.auth.updateUser({ password: newPassword });
    });
  }

  var currentUser = null;
  function onAuthChange(session) {
    currentUser = session ? session.user : null;
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
        try { sessionStorage.setItem('brujula.presync', localStorage.getItem(App.KEY) || ''); } catch (e) { }
        Sec.sanitizeState(row.state, App.S);
        setClock(remoteTime);
        App.saveNow(); App.applyTheme(); repaint();
        if (window.SyncBadge) window.SyncBadge();
        App.toast('Sincronizado con la nube.');
      } else {
        pushNow();
      }
    });
  }

  var pushTimer = null, pushBusy = false, pushAgain = false;
  function schedulePush() {
    if (!sb) return;
    var acc = App.S.account;
    if (!acc || !acc.email) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 1500);
  }
  function pushNow() {
    if (!sb || !currentUser) return;
    if (pushBusy) { pushAgain = true; return; }
    pushBusy = true;
    sb.from('states').upsert({ user_id: currentUser.id, state: App.S, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
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
    if (!sb || !currentUser) { App.toast('El recordatorio necesita cuenta y sincronización activas.'); return; }
    if (!pushSupported()) { App.toast('Este navegador no admite notificaciones.'); return; }
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { App.toast('No se activó: permiso denegado.'); return; }
      navigator.serviceWorker.ready.then(function (reg) {
        reg.pushManager.getSubscription().then(function (existing) {
          if (existing) return existing;
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }).then(function (sub) { saveSubscription(sub, hour); })
          .catch(function () { App.toast('No se pudo activar el recordatorio.'); });
      });
    });
  }
  function saveSubscription(sub, hour) {
    if (!sb || !sub || !currentUser) return;
    var j = sub.toJSON();
    sb.from('push_subscriptions').upsert({
      user_id: currentUser.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
      reminder_hour: hour, tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    }, { onConflict: 'endpoint' }).then(function (res) {
      if (res.error) { App.toast('No se pudo guardar el recordatorio.'); return; }
      try { localStorage.setItem(HOUR_KEY, String(hour)); } catch (e) { }
      reminderState.active = true; reminderState.hour = hour; repaint();
      App.toast('Recordatorio diario activado a las ' + String(hour).padStart(2, '0') + ':00.');
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
          App.toast('Recordatorio desactivado.');
        });
      });
    });
  }

  /* -------------------------------------------------------------- arranque */
  window.Sync = {
    signUp: signUp, signIn: signIn, updatePassword: updatePassword,
    markDirty: schedulePush, pullNow: pullThenMaybePush,
    reminderState: function () { return reminderState; },
    enableReminder: enableReminder, disableReminder: disableReminder
  };

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

  /* El icono de la app enseña la racha, a modo de "widget" mínimo. */
  function updateBadge() {
    try {
      if (!navigator.setAppBadge) return;
      var n = App.streak();
      if (n > 0) navigator.setAppBadge(n).catch(function () { });
      else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(function () { });
    } catch (e) { }
  }
  window.SyncBadge = updateBadge;
  setTimeout(updateBadge, 800);
})();
