/* ==========================================================================
   Pestaña METAS — las metas de corto y largo plazo (con su buscador, filtros
   y lista) y sus fechas: pasos programados, hitos y fechas límite.
   ========================================================================== */
(function () {
  'use strict';
  var S = Datos.estado(), ui = UIState, esc = Fmt.esc;

  function profileBtn() {
    return '<button class="iconbtn solid" data-a="tab" data-t="perfil" aria-label="Perfil">' +
      (S.profile.photo ? '<img src="' + esc(S.profile.photo) + '" alt="">' : I('user', 19)) + '</button>';
  }

  /* ---------------------------------------------------------------- fechas */
  // Las fechas de las metas, y solo eso: pasos programados, hitos y fechas
  // límite, de lo atrasado a lo que viene. El día a día (tareas, hábitos, nota)
  // vive en Hoy; aquí no se repite. Cada paso se completa o se reprograma aquí
  // mismo (cambiar la fecha es lo mismo que hacerlo dentro de la meta).
  function fechas() {
    var t = Dates.today(), porDia = {}, sinFecha = [];
    function poner(dia, item) { (porDia[dia] = porDia[dia] || []).push(item); }
    [['S', S.goalsS], ['L', S.goalsL]].forEach(function (x) {
      x[1].forEach(function (g) {
        if (g.done) return;
        var pend = 0;
        (g.steps || []).forEach(function (s) {
          if (s.done || (x[0] === 'L' && s.promoted)) return;   // un paso convertido va con su meta corta
          if (s.due) poner(s.due, { k: x[0], g: g, s: s }); else pend++;
        });
        if (g.due) poner(g.due, { k: x[0], g: g, s: null });
        if (pend) sinFecha.push({ k: x[0], g: g, n: pend });
      });
    });

    var dias = Object.keys(porDia).sort();
    var h = '<div class="sect"><p class="muted" style="margin-top:-4px">Cuándo toca cada paso y cada fecha importante de tus metas. Lo de cada día está en Hoy.</p></div>';
    if (!dias.length) {
      h += '<div class="empty"><span class="ee">' + I('calendar', 30) + '</span><p>Aún no hay pasos con fecha. Programa los pasos de tus metas y aparecerán aquí, y en Hoy el día que toquen.</p></div>';
    }
    dias.forEach(function (dia) {
      var atras = dia < t;
      var titulo = atras ? 'Atrasado · ' + Fmt.cuando(dia) : dia === t ? 'Hoy' : Fmt.fmtLong(dia);
      h += '<div class="sect" style="gap:8px"><div class="tl-head' + (atras ? ' bad' : '') + '">' + I(atras ? 'clock' : 'calendar', 14) + esc(Fmt.cap(titulo)) + '</div><div class="tlist">';
      porDia[dia].forEach(function (x) {
        var c = Areas.get(x.g.cat), ic = c ? esc(c.emoji) : I('target', 15);
        if (!x.s) {
          h += '<button class="trow trow-btn" data-a="openGoal" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '">' +
            '<span class="trow-ic">' + I('flag', 16) + '</span><span class="trow-body"><span class="trow-t">Fecha límite de «' + esc(x.g.name || 'Meta sin nombre') + '»</span>' +
            '<span class="trow-m"><span>' + ic + ' ' + (x.k === 'S' ? 'Corto plazo' : 'Largo plazo') + '</span></span></span>' + I('right', 16) + '</button>';
          return;
        }
        h += '<div class="trow"><button class="chk round" role="checkbox" aria-checked="false" data-a="gsDone" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '" aria-label="Marcar «' + esc(x.s.name || 'Paso') + '» como hecho">' + I('check', 14) + '</button>' +
          '<button class="trow-body" data-a="openGoal" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" aria-label="Abrir la meta «' + esc(x.g.name || 'Meta') + '»">' +
          '<span class="trow-t">' + esc(x.s.name || 'Paso') + '</span><span class="trow-m">' +
          (x.s.hito ? '<span class="hito">' + I('flag', 12) + 'Hito</span>' : '') + '<span>' + ic + ' ' + esc(x.g.name || 'Meta') + '</span></span></button>' +
          '<input class="inp-plain fecha" type="date" data-f="sdue" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '" value="' + esc(x.s.due) + '" aria-label="Reprogramar «' + esc(x.s.name || 'Paso') + '»"></div>';
      });
      h += '</div></div>';
    });

    if (sinFecha.length) {
      h += '<div class="sect" style="gap:8px"><div class="tl-head">' + I('note', 14) + 'Pasos sin fecha</div><div class="tlist">' +
        sinFecha.map(function (x) {
          var c = Areas.get(x.g.cat);
          return '<button class="trow trow-btn" data-a="programarMeta" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '">' +
            '<span class="trow-ic">' + (c ? esc(c.emoji) : I('target', 16)) + '</span>' +
            '<span class="trow-body"><span class="trow-t">' + esc(x.g.name || 'Meta sin nombre') + '</span>' +
            '<span class="trow-m"><span>' + Fmt.plural(x.n, 'paso sin fecha', 'pasos sin fecha') + '</span></span></span>' +
            '<span class="tiny">Programar</span>' + I('right', 16) + '</button>';
        }).join('') + '</div></div>';
    }
    return h;
  }

  /* ------------------------------------------------------------ fila de meta */
  // Una meta en una línea: área, nombre, cuándo vence y cuántos pasos lleva.
  // El círculo de la derecha la da por conseguida.
  function goalCard(g, kind) {
    var pct = Goals.pct(g), d = Fmt.due(g.due, g.done), c = Areas.get(g.cat);
    var steps = g.steps || [], stepsDone = steps.filter(function (s) { return s.done; }).length;
    var meta = [c ? esc(c.name.split(' (')[0]) : '', '<span class="' + (d.cls === 'bad' ? 'bad' : '') + '">' + esc(d.txt) + '</span>',
      g.priority === 'Alta' && !g.done ? 'Prioridad alta' : ''].filter(Boolean).join(' · ');
    return '<div class="gcard' + (g.done ? ' done' : '') + '">' +
      '<button class="gc-body" data-a="openGoal" data-k="' + kind + '" data-id="' + esc(g.id) + '" aria-label="Abrir la meta «' + esc(g.name || 'Meta sin nombre') + '»">' +
      '<span class="gc-ic">' + (c ? esc(c.emoji) : I('target', 18)) + '</span>' +
      '<span class="gc-col">' +
      '<span class="gname">' + esc(g.name || 'Meta sin nombre') + '</span>' +
      '<span class="gc-meta">' + meta + '</span>' +
      (steps.length
        ? '<span class="gc-bar"><span class="bar thin"><span style="width:' + pct + '%"></span></span>' +
          '<span class="gc-steps num">' + stepsDone + ' de ' + steps.length + (steps.length === 1 ? ' paso' : ' pasos') + '</span></span>'
        : (g.done ? '' : '<span class="gc-steps">Sin pasos todavía</span>')) +
      '</span></button>' +
      '<button class="chk round" role="checkbox" aria-checked="' + !!g.done + '" data-a="gdone" data-k="' + kind + '" data-id="' + esc(g.id) + '" aria-label="Marcar «' + esc(g.name || 'meta') + '» como conseguida">' + I('check', 14) + '</button>' +
      '</div>';
  }

  function matches(g) {
    var q = (ui.goalQ || '').trim().toLowerCase();
    if (q && (g.name || '').toLowerCase().indexOf(q) < 0 && (g.motivation || '').toLowerCase().indexOf(q) < 0) return false;
    var f = ui.goalFilter;
    if (f === 'late') return !g.done && g.due && Dates.diff(Dates.today(), g.due) < 0;
    if (f === 'week') return !g.done && g.due && Dates.diff(Dates.today(), g.due) >= 0 && Dates.diff(Dates.today(), g.due) <= 7;
    if (f === 'alta') return g.priority === 'Alta';
    if (f === 'done') return !!g.done;
    return true;
  }

  function goalSection(kind, title, sub, icon) {
    var all = kind === 'S' ? S.goalsS : S.goalsL;
    // primero lo que importa: en marcha antes que conseguidas, por prioridad y por
    // fecha (la más cercana arriba); a igualdad, como se crearon
    var PRIO = { Alta: 0, Media: 1, Baja: 2 };
    var list = all.filter(matches).map(function (g, i) { return { g: g, i: i }; }).sort(function (a, b) {
      return (a.g.done - b.g.done) || ((PRIO[a.g.priority] === undefined ? 1 : PRIO[a.g.priority]) - (PRIO[b.g.priority] === undefined ? 1 : PRIO[b.g.priority])) ||
        ((a.g.due || '9999') < (b.g.due || '9999') ? -1 : (a.g.due || '9999') > (b.g.due || '9999') ? 1 : 0) || (a.i - b.i);
    }).map(function (x) { return x.g; });
    var doneN = all.filter(function (g) { return g.done; }).length;

    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title">' + title + '</span>' +
      '<button class="btn ghost xs" data-a="newGoal" data-k="' + kind + '" aria-label="Añadir meta a ' + title + '">' + I('plus', 15) + 'Nueva</button></div>' +
      '<p class="muted" style="margin-top:-6px">' + sub + (all.length && doneN ? ' ' + doneN + ' de ' + all.length + ' conseguidas.' : '') + '</p>';
    // muchas metas cortas a la vez: no se prohíbe, se ayuda a elegir (las «Alta» van arriba y a Hoy)
    var abiertas = all.filter(function (g) { return !g.done; });
    if (kind === 'S' && abiertas.length > 3) {
      var altas = abiertas.filter(function (g) { return g.priority === 'Alta'; }).length;
      h += '<p class="notice">Tienes ' + abiertas.length + ' metas en marcha. Con tantas a la vez es difícil que alguna avance: ' +
        (altas && altas <= 3 ? 'tus ' + (altas === 1 ? 'prioridad alta va primero' : altas + ' de prioridad alta van primero') + ' aquí y en Hoy.'
          : 'elige las dos o tres de este mes y ponles prioridad alta; irán primero aquí y en Hoy.') + '</p>';
    }

    if (!list.length) {
      h += '<div class="empty"><span class="ee">' + I(icon, 30) + '</span><p>' +
        (all.length
          ? (ui.goalQ.trim() ? 'Ninguna meta contiene «' + esc(ui.goalQ.trim()) + '».' : 'Ninguna meta encaja con ese filtro.')
          : (kind === 'S'
            ? 'Empieza con tres como máximo: más de tres suele significar ninguna.'
            : 'Aún no tienes metas a largo plazo. Piensa en algo que quieras lograr en unos años.')) +
        '</p>' +
        (all.length ? '' : '<div class="chips" style="justify-content:center;margin-top:6px">' +
          (kind === 'S'
            ? [['Correr 5 km seguidos', 'c5'], ['Leer un libro al mes', 'c7'], ['Ahorrar mi primer mes de gastos', 'c4']]
            : [['Comprar mi casa', 'c4'], ['Hablar inglés con soltura', 'c1'], ['Correr una maratón', 'c5']]
          ).map(function (sug) {
            return '<button class="chipbtn" data-a="suggest" data-k="' + kind + '" data-v="' + esc(sug[0]) + '" data-c="' + sug[1] + '">' +
              I('plus', 13) + esc(sug[0]) + '</button>';
          }).join('') + '</div>') +
        '</div>';
    } else {
      h += '<div class="tlist">';
      list.forEach(function (g) { h += goalCard(g, kind); });
      h += '</div>';
    }
    return h + '</div>';
  }

  /* ------------------------------------------------------------- la pestaña */
  V.metas = function () {
    var all = S.goalsS.concat(S.goalsL), today = Dates.today();
    var open = all.filter(function (g) { return !g.done; });
    var late = open.filter(function (g) { return g.due && Dates.diff(today, g.due) < 0; }).length;
    var week = open.filter(function (g) { return g.due && Dates.diff(today, g.due) >= 0 && Dates.diff(today, g.due) <= 7; }).length;
    var sub = !all.length ? 'Aún no tienes metas. Empieza por una pequeña.'
      : Fmt.plural(open.length, 'en marcha', 'en marcha') + (week ? ' · ' + Fmt.plural(week, 'vence esta semana', 'vencen esta semana') : '') +
        (late ? ' · ' + Fmt.plural(late, 'atrasada', 'atrasadas') : '');

    var h = V.cabecera({ titulo: 'Metas', sub: sub, perfil: profileBtn() });

    h += '<div class="scroll"><div class="page">';
    h += '<div class="seg" role="tablist">' +
      '<button role="tab" aria-selected="' + (ui.subMetas === 'goals') + '" data-a="sub" data-s="goals">Mis metas</button>' +
      '<button role="tab" aria-selected="' + (ui.subMetas === 'cal') + '" data-a="sub" data-s="cal">Fechas</button></div>';

    if (ui.subMetas === 'cal') {
      h += fechas();
    } else if (all.length > 6 || ui.goalQ || ui.goalFilter) {
      // buscar y filtrar solo cuando hay bastantes metas como para necesitarlo
      h += '<div class="sect" style="gap:11px">' +
        '<div class="row" style="background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:0 13px;gap:9px">' +
        '<span style="color:var(--ink-3)">' + I('search', 18) + '</span>' +
        '<input class="inp-plain grow" style="padding:11px 0" id="goalSearch" data-f="goalQ" value="' + esc(ui.goalQ) + '" placeholder="Buscar entre tus metas" aria-label="Buscar metas">' +
        (ui.goalQ ? '<button class="delbtn" data-a="clearQ" aria-label="Limpiar búsqueda">' + I('x', 16) + '</button>' : '') +
        '</div>' +
        '<div class="chips">' +
        [['', 'Todas'], ['late', 'Atrasadas'], ['week', 'Esta semana'], ['alta', 'Prioridad alta'], ['done', 'Completadas']]
          .map(function (f) {
            return '<button class="chipbtn" data-a="filter" data-v="' + f[0] + '" aria-pressed="' + (ui.goalFilter === f[0]) + '">' + f[1] + '</button>';
          }).join('') +
        '</div></div>';
    }
    if (ui.subMetas !== 'cal') {
      h += goalSection('S', 'Corto plazo', 'Lo que quieres conseguir en menos de un año.', 'zap');
      h += goalSection('L', 'Largo plazo', 'Más de un año. Sus pasos con fecha salen en Hoy ese día.', 'mountain');
    }

    h += '</div></div>';
    return h;
  };

  V.goalCard = goalCard;

  V.tab({ id: 'metas', label: 'Metas', icon: 'target', order: 2, view: V.metas });
})();
