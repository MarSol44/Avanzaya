/* ==========================================================================
   DOMINIO — revisión: el chequeo de vida (Reality Check) y la revisión de la
   semana. Reglas y preguntas; sin pantalla ni almacenamiento.

   Dependencias inyectadas:
     repo     — rc() → historial de chequeos · notes() → notas por día
                reviews() → revisiones por semana
     routines — servicio de rutinas (para saber qué se hizo cada día)
     tasks    — (opcional) doneOn(d) → tareas y pasos de metas hechos ese día
     dates    — today, diff, weekDays
     uid      — generar identificadores
   ========================================================================== */
var BdvRevision = (function () {
  'use strict';

  // Las ocho áreas del chequeo, con sus preguntas. Todas se miden del 1 al 10.
  var AREAS = [
    {
      id: 'c1', title: 'Carrera o Estudios', emoji: '🎓',
      lead: 'Mira dónde estás hoy',
      sliders: [{ k: 'c1', q: '¿Qué tan a gusto estás con tu carrera o tus estudios?' }],
      notes: ['¿Qué obstáculos enfrentas?', '¿Sientes que avanzas o que te has estancado?']
    },
    {
      id: 'c2', title: 'Relaciones Personales', emoji: '🤝',
      lead: 'Registra tu estado actual',
      sliders: [{ k: 'c2', q: '¿Cómo te sientes con tus amigos?' }, { k: 'c2b', q: '¿Cómo te sientes con tu familia?' }],
      notes: ['¿Cómo describirías la calidad de tus relaciones ahora mismo?', '¿Quieres conocer gente, reforzar amistades o mejorar con tu familia?', '¿Sientes que te valoran y respetan en tu círculo?']
    },
    {
      id: 'c3', title: 'Relaciones Románticas', emoji: '❤️',
      lead: 'Conoce en qué momento de tu vida estás',
      sliders: [{ k: 'c3', q: '¿Cómo te sientes en tu situación romántica actual?' }],
      notes: ['¿Hay alguien con quien quisieras conectar más a fondo?', '¿Cómo podrías mejorar la relación con tu pareja?']
    },
    {
      id: 'c4', title: 'Finanzas', emoji: '💰',
      lead: 'Mira dónde estás hoy',
      sliders: [{ k: 'c4', q: '¿Qué tan a gusto estás con tu situación financiera?' }],
      notes: ['¿Quieres ahorrar más, invertir o buscar un trabajo a tiempo parcial?', '¿Qué mejorarías de tu gestión financiera?']
    },
    {
      id: 'c5', title: 'Salud Física', emoji: '💪',
      lead: 'Registra tu estado actual',
      sliders: [{ k: 'c5', q: '¿Cómo calificarías tu salud física?' }],
      notes: ['¿Estás haciendo ejercicio, descansando y comiendo bien?']
    },
    {
      id: 'c6', title: 'Salud Mental', emoji: '🧘',
      lead: 'Conoce en qué momento de tu vida estás',
      sliders: [{ k: 'c6', q: '¿Cómo calificarías tu salud mental?' }],
      notes: ['¿Con qué frecuencia aparecen el estrés, la ansiedad o el agotamiento?']
    },
    {
      id: 'c7', title: 'Personalidad y Crecimiento', emoji: '🌱',
      lead: 'Mira dónde estás hoy',
      adjectives: true,
      sliders: [{ k: 'c7', q: '¿Cómo te ves hoy?' }],
      notes: ['¿Qué aspectos de tu personalidad te gustan y cuáles cambiarías?', '¿Sientes que estás creciendo, o te falta algo para avanzar?']
    },
    {
      id: 'c8', title: 'Otros: ocio e intereses', emoji: '🎨',
      lead: 'Registra tu estado actual',
      sliders: [{ k: 'c8', q: '¿Dedicas suficiente tiempo a lo que te gusta?' }],
      notes: ['¿Qué cosas nuevas te gustaría probar o aprender?', '¿Cuáles son tus pasatiempos más emocionantes?']
    }
  ];

  function create(deps) {
    var repo = deps.repo, routines = deps.routines, dates = deps.dates, uid = deps.uid, tasks = deps.tasks;

    /* ---------------------------------------------------- chequeo de vida */
    function newDraft() { return { id: uid(), date: dates.today(), scores: {}, notes: {}, adjectives: '' }; }
    function last() { var rc = repo.rc(); return rc.length ? rc[rc.length - 1] : null; }
    // Puntuación media 1-10 de un chequeo.
    function avg(r) {
      if (!r) return 0;
      var ks = Object.keys(r.scores || {}), s = 0, n = 0;
      ks.forEach(function (k) { s += +r.scores[k]; n++; });
      return n ? Math.round(s / n * 10) / 10 : 0;
    }
    // Valor por área (amigos y familia se promedian en c2).
    function cat(r, cid) {
      if (!r || !r.scores) return null;
      if (cid === 'c2') {
        var a = r.scores.c2, b = r.scores.c2b;
        if (a == null && b == null) return null;
        if (a == null) return +b; if (b == null) return +a;
        return (+a + +b) / 2;
      }
      return r.scores[cid] == null ? null : +r.scores[cid];
    }

    /* ----------------------------------------------------------- semana */
    // Lo que de verdad pasó esa semana, sin pedirle nada a la persona: lo hecho
    // (tareas y pasos de metas), los hábitos y las notas.
    function weekStats(start) {
      var days = dates.weekDays(start), t = dates.today(), notes = repo.notes();
      var full = 0, partial = 0, marks = 0, written = 0, elapsed = 0, done = 0;
      days.forEach(function (d) {
        if (dates.diff(t, d) > 0) return;          // los días que aún no han llegado no cuentan
        elapsed++;
        var x = routines.dayTotals(d);
        marks += x.done;
        if (x.total && x.done >= x.total) full++;
        else if (x.done > 0) partial++;
        if ((notes[d] || '').trim()) written++;
        if (tasks) done += tasks.doneOn(d);
      });
      return { full: full, partial: partial, marks: marks, notes: written, elapsed: elapsed, days: days, done: done };
    }
    function review(start) {
      var r = repo.reviews();
      if (!r[start]) r[start] = { won: '', adjust: '', focus: '' };
      return r[start];
    }

    return { AREAS: AREAS, newDraft: newDraft, last: last, avg: avg, cat: cat, weekStats: weekStats, review: review };
  }

  return { create: create, AREAS: AREAS };
})();
