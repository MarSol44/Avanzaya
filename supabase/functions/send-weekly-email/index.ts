// Brújula de Vida — resumen semanal por correo.
// Lo dispara pg_cron cada domingo a las 08:00 UTC (ver supabase/schema.sql).
// Para cada persona con cuenta y datos sincronizados, calcula lo que pasó
// en la semana que acaba de terminar y manda un correo con Resend.
//
// Secretos que necesita (npx supabase secrets set NOMBRE=valor):
//   CRON_SECRET, RESEND_API_KEY, RESEND_FROM (p.ej. "Brújula de Vida <hola@tudominio.com>")
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo.

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

function computeStats(state: any) {
  const rlog = state.rlog || {};
  const routines = state.routines || { day: [], night: [] };
  const total = (routines.day || []).length + (routines.night || []).length;
  const weekStart = state.profile && state.profile.weekStart === 0 ? 0 : 1;

  const todayKey = dkey(new Date());
  const thisWeekStart = weekStartOf(todayKey, weekStart);
  const lastWeekStart = shift(thisWeekStart, -7);

  let full = 0, partial = 0, marks = 0, notes = 0;
  for (let i = 0; i < 7; i++) {
    const k = shift(lastWeekStart, i);
    const entry = rlog[k] || { day: [], night: [] };
    const done = (entry.day || []).length + (entry.night || []).length;
    marks += done;
    if (total && done >= total) full++;
    else if (done > 0) partial++;
    if (((state.notes || {})[k] || '').trim()) notes++;
  }

  // racha actual, calculada en UTC: aproximada si la persona vive lejos de UTC,
  // pero de sobra para un resumen semanal.
  let streak = 0, cur = todayKey;
  function doneOn(k: string) {
    const e = rlog[k] || { day: [], night: [] };
    return (e.day || []).length + (e.night || []).length;
  }
  if (doneOn(cur) === 0) cur = shift(cur, -1);
  while (doneOn(cur) > 0) { streak++; cur = shift(cur, -1); }

  return { full, partial, marks, notes, streak, weekLabel: lastWeekStart + ' – ' + shift(lastWeekStart, 6) };
}

function emailHtml(name: string, s: ReturnType<typeof computeStats>) {
  const primer = name ? name.split(' ')[0] : '';
  return `
  <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px 20px;color:#2a2420">
    <h1 style="font-size:22px;margin:0 0 4px">Tu semana en Brújula de Vida</h1>
    <p style="color:#6b6058;margin:0 0 20px">${s.weekLabel}</p>
    <p style="font-size:15px;line-height:1.6">${primer ? 'Hola ' + primer + ',' : 'Hola,'} esto es lo que pasó la semana pasada:</p>
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
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('no', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const RESEND_FROM = Deno.env.get('RESEND_FROM');
  if (!RESEND_API_KEY || !RESEND_FROM) {
    return new Response('faltan RESEND_API_KEY o RESEND_FROM', { status: 500 });
  }

  const { data: rows, error } = await supabase.from('states').select('state');
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0, skipped = 0;
  for (const row of rows || []) {
    const state = row.state || {};
    const email = state.account && state.account.email;
    if (!email) { skipped++; continue; }

    const stats = computeStats(state);
    if (stats.marks === 0) { skipped++; continue; } // nada que contar esa semana

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: email,
        subject: 'Tu semana en Brújula de Vida',
        html: emailHtml(state.account.name || '', stats)
      })
    });
    if (res.ok) sent++; else skipped++;
  }

  return new Response(JSON.stringify({ sent, skipped, checked: (rows || []).length }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
