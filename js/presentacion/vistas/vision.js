/* ==========================================================================
   Pestañas VISIÓN y PROGRESO.
   Cada pantalla responde a una sola pregunta y cabe casi de una vez:
     Visión   → ¿a dónde voy?
     Progreso → ¿estoy avanzando?
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

    /* la visión: una tarjeta destacada; las demás, debajo */
    if (!S.visions.length) {
      h += '<div class="sect"><div class="empty"><span class="ee">' + I('leaf', 30) + '</span>' +
        '<p>Aún no has escrito a dónde quieres llegar. Sin destino no hay forma de saber si avanzas.</p>' +
        '<button class="btn accent sm" data-a="visionAdd">Escribirla ahora</button></div></div>';
    } else {
      h += '<div class="sect">';
      S.visions.forEach(function (v, i) {
        h += '<div class="' + (i ? 'card' : 'vcard') + '">' +
          (i ? '' : '<span class="nx-leaf" aria-hidden="true">' + I('leaf', 150) + '</span><div class="nx-kick">' + I('sparkle', 16) + 'En 5 años</div>') +
          '<textarea class="ta vc-text" data-f="vision" data-id="' + esc(v.id) + '" placeholder="En 5 años quiero…" aria-label="Tu visión a 5 años">' + esc(v.text) + '</textarea>' +
          '<div class="vc-foot"><span class="tiny num">Escrita el ' + esc(Fmt.fmt(v.date)) + '</span>' +
          '<button class="delbtn" data-a="visionDel" data-id="' + esc(v.id) + '" aria-label="Eliminar visión">' + I('trash', 18) + '</button></div></div>';
      });
      h += '<button class="btn ghost sm" data-a="visionAdd" style="align-self:flex-start">' + I('plus', 15) + 'Escribir otra visión</button></div>';
    }

    /* mi yo del futuro: una frase por área, directamente aquí */
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title">' + I('sparkle') + 'Mi Yo del Futuro</span>' +
      '<span class="pill num">' + futureCount() + ' de ' + S.cats.length + '</span></div>' +
      '<p class="muted" style="margin-top:-6px">Una frase por área sobre dónde quieres estar. Toca una para escribirla.</p>' +
      '<div class="fgrid">';
    S.cats.forEach(function (c) {
      var f = S.future[c.id], on = !!(f && f.goal);
      h += '<button class="ftile' + (on ? ' on' : '') + '" data-a="openFuture" data-c="' + esc(c.id) + '" aria-label="' + esc(c.name) + (on ? ': ' + esc(f.goal) : ', sin escribir') + '">' +
        '<span class="gc-ic" style="background:' + esc(c.color) + '22">' + esc(c.emoji) + '</span>' +
        (on ? '<span class="ft-ok" aria-hidden="true">' + I('check', 14) + '</span>' : '') +
        '<span class="ft-name">' + esc(c.name.split(' (')[0]) + '</span>' +
        (on ? '<span class="ft-txt">' + esc(f.goal) + '</span>' : '<span class="ft-txt ft-empty">Sin escribir</span>') + '</button>';
    });
    h += '</div></div>';

    /* para saber por dónde vas */
    var last = Revision.last();
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="label">Para saber por dónde vas</span></div>' +
      '<div class="list">' +
      (last || futureCount() ? row('swap', 'Hoy frente a 5 años', '', 'go', ' data-s="vs"') : '') +
      row('compass', 'Chequeos de vida', last ? 'último ' + Revision.avg(last) + '/10' : 'ninguno', 'sheetRC') +
      '</div></div>';

    return h;
  }

  V.vision = function () {
    var fut = futureCount();
    var sub = !S.visions.length && !fut ? 'Escribe a dónde quieres llegar.'
      : 'Tu norte, escrito. ' + fut + ' de ' + S.cats.length + ' áreas pensadas.';
    var h = V.cabecera({ kicker: 'A dónde voy', titulo: 'Visión', sub: sub, perfil: profileBtn(),
      lado: '<span class="hd-leaf" aria-hidden="true">' + I('leaf', 74) + '</span>' });
    h += '<div class="scroll"><div class="page">' +
      '<div class="seg" role="tablist">' +
      '<button role="tab" aria-selected="' + (ui.subVision === 'five') + '" data-a="subv" data-s="five">A 5 años</button>' +
      '<button role="tab" aria-selected="' + (ui.subVision === 'board') + '" data-a="subv" data-s="board">Tablero</button>' +
      '</div>' + (ui.subVision === 'board' ? board() : visionPage()) + '</div></div>';
    return h;
  };

  /* ============================================================== PROGRESO */
  // Una sola tabla con las metas que más piden atención, cortas y largas juntas.
  function goalTable() {
    var all = [];
    S.goalsS.forEach(function (g) { if (!S.hidden[g.id]) all.push({ g: g, k: 'S' }); });
    S.goalsL.forEach(function (g) { if (!S.hidden[g.id]) all.push({ g: g, k: 'L' }); });
    var rank = { bad: 0, warn: 1, good: 2 };
    all.sort(function (a, b) {
      var d = rank[Goals.state(a.g)] - rank[Goals.state(b.g)];
      return d !== 0 ? d : (a.g.due < b.g.due ? -1 : 1);
    });
    var hiddenN = Goals.all().filter(function (g) { return S.hidden[g.id]; }).length;
    var shown = all.slice(0, 6);

    if (!all.length) {
      return '<div class="empty" style="padding:18px 0"><span class="ee">' + I('target', 30) + '</span>' +
        '<p>' + (Goals.all().length ? 'Todas tus metas están ocultas de esta vista.' : 'Cuando tengas metas, su avance aparecerá aquí.') + '</p>' +
        '<button class="btn soft sm" data-a="goGoals" data-s="S">Ir a Metas</button></div>' +
        (hiddenN ? '<button class="btn ghost xs" data-a="showAll" data-k="all" style="align-self:flex-start">' +
          I('eye', 14) + 'Mostrar las ocultas</button>' : '');
    }

    var h = '<div class="plist">';
    shown.forEach(function (x) {
      var pct = Goals.pct(x.g), st = Goals.state(x.g), d = Fmt.due(x.g.due, x.g.done), c = Areas.get(x.g.cat);
      var col = st === 'good' ? 'good' : st === 'bad' ? 'bad' : 'warn';
      h += '<div class="pcard">' +
        '<span class="gc-ic" style="background:' + (c ? esc(c.color) + '1f' : 'var(--accent-sf)') + '">' + (c ? esc(c.emoji) : I('target', 21)) + '</span>' +
        '<div class="pc-main"><div class="pc-top"><span class="grow"><span class="gname">' + esc(x.g.name || 'Sin nombre') + '</span>' +
        '<span class="pill ' + d.cls + '">' + (d.cls === 'bad' ? I('flame', 13) : '') + esc(d.txt) + '</span></span>' +
        '<span class="pc-pct num" style="color:var(--' + col + ')">' + pct + '<small>%</small></span>' +
        '<button class="delbtn" data-a="hideGoal" data-id="' + esc(x.g.id) + '" aria-label="Ocultar del progreso">' + I('eyeOff', 20) + '</button></div>' +
        '<span class="bar thin"><span style="width:' + pct + '%;background:var(--' + col + ')"></span></span></div></div>';
    });
    h += '</div>';
    if (all.length > 6) {
      h += '<p class="tiny">Y ' + Fmt.plural(all.length - 6, 'meta más', 'metas más') + '.</p>';
    }
    if (hiddenN) {
      h += '<button class="btn ghost xs" data-a="showAll" data-k="all" style="align-self:flex-start">' +
        I('eye', 14) + 'Mostrar ' + Fmt.plural(hiddenN, 'meta oculta', 'metas ocultas') + '</button>';
    }
    return h;
  }

  V.progreso = function () {
    var doneS = S.goalsS.filter(function (g) { return g.done; }).length;
    var pctS = S.goalsS.length ? Math.round(doneS / S.goalsS.length * 100) : 0;
    var st = Routines.streak(), r = Revision.last();
    var wStart = Dates.weekStart(Dates.today());
    var w = Revision.weekStats(wStart), rv = S.reviews[wStart];
    var c = S.challenge, chTxt = 'sin reto';
    if (c) {
      var days = +c.days || 30, doneN = Object.keys(c.done || {}).length;
      chTxt = doneN >= days ? 'completado' : Math.round(doneN / days * 100) + '%';
    }

    var h = V.cabecera({ kicker: '¿Estoy avanzando?', titulo: 'Progreso', perfil: profileBtn(),
      sub: st ? 'Llevas ' + Fmt.plural(st, 'día seguido', 'días seguidos') + ' cumpliendo tus rutinas.' : 'Marca una rutina hoy y tu racha empieza.',
      lado: '<div class="hd-badge" role="img" aria-label="Racha: ' + Fmt.plural(st, 'día', 'días') + '">' + I('flame', 30) + st + '</div>' });
    h += '<div class="scroll"><div class="page">';

    /* 1 — tres números */
    h += '<div class="hstats">' +
      '<div class="hstat"><span class="hn">' + doneS + '<small>/' + S.goalsS.length + '</small></span> <span class="hl">metas cortas logradas</span></div>' +
      '<div class="hstat"><span class="hn">' + w.full + '<small>/' + (w.elapsed || 7) + '</small></span> <span class="hl">días completos esta semana</span></div>' +
      '<div class="hstat"><span class="hn">' + (r ? Revision.avg(r) : '—') + (r ? '<small>/10</small>' : '') + '</span> <span class="hl">' + (r ? 'último chequeo' : 'sin chequeo aún') + '</span></div></div>';

    /* 2 — ¿cómo van mis metas? */
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title">' + I('target') + 'Tus metas</span>' +
      '<button class="btn soft xs" data-a="goGoals" data-s="S">Ver todas</button></div>' +
      goalTable() + '</div>';

    /* 3 — lo que se hace, no lo que se mira */
    function fila(icono, titulo, sub, pill, cls, accion) {
      return '<button class="rcard" data-a="' + accion + '"><span class="plan-ic">' + I(icono, 20) + '</span>' +
        '<span class="rc-txt"><strong>' + titulo + '</strong><span>' + sub + '</span></span>' +
        '<span class="pill ' + cls + '">' + pill + '</span>' + I('right', 18) + '</button>';
    }
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title">' + I('rotate') + 'Cada cierto tiempo</span></div>' +
      '<div class="plist">' +
      fila('rotate', 'Revisión semanal', 'Dos minutos: qué funcionó y tu foco', rv && rv.focus ? 'Hecha' : 'Pendiente', rv && rv.focus ? 'good' : 'accent', 'goReview') +
      fila('zap', 'Reto de 30 días', c ? esc(c.name || 'Tu reto') : 'Elige una cosa y sostenla 30 días', esc(chTxt), c ? 'accent' : '', 'sheetChallenge') +
      fila('trophy', 'Todo lo que has logrado', 'Tu lista de victorias', String(S.wins.length), S.wins.length ? 'good' : '', 'sheetWins') +
      '</div></div>';

    h += '</div></div>';
    return h;
  };

  V.tab({ id: 'vision', label: 'Visión', icon: 'leaf', order: 3, view: V.vision });
  V.tab({ id: 'progreso', label: 'Progreso', icon: 'chart', order: 4, view: V.progreso });
})();
