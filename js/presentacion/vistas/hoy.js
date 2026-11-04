/* ==========================================================================
   Pestaña HOY — la pantalla de inicio.
   Responde a una sola pregunta: ¿qué tengo que hacer hoy? Arriba, lo
   siguiente; debajo, una sola lista con todo lo del día (atrasado, con hora,
   cuando puedas, sin fecha); después las rutinas y la nota. La racha y las
   cifras viven en Progreso: aquí solo se ve cuánto queda del día.
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

    // Cerrar la semana va primero: solo tiene su momento el fin de semana y los
    // dos primeros días de la siguiente; el chequeo puede esperar.
    // De noche no: a esas horas toca cerrar el día, no pedir una reflexión; vuelve por la mañana.
    var wStart = Dates.weekStart(t), wRev = V.semanaARevisar(), h = new Date().getHours();
    var rv = S.reviews[wRev];
    if (h >= 6 && h < 21 && (wRev !== wStart || Dates.diff(t, Dates.shift(wStart, 6)) <= 1) && (!rv || !rv.focus) && !off('revision', 3)) {
      return { id: 'revision', icon: 'rotate', title: wRev === wStart ? 'Cierra tu semana' : 'Cierra la semana pasada',
        body: 'Dos minutos: qué funcionó, qué ajustas y tu foco para la semana que viene.',
        cta: 'Revisar la semana', act: 'goReview' };
    }

    if (!S.rc.length && !off('chequeo', 5)) {
      return { id: 'chequeo', icon: 'compass', title: 'Descubre cómo estás hoy',
        body: 'Ocho pantallas cortas, unos tres minutos. Al terminar verás qué área de tu vida pide atención.',
        cta: 'Hacer el chequeo', act: 'newRC' };
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

    // con la cuenta en la nube los datos ya están a salvo: no se pide copia
    if (used >= 10 && !S.lastBackup && !Nube.sync().conectada() && !off('respaldo', 14)) {
      return { id: 'respaldo', icon: 'save', title: 'Guarda una copia de lo que llevas',
        body: 'Lo que hay en este navegador se pierde si lo borras. Copiar tu respaldo tarda diez segundos.',
        cta: 'Hacer copia', act: 'sheetBackup' };
    }
    return null;
  }

  // revision: true → solo el aviso de cerrar la semana (va arriba, es su momento);
  // false → cualquier otro (va al final, es secundario).
  function nudgeCard(revision) {
    var n = nudge();
    if (!n || (n.id === 'revision') !== revision) return '';
    return '<div class="aviso">' +
      '<span class="nic">' + I(n.icon, 20) + '</span>' +
      '<div class="grow"><strong>' + esc(n.title) + '</strong>' +
      '<p class="tiny" style="margin-top:4px">' + esc(n.body) + '</p>' +
      '<button class="btn accent sm" style="margin-top:11px" data-a="' + n.act + '"' + (n.attr || '') + '>' + esc(n.cta) + '</button></div>' +
      '<button class="delbtn" data-a="dismiss" data-id="' + n.id + '" aria-label="Quitar este aviso">' + I('x', 16) + '</button>' +
      '</div>';
  }

  /* ------------------------------------------------------------- rutinas */
  // Editando un hábito: en qué días toca, y ponerlo en pausa.
  // Editando un hábito: con qué frecuencia (y qué días, o cuántas veces), y su reto.
  function habitOpts(kind, it) {
    var attrs = 'data-k="' + kind + '" data-id="' + esc(it.id) + '"';
    var t = it.freq ? it.freq.t : it.days ? 'dias' : 'diaria';
    var h = '<div class="hab-opts">' +
      '<select class="inp hab-freq" data-f="rfreq" ' + attrs + ' aria-label="Frecuencia de «' + esc(it.name) + '»">' +
      [['diaria', 'Cada día'], ['dias', 'Días concretos'], ['semana', 'Veces por semana'], ['mes', 'Veces al mes'], ['libre', 'Sin frecuencia fija']].map(function (o) {
        return '<option value="' + o[0] + '"' + (o[0] === t ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select>';
    if (t === 'dias') h += V.diasSemana('Días de «' + it.name + '»', 'data-a="rDia" ' + attrs, function (d) { return it.days.indexOf(d) >= 0; });
    if (t === 'semana' || t === 'mes') {
      h += '<label class="row tiny" style="gap:6px">' +
        '<input class="inp hab-n num" type="number" min="1" max="' + (t === 'semana' ? 7 : 31) + '" data-f="rfreqN" ' + attrs + ' value="' + it.freq.n + '" aria-label="Veces">' +
        (t === 'semana' ? 'veces por semana' : 'veces al mes') + '</label>';
    }
    if (it.reto) {
      var r = Routines.reto(kind, it, Dates.today());
      h += '<span class="tiny">' + I('zap', 12) + ' Reto de ' + r.dias + ' días desde el ' + esc(Fmt.fmt(it.reto.inicio)) +
        (it.reto.estado === 'continuar' ? ' · superado, sigue como hábito' : it.reto.estado === 'terminado' ? ' · terminado' : '') + '</span>';
    }
    return h + '</div>';
  }

  // Días de descanso: no toca ningún hábito y la racha no se resiente.
  // Es un ajuste, así que vive en «Editar», no a la vista cada día.
  function descanso(t) {
    var r = S.rest, hoy = !!r.dates[t];
    return '<div class="descanso"><span class="sub-title">' + I('moon', 15) + 'Días de descanso</span>' +
      '<p class="tiny">Esos días no toca ningún hábito y tu racha sigue igual.</p>' +
      V.diasSemana('Descanso cada semana', 'data-a="restDia"', function (d) { return r.week.indexOf(d) >= 0; }) +
      '<button class="btn ghost xs" data-a="restHoy" style="align-self:flex-start">' + (hoy ? 'Quitar el descanso de hoy' : 'Descansar solo hoy') + '</button></div>';
  }

  // En un día flojo, las palabras de la propia persona: el «por qué» que escribió
  // en Mi Yo del Futuro («lo que te vas a decir el día que te dé pereza») o una de
  // sus frases de Visión. Cambia cada día; si no escribió nada, no sale nada.
  function recuerdo(t) {
    var frases = [];
    S.cats.forEach(function (c) { var f = S.future[c.id]; if (f && String(f.why || '').trim()) frases.push(String(f.why).trim()); });
    S.board.forEach(function (x) { if (x.kind === 'quote' && String(x.cap || '').trim()) frases.push(String(x.cap).trim()); });
    if (!frases.length) return '';
    var fr = frases[Math.abs(Dates.diff(S.start || t, t)) % frases.length];
    return '<div class="recuerdo"><p>«' + esc(fr) + '»</p><span class="tiny">Tus palabras, de Visión</span></div>';
  }

  // Ideas para empezar: nadie empieza con hábitos que no ha elegido.
  var SUGERENCIAS = {
    day: ['Mover el cuerpo 20 min', 'Leer 10 páginas', 'Beber un vaso de agua'],
    night: ['Repasar el día', 'Dejar el móvil fuera', 'Preparar lo de mañana']
  };

  // Lo que se dice bajo el nombre: la cuota de un hábito flexible o el día del reto.
  function detalleHabito(kind, it, t) {
    var r = Routines.reto(kind, it, t);
    if (r && r.estado === 'activo' && r.empezado && !r.terminado) return 'Reto · día ' + r.dia + ' de ' + r.dias;
    var q = Routines.cuota(kind, it, t);
    if (q && q.meta) return q.hechos + ' de ' + q.meta + (q.t === 'semana' ? ' esta semana' : ' este mes') + (q.cumplida ? ' · hecho' : '');
    if (it.freq && it.freq.t === 'libre') return 'Sin frecuencia fija';
    return '';
  }
  // Un reto que acaba de terminar pregunta qué hacer: seguir como hábito o terminarlo.
  function retoTerminado(kind, it, t) {
    var r = Routines.reto(kind, it, t);
    if (!r || !r.terminado || r.estado !== 'activo') return '';
    var ids = 'data-k="' + kind + '" data-id="' + esc(it.id) + '"';
    return '<div class="plan-move reto-fin"><span class="tiny grow">Reto terminado: ' + r.hechos + ' de ' + r.dias + ' días. ¿Lo sigues como hábito?</span>' +
      '<button class="btn soft xs" data-a="retoSeguir" ' + ids + '>Seguir</button>' +
      '<button class="btn ghost xs" data-a="retoTerminar" ' + ids + '>Terminar</button></div>';
  }

  // Las filas de una rutina. Editando: todas, con nombre, frecuencia y pausa.
  function filasHabitos(kind, t, editing) {
    var marks = (S.rlog[t] || {})[kind] || [];
    var lista = editing ? (S.routines[kind] || []) : Routines.visibleOn(kind, t);
    return lista.map(function (it) {
      var on = marks.indexOf(it.id) >= 0, clase = Routines.clase(it, t), det = editing ? '' : detalleHabito(kind, it, t);
      var h = '<div class="trow' + (on && !editing ? ' is-done' : '') + '">' +
        (editing && clase === 'no' ? '<span class="trow-ic" title="Hoy no toca">' + I('sleep', 15) + '</span>'
          : '<button class="chk" role="checkbox" aria-checked="' + on + '" data-a="rtoggle" data-day="' + t + '" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-label="' + esc(it.name) + (det ? ', ' + esc(det) : '') + '">' + I('check', 15) + '</button>') +
        (editing
          ? '<input class="inp-plain grow" data-f="rname" data-k="' + kind + '" data-id="' + esc(it.id) + '" value="' + esc(it.name) + '" aria-label="Nombre del hábito">' +
            '<button class="delbtn' + (it.paused ? ' on' : '') + '" data-a="rPausa" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-pressed="' + !!it.paused + '" aria-label="' + (it.paused ? 'Reanudar' : 'Pausar') + ' «' + esc(it.name) + '»" title="' + (it.paused ? 'Reanudar' : 'Pausar') + '">' + I(it.paused ? 'play' : 'pause', 16) + '</button>' +
            '<button class="delbtn" data-a="rdel" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-label="Eliminar ' + esc(it.name) + '">' + I('trash', 17) + '</button>'
          : '<span class="trow-body" style="cursor:default"><span class="trow-t">' + esc(it.name) + '</span>' + (det ? '<span class="trow-m"><span>' + esc(det) + '</span></span>' : '') + '</span>') +
        '</div>';
      if (editing) h += habitOpts(kind, it);
      else h += retoTerminado(kind, it, t);
      return h;
    }).join('');
  }

  // La última fila: añadir. Abierta, un solo campo con «Día / Noche» y el botón dentro.
  function filaAnadir(hora) {
    var k = ui.addRoutine;
    if (!k) {
      return '<button class="trow trow-btn add" data-a="openAddRoutine" data-k="' + (hora >= 18 || hora < 6 ? 'night' : 'day') + '">' +
        '<span class="trow-ic">' + I('plus', 16) + '</span><span class="trow-t">Añadir hábito</span></button>';
    }
    return '<div class="trow"><div class="addbar flat">' +
      '<input class="addbar-inp" data-add="r' + k + '" value="' + esc(ui.rTexto || '') + '" placeholder="Nuevo hábito" aria-label="Nuevo hábito" enterkeyhint="done">' +
      '<span class="seg mini" role="group" aria-label="¿De día o de noche?">' +
      '<button type="button" data-a="openAddRoutine" data-k="day" aria-pressed="' + (k === 'day') + '">Día</button>' +
      '<button type="button" data-a="openAddRoutine" data-k="night" aria-pressed="' + (k === 'night') + '">Noche</button></span>' +
      '<button class="addbar-go" data-a="radd" data-k="' + k + '" aria-label="Guardar hábito">' + I('plus', 18) + '</button></div></div>';
  }

  /* Rutinas: una sola lista. De día arriba; de noche debajo, plegada de 6:00 a
     18:00; al final, añadir. Días, pausa y descanso se ajustan en «Editar». */
  function rutinas(t, hora) {
    var tot = Routines.dayTotals(t), editing = !!ui.editRoutine;
    var nDia = S.routines.day.length, nNoche = S.routines.night.length;
    if (ui.routinesClosed === undefined) ui.routinesClosed = !!Preferencias.get('rutinas.cerradas', false);   // admite el '1'/'0' antiguo
    var rOpen = !ui.routinesClosed, allDone = tot.total && tot.done >= tot.total;

    var h = '<div class="sect" id="rutinas"><div class="sect-head">' +
      '<button class="fold-head" data-a="toggleRoutines" aria-expanded="' + rOpen + '"><span class="sect-title">Rutinas</span>' +
      '<span class="row" style="gap:8px">' + (tot.total ? '<span class="tiny num' + (allDone ? ' ok' : '') + '">' + tot.done + ' de ' + tot.total + '</span>' : '') +
      I(rOpen ? 'down' : 'right', 18) + '</span></button>' +
      (rOpen && nDia + nNoche ? '<button class="btn ghost xs" data-a="editRoutine">' + (editing ? 'Listo' : 'Editar') + '</button>' : '') + '</div>';
    if (!rOpen) return h + '</div>';

    // Ideas para empezar: siguen a mano hasta tener tres hábitos (sin repetir los ya puestos).
    var nombres = S.routines.day.concat(S.routines.night).map(function (it) { return it.name; });
    var ideas = SUGERENCIAS.day.concat(SUGERENCIAS.night.slice(0, 1)).map(function (n, i) { return { n: n, k: i < 3 ? 'day' : 'night' }; })
      .filter(function (x) { return nombres.indexOf(x.n) < 0; });
    function chipsIdeas() {
      return '<div class="chips">' + ideas.map(function (x) {
        return '<button class="chipbtn" data-a="rSugerir" data-k="' + x.k + '" data-v="' + esc(x.n) + '">' + I('plus', 13) + esc(x.n) + '</button>';
      }).join('') + '</div>';
    }
    if (!nDia && !nNoche) {
      return h + '<p class="muted">Pequeñas cosas que quieres hacer cada día. Prueba con una de estas o escribe la tuya:</p>' +
        chipsIdeas() + '<div class="tlist">' + filaAnadir(hora) + '</div></div>';
    }
    if (Routines.isRest(t) && !editing) {
      return h + '<p class="notice">Hoy es día de descanso: no toca ningún hábito y tu racha sigue igual.</p>' + recuerdo(t) + '</div>';
    }

    var noche = hora >= 18 || hora < 6 || ui.nightOpen || editing;
    // lo que se ve hoy: lo que toca y lo flexible que aún no cumplió su cuota
    var nightVis = Routines.visibleOn('night', t), dayVis = Routines.visibleOn('day', t);
    // «x de y»: lo que toca, y lo flexible solo si ya se marcó (no deja nada a medias)
    var marcas = function (kind, vis) {
      var m = (S.rlog[t] || {})[kind] || [], hechos = 0, total = 0;
      vis.forEach(function (it) { var on = m.indexOf(it.id) >= 0; if (Routines.clase(it, t) === 'toca' || on) { total++; if (on) hechos++; } });
      return hechos + ' de ' + total;
    };
    // un grupo sin nada que hacer hoy no se pinta (salvo editando): «De día · 0 de 0» no dice nada
    var hayDia = nDia && (editing || dayVis.length), hayNoche = nNoche && (editing || nightVis.length);
    var dos = hayDia && hayNoche;
    h += '<div class="tlist hab">';
    if (hayDia) {
      if (dos) h += '<div class="tl-head">' + I('sunrise', 14) + 'De día<span class="num">' + marcas('day', dayVis) + '</span></div>';
      h += filasHabitos('day', t, editing);
    }
    if (hayNoche) {
      if (noche) {
        h += '<div class="tl-head">' + I('moon', 14) + 'De noche<span class="num">' + marcas('night', nightVis) + '</span></div>' +
          filasHabitos('night', t, editing);
      } else {
        h += '<button class="trow trow-btn" data-a="toggleNight"><span class="trow-ic">' + I('moon', 16) + '</span>' +
          '<span class="trow-t grow">De noche</span><span class="tiny num">' + marcas('night', nightVis) + '</span>' + I('right', 16) + '</button>';
      }
    }
    h += filaAnadir(hora) + '</div>';
    if (!editing && nDia + nNoche < 3 && ideas.length) h += chipsIdeas();

    // los que no salen hoy: en pausa, o porque hoy no es su día o ya cumplieron su cuota
    var ocultos = nDia + nNoche - dayVis.length - nightVis.length;
    var pausados = S.routines.day.concat(S.routines.night).filter(function (it) { return it.paused && t >= it.paused; }).length;
    var noToca = ocultos - pausados;
    if (!editing && ocultos > 0) {
      var partes = [];
      if (pausados) partes.push(pausados === 1 ? 'uno en pausa' : pausados + ' en pausa');
      if (noToca > 0) partes.push(noToca === 1 ? 'otro no toca hoy' : 'otros ' + noToca + ' no tocan hoy');
      h += '<p class="tiny">' + Fmt.cap(partes.join(' y ')) + '. Lo cambias en «Editar».</p>';
    }
    // De noche y sin nada marcado: el descanso se ofrece aquí, no escondido en «Editar».
    // No el mismo día en que se crearon los hábitos: entonces aún no hay nada que descansar.
    var veterano = S.routines.day.concat(S.routines.night).some(function (it) { return !it.since || it.since < t; });
    if (!editing && veterano && (hora >= 20 || hora < 6) && tot.total && !tot.done) {
      h += '<div class="descanso-oferta"><p class="tiny">¿Día difícil? Puedes tomarlo de descanso: tu racha sigue igual.</p>' +
        '<button class="btn ghost xs" data-a="restHoy">' + I('moon', 14) + 'Descansar hoy</button></div>' + recuerdo(t);
    }
    if (editing) h += descanso(t);
    return h + '</div>';
  }

  // Mirando un día que ya pasó: sus hábitos, para marcar lo que se quedó sin marcar
  // (solo los que tocaban ese día o se marcaron; nada de añadir ni editar).
  function rutinasDeDia(k) {
    var tot = Routines.dayTotals(k), filas = '';
    ['day', 'night'].forEach(function (kind) {
      var marks = (S.rlog[k] || {})[kind] || [];
      (S.routines[kind] || []).forEach(function (it) {
        var on = marks.indexOf(it.id) >= 0;
        if (!on && Routines.clase(it, k) === 'no') return;   // ese día no tocaba (ni existía, ni era flexible)
        filas += '<div class="trow' + (on ? ' is-done' : '') + '">' +
          '<button class="chk" role="checkbox" aria-checked="' + on + '" data-a="rtoggle" data-day="' + k + '" data-k="' + kind + '" data-id="' + esc(it.id) + '" aria-label="' + esc(it.name) + '">' + I('check', 15) + '</button>' +
          '<span class="trow-t grow">' + esc(it.name) + '</span></div>';
      });
    });
    if (!filas) return Routines.isRest(k) ? '<div class="sect"><p class="notice">Ese día fue de descanso.</p></div>' : '';
    return '<div class="sect" id="rutinas"><div class="sect-head"><span class="sect-title">Rutinas de ese día</span>' +
      '<span class="tiny num">' + tot.done + ' de ' + tot.total + '</span></div><div class="tlist hab">' + filas + '</div></div>';
  }

  /* ------------------------------------------------- tareas de hoy y plan */
  var WD = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  // Las reglas de las tareas viven en tasks.js. Esta pantalla solo pinta, así
  // que recibe únicamente la interfaz de consulta (no puede cambiar datos).
  var Tasks = TaskQueries;
  var isDone = Tasks.isDone, goalById = Tasks.goalById, goalsToday = Tasks.goalsForDay;

  function nowHM() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  // Panel «Pasar a…» de una tarea: otro día, otra hora, o quitarla.
  function movePanel(e, day) {
    var t = Dates.today(), ref = day < t ? t : day, id = esc(e.id);
    return '<div class="plan-move">' +
      '<span class="tiny">Pasar a</span>' +
      (day !== t ? '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + id + '" data-to="' + t + '">Hoy</button>' : '') +
      '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + id + '" data-to="' + Dates.shift(ref, 1) + '">Mañana</button>' +
      '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + id + '" data-to="' + Dates.shift(ref, 7) + '">En 7 días</button>' +
      '<button class="btn soft xs" data-a="evto" data-day="' + day + '" data-id="' + id + '" data-to="">Sin fecha</button>' +
      '<input class="inp" type="date" data-f="evdate" data-day="' + day + '" data-id="' + id + '" value="' + day + '" aria-label="Otro día">' +
      '<span class="tiny">Hora</span>' +
      '<input class="inp" type="time" data-f="evtime" data-day="' + day + '" data-id="' + id + '" value="' + esc(e.time || '') + '" aria-label="Hora (opcional)">' +
      '<button class="btn ghost xs plan-quitar" data-a="evdel" data-day="' + day + '" data-id="' + id + '">' + I('trash', 15) + 'Quitar</button>' +
      '</div>';
  }

  // Una línea de contexto bajo el título: hora, cita, fecha atrasada, meta.
  // Solo lo que hay; si no hay nada, no se pinta.
  function metaLinea(partes) {
    partes = partes.filter(Boolean);
    return partes.length ? '<span class="trow-m">' + partes.join('') + '</span>' : '';
  }
  function deMeta(gid) {
    var x = gid && goalById(gid);
    if (!x) return '';
    var c = Areas.get(x.g.cat);
    return '<span>' + (c ? esc(c.emoji) + ' ' : I('target', 13)) + esc(x.g.name || 'Meta') + '</span>';
  }
  // Las tareas creadas antes llevan «Meta · paso» en el título: se enseña solo el paso.
  function titulo(e) {
    var x = e.goalId && goalById(e.goalId), n = x && x.g.name;
    return n && e.title.indexOf(n + ' · ') === 0 ? e.title.slice(n.length + 3) : e.title;
  }

  // Una tarea: el círculo de la izquierda la marca como hecha; el resto se toca
  // para cambiar día u hora (ahí también se quita).
  function planRow(e, day, opt) {
    opt = opt || {};
    var open = ui.moveId === e.id, done = isDone(e);
    var h = '<div class="trow' + (done ? ' is-done' : '') + '">' +
      '<button class="chk round" role="checkbox" aria-checked="' + done + '" data-a="evdone" data-day="' + day + '" data-id="' + esc(e.id) + '" aria-label="Marcar «' + esc(e.title) + '» como hecha">' + I('check', 14) + '</button>' +
      '<button class="trow-body" data-a="evmove" data-id="' + esc(e.id) + '" aria-expanded="' + open + '" aria-label="Cambiar día u hora de «' + esc(e.title) + '»">' +
      '<span class="trow-t">' + esc(titulo(e)) + '</span>' +
      metaLinea([
        opt.showDate ? '<span class="bad">' + esc(Fmt.cap(Fmt.cuando(day))) + '</span>' : '',
        e.time ? '<span class="num">' + I('clock', 13) + esc(e.time) + '</span>' : '',
        hitoTag(Tasks.stepLink(e)), deMeta(e.goalId)
      ]) + '</button></div>';
    if (open) h += movePanel(e, day);
    return h;
  }

  // Un paso de meta de hoy que aún no es tarea: se muestra en el plan y, al
  // editarlo, se convierte en tarea real (enlazada al paso, sin duplicarse).
  // `atrasado`: el día que tenía, si ya pasó (se dice cuándo, en rojo).
  function goalRow(x, atrasado) {
    if (!x.s) {
      return '<div class="trow"><span class="trow-ic">' + I('target', 16) + '</span>' +
        '<button class="trow-body" data-a="openGoal" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '">' +
        '<span class="trow-t">' + esc(x.g.name || 'Meta sin nombre') + '</span>' +
        metaLinea(['<span class="bad">La meta vence hoy</span>']) + '</button></div>';
    }
    var done = !!x.s.done, title = x.s.name || 'Paso';
    return '<div class="trow' + (done ? ' is-done' : '') + '">' +
      '<button class="chk round" role="checkbox" aria-checked="' + done + '" data-a="gsDone" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '" aria-label="Marcar «' + esc(title) + '» como hecha">' + I('check', 14) + '</button>' +
      '<button class="trow-body" data-a="gsEdit" data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '" aria-label="Cambiar día u hora de «' + esc(title) + '»">' +
      '<span class="trow-t">' + esc(title) + '</span>' +
      metaLinea([atrasado ? '<span class="bad">' + esc(Fmt.cap(Fmt.cuando(atrasado))) + '</span>' : '', hitoTag(x.s), deMeta(x.g.id)]) + '</button></div>';
  }
  // Un hito (paso que marca un punto importante de su meta) se distingue con bandera.
  function hitoTag(s) { return s && s.hito ? '<span class="hito">' + I('flag', 12) + 'Hito</span>' : ''; }

  function grupo(titulo, filas, accion, cls) {
    if (!filas) return '';
    return '<div class="tgroup' + (cls ? ' ' + cls : '') + '"><span>' + titulo + '</span>' + (accion || '') + '</div>' +
      '<div class="tlist">' + filas + '</div>';
  }

  /* «Plan»: el del día elegido en la tira de la semana (hoy por defecto).
     Primero se añade; luego una sola lista por grupos. Lo que ya está arriba,
     en «Ahora», no se repite. */
  function planSection(t, d) {
    var isToday = d === t;
    var evs = (S.events[d] || []).filter(function (e) { return e.id !== nextCardId; });
    var gt = goalsToday(d).filter(function (x) { return !x.s || x.s.id !== nextStepId; });
    var late = isToday ? Tasks.overdue(t).filter(function (x) { return x.e.id !== nextCardId; }) : [];
    var lateSteps = isToday ? Tasks.overdueSteps(t) : [];

    var h = '<div class="sect" id="plan">' +
      '<div class="sect-head"><span class="sect-title">' + (isToday ? 'Tu plan de hoy' : esc(Fmt.cap(Fmt.fmtLong(d)))) + '</span>' +
      (!isToday ? '<button class="btn ghost xs" data-a="planDay" data-day="' + t + '">' + I('left', 14) + 'Hoy</button>' : '') + '</div>';

    /* añadir: título, y junto al «+» el botón con el día y la hora de la nueva tarea */
    var base = d < t ? t : d;
    var ntDay = /^\d{4}-\d\d-\d\d$/.test(ui.ntDate || '') ? ui.ntDate : base;
    var ntWhen = (ntDay === t ? 'Hoy' : ntDay === Dates.shift(t, 1) ? 'Mañana' : Fmt.fmt(ntDay)) + (ui.ntTime ? ' · ' + ui.ntTime : '');
    h += '<div class="plan-add">' +
      '<div class="addbar"><input class="addbar-inp" data-f="ntTitle" data-add="task" value="' + esc(ui.ntTitle || '') + '" placeholder="Añadir una tarea" aria-label="Nueva tarea" enterkeyhint="done">' +
      '<button class="addbar-when" data-a="ntMore" aria-expanded="' + !!ui.ntMore + '" aria-label="Día y hora de la nueva tarea: ' + esc(ntWhen) + '">' +
      I('calendar', 14) + '<span>' + esc(ntWhen) + '</span></button>' +
      '<button class="addbar-go" data-a="ntAdd" aria-label="Añadir al plan">' + I('plus', 18) + '</button></div>';
    if (ui.ntMore) {
      // hoy y mañana a un toque; cualquier otro día, con el calendario
      var man = Dates.shift(t, 1);
      h += '<div class="plan-move plan-when-panel">' +
        '<span class="seg mini" role="group" aria-label="Día de la nueva tarea">' +
        '<button type="button" data-a="ntDia" data-v="' + t + '" aria-pressed="' + (ntDay === t) + '">Hoy</button>' +
        '<button type="button" data-a="ntDia" data-v="' + man + '" aria-pressed="' + (ntDay === man) + '">Mañana</button></span>' +
        '<input class="inp" type="date" data-f="ntDate" value="' + esc(ntDay) + '" min="' + t + '" aria-label="Otro día">' +
        '<span class="tiny">Hora</span>' +
        '<input class="inp" type="time" data-f="ntTime" value="' + esc(ui.ntTime || '') + '" aria-label="Hora (opcional)">' +
        '<button class="btn accent xs" data-a="ntListo">Guardar</button></div>';
    }
    h += '</div>';

    var conHora = evs.filter(function (e) { return e.time; }).sort(function (x, y) { return x.time < y.time ? -1 : x.time > y.time ? 1 : 0; });
    var sinHora = evs.filter(function (e) { return !e.time; });
    var nLate = late.length + lateSteps.length;
    var filasLate = lateSteps.slice(0, 5).map(function (x) { return goalRow(x, x.day); }).join('') +
      late.slice(0, Math.max(0, 5 - lateSteps.length)).map(function (x) { return planRow(x.e, x.day, { showDate: true }); }).join('') +
      (nLate > 5 ? '<p class="tiny" style="padding:10px 14px">Y ' + (nLate - 5) + ' más.</p>' : '');
    var filasHora = conHora.map(function (e) { return planRow(e, d); }).join('');
    var filasLibres = gt.map(function (x) { return goalRow(x); }).join('') + sinHora.map(function (e) { return planRow(e, d); }).join('');

    // De noche, traer lo atrasado a hoy ya no sirve: se ofrece pasarlo (con lo que
    // quede de hoy) a mañana, al final de la lista.
    // (el primer día no: quien acaba de hacer su plan no necesita que le sugieran aplazarlo)
    var hora = new Date().getHours(), noche = isToday && (hora >= 20 || hora < 4) && !!S.start && S.start < t;
    var quedanHoy = noche ? (S.events[t] || []).filter(function (e) { return !isDone(e) && !e.time; }).length +
      goalsToday(t).filter(function (x) { return x.s && !x.s.done; }).length : 0;
    if (filasLate) h += grupo('Atrasadas', filasLate, noche ? '' : '<button class="btn ghost xs" data-a="overdueAll">Pasar a hoy</button>', 'bad');
    // con un solo grupo no hace falta rótulo: la lista ya es «tu plan»
    var dos = filasHora && filasLibres;
    if (filasHora) h += dos || filasLate ? grupo('Con hora', filasHora) : '<div class="tlist">' + filasHora + '</div>';
    // «Sin hora», no «cuando puedas»: una tarea sin hora puede ser la más urgente del día
    if (filasLibres) h += dos || filasLate ? grupo('Sin hora', filasLibres) : '<div class="tlist">' + filasLibres + '</div>';
    if (!filasLate && !filasHora && !filasLibres && !(isToday && nextCardId + nextStepId)) {
      h += '<p class="muted">' + (noche ? 'No queda nada pendiente para hoy.' : isToday ? 'Nada planeado para hoy. Escribe arriba lo primero que quieras hacer.' : 'Nada planeado para este día.') + '</p>';
    }
    if (noche && nLate + quedanHoy) {
      h += '<div class="oferta"><p class="tiny">¿No te da para más hoy? Pasa lo pendiente a mañana y empieza con la lista limpia.</p>' +
        '<button class="btn ghost xs" data-a="postponeAll">' + I('right', 14) + 'Pasar a mañana</button></div>';
    }

    if (S.todo.length) {
      h += grupo('Sin fecha', S.todo.map(function (x) {
        return '<div class="trow"><span class="trow-ic">' + I('note', 16) + '</span>' +
          '<span class="trow-body" style="cursor:default"><span class="trow-t">' + esc(x.title) + '</span>' +
          metaLinea([x.goalId ? deMeta(x.goalId) : '']) + '</span>' +
          '<span class="trow-act"><button class="btn ghost xs" data-a="todoPull" data-id="' + esc(x.id) + '">' + (base === t ? 'A hoy' : 'A este día') + '</button>' +
          '<button class="delbtn" data-a="tododel" data-id="' + esc(x.id) + '" aria-label="Quitar pendiente">' + I('trash', 17) + '</button></span></div>';
      }).join(''));
    }
    return h + '</div>';
  }

  /* metas que vencen esta semana (o ya vencieron): el puente entre el día y los objetivos */
  function soonSection() {
    var soon = Goals.upcoming(5).filter(function (x) { var n = Goals.daysLeft(x.g.due); return n !== null && n <= 7; });
    if (!soon.length) return '';
    return '<div class="sect"><div class="sect-head"><span class="sect-title">Metas que vencen</span>' +
      '<button class="btn ghost xs" data-a="tab" data-t="metas">Ver metas</button></div>' +
      '<div class="tlist">' + soon.map(function (x) {
        var d = Fmt.due(x.g.due, false), c = Areas.get(x.g.cat);
        return '<button class="trow trow-btn" data-a="openGoal" data-k="' + x.kind + '" data-id="' + esc(x.g.id) + '">' +
          '<span class="trow-ic">' + (c ? esc(c.emoji) : I('target', 16)) + '</span>' +
          '<span class="trow-body"><span class="trow-t">' + esc(x.g.name || 'Meta sin nombre') + '</span>' +
          metaLinea(['<span class="' + (d.cls === 'bad' ? 'bad' : '') + '">' + esc(d.txt) + '</span>']) + '</span>' +
          I('right', 16) + '</button>';
      }).join('') + '</div></div>';
  }

  /* Metas cuyo siguiente paso no tiene día: sin día, un paso nunca llega al plan.
     Se ofrece ponérselo con un toque (hoy o mañana); sigue siendo un paso de su meta. */
  function pasosSinDia(t) {
    // de noche, con cosas pendientes, primero se cierra el día: planear puede esperar a mañana
    var hora = new Date().getHours();
    if ((hora >= 20 || hora < 4) && Tasks.overdue(t).length + Tasks.overdueSteps(t).length + Tasks.pending(t)) return '';
    var out = [], PRIO = { Alta: 0, Media: 1, Baja: 2 };
    // primero las cortas, y entre ellas las de prioridad alta (las elegidas para este
    // mes); después las de largo plazo
    function prio(g) { return PRIO[g.priority] === undefined ? 1 : PRIO[g.priority]; }
    S.goalsS.map(function (g) { return { g: g, k: 'S' }; }).sort(function (a, b) { return prio(a.g) - prio(b.g); })
      .concat(S.goalsL.map(function (g) { return { g: g, k: 'L' }; })).forEach(function (x) {
        var g = x.g;
        if (g.done) return;
        // los pasos ya convertidos en meta corta van por su cuenta
        var pend = (g.steps || []).filter(function (s) { return !s.done && !s.promoted; });
        // si ya hay un paso con día (o atrasado, que sale arriba), la meta ya está en el plan
        if (!pend.length || pend.some(function (s) { return s.due; })) return;
        if (!Tasks.linked(g.id, pend[0].id)) out.push({ g: g, s: pend[0], k: x.k });
      });
    if (!out.length) return '';
    var man = Dates.shift(t, 1);
    return '<div class="sect"><div class="sect-head"><span class="sect-title">Siguiente paso de tus metas</span></div>' +
      '<p class="tiny" style="margin-top:-6px">Aún no tienen día, así que no llegan a tu plan. ¿Cuándo los haces?</p>' +
      '<div class="tlist">' + out.slice(0, 3).map(function (x) {
        var c = Areas.get(x.g.cat), ids = 'data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '"';
        return '<div class="trow"><span class="trow-ic">' + (c ? esc(c.emoji) : I('target', 16)) + '</span>' +
          '<span class="trow-body" style="cursor:default"><span class="trow-t">' + esc(x.s.name || 'Paso') + '</span>' +
          metaLinea(['<span>' + esc(x.g.name || 'Meta') + '</span>']) + '</span>' +
          '<span class="trow-act"><button class="btn ghost xs" data-a="pasoDia" ' + ids + ' data-v="' + t + '">Hoy</button>' +
          '<button class="btn ghost xs" data-a="pasoDia" ' + ids + ' data-v="' + man + '">Mañana</button></span></div>';
      }).join('') + '</div></div>';
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
        '<span class="wdot" aria-hidden="true">' + (pend ? '•' : '') + '</span></button>';
    });
    return h + '<button class="iconbtn" data-a="planWeek" data-v="7" aria-label="Semana siguiente">' + I('right', 17) + '</button></div>';
  }

  /* ------------------------------------------------------- ahora */
  var nextCardId = '', nextStepId = '';

  function mins(hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; }

  // Lo siguiente que hacer hoy. Una cita en las próximas dos horas manda; si no,
  // lo que acerca a una meta (sus pasos y las tareas enlazadas), que es lo que la
  // persona dijo que le importa; después las tareas sueltas, y al final lo que
  // tiene hora más tarde o la que ya pasó sin marcar.
  function nextItem(t) {
    var now = nowHM();
    var pend = (S.events[t] || []).filter(function (e) { return !isDone(e); });
    var timed = pend.filter(function (e) { return e.time; }).sort(function (x, y) { return x.time < y.time ? -1 : x.time > y.time ? 1 : 0; });
    var proxima = timed.filter(function (e) { return e.time >= now; })[0];
    if (proxima && mins(proxima.time) - mins(now) <= 120) return { e: proxima };
    var st = goalsToday(t).filter(function (x) { return x.s && !x.s.done; })[0];
    if (st) return { step: st };
    var libres = pend.filter(function (e) { return !e.time; });
    var nx = libres.filter(function (e) { return e.goalId; })[0] || libres[0] || proxima || timed[0];
    return nx ? { e: nx } : null;
  }

  function nextCard(t) {
    nextCardId = ''; nextStepId = '';
    var n = nextItem(t);
    if (!n) return '';
    var title, contexto, hecho, mover, panel = '';
    if (n.e) {
      var e = n.e; nextCardId = e.id;
      title = titulo(e);
      contexto = metaLinea([
        e.time ? '<span class="num">' + I('clock', 14) + (e.time < nowHM() ? 'Era a las ' : 'A las ') + esc(e.time) + '</span>' : '',
        hitoTag(Tasks.stepLink(e)), deMeta(e.goalId)
      ]);
      hecho = 'data-a="evdone" data-day="' + t + '" data-id="' + esc(e.id) + '"';
      mover = 'data-a="evmove" data-id="' + esc(e.id) + '" aria-expanded="' + (ui.moveId === e.id) + '"';
      if (ui.moveId === e.id) panel = movePanel(e, t);
    } else {
      var x = n.step;
      nextStepId = x.s.id;
      title = x.s.name || 'Paso';
      contexto = metaLinea([hitoTag(x.s), deMeta(x.g.id)]);
      var ids = 'data-k="' + x.k + '" data-id="' + esc(x.g.id) + '" data-s="' + esc(x.s.id) + '"';
      hecho = 'data-a="gsDone" ' + ids; mover = 'data-a="gsEdit" ' + ids;
    }
    return '<section class="ahora" aria-label="Lo siguiente">' +
      '<div class="ahora-k">Lo siguiente</div>' +
      '<h2 class="ahora-t">' + esc(title) + '</h2>' + contexto +
      '<div class="ahora-b"><button class="btn accent sm" ' + hecho + '>' + I('check', 16) + 'Hecho</button>' +
      '<button class="btn ghost sm" ' + mover + '>Mover</button></div>' +
      panel + '</section>';
  }

  /* --------------------------------------------------------------- la vista */
  V.hoy = function () {
    var t = Dates.today();
    var tot = Routines.dayTotals(t);
    var name = (S.account && S.account.name) ? S.account.name.split(' ')[0] : '';
    var hora = new Date().getHours();
    var saludo = hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

    // el día que se está mirando en la tira (hoy, si no se ha elegido otro)
    var d = ui.planDay;
    if (!d || !/^\d{4}-\d\d-\d\d$/.test(d)) d = ui.planDay = t;

    // Cuánto queda del día: tareas, pasos de metas y hábitos. Una sola cifra.
    var evs = S.events[t] || [];
    var steps = goalsToday(t).filter(function (x) { return x.s; });
    var total = evs.length + steps.length + tot.total;
    var hechas = evs.filter(isDone).length + steps.filter(function (x) { return x.s.done; }).length + tot.done;
    var progreso = total
      ? '<div class="dia-prog" role="img" aria-label="Hoy llevas ' + hechas + ' de ' + total + '">' +
        '<span class="bar thin"><span style="width:' + Math.round(hechas / total * 100) + '%"></span></span>' +
        '<span class="tiny num">' + (hechas >= total ? 'Todo hecho' : hechas + ' de ' + total + ' hechas') + '</span></div>'
      : '';

    // el foco que se eligió al cerrar la semana pasada acompaña toda esta semana
    var rvPasada = S.reviews[Dates.shift(Dates.weekStart(t), -7)], foco = rvPasada && String(rvPasada.focus || '').trim();
    var h = V.cabecera({ kicker: Fmt.cap(Fmt.fmtLong(t)), titulo: saludo + (name ? ', ' + name : ''), perfil: profileBtn(),
      sub: foco ? 'Foco de la semana: ' + foco : '', extra: progreso });
    h += '<div class="scroll"><div class="page">';

    // Si dejó la bienvenida para luego, se le ofrece seguir donde iba.
    if (Bienvenida.retomable()) {
      var q = Bienvenida.quedan();
      h += '<div class="aviso"><div class="grow"><strong>Tu primer plan está a medias</strong>' +
        '<p class="tiny">' + (q === 1 ? 'Te queda una pregunta' : 'Te quedan ' + q + ' preguntas') + '. Lo que respondiste sigue guardado.</p>' +
        '<div class="row" style="gap:8px;margin-top:10px">' +
        '<button class="btn accent sm" data-a="bvSeguir">Seguir</button>' +
        '<button class="btn ghost sm" data-a="bvDescartar">No, gracias</button></div></div></div>';
    }

    /* lo siguiente (solo mirando hoy), la semana y el plan del día elegido */
    nextCardId = ''; nextStepId = '';
    if (d === t) h += nextCard(t);
    h += weekStrip(t, d) + planSection(t, d);
    if (d === t) h += nudgeCard(true) + pasosSinDia(t);

    // un día que ya pasó muestra sus hábitos y su nota; hoy o un día futuro, los de hoy
    var pasado = d < t, diaNota = pasado ? d : t;
    // (el reto es un hábito más: sale en Rutinas con «Reto · día N de D»)
    h += pasado ? rutinasDeDia(d) : rutinas(t, hora);

    /* la nota del día */
    var note = S.notes[diaNota] || '';
    // plegable como Rutinas; se recuerda cómo la dejó la persona
    if (ui.noteClosed === undefined) ui.noteClosed = !!Preferencias.get('nota.cerrada', false);
    var nOpen = !ui.noteClosed;
    h += '<div class="sect" id="nota"><button class="fold-head" data-a="toggleNote" aria-expanded="' + nOpen + '">' +
      '<span class="sect-title">' + (pasado ? 'Nota de ese día' : 'Nota del día') + '</span>' +
      '<span class="row" style="gap:8px">' + (note ? '<span class="tiny">Escrita</span>' : '') +
      I(nOpen ? 'down' : 'right', 18) + '</span></button>';
    if (nOpen) {
      if (note || ui.noteOpen) {
        h += '<textarea class="ta" data-f="note" data-day="' + diaNota + '" aria-label="' + (pasado ? 'Nota de ese día' : 'Nota del día') + '" placeholder="¿Qué te acercó ' + (pasado ? 'ese día' : 'hoy') + ' a donde quieres llegar, y qué te alejó?">' + esc(note) + '</textarea>';
      } else {
        h += '<button class="inp nota-btn" data-a="openNote">¿Qué te acercó ' + (pasado ? 'ese día' : 'hoy') + ' a donde quieres llegar?</button>';
      }
    }
    h += '</div>';

    /* lo secundario, al final: metas que vencen esta semana y avisos de la app */
    h += soonSection();
    h += nudgeCard(false);

    h += '</div></div>';
    return h;
  };

  // la pestaña lleva cuántas tareas quedan hoy, para verlo desde cualquier pantalla
  V.tab({ id: 'hoy', label: 'Hoy', icon: 'sunrise', order: 1, view: V.hoy, badge: function () { return Tasks.pending(Dates.today()); } });
})();
