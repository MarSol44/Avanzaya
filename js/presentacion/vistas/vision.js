/* ==========================================================================
   Pestañas VISIÓN y PROGRESO.
   Cada pantalla responde a una sola pregunta y cabe casi de una vez:
     Visión   → ¿a dónde voy?   (reflexiva: texto grande, poco adorno)
     Progreso → ¿estoy avanzando?   (la racha, la semana, lo que se revisa)
   Lo que es una tarea (revisar la semana, llevar un reto, apuntar un logro)
   no vive aquí: se abre en su propia hoja cuando hace falta.
   ========================================================================== */
(function () {
  'use strict';
  var S = Datos.estado(), ui = UIState, esc = Fmt.esc;

  var PLANTILLAS = [
    'Mi cuerpo es mi casa: lo cuido.',
    'Hago cosas difíciles y me alegro después.',
    'El dinero es libertad, no estatus.',
    'La gente que quiero sabe que la quiero.',
    'Primero lo importante, luego lo urgente.',
    'Descansar también es avanzar.'
  ];
  V.PLANTILLAS = PLANTILLAS;

  function profileBtn() {
    return '<button class="iconbtn solid" data-a="tab" data-t="perfil" aria-label="Tu perfil">' +
      (S.profile.photo ? '<img src="' + esc(S.profile.photo) + '" alt="">' : I('user', 19)) + '</button>';
  }
  function row(icon, title, value, action, extra) {
    return '<button class="listrow" data-a="' + action + '"' + (extra || '') + '>' +
      I(icon, 19) + '<span class="grow">' + title + '</span>' +
      (value ? '<span class="tiny num" style="flex:none">' + value + '</span>' : '') +
      I('right', 17) + '</button>';
  }

  /* ========================================================= TABLERO VISIÓN */
  function board() {
    var h = '';
    h += '<div class="sect">' +
      '<div class="chips">' +
      '<label class="btn soft sm">' + I('image', 17) + 'Imagen<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" id="boardImg" style="display:none"></label>' +
      '<button class="btn soft sm" data-a="addQuote">' + I('quote', 17) + 'Frase</button>' +
      '<button class="btn ghost sm" data-a="plantillas">' + I('sparkle', 17) + 'Plantillas</button>' +
      '</div>';

    if (!S.board.length) {
      h += '<div class="empty"><span class="ee">' + I('image', 30) + '</span>' +
        '<p>Sube fotos de lo que quieres construir y añade frases que te recuerden por qué.</p></div>';
    } else {
      h += '<div class="board">';
      S.board.forEach(function (t, i) {
        var isImg = t.kind === 'img' && t.src;
        h += '<div class="tile' + (isImg ? ' hasimg' : ' quote') + '">' +
          (isImg ? '<img src="' + esc(t.src) + '" alt="' + esc(t.cap || 'Imagen del tablero') + '">' : '') +
          '<span class="acts">' +
          (i > 0 ? '<button data-a="boardMove" data-i="' + i + '" data-d="-1" aria-label="Mover antes">' + I('up', 15) + '</button>' : '') +
          (i < S.board.length - 1 ? '<button data-a="boardMove" data-i="' + i + '" data-d="1" aria-label="Mover después">' + I('down', 15) + '</button>' : '') +
          '<button data-a="boardEdit" data-i="' + i + '" aria-label="Editar texto">' + I('pencil', 15) + '</button>' +
          '<button data-a="boardDel" data-i="' + i + '" aria-label="Eliminar">' + I('trash', 15) + '</button>' +
          '</span>' +
          (t.cap ? '<span class="cap">' + esc(t.cap) + '</span>' : (isImg ? '' : '<span class="cap tiny">Sin texto</span>')) +
          '</div>';
      });
      h += '</div>';
    }
    return h + '</div>';
  }

  /* ======================================================= VISIÓN A 5 AÑOS */
  function futureCount() {
    var n = 0;
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) n++; });
    return n;
  }

  function visionPage() {
    var h = '';

    /* la visión: el texto manda, sin tarjeta alrededor */
    if (!S.visions.length) {
      h += '<div class="sect"><div class="empty"><span class="ee">' + I('leaf', 30) + '</span>' +
        '<p>Aún no has escrito a dónde quieres llegar. Sin destino no hay forma de saber si avanzas.</p>' +
        '<button class="btn accent sm" data-a="visionAdd">Escribirla ahora</button></div></div>';
    } else {
      h += '<div class="sect">';
      S.visions.forEach(function (v, i) {
        h += '<section class="vision' + (i ? ' otra' : '') + '">' +
          (i ? '' : '<div class="label">Mi vida dentro de 5 años</div>') +
          '<textarea class="vision-t" data-f="vision" data-id="' + esc(v.id) + '" placeholder="En 5 años quiero…" aria-label="Tu visión a 5 años">' + esc(v.text) + '</textarea>' +
          '<div class="vision-f"><span class="tiny num">Escrita el ' + esc(Fmt.fmt(v.date)) + '</span>' +
          '<button class="delbtn" data-a="visionDel" data-id="' + esc(v.id) + '" aria-label="Eliminar visión">' + I('trash', 17) + '</button></div></section>';
      });
      h += '<button class="btn ghost xs" data-a="visionAdd" style="align-self:flex-start">' + I('plus', 14) + 'Escribir otra visión</button></div>';
    }

    /* mi yo del futuro: una frase por área, en lista */
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title">Mi Yo del Futuro</span>' +
      '<span class="tiny num">' + futureCount() + ' de ' + S.cats.length + '</span></div>' +
      '<p class="muted" style="margin-top:-6px">Una frase por área sobre dónde quieres estar.</p>' +
      '<div class="tlist">';
    S.cats.forEach(function (c) {
      var f = S.future[c.id], on = !!(f && f.goal);
      h += '<button class="frow" data-a="openFuture" data-c="' + esc(c.id) + '" aria-label="' + esc(c.name) + (on ? ': ' + esc(f.goal) : ', sin escribir') + '">' +
        '<span class="gc-ic">' + esc(c.emoji) + '</span>' +
        '<span class="grow"><span class="frow-n">' + esc(c.name.split(' (')[0]) + '</span>' +
        '<span class="frow-t' + (on ? '' : ' vacio') + '">' + (on ? esc(f.goal) : 'Sin escribir') + '</span></span>' +
        I('right', 16) + '</button>';
    });
    h += '</div></div>';

    /* comparar dónde estás con dónde quieres estar */
    if (Revision.last() || futureCount()) {
      h += '<div class="list">' + row('swap', 'Hoy frente a dentro de 5 años', '', 'go', ' data-s="vs"') + '</div>';
    }
    return h;
  }

  // Una frase para pensar, distinta cada día: va aquí, en la parte reflexiva de
  // la app, no en Hoy, que es para hacer.
  function fraseDelDia() {
    var F = window.FRASES || [];
    if (!F.length) return '';
    var n = Math.round(Dates.parseK(Dates.today()).getTime() / 864e5);
    return F[((n % F.length) + F.length) % F.length];
  }

  V.vision = function () {
    var frase = fraseDelDia();
    var h = V.cabecera({ titulo: 'Visión', sub: frase || 'A dónde quieres llegar.', cita: !!frase, perfil: profileBtn() });
    h += '<div class="scroll"><div class="page">' +
      '<div class="seg" role="tablist">' +
      '<button role="tab" aria-selected="' + (ui.subVision === 'five') + '" data-a="subv" data-s="five">A 5 años</button>' +
      '<button role="tab" aria-selected="' + (ui.subVision === 'board') + '" data-a="subv" data-s="board">Tablero</button>' +
      '</div>' + (ui.subVision === 'board' ? board() : visionPage()) + '</div></div>';
    return h;
  };

  /* ============================================================== PROGRESO */
  // Hábitos marcados frente a los que tocaban, en los días de esta semana que ya pasaron.
  function semanaHabitos() {
    var t = Dates.today(), hechos = 0, tocaban = 0;
    Dates.weekDays(Dates.weekStart(t)).forEach(function (d) {
      if (d > t) return;
      var x = Routines.dayTotals(d); hechos += x.done; tocaban += x.total;
    });
    return { hechos: hechos, tocaban: tocaban };
  }
  function haceDias(fecha) {
    var n = Dates.diff(fecha, Dates.today());
    return n <= 0 ? 'hoy' : n === 1 ? 'ayer' : 'hace ' + n + ' días';
  }

  V.progreso = function () {
    var doneS = S.goalsS.filter(function (g) { return g.done; }).length;
    var st = Routines.streak(), r = Revision.last(), sem = semanaHabitos();
    var wStart = Dates.weekStart(Dates.today()), rv = S.reviews[wStart];
    var c = S.challenge, chTxt = 'Sin empezar';
    if (c) {
      var days = +c.days || 30, doneN = Object.keys(c.done || {}).length;
      chTxt = doneN >= days ? 'Completado' : doneN + ' de ' + days + ' días';
    }

    var h = V.cabecera({ titulo: 'Progreso', perfil: profileBtn(),
      sub: st ? 'Llevas ' + Fmt.plural(st, 'día', 'días') + ' marcando algún hábito. Un día suelto sin marcar no rompe la racha.'
        : 'Marca un hábito hoy y empieza tu racha.' });
    h += '<div class="scroll"><div class="page">';

    /* tres cifras, cada una en un solo sitio de la app */
    h += '<div class="stats">' +
      '<div class="stat"><b class="num">' + st + '</b><span>' + (st === 1 ? 'día de racha' : 'días de racha') + '</span></div>' +
      '<div class="stat"><b class="num">' + sem.hechos + '<small>/' + sem.tocaban + '</small></b><span>hábitos esta semana</span></div>' +
      '<div class="stat"><b class="num">' + doneS + '<small>/' + S.goalsS.length + '</small></b><span>metas cortas conseguidas</span></div></div>';

    /* lo que se revisa cada cierto tiempo */
    function fila(icono, titulo, sub, valor, cls, accion) {
      return '<button class="listrow rrow" data-a="' + accion + '">' + I(icono, 19) +
        '<span class="rc-txt"><strong>' + titulo + '</strong><span class="rc-sub">' + sub + '</span></span>' +
        '<span class="rc-val ' + cls + '">' + valor + '</span>' + I('right', 16) + '</button>';
    }
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title">Para mirar atrás</span></div>' +
      '<div class="list">' +
      fila('rotate', 'Revisión de la semana', 'Qué funcionó, qué ajustas y tu foco', rv && rv.focus ? 'Hecha' : 'Pendiente', rv && rv.focus ? 'good' : 'accent', 'goReview') +
      fila('compass', 'Chequeo de vida', r ? 'Último, ' + haceDias(r.date) : 'Cómo estás en cada área de tu vida', r ? Revision.avg(r) + '/10' : 'Hacerlo', r ? '' : 'accent', 'sheetRC') +
      fila('zap', 'Reto de 30 días', c ? esc(c.name || 'Tu reto') : 'Elige una cosa y sostenla un mes', esc(chTxt), '', 'sheetChallenge') +
      fila('trophy', 'Lo que has logrado', 'Tu lista de victorias', String(S.wins.length), '', 'sheetWins') +
      '</div></div>';

    if (S.goalsS.length + S.goalsL.length) {
      h += '<button class="btn ghost sm" data-a="goGoals" data-s="S" style="align-self:flex-start">Ver cómo van tus metas' + I('right', 15) + '</button>';
    }

    h += '</div></div>';
    return h;
  };

  V.tab({ id: 'vision', label: 'Visión', icon: 'leaf', order: 3, view: V.vision });
  V.tab({ id: 'progreso', label: 'Progreso', icon: 'chart', order: 4, view: V.progreso });
})();
