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
    var h = '<div class="page">';
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
    return h + '</div></div>';
  }

  /* ======================================================= VISIÓN A 5 AÑOS */
  function visionPage() {
    var h = '<div class="page">';

    h += '<div class="sect">' +
      '<div class="sect-head"><span class="label">Tu mejor versión en 5 años</span>' +
      '<button class="btn ghost xs" data-a="visionAdd">' + I('plus', 14) + 'Añadir</button></div>';
    if (!S.visions.length) {
      h += '<div class="empty"><span class="ee">' + I('leaf', 30) + '</span>' +
        '<p>Aún no has escrito a dónde quieres llegar. Sin destino no hay forma de saber si avanzas.</p>' +
        '<button class="btn accent sm" data-a="visionAdd">Escribirla ahora</button></div>';
    } else {
      S.visions.forEach(function (v, i) {
        h += '<div class="card' + (i ? '' : ' raised') + '">' +
          '<textarea class="ta" style="border:0;padding:0;background:transparent;font-size:15.5px" data-f="vision" data-id="' + esc(v.id) + '" placeholder="En 5 años quiero…">' + esc(v.text) + '</textarea>' +
          '<div class="spread" style="margin-top:12px;padding-top:11px;border-top:1px solid var(--line)">' +
          '<span class="tiny num">Escrita el ' + esc(Fmt.fmt(v.date)) + '</span>' +
          '<button class="delbtn" data-a="visionDel" data-id="' + esc(v.id) + '" aria-label="Eliminar visión">' + I('trash', 17) + '</button>' +
          '</div></div>';
      });
    }
    h += '</div>';

    /* todo lo demás, en tres filas */
    var fut = 0;
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) fut++; });
    var last = Revision.last();

    h += '<div class="sect">' +
      '<div class="sect-head"><span class="label">Profundizar</span></div>' +
      '<div class="list">' +
      row('sparkle', 'Mi Yo del Futuro', fut ? Fmt.plural(fut, 'área', 'áreas') : 'sin definir', 'go', ' data-s="future"') +
      (last ? row('swap', 'Hoy frente a 5 años', '', 'go', ' data-s="vs"') : '') +
      row('compass', 'Chequeos de vida',
        last ? 'último ' + Revision.avg(last) + '/10' : 'ninguno', 'sheetRC') +
      '</div></div>';

    return h + '</div>';
  }

  V.vision = function () {
    var h = '<div class="appbar bordered"><div class="appbar-row"><h1>Visión</h1>' + profileBtn() + '</div>' +
      '<div class="seg" role="tablist">' +
      '<button role="tab" aria-selected="' + (ui.subVision === 'five') + '" data-a="subv" data-s="five">A 5 años</button>' +
      '<button role="tab" aria-selected="' + (ui.subVision === 'board') + '" data-a="subv" data-s="board">Tablero</button>' +
      '</div></div>';
    h += '<div class="scroll">' + (ui.subVision === 'board' ? board() : visionPage()) + '</div>';
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

    var h = '<div class="tblwrap"><table class="tbl"><thead><tr>' +
      '<th>Meta</th><th class="r">Avance</th><th class="r" style="width:34px"></th>' +
      '</tr></thead><tbody>';
    shown.forEach(function (x) {
      var pct = Goals.pct(x.g), st = Goals.state(x.g);
      var col = st === 'good' ? 'good' : st === 'bad' ? 'bad' : 'warn';
      h += '<tr><td class="name"><span class="cell" style="font-weight:600">' + esc(x.g.name || 'Sin nombre') + '</span>' +
        '<span class="bar thin" style="margin-top:6px;max-width:190px"><span style="width:' + pct + '%;background:var(--' + col + ')"></span></span></td>' +
        '<td class="r num" style="font-weight:700;color:var(--' + col + ');padding-left:12px">' + pct + '%</td>' +
        '<td class="r"><button class="delbtn" data-a="hideGoal" data-id="' + esc(x.g.id) + '" aria-label="Ocultar del progreso">' + I('eyeOff', 17) + '</button></td></tr>';
    });
    h += '</tbody></table></div>';
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

    var h = '<div class="appbar bordered"><div class="appbar-row"><h1>Progreso</h1>' + profileBtn() + '</div></div>';
    h += '<div class="scroll"><div class="page">';

    /* 1 — ¿estoy siendo constante? */
    h += '<div class="sect" style="gap:14px">' +
      '<span class="label">Constancia</span>' +
      '<div class="kpi"><span class="display">' + st + '</span>' +
      '<span class="unit" style="padding-bottom:6px">' + (st === 1 ? 'día seguido' : 'días seguidos') + '<br>cumpliendo rutinas</span></div>' +
      '<div class="divider"></div>' +
      '<div class="row" style="gap:20px">' +
      Fmt.ring(pctS, 92, 'var(--good)', '<b style="font-size:1.35rem">' + pctS + '%</b>') +
      '<div class="grow"><p class="muted" style="margin-bottom:7px">' +
      (S.goalsS.length === 1 ? 'De tu única meta a corto plazo:' : 'De tus ' + S.goalsS.length + ' metas a corto plazo:') + '</p>' +
      '<p class="tiny num" style="line-height:1.75"><strong style="color:var(--good)">' + doneS + '</strong> completadas · <strong>' +
      (S.goalsS.length - doneS) + '</strong> en marcha</p>' +
      (r ? '<p class="tiny" style="margin-top:6px">Último chequeo: <strong class="num">' + Revision.avg(r) + '/10</strong></p>' : '') +
      '</div></div></div>';

    /* 2 — ¿cómo van mis metas? */
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="label">Tus metas</span>' +
      '<button class="btn ghost xs" data-a="goGoals" data-s="S">Ver todas</button></div>' +
      goalTable() + '</div>';

    /* 3 — lo que se hace, no lo que se mira */
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="label">Cada cierto tiempo</span></div>' +
      '<div class="list">' +
      row('rotate', 'Revisión semanal',
        (rv && rv.focus ? 'hecha' : w.full + ' de ' + (w.elapsed || 7) + ' días'), 'goReview') +
      row('zap', 'Reto de 30 días', chTxt, 'sheetChallenge') +
      row('trophy', 'Todo lo que has logrado', String(S.wins.length), 'sheetWins') +
      '</div></div>';

    h += '</div></div>';
    return h;
  };

  V.tab({ id: 'vision', label: 'Visión', icon: 'leaf', order: 3, view: V.vision });
  V.tab({ id: 'progreso', label: 'Progreso', icon: 'chart', order: 4, view: V.progreso });
})();
