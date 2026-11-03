/* ==========================================================================
   APLICACIÓN — casos de uso de Perfil: preferencias de la cuenta, áreas de
   vida, respaldo y borrado; y el recordatorio diario (por el puerto Nube).
   ========================================================================== */
var Ajustes = (function () {
  'use strict';
  var S = Store.S;
  var CAMPOS_PERFIL = { tz: 1, lang: 1 };

  function semana(n) { S.profile.weekStart = +n === 0 ? 0 : 1; Store.save(); }
  function foto(data) { S.profile.photo = data; Store.save(); }
  function quitarFoto() { S.profile.photo = ''; Store.save(); }
  function tema(t) { S.prefs.theme = t; Store.save(); }
  function alternarAvisos() { S.prefs.notifs = !S.prefs.notifs; Store.save(); }
  function campoPerfil(campo, valor) {
    if (!CAMPOS_PERFIL[campo]) return { ok: false, reason: 'campo' };
    S.profile[campo] = valor; Store.save();
    return { ok: true };
  }
  function comentario(texto) { S.feedback = texto; Store.save(); }

  /* ------------------------------------------------------- áreas de vida */
  function areaNueva(emoji, nombre, color) {
    nombre = String(nombre || '').trim();
    if (!nombre) return { ok: false, reason: 'empty' };
    S.cats.push({ id: Util.uid(), emoji: String(emoji || '').trim().slice(0, 8) || '⭐', name: nombre.slice(0, 120), color: Sec.colorOf(color) });
    Store.save();
    return { ok: true };
  }
  // Al borrar un área, sus metas se quedan sin área y su «yo del futuro» se va.
  function areaBorrar(id) {
    S.cats = S.cats.filter(function (c) { return c.id !== id; });
    Goals.all().forEach(function (g) { if (g.cat === id) g.cat = ''; });
    delete S.future[id];
    Store.save();
  }
  function areaNombre(id, v) { var c = Areas.get(id); if (c) c.name = String(v || '').slice(0, 120); Store.save(); }
  function areaEmoji(id, v) { var c = Areas.get(id); if (c) c.emoji = String(v || '').slice(0, 8); Store.save(); }

  /* ------------------------------------------------------------ respaldo */
  function respaldoTexto() { return JSON.stringify(S); }
  function respaldoCopiado() { S.lastBackup = Dates.today(); Store.saveNow(); }
  // El texto pegado es la única entrada externa de la app. No se mezcla con el
  // estado: se reconstruye campo a campo contra el esquema.
  function restaurar(texto) {
    var d;
    try { d = JSON.parse(texto); } catch (e) { return { ok: false }; }
    try {
      var clean = Sec.sanitizeState(d, Store.defaults()), k;
      for (k in clean) if (Object.prototype.hasOwnProperty.call(clean, k)) S[k] = clean[k];
    } catch (e) { return { ok: false }; }
    if (!S.start) S.start = Dates.today();
    Store.saveNow();
    return { ok: true, sinContrasena: !!(S.account && !S.account.pass) };
  }
  function borrarTodo() { Store.wipe(); Store.live.clear(); }

  return {
    semana: semana, foto: foto, quitarFoto: quitarFoto, tema: tema, alternarAvisos: alternarAvisos,
    campoPerfil: campoPerfil, comentario: comentario,
    areaNueva: areaNueva, areaBorrar: areaBorrar, areaNombre: areaNombre, areaEmoji: areaEmoji,
    respaldoTexto: respaldoTexto, respaldoCopiado: respaldoCopiado, restaurar: restaurar, borrarTodo: borrarTodo
  };
})();

var Recordatorio = {
  estado: function () { return Nube.sync().reminderState(); },
  alternar: function () {
    var rs = Nube.sync().reminderState();
    if (rs.active) Nube.sync().disableReminder();
    else Nube.sync().enableReminder(rs.hour || 20);
  },
  hora: function (h) { Nube.sync().enableReminder(+h || 20); }
};
