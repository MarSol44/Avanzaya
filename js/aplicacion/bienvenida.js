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
    if (!S.welcome) S.welcome = { done: false, pospuesta: false, paso: 0, area: '', areas: [], cambio: '', meta: '', vision: '', freno: '', borrador: null, realista: '' };
    // datos de antes (una sola área): esa es la lista
    if (!Array.isArray(S.welcome.areas)) S.welcome.areas = S.welcome.area ? [S.welcome.area] : [];
    return S.welcome;
  }
  function areas() { return datos().areas.map(function (id) { return Areas.get(id); }).filter(Boolean); }
  function area() { return Areas.get(datos().area); }
  function sinMetas() { return !S.goalsS.length && !S.goalsL.length; }

  // Se enseña al entrar a quien aún no la hizo, ni la dejó para luego, ni tiene metas.
  function pendiente() { var w = datos(); return !w.done && !w.pospuesta && sinMetas(); }
  // La dejó para luego: Hoy le ofrece seguir donde iba.
  function retomable() { var w = datos(); return !w.done && !!w.pospuesta && sinMetas(); }
  function quedan() { return Math.max(1, PLAN - paso()); }

  function paso() { return Math.max(0, Math.min(HECHO, datos().paso || 0)); }
  function irA(n) { datos().paso = Math.max(0, Math.min(PLAN, n)); Store.save(); }

  // Si cambian las respuestas, el plan se vuelve a proponer con ellas.
  function olvidarBorrador() { var w = datos(); w.borrador = null; w.realista = ''; }

  // Hasta tres áreas; tocar otra vez una la quita. La primera elegida es el punto
  // de partida (la del primer plan); las otras se ofrecen al terminar.
  function elegirArea(id) {
    var w = datos(), p = w.areas.indexOf(id);
    if (p >= 0) w.areas.splice(p, 1);
    else if (!Areas.get(id)) return { ok: false };
    else if (w.areas.length >= 3) return { ok: false, lleno: true };
    else w.areas.push(id);
    var antes = w.area;
    w.area = w.areas[0] || '';
    if (w.area !== antes) olvidarBorrador();
    Store.save();
    return { ok: true };
  }
  // Desde el chequeo («No lo tengo claro»): se empieza por el área que se elija ahí.
  function desdeChequeo(id) {
    if (!Areas.get(id)) return;
    var w = datos();
    w.areas = [id].concat(w.areas.filter(function (x) { return x !== id; })).slice(0, 3);
    w.area = id; w.paso = 1; w.pospuesta = false;
    olvidarBorrador();
    Store.save();
  }
  function cambio(v) { datos().cambio = String(v || '').slice(0, B.LIM.texto); Store.save(); }
  function meta(v) { datos().meta = String(v || '').slice(0, B.LIM.meta); olvidarBorrador(); Store.save(); }
  function vision(v) { datos().vision = String(v || '').slice(0, B.LIM.texto); Store.save(); }
  function freno(id) { datos().freno = B.freno(id).id; olvidarBorrador(); Store.save(); }

  // ¿La pregunta actual tiene respuesta? Si no, se puede saltar igualmente.
  function respondida() {
    var w = datos(), n = paso();
    if (n === 0) return !!(w.areas.length || String(w.cambio || '').trim());
    if (n === 1) return !!(String(w.meta || '').trim() || String(w.vision || '').trim());
    if (n === 2) return !!w.freno;
    return true;
  }

  function propuesta() { return B.plan(datos(), area(), Dates.inDays); }

  // La propuesta es un borrador: se puede cambiar y se guarda según se edita.
  // Si se retoma otro día, ningún paso queda con una fecha ya pasada.
  function borrador() {
    var w = datos(), hoy = Dates.today();
    if (!w.borrador) {
      var p = propuesta();
      w.borrador = { nombre: p.meta.name, pasos: p.pasos.map(function (s) { return { name: s.name, due: s.due }; }) };
    }
    w.borrador.pasos.forEach(function (s) { if (!s.due || s.due < hoy) s.due = hoy; });
    return w.borrador;
  }
  function nombrePlan(v) { borrador().nombre = String(v || '').slice(0, B.LIM.meta); Store.save(); }
  function pasoNombre(i, v) { var s = borrador().pasos[i]; if (s) { s.name = String(v || '').slice(0, B.LIM.paso); Store.save(); } }
  function pasoFecha(i, v) {
    var s = borrador().pasos[i];
    if (!s || !/^\d{4}-\d\d-\d\d$/.test(v || '') || v < Dates.today()) return false;
    s.due = v; Store.save();
    return true;
  }
  function quitarPaso(i) { borrador().pasos.splice(i, 1); Store.save(); }
  function anadirPaso() {
    var b = borrador();
    if (b.pasos.length >= B.LIM.pasos) return false;
    var ult = b.pasos.length ? b.pasos[b.pasos.length - 1].due : Dates.today();
    b.pasos.push({ name: '', due: ult });
    Store.save();
    return true;
  }
  function realista(v) { datos().realista = datos().realista === v ? '' : v; Store.save(); }
  // «Es demasiado»: se queda solo el primer paso.
  function aligerar() { var b = borrador(); b.pasos = b.pasos.slice(0, 1); datos().realista = ''; Store.save(); }

  // Convierte el borrador en una meta de corto plazo. Los pasos sin texto no
  // se añaden y quedan en orden de fecha; el primero es el «primer paso».
  function aceptar() {
    var p = propuesta(), w = datos(), a = area(), b = borrador();
    var titulo = String(b.nombre || '').trim().slice(0, B.LIM.meta) || p.meta.name;
    var pasos = [];
    b.pasos.forEach(function (s) {
      var n = String(s.name || '').trim();
      if (n) pasos.push({ id: Util.uid(), name: n.slice(0, B.LIM.paso), desc: '', due: s.due, done: false, promoted: false });
    });
    pasos.sort(function (x, y) { return x.due < y.due ? -1 : x.due > y.due ? 1 : 0; });
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

    // las áreas elegidas quedan como «importantes» (se cambian en Perfil › Áreas de vida)
    if (w.areas.length) S.profile.areasClave = w.areas.slice(0, 3);
    w.done = true; w.pospuesta = false; w.meta = titulo; w.paso = HECHO; w.borrador = null;
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
    PLAN: PLAN, HECHO: HECHO, FRENOS: B.FRENOS, datos: datos, area: area, areas: areas, desdeChequeo: desdeChequeo,
    pendiente: pendiente, retomable: retomable, quedan: quedan,
    paso: paso, irA: irA, elegirArea: elegirArea, cambio: cambio, meta: meta, vision: vision, freno: freno,
    respondida: respondida, propuesta: propuesta, aceptar: aceptar, LIM: B.LIM,
    borrador: borrador, nombrePlan: nombrePlan, pasoNombre: pasoNombre, pasoFecha: pasoFecha,
    quitarPaso: quitarPaso, anadirPaso: anadirPaso, realista: realista, aligerar: aligerar,
    posponer: posponer, seguir: seguir, descartar: descartar
  };
})();
