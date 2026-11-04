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
    // las áreas importantes (elegidas al empezar o en Perfil) van primero, con estrella
    var clave = S.profile.areasClave || [];
    S.cats.slice().sort(function (a, b) {
      var x = clave.indexOf(a.id), y = clave.indexOf(b.id);
      return (x < 0 ? 9 : x) - (y < 0 ? 9 : y);
    }).forEach(function (c) {
      var f = S.future[c.id], on = !!(f && f.goal), esClave = clave.indexOf(c.id) >= 0;
      // cuántas metas en marcha empujan hacia esta área (se ven al abrirla)
      var nm = S.goalsS.concat(S.goalsL).filter(function (g) { return g.cat === c.id && !g.done; }).length;
      h += '<button class="frow" data-a="openFuture" data-c="' + esc(c.id) + '" aria-label="' + esc(c.name) + (esClave ? ' (importante)' : '') + (on ? ': ' + esc(f.goal) : ', sin escribir') + (nm ? ', ' + Fmt.plural(nm, 'meta', 'metas') : '') + '">' +
        '<span class="gc-ic">' + esc(c.emoji) + '</span>' +
        '<span class="grow"><span class="frow-n">' + esc(c.name.split(' (')[0]) + (nm ? ' · ' + Fmt.plural(nm, 'meta', 'metas') : '') +
        (esClave ? '<span class="clave" aria-hidden="true">' + I('star', 12) + '</span>' : '') + '</span>' +
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
  // Hábitos de esta semana: lo diario día a día, lo semanal por su cuota (Hábitos v2).
  function semanaHabitos() { return Routines.semana(Dates.weekStart(Dates.today())); }
  function haceDias(fecha) {
    var n = Dates.diff(fecha, Dates.today());
    return n <= 0 ? 'hoy' : n === 1 ? 'ayer' : 'hace ' + n + ' días';
  }

  /* el avance real de las metas en marcha: las que más importan, con su siguiente paso */
  function metasEnMarcha() {
    var PRIO = { Alta: 0, Media: 1, Baja: 2 };
    var abiertas = S.goalsS.map(function (g) { return { g: g, k: 'S' }; }).concat(S.goalsL.map(function (g) { return { g: g, k: 'L' }; }))
      .filter(function (x) { return !x.g.done; })
      .sort(function (a, b) {
        return (a.k === b.k ? 0 : a.k === 'S' ? -1 : 1) || ((PRIO[a.g.priority] === undefined ? 1 : PRIO[a.g.priority]) - (PRIO[b.g.priority] === undefined ? 1 : PRIO[b.g.priority])) ||
          ((a.g.due || '9999') < (b.g.due || '9999') ? -1 : 1);
      });
    if (!abiertas.length) return '';
    var h = '<div class="sect"><div class="sect-head"><span class="sect-title">Tus metas</span>' +
      '<button class="btn ghost xs" data-a="goGoals">Ver todas</button></div><div class="tlist">';
    abiertas.slice(0, 3).forEach(function (x) {
      var g = x.g, c = Areas.get(g.cat), steps = (g.steps || []).filter(function (s) { return !(x.k === 'L' && s.promoted); });
      var hechos = steps.filter(function (s) { return s.done; }).length, sig = steps.filter(function (s) { return !s.done; })[0];
      h += '<button class="trow trow-btn" data-a="openGoal" data-k="' + x.k + '" data-id="' + esc(g.id) + '">' +
        '<span class="trow-ic">' + (c ? esc(c.emoji) : I('target', 16)) + '</span>' +
        '<span class="trow-body"><span class="trow-t">' + esc(g.name || 'Meta sin nombre') + '</span>' +
        (steps.length ? '<span class="gc-bar"><span class="bar thin"><span style="width:' + Math.round(hechos / steps.length * 100) + '%"></span></span>' +
          '<span class="gc-steps num">' + hechos + ' de ' + steps.length + '</span></span>' : '') +
        '<span class="trow-m"><span>' + (sig ? 'Siguiente: ' + esc(sig.name || 'paso') : steps.length ? 'Todos los pasos hechos' : 'Sin pasos todavía') + '</span></span>' +
        '</span>' + I('right', 16) + '</button>';
    });
    return h + '</div></div>';
  }

  /* el mes de hábitos: cada día, completo, a medias o sin marcar. Tocar un día lo abre en Hoy */
  var DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'], DOW_SUN = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  function mesHabitos() {
    if (!S.routines.day.length && !S.routines.night.length) return '';
    var ym = ui.calMonth, y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    var first = new Date(y, m - 1, 1), t = Dates.today();
    var ws = S.profile.weekStart === 0 ? 0 : 1;
    var offset = (first.getDay() - ws + 7) % 7, total = new Date(y, m, 0).getDate();
    var label = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    var h = '<div class="sect"><div class="sect-head">' +
      '<span class="sect-title">Tus hábitos · ' + esc(label) + '</span>' +
      '<span class="row" style="gap:0">' +
      '<button class="iconbtn" data-a="cal" data-d="-1" aria-label="Mes anterior">' + I('left') + '</button>' +
      '<button class="iconbtn" data-a="calToday" aria-label="Este mes">' + I('pin', 18) + '</button>' +
      '<button class="iconbtn" data-a="cal" data-d="1" aria-label="Mes siguiente">' + I('right') + '</button></span></div>';
    h += '<div class="cal">';
    (ws === 0 ? DOW_SUN : DOW).forEach(function (d) { h += '<span class="dow">' + d + '</span>'; });
    for (var i = 0; i < offset; i++) h += '<span class="pad"></span>';
    for (var d2 = 1; d2 <= total; d2++) {
      var k = y + '-' + String(m).padStart(2, '0') + '-' + String(d2).padStart(2, '0');
      var cls = [Routines.dayStatus(k), k === t ? 'today' : ''].filter(Boolean).join(' ');
      h += '<button data-a="pickDay" data-day="' + k + '" class="' + cls + '" aria-label="' + esc(Fmt.cap(Fmt.fmtLong(k))) + '"' + (k > t ? ' disabled' : '') + '>' + d2 + '</button>';
    }
    h += '</div><div class="callegend">' +
      '<span><i style="background:var(--good)"></i>Todos</span>' +
      '<span><i style="background:var(--warn)"></i>Algunos</span>' +
      '<span><i style="background:color-mix(in srgb,var(--ink) 14%,transparent)"></i>Ninguno</span></div>' +
      '<p class="tiny">Toca un día para verlo en Hoy y marcar lo que se quedó sin marcar.</p>';
    return h + '</div>';
  }

  /* logros: solo lo que los datos permiten afirmar. Metas conseguidas e hitos
     alcanzados (con su fecha si se guardó; lo de antes no la tiene y no se inventa)
     y lo que la persona apunta a mano */
  V.logros = function () {
    var out = [];
    [['S', S.goalsS], ['L', S.goalsL]].forEach(function (x) {
      x[1].forEach(function (g) {
        if (g.done) out.push({ tipo: 'meta', texto: g.name || 'Meta sin nombre', fecha: g.doneAt || '' });
        (g.steps || []).forEach(function (s) { if (s.hito && s.done) out.push({ tipo: 'hito', texto: s.name || 'Hito', meta: g.name, fecha: s.doneAt || '' }); });
      });
    });
    return out.sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; });
  };

  V.progreso = function () {
    var st = Routines.streak(), r = Revision.last(), sem = semanaHabitos();
    // a primeros de semana, la que hay que cerrar es la que acaba de terminar
    var wStart = V.semanaARevisar(), rv = S.reviews[wStart];
    var revSub = wStart === Dates.weekStart(Dates.today()) ? 'Qué funcionó, qué ajustas y tu foco' : 'La semana pasada: qué funcionó y tu foco';
    // el reto en curso (un hábito con reto): cómo va, o invitación a empezar uno
    var retoAct = V.retos().filter(function (x) { return x.it.reto.estado === 'activo'; })[0], chTxt = 'Empezar', chSub = 'Una cosa, un tiempo concreto';
    if (retoAct) {
      var rr = Routines.reto(retoAct.k, retoAct.it, Dates.today());
      chSub = esc(retoAct.it.name);
      chTxt = !rr.empezado ? 'Empieza ' + Fmt.cuando(retoAct.it.reto.inicio) : rr.terminado ? 'Terminado' : 'Día ' + rr.dia + ' de ' + rr.dias;
    }

    var h = V.cabecera({ titulo: 'Progreso', perfil: profileBtn(),
      sub: st ? 'Llevas ' + Fmt.plural(st, 'día', 'días') + ' marcando algún hábito. Un día suelto sin marcar no rompe la racha.'
        : 'Marca un hábito hoy y empieza tu racha.' });
    h += '<div class="scroll"><div class="page">';

    /* tres cifras, cada una en un solo sitio de la app. La tercera es lo hecho
       esta semana (tareas y pasos de metas): las metas conseguidas ya se cuentan en
       Metas, y un «0 de 5» cada semana no dice nada de lo que se avanzó */
    var hechas = Revision.weekStats(Dates.weekStart(Dates.today())).done;
    h += '<div class="stats">' +
      '<div class="stat"><b class="num">' + st + '</b><span>' + (st === 1 ? 'día de racha' : 'días de racha') + '</span></div>' +
      '<div class="stat"><b class="num">' + sem.hechos + '<small>/' + sem.tocaban + '</small></b><span>hábitos esta semana</span></div>' +
      '<div class="stat"><b class="num">' + hechas + '</b><span>' + (hechas === 1 ? 'tarea o paso hecho' : 'tareas y pasos hechos') + ' esta semana</span></div></div>';

    /* lo primero, el avance real: metas y hábitos */
    h += metasEnMarcha() + mesHabitos();

    /* lo que se revisa cada cierto tiempo; los logros, como algo secundario */
    var logros = V.logros(), nLogros = logros.length + S.wins.length;
    var ultimo = logros[0] && logros[0].fecha ? logros[0] : null;
    S.wins.forEach(function (w) { if (!ultimo || (w.date || '') > ultimo.fecha) ultimo = { texto: w.text, fecha: w.date || '' }; });
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
      fila('zap', 'Retos', chSub, esc(chTxt), retoAct ? '' : 'accent', 'sheetChallenge') +
      fila('trophy', 'Lo que has logrado', ultimo ? 'Lo último: ' + esc(ultimo.texto) : 'Metas conseguidas, hitos y lo que tú apuntes', String(nLogros), '', 'sheetWins') +
      '</div></div>';

    h += '</div></div>';
    return h;
  };

  V.tab({ id: 'vision', label: 'Visión', icon: 'leaf', order: 3, view: V.vision });
  V.tab({ id: 'progreso', label: 'Progreso', icon: 'chart', order: 4, view: V.progreso });
})();
