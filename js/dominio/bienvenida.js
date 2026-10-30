/* ==========================================================================
   DOMINIO — bienvenida: de tres respuestas sale un primer plan.

   La persona dice qué siente que necesita cambiar (un área y, si quiere, con
   sus palabras), qué quiere conseguir y qué la frena. Con eso se arma una
   meta de corto plazo con tres pasos pensados para ese freno; el primero cae
   hoy, así aparece en el plan de Hoy sin configurar nada más.
   Sin pantalla ni almacenamiento: recibe las respuestas y devuelve el plan.
   ========================================================================== */
var BdvBienvenida = (function () {
  'use strict';

  // Lo que suele frenar, con pasos que lo esquivan. «{m}» es la meta.
  var FRENOS = [
    { id: 'empezar', label: 'No sé por dónde empezar',
      consejo: 'Cuando no sabes por dónde empezar, lo que ayuda es aclarar el destino y dar un primer paso concreto.',
      pasos: ['Escribir en una frase cómo sabré que he conseguido «{m}»', 'Buscar a alguien que ya lo haya logrado y ver cómo empezó', 'Elegir la primera acción concreta y ponerle día'] },
    { id: 'tiempo', label: 'No tengo tiempo',
      consejo: 'Sin tiempo, la clave es que cada paso quepa en 10 minutos y tenga su hueco en el calendario.',
      pasos: ['Reservar 10 minutos al día para «{m}»', 'Hacer una primera sesión de 10 minutos', 'Repetirla tres veces esta semana'] },
    { id: 'motivacion', label: 'Me cuesta mantener la motivación',
      consejo: 'La motivación va y viene: ayuda tener claro el porqué, contarlo y celebrar cada avance.',
      pasos: ['Escribir por qué «{m}» es importante para mí', 'Contárselo a alguien de confianza', 'Celebrar el primer avance, por pequeño que sea'] },
    { id: 'miedo', label: 'Me da miedo fallar',
      consejo: 'Con miedo a fallar, sirve empezar por pasos que no pueden salir mal y fijarse en lo aprendido.',
      pasos: ['Escribir lo peor que podría pasar y qué haría entonces', 'Dar un paso pequeño hacia «{m}» que no pueda salir mal', 'Apuntar qué aprendí y cómo me sentí'] },
    { id: 'energia', label: 'Me falta energía',
      consejo: 'Con poca energía, primero se cuida el descanso y se empieza por versiones mínimas.',
      pasos: ['Acostarme a la misma hora tres noches seguidas', 'Elegir el momento del día con más energía para «{m}»', 'Hacer una versión mínima de 5 minutos'] }
  ];
  var DIAS = [0, 3, 7];          // cuándo cae cada paso (desde hoy)
  var PLAZO = 30;                // la meta, a un mes
  var LIM = { texto: 400, meta: 120 };

  function freno(id) {
    for (var i = 0; i < FRENOS.length; i++) if (FRENOS[i].id === id) return FRENOS[i];
    return FRENOS[0];
  }
  function limpio(v, max) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max); }
  function corto(nombre) { return String(nombre || '').split(' (')[0]; }

  // ¿Hay lo mínimo para proponer un plan? Un área, o qué se quiere conseguir.
  function completa(r) { r = r || {}; return !!(r.area || limpio(r.meta, LIM.meta)); }

  // r: { area, cambio, meta, freno }; area: { id, name } (o null)
  // masDias(n) → fecha 'AAAA-MM-DD' dentro de n días
  function plan(r, area, masDias) {
    r = r || {};
    var f = freno(r.freno);
    var meta = limpio(r.meta, LIM.meta) || (area ? 'Sentirme mejor en ' + corto(area.name).toLowerCase() : 'Dar mi primer paso');
    var porque = [];
    if (limpio(r.cambio, LIM.texto)) porque.push('Lo que quiero cambiar: ' + limpio(r.cambio, LIM.texto));
    porque.push('Lo que me frena: ' + f.label.toLowerCase() + '.');
    return {
      meta: {
        name: meta, cat: area ? area.id : '', due: masDias(PLAZO), priority: 'Alta',
        motivation: porque.join('\n')
      },
      pasos: f.pasos.map(function (p, i) { return { name: p.replace('{m}', meta), due: masDias(DIAS[i]) }; }),
      consejo: f.consejo
    };
  }

  return { FRENOS: FRENOS, LIM: LIM, freno: freno, completa: completa, plan: plan };
})();
