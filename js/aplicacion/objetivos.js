/* ==========================================================================
   APLICACIÓN — casos de uso de metas y pasos: crear, editar, completar,
   borrar, ascender un paso a meta corta y llevar los pasos al calendario.
   Cada uno cambia el estado y guarda; devuelve el resultado, no pinta.
   ========================================================================== */
var Objetivos = (function () {
  'use strict';
  var S = Store.S;

  function lista(kind) { return kind === 'S' ? S.goalsS : S.goalsL; }
  function quitar(kind, id) {
    if (kind === 'S') S.goalsS = S.goalsS.filter(function (x) { return x.id !== id; });
    else S.goalsL = S.goalsL.filter(function (x) { return x.id !== id; });
  }
  function paso(kind, id, sid) { var g = Goals.find(kind, id); return g ? Util.byId(g.steps || [], sid) : null; }

  /* --------------------------------------------------------------- metas */
  function crear(kind) {
    var g = {
      id: Util.uid(), name: '', done: false, cat: '', motivation: '', steps: [],
      due: kind === 'S' ? Dates.inDays(30) : Dates.inDays(730)
    };
    if (kind === 'S') { g.reward = ''; g.priority = 'Media'; }
    lista(kind).unshift(g);
    Store.save();
    return g;
  }
  // Una idea sugerida por la app pasa a ser meta.
  function sugerida(kind, nombre, area) {
    lista(kind).unshift({
      id: Util.uid(), name: nombre, done: false, cat: area || '',
      motivation: '', reward: '', priority: 'Media',
      due: Dates.inDays(kind === 'S' ? 90 : 730), steps: []
    });
    Store.save();
  }
  // Completar una meta completa también sus pasos.
  function alternar(kind, id) {
    var g = Goals.find(kind, id);
    if (g) { g.done = !g.done; if (g.done && g.steps) g.steps.forEach(function (s) { s.done = true; }); }
    Store.save();
  }
  function borrar(kind, id) { quitar(kind, id); Store.save(); }
  function prioridad(id, v) { var g = Goals.find('S', id); if (g) g.priority = v; Store.save(); }

  var CAMPOS = { name: 1, motivation: 1, reward: 1, due: 1, cat: 1 };
  function campo(kind, id, nombre, valor) {
    if (!CAMPOS[nombre]) return { ok: false, reason: 'campo' };
    var g = Goals.find(nombre === 'reward' ? 'S' : kind, id);
    if (g) g[nombre] = valor;
    Store.save();
    return { ok: !!g };
  }

  /* --------------------------------------------------------------- pasos */
  function pasoNuevo(kind, id, nombre) {
    nombre = String(nombre || '').trim();
    if (!nombre) return { ok: false, reason: 'empty' };
    var g = Goals.find(kind, id); if (!g) return { ok: false, reason: 'missing' };
    if (!g.steps) g.steps = [];
    g.steps.push({ id: Util.uid(), name: nombre, desc: '', due: '', done: false });
    Store.save();
    return { ok: true };
  }
  function pasoHecho(kind, id, sid) { var s = paso(kind, id, sid); if (s) s.done = !s.done; Store.save(); }
  function pasoBorrar(kind, id, sid) {
    var g = Goals.find(kind, id); if (!g) return;
    g.steps = (g.steps || []).filter(function (x) { return x.id !== sid; });
    Store.save();
  }
  function pasoNombre(kind, id, sid, v) { var s = paso(kind, id, sid); if (s) s.name = v; Store.save(); }
  function pasoDesc(kind, id, sid, v) { var s = paso(kind, id, sid); if (s) s.desc = v; Store.save(); }

  // Un paso de largo plazo pasa a ser meta corta (una sola vez).
  function ascender(goalId, stepId) {
    var g = Util.byId(S.goalsL, goalId); if (!g) return { ok: false };
    var st = Util.byId(g.steps || [], stepId); if (!st || st.promoted) return { ok: false };
    st.promoted = true;
    S.goalsS.unshift({
      id: Util.uid(), name: st.name || 'Paso sin nombre', done: !!st.done, cat: g.cat,
      motivation: 'Paso de la meta «' + (g.name || 'sin nombre') + '»',
      reward: '', priority: 'Media', due: st.due || Dates.inDays(90), steps: []
    });
    Store.save();
    return { ok: true, nombre: st.name || 'El paso' };
  }
  // Poner fecha a un paso de largo plazo que cae en menos de un año lo asciende solo.
  function pasoFecha(kind, id, sid, fecha) {
    var s = paso(kind, id, sid); if (!s) return { ok: false };
    s.due = fecha;
    Store.save();
    var dias = s.due ? Dates.diff(Dates.today(), s.due) : -1;
    if (kind === 'L' && s.due && !s.promoted && dias >= 0 && dias < 365) return ascender(id, sid);
    return { ok: true };
  }

  // Coloca en el calendario los pasos con fecha y la fecha límite (sin duplicar).
  function alCalendario(kind, id) {
    var g = Goals.find(kind, id); if (!g) return { ok: false, n: 0 };
    var n = 0;
    function put(day, title, sid) {
      if (!day) return;
      if (!S.events[day]) S.events[day] = [];
      if (S.events[day].some(function (e) { return e.goalId === g.id && e.sid === sid; })) return;
      S.events[day].push({ id: Util.uid(), title: title, goalId: g.id, sid: sid });
      n++;
    }
    (g.steps || []).forEach(function (s) { put(s.due, s.name || 'Paso', s.id); });
    put(g.due, 'Fecha límite · ' + (g.name || 'meta'), '__due');
    Store.save();
    return { ok: true, n: n };
  }

  /* ------------------------------------------------- visibles en Progreso */
  function ocultar(id) { S.hidden[id] = true; Store.save(); }
  function mostrar(kind) {
    (kind === 'all' ? Goals.all() : lista(kind)).forEach(function (g) { delete S.hidden[g.id]; });
    Store.save();
  }

  return {
    crear: crear, sugerida: sugerida, alternar: alternar, borrar: borrar, prioridad: prioridad, campo: campo,
    pasoNuevo: pasoNuevo, pasoHecho: pasoHecho, pasoBorrar: pasoBorrar, pasoNombre: pasoNombre,
    pasoDesc: pasoDesc, pasoFecha: pasoFecha, ascender: ascender, alCalendario: alCalendario,
    ocultar: ocultar, mostrar: mostrar
  };
})();
