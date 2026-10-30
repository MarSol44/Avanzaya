/* ==========================================================================
   Pantalla de BIENVENIDA — un pequeño acompañamiento para el primer uso:
   qué quieres mejorar → tu yo del futuro → tu primer paso. Cada pregunta se
   puede saltar; al final se explica qué se guardó y dónde editarlo.
   Solo pinta: lee el estado y la propuesta de Bienvenida.
   ========================================================================== */
(function () {
  'use strict';
  var esc = Fmt.esc;
  var PASOS = ['Qué quieres mejorar', 'Tu yo del futuro', 'Tu primer paso'];
  var CUANDO = ['Hoy', 'En 3 días', 'En una semana'];
  // Ejemplos para «¿qué quieres conseguir?», según el área elegida.
  var EJEMPLOS = {
    c1: 'Terminar el curso que tengo a medias', c2: 'Ver más a mis amigos',
    c3: 'Pasar más tiempo de calidad en pareja', c4: 'Ahorrar 100 € este mes',
    c5: 'Moverme 20 minutos tres veces por semana', c6: 'Acabar el día con menos agobio',
    c7: 'Leer un libro este mes', c8: 'Retomar un hobby que dejé'
  };
  function corto(a) { return a ? a.name.split(' (')[0] : ''; }

  function barra(n) {
    var titulo = n < 3 ? PASOS[n] : n === 3 ? 'Tu primer plan' : 'Todo listo';
    var h = '<div class="appbar"><div class="appbar-row">' +
      (n > 0 && n < 4 ? '<button class="iconbtn" data-a="bvBack" aria-label="Anterior">' + I('left') + '</button>' : '<span style="width:38px"></span>') +
      '<h1 style="text-align:center;font-size:1.2rem">' + titulo + '</h1>' +
      (n < 4 ? '<button class="btn ghost xs" data-a="bvSkip">Ahora no</button>' : '<span style="width:38px"></span>') + '</div>';
    if (n < 4) {
      // 3 preguntas + el plan: el plan es el cuarto tramo de la barra
      h += '<div class="stepper"><div class="track"><span style="width:' + ((n + 1) / 4 * 100) + '%"></span></div>' +
        '<span class="n">' + (n < 3 ? 'Paso ' + (n + 1) + ' de 3' : 'Último paso') + '</span></div>';
    }
    return h + '</div>';
  }

  function pregunta(texto, sub) {
    return '<div class="stack sm" style="text-align:center">' +
      '<p class="hero-quote">' + texto + '</p>' + (sub ? '<p class="muted">' + sub + '</p>' : '') + '</div>';
  }

  function paso0(w) {
    return pregunta('¿Qué sientes que necesitas cambiar en tu vida?', 'No hace falta tenerlo claro. Elige lo que más pese ahora.') +
      '<div class="bv-areas" role="group" aria-label="Áreas de tu vida">' +
      Areas.all().map(function (c) {
        return '<button type="button" class="bv-area" data-a="bvArea" data-v="' + esc(c.id) + '" aria-pressed="' + (w.area === c.id) + '">' +
          '<span class="e">' + esc(c.emoji) + '</span>' + esc(corto(c)) + '</button>';
      }).join('') + '</div>' +
      '<label class="field"><span>Si quieres, cuéntalo con tus palabras</span>' +
      '<textarea class="ta" data-f="bvCambio" maxlength="400" placeholder="Ej. Siento que voy con prisa todo el día y no avanzo en lo que me importa.">' + esc(w.cambio || '') + '</textarea></label>';
  }

  function paso1(w) {
    var a = Bienvenida.area();
    return pregunta('¿Qué te gustaría conseguir?', 'Algo que puedas notar dentro de un mes. Pequeño también vale.') +
      (a ? '<div class="row" style="justify-content:center"><span class="pill">' + esc(a.emoji + ' ' + corto(a)) + '</span></div>' : '') +
      '<label class="field"><span>Este mes quiero…</span>' +
      '<input class="inp" data-f="bvMeta" maxlength="120" value="' + esc(w.meta || '') + '" placeholder="' +
      esc('Ej. ' + (EJEMPLOS[w.area] || 'Dedicarme un rato al día a mí')) + '"></label>' +
      '<label class="field"><span>' + (a ? 'Y dentro de 5 años, ¿cómo te gustaría que fuera ' + esc(corto(a).toLowerCase()) + '?' : 'Y dentro de 5 años, ¿cómo te gustaría que fuera tu vida?') +
      ' <em style="font-weight:400">(opcional)</em></span>' +
      '<textarea class="ta" data-f="bvVision" maxlength="400" placeholder="Una frase, en presente. Ej. Vivo con calma y tengo tiempo para lo que me importa.">' + esc(w.vision || '') + '</textarea></label>' +
      (a ? '' : '<p class="tiny">La frase de 5 años se guarda en Mi Yo del Futuro cuando eliges un área.</p>');
  }

  function paso2(w) {
    return pregunta('¿Qué te está frenando?', 'Con esto elegimos pasos que sí te encajen.') +
      '<div class="stack sm" role="group" aria-label="Qué te frena">' +
      Bienvenida.FRENOS.map(function (f) {
        return '<button type="button" class="bv-freno" data-a="bvFreno" data-v="' + f.id + '" aria-pressed="' + (w.freno === f.id) + '">' +
          esc(f.label) + '<span class="bv-ok" aria-hidden="true">' + I('check', 15) + '</span></button>';
      }).join('') + '</div>';
  }

  function plan() {
    var p = Bienvenida.propuesta(), a = Bienvenida.area();
    var h = '<p class="muted" style="text-align:center">Hecho con lo que nos contaste. Puedes cambiar lo que quieras.</p>' +
      '<div class="card"><div class="stack">' +
      '<div class="label">Tu meta para este mes</div>' +
      '<input class="inp bv-meta" id="bvNombre" maxlength="120" value="' + esc(p.meta.name) + '" aria-label="Nombre de la meta">' +
      '<div class="row" style="gap:8px;flex-wrap:wrap">' +
      (a ? '<span class="pill">' + esc(a.emoji + ' ' + corto(a)) + '</span>' : '') +
      '<span class="pill num">' + I('calendar', 13) + esc(Fmt.fmt(p.meta.due)) + '</span>' +
      '<span class="pill bad">Prioridad alta</span></div></div></div>';

    h += '<div class="card"><div class="stack">' +
      '<div class="label">Tres pasos para empezar</div>' +
      '<p class="tiny">Si borras uno, no se añade.</p>' +
      '<div class="steps">' +
      p.pasos.map(function (s, i) {
        return '<div class="step bv-step"><span class="pill num' + (i === 0 ? ' accent' : '') + '">' + CUANDO[i] + '</span>' +
          '<textarea class="inp-plain bv-paso" rows="2" data-bvpaso="' + i + '" maxlength="200" aria-label="Paso ' + (i + 1) + '">' + esc(s.name) + '</textarea></div>';
      }).join('') + '</div></div></div>';

    h += '<p class="notice">' + esc(p.consejo) + '</p>';
    return h;
  }

  // Al terminar: qué se guardó, dónde está y cómo cambiarlo.
  function hecho(w) {
    var a = Bienvenida.area();
    var fila = function (icono, titulo, texto, tab) {
      return '<div class="listrow" style="align-items:flex-start;gap:12px;padding:14px">' +
        '<span style="color:var(--accent);flex:none">' + I(icono, 20) + '</span>' +
        '<span class="grow"><strong style="display:block">' + titulo + '</strong>' +
        '<span class="muted" style="display:block;margin-top:3px">' + texto + '</span></span>' +
        (tab ? '<button class="btn ghost xs" data-a="bvVer" data-v="' + tab + '">Ver</button>' : '') + '</div>';
    };
    var h = pregunta('Ya tienes por dónde empezar.', 'Esto es lo que hemos guardado:') +
      '<div class="list">' +
      fila('sunrise', 'Tu primer paso, hoy', esc(Datos.estado().firstStep || 'Tu primer paso') + '. Aparece en tu plan de Hoy; márcalo cuando lo hagas.', 'hoy') +
      fila('target', 'Tu meta: «' + esc(w.meta) + '»', 'En Metas, con sus pasos. Tócala para cambiar el nombre, las fechas o los pasos.', 'metas');
    if (String(w.vision || '').trim() && a) {
      h += fila('sparkle', 'Tu yo del futuro', a.emoji + ' ' + esc(w.vision) + '. Está en Visión, en Mi Yo del Futuro.', 'vision');
    }
    h += '</div>' +
      '<div class="card sunk"><div class="stack sm">' +
      '<div class="label">Cuando quieras, más a fondo</div>' +
      '<p style="font-size:14px;line-height:1.55">El chequeo de vida mide cómo estás en cada área (unos 3 minutos). No hace falta hacerlo hoy.</p>' +
      '<button class="btn soft sm" data-a="bvChequeo" style="align-self:flex-start">Hacer el chequeo de vida</button></div></div>';
    return h;
  }

  V.bienvenida = function () {
    var n = Bienvenida.paso(), w = Bienvenida.datos();
    var cuerpo = n === 0 ? paso0(w) : n === 1 ? paso1(w) : n === 2 ? paso2(w) : n === 3 ? plan() : hecho(w);
    var pie;
    if (n < 3) {
      var ok = Bienvenida.respondida();
      // sin respuesta, el mismo botón deja saltar la pregunta
      pie = '<button class="btn ' + (ok ? 'accent' : 'soft') + ' block" data-a="bvNext" data-ok="' + (n === 2 ? 'Ver mi plan' : 'Siguiente') + '">' +
        '<span>' + (ok ? (n === 2 ? 'Ver mi plan' : 'Siguiente') : 'Saltar esta pregunta') + '</span>' + I('arrowRight', 19) + '</button>' +
        '<p class="tiny" style="text-align:center">Lo que respondas se guarda solo. Si sales, puedes seguir luego desde Hoy.</p>';
    } else if (n === 3) {
      pie = '<button class="btn accent block" data-a="bvAceptar">' + I('check', 18) + 'Empezar con este plan</button>' +
        '<button class="btn ghost block" data-a="bvBack">Cambiar mis respuestas</button>';
    } else {
      pie = '<button class="btn accent block" data-a="bvFin">Ir a mi día' + I('arrowRight', 19) + '</button>';
    }
    return barra(n) + '<div class="scroll nonav"><div class="stack lg">' + cuerpo + pie + '</div></div>';
  };

  V.screen('bienvenida', V.bienvenida);
})();
