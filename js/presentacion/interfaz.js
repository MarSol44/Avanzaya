/* ==========================================================================
   PRESENTACIÓN — armazón de la interfaz: pinta la pantalla y las hojas,
   lleva el botón «atrás», recibe los clics y los campos y los despacha a los
   controladores (uno por pantalla, en controladores/). Ofrece a esos
   controladores una interfaz pequeña y explícita: UI.
   ========================================================================== */
(function () {
  'use strict';
  var ui = UIState;

  /* ------------------------------------------------------------- pintado */
  function currentTab() {
    return V.tabs.filter(function (t) { return t.id === ui.tab; })[0] || V.tabs[0];
  }
  // La barra se construye con las pestañas registradas (V.tab).
  function tabbar() {
    var cur = currentTab();
    var fab = '<button class="tab-fab" data-a="quick" aria-label="Apuntar algo">' + I('plus', 28) + '</button>';
    return '<div class="tab-scrim" aria-hidden="true"></div><nav class="tabbar" role="tablist">' + V.tabs.filter(function (t) { return t.inBar !== false; }).map(function (t, i) {
      var n = t.badge ? t.badge() : 0;
      var badge = n ? '<span class="tbadge" aria-hidden="true">' + (n > 9 ? '9+' : n) + '</span>' : '';
      return '<button role="tab" aria-selected="' + (cur.id === t.id || cur.parent === t.id) + '" data-a="tab" data-t="' + t.id + '"' +
        (n ? ' aria-label="' + t.label + ', ' + Fmt.plural(n, 'tarea pendiente', 'tareas pendientes') + '"' : '') + '>' +
        '<span class="ti">' + I(t.icon, 21) + badge + '</span><span class="tl">' + t.label + '</span></button>' +
        (i === 1 ? fab : '');   // el «+» va en el centro, entre las dos primeras pestañas y las dos últimas
    }).join('') + '</nav>';
  }

  // Un campo de una línea (rows="1") crece desde ahí; el resto, desde 60px.
  function grow(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, el.getAttribute('rows') === '1' ? 0 : 60) + 'px';
  }
  function growAll(scope) {
    var t = scope.querySelectorAll('textarea');
    for (var i = 0; i < t.length; i++) grow(t[i]);
  }

  function render() {
    var root = document.getElementById('root'), h = '', s = ui.screen;
    var view = s === 'app' ? currentTab().view : V.screens[s];
    if (!view) {
      root.innerHTML = '<div class="scroll nonav" style="display:flex;flex-direction:column;justify-content:center;min-height:100dvh;gap:18px;text-align:center">' +
        '<span style="color:var(--ink-3);margin:0 auto">' + I('compass', 44) + '</span>' +
        '<h1 style="font-family:var(--disp);font-size:1.9rem;font-weight:600;letter-spacing:-.02em">Aquí no hay nada</h1>' +
        '<p class="muted" style="max-width:30ch;margin:0 auto">Esa pantalla no existe. Tus datos siguen intactos.</p>' +
        '<button class="btn block" data-a="tab" data-t="metas" style="margin-top:8px">Volver a Metas</button></div>';
      return;
    }
    h = view();
    if (s === 'app') h += tabbar();
    root.innerHTML = h;
    growAll(root);
    Bus.emit('pintado', s);
    if (ui.refocus) {
      var el = document.getElementById(ui.refocus);
      if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { } }
      ui.refocus = null;
    }
  }

  var FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  var lastFocus = null;

  function renderSheet() {
    var w = document.getElementById('sheetWrap'), box = document.getElementById('sheet');
    if (!ui.sheet) { w.classList.remove('open'); box.innerHTML = ''; return; }
    box.innerHTML = V.sheet();
    w.classList.add('open');
    growAll(box);
  }
  // Al cerrar una hoja se vuelve a pintar la pantalla entera, así que el
  // botón que la abrió ya no es el mismo nodo: se recuerda cómo encontrarlo.
  function openerSelector(el) {
    if (!el || !el.getAttribute) return null;
    var a = el.getAttribute('data-a');
    if (!a || !/^[a-zA-Z]+$/.test(a)) return null;
    var sel = '[data-a="' + a + '"]';
    ['data-id', 'data-doc', 'data-k', 'data-i'].forEach(function (k) {
      var v = el.getAttribute(k);
      if (v != null && /^[A-Za-z0-9_-]*$/.test(v)) sel += '[' + k + '="' + v + '"]';
    });
    return sel;
  }
  function openSheet(o) {
    var was = !!ui.sheet;
    lastFocus = openerSelector(document.activeElement);
    ui.sheet = o; renderSheet();
    if (!was) pushNav('sheet');
    var box = document.getElementById('sheet');
    var f = box.querySelector(FOCUSABLE);
    if (f) f.focus();
  }
  function closeSheetCore() {
    var back = lastFocus, prev = ui.sheet; lastFocus = null;
    // una meta nueva que se cierra sin nada escrito no deja una «Meta sin nombre»
    if (prev && prev.t === 'goal') Objetivos.descartarVacia(prev.k, prev.id);
    ui.sheet = null; renderSheet(); render();
    if (back) {
      var t = document.querySelector(back);
      if (t) { try { t.focus(); } catch (e) { } }
    }
  }
  function closeSheet() { closeSheetCore(); popNav('sheet'); }

  /* ------------------------------------------- botón «atrás» del teléfono
     Abrir una hoja o el Perfil deja una entrada en el historial; el botón
     «atrás» (o el gesto) cierra eso en vez de salir de la app. Cuando se
     cierra desde la propia app, se retira su entrada para no dejar huecos. */
  var skipPop = 0, queuedNav = null;
  function pushNav(kind) {
    if (skipPop) { queuedNav = kind; return; }   // se termina antes de retirar la anterior
    try { history.pushState({ bdv: kind }, ''); } catch (e) { }
  }
  function popNav(kind) {
    if (history.state && history.state.bdv === kind) { skipPop++; try { history.back(); } catch (e) { skipPop--; } }
  }
  window.addEventListener('popstate', function () {
    if (skipPop) {
      skipPop--;
      if (!skipPop && queuedNav) { var q = queuedNav; queuedNav = null; pushNav(q); }
      return;
    }
    if (ui.sheet) { closeSheetCore(); return; }
    if (ui.screen === 'app' && ui.tab === 'perfil') { goApp('hoy'); }
  });

  // Mientras la hoja está abierta, el tabulador no se escapa detrás de ella.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !ui.sheet) return;
    var box = document.getElementById('sheet');
    var f = box.querySelectorAll(FOCUSABLE);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  });

  function goApp(tab) { ui.screen = 'app'; if (tab) ui.tab = tab; render(); window.scrollTo(0, 0); }

  // Cuando se toca algo que se ve a la vez en la pantalla y en una hoja
  // abierta, hay que repintar las dos.
  function refresh() { render(); if (ui.sheet) renderSheet(); }

  function focusAdd(name) {
    var el = document.querySelector('[data-add="' + name + '"]');
    if (el) el.focus();
  }
  /* ------------------------------------------------ registro de acciones
     Cada botón lleva data-a="nombre". Las acciones se registran aquí con
     su nombre y el manejador de clics solo las despacha: para añadir una
     nueva no hay que tocar el manejador (abierto a extensión, cerrado a
     modificación). Cada una recibe { el, e, id, k, v, sid }. */
  var actions = {};
  function action(name, fn) { actions[name] = fn; }
  function runAction(a, ctx) {
    if (!Object.prototype.hasOwnProperty.call(actions, a)) return false;
    actions[a](ctx);
    return true;
  }

  function selectorDe(el) {
    var sel = '[data-a="' + el.getAttribute('data-a') + '"]';
    ['data-id', 'data-s', 'data-k', 'data-day'].forEach(function (k) {
      var v = el.getAttribute(k);
      if (v != null && /^[A-Za-z0-9_-]*$/.test(v)) sel += '[' + k + '="' + v + '"]';
    });
    return sel;
  }

  function armedDelete(el, run) {
    if (el.getAttribute('data-armed') === '1') { run(); return; }
    var antes = el.innerHTML, conTexto = el.classList.contains('btn');
    el.setAttribute('data-armed', '1');
    el.innerHTML = conTexto ? '¿Seguro? Pulsa otra vez' : I('check', 17);
    el.setAttribute('title', 'Pulsa otra vez para confirmar');
    if (!conTexto) Pantalla.toast('Pulsa otra vez para confirmar.');
    setTimeout(function () {
      if (!el.parentNode) return;
      el.removeAttribute('data-armed'); el.innerHTML = antes;
    }, 3500);
  }

  /* --------------------------------------------------------------- clics */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]');
    if (!el) return;
    var a = el.getAttribute('data-a'),
      id = el.getAttribute('data-id'),
      k = el.getAttribute('data-k'),
      v = el.getAttribute('data-v'),
      sid = el.getAttribute('data-s');

    // Marcar algo como hecho se nota: la pantalla se repinta, así que se busca la
    // casilla nueva y da un pequeño salto si quedó marcada.
    var casilla = el.getAttribute('role') === 'checkbox' ? selectorDe(el) : null;
    if (runAction(a, { el: el, e: e, id: id, k: k, v: v, sid: sid })) {
      var n = casilla && document.querySelector(casilla);
      if (n && n.getAttribute('aria-checked') === 'true') n.classList.add('pop');
      return;
    }
  });

  function closeSheetSilent() {
    var had = !!ui.sheet;
    ui.sheet = null; var w = document.getElementById('sheetWrap'); if (w) w.classList.remove('open');
    if (had) popNav('sheet');
  }

  document.getElementById('sheetWrap').addEventListener('click', function (e) {
    if (e.target === this) closeSheet();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.sheet) closeSheet();
  });

  var busy = false;
  function isBusy() { return busy; }
  function setBusy(v) { busy = !!v; }
  // Nada de botones que no responden: mientras se calcula, se ve que se calcula.
  function busyBtn(sel, on, label) {
    var b = document.querySelector(sel);
    if (!b) return;
    if (on) {
      if (!b.getAttribute('data-prev')) b.setAttribute('data-prev', b.innerHTML);
      b.setAttribute('data-busy', '1');
      b.innerHTML = I('loader', 18) + (label || 'Un momento…');
    } else {
      b.removeAttribute('data-busy');
      var prev = b.getAttribute('data-prev');
      if (prev) { b.innerHTML = prev; b.removeAttribute('data-prev'); }
    }
  }

  /* --------------------------------------------------------- Enter para añadir */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var el = e.target, add = el.getAttribute && el.getAttribute('data-add');
    if (!add) return;
    e.preventDefault();
    var btn = null;
    if (add === 'rday') btn = document.querySelector('[data-a="radd"][data-k="day"]');
    if (add === 'rnight') btn = document.querySelector('[data-a="radd"][data-k="night"]');
    if (add === 'task') btn = document.querySelector('[data-a="ntAdd"]');
    if (add === 'step') btn = document.querySelector('#sheet [data-a="stepAdd"]');
    if (add === 'win') btn = document.querySelector('[data-a="addWin"]');
    if (add === 'challenge') btn = document.querySelector('[data-a="addChallenge"]');
    if (add === 'quick') btn = document.querySelector('#sheet [data-a="qSave"]');
    if (btn) btn.click();
  });

  /* -------------------------------------------------------------- arranque */
  // Ningún error suelto debe acabar enseñando una traza al usuario.
  var lastErr = 0;
  function friendly() {
    if (Date.now() - lastErr < 4000) return;
    lastErr = Date.now();
    Pantalla.toast('Algo no ha ido bien, pero tus datos están a salvo.');
  }
  window.addEventListener('error', friendly);
  window.addEventListener('unhandledrejection', friendly);

  // Detalles que hacen que parezca hecho por alguien: color de la barra del
  // navegador acorde al tema y descripción para cuando se comparte el enlace.
  function meta(name, content) {
    var m = document.querySelector('meta[name="' + name + '"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); }
    m.setAttribute('content', content);
  }
  function paintChrome() {
    var bg = getComputedStyle(document.body).backgroundColor || '#f2cfae';
    meta('theme-color', bg);
  }

  /* --------------------------------------------- campos y formularios
     Los controladores registran qué hacer con cada campo (data-f), con
     campos especiales (por condición) y con cada formulario (por id). */
  var inputs = {}, changes = {}, inputWhen = [], changeWhen = [], submits = {};
  function onInput(f, fn) { inputs[f] = fn; }
  function onChange(f, fn) { changes[f] = fn; }
  function onInputWhen(test, fn) { inputWhen.push({ test: test, run: fn }); }
  function onChangeWhen(test, fn) { changeWhen.push({ test: test, run: fn }); }
  function onSubmit(id, fn) { submits[id] = fn; }
  function fieldCtx(el, e) {
    return { el: el, e: e, id: el.getAttribute('data-id'), k: el.getAttribute('data-k'), sid: el.getAttribute('data-s') };
  }
  function dispatchField(table, when, e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var f = el.getAttribute('data-f'), c = fieldCtx(el, e);
    if (f && Object.prototype.hasOwnProperty.call(table, f)) { table[f](c); return; }
    for (var i = 0; i < when.length; i++) if (when[i].test(el)) { when[i].run(c); return; }
  }
  document.addEventListener('input', function (e) { dispatchField(inputs, inputWhen, e); });
  document.addEventListener('change', function (e) { dispatchField(changes, changeWhen, e); });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = e.target && e.target.id;
    if (id && Object.prototype.hasOwnProperty.call(submits, id)) submits[id](e);
  });

  /* ------------------------------------------------------- interfaz UI
     Lo único que los controladores pueden usar del armazón. */
  window.UI = {
    action: action, onInput: onInput, onChange: onChange, onInputWhen: onInputWhen,
    onChangeWhen: onChangeWhen, onSubmit: onSubmit,
    render: render, refresh: refresh, renderSheet: renderSheet, openSheet: openSheet,
    closeSheet: closeSheet, closeSheetSilent: closeSheetSilent, goApp: goApp,
    grow: grow, growAll: growAll, pushNav: pushNav, popNav: popNav,
    armedDelete: armedDelete, busyBtn: busyBtn, isBusy: isBusy, setBusy: setBusy,
    focusAdd: focusAdd, paintChrome: paintChrome, meta: meta
  };
})();
