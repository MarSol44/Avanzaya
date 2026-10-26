/* ==========================================================================
   Pestaña HOY — la pantalla de inicio.
   Responde a una sola pregunta: ¿qué hago ahora? Todo lo demás está detrás.
   Aquí se marca la rutina del día, se ve la racha y aparece —como mucho—
   un aviso a la vez sugiriendo el siguiente paso.
   ========================================================================== */
(function () {
  'use strict';
  var S = Datos.estado(), ui = UIState, esc = Fmt.esc;

  function profileBtn() {
    return '<button class="iconbtn solid" data-a="tab" data-t="perfil" aria-label="Tu perfil">' +
      (S.profile.photo ? '<img src="' + esc(S.profile.photo) + '" alt="">' : I('user', 19)) + '</button>';
  }

  /* ------------------------------------------------------------- el aviso */
  // Uno solo, el más útil en este momento. Con X para quitarlo.
  function nudge() {
    var t = Dates.today();
    var used = S.start ? Dates.diff(S.start, t) : 0;

    // Si hoy ya quitaste un aviso, no te ponemos otro en su sitio.
    var keys = Object.keys(S.dismissed);
    for (var i = 0; i < keys.length; i++) if (S.dismissed[keys[i]] === t) return null;

    function off(id, days) {
      var d = S.dismissed[id];
      return d && Dates.diff(d, t) < days;
    }

    if (!S.rc.length && !off('chequeo', 5)) {
      return { id: 'chequeo', icon: 'compass', title: 'Descubre cómo estás hoy',
        body: 'Siete preguntas cortas, unos tres minutos. Al terminar verás qué área de tu vida pide atención.',
        cta: 'Hacer el chequeo', act: 'newRC' };
    }

    var wStart = Dates.weekStart(t);
    var last = Dates.shift(wStart, 6);
    var rv = S.reviews[wStart];
    if (Dates.diff(t, last) <= 1 && (!rv || !rv.focus) && !off('revision', 3)) {
      return { id: 'revision', icon: 'rotate', title: 'Cierra tu semana',
        body: 'Dos minutos: qué funcionó, qué ajustas y tu foco para la semana que viene.',
        cta: 'Revisar la semana', act: 'goReview' };
    }

    if (S.rc.length) {
      var lastRC = S.rc[S.rc.length - 1].date;
      var since = lastRC ? Dates.diff(lastRC, t) : 0;
      if (since >= 60 && !off('rechequeo', 14)) {
        return { id: 'rechequeo', icon: 'compass', title: 'Han pasado ' + since + ' días desde tu último chequeo',
          body: 'Repetirlo te dice si de verdad has avanzado, no solo si te lo parece.',
          cta: 'Hacer otro chequeo', act: 'newRC' };
      }
    }

    if (S.guest && used >= 5 && !off('cuenta', 10)) {
      return { id: 'cuenta', icon: 'lock', title: 'Ponle una contraseña a tus datos',
        body: 'Llevas ' + Fmt.plural(used, 'día', 'días') + ' usando la app. Con una cuenta, hace falta tu contraseña para abrir tus datos desde la app y se sincronizan entre tus dispositivos. (La contraseña no los cifra.)',
        cta: 'Crear cuenta', act: 'go', attr: ' data-s="register"' };
    }

    if (used >= 10 && !S.lastBackup && !off('respaldo', 14)) {
      return { id: 'respaldo', icon: 'save', title: 'Guarda una copia de lo que llevas',
        body: 'Lo que hay en este navegador se pierde si lo borras. Copiar tu respaldo tarda diez segundos.',
        cta: 'Hacer copia', act: 'sheetBackup' };
    }
    return null;
  }

  function nudgeCard() {
    var n = nudge();
    if (!n) return '';
    return '<div class="nudge">' +
      '<span class="nic">' + I(n.icon, 20) + '</span>' +
      '<div class="grow"><strong>' + esc(n.title) + '</strong>' +
      '<p class="tiny" style="margin-top:4px">' + esc(n.body) + '</p>' +
      '<button class="btn accent sm" style="margin-top:11px" data-a="' + n.act + '"' + (n.attr || '') + '>' + esc(n.cta) + '</button></div>' +
      '<button class="delbtn" data-a="dismiss" data-id="' + n.id + '" aria-label="Quitar este aviso">' + I('x', 16) + '</button>' +
      '</div>';
  }

  /* ------------------------------------------------------------- rutinas */
  function routine(kind, label, icon) {
    var t = Dates.today(), log = S.rlog[t] || { day: [], night: [] };
    var list = S.routines[kind] || [], marks = log[kind] || [];
    var open = ui.addRoutine === kind, editing = ui.editRoutine === kind;

    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' + I(icon) + label + '</span>' +
      '<span class="row" style="gap:8px">' +
      (list.length ? '<button class="btn ghost xs" data-a="editRoutine" data-k="' + kind + '">' +
        (editing ? 'Listo' : 'Editar') + '</button>' : '') +
      '<span class="pill num' + (list.length && marks.length >= list.length ? ' good' : '') + '">' +
      marks.length + ' de ' + list.length + '</span></span></div>';

    if (!list.length) {
      h += '<p class="muted">Sin hábitos aquí todavía.</p>';
    } else {
      h += '<div class="list">';
      list.forEach(function (it) {
        var on = marks.indexOf(it.id) >= 0;
        h += '<div class="listrow" style="padding:11px 12px 11px 14px">' +
          '<button class="chk" role="checkbox" aria-checked="' + on + '" data-a="rtoggle" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-label="' + esc(it.name) + '">' + I('check', 15) + '</button>' +
          (editing
            ? '<span class="grow"><input class="inp-plain" data-f="rname" data-k="' + kind + '" data-id="' + esc(it.id) + '" value="' + esc(it.name) + '"></span>' +
              '<button class="delbtn" data-a="rdel" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-label="Eliminar ' + esc(it.name) + '">' + I('trash', 17) + '</button>'
            : '<span class="grow"' + (on ? ' style="color:var(--ink-2);text-decoration:line-through"' : '') + '>' + esc(it.name) + '</span>') +
          '</div>';
      });
      h += '</div>';
    }

    if (open) {
      h += '<div class="row" style="gap:8px"><input class="inp grow" data-add="r' + kind + '" placeholder="Ej. Beber un vaso de agua" autofocus>' +
        '<button class="fab sm" data-a="radd" data-k="' + kind + '" aria-label="Guardar hábito">' + I('check') + '</button></div>';
    } else {
      h += '<button class="btn ghost sm" data-a="openAddRoutine" data-k="' + kind + '" style="align-self:flex-start">' +
        I('plus', 15) + 'Añadir hábito</button>';
    }
    return h + '</div>';
  }

  /* ------------------------------------------------- tareas de hoy y plan */
  var WD = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  // Las reglas de las tareas viven en tasks.js. Esta pantalla solo pinta, así
  // que recibe únicamente la interfaz de consulta (no puede cambiar datos).
  var Tasks = TaskQueries;
  var isDone = Tasks.isDone, goalById = Tasks.goalById, goalsToday = Tasks.goalsForDay;

  function nowHM() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  // Con hora primero y por orden; el resto va aparte, en «Cuando puedas».
  function planRow(e, day, opt) {
    opt = opt || {};
    var open = ui.moveId === e.id, appt = e.kind === 'appt', done = isDone(e);
    var h = '<div class="listrow plan' + (done ? ' is-done' : '') + '">' +
      '<button class="chk" role="checkbox" aria-checked="' + done + '" data-a="evdone" data-day="' + day + '" data-id="' + esc(e.id) + '" aria-label="Marcar «' + esc(e.title) + '» como hecha">' + I('check', 15) + '</button>' +
      '<span class="grow plan-txt">' + esc(e.title) +
      '<span class="plan-meta">' +
      (opt.next ? '<span class="pill accent">Próxima</span>' : '') +
      (opt.showDate ? '<span class="pill bad">' + esc(Fmt.fmt(day)) + '</span>' : '') +
      (e.time ? '<span class="pill num">' + esc(e.time) + '</span>' : '') +
      (appt ? '<span class="pill accent">' + I('calendar', 13) + 'Cita</span>' : '') +
      (e.goalId && goalById(e.goalId) ? '<span class="pill">' + I('target', 13) + 'Meta</span>' : '') +
      '</span></span>' +
      '<button class="iconbtn" data-a="evmove" data-id="' + esc(e.id) + '" aria-expanded="' + open + '" aria-label="Cambiar día u hora">' + I('pencil', 16) + '</button>' +
      '<button class="delbtn" data-a="evdel" data-day="' + day + '" data-id="' + esc(e.id) + '" aria-label="Quitar tarea">' + I('trash', 17) + '</button></div>';
    if (open) {
      var t = Dates.today();
      h += '<div class="plan-move">' +
        '<span class="tiny">Pasar a</span>' +
        (day !== t ? '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + esc(e.id) + '" data-to="' + t + '">Hoy</button>' : '') +
        '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + esc(e.id) + '" data-to="' + Dates.shift(day < t ? t : day, 1) + '">Mañana</button>' +
        '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + esc(e.id) + '" data-to="' + Dates.shift(day < t ? t : day, 7) + '">En 7 días</button>' +
        '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + esc(e.id) + '" data-to="">Sin fecha</button>' +
        '<input class="inp" type="date" data-f="evdate" data-day="' + day + '" data-id="' + esc(e.id) + '" value="' + day + '" aria-label="Otro día">' +
        '<span class="tiny">Hora</span>' +
        '<input class="inp" type="time" data-f="evtime" data-day="' + day + '" data-id="' + esc(e.id) + '" value="' + esc(e.time || '') + '" aria-label="Hora (opcional)">' +
        '</div>';
    }
    return h;
  }

  // Un paso de meta de hoy que aún no es tarea: se muestra en el plan y, al
  // editarlo, se convierte en tarea real (enlazada al paso, sin duplicarse).
  function goalRow(x) {
    var c = Areas.get(x.g.cat);
    if (!x.s) {
      return '<button class="listrow plan" data-a="openGoal" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '">' +
        '<span class="thumb plan-ic">' + (c ? esc(c.emoji) : I('target', 15)) + '</span>' +
        '<span class="grow plan-txt">' + esc(x.g.name || 'Meta sin nombre') +
        '<span class="plan-meta"><span class="pill bad">' + I('flame', 13) + 'Vence hoy</span></span></span>' +
        I('right', 16) + '</button>';
    }
    var done = !!x.s.done, title = (x.g.name || 'Meta') + ' · ' + (x.s.name || 'paso');
    return '<div class="listrow plan' + (done ? ' is-done' : '') + '">' +
      '<button class="chk" role="checkbox" aria-checked="' + done + '" data-a="gsDone" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '" aria-label="Marcar «' + esc(title) + '» como hecha">' + I('check', 15) + '</button>' +
      '<span class="grow plan-txt">' + esc(title) +
      '<span class="plan-meta"><span class="pill">' + I('target', 13) + 'Meta</span></span></span>' +
      '<button class="iconbtn" data-a="gsEdit" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '" aria-label="Cambiar día u hora">' + I('pencil', 16) + '</button></div>';
  }

  function taskList(day, empty, extra) {
    var list = S.events[day] || [], extraRows = extra || [];
    if (!list.length && !extraRows.length) return '<p class="muted">' + empty + '</p>';
    var timed = list.filter(function (e) { return e.time; }).sort(function (x, y) { return x.time < y.time ? -1 : x.time > y.time ? 1 : 0; });
    var loose = list.filter(function (e) { return !e.time; });
    // La siguiente con hora que aún no se ha hecho, solo en el día de hoy.
    var nextId = '';
    if (day === Dates.today()) {
      var now = nowHM(), nx = timed.filter(function (e) { return !isDone(e) && e.time >= now; })[0];
      if (nx) nextId = nx.id;
    }
    var h = '<div class="list">';
    timed.forEach(function (e) { h += planRow(e, day, { next: e.id === nextId }); });
    if (loose.length || extraRows.length) h += '<div class="plan-group">' + (timed.length ? 'Cuando puedas' : 'Sin horario') + '</div>';
    extraRows.forEach(function (x) { h += goalRow(x); });
    loose.forEach(function (e) { h += planRow(e, day); });
    return h + '</div>';
  }


  /* «Plan»: el del día elegido en la tira de la semana (hoy por defecto).
     Primero se añade, luego la lista: lo que más se usa, arriba. */
  function planSection(t, d) {
    var isToday = d === t;
    var evs = S.events[d] || [], gt = goalsToday(d), late = isToday ? Tasks.overdue(t) : [];
    var steps = gt.filter(function (x) { return x.s; });
    var total = evs.length + steps.length;
    var doneN = evs.filter(isDone).length + steps.filter(function (x) { return x.s.done; }).length;
    var kind = ui.ntKind === 'appt' ? 'appt' : 'task';

    var h = '<div class="sect" id="plan">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' + I('list') +
      (isToday ? 'Plan de hoy' : 'Plan · ' + esc(Fmt.cap(Fmt.fmtLong(d)))) + '</span>' +
      (total ? '<span class="pill num' + (doneN === total ? ' good' : '') + '">' + doneN + ' de ' + total + '</span>' : '') + '</div>';
    if (!isToday) {
      h += '<button class="btn ghost xs" data-a="planDay" data-day="' + t + '" style="align-self:flex-start">' + I('left', 14) + 'Volver a hoy</button>';
    }

    /* añadir: título, y junto al «+» el botón con el día y la hora de la nueva tarea */
    var base = d < t ? t : d;
    var ntDay = /^\d{4}-\d\d-\d\d$/.test(ui.ntDate || '') ? ui.ntDate : base;
    var ntWhen = (ntDay === t ? 'Hoy' : ntDay === Dates.shift(t, 1) ? 'Mañana' : Fmt.fmt(ntDay)) + (ui.ntTime ? ' · ' + ui.ntTime : '');
    h += '<div class="plan-add">' +
      '<div class="row" style="gap:8px"><input class="inp grow" data-f="ntTitle" data-add="task" value="' + esc(ui.ntTitle || '') + '" placeholder="Añadir una tarea o cita" aria-label="Nueva tarea" enterkeyhint="done">' +
      '<button class="btn soft sm plan-when" data-a="ntMore" aria-expanded="' + !!ui.ntMore + '" aria-label="Día y hora de la nueva tarea: ' + esc(ntWhen) + '">' +
      I('calendar', 15) + '<span>' + esc(ntWhen) + '</span></button>' +
      '<button class="fab sm" data-a="ntAdd" aria-label="Añadir al plan">' + I('plus') + '</button></div>';
    if (ui.ntMore) {
      h += '<div class="plan-move plan-when-panel">' +
        '<span class="tiny">Día</span>' +
        '<input class="inp" type="date" data-f="ntDate" value="' + esc(ntDay) + '" min="' + t + '" aria-label="Día de la nueva tarea">' +
        '<span class="tiny">Hora</span>' +
        '<input class="inp" type="time" data-f="ntTime" value="' + esc(ui.ntTime || '') + '" aria-label="Hora (opcional)">' +
        '<span class="seg" role="group" aria-label="Tipo">' +
        '<button type="button" data-a="ntKind" data-v="task" aria-pressed="' + (kind === 'task') + '">Tarea</button>' +
        '<button type="button" data-a="ntKind" data-v="appt" aria-pressed="' + (kind === 'appt') + '">Cita</button></span>' +
        '<button class="btn accent xs" data-a="ntMore">Guardar</button></div>';
    }
    h += '</div>';

    if (late.length) {
      h += '<div class="list"><div class="plan-group spread">Atrasadas' +
        '<button class="btn ghost xs" data-a="overdueAll">Pasar todas a hoy</button></div>';
      late.slice(0, 5).forEach(function (x) { h += planRow(x.e, x.day, { showDate: true }); });
      if (late.length > 5) h += '<p class="tiny" style="padding:6px 14px 10px">Y ' + (late.length - 5) + ' más.</p>';
      h += '</div>';
    }

    h += taskList(d, isToday ? 'Nada planeado para hoy. Escribe arriba lo primero que quieras hacer.' : 'Nada planeado para este día.', gt);

    if (S.todo.length) {
      h += '<div class="list"><div class="plan-group">Pendientes sin fecha</div>';
      S.todo.forEach(function (x) {
        h += '<div class="listrow plan">' +
          '<span class="grow plan-txt">' + esc(x.title) +
          '<span class="plan-meta">' +
            (x.kind === 'appt' ? '<span class="pill accent">' + I('calendar', 13) + 'Cita</span>' : '') +
            (x.goalId && goalById(x.goalId) ? '<span class="pill">' + I('target', 13) + 'Meta</span>' : '') + '</span></span>' +
          '<button class="btn soft xs" data-a="todoPull" data-id="' + esc(x.id) + '">' + I('plus', 13) + (base === t ? 'A hoy' : 'A este día') + '</button>' +
          '<button class="delbtn" data-a="tododel" data-id="' + esc(x.id) + '" aria-label="Quitar pendiente">' + I('trash', 17) + '</button></div>';
      });
      h += '</div>';
    }
    return h + '</div>';
  }

  /* metas que vencen pronto */
  function soonSection() {
    var soon = Goals.upcoming(3);
    if (!soon.length) return '';
    var h = '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' + I('target') + 'Vence pronto</span>' +
      '<button class="btn ghost xs" data-a="tab" data-t="metas">Ver todas</button></div>' +
      '<div class="list">';
    soon.forEach(function (x) {
      var d = Fmt.due(x.g.due, false), c = Areas.get(x.g.cat);
      h += '<button class="listrow" data-a="openGoal" data-k="' + x.kind + '" data-id="' + esc(x.g.id) + '">' +
        '<span class="thumb" style="width:34px;height:34px;border-radius:10px;font-size:16px;background:' +
        (c ? esc(c.color) + '1f' : 'color-mix(in srgb,var(--ink) 6%,transparent)') + '">' + (c ? esc(c.emoji) : I('target', 17)) + '</span>' +
        '<span class="grow" style="font-size:14px">' + esc(x.g.name || 'Meta sin nombre') + '</span>' +
        '<span class="pill ' + d.cls + '">' + (d.cls === 'bad' ? I('flame', 13) : '') + esc(d.txt) + '</span></button>';
    });
    return h + '</div></div>';
  }

  /* la semana en una tira: tocar un día cambia el plan de abajo a ese día */
  function weekStrip(t, d) {
    var days = Dates.weekDays(Dates.weekStart(d));
    var h = '<div class="wstrip" role="group" aria-label="Elige un día para ver su plan">' +
      '<button class="iconbtn" data-a="planWeek" data-v="-7" aria-label="Semana anterior">' + I('left', 17) + '</button>';
    days.forEach(function (k) {
      var pend = (S.events[k] || []).filter(function (e) { return !isDone(e); }).length;
      h += '<button class="wday" data-a="planDay" data-day="' + k + '" aria-pressed="' + (k === d) + '"' + (k === t ? ' data-today="1"' : '') +
        ' aria-label="' + esc(Fmt.cap(Fmt.fmtLong(k))) + (pend ? ', ' + pend + ' pendientes' : '') + '">' +
        '<span class="wd">' + WD[Dates.parseK(k).getDay()] + '</span><span class="wn">' + +k.slice(8) + '</span>' +
        '<span class="wdot">' + (pend ? pend : '') + '</span></button>';
    });
    return h + '<button class="iconbtn" data-a="planWeek" data-v="7" aria-label="Semana siguiente">' + I('right', 17) + '</button></div>';
  }

  /* --------------------------------------------------------------- la vista */
  V.hoy = function () {
    var t = Dates.today(), st = Routines.streak();
    var tot = Routines.dayTotals(t);
    var name = (S.account && S.account.name) ? S.account.name.split(' ')[0] : '';
    var hora = new Date().getHours();
    var saludo = hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

    // el día que se está mirando en la tira (hoy, si no se ha elegido otro)
    var d = ui.planDay;
    if (!d || !/^\d{4}-\d\d-\d\d$/.test(d)) d = ui.planDay = t;

    // lo que queda por hacer hoy
    var evs = S.events[t] || [];
    var steps = goalsToday(t).filter(function (x) { return x.s; });
    var pend = evs.filter(function (e) { return !isDone(e); }).length + steps.filter(function (x) { return !x.s.done; }).length;

    // Una frase motivadora por día en lugar del saludo. Sale de la fecha, así que
    // no cambia al repintar la pantalla y recorre toda la lista antes de repetir.
    var F = window.FRASES || [];
    var dayN = Math.round(Dates.parseK(t).getTime() / 864e5);
    var titulo = F.length ? '<h1 class="frase">' + esc(F[((dayN % F.length) + F.length) % F.length]) + '</h1>'
      : '<h1>' + esc(saludo) + (name ? ', ' + esc(name) : '') + '</h1>';

    var h = '<div class="appbar"><div class="appbar-row">' +
      titulo + profileBtn() + '</div>' +
      '<span class="sub">' + (name && F.length ? 'Hola, ' + esc(name) + ' · ' : '') +
      esc(Fmt.cap(Fmt.fmtLong(t))) + '</span></div>';

    h += '<div class="scroll"><div class="page">';

    /* 1. el día de un vistazo: pendientes, hábitos y racha */
    var allDone = tot.total && tot.done >= tot.total;
    h += '<div class="hstats">' +
      '<div class="hstat"><span class="hn">' + pend + '</span> <span class="hl">' + (pend === 1 ? 'pendiente' : 'pendientes') + '</span></div>' +
      '<button class="hstat' + (allDone ? ' good' : '') + '" data-a="goRoutines" aria-label="Hábitos de hoy: ' + tot.done + ' de ' + tot.total + '. Ir a las rutinas">' +
      '<span class="hn">' + tot.done + '<small>/' + tot.total + '</small></span> <span class="hl">hábitos</span></button>' +
      '<div class="hstat"><span class="hn">' + (st > 0 ? I('flame', 18) : '') + st + '</span> <span class="hl">' +
      (st > 0 ? (st === 1 ? 'día de racha' : 'días de racha') : 'empieza tu racha') + '</span></div>' +
      '</div>';

    /* 2. la semana y el plan del día elegido */
    h += '<div class="sect" style="gap:10px">' + weekStrip(t, d) + '</div>';
    h += planSection(t, d);

    /* 3. rutinas, plegables bajo un solo encabezado; dentro, la de día a la
          vista y la de noche plegada hasta las 18:00 */
    if (ui.routinesClosed === undefined) {
      ui.routinesClosed = !!Preferencias.get('rutinas.cerradas', false);   // admite el '1'/'0' antiguo
    }
    var rOpen = !ui.routinesClosed;
    h += '<div class="sect" id="rutinas"><button class="fold-head" data-a="toggleRoutines" aria-expanded="' + rOpen + '">' +
      '<span class="sect-title" style="font-size:1.05rem">' + I('sunrise') + 'Rutinas</span>' +
      '<span class="row" style="gap:8px"><span class="pill num' + (allDone ? ' good' : '') + '">' + tot.done + ' de ' + tot.total + '</span>' +
      I(rOpen ? 'down' : 'right', 18) + '</span></button></div>';
    if (rOpen) {
      h += routine('day', 'Rutina de día', 'sunrise');
      var nightList = S.routines.night || [], nightMarks = (S.rlog[t] || { night: [] }).night || [];
      if (hora >= 18 || ui.nightOpen) {
        h += routine('night', 'Rutina de noche', 'moon');
      } else {
        h += '<div class="sect"><button class="btn ghost block" data-a="toggleNight" style="justify-content:space-between">' +
          '<span class="row" style="gap:8px">' + I('moon', 17) + 'Rutina de noche</span>' +
          '<span class="pill num">' + nightMarks.length + ' de ' + nightList.length + '</span></button></div>';
      }
    }

    /* 4. la nota del día */
    var note = S.notes[t] || '';
    h += '<div class="sect">' +
      '<div class="sect-head"><span class="sect-title" style="font-size:1.05rem">' + I('note') + 'Nota de hoy</span></div>';
    if (note || ui.noteOpen) {
      h += '<textarea class="ta" data-f="note" placeholder="¿Qué te acercó hoy a donde quieres llegar, y qué te alejó?">' + esc(note) + '</textarea>';
    } else {
      h += '<button class="btn soft block" data-a="openNote" style="justify-content:flex-start;color:var(--ink-2);font-weight:500">' +
        I('pencil', 17) + 'Escribir cómo ha ido el día</button>';
    }
    h += '</div>';

    /* 5. lo secundario, al final: metas que vencen pronto y avisos de la app */
    h += soonSection();
    h += nudgeCard();

    h += '</div></div>';
    return h;
  };

  // la pestaña lleva cuántas tareas quedan hoy, para verlo desde cualquier pantalla
  V.tab({ id: 'hoy', label: 'Hoy', icon: 'sunrise', order: 1, view: V.hoy, badge: function () { return Tasks.pending(Dates.today()); } });
})();
