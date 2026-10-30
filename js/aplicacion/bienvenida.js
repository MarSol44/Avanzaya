/* ==========================================================================
   APLICACIÓN — casos de uso de la bienvenida: guardar las respuestas según
   se contestan (si se recarga o se sale, se sigue donde se iba), proponer el
   primer plan y, al aceptarlo, repartirlo por lo que la app ya tiene:
     · la meta y sus pasos → Metas (el primero cae hoy, así sale en Hoy)
     · lo que quiere en 5 años → Mi Yo del Futuro y su Visión
     · el primer paso → firstStep, igual que al final del chequeo de vida
   ========================================================================== */
var Bienvenida = (function () {
  'use strict';
  var S = Store.S, B = BdvBienvenida;
  var PLAN = 3, HECHO = 4;   // 0 mejorar · 1 futuro · 2 freno · 3 plan · 4 lo que se guardó

  function datos() {
    if (!S.welcome) S.welcome = { done: false, pospuesta: false, paso: 0, area: '', cambio: '', meta: '', vision: '', freno: '' };
    return S.welcome;
  }
  function area() { return Areas.get(datos().area); }
  function sinMetas() { return !S.goalsS.length && !S.goalsL.length; }

  // Se enseña al entrar a quien aún no la hizo, ni la dejó para luego, ni tiene metas.
  function pendiente() { var w = datos(); return !w.done && !w.pospuesta && sinMetas(); }
  // La dejó para luego: Hoy le ofrece seguir donde iba.
  function retomable() { var w = datos(); return !w.done && !!w.pospuesta && sinMetas(); }
  function quedan() { return Math.max(1, PLAN - paso()); }

  function paso() { return Math.max(0, Math.min(HECHO, datos().paso || 0)); }
  function irA(n) { datos().paso = Math.max(0, Math.min(PLAN, n)); Store.save(); }

  function elegirArea(id) {
    var w = datos();
    w.area = w.area === id ? '' : (Areas.get(id) ? id : '');   // tocar otra vez la quita
    Store.save();
  }
  function cambio(v) { datos().cambio = String(v || '').slice(0, B.LIM.texto); Store.save(); }
  function meta(v) { datos().meta = String(v || '').slice(0, B.LIM.meta); Store.save(); }
  function vision(v) { datos().vision = String(v || '').slice(0, B.LIM.texto); Store.save(); }
  function freno(id) { datos().freno = B.freno(id).id; Store.save(); }

  // ¿La pregunta actual tiene respuesta? Si no, se puede saltar igualmente.
  function respondida() {
    var w = datos(), n = paso();
    if (n === 0) return !!(w.area || String(w.cambio || '').trim());
    if (n === 1) return !!(String(w.meta || '').trim() || String(w.vision || '').trim());
    if (n === 2) return !!w.freno;
    return true;
  }

  function propuesta() { return B.plan(datos(), area(), Dates.inDays); }

  // Convierte la propuesta en una meta de corto plazo. `nombres` son los
  // pasos tal como la persona los dejó (vacíos = se quitan).
  function aceptar(nombre, nombres) {
    var p = propuesta(), w = datos(), a = area();
    var titulo = String(nombre || '').trim().slice(0, B.LIM.meta) || p.meta.name;
    var pasos = [];
    p.pasos.forEach(function (s, i) {
      var n = nombres && typeof nombres[i] === 'string' ? nombres[i].trim() : s.name;
      if (n) pasos.push({ id: Util.uid(), name: n.slice(0, 200), desc: '', due: s.due, done: false, promoted: false });
    });
    S.goalsS.unshift({
      id: Util.uid(), name: titulo, done: false, cat: p.meta.cat,
      motivation: p.meta.motivation, reward: '', priority: p.meta.priority, due: p.meta.due, steps: pasos
    });
    if (pasos.length) S.firstStep = pasos[0].name;

    // Lo que quiere en 5 años va a Mi Yo del Futuro (sin pisar lo que ya hubiera)
    // y, si aún no tiene ninguna, empieza su Visión.
    var vis = String(w.vision || '').trim(), visionNueva = false;
    if (vis && a) {
      var f = S.future[a.id] || {};
      if (!f.goal) S.future[a.id] = { goal: vis, why: f.why || '' };
      if (!S.visions.length) {
        S.visions.push({ id: Util.uid(), text: 'En 5 años:\n\n' + a.emoji + ' ' + vis, date: Dates.today() });
        visionNueva = true;
      }
    }

    w.done = true; w.pospuesta = false; w.meta = titulo; w.paso = HECHO;
    S.onboarded = true;
    Store.saveNow();
    return { ok: true, meta: titulo, hoy: pasos.length ? pasos[0].name : '', pasos: pasos.length, futuro: !!(vis && a), vision: visionNueva };
  }

  // «Ahora no»: se sale sin perder nada; Hoy ofrece seguir después.
  function posponer() { var w = datos(); w.pospuesta = true; S.onboarded = true; Store.saveNow(); }
  function seguir() { datos().pospuesta = false; Store.save(); }
  // «No, gracias» desde Hoy: no se vuelve a ofrecer.
  function descartar() { var w = datos(); w.done = true; w.pospuesta = false; S.onboarded = true; Store.saveNow(); }

  return {
    PLAN: PLAN, HECHO: HECHO, FRENOS: B.FRENOS, datos: datos, area: area,
    pendiente: pendiente, retomable: retomable, quedan: quedan,
    paso: paso, irA: irA, elegirArea: elegirArea, cambio: cambio, meta: meta, vision: vision, freno: freno,
    respondida: respondida, propuesta: propuesta, aceptar: aceptar,
    posponer: posponer, seguir: seguir, descartar: descartar
  };
})();
