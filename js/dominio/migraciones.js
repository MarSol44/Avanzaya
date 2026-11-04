/* Brújula de Vida — migraciones de datos (dominio puro: sin pantalla ni almacén).

   reto → hábito (Hábitos v2). Antes el reto de 30 días era un objeto aparte
   (state.challenge = { name, days, start, done: { fecha: true } }); ahora es un
   hábito con `reto`. Esta función calcula el estado migrado SIN tocar el que
   recibe: si algo falla, quien llama se queda con el original intacto.

   Reglas:
     · Idempotente: si ya se migró (state.migraciones.reto) o ya hay un hábito
       con reto.migrado, no hace nada.
     · El reto original NO se borra: se queda en state.challenge durante el
       periodo de validación (y las versiones anteriores lo siguen leyendo).
     · Copia a rlog los días marcados que caen dentro del reto y no son futuros,
       sin duplicar; los que no (fuera de fechas, futuros) se cuentan como omitidos.
     · Datos incompletos: sin nombre → «Reto»; duración fuera de 3–365 → 30; sin
       inicio → el primer día marcado o hoy. Sin nada que migrar → no hace nada.
     · Un reto que ya terminó se migra en pausa (no aparece de golpe en Hoy) y con
       estado «terminado»; uno activo, como hábito de día con su reto.
     · No toca los hábitos que ya había: el nuevo va al final de «De día».

   retoAHabito(state, hoy, uid) → { cambiado, state, info }  */
var BdvMigraciones = (function () {
  'use strict';
  var FECHA = /^\d{4}-\d\d-\d\d$/;

  function sumarDias(k, n) {
    var p = k.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  function retoAHabito(state, hoy, uid) {
    var c = state && state.challenge;
    if (!c || typeof c !== 'object') return { cambiado: false, state: state, info: { motivo: 'sin reto' } };
    if (state.migraciones && state.migraciones.reto) return { cambiado: false, state: state, info: { motivo: 'ya migrado' } };
    var rutinas = state.routines || {};
    var ya = (rutinas.day || []).concat(rutinas.night || []).filter(function (it) { return it && it.reto && it.reto.migrado; })[0];
    if (ya) return { cambiado: false, state: state, info: { motivo: 'ya migrado', habito: ya.id } };

    var marcados = Object.keys(c.done && typeof c.done === 'object' ? c.done : {})
      .filter(function (k) { return FECHA.test(k) && c.done[k]; }).sort();
    var inicio = FECHA.test(c.start || '') ? c.start : (marcados[0] || hoy);
    var dias = +c.days >= 3 && +c.days <= 365 ? Math.round(+c.days) : 30;
    var nombre = String(c.name || '').trim().slice(0, 120) || 'Reto';
    // Si una versión anterior abrió estos datos, habrá quitado las marcas de la
    // migración (no las conoce) y el hábito habrá quedado como uno normal: con el
    // mismo nombre y creado el día que empezó el reto, se reconoce y no se repite.
    var gemelo = (rutinas.day || []).concat(rutinas.night || [])
      .filter(function (it) { return it && it.name === nombre && it.since === inicio; })[0];
    if (gemelo) return { cambiado: false, state: state, info: { motivo: 'ya migrado', habito: gemelo.id } };
    var fin = sumarDias(inicio, dias - 1);
    if (!String(c.name || '').trim() && !FECHA.test(c.start || '') && !marcados.length) {
      return { cambiado: false, state: state, info: { motivo: 'reto vacío' } };
    }

    var s = copia(state);
    if (!s.routines) s.routines = { day: [], night: [] };
    if (!s.routines.day) s.routines.day = [];
    if (!s.routines.night) s.routines.night = [];
    if (!s.rlog) s.rlog = {};
    var id = uid(), terminado = hoy > fin;
    var it = { id: id, name: nombre, since: inicio, reto: { dias: dias, inicio: inicio, estado: terminado ? 'terminado' : 'activo', migrado: true } };
    if (terminado) it.paused = sumarDias(fin, 1);
    s.routines.day.push(it);

    var copiados = 0, omitidos = 0;
    marcados.forEach(function (k) {
      if (k < inicio || k > fin || k > hoy) { omitidos++; return; }
      var l = s.rlog[k] || (s.rlog[k] = { day: [], night: [] });
      if (!l.day) l.day = [];
      if (l.day.indexOf(id) < 0) { l.day.push(id); copiados++; }
    });
    s.migraciones = s.migraciones || {};
    s.migraciones.reto = { habito: id, fecha: hoy, copiados: copiados, omitidos: omitidos };
    return { cambiado: true, state: s, info: { habito: id, copiados: copiados, omitidos: omitidos, terminado: terminado } };
  }

  return { retoAHabito: retoAHabito };
})();
if (typeof globalThis !== 'undefined') globalThis.BdvMigraciones = BdvMigraciones;
