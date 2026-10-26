/* ==========================================================================
   DOMINIO — identidad de una cuenta: con qué se entra (correo, teléfono o
   nombre de usuario, o una red social) y cómo se reconoce a la misma cuenta.

   - parse(texto, tipo?) valida y normaliza lo que se escribe. Sin tipo,
     lo adivina: si empieza por «@», usuario; con «@» en medio, correo; si
     son cifras (con o sin +), teléfono; si no, nombre de usuario.
   - clave: el identificador único de la cuenta en este dispositivo
       correo   → 'ana@ejemplo.com'   (igual que antes: las cuentas viejas siguen)
       teléfono → 'tel:+34600123456'
       usuario  → 'user:ana_23'
       red sin correo → 'red:facebook:<id>'
   - emailNube: con qué correo se identifica la cuenta en la nube. El usuario
     y el teléfono no tienen correo real: usan uno interno, que nadie recibe,
     en un dominio propio (DOMINIO). No se verifican ni permiten recuperar la
     contraseña por correo.
   Sin pantalla ni almacenamiento.
   ========================================================================== */
var BdvIdentidad = (function () {
  'use strict';

  var DOMINIO = 'usuarios.avanzaya.pages.dev';
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var USUARIO = /^[a-z0-9._-]{3,30}$/;
  var TEL = /^\+?\d{8,15}$/;
  var MSG = {
    email: 'Ese correo no parece válido.',
    tel: 'Ese teléfono no parece válido. Escríbelo con el prefijo del país, por ejemplo +34 600 123 456.',
    usuario: 'El nombre de usuario debe tener de 3 a 30 caracteres: letras sin tildes, números, punto, guion o guion bajo.'
  };

  function limpiaTel(t) { return String(t || '').replace(/[\s().-]/g, ''); }
  function adivina(t) {
    t = String(t || '').trim();
    if (t.charAt(0) === '@') return 'usuario';      // «@mari_23» es un usuario, no un correo
    if (t.indexOf('@') >= 0) return 'email';
    if (/^\+?[\d\s().-]{8,}$/.test(t)) return 'tel';
    return 'usuario';
  }

  // → { ok, tipo, valor, clave, emailNube } o { ok: false, tipo, msg }
  function parse(texto, tipo) {
    var t = String(texto || '').trim();
    tipo = tipo || adivina(t);
    var valor;
    if (tipo === 'email') { valor = t.toLowerCase(); if (!EMAIL.test(valor)) return { ok: false, tipo: tipo, msg: MSG.email }; }
    else if (tipo === 'tel') { valor = limpiaTel(t); if (!TEL.test(valor)) return { ok: false, tipo: tipo, msg: MSG.tel }; }
    else if (tipo === 'usuario') { valor = t.replace(/^@/, '').toLowerCase(); if (!USUARIO.test(valor)) return { ok: false, tipo: tipo, msg: MSG.usuario }; }
    else return { ok: false, tipo: tipo, msg: 'Elige correo, teléfono o usuario.' };
    return { ok: true, tipo: tipo, valor: valor, clave: claveDe(tipo, valor), emailNube: emailNubeDe(tipo, valor) };
  }

  function claveDe(tipo, valor) {
    if (tipo === 'tel') return 'tel:' + valor;
    if (tipo === 'usuario') return 'user:' + valor;
    return String(valor).toLowerCase();
  }
  function emailNubeDe(tipo, valor) {
    if (tipo === 'tel') return 'tel.' + valor.replace(/^\+/, '') + '@' + DOMINIO;
    if (tipo === 'usuario') return 'u.' + valor + '@' + DOMINIO;
    return valor;
  }

  // La clave de una cuenta guardada (las antiguas, sin «login», son de correo).
  function deCuenta(acc) {
    if (!acc) return '';
    if (acc.login === 'tel' && acc.phone) return claveDe('tel', acc.phone);
    if (acc.login === 'usuario' && acc.username) return claveDe('usuario', acc.username);
    if (acc.login === 'red' && !acc.email && acc.provider && acc.providerId) return 'red:' + acc.provider + ':' + acc.providerId;
    return acc.email ? String(acc.email).trim().toLowerCase() : '';
  }
  // La clave de una persona que entra con una red social.
  function deRed(proveedor, user) {
    var mail = String(user && user.email || '').trim().toLowerCase();
    return mail || ('red:' + proveedor + ':' + String(user && user.id || ''));
  }
  function esInterno(email) { return /@/.test(email || '') && String(email).toLowerCase().split('@')[1] === DOMINIO; }

  return {
    DOMINIO: DOMINIO, parse: parse, adivina: adivina, deCuenta: deCuenta, deRed: deRed,
    emailNube: emailNubeDe, esInterno: esInterno
  };
})();
