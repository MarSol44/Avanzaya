/* ==========================================================================
   Pestaña METAS — calendario con rutinas y notas, y las metas de corto
   y largo plazo con su buscador, filtros y lista.
   ========================================================================== */
(function () {
  'use strict';
  var S = Datos.estado(), ui = UIState, esc = Fmt.esc;

  var DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var DOW_SUN = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  function profileBtn() {
    return '<button class="iconbtn solid" data-a="tab" data-t="perfil" aria-label="Perfil">' +
      (S.profile.photo ? '<img src="' + esc(S.profile.photo) + '" alt="">' : I('user', 19)) + '</button>';
  }

  /* ------------------------------------------------------------- calendario */
  function calendar() {
    var ym = ui.calMonth, y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    var first = new Date(y, m - 1, 1), t = Dates.today();
    var ws = S.profile.weekStart === 0 ? 0 : 1;
    var offset = (first.getDay() - ws + 7) % 7;
    var total = new Date(y, m, 0).getDate();
    var label = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    var h = '<div class="sect">' +
      '<div class="sect-head">' +
      '<span class="sect-title" style="font-size:1.05rem">' + esc(Fmt.cap(label)) + '</span>' +
      '<span class="row" style="gap:0">' +
      '<button class="iconbtn" data-a="cal" data-d="-1" aria-label="Mes anterior">' + I('left') + '</button>' +
      '<button class="iconbtn" data-a="calToday" aria-label="Ir a hoy">' + I('pin', 18) + '</button>' +
      '<button class="iconbtn" data-a="cal" data-d="1" aria-label="Mes siguiente">' + I('right') + '</button></span></div>';

    h += '<div class="cal">';
    (ws === 0 ? DOW_SUN : DOW).forEach(function (d) { h += '<span class="dow">' + d + '</span>'; });
    for (var i = 0; i < offset; i++) h += '<span class="pad"></span>';
    for (var d2 = 1; d2 <= total; d2++) {
      var k = y + '-' + String(m).padStart(2, '0') + '-' + String(d2).padStart(2, '0');
      var st = Routines.dayStatus(k), ev = (S.events[k] || []).length;
      var cls = [st, k === t ? 'today' : '', k === ui.selDay ? 'sel' : ''].filter(Boolean).join(' ');
      h += '<button data-a="pickDay" data-day="' + k + '" class="' + cls + '" aria-label="' + esc(Fmt.fmt(k)) + '">' + d2 +
        (ev ? '<span class="ev"></span>' : '') + '</button>';
    }
    h += '</div>';

    h += '<div class="callegend">' +
      '<span><i style="background:var(--good)"></i>Día completo</span>' +
      '<span><i style="background:var(--warn)"></i>A medias</span>' +
      '<span><i style="background:color-mix(in srgb,var(--ink) 14%,transparent)"></i>Sin marcar</span>' +
      '<span><i style="background:var(--accent)"></i>Con tareas</span></div>';
    return h + '</div>';
  }

  // Un solo panel para el día que se toca en el calendario: tareas, rutinas
  // y nota. Si el día elegido es hoy, se remite a la pestaña Hoy en vez de
  // repetir aquí lo mismo.
  function dayPanel() {
    var k = ui.selDay, evs = S.events[k] || [], tot = Routines.dayTotals(k);
    var isToday = k === Dates.today();
    var note = S.notes[k] || '', futuro = k > Dates.today();

    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' +
      esc(Fmt.cap(Fmt.fmtLong(k))) + '</span>' +
      '<span class="pill num ' + (tot.total && tot.done >= tot.total ? 'good' : tot.done ? 'warn' : '') + '">' +
      tot.done + ' de ' + tot.total + '</span></div>';

    if (isToday) {
      h += '<button class="btn soft block" data-a="tab" data-t="hoy" style="justify-content:flex-start">' +
        I('sunrise', 18) + 'Marcar la rutina de hoy</button>';
    } else {
      h += '<div class="list">';
      ['day', 'night'].forEach(function (kind) {
        var log = S.rlog[k] || { day: [], night: [] }, marks = log[kind] || [];
        (S.routines[kind] || []).forEach(function (it) {
          var on = marks.indexOf(it.id) >= 0;
          if (!on && !Routines.dueOn(kind, k).some(function (x) { return x.id === it.id; })) return;   // ese día no tocaba
          h += '<div class="listrow" style="padding:10px 14px">' +
            (futuro ? '' : '<button class="chk" role="checkbox" aria-checked="' + on + '" data-a="rtoggle" data-day="' + k + '" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-label="' + esc(it.name) + '">' + I('check', 15) + '</button>') +
            '<span class="grow"' + (on ? ' style="color:var(--ink-2);text-decoration:line-through"' : '') + '>' + esc(it.name) + '</span>' +
            I(kind === 'day' ? 'sunrise' : 'moon', 16) + '</div>';
        });
      });
      h += '</div>';
      if (futuro) h += '<p class="tiny">Este día aún no ha llegado: los hábitos se marcan cuando toque.</p>';
    }

    if (evs.length) {
      h += '<div class="list">';
      evs.forEach(function (e) {
        h += '<div class="listrow" style="padding:10px 10px 10px 14px">' +
          '<span class="catdot" style="background:var(--accent)"></span>' +
          '<span class="grow" style="font-size:13.5px">' + esc(e.title) + '</span>' +
          '<button class="delbtn" data-a="evdel" data-day="' + k + '" data-id="' + esc(e.id) + '" aria-label="Quitar tarea">' + I('trash', 17) + '</button></div>';
      });
      h += '</div>';
    }

    if (note || ui.noteOpen) {
      h += '<textarea class="ta" data-f="note" data-day="' + k + '" placeholder="Nota de este día">' + esc(note) + '</textarea>';
    } else {
      h += '<button class="btn ghost sm" data-a="openNote" style="align-self:flex-start">' +
        I('pencil', 15) + (isToday ? 'Escribir la nota de hoy' : 'Escribir una nota de este día') + '</button>';
    }
    return h + '</div>';
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
      '<button role="tab" aria-selected="' + (ui.subMetas === 'cal') + '" data-a="sub" data-s="cal">Calendario</button></div>';

    if (ui.subMetas === 'cal') {
      h += calendar();
      h += dayPanel();
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
      h += goalSection('L', 'Largo plazo', 'Más de un año. Sus pasos con fecha cercana pasan solos a corto plazo.', 'mountain');
    }

    h += '</div></div>';
    return h;
  };

  V.goalCard = goalCard;

  V.tab({ id: 'metas', label: 'Metas', icon: 'target', order: 2, view: V.metas });
})();
