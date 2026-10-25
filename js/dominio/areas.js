/* ==========================================================================
   DOMINIO — áreas de vida (categorías de metas y del chequeo de vida).
   Sin pantalla ni almacenamiento: trabaja contra un repositorio inyectado.
     repo.cats() → lista de áreas { id, emoji, name, color }
   ========================================================================== */
var BdvAreas = (function () {
  'use strict';

  // Las áreas con las que empieza cualquier cuenta nueva.
  function base() {
    return [
      { id: 'c1', emoji: '🎓', name: 'Carrera o Estudios', color: '#5b6ee1' },
      { id: 'c2', emoji: '🤝', name: 'Relaciones Personales', color: '#e07a45' },
      { id: 'c3', emoji: '❤️', name: 'Relaciones Románticas', color: '#d9527a' },
      { id: 'c4', emoji: '💰', name: 'Finanzas', color: '#c9971f' },
      { id: 'c5', emoji: '💪', name: 'Salud Física', color: '#2f9268' },
      { id: 'c6', emoji: '🧘', name: 'Salud Mental', color: '#3d9bb0' },
      { id: 'c7', emoji: '🌱', name: 'Personalidad y Crecimiento', color: '#7a63d6' },
      { id: 'c8', emoji: '🎨', name: 'Otros (Ocio, Hobbies)', color: '#b06ab8' }
    ];
  }

  function create(deps) {
    var repo = deps.repo;
    function all() { return repo.cats(); }
    function get(id) {
      var list = repo.cats();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }
    function name(id) { var c = get(id); return c ? c.name : 'Sin categoría'; }
    function emoji(id) { var c = get(id); return c ? c.emoji : '•'; }
    function color(id) { var c = get(id); return c ? c.color : 'var(--ink-3)'; }
    return { all: all, get: get, name: name, emoji: emoji, color: color };
  }

  return { base: base, create: create };
})();
