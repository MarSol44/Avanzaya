/* ==========================================================================
   PRESENTACIÓN — estado de la interfaz: qué pantalla, pestaña u hoja se ve,
   qué día está elegido, borradores de formularios… No se guarda: se pierde
   al cerrar la app (las preferencias que sí se recuerdan van en Prefs).
   ========================================================================== */
var UIState = {
  screen: 'splash',
  tab: 'hoy',
  subMetas: 'goals',
  rcStep: 0,
  selDay: Dates.today(),
  calMonth: Dates.today().slice(0, 7),
  openGoal: null,       // { kind:'S'|'L', id }
  sheetTab: 'desc',
  goalQ: '',
  goalFilter: '',
  progCat: '',
  regStep: 1,
  showPw: false
};
