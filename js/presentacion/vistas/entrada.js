/* ==========================================================================
   Pantallas de entrada: inicio, sesión, registro, chequeo de vida,
   Mi Yo del Futuro y la comparación Hoy vs 5 años.
   ========================================================================== */
(function () {
  'use strict';
  var S = Datos.estado(), ui = UIState, esc = Fmt.esc;

  /* Reduce una imagen antes de guardarla: el navegador tiene poco espacio. */
  function readImage(file, max, cb) {
    // Tipo, extensión y peso se comprueban antes de leer un solo byte.
    var bad = Archivos.problemaImagen(file);
    if (bad) { Pantalla.toast(bad); return; }
    Pantalla.toast('Procesando la imagen…');
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var bad2 = Archivos.problemaPixeles(img.width, img.height);
        if (bad2) { Pantalla.toast(bad2); return; }
        // Se vuelve a codificar a JPEG: eso descarta EXIF, capas raras y
        // cualquier cosa que no sea realmente una imagen.
        var w = img.width, h = img.height, s = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * s); cv.height = Math.round(h * s);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        try { cb(cv.toDataURL('image/jpeg', 0.72)); }
        catch (e) { Pantalla.toast('No se pudo procesar la imagen.'); }
      };
      img.onerror = function () { Pantalla.toast('No se pudo leer la imagen.'); };
      img.src = fr.result;
    };
    fr.onerror = function () { Pantalla.toast('No se pudo leer el archivo.'); };
    fr.readAsDataURL(file);
  }
  V.readImage = readImage;

  /* Marca propia de la app: una flor de cuatro pétalos en el violeta del logo. */
  function mark(size) {
    var s = size || 104;
    return '<svg class="mark" width="' + s + '" height="' + s + '" viewBox="0 0 120 120" role="img" aria-label="Brújula de Vida">' +
      '<defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#6255d8"/><stop offset="1" stop-color="#3a30a8"/>' +
      '</linearGradient></defs>' +
      '<g fill="url(#bg1)">' +
      '<ellipse cx="60" cy="36" rx="16" ry="30" opacity=".92"/>' +
      '<ellipse cx="60" cy="84" rx="16" ry="30" opacity=".72"/>' +
      '<ellipse cx="36" cy="60" rx="30" ry="16" opacity=".82"/>' +
      '<ellipse cx="84" cy="60" rx="30" ry="16" opacity=".62"/>' +
      '</g><circle cx="60" cy="60" r="9" fill="var(--sand)"/><circle cx="60" cy="60" r="4" fill="url(#bg1)"/></svg>';
  }
  V.mark = mark;

  /* ------------------------------------------------------ pantalla de inicio */
  V.splash = function () {
    return '<div class="scroll nonav" style="display:flex;flex-direction:column;justify-content:center;min-height:100dvh;gap:26px;padding-top:40px">' +
      '<div class="stack" style="gap:18px">' + mark() +
      '<div class="brand">Brújula de Vida</div>' +
      '<div class="stack sm" style="text-align:center;gap:10px">' +
      '<p class="hero-quote">No tienes que tener toda tu vida resuelta.</p>' +
      '<p class="muted" style="max-width:34ch;margin:0 auto">Solo necesitas descubrir qué es importante para ti y dar el siguiente paso.</p>' +
      '</div></div>' +
      '<div class="stack sm" style="margin-top:18px">' +
      '<button class="btn accent block" data-a="go" data-s="login" style="padding:15px 20px;font-size:16px">Iniciar sesión</button>' +
      '<button class="btn soft block" data-a="go" data-s="register" style="padding:15px 20px;font-size:16px">Regístrate</button>' +
      '</div>' +
      redes() +
      '<p class="tiny" style="text-align:center;max-width:34ch;margin:0 auto">Tres preguntas y tendrás tu primer paso. Tus datos se guardan en tu cuenta y los tienes en todos tus dispositivos.</p>' +
      '</div>';
  };

  /* -------------------------------------------- cuentas: redes y tipo de acceso */
  // Logos de Google y Facebook en sus colores: son marcas, no iconos de la app
  // (por eso no van en iconos.js, que es de trazo y de un solo color).
  var LOGO = {
    google: '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">' +
      '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
      '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
      '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
      '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
    facebook: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="11.5" fill="#fff"/>' +
      '<path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>'
  };
  function redes() {
    return '<div class="redes">' +
      '<button class="btn soft block" type="button" data-a="google">' + LOGO.google + 'Continuar con Google</button>' +
      '<button class="btn soft block" type="button" data-a="facebook">' + LOGO.facebook + 'Continuar con Facebook</button></div>';
  }
  /* ----------------------------------------------------------- iniciar sesión */
  V.login = function () {
    var t = ui.showPw ? 'text' : 'password';
    return '<div class="appbar"><div class="appbar-row">' +
      '<button class="iconbtn" data-a="go" data-s="splash" aria-label="Volver">' + I('left') + '</button>' +
      '<h1>Iniciar sesión</h1></div></div>' +
      '<div class="scroll nonav"><form class="stack" id="loginForm" novalidate>' +
      '<label class="field"><span>Correo electrónico</span>' +
      // el correo de la última cuenta ya escrito (también si la sesión caducó sola)
      '<input class="inp" type="email" id="liMail" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="tu@correo.com" value="' +
      esc(ui.loginEmail || (S.account && S.account.login === 'email' ? S.account.email || '' : '')) + '"></label>' +
      '<label class="field"><span>Contraseña</span><span class="pwwrap">' +
      '<input class="inp" type="' + t + '" id="liPass" autocomplete="current-password" placeholder="Tu contraseña">' +
      '<button type="button" class="pweye" data-a="togglepw" aria-label="Ver u ocultar contraseña">' + I(ui.showPw ? 'eyeOff' : 'eye', 19) + '</button>' +
      '</span></label>' +
      '<label class="checkrow"><input type="checkbox" id="liKeep" checked>Mantener la sesión iniciada</label>' +
      '<p id="liErr" class="tiny" style="color:var(--bad);min-height:16px"></p>' +
      '<button class="btn ghost sm" type="button" data-a="reenviar" id="liReenviar" hidden style="align-self:flex-start">Reenviar el correo de confirmación</button>' +
      '<button class="btn block" type="submit" data-a="dologin">Iniciar sesión</button>' +
      redes() +
      '<button class="btn ghost block" type="button" data-a="forgot">¿Olvidaste tu contraseña?</button>' +
      '<button class="btn soft block" type="button" data-a="go" data-s="register">Crear una cuenta nueva</button>' +
      '<p class="tiny">Tus datos se guardan en tu cuenta y los tienes en todos tus dispositivos. Más en la <a href="#" data-a="legal" data-doc="privacidad">Política de privacidad</a>.</p>' +
      '</form></div>';
  };

  /* ------------------------------------------ revisa tu correo (tras registrarse) */
  V.confirmar = function () {
    return '<div class="appbar"><div class="appbar-row">' +
      '<button class="iconbtn" data-a="go" data-s="splash" aria-label="Volver">' + I('left') + '</button>' +
      '<h1>Confirma tu correo</h1></div></div>' +
      '<div class="scroll nonav"><div class="stack">' +
      '<span style="color:var(--accent);margin:8px auto 0">' + I('mail', 44) + '</span>' +
      '<p class="hero-quote" style="text-align:center">Revisa tu correo</p>' +
      '<p class="muted" style="text-align:center">Te enviamos un enlace a <strong>' + esc(ui.confirmEmail || '') + '</strong>. Ábrelo para activar tu cuenta y después inicia sesión.</p>' +
      '<p class="tiny" style="text-align:center">¿No llega? Mira en spam o pide otro.</p>' +
      '<p id="cfMsg" class="tiny" style="text-align:center;min-height:16px"></p>' +
      '<button class="btn accent block" data-a="cfLogin">Ya lo confirmé: iniciar sesión</button>' +
      '<button class="btn ghost block" data-a="reenviar">Reenviar el correo</button>' +
      '</div></div>';
  };

  /* --------------------------------- nueva contraseña (viene del enlace) */
  V.nuevaClave = function () {
    var t = ui.showPw ? 'text' : 'password';
    return '<div class="appbar"><div class="appbar-row"><h1>Nueva contraseña</h1></div></div>' +
      '<div class="scroll nonav"><form class="stack" id="claveForm" novalidate>' +
      '<label class="field"><span>Nueva contraseña</span><span class="pwwrap">' +
      '<input class="inp" type="' + t + '" id="ncPass" autocomplete="new-password" placeholder="Mínimo 8 caracteres">' +
      '<button type="button" class="pweye" data-a="togglepw" aria-label="Ver u ocultar contraseña">' + I(ui.showPw ? 'eyeOff' : 'eye', 19) + '</button>' +
      '</span></label>' +
      '<label class="field"><span>Repítela</span>' +
      '<input class="inp" type="' + t + '" id="ncPass2" autocomplete="new-password" placeholder="Repite la contraseña"></label>' +
      '<p id="ncErr" class="tiny" style="color:var(--bad);min-height:16px"></p>' +
      '<button class="btn block" type="submit" data-a="doNuevaClave">Guardar contraseña</button>' +
      '<button class="btn ghost block" type="button" data-a="cancelarClave">Ahora no</button>' +
      '</form></div>';
  };

  /* ---------------------------------------------------------------- registro */
  V.register = function () {
    if (ui.regStep === 2) return V.profileStep();
    var t = ui.showPw ? 'text' : 'password';
    return '<div class="appbar"><div class="appbar-row">' +
      '<button class="iconbtn" data-a="go" data-s="splash" aria-label="Volver">' + I('left') + '</button>' +
      '<h1>Crear cuenta</h1></div></div>' +
      '<div class="scroll nonav"><form class="stack" id="regForm" novalidate>' +
      '<label class="field"><span>Nombre</span>' +
      '<input class="inp" id="rgName" autocomplete="given-name" placeholder="Solo tu nombre"></label>' +
      '<label class="field"><span>Correo electrónico</span>' +
      '<input class="inp" type="email" id="rgMail" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" placeholder="tu@correo.com"></label>' +
      '<p class="tiny">Te enviaremos un enlace para confirmarlo.</p>' +
      '<label class="field"><span>Contraseña</span><span class="pwwrap">' +
      '<input class="inp" type="' + t + '" id="rgPass" autocomplete="new-password" placeholder="Mínimo 8 caracteres">' +
      '<button type="button" class="pweye" data-a="togglepw" aria-label="Ver u ocultar contraseña">' + I(ui.showPw ? 'eyeOff' : 'eye', 19) + '</button>' +
      '</span></label>' +
      '<label class="field"><span>Confirmar contraseña</span>' +
      '<input class="inp" type="' + t + '" id="rgPass2" autocomplete="new-password" placeholder="Repite la contraseña"></label>' +
      '<label class="checkrow"><input type="checkbox" id="rgTerms">' +
      '<span>Acepto los <a href="#" data-a="legal" data-doc="terminos">Términos y Condiciones</a> y la <a href="#" data-a="legal" data-doc="privacidad">Política de Privacidad</a>.</span></label>' +
      '<p class="notice">Con una cuenta, tus datos se guardan también en la nube (Supabase, en EE. UU.) para sincronizarlos entre tus dispositivos. La contraseña no cifra lo que se guarda en este navegador.</p>' +
      '<p id="rgErr" class="tiny" style="color:var(--bad);min-height:16px"></p>' +
      '<button class="btn block" type="submit" data-a="doregister">Crear cuenta</button>' +
      redes() +
      '</form></div>';
  };

  V.profileStep = function () {
    var p = S.profile;
    var av = p.photo
      ? '<img class="avatar" src="' + esc(p.photo) + '" alt="Tu foto">'
      : '<div class="avatar">' + esc((S.account && S.account.name ? S.account.name : '·').charAt(0).toUpperCase()) + '</div>';
    return '<div class="appbar"><div class="appbar-row">' +
      '<h1>Tu perfil</h1>' +
      '<button class="iconbtn" data-a="enterApp" aria-label="Saltar este paso">' + I('x') + '</button></div></div>' +
      '<div class="scroll nonav"><div class="stack">' +
      '<p class="muted">Nada de esto bloquea el acceso. Puedes cambiarlo cuando quieras desde Perfil.</p>' +
      '<div class="row" style="gap:16px">' + av +
      '<div class="stack sm grow"><span class="label">Foto de perfil</span>' +
      '<label class="btn soft sm" style="align-self:flex-start">Elegir imagen' +
      '<input type="file" accept="image/*" id="pfPhoto" style="display:none"></label>' +
      (p.photo ? '<button class="btn ghost xs" style="align-self:flex-start" data-a="rmPhoto">Quitar foto</button>' : '') +
      '</div></div>' +
      '<label class="field"><span>Zona horaria</span>' +
      '<input class="inp" data-p="tz" value="' + esc(p.tz || guessTz()) + '"></label>' +
      '<div class="field"><span>Primer día de la semana</span><div class="seg3" style="grid-template-columns:1fr 1fr">' +
      '<button type="button" data-a="week" data-v="1" aria-pressed="' + (p.weekStart === 1) + '">Lunes</button>' +
      '<button type="button" data-a="week" data-v="0" aria-pressed="' + (p.weekStart === 0) + '">Domingo</button>' +
      '</div></div>' +
      '<button class="btn block" data-a="enterApp">Continuar</button>' +
      '</div></div>';
  };

  function guessTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  }
  V.guessTz = guessTz;

  /* ------------------------------------------------------------ chequeo de vida */
  V.RC_INICIAL = 5;   // donde empieza cada deslizador
  V.rc = function () {
    var a = Revision.AREAS[ui.rcStep], d = S.rcDraft || (S.rcDraft = Revision.newDraft());
    var n = Revision.AREAS.length, pct = (ui.rcStep + 1) / n * 100;

    var h = '<div class="appbar"><div class="appbar-row">' +
      (ui.rcStep > 0 ? '<button class="iconbtn" data-a="rcBack" aria-label="Anterior">' + I('left') + '</button>' : '<span style="width:38px"></span>') +
      '<h1 style="text-align:center;font-size:1.3rem">Chequeo de vida</h1>' +
      '<button class="iconbtn" data-a="rcExit" aria-label="Salir">' + I('x') + '</button></div>' +
      '<div class="stepper"><div class="track"><span style="width:' + pct + '%"></span></div>' +
      '<span class="n">' + (ui.rcStep + 1) + ' de ' + n + '</span></div></div>';

    h += '<div class="scroll nonav"><div class="stack lg">';
    h += '<p class="hero-quote" style="text-align:center;color:var(--ink-2)">' + esc(a.lead) + '</p>';
    h += '<div class="card"><div class="stack">' +
      '<div class="sect-title"><span style="font-size:1.3em">' + a.emoji + '</span>' + esc(a.title) + '</div>';

    (a.sliders || []).forEach(function (s) {
      var v = d.scores[s.k] == null ? V.RC_INICIAL : +d.scores[s.k];
      h += '<div class="stack sm">' +
        '<span style="font-size:13.5px;font-weight:600;color:var(--ink-2)">' + esc(s.q) + '</span>' +
        '<div class="row" style="gap:16px"><span class="scaleval" data-sv="' + s.k + '">' + v + '</span>' +
        '<input class="slider grow" type="range" min="1" max="10" step="1" value="' + v + '" data-rc="' + s.k + '" ' +
        'style="--v:' + ((v - 1) / 9 * 100) + '%" aria-label="' + esc(s.q) + '"></div>' +
        '<div class="scalerow"><span>1 · muy mal</span><span>10 · muy bien</span></div></div>';
    });

    if (a.adjectives) {
      h += '<label class="field"><span>Escribe 5 adjetivos que te describan hoy</span>' +
        '<input class="inp" data-rcadj value="' + esc(d.adjectives || '') + '" placeholder="tenaz, amable, impaciente, leal, alegre"></label>';
    }

    var open = ui.rcOpen ? 'true' : 'false';
    h += '<div class="acc" data-open="' + open + '"><button type="button" data-a="rcAcc">' +
      '<span class="caret">' + I('right', 17) + '</span>¿Quieres reflexionar un poco más?</button><div>';
    a.notes.forEach(function (q, i) {
      var k = a.id + '_' + i;
      h += '<label class="field"><span>' + esc(q) + '</span>' +
        '<textarea class="ta" data-rcnote="' + k + '" placeholder="Escribe lo que se te ocurra…">' + esc(d.notes[k] || '') + '</textarea></label>';
    });
    h += '</div></div>';

    h += '</div></div>';
    h += '<button class="btn block" data-a="rcNext">' + (ui.rcStep === n - 1 ? 'Ver mi resumen' : 'Siguiente →') + '</button>';
    h += '<p class="tiny" style="text-align:center">Puedes salir cuando quieras: lo que respondas se guarda solo.</p>';
    h += '</div></div>';
    return h;
  };

  /* ------------------------------------------------------- resumen del check */
  V.rcsum = function (fromHistory) {
    var r = fromHistory || Revision.last();
    if (!r) return V.rc();
    var avg = Revision.avg(r);
    var rows = S.cats.map(function (c) {
      var v = Revision.cat(r, c.id);
      return { c: c, v: v };
    });
    var weak = rows.filter(function (x) { return x.v != null; }).sort(function (a, b) { return a.v - b.v; }).slice(0, 2);

    var h = '<div class="appbar"><div class="appbar-row">' +
      '<h1>Tu foto de hoy</h1>' +
      '<button class="iconbtn" data-a="tab" data-t="hoy" aria-label="Cerrar">' + I('x') + '</button>' +
      '</div><span class="sub">Chequeo del ' + esc(Fmt.fmt(r.date)) + '</span></div>';

    h += '<div class="scroll nonav"><div class="stack lg">';
    h += '<div class="card"><div class="stack">' + Fmt.radar(r) +
      '<div class="row" style="justify-content:center;gap:10px">' +
      '<span class="pill accent num">Media ' + avg + '/10</span>' +
      '<span class="pill num">' + Fmt.plural(rows.filter(function (x) { return x.v != null; }).length, 'área medida', 'áreas medidas') + '</span>' +
      '</div></div></div>';

    h += '<div class="card"><div class="stack"><div class="sect-title">' + I('chart') + 'Área por área</div><div class="barlist">';
    rows.forEach(function (x) {
      var v = x.v == null ? 0 : x.v;
      h += '<div class="barrow"><span class="bl">' + esc(x.c.emoji) + ' ' + esc(x.c.name.split(' (')[0]) + '</span>' +
        '<span class="bar grow"><span style="width:' + (v * 10) + '%;background:' + esc(x.c.color) + '"></span></span>' +
        '<span class="bv num" style="color:' + (x.v == null ? 'var(--ink-2)' : 'var(--ink)') + '">' + (x.v == null ? '—' : (Math.round(v * 10) / 10)) + '</span></div>';
    });
    h += '</div></div></div>';

    if (weak.length) {
      h += '<div class="card sunk"><div class="stack sm"><div class="label">Lo que más pide atención</div>' +
        '<p style="font-size:14px;line-height:1.55">Hoy tus dos áreas más bajas son <strong>' +
        weak.map(function (w) { return esc(w.c.name.split(' (')[0]); }).join('</strong> y <strong>') +
        '</strong>. No hace falta arreglarlo todo: empieza por una.</p>' +
        // del diagnóstico a la acción. Si se llegó desde la bienvenida («No lo tengo
        // claro»), se elige por qué área empezar y se sigue allí; si no, una meta en
        // esa área (o la que ya hay)
        '<div class="row" style="gap:8px;flex-wrap:wrap">' + weak.map(function (w) {
          var n = w.c.name.split(' (')[0], g = S.goalsS.filter(function (x) { return x.cat === w.c.id && !x.done; })[0];
          if (!Bienvenida.datos().done) return '<button class="btn accent sm" data-a="bvDesdeChequeo" data-c="' + esc(w.c.id) + '">' + esc(w.c.emoji) + ' Empezar por ' + esc(n) + '</button>';
          return g ? '<button class="btn ghost sm" data-a="openGoal" data-k="S" data-id="' + esc(g.id) + '">' + esc(w.c.emoji) + ' Ver tu meta de ' + esc(n) + '</button>'
            : '<button class="btn ghost sm" data-a="metaDeArea" data-c="' + esc(w.c.id) + '">' + I('plus', 15) + 'Una meta en ' + esc(n) + '</button>';
        }).join('') + '</div>' +
        (!Bienvenida.datos().done ? '<button class="btn ghost sm" data-a="bvSeguir" style="align-self:flex-start">Prefiero elegir otra área</button>' : '') +
        '</div></div>';
    }

    if (S.rc.length > 1 && !fromHistory) {
      var prev = S.rc[S.rc.length - 2], d = Math.round((avg - Revision.avg(prev)) * 10) / 10;
      h += '<div class="card flat"><div class="spread"><span class="muted">Frente a tu chequeo anterior (' + esc(Fmt.fmt(prev.date)) + ')</span>' +
        '<span class="pill ' + (d > 0 ? 'good' : d < 0 ? 'bad' : '') + ' num">' + (d > 0 ? I('up', 13) + '+' : d < 0 ? I('down', 13) : '') + (d === 0 ? '0' : d) + '</span></div></div>';
    }

    var hasFuture = false;
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) hasFuture = true; });
    if (!hasFuture) {
      h += '<button class="btn accent block" data-a="go" data-s="future">Ahora di a dónde quieres llegar' + I('arrowRight', 19) + '</button>';
      h += '<p class="tiny" style="text-align:center">O cierra y sigue con tu día: el chequeo ya está guardado.</p>';
    } else {
      h += '<button class="btn block" data-a="tab" data-t="hoy">Volver a Hoy</button>';
    }
    h += '</div></div>';
    return h;
  };

  /* -------------------------------------------------------- mi yo del futuro */
  V.future = function () {
    var done = 0;
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) done++; });

    var h = '<div class="appbar"><div class="appbar-row">' +
      '<h1>Mi Yo del Futuro</h1>' +
      '<button class="iconbtn" data-a="tab" data-t="vision" aria-label="Cerrar">' + I('x') + '</button></div>' +
      '<span class="sub">Elige las áreas que quieres construir para la vida que imaginaste.</span></div>';

    h += '<div class="scroll nonav"><div class="stack">';
    S.cats.forEach(function (c) {
      var f = S.future[c.id] || {};
      h += '<button class="goal" data-a="openFuture" data-c="' + esc(c.id) + '">' +
        '<span class="thumb" style="background:' + esc(c.color) + '22">' + esc(c.emoji) + '</span>' +
        '<span class="grow"><span class="gname" style="display:block">' + esc(c.name) + '</span>' +
        '<span class="muted" style="display:block;margin-top:3px;font-size:12.5px">' +
        (f.goal ? '“' + esc(f.goal) + '”' : 'Cómo quiero sentirme y vivir aquí') + '</span></span>' +
        (f.goal ? '<span class="pill good">' + I('check', 13) + '</span>' : '<span class="tiny">' + I('plus', 16) + '</span>') +
        '</button>';
    });
    h += '<p class="tiny" style="text-align:center">' + done + ' de ' + S.cats.length + ' áreas definidas. Con una ya puedes seguir.</p>';
    h += '<button class="btn accent block" data-a="go" data-s="vs">Ver Hoy frente a En 5 años' + I('arrowRight', 19) + '</button>';
    h += '<button class="btn ghost block" data-a="saveFutureOnly">Guardar y salir</button>';
    h += '</div></div>';
    return h;
  };

  /* ------------------------------------------------- hoy vs dentro de 5 años */
  V.vs = function () {
    var r = Revision.last();
    var words = [];
    if (r) {
      if (r.adjectives) words = r.adjectives.split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 5);
      if (!words.length) {
        S.cats.forEach(function (c) {
          var v = Revision.cat(r, c.id);
          if (v != null && v <= 5) words.push(c.name.split(' (')[0].toLowerCase());
        });
        words = words.slice(0, 4);
      }
    }
    var fut = [];
    S.cats.forEach(function (c) { if (S.future[c.id] && S.future[c.id].goal) fut.push({ c: c, g: S.future[c.id].goal }); });

    var h = '<div class="appbar"><div class="appbar-row"><h1>Tu transformación</h1></div>' +
      '<span class="sub">Aquí estás hoy. Aquí quieres estar en 5 años.</span></div>';

    h += '<div class="scroll nonav"><div class="stack lg">';
    h += '<div class="vs">' +
      '<div><div class="vt">Hoy</div>' +
      (r ? Fmt.ring(Revision.avg(r) * 10, 92, 'var(--accent)', '<b>' + Revision.avg(r) + '</b><small>de 10</small>') : '<p class="tiny">Sin datos</p>') +
      '<div class="chips" style="margin-top:12px">' +
      (words.length ? words.map(function (w) { return '<span class="pill">' + esc(w) + '</span>'; }).join('') : '<span class="tiny">Sin palabras clave</span>') +
      '</div></div>' +
      '<div><div class="vt">En 5 años</div>' +
      (fut.length
        ? '<div class="stack sm">' + fut.slice(0, 4).map(function (f) {
            return '<div class="row" style="gap:7px;align-items:flex-start"><span>' + esc(f.c.emoji) + '</span>' +
              '<span style="font-size:12.5px;line-height:1.4">' + esc(f.g) + '</span></div>';
          }).join('') + (fut.length > 4 ? '<span class="tiny">y ' + (fut.length - 4) + ' más</span>' : '') + '</div>'
        : '<p class="tiny">Aún no definiste tus metas de 5 años.</p>') +
      '</div></div>';

    h += '<div class="card"><div class="stack sm">' +
      '<div class="sect-title">' + I('target') + '¿Qué paso pequeño podrías dar esta semana?</div>' +
      '<p class="muted">Lo convertimos en tu primera meta de corto plazo, con fecha para dentro de 7 días.</p>' +
      '<input class="inp" id="firstStep" value="' + esc(S.firstStep || '') + '" placeholder="Ej. Apuntarme al gimnasio y ir dos veces">' +
      '</div></div>';

    h += '<button class="btn accent block" data-a="finishOnboarding">Guardar y volver a Hoy' + I('arrowRight', 19) + '</button>';
    h += '</div></div>';
    return h;
  };

  V.screen('splash', V.splash);
  V.screen('login', V.login);
  V.screen('register', V.register);
  V.screen('nuevaClave', V.nuevaClave);
  V.screen('confirmar', V.confirmar);
  V.screen('rc', V.rc);
  V.screen('rcsum', function () { return V.rcsum(UIState.viewRC); });
  V.screen('future', V.future);
  V.screen('vs', V.vs);
})();
