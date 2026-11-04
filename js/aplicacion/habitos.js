/* ==========================================================================
   APLICACIÓN — casos de uso de rutinas, nota del día y avisos de Hoy.
   ========================================================================== */
var Habitos = (function () {
  'use strict';
  var S = Store.S;

  // Los días que aún no han llegado no se pueden marcar.
  function marcar(dia, kind, id) {
    if (dia > Dates.today()) return;
    var lg = Routines.log(dia), arr = lg[kind], p = arr.indexOf(id);
    if (p >= 0) arr.splice(p, 1); else arr.push(id);
    Store.save();
  }
  // `dias` (opcional): en qué días de la semana toca; sin él o con los siete, todos.
  function nuevo(kind, nombre, dias) {
    nombre = String(nombre || '').trim();
    if (!nombre) return { ok: false, reason: 'empty' };
    // since: desde cuándo existe. Los días de antes no le tocaban y no cuentan como fallo.
    var it = { id: Util.uid(), name: nombre, since: Dates.today() };
    if (dias && dias.length && dias.length < 7) it.days = dias.slice();
    S.routines[kind].push(it);
    Store.save();
    return { ok: true };
  }
  // Al borrar un hábito se quita también de lo marcado en días anteriores.
  // Devuelve lo necesario para deshacerlo: el hábito, su sitio y sus días marcados.
  function borrar(kind, id) {
    var lista = S.routines[kind], pos = -1, dias = [];
    lista.forEach(function (x, i) { if (x.id === id) pos = i; });
    var item = pos >= 0 ? lista[pos] : null;
    S.routines[kind] = lista.filter(function (x) { return x.id !== id; });
    Object.keys(S.rlog).forEach(function (d) {
      var l = S.rlog[d] && S.rlog[d][kind];
      if (l && l.indexOf(id) >= 0) { dias.push(d); S.rlog[d][kind] = l.filter(function (x) { return x !== id; }); }
    });
    Store.save();
    return { kind: kind, item: item, pos: pos, dias: dias };
  }
  function restaurar(copia) {
    if (!copia || !copia.item || Util.byId(S.routines[copia.kind], copia.item.id)) return;
    S.routines[copia.kind].splice(Math.max(0, copia.pos), 0, copia.item);
    copia.dias.forEach(function (d) { Routines.log(d)[copia.kind].push(copia.item.id); });
    Store.save();
  }
  function nombre(kind, id, v) { var it = Util.byId(S.routines[kind], id); if (it) it.name = v; Store.save(); }

  // Una regla nueva rige desde hoy: los días de antes no se recalculan como fallos.
  // (Si el hábito se creó hoy, no hace falta: no tiene días anteriores.)
  function reglaNueva(it) { var t = Dates.today(); if (it.since && it.since >= t) delete it.reglaDesde; else it.reglaDesde = t; }

  // Días de la semana en que toca. Siempre queda al menos uno; con los siete, se quita la regla.
  function dia(kind, id, d) {
    var it = Util.byId(S.routines[kind], id); if (!it) return { ok: false };
    var dias = it.days ? it.days.slice() : [0, 1, 2, 3, 4, 5, 6], p = dias.indexOf(d);
    if (p >= 0) dias.splice(p, 1); else dias.push(d);
    if (!dias.length) return { ok: false, reason: 'ninguno' };
    if (dias.length === 7) delete it.days; else it.days = dias;
    reglaNueva(it);
    Store.save();
    return { ok: true };
  }

  // Frecuencia: 'diaria', 'dias' (días concretos), 'semana' (n veces), 'mes' (n
  // veces) o 'libre' (sin frecuencia fija). Rige desde hoy (reglaDesde).
  var MAX = { semana: 7, mes: 31 };
  function frecuencia(kind, id, tipo, n) {
    var it = Util.byId(S.routines[kind], id); if (!it) return { ok: false };
    if (tipo === 'diaria') { delete it.days; delete it.freq; }
    else if (tipo === 'dias') { delete it.freq; if (!it.days) it.days = [1, 2, 3, 4, 5]; }
    else if (tipo === 'semana' || tipo === 'mes') {
      delete it.days;
      var previa = it.freq && it.freq.t === tipo ? it.freq.n : (tipo === 'semana' ? 3 : 8);
      it.freq = { t: tipo, n: Util.clamp(Math.round(+n || previa), 1, MAX[tipo]) };
    } else if (tipo === 'libre') { delete it.days; it.freq = { t: 'libre' }; }
    else return { ok: false };
    reglaNueva(it);
    Store.save();
    return { ok: true };
  }

  /* ---- retos: un hábito con fecha de inicio y duración ---- */
  function nuevoReto(nombre, dias, inicio, kind) {
    nombre = String(nombre || '').trim();
    if (!nombre) return { ok: false, reason: 'empty' };
    var t = Dates.today();
    inicio = /^\d{4}-\d\d-\d\d$/.test(inicio || '') ? inicio : t;
    if (Dates.diff(t, inicio) < -60 || Dates.diff(t, inicio) > 365) return { ok: false, reason: 'fecha' };
    kind = kind === 'night' ? 'night' : 'day';
    var it = { id: Util.uid(), name: nombre.slice(0, 120), since: inicio < t ? inicio : t,
      reto: { dias: Util.clamp(Math.round(+dias || 30), 3, 365), inicio: inicio, estado: 'activo' } };
    S.routines[kind].push(it);
    Store.save();
    return { ok: true, id: it.id, kind: kind };
  }
  // Al terminar: seguir como hábito (sin reto activo) o terminarlo (en pausa: el
  // historial se queda, y se puede reanudar en «Editar»).
  function retoDecision(kind, id, decision) {
    var it = Util.byId(S.routines[kind], id); if (!it || !it.reto) return { ok: false };
    it.reto.estado = decision === 'terminado' ? 'terminado' : 'continuar';
    if (decision === 'terminado' && !it.paused) it.paused = Dates.today();
    Store.save();
    return { ok: true };
  }
  function retoReiniciar(kind, id) {
    var it = Util.byId(S.routines[kind], id); if (!it || !it.reto) return { ok: false };
    it.reto.inicio = Dates.today(); it.reto.estado = 'activo'; delete it.paused;
    Store.save();
    return { ok: true };
  }

  // El reto antiguo (state.challenge) pasa a ser un hábito con reto. Idempotente;
  // si algo falla, el estado se queda como estaba. El original no se borra.
  function migrar() {
    try {
      var r = BdvMigraciones.retoAHabito(S, Dates.today(), Util.uid);
      if (!r.cambiado) return r.info;
      S.routines = r.state.routines; S.rlog = r.state.rlog; S.migraciones = r.state.migraciones;
      Store.saveNow();
      return r.info;
    } catch (e) { return { motivo: 'error', error: String(e && e.message || e) }; }
  }
  // La pausa empieza hoy: lo ya hecho en días anteriores no cambia.
  function pausar(kind, id) {
    var it = Util.byId(S.routines[kind], id); if (!it) return;
    if (it.paused) delete it.paused; else it.paused = Dates.today();
    Store.save();
  }
  function descansoSemanal(d) {
    var w = S.rest.week, p = w.indexOf(d);
    if (p >= 0) w.splice(p, 1); else w.push(d);
    Store.save();
  }
  function descansarHoy() {
    var t = Dates.today();
    if (S.rest.dates[t]) delete S.rest.dates[t]; else S.rest.dates[t] = true;
    Store.save();
  }

  // La nota de un día; vacía, desaparece.
  function nota(dia, texto) {
    if (String(texto || '').trim()) S.notes[dia] = texto; else delete S.notes[dia];
    Store.save();
  }
  // Un aviso que la persona quitó no vuelve ese día.
  function descartarAviso(id) { S.dismissed[id] = Dates.today(); Store.save(); }

  return { frecuencia: frecuencia, nuevoReto: nuevoReto, retoDecision: retoDecision, retoReiniciar: retoReiniciar, migrar: migrar,
    marcar: marcar, nuevo: nuevo, borrar: borrar, restaurar: restaurar, nombre: nombre, dia: dia, pausar: pausar, descansoSemanal: descansoSemanal, descansarHoy: descansarHoy, nota: nota, descartarAviso: descartarAviso };
})();
