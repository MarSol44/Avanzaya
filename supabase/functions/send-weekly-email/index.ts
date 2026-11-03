// Brújula de Vida — resumen semanal por correo.
// Lo dispara pg_cron cada domingo a las 08:00 UTC (ver supabase/schema.sql).
// Para cada persona con cuenta y datos sincronizados, calcula lo que pasó
// en la semana que acaba de terminar y manda un correo con Resend.
//
// Secretos que necesita (npx supabase secrets set NOMBRE=valor):
//   RESEND_API_KEY, RESEND_FROM (p.ej. "Brújula de Vida <hola@tudominio.com>")
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo.
// La cabecera x-cron-secret se comprueba contra Supabase Vault (cron_secret_ok).

import { createClient } from 'npm:@supabase/supabase-js@2';

function dkey(d: Date) {
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}
function shift(k: string, n: number) {
  const [y, m, d] = k.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dkey(dt);
}
function weekStartOf(k: string, weekStart: number) {
  const [y, m, d] = k.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const off = (dow - weekStart + 7) % 7;
  return shift(k, -off);
}

// El estado lo escribe cada persona y puede llegar con cualquier forma (no solo
// la que deja la app): cada dato se comprueba antes de usarlo, para que una fila
// rara no tumbe el envío de todos los demás.
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v)) ? v as Obj : {};
const largo = (v: unknown) => Array.isArray(v) ? v.length : 0;

function computeStats(raw: unknown) {
  const state = obj(raw);
  const rlog = obj(state.rlog), notas = obj(state.notes), routines = obj(state.routines);
  const total = largo(routines.day) + largo(routines.night);
  const weekStart = obj(state.profile).weekStart === 0 ? 0 : 1;

  const todayKey = dkey(new Date());
  const thisWeekStart = weekStartOf(todayKey, weekStart);
  const lastWeekStart = shift(thisWeekStart, -7);

  function doneOn(k: string) { const e = obj(rlog[k]); return largo(e.day) + largo(e.night); }

  let full = 0, partial = 0, marks = 0, notes = 0;
  for (let i = 0; i < 7; i++) {
    const k = shift(lastWeekStart, i);
    const done = doneOn(k);
    marks += done;
    if (total && done >= total) full++;
    else if (done > 0) partial++;
    const nota = notas[k];
    if (typeof nota === 'string' && nota.trim()) notes++;
  }

  // racha actual, calculada en UTC: aproximada si la persona vive lejos de UTC,
  // pero de sobra para un resumen semanal. Con tope, por si el historial es enorme.
  let streak = 0, cur = todayKey;
  if (doneOn(cur) === 0) cur = shift(cur, -1);
  while (doneOn(cur) > 0 && streak < 3660) { streak++; cur = shift(cur, -1); }

  return { full, partial, marks, notes, streak, weekLabel: lastWeekStart + ' – ' + shift(lastWeekStart, 6) };
}

// Lo que va en el correo son cifras calculadas aquí, nunca texto escrito en el
// estado: con las altas sin confirmar, una cuenta puede llevar el correo de
// otra persona, y así nadie puede usar este envío para hacerle llegar su texto.
function emailHtml(s: ReturnType<typeof computeStats>) {
  return `
  <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px 20px;color:#2a2420">
    <h1 style="font-size:22px;margin:0 0 4px">Tu semana en Brújula de Vida</h1>
    <p style="color:#6b6058;margin:0 0 20px">${s.weekLabel}</p>
    <p style="font-size:15px;line-height:1.6">Hola, esto es lo que pasó la semana pasada:</p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      <tr><td style="padding:10px 0;border-top:1px solid #e6ddd2">Días completos</td><td style="text-align:right;font-weight:bold">${s.full} / 7</td></tr>
      <tr><td style="padding:10px 0;border-top:1px solid #e6ddd2">Días a medias</td><td style="text-align:right;font-weight:bold">${s.partial}</td></tr>
      <tr><td style="padding:10px 0;border-top:1px solid #e6ddd2">Rutinas marcadas</td><td style="text-align:right;font-weight:bold">${s.marks}</td></tr>
      <tr><td style="padding:10px 0;border-top:1px solid #e6ddd2">Notas del día escritas</td><td style="text-align:right;font-weight:bold">${s.notes}</td></tr>
      <tr><td style="padding:10px 0;border-top:1px solid #e6ddd2">Racha actual</td><td style="text-align:right;font-weight:bold">${s.streak} días</td></tr>
    </table>
    <p style="font-size:13px;color:#8a8079">Abre la app para hacer tu revisión de la semana completa.</p>
  </div>`;
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Solo pg_cron conoce el secreto (vive en Vault); sin él, nada.
  const secret = req.headers.get('x-cron-secret') || '';
  const { data: allowed } = secret
    ? await supabase.rpc('cron_secret_ok', { s: secret })
    : { data: false };
  if (allowed !== true) return new Response('no', { status: 401 });

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const RESEND_FROM = Deno.env.get('RESEND_FROM');
  if (!RESEND_API_KEY || !RESEND_FROM) {
    return new Response('faltan RESEND_API_KEY o RESEND_FROM', { status: 500 });
  }

  // De cien en cien: los estados pesan y la API no devuelve más de mil de una vez.
  let sent = 0, skipped = 0, failed = 0, checked = 0;
  for (let desde = 0; ; desde += 100) {
    const { data: rows, error } = await supabase.from('states').select('user_id, state').order('user_id').range(desde, desde + 99);
    if (error) return new Response('error al leer los estados', { status: 500 });
    for (const row of rows || []) {
      checked++;
      try {
        const r = await enviarA(supabase, row, RESEND_API_KEY, RESEND_FROM);
        if (r) sent++; else skipped++;
      } catch (_e) { failed++; }   // una cuenta con datos raros no para a las demás
    }
    if (!rows || rows.length < 100) break;
  }

  return new Response(JSON.stringify({ sent, skipped, failed, checked }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Devuelve true si se envió.
async function enviarA(supabase: any, row: { user_id: string; state: unknown }, RESEND_API_KEY: string, RESEND_FROM: string) {
  // El destinatario sale de la cuenta verificada en Supabase, NUNCA del
  // estado: el estado lo escribe la persona y podría poner el correo de
  // otra (o una lista de correos) para usar este envío como spam.
  const { data: u } = await supabase.auth.admin.getUserById(row.user_id);
  const email = u && u.user && u.user.email;
  const confirmado = !!(u && u.user && u.user.email_confirmed_at);
  // sin correo, sin confirmar o con el correo interno de las cuentas de
  // usuario/teléfono (que nadie recibe): no se envía
  if (typeof email !== 'string' || !confirmado || email.toLowerCase().endsWith('@usuarios.avanzaya.pages.dev')) return false;

  const stats = computeStats(row.state);
  if (stats.marks === 0) return false; // nada que contar esa semana

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [email],
      subject: 'Tu semana en Brújula de Vida',
      html: emailHtml(stats)
    })
  });
  return res.ok;
}
