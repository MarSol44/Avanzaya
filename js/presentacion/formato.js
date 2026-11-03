/* ==========================================================================
   PRESENTACIÓN — formato: cómo se enseñan los datos (textos, HTML y gráficos).
   Usa los servicios de dominio para consultar; nunca cambia datos.
   ========================================================================== */
var Fmt = (function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* --------------------------------------------------------------- fechas */
  function fmt(k) {
    if (!k) return '';
    try { return Dates.parseK(k).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return k; }
  }
  function fmtLong(k) {
    try { return Dates.parseK(k).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return k; }
  }
  function weekLabel(start) {
    var end = Dates.shift(start, 6);
    var a = Dates.parseK(start), b = Dates.parseK(end);
    var sameMonth = a.getMonth() === b.getMonth();
    try {
      return a.toLocaleDateString('es-ES', { day: 'numeric', month: sameMonth ? undefined : 'short' }) +
        ' – ' + b.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (e) { return start + ' – ' + end; }
  }

  /* --------------------------------------------------------------- cuenta */
  // Cómo se enseña con qué se entra: el correo, el teléfono, @usuario o la red social.
  var REDES = { google: 'Google', facebook: 'Facebook' };
  function cuenta(acc) {
    if (!acc) return '';
    if (acc.login === 'tel' && acc.phone) return acc.phone;
    if (acc.login === 'usuario' && acc.username) return '@' + acc.username;
    if (acc.email) return acc.email;
    return acc.provider ? 'Cuenta de ' + (REDES[acc.provider] || acc.provider) : '';
  }

  /* ---------------------------------------------------------------- metas */
  // Cuánto falta para la fecha límite, como texto y color: { txt, cls }.
  function due(k, done) {
    if (done) return { txt: 'Completada', cls: 'good' };
    var n = Goals.daysLeft(k);
    if (n === null) return { txt: 'Sin fecha', cls: '' };
    if (n < 0) return { txt: 'Atrasado', cls: 'bad' };
    if (n === 0) return { txt: 'Hoy', cls: 'warn' };
    if (n < 7) return { txt: 'En ' + plural(n, 'día', 'días'), cls: 'warn' };
    if (n <= 28) return { txt: 'En ' + plural(Math.round(n / 7), 'semana', 'semanas'), cls: '' };
    return { txt: 'En ' + plural(Math.round(n / 30), 'mes', 'meses'), cls: '' };
  }

  // Opciones del desplegable de áreas de vida.
  function catOptions(sel) {
    var h = '<option value="">Sin categoría</option>';
    Areas.all().forEach(function (c) {
      h += '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.emoji + '  ' + c.name) + '</option>';
    });
    return h + '<option value="__new">＋ Nueva categoría…</option>';
  }

  /* -------------------------------------------------------------- gráficos */
  // Anillo de progreso reutilizable.
  function ring(pct, size, color, inner) {
    var r = size / 2 - 7, C = 2 * Math.PI * r;
    var off = C - C * Util.clamp(pct / 100, 0, 1);
    return '<div class="ringwrap" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="color-mix(in srgb, var(--ink) 11%, transparent)" stroke-width="9"></circle>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="' + color + '" stroke-width="9" ' +
      'stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"></circle></svg>' +
      '<div class="ringmid">' + inner + '</div></div>';
  }

  // Radar con los valores del chequeo de vida, un eje por área.
  function radar(r) {
    var cats = Areas.all();
    var size = 260, c = size / 2, R = c - 42, n = cats.length;
    function pt(i, v) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n, rr = R * Util.clamp(v / 10, 0, 1);
      return [c + rr * Math.cos(a), c + rr * Math.sin(a)];
    }
    var h = '<svg class="radar" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="Resumen por área de vida">';
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var pts = [];
      for (var i = 0; i < n; i++) pts.push(pt(i, 10 * f).map(function (x) { return x.toFixed(1); }).join(','));
      h += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="var(--line)" stroke-width="1"></polygon>';
    });
    for (var i = 0; i < n; i++) {
      var e = pt(i, 10);
      h += '<line x1="' + c + '" y1="' + c + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" stroke="var(--line)" stroke-width="1"></line>';
    }
    // Un eje sin medir se dibuja a la altura de la media, no en cero:
    // en cero parecería que esa área está fatal, y lo cierto es que no se preguntó.
    var vals = [];
    for (var w = 0; w < n; w++) { var vw = Revision.cat(r, cats[w].id); if (vw != null) vals.push(vw); }
    var mean = vals.length ? vals.reduce(function (a2, b2) { return a2 + b2; }, 0) / vals.length : 0;
    var poly = [], any = vals.length > 0;
    for (var j = 0; j < n; j++) {
      var v = Revision.cat(r, cats[j].id);
      poly.push(pt(j, v == null ? mean : v).map(function (x) { return x.toFixed(1); }).join(','));
    }
    if (any) {
      h += '<polygon points="' + poly.join(' ') + '" fill="var(--accent)" fill-opacity=".22" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"></polygon>';
      for (var m = 0; m < n; m++) {
        var vv = Revision.cat(r, cats[m].id);
        if (vv == null) continue;
        var p = pt(m, vv);
        h += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5" fill="' + esc(cats[m].color) + '" stroke="var(--surface)" stroke-width="1.5"></circle>';
      }
    }
    for (var q = 0; q < n; q++) {
      var lp = pt(q, 12.4);
      h += '<text x="' + lp[0].toFixed(1) + '" y="' + lp[1].toFixed(1) + '" font-size="15" text-anchor="middle" dominant-baseline="middle">' + esc(cats[q].emoji) + '</text>';
    }
    return h + '</svg>';
  }

  return {
    esc: esc, plural: plural, cap: cap, fmt: fmt, fmtLong: fmtLong, weekLabel: weekLabel, cuenta: cuenta,
    due: due, catOptions: catOptions, ring: ring, radar: radar
  };
})();
