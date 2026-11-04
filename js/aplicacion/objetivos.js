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
  // Una meta que se abrió y se cerró sin escribir nada no se queda como «Meta sin nombre».
  function descartarVacia(kind, id) {
    var g = Goals.find(kind, id);
    if (!g || String(g.name || '').trim() || (g.steps || []).length || String(g.motivation || '').trim()) return false;
    quitar(kind, id);
    Store.save();
    return true;
  }
  // Una idea sugerida por la app pasa a ser meta.
  function sugerida(kind, nombre, area) {
    var g = {
      id: Util.uid(), name: nombre, done: false, cat: area || '',
      motivation: '', reward: '', priority: 'Media',
      due: Dates.inDays(kind === 'S' ? 90 : 730), steps: []
    };
    lista(kind).unshift(g);
    Store.save();
    return g;
  }
  // Una meta corta que salió de un paso de largo plazo (origen) y ese paso van a la
  // par: completar una completa el otro; si la meta corta se borra, el paso vuelve
  // a su meta como un paso más (y a Hoy, si tiene fecha).
  function pasoDeOrigen(g) {
    var L = g && g.origen && Util.byId(S.goalsL, g.origen.id);
    return L ? Util.byId(L.steps || [], g.origen.sid) : null;
  }
  function metaDePaso(sid) {
    return S.goalsS.filter(function (g) { return g.origen && g.origen.sid === sid; })[0] || null;
  }
  // Hecho o no, y desde cuándo (doneAt, solo a partir de ahora: no se inventa para lo anterior).
  function marcar(x, hecho) { x.done = hecho; if (hecho) x.doneAt = Dates.today(); else delete x.doneAt; }
  // Completar una meta completa también sus pasos.
  function alternar(kind, id) {
    var g = Goals.find(kind, id);
    if (g) {
      marcar(g, !g.done);
      if (g.done && g.steps) g.steps.forEach(function (s) { if (!s.done) marcar(s, true); });
      var st = kind === 'S' && pasoDeOrigen(g); if (st) marcar(st, g.done);
    }
    Store.save();
  }
  function borrar(kind, id) {
    var st = kind === 'S' && pasoDeOrigen(Goals.find(kind, id)); if (st) st.promoted = false;
    quitar(kind, id); Store.save();
  }
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
  function pasoHecho(kind, id, sid) {
    var s = paso(kind, id, sid); if (!s) return;
    marcar(s, !s.done);
    var g = kind === 'L' && s.promoted && metaDePaso(sid); if (g) marcar(g, s.done);
    Store.save();
  }
  // Un hito es un paso que marca un punto importante de la meta (se ve con bandera
  // en la meta, en Hoy y en las fechas de Metas). Sigue siendo un paso.
  function pasoHito(kind, id, sid) { var s = paso(kind, id, sid); if (s) { if (s.hito) delete s.hito; else s.hito = true; } Store.save(); }
  // Devuelve lo necesario para deshacerlo: el paso y su sitio en la meta.
  function pasoBorrar(kind, id, sid) {
    var g = Goals.find(kind, id); if (!g) return null;
    var pos = -1, st = null;
    (g.steps || []).forEach(function (x, i) { if (x.id === sid) { pos = i; st = x; } });
    g.steps = (g.steps || []).filter(function (x) { return x.id !== sid; });
    Store.save();
    return st ? { kind: kind, id: id, paso: st, pos: pos } : null;
  }
  function pasoRestaurar(copia) {
    var g = copia && Goals.find(copia.kind, copia.id);
    if (!g || Util.byId(g.steps || [], copia.paso.id)) return;
    (g.steps = g.steps || []).splice(Math.max(0, copia.pos), 0, copia.paso);
    Store.save();
  }
  function pasoNombre(kind, id, sid, v) { var s = paso(kind, id, sid); if (s) s.name = v; Store.save(); }
  function pasoDesc(kind, id, sid, v) { var s = paso(kind, id, sid); if (s) s.desc = v; Store.save(); }

  // Un paso de largo plazo pasa a ser meta corta solo si la persona lo pide (una
  // vez), y queda unida a él por `origen`.
  function ascender(goalId, stepId) {
    var g = Util.byId(S.goalsL, goalId); if (!g) return { ok: false };
    var st = Util.byId(g.steps || [], stepId); if (!st || st.promoted) return { ok: false };
    st.promoted = true;
    S.goalsS.unshift({
      id: Util.uid(), name: st.name || 'Paso sin nombre', done: !!st.done, cat: g.cat,
      motivation: 'Paso de la meta «' + (g.name || 'sin nombre') + '»',
      reward: '', priority: 'Media', due: st.due || Dates.inDays(90), steps: [],
      origen: { id: g.id, sid: st.id }
    });
    Store.save();
    return { ok: true, nombre: st.name || 'El paso' };
  }
  // Poner fecha a un paso es solo eso: sigue en su meta y sale en Hoy ese día.
  function pasoFecha(kind, id, sid, fecha) {
    var s = paso(kind, id, sid); if (!s) return { ok: false };
    s.due = fecha;
    Store.save();
    return { ok: true };
  }

  // (Antes había «Poner los pasos en el calendario», que copiaba cada paso con fecha
  // como una tarea aparte. Ya no hace falta: un paso con fecha sale solo en Hoy y en
  // las fechas de Metas. Las tareas que creó siguen enlazadas a su paso.)

  return {
    crear: crear, descartarVacia: descartarVacia, sugerida: sugerida, alternar: alternar, borrar: borrar, prioridad: prioridad, campo: campo,
    pasoNuevo: pasoNuevo, pasoHecho: pasoHecho, pasoBorrar: pasoBorrar, pasoRestaurar: pasoRestaurar, pasoHito: pasoHito, pasoNombre: pasoNombre,
    pasoDesc: pasoDesc, pasoFecha: pasoFecha, ascender: ascender
  };
})();
