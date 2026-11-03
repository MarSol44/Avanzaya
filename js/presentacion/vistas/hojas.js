/* ==========================================================================
   Hojas emergentes: detalle de meta (Pasos / Detalles), Mi Yo del Futuro,
   imágenes y frases de Visión, respaldo, contraseña, categorías y documentos.
   ========================================================================== */
(function () {
  'use strict';
  var S = Datos.estado(), ui = UIState, esc = Fmt.esc;

  // Textos legales y de seguridad. Describen la versión que se publica: si
  // cambia lo que la app envía o guarda fuera del navegador, hay que cambiarlos.
  var CONTACTO = 'avanzayaapp@gmail.com';
  var DOCS = {
    terminos: ['file', 'Términos y condiciones',
      'Brújula de Vida (Avanzaya) es una herramienta personal para organizar tus metas, rutinas y tu visión.\n\n' +
      '1. Para usarla necesitas una cuenta: con tu correo y una contraseña (el correo se confirma con un enlace), o entrando con Google o Facebook.\n' +
      '2. Tus datos se guardan en este dispositivo y también en la nube, para sincronizarlos entre tus dispositivos. Cómo y dónde, en la Política de privacidad.\n' +
      '3. Si olvidas la contraseña, puedes crear otra con el enlace que te enviamos a tu correo.\n' +
      '4. La contraseña de la app protege el acceso a la app, no cifra tus datos. Lee «Cómo se protege tu cuenta» en Perfil.\n' +
      '5. La app es gratuita y se ofrece tal cual, sin garantía de disponibilidad ni de conservación de tus datos. Haz copias de seguridad desde Perfil.\n' +
      '6. No es asesoramiento médico, psicológico ni financiero. Es un cuaderno con estructura.\n' +
      '7. Puedes dejar de usarla cuando quieras. En Perfil › Eliminar cuenta se borran tu cuenta, tu copia en la nube y los datos de este dispositivo. «Borrar todo» (Perfil › Copia de seguridad) borra solo los datos de este navegador.\n' +
      '8. Contacto: ' + CONTACTO + '.'],
    privacidad: ['lock', 'Política de privacidad',
      'Responsable: Brújula de Vida (Avanzaya). Contacto: ' + CONTACTO + '.\n\n' +
      'TU CUENTA (con correo, o con Google o Facebook)\n' +
      '• Lo que escribes (metas, rutinas, notas, fotos del tablero y ajustes) se guarda en el almacenamiento de este navegador y en tu copia en la nube.\n' +
      '• Sincronización: una copia de todos tus datos de la app se guarda en Supabase, nuestro proveedor de base de datos, en servidores de Estados Unidos (Oregón). Incluye las fotos del tablero, tu nombre, tu correo y la versión protegida (derivada) de tu contraseña de la app, nunca la contraseña en sí.\n' +
      '• Quién puede verla: desde la app, solo tu cuenta. El proveedor y quien administra el proyecto pueden acceder técnicamente a la base de datos: la copia va cifrada en la conexión (HTTPS), pero no está cifrada de extremo a extremo.\n' +
      '• Inicio de sesión: Supabase guarda tu correo y su propia versión protegida de tu contraseña, y nos envía por ti los correos para confirmar la cuenta y para cambiar la contraseña.\n' +
      '• Google y Facebook (solo si entras con ellos): nos confirman tu correo (si lo compartes) y tu nombre; Google o Meta ven que usas su cuenta para entrar aquí.\n' +
      '• Recordatorio diario (solo si lo activas): guardamos la suscripción de notificaciones de tu navegador, la hora que eliges y tu zona horaria. El aviso llega a través del servicio de notificaciones de tu navegador (Google, Apple o Mozilla).\n' +
      '• Resumen semanal por correo: todavía no está activo. Si se activa, usará el servicio Resend con tu correo y las cifras de tu semana, y lo diremos aquí antes.\n\n' +
      'EN TODOS LOS CASOS\n' +
      '• El sitio se sirve desde Cloudflare y las tipografías desde Google Fonts: como en cualquier web, reciben tu dirección IP y datos técnicos de la conexión.\n' +
      '• No hay analítica, ni publicidad, ni cookies de seguimiento.\n' +
      '• Usamos tus datos solo para que la app funcione y estén en tus dispositivos. No los vendemos ni los compartimos para otros fines.\n' +
      '• Tu copia de seguridad (Perfil › Copia de seguridad) es un texto con todos tus datos, incluida la versión protegida de tu contraseña: guárdala en un sitio seguro.\n\n' +
      'TUS DERECHOS\n' +
      '• Puedes ver y exportar todo desde Perfil › Copia de seguridad, y corregirlo desde la propia app.\n' +
      '• Perfil › Eliminar cuenta borra para siempre tu cuenta, tu copia en la nube, tus recordatorios y los datos de este dispositivo. «Borrar todo» borra solo los datos de este navegador.'],
    seguridad: ['shield', 'Cómo se protege tu cuenta',
      'Lo primero, con claridad: la contraseña de la app NO cifra tus datos. Sirve para que no se pueda entrar en tu cuenta desde la pantalla de inicio sin saberla, pero lo que escribes se guarda tal cual, sin cifrar, en el almacenamiento de este navegador. Quien tenga acceso a este dispositivo y sepa usar las herramientas del navegador puede leerlo, como un cuaderno sobre la mesa. Si tienes cuenta, la copia en la nube va cifrada en la conexión, pero tampoco está cifrada de extremo a extremo.\n\n' +
      'Por eso: usa una contraseña distinta de la de tu correo, bloquea tu teléfono con PIN o huella, y no guardes aquí datos muy sensibles (contraseñas, datos bancarios, detalles médicos).\n\n' +
      'Lo que sí está hecho:\n\n' +
      '• Contraseña — se deriva con PBKDF2-SHA256, 210.000 iteraciones y una sal aleatoria de 16 bytes. Nunca se guarda lo que escribes. Si tienes cuenta, la contraseña también viaja por HTTPS a Supabase, que guarda su propia versión protegida para iniciar sesión en la nube.\n' +
      '• Comparación — en tiempo constante, para no filtrar información por lo que tarda en responder.\n' +
      '• Reglas — mínimo 8 caracteres, se rechazan las más usadas y las secuencias obvias.\n' +
      '• Fuerza bruta — tras cinco fallos seguidos hay que esperar, y la espera se dobla en cada intento.\n' +
      '• Sesión — caduca tras 14 días sin abrir la app; si no marcas «mantener la sesión», al cerrar la pestaña.\n' +
      '• Cambio de contraseña — pide la actual y cierra la sesión, para que haya que volver a entrar.\n' +
      '• Varias cuentas en un dispositivo — cada una tiene su espacio: entrar en una nunca muestra los datos de otra.\n' +
      '• Si olvidas la contraseña — en «¿Olvidaste tu contraseña?» te enviamos un enlace a tu correo para crear otra. Si tu cuenta usa Google o Facebook, entra con ellos.\n' +
      '• Correo confirmado — la cuenta no se abre hasta que confirmas el correo con el enlace que te enviamos: nadie puede registrarse con un correo que no es suyo.\n' +
      '• Mensajes de error — nunca dicen si falló el correo o la contraseña.\n' +
      '• Nube — cada cuenta solo puede leer y escribir su propia copia (reglas de seguridad por fila en la base de datos), y todo viaja por HTTPS.\n' +
      '• Aleatoriedad — todos los identificadores salen de crypto.getRandomValues, no de Math.random, y no son correlativos.\n' +
      '• Imágenes — se comprueba tipo, peso y tamaño, se rechazan los SVG (pueden llevar scripts) y todo se recodifica a JPEG, lo que descarta los metadatos EXIF.\n' +
      '• Respaldos — el texto que pegas se valida campo a campo contra un esquema estricto antes de tocar nada.\n' +
      '• Código — la app solo ejecuta scripts servidos desde su propio sitio (la librería de Supabase va incluida) y la política de seguridad del navegador bloquea los de otros sitios. No se usa eval.'],
    ayuda: ['help', 'Cómo funciona',
      '1. Hoy — es la pantalla de inicio. Marca la rutina de día y la de noche y tu racha empieza a contar. Con eso solo, la app ya sirve.\n\n' +
      '2. Chequeo de vida — ocho pantallas cortas para medir cómo estás en cada área. Repítelo cada pocos meses; el historial te muestra si subes o bajas.\n\n' +
      '3. Mi Yo del Futuro — una frase por área sobre dónde quieres estar en 5 años. De ahí sale tu Visión.\n\n' +
      '4. Metas — corto plazo (menos de 1 año) y largo plazo. Dentro de cada una defines los pasos; el porcentaje sale solo de los pasos marcados.\n\n' +
      '5. Pasos a metas — cuando un paso de una meta de largo plazo tiene fecha a menos de un año, puedes convertirlo en meta de corto plazo con un botón.\n\n' +
      '6. Sincronizar — reparte los pasos de una meta por el calendario para que aparezcan el día que toca. El calendario vive dentro de la app: no se conecta con Google Calendar.\n\n' +
      '7. Rutinas — marca la rutina de día y la de noche; el calendario se pinta de verde, ámbar o rojo según lo que cumplas, y de ahí sale tu racha.\n\n' +
      'Consejo: haz una copia de seguridad de vez en cuando desde Perfil.'],
    feedback: ['mail', 'Enviar feedback',
      'La app no envía tus comentarios a ninguna parte por sí sola.\n\n' +
      'Apúntalos aquí abajo: se guardan con el resto de tus datos (y, si tienes cuenta, en tu copia en la nube). Para hacérnoslos llegar, escríbenos a ' + CONTACTO + '.']
  };

  var COLORS = ['#5b6ee1', '#e07a45', '#d9527a', '#c9971f', '#2f9268', '#3d9bb0', '#7a63d6', '#b06ab8'];

  function head(icon, title, extra) {
    return '<div class="sheet-head"><div class="grabber"></div>' +
      '<div class="appbar-row">' + (icon ? '<span style="color:var(--ink-3)">' + I(icon, 21) + '</span>' : '') +
      '<h1>' + title + '</h1>' +
      '<button class="iconbtn" data-a="closeSheet" aria-label="Cerrar">' + I('x') + '</button></div>' +
      (extra || '') + '</div>';
  }

  /* ------------------------------------------------------------ meta: hoja */
  function goalSheet(k, id) {
    var g = Goals.find(k, id);
    if (!g) return head('target', 'Meta') + '<div class="sheet-body"><p class="muted">Esta meta ya no existe.</p></div>';
    var isS = k === 'S';

    var tabs = '<div class="seg" role="tablist">' +
      '<button role="tab" aria-selected="' + (ui.sheetTab === 'steps') + '" data-a="sheetTab" data-s="steps">Pasos' + (g.steps && g.steps.length ? ' · ' + g.steps.filter(function (s) { return s.done; }).length + '/' + g.steps.length : '') + '</button>' +
      '<button role="tab" aria-selected="' + (ui.sheetTab === 'desc') + '" data-a="sheetTab" data-s="desc">Detalles</button></div>';

    var h = head('', esc(g.name || (isS ? 'Meta a corto plazo' : 'Meta a largo plazo')), tabs);
    h += '<div class="sheet-body">';

    if (ui.sheetTab === 'desc') {
      h += '<label class="field"><span>Nombre</span>' +
        '<input class="inp" data-f="gname" data-k="' + k + '" data-id="' + esc(id) + '" value="' + esc(g.name || '') + '" placeholder="¿Qué quieres conseguir?"></label>';

      h += '<label class="field"><span>' + (isS ? 'Motivación' : 'Por qué') + '</span>' +
        '<textarea class="ta" data-f="gmot" data-k="' + k + '" data-id="' + esc(id) + '" placeholder="' +
        (isS ? '¿Por qué esta meta y no otra?' : '¿Qué cambia en tu vida si lo consigues?') + '">' + esc(g.motivation || '') + '</textarea></label>';

      if (isS) {
        h += '<label class="field"><span>Recompensa</span>' +
          '<input class="inp" data-f="grew" data-k="S" data-id="' + esc(id) + '" value="' + esc(g.reward || '') + '" placeholder="¿Cómo lo vas a celebrar?"></label>';
      }

      h += '<label class="field"><span>' + (isS ? 'Plazo' : 'Fecha límite') + '</span>' +
        '<input class="inp" type="date" data-f="gdue" data-k="' + k + '" data-id="' + esc(id) + '" value="' + esc(g.due || '') + '"></label>';

      h += '<label class="field"><span>Categoría</span>' +
        '<select class="sel" data-f="gcat" data-k="' + k + '" data-id="' + esc(id) + '">' + Fmt.catOptions(g.cat) + '</select></label>';

      if (isS) {
        h += '<div class="field"><span>Prioridad</span><div class="seg3" style="margin-top:4px">' +
          ['Alta', 'Media', 'Baja'].map(function (p) {
            return '<button data-a="gprio" data-id="' + esc(id) + '" data-v="' + p + '" aria-pressed="' + (g.priority === p) + '">' +
              '<span class="catdot" style="width:11px;height:11px;background:var(--' + (p === 'Alta' ? 'bad' : p === 'Media' ? 'warn' : 'good') + ')"></span>' + p + '</button>';
          }).join('') + '</div></div>';
      }

      var d = Fmt.due(g.due, g.done);
      h += '<div class="card sunk"><div class="spread"><span class="muted">Estado</span>' +
        '<span class="pill ' + d.cls + '">' + (d.cls === 'bad' ? I('flame', 13) : '') + esc(d.txt) + '</span></div></div>';

    } else {
      var steps = g.steps || (g.steps = []);
      h += '<p class="tiny">El porcentaje de la meta sale de los pasos que marques aquí.' +
        (isS ? '' : ' Un paso con fecha a menos de un año puede pasar a ser una meta de corto plazo.') + '</p>';

      if (!steps.length) {
        h += '<div class="empty" style="padding:18px 0"><span class="ee">' + I('ladder', 30) + '</span><p>Sin pasos todavía. Divide la meta en trozos que quepan en una tarde.</p></div>';
      } else {
        h += '<div class="steps">';
        steps.forEach(function (s) {
          var near = s.due && Dates.diff(Dates.today(), s.due) >= 0 && Dates.diff(Dates.today(), s.due) < 365;
          h += '<div class="step' + (s.done ? ' done' : '') + '">' +
            '<button class="chk sm" role="checkbox" aria-checked="' + !!s.done + '" data-a="stepDone" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" aria-label="Marcar paso">' + I('check', 15) + '</button>' +
            '<span class="sfields">' +
            // el nombre se lee entero: crece en líneas en vez de cortarse
            '<textarea class="inp-plain sname" rows="1" style="font-weight:600" data-f="sname" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" placeholder="Nombre del paso" aria-label="Nombre del paso">' + esc(s.name || '') + '</textarea>' +
            '<input class="inp-plain" style="font-size:12.5px;color:var(--ink-2)" data-f="sdesc" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" value="' + esc(s.desc || '') + '" placeholder="Añadir una nota" aria-label="Nota del paso">' +
            '<span class="row" style="gap:8px;margin-top:5px">' +
            '<input class="inp-plain fecha" type="date" data-f="sdue" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" value="' + esc(s.due || '') + '" aria-label="Fecha del paso">' +
            (!isS && near ? '<button class="btn ghost xs" data-a="promote" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '">' + I('upRight', 14) + 'A corto plazo</button>' : '') +
            '</span></span>' +
            '<button class="delbtn" data-a="stepDel" data-k="' + k + '" data-id="' + esc(id) + '" data-s="' + esc(s.id) + '" aria-label="Eliminar paso" title="Eliminar paso">' + I('trash', 17) + '</button>' +
            '</div>';
        });
        h += '</div>';
      }
      h += '<div class="addbar"><input class="addbar-inp" data-add="step" placeholder="Añadir un paso" aria-label="Nuevo paso" enterkeyhint="done">' +
        '<button class="addbar-go" data-a="stepAdd" data-k="' + k + '" data-id="' + esc(id) + '" aria-label="Añadir paso">' + I('plus', 18) + '</button></div>';
      h += '<button class="btn ghost sm" data-a="sync" data-k="' + k + '" data-id="' + esc(id) + '" style="align-self:flex-start">' + I('refresh', 16) + 'Poner los pasos en el calendario</button>';
    }

    h += '<div class="divider"></div>' +
      '<div class="row" style="gap:8px">' +
      // todo se guarda según se escribe: «Listo» cierra; borrar es secundario y pide confirmar
      '<button class="btn danger" data-a="gdelSheet" data-k="' + k + '" data-id="' + esc(id) + '">' + I('trash', 17) + 'Eliminar</button>' +
      '<button class="btn grow" data-a="closeSheet">Listo</button></div>';
    h += '</div>';
    return h;
  }

  /* -------------------------------------------------- mi yo del futuro: hoja */
  function futureSheet(cid) {
    var c = Areas.get(cid), f = S.future[cid] || {};
    return head('', esc(c ? c.emoji + '  ' + c.name : 'Área')) +
      '<div class="sheet-body">' +
      '<label class="field"><span>En 5 años quiero…</span>' +
      '<textarea class="ta" data-f="fgoal" data-c="' + esc(cid) + '" placeholder="Una sola frase. Concreta y en presente.">' + esc(f.goal || '') + '</textarea></label>' +
      '<label class="field"><span>¿Por qué esto importa? (opcional)</span>' +
      '<textarea class="ta" data-f="fwhy" data-c="' + esc(cid) + '" placeholder="Lo que te vas a decir el día que te dé pereza.">' + esc(f.why || '') + '</textarea></label>' +
      '<button class="btn block" data-a="saveFuture">Guardar</button>' +
      metasDeArea(cid) +
      (f.goal ? '<button class="btn danger block" data-a="clearFuture" data-c="' + esc(cid) + '">Borrar esta área</button>' : '') +
      '</div>';
  }
  // Lo que se escribe aquí es para dentro de 5 años; las metas, lo que se hace
  // ahora para llegar. Se ven juntas y se puede pasar de una a otra.
  function metasDeArea(cid) {
    var h = '<div class="divider"></div><span class="label">Tus metas en esta área</span>', n = 0;
    [['S', S.goalsS], ['L', S.goalsL]].forEach(function (x) {
      x[1].forEach(function (g) {
        if (g.cat !== cid || g.done) return;
        n++;
        h += '<button class="listrow" data-a="openGoal" data-k="' + x[0] + '" data-id="' + esc(g.id) + '">' +
          '<span class="grow">' + esc(g.name || 'Meta sin nombre') + '</span>' + I('right', 16) + '</button>';
      });
    });
    if (!n) h += '<p class="tiny">Ninguna todavía. Una meta corta es lo que haces este mes para acercarte a esto.</p>';
    return h + '<button class="btn ghost sm" data-a="metaDeArea" data-c="' + esc(cid) + '" style="align-self:flex-start">' + I('plus', 15) + 'Crear una meta en esta área</button>';
  }

  /* --------------------------------------------- imágenes y frases: una pieza */
  // i = -1: frase nueva (no existe hasta que se guarda, así no quedan vacías).
  // Para las que ya existen: su texto, moverla antes o después, o quitarla.
  function tileSheet(i, nueva) {
    if (i === -1) {
      return head('quote', 'Nueva frase') +
        '<div class="sheet-body">' +
        '<label class="field"><span>Una frase que quieras tener presente</span>' +
        '<textarea class="ta" id="fraseNueva" maxlength="300" placeholder="Escríbela con tus palabras">' + esc(ui.fraseNueva || '') + '</textarea></label>' +
        '<div class="field"><span>¿Sin ideas? Toca una y cámbiala hasta que sea tuya</span><div class="chips" style="margin-top:4px">' +
        V.IDEAS_FRASE.map(function (p, k) { return '<button class="chipbtn" data-a="usarIdea" data-i="' + k + '">' + esc(p) + '</button>'; }).join('') +
        '</div></div>' +
        '<button class="btn block" data-a="guardarFrase">Guardar frase</button>' +
        '<button class="btn ghost block" data-a="closeSheet">Cancelar</button></div>';
    }
    var t = S.board[i];
    if (!t) return head('image', 'Imagen o frase') + '<div class="sheet-body"><p class="muted">Ya no existe.</p></div>';
    var img = t.kind === 'img' && t.src, n = S.board.length;
    return head(img ? 'image' : 'quote', img ? (nueva ? 'Imagen añadida' : 'Imagen') : 'Frase') +
      '<div class="sheet-body">' +
      (img ? '<img class="tile-prev" src="' + esc(t.src) + '" alt="">' : '') +
      '<label class="field"><span>' + (img ? '¿Qué representa para ti? (opcional)' : 'Tu frase') + '</span>' +
      '<textarea class="ta" data-f="tilecap" data-i="' + i + '" maxlength="300" placeholder="' +
      (img ? 'Por ejemplo: la casa con jardín donde quiero vivir' : 'Lo que quieres recordar') + '">' + esc(t.cap || '') + '</textarea></label>' +
      (n > 1 ? '<div class="row" style="gap:8px"><span class="tiny grow">Orden</span>' +
        '<button class="btn ghost xs" data-a="boardMove" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + '>' + I('left', 14) + 'Antes</button>' +
        '<button class="btn ghost xs" data-a="boardMove" data-i="' + i + '" data-d="1"' + (i === n - 1 ? ' disabled' : '') + '>Después' + I('right', 14) + '</button></div>' : '') +
      '<button class="btn block" data-a="closeSheet">Listo</button>' +
      '<button class="btn danger block" data-a="boardDel" data-i="' + i + '">' + I('trash', 17) + (img ? 'Quitar imagen' : 'Quitar frase') + '</button>' +
      '</div>';
  }

  /* ------------------------------------------------------------ nueva categoría */
  function catSheet() {
    return head('grid', 'Nueva área de vida') +
      '<div class="sheet-body">' +
      '<div class="row" style="gap:10px">' +
      '<input class="inp" id="ncEmoji" value="⭐" maxlength="4" style="width:64px;text-align:center;font-size:20px" aria-label="Emoji">' +
      '<input class="inp grow" id="ncName" placeholder="Nombre del área"></div>' +
      '<div class="field"><span>Color</span><div class="chips" style="margin-top:4px">' +
      COLORS.map(function (c, i) {
        return '<button class="chipbtn" data-a="ncColor" data-v="' + c + '" aria-pressed="' + (i === 0) + '" style="background:' + c + ';border-color:' + c + ';color:#fff;width:38px">&nbsp;</button>';
      }).join('') + '</div></div>' +
      '<button class="btn block" data-a="addCat">Crear área</button></div>';
  }

  /* ------------------------------------------------------------- contraseña */
  function passSheet() {
    return head('lock', S.account && S.account.pass ? 'Cambiar contraseña' : 'Crear contraseña') +
      '<div class="sheet-body">' +
      (S.account
        ? (S.account.pass
            ? '<label class="field"><span>Contraseña actual</span><input class="inp" type="password" id="pwOld"></label>'
            : '<p class="notice">Esta cuenta no tiene contraseña de la app (por ejemplo, si entraste con Google). Crea una nueva.</p>') +
          '<label class="field"><span>Nueva contraseña</span><input class="inp" type="password" id="pwNew" placeholder="Mínimo 8 caracteres"></label>' +
          '<label class="field"><span>Repite la nueva</span><input class="inp" type="password" id="pwNew2"></label>' +
          '<p class="tiny" id="pwMsg" style="min-height:16px"></p>' +
          '<button class="btn block" data-a="savePass">Guardar</button>' +
          '<p class="notice">La contraseña protege el acceso a la app, pero no cifra tus datos: lo que escribes se guarda sin cifrar en este navegador. No uses la de tu correo.</p>'
        : '<p class="muted">Inicia sesión para cambiar la contraseña.</p>' +
          '<button class="btn block" data-a="go" data-s="register">Crear una cuenta</button>') +
      '</div>';
  }

  /* ---------------------------------------------------------------- respaldo */
  function backupSheet() {
    return head('save', 'Copia de seguridad') +
      '<div class="sheet-body">' +
      '<p class="muted">Este texto es todo lo que hay en la app. Cópialo y guárdalo donde quieras; para restaurarlo, pégalo aquí y pulsa Restaurar.</p>' +
      '<textarea class="ta" id="bkBox" spellcheck="false" style="height:180px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px">' +
      esc(JSON.stringify(S)) + '</textarea>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap">' +
      '<button class="btn sm" data-a="bkCopy">' + I('copy', 16) + 'Copiar</button>' +
      '<button class="btn soft sm" data-a="bkRestore">Restaurar</button>' +
      '<button class="btn danger sm" data-a="bkWipe">Borrar todo</button></div>' +
      '<p class="tiny" id="bkMsg" style="min-height:16px"></p>' +
      '</div>';
  }

  /* -------------------------------------------------------- eliminar cuenta */
  function eliminarSheet() {
    var pass = Cuentas.conContrasena();
    return head('trash', 'Eliminar tu cuenta') +
      '<div class="sheet-body">' +
      '<p style="font-size:14px;line-height:1.6">Se borra <strong>para siempre</strong>: tu cuenta, tu copia en la nube (metas, rutinas, notas, fotos del tablero…), tus recordatorios y los datos de este dispositivo. <strong>No se puede deshacer.</strong></p>' +
      '<p class="muted">Si quieres conservar algo, haz antes una copia de seguridad.</p>' +
      '<button class="btn soft sm" data-a="sheetBackup" style="align-self:flex-start">' + I('save', 15) + 'Hacer copia de seguridad</button>' +
      '<p class="tiny">En otros dispositivos donde la usaste, lo guardado allí sigue hasta que cierres sesión y pulses «Borrar todo» en Copia de seguridad.</p>' +
      (pass
        ? '<label class="field"><span>Tu contraseña, para confirmar</span><input class="inp" type="password" id="elPass" autocomplete="current-password"></label>'
        : '<label class="field"><span>Escribe ELIMINAR para confirmar</span><input class="inp" id="elConfirma" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>') +
      '<p class="tiny" id="elMsg" style="color:var(--bad);min-height:16px"></p>' +
      '<button class="btn danger block" data-a="doEliminar">' + I('trash', 17) + 'Eliminar mi cuenta para siempre</button>' +
      '<button class="btn ghost block" data-a="closeSheet">Cancelar</button>' +
      '</div>';
  }

  /* ------------------------------------------------------------- documentos */
  function docSheet(key) {
    var d = DOCS[key] || ['info', 'Documento', ''];
    var h = head(d[0], esc(d[1])) + '<div class="sheet-body">' +
      '<p style="white-space:pre-wrap;font-size:14px;line-height:1.65;color:var(--ink-2)">' + esc(d[2]) + '</p>';
    if (key === 'feedback') {
      h += '<label class="field"><span>Tu nota</span>' +
        '<textarea class="ta" data-f="feedback" placeholder="Qué te gustaría que hiciera la app…">' + esc(S.feedback || '') + '</textarea></label>';
    }
    h += '<button class="btn block" data-a="closeSheet">Cerrar</button></div>';
    return h;
  }

  /* --------------------------------------------------- revisión de la semana */
  function reviewSheet() {
    var wStart = ui.reviewWeek || Dates.weekStart(Dates.today());
    var w = Revision.weekStats(wStart), rv = Revision.review(wStart);
    var prev = Revision.weekStats(Dates.shift(wStart, -7));
    // la cifra grande es lo hecho (tareas y pasos de metas): una semana de trabajo
    // con pocos hábitos no es una semana perdida; los hábitos van al lado
    var dFull = w.done - prev.done;
    var isThis = wStart === Dates.weekStart(Dates.today());
    var comparable = prev.elapsed && S.start && Dates.diff(S.start, Dates.shift(wStart, -7)) >= 0;

    var nav = '<div class="spread">' +
      '<span class="muted">' + esc(Fmt.cap(Fmt.weekLabel(wStart))) + (isThis ? ' · en curso' : '') + '</span>' +
      '<span class="row" style="gap:0">' +
      '<button class="iconbtn" data-a="revWeek" data-d="-7" aria-label="Semana anterior">' + I('left', 18) + '</button>' +
      '<button class="iconbtn" data-a="revWeek" data-d="0" aria-label="Esta semana">' + I('pin', 17) + '</button>' +
      '<button class="iconbtn" data-a="revWeek" data-d="7" aria-label="Semana siguiente"' +
      (isThis ? ' disabled style="opacity:.3"' : '') + '>' + I('right', 18) + '</button></span></div>';

    var h = head('rotate', 'Revisión semanal', nav) + '<div class="sheet-body">';

    h += '<div class="row" style="gap:16px;align-items:flex-start">' +
      '<div><div class="display" style="font-size:2.6rem">' + w.done + '</div>' +
      '<div class="tiny">' + (w.done === 1 ? 'tarea o paso hecho' : 'tareas y pasos hechos') + '</div></div>' +
      '<div class="grow" style="padding-top:5px"><p class="tiny num" style="line-height:1.9">' +
      '<strong>' + w.marks + '</strong> ' + (w.marks === 1 ? 'hábito marcado' : 'hábitos marcados') + '<br>' +
      '<strong>' + w.full + '</strong> ' + (w.full === 1 ? 'día con todos los hábitos' : 'días con todos los hábitos') + '<br>' +
      '<strong>' + w.notes + '</strong> ' + (w.notes === 1 ? 'nota escrita' : 'notas escritas') + '</p></div>' +
      (comparable ? '<span class="pill num ' + (dFull > 0 ? 'good' : dFull < 0 ? 'bad' : '') + '">' +
        (dFull > 0 ? I('up', 13) + '+' + dFull : dFull < 0 ? I('down', 13) + Math.abs(dFull) : '=') + '</span>' : '') +
      '</div>';

    h += '<div class="divider"></div>';
    h += '<label class="field"><span>¿Qué funcionó?</span>' +
      '<textarea class="ta" style="min-height:62px" data-f="revWon" data-w="' + wStart + '" placeholder="Lo que repetirías tal cual.">' + esc(rv.won) + '</textarea></label>';
    h += '<label class="field"><span>¿Qué ajustas?</span>' +
      '<textarea class="ta" style="min-height:62px" data-f="revAdjust" data-w="' + wStart + '" placeholder="Un cambio concreto, no una promesa general.">' + esc(rv.adjust) + '</textarea></label>';
    h += '<label class="field"><span>Tu foco para la semana que viene</span>' +
      '<input class="inp" data-f="revFocus" data-w="' + wStart + '" value="' + esc(rv.focus) + '" placeholder="Una sola cosa."></label>';

    var pf = S.reviews[Dates.shift(wStart, -7)];
    if (pf && pf.focus) h += '<p class="tiny">El foco de la semana pasada fue: <strong>' + esc(pf.focus) + '</strong></p>';

    h += '<button class="btn block" data-a="closeSheet">Listo</button></div>';
    return h;
  }

  /* ------------------------------------------------------------------ reto */
  function challengeSheet() {
    var c = S.challenge;
    var h = head('zap', 'Reto de 30 días') + '<div class="sheet-body">';
    if (!c) {
      h += '<p class="muted">Elige una sola cosa y sostenla 30 días: suficiente para saber si te sirve, corto para no rendirte.</p>' +
        '<div class="row" style="gap:8px"><input class="inp grow" data-add="challenge" placeholder="Ej. 30 días sin azúcar" aria-label="Tu reto">' +
        '<input class="inp num" id="chDays" type="number" min="3" max="365" value="30" style="width:72px" aria-label="Días"></div>' +
        '<button class="btn accent block" data-a="addChallenge">Empezar el reto</button></div>';
      return h;
    }
    var days = +c.days || 30, doneN = Object.keys(c.done || {}).length;
    var dayIdx = Util.clamp(Dates.diff(c.start, Dates.today()) + 1, 1, days);
    var status = doneN >= days ? 'good' : (Dates.diff(c.start, Dates.today()) + 1 > days ? 'bad' : 'warn');
    var label = status === 'good' ? I('trophy', 13) + 'Completado' : status === 'bad' ? I('sleep', 13) + 'Fallido' : I('zap', 13) + 'Activo';

    h += '<div class="spread"><input class="inp-plain grow" style="font-weight:650;font-size:15px" data-f="chName" value="' + esc(c.name) + '" placeholder="¿Qué vas a sostener?" aria-label="Nombre del reto">' +
      '<span class="pill ' + status + '">' + label + '</span></div>' +
      '<div class="row" style="gap:11px"><span class="bar grow"><span style="width:' + (doneN / days * 100).toFixed(1) + '%;background:var(--warn)"></span></span>' +
      '<span class="bv num">' + Math.round(doneN / days * 100) + '%</span></div>' +
      '<p class="tiny num" style="margin-top:-6px">Día ' + dayIdx + ' de ' + days + ' · ' + Fmt.plural(doneN, 'día marcado', 'días marcados') + '</p>' +
      '<div class="cal" style="grid-template-columns:repeat(auto-fill,minmax(32px,1fr))">';
    var t = Dates.today();
    for (var i = 1; i <= days; i++) {
      var dk = Dates.shift(c.start, i - 1), on = !!(c.done || {})[dk], future = Dates.diff(t, dk) > 0;
      h += '<button data-a="chDay" data-day="' + dk + '"' + (future ? ' disabled' : '') +
        ' class="' + (on ? 's-warn' : '') + (dk === t ? ' today' : '') + '" title="' + esc(Fmt.fmt(dk)) + '">' + i + '</button>';
    }
    h += '</div><div class="row" style="gap:8px">' +
      '<button class="btn ghost xs" data-a="chRestart">' + I('rotate', 14) + 'Reiniciar</button>' +
      '<button class="btn danger xs" data-a="chDel">' + I('trash', 14) + 'Eliminar</button></div>';
    return h + '</div>';
  }

  /* ---------------------------------------------------------------- logros */
  function winsSheet() {
    var wins = S.wins.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var h = head('trophy', 'Todo lo que has logrado') + '<div class="sheet-body">';
    h += '<p class="muted">La memoria guarda mal las victorias y muy bien los fallos. Esta lista corrige ese sesgo.</p>';
    h += '<div class="addbar"><input class="addbar-inp" data-add="win" placeholder="¿Qué has conseguido?" aria-label="Nuevo logro" enterkeyhint="done">' +
      '<input class="addbar-when" type="date" id="winDate" value="' + Dates.today() + '" aria-label="Fecha del logro">' +
      '<button class="addbar-go" data-a="addWin" aria-label="Añadir logro">' + I('plus', 18) + '</button></div>';
    if (wins.length) {
      h += '<div class="steps">';
      wins.forEach(function (w) {
        h += '<div class="step" style="align-items:center">' +
          '<span style="color:var(--warn)">' + I('trophy', 17) + '</span>' +
          '<span class="sfields"><input class="inp-plain" data-f="winText" data-id="' + esc(w.id) + '" value="' + esc(w.text) + '"></span>' +
          '<span class="tiny num">' + esc(Fmt.fmt(w.date)) + '</span>' +
          '<button class="delbtn" data-a="winDel" data-id="' + esc(w.id) + '" aria-label="Eliminar logro">' + I('trash', 17) + '</button></div>';
      });
      h += '</div>';
    } else {
      h += '<div class="empty" style="padding:16px 0"><span class="ee">' + I('trophy', 30) + '</span>' +
        '<p>Empieza por algo de este mismo año que ya dabas por hecho: cuenta igual.</p></div>';
    }
    return h + '</div>';
  }

  /* --------------------------------------------------- historial de chequeos */
  function rcSheet() {
    var h = head('compass', 'Chequeos de vida') + '<div class="sheet-body">';
    h += '<button class="btn accent block" data-a="newRC">' + I('plus', 17) + 'Hacer un chequeo ahora</button>';
    if (!S.rc.length) {
      h += '<div class="empty" style="padding:18px 0"><span class="ee">' + I('compass', 30) + '</span>' +
        '<p>Son ocho pantallas cortas que miden cómo estás en cada área de tu vida. Repetirlo cada pocos meses te enseña si de verdad avanzas.</p></div>';
      return h + '</div>';
    }
    h += '<div class="steps">';
    S.rc.slice().reverse().forEach(function (r, idx) {
      var i = S.rc.length - 1 - idx;
      var avg = Revision.avg(r), prev = i > 0 ? Revision.avg(S.rc[i - 1]) : null;
      var d = prev == null ? null : Math.round((avg - prev) * 10) / 10;
      h += '<div class="step" style="align-items:center">' +
        '<button class="row grow" style="background:none;border:0;padding:0;gap:11px;text-align:left" data-a="viewRC" data-id="' + esc(r.id) + '">' +
        '<span class="thumb" style="width:34px;height:34px;border-radius:10px">' + I('eye', 17) + '</span>' +
        '<span class="grow"><span style="display:block;font-weight:650;font-size:14px">' + esc(Fmt.cap(Fmt.fmt(r.date))) + '</span>' +
        '<span class="tiny num">Media ' + avg + ' de 10</span></span>' +
        (d == null ? '' : '<span class="pill num ' + (d > 0 ? 'good' : d < 0 ? 'bad' : '') + '">' +
          (d > 0 ? I('up', 13) + '+' + d : d < 0 ? I('down', 13) + d : '0') + '</span>') +
        '</button>' +
        '<button class="delbtn" data-a="rcDel" data-id="' + esc(r.id) + '" aria-label="Eliminar chequeo">' + I('trash', 17) + '</button>' +
        '</div>';
    });
    return h + '</div></div>';
  }

  /* ------------------------------------------------------- apuntar algo (el «+») */
  var CUANDO = [['hoy', 'sunrise', 'Hoy'], ['manana', 'sun', 'Mañana'], ['sin', 'note', 'Sin fecha']];
  function quickSheet() {
    var q = ui.quick || (ui.quick = { title: '', when: 'hoy', time: '', date: '', rutina: 'day', days: [0, 1, 2, 3, 4, 5, 6] });
    var sin = q.when === 'sin', fecha = q.when === 'fecha', repite = q.when === 'repite';
    var h = head('sparkle', 'Apuntar algo') + '<div class="sheet-body">' +
      '<input class="inp qk-title" data-f="qTitle" data-add="quick" maxlength="400" value="' + esc(q.title) + '" placeholder="¿Qué quieres apuntar?" aria-label="Qué apuntar" enterkeyhint="done">' +
      '<div class="field"><span>¿Para cuándo?</span><div class="seg" role="group" aria-label="¿Para cuándo?" style="margin-top:4px">' +
      CUANDO.map(function (w) {
        return '<button type="button" data-a="qWhen" data-v="' + w[0] + '" aria-pressed="' + (q.when === w[0]) + '">' + w[2] + '</button>';
      }).join('') + '</div>' +
      // lo menos habitual, aparte: la pantalla sigue siendo Hoy, Mañana o Sin fecha
      '<div class="qk-more">' +
      '<button type="button" class="btn ghost xs" data-a="qWhen" data-v="fecha" aria-pressed="' + fecha + '">' + I('calendar', 15) + 'Elegir fecha</button>' +
      '<button type="button" class="btn ghost xs" data-a="qWhen" data-v="repite" aria-pressed="' + repite + '">' + I('rotate', 15) + 'Se repite</button>' +
      '</div></div>';
    if (fecha) {
      h += '<label class="field"><span>Fecha</span><input class="inp" type="date" data-f="qDate" min="' + Dates.today() + '" value="' + esc(q.date) + '"></label>';
    }
    if (repite) {
      h += '<div class="field"><span>¿Qué días?</span><div style="margin-top:6px">' +
        V.diasSemana('Días en que se repite', 'data-a="qDia"', function (d) { return q.days.indexOf(d) >= 0; }) + '</div></div>' +
        '<div class="field"><span>¿En qué rutina?</span><span class="seg" role="group" aria-label="Rutina" style="margin-top:4px">' +
        '<button type="button" data-a="qRutina" data-v="day" aria-pressed="' + (q.rutina === 'day') + '">De día</button>' +
        '<button type="button" data-a="qRutina" data-v="night" aria-pressed="' + (q.rutina === 'night') + '">De noche</button></span></div>' +
        '<p class="muted">Se guarda como hábito: aparece en tus rutinas esos días y suma a tu racha. Lo cambias o pausas en «Editar».</p>';
    } else if (sin) {
      h += '<p class="muted">Queda en «Pendientes sin fecha», dentro del plan de Hoy. No se te pierde.</p>';
    } else {
      h += '<label class="field"><span>Hora (opcional)</span><input class="inp" type="time" data-f="qTime" value="' + esc(q.time) + '"></label>';
    }
    h += '<div class="qk-row qk-btns"><button class="btn accent grow" data-a="qSave" style="padding:15px 20px">' + I('check', 19) + 'Guardar</button>' +
      '<button class="btn soft" data-a="qMore" style="padding:15px 20px">' + I('plus', 18) + 'Y otra</button></div>';
    if (!sin && !repite && !(fecha && !q.date)) {
      h += '<p class="muted">Aparece en el plan ' + (fecha ? 'del ' + esc(Fmt.fmt(q.date)) : q.when === 'manana' ? 'de mañana' : 'de hoy') + '.</p>';
    }
    return h + '</div>';
  }

  /* ------------------------------------------------------------- despachador */
  V.sheet = function () {
    var s = ui.sheet;
    if (!s) return '';
    if (s.t === 'goal') return goalSheet(s.k, s.id);
    if (s.t === 'future') return futureSheet(s.c);
    if (s.t === 'tile') return tileSheet(s.i, s.nueva);
    if (s.t === 'cat') return catSheet();
    if (s.t === 'pass') return passSheet();
    if (s.t === 'backup') return backupSheet();
    if (s.t === 'doc') return docSheet(s.doc);
    if (s.t === 'review') return reviewSheet();
    if (s.t === 'challenge') return challengeSheet();
    if (s.t === 'wins') return winsSheet();
    if (s.t === 'rc') return rcSheet();
    if (s.t === 'quick') return quickSheet();
    if (s.t === 'eliminar') return eliminarSheet();
    return '';
  };
  V.DOCS = DOCS;
})();
