/* ==========================================================================
   Pestaña PERFIL — cuenta, seguridad, preferencias, respaldo y legal.
   Listas agrupadas con filete en lugar de una pila de tarjetas iguales.
   ========================================================================== */
(function () {
  'use strict';
  var S = Datos.estado(), esc = Fmt.esc;

  // Secciones de Perfil plegables, como las rutinas: abiertas solo las que
  // se usan; lo que eliges queda recordado en este dispositivo.
  function pfOpen() {
    var u = UIState;
    if (!u.pfOpen) {
      u.pfOpen = Preferencias.get('perfil.abiertas', null);
      if (!u.pfOpen || typeof u.pfOpen !== 'object') u.pfOpen = { Cuenta: true };
    }
    return u.pfOpen;
  }
  function sect(label, inner, extra) {
    var open = !!pfOpen()[label];
    return '<div class="sect"><button class="fold-head" data-a="pfSect" data-v="' + esc(label) + '" aria-expanded="' + open + '">' +
      '<span class="label">' + label + '</span>' + I(open ? 'down' : 'right', 17) + '</button>' +
      (open ? (extra ? '<div>' + extra + '</div>' : '') + inner : '') + '</div>';
  }
  function link(icon, text, action, extra) {
    return '<button class="listrow" data-a="' + action + '"' + (extra || '') + '>' +
      I(icon, 19) + '<span class="grow">' + text + '</span>' + I('right', 17) + '</button>';
  }

  V.perfil = function () {
    var a = S.account, p = S.profile;
    var name = (a && a.name) ? a.name : 'Tu cuenta';
    var av = p.photo
      ? '<img class="avatar" src="' + esc(p.photo) + '" alt="Tu foto">'
      : '<div class="avatar">' + ((a && a.name) ? esc(String(name).charAt(0).toUpperCase()) : I('user', 26)) + '</div>';

    var h = '<div class="appbar bordered"><div class="appbar-row">' +
      '<button class="iconbtn" data-a="tab" data-t="hoy" aria-label="Volver a Hoy">' + I('left') + '</button>' +
      '<h1>Perfil</h1></div></div>';
    h += '<div class="scroll"><div class="page">';

    /* --- cabecera, sin tarjeta --- */
    h += '<div class="row" style="gap:16px;padding-top:4px">' + av +
      '<div class="grow" style="min-width:0">' +
      '<div style="font-family:var(--disp);font-size:1.5rem;font-weight:600;line-height:1.15;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(name) + '</div>' +
      '<div class="tiny" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(Fmt.cuenta(a)) + '</div></div>' +
      '<label class="btn soft xs">' + I('image', 14) + 'Foto<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" id="pfPhoto2" style="display:none"></label>' +
      '</div>';

    /* --- cuenta --- */
    h += sect('Cuenta',
      '<div class="list"><div class="listpad">' +
      '<label class="field"><span>Nombre de usuario</span><input class="inp" data-f="acName" value="' + esc(a ? a.name : '') + '" placeholder="Tu nombre"></label>' +
      (a && (a.login === 'tel' || a.login === 'usuario')
        ? '<label class="field" style="margin-top:12px"><span>Correo de contacto (opcional)</span><input class="inp" type="email" data-f="acMail" value="' + esc(a.email) + '" placeholder="tu@correo.com"></label>'
        // es con el que se entra y el que confirmó: cambiarlo aquí lo desconectaría de la nube
        : '<label class="field" style="margin-top:12px"><span>Correo</span><input class="inp" type="email" value="' + esc(a ? a.email : '') + '" readonly aria-readonly="true"></label>' +
          '<p class="tiny">Es el correo con el que entras. Para cambiarlo, escríbenos a avanzayaapp@gmail.com.</p>') +
      '<button class="btn sm" data-a="saveAccount" style="margin-top:14px">Guardar cambios</button>' +
      '</div></div>');

    /* --- seguridad --- */
    h += sect('Seguridad',
      '<div class="list">' +
      link('lock', (a && a.pass) ? 'Cambiar contraseña' : 'Crear contraseña', 'sheetPass') +
      link('shield', 'Cómo se protege tu cuenta', 'sheetDoc', ' data-doc="seguridad"') +
      '</div>');

    /* --- apariencia --- */
    var th = (S.prefs.theme || 'auto');
    h += sect('Apariencia',
      '<div class="seg3">' +
      '<button data-a="theme" data-v="auto" aria-pressed="' + (th === 'auto') + '">' + I('monitor', 19) + 'Automático</button>' +
      '<button data-a="theme" data-v="light" aria-pressed="' + (th === 'light') + '">' + I('sun', 19) + 'Claro</button>' +
      '<button data-a="theme" data-v="dark" aria-pressed="' + (th === 'dark') + '">' + I('moon', 19) + 'Oscuro</button>' +
      '</div>' +
      '<div class="list"><div class="listrow">' + I('bell', 19) +
      '<span class="grow">Recordatorios dentro de la app</span>' +
      '<button class="switch" role="switch" aria-checked="' + (!!S.prefs.notifs) + '" data-a="notifs" aria-label="Recordatorios"><i></i></button>' +
      '</div></div>');

    /* --- notificaciones (push real, con la app cerrada) --- */
    var rs = Recordatorio.estado();
    var hasAcc = !!(a && (a.nube || a.email));
    var canPush = rs.supported && hasAcc;
    var pushHint = !rs.supported ? 'Este navegador no admite notificaciones push.'
      : !hasAcc ? 'Necesitas una cuenta con sincronización activada para usarlo.'
      : rs.active ? 'Te avisamos a esta hora aunque tengas la app cerrada.'
      : 'Elige una hora y te avisamos aunque tengas la app cerrada.';
    h += sect('Recordatorio diario',
      '<div class="list"><div class="listrow">' + I('bell', 19) +
      '<span class="grow">Avisar aunque la app esté cerrada</span>' +
      '<button class="switch" role="switch" aria-checked="' + (!!rs.active) + '" data-a="pushReminder" aria-label="Recordatorio diario"' + (canPush ? '' : ' disabled') + '><i></i></button>' +
      '</div>' +
      (rs.active ? '<div class="listpad"><label class="field"><span>Hora</span><input class="inp" type="time" id="pushHour" value="' + esc(String(rs.hour || 20).padStart(2, '0') + ':00') + '"></label></div>' : '') +
      '</div>' +
      '<p class="tiny">' + pushHint + '</p>');

    /* --- uso --- */
    h += sect('Uso',
      '<div class="list"><div class="listpad">' +
      '<div class="field"><span>Primer día de la semana</span>' +
      '<div class="seg3" style="grid-template-columns:1fr 1fr;margin-top:5px">' +
      '<button data-a="week" data-v="1" aria-pressed="' + (p.weekStart === 1) + '">Lunes</button>' +
      '<button data-a="week" data-v="0" aria-pressed="' + (p.weekStart === 0) + '">Domingo</button>' +
      '</div></div>' +
      '<label class="field" style="margin-top:14px"><span>Zona horaria</span>' +
      '<input class="inp" data-p="tz" value="' + esc(p.tz || V.guessTz()) + '"></label>' +
      '</div></div>');

    /* --- áreas de vida --- */
    h += sect('Áreas de vida',
      '<p class="muted">Se usan en el chequeo de vida, en las metas y en el progreso. El emoji lo eliges tú.</p>' +
      '<div class="list">' +
      S.cats.map(function (c) {
        return '<div class="listrow" style="padding:8px 10px 8px 12px">' +
          '<input class="inp-plain" style="width:42px;flex:none;text-align:center;font-size:19px" data-f="catEmoji" data-id="' + esc(c.id) + '" value="' + esc(c.emoji) + '" maxlength="4" aria-label="Emoji del área">' +
          '<span class="grow"><input class="inp-plain" data-f="catName" data-id="' + esc(c.id) + '" value="' + esc(c.name) + '"></span>' +
          '<span class="catdot" style="background:' + esc(c.color) + ';width:13px;height:13px"></span>' +
          (S.cats.length > 1 ? '<button class="delbtn" data-a="catDel" data-id="' + esc(c.id) + '" aria-label="Eliminar área">' + I('trash', 17) + '</button>' : '') +
          '</div>';
      }).join('') +
      '</div>',
      '<button class="btn ghost xs" data-a="newCat">' + I('plus', 14) + 'Nueva</button>');

    /* --- respaldo --- */
    h += sect('Respaldo',
      '<div class="list">' + link('save', 'Copia de seguridad', 'sheetBackup') + '</div>' +
      '<p class="tiny">Si tienes cuenta, tus datos ya se sincronizan con la nube. Esta copia es, además, un texto con todo lo tuyo para guardarlo donde quieras o pasarlo a otro dispositivo. «Borrar todo» solo borra este navegador.</p>');

    /* --- soporte y legal --- */
    h += sect('Soporte',
      '<div class="list">' +
      link('help', 'Cómo funciona la app', 'sheetDoc', ' data-doc="ayuda"') +
      link('mail', 'Enviar feedback', 'sheetDoc', ' data-doc="feedback"') +
      link('file', 'Términos y condiciones', 'sheetDoc', ' data-doc="terminos"') +
      link('lock', 'Política de privacidad', 'sheetDoc', ' data-doc="privacidad"') +
      '</div>');

    // dice lo que de verdad pasa: tener cuenta no significa estar conectada a la nube
    var dondeEsta = !a || !(a.nube || a.email) ? 'de momento se guarda en este dispositivo'
      : Nube.sync().conectada() ? 'sincronizado con tu cuenta en la nube'
      : 'sin conexión con la nube: de momento se guarda en este dispositivo';
    h += '<div class="sect">' +
      '<button class="btn danger block" data-a="logout">' + I('logout', 18) + 'Cerrar sesión</button>' +
      '<button class="btn ghost block" data-a="sheetEliminar" style="color:var(--bad)">' + I('trash', 17) + 'Eliminar cuenta</button>' +
      '<p class="tiny" style="text-align:center">Brújula de Vida · ' + dondeEsta + '</p></div>';

    h += '</div></div>';
    return h;
  };

  // Perfil no sale en la barra: se abre desde la foto y cuenta como parte de Hoy
  V.tab({ id: 'perfil', label: 'Perfil', icon: 'user', view: V.perfil, inBar: false, parent: 'hoy' });
})();
