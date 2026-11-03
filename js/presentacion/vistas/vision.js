/* ==========================================================================
   Pestañas VISIÓN y PROGRESO.
   Cada pantalla responde a una sola pregunta:
     Visión   → ¿qué vida quiero construir?  Una sola página, de lo general a
                lo concreto: la visión escrita, las imágenes y frases que la
                recuerdan, y cómo quieres que sea cada área.
     Progreso → ¿estoy avanzando?   (la racha, la semana, lo que se revisa)
   Lo que es una tarea (revisar la semana, llevar un reto, apuntar un logro)
   no vive aquí: se abre en su propia hoja cuando hace falta.
   ========================================================================== */
(function () {
  'use strict';
  var S = Datos.estado(), ui = UIState, esc = Fmt.esc;

  // Ideas para quien no sabe qué frase escribir. No se añaden solas: se copian
  // en el campo para que la persona las haga suyas antes de guardarlas.
  V.IDEAS_FRASE = [
    'Mi cuerpo es mi casa: lo cuido.',
    'Hago cosas difíciles y me alegro después.',
    'El dinero es libertad, no estatus.',
    'La gente que quiero sabe que la quiero.',
    'Primero lo importante, luego lo urgente.',
    'Descansar también es avanzar.'
  ];

  function profileBtn() {
    return '<button class="iconbtn solid" data-a="tab" data-t="perfil" aria-label="Tu perfil">' +
      (S.profile.photo ? '<img src="' + esc(S.profile.photo) + '" alt="">' : I('user', 19)) + '</button>';
  }
  /* ================================================= IMÁGENES Y FRASES */
  // Cada pieza se toca para editarla (texto, orden, quitar): sin botones encima.
  function board() {
    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title">Imágenes y frases</span></div>';
    var acciones = '<div class="row" style="gap:8px;flex-wrap:wrap">' +
      '<label class="btn soft sm">' + I('image', 16) + 'Añadir imagen<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" id="boardImg" hidden></label>' +
      '<button class="btn ghost sm" data-a="addQuote">' + I('quote', 16) + 'Añadir frase</button></div>';
    if (!S.board.length) {
      return h + '<p class="muted">Una foto del lugar donde quieres vivir, de alguien a quien admiras, de cómo quieres sentirte. ' +
        'Lo que ves cada día se te queda más que una lista.</p>' + acciones + '</div>';
    }
    h += '<div class="board">';
    S.board.forEach(function (t, i) {
      var isImg = t.kind === 'img' && t.src;
      h += '<button class="tile' + (isImg ? ' hasimg' : ' quote') + '" data-a="boardEdit" data-i="' + i + '" aria-label="' +
        esc(isImg ? 'Imagen' + (t.cap ? ': ' + t.cap : '') : 'Frase: ' + (t.cap || 'vacía')) + '. Tocar para editar">' +
        (isImg ? '<img src="' + esc(t.src) + '" alt="">' : '') +
        (t.cap ? '<span class="cap">' + esc(t.cap) + '</span>' : (isImg ? '' : '<span class="cap vacia">Frase vacía</span>')) +
        '</button>';
    });
    return h + '</div>' + acciones + '</div>';
  }

  /* ======================================================= VISIÓN A 5 AÑOS */
  function futureCount() {
    var n = 0;
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) n++; });
    return n;
  }

  /* la visión escrita: el texto manda, sin tarjeta alrededor */
  function visionEscrita() {
    if (!S.visions.length) {
      // lo primero que se ve: qué es esto y cómo empezar, sin dejar a nadie ante una hoja en blanco
      return '<section class="vision-inicio">' +
        '<p class="vi-q">¿Cómo quieres que sea tu vida dentro de 5 años?</p>' +
        '<p class="muted">Escríbelo como si ya fuera verdad. No tiene que quedar perfecto: lo irás ajustando. ' +
        'Te servirá para elegir metas que de verdad te importen.</p>' +
        '<button class="btn accent" data-a="visionAdd" style="align-self:flex-start">' + I('pencil', 16) + 'Empezar a escribir</button>' +
        '<div class="vi-ideas"><span class="label">Si no sabes por dónde empezar</span>' +
        '<ul class="qlist"><li>¿Dónde vives y con quién?</li><li>¿A qué dedicas tus días?</li>' +
        '<li>¿Cómo cuidas de tu cuerpo y de tu cabeza?</li><li>¿Qué has conseguido que hoy te parece lejano?</li></ul></div>' +
        '</section>';
    }
    var h = '<div class="sect">';
    S.visions.forEach(function (v, i) {
      h += '<section class="vision' + (i ? ' otra' : '') + '">' +
        (i ? '' : '<div class="label">Mi vida dentro de 5 años</div>') +
        '<textarea class="vision-t" data-f="vision" data-id="' + esc(v.id) + '" placeholder="En 5 años vivo… paso mis días… me siento…" aria-label="Tu visión a 5 años">' + esc(v.text) + '</textarea>' +
        '<div class="vision-f"><span class="tiny num">Escrita el ' + esc(Fmt.fmt(v.date)) + '</span>' +
        '<button class="delbtn" data-a="visionDel" data-id="' + esc(v.id) + '" aria-label="Eliminar visión">' + I('trash', 17) + '</button></div></section>';
    });
    return h + '<button class="btn ghost xs" data-a="visionAdd" style="align-self:flex-start">' + I('plus', 14) + 'Escribir otra versión</button></div>';
  }

  /* mi yo del futuro: una frase por área, en lista */
  function porAreas() {
    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title">Mi Yo del Futuro</span>' +
      '<span class="tiny num">' + futureCount() + ' de ' + S.cats.length + '</span></div>' +
      '<p class="muted" style="margin-top:-6px">Lo mismo, área por área: una frase sobre cómo quieres que sea cada una. De aquí salen tus metas.</p>' +
      '<div class="tlist">';
    S.cats.forEach(function (c) {
      var f = S.future[c.id], on = !!(f && f.goal);
      h += '<button class="frow" data-a="openFuture" data-c="' + esc(c.id) + '" aria-label="' + esc(c.name) + (on ? ': ' + esc(f.goal) : ', sin escribir') + '">' +
        '<span class="gc-ic">' + esc(c.emoji) + '</span>' +
        '<span class="grow"><span class="frow-n">' + esc(c.name.split(' (')[0]) + '</span>' +
        '<span class="frow-t' + (on ? '' : ' vacio') + '">' + (on ? esc(f.goal) : 'Sin escribir') + '</span></span>' +
        I('right', 16) + '</button>';
    });
    return h + '</div></div>';
  }

  // Una sola página: primero lo escrito (lo que da sentido), luego lo que se ve
  // (lo que lo recuerda) y al final lo concreto por áreas (de donde salen las metas).
  V.vision = function () {
    // vacía, la pregunta de abajo ya explica la página: no hace falta subtítulo
    var h = V.cabecera({ titulo: 'Visión', sub: S.visions.length ? 'La vida que quieres construir, en tus palabras y en imágenes.' : '', perfil: profileBtn() });
    h += '<div class="scroll"><div class="page">' + visionEscrita() + board() + porAreas() + '</div></div>';
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
    // a primeros de semana, la que hay que cerrar es la que acaba de terminar
    var wStart = V.semanaARevisar(), rv = S.reviews[wStart];
    var revSub = wStart === Dates.weekStart(Dates.today()) ? 'Qué funcionó, qué ajustas y tu foco' : 'La semana pasada: qué funcionó y tu foco';
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
      fila('rotate', 'Revisión de la semana', revSub, rv && rv.focus ? 'Hecha' : 'Pendiente', rv && rv.focus ? 'good' : 'accent', 'goReview') +
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
