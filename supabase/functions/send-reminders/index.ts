// Brújula de Vida — recordatorio diario por notificación push.
// Lo dispara pg_cron cada 15 minutos (ver supabase/schema.sql). Por cada
// suscripción, calcula la hora local de esa persona y solo envía si coincide
// con la hora que eligió y no se le ha enviado ya hoy.
//
// Secretos que necesita (los pone supabase/rotar-vapid.mjs):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo.
// La cabecera x-cron-secret se comprueba contra Supabase Vault (cron_secret_ok).

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

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

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') || 'mailto:hola@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  const { data: subs, error } = await supabase.from('push_subscriptions').select('*');
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0, deleted = 0;

  for (const sub of subs || []) {
    let localHour = 20, localDate = '';
    try {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: sub.tz || 'UTC', hour: 'numeric', hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const parts: Record<string, string> = {};
      for (const p of fmt.formatToParts(new Date())) parts[p.type] = p.value;
      localHour = parts.hour === '24' ? 0 : Number(parts.hour);
      localDate = `${parts.year}-${parts.month}-${parts.day}`;
    } catch (_e) {
      localDate = new Date().toISOString().slice(0, 10);
      localHour = new Date().getUTCHours();
    }

    if (localHour !== sub.reminder_hour) continue;
    if (sub.last_sent_on === localDate) continue;

    const payload = JSON.stringify({
      title: 'Brújula de Vida',
      body: 'Un momento para tu día: rutinas, metas y cómo vas.',
      url: '/?ir=hoy&fuente=push'
    });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
      await supabase.from('push_subscriptions').update({ last_sent_on: localDate }).eq('id', sub.id);
    } catch (err: any) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        deleted++;
      }
    }
  }

  return new Response(JSON.stringify({ sent, deleted, checked: (subs || []).length }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
