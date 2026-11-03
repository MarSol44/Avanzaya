// Brújula de Vida — eliminar la propia cuenta.
// La llama la app (Perfil › Eliminar cuenta) con la sesión de la persona. Solo
// borra la cuenta de esa sesión: el usuario sale del token, nunca del cuerpo de
// la petición, así que nadie puede borrar la cuenta de otra persona.
//
// Borra el usuario de Supabase Auth; su copia (states) y sus suscripciones push
// (push_subscriptions) se van con él, porque cuelgan de auth.users con
// «on delete cascade». Se borran también aquí por si esa regla faltara.
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solo.
// Se despliega CON verificación de JWT (sin --no-verify-jwt).

import { createClient } from 'npm:@supabase/supabase-js@2';

// Solo la web de la app (y el servidor local de pruebas) pueden llamarla desde un navegador.
const ORIGENES = ['https://avanzaya.marisolduran-eng.workers.dev', 'http://127.0.0.1:5500', 'http://localhost:5500'];

function cabeceras(req: Request) {
  const origen = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ORIGENES.includes(origen) ? origen : ORIGENES[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
}

Deno.serve(async (req) => {
  const h = cabeceras(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return new Response('{"error":"metodo"}', { status: 405, headers: h });

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return new Response('{"error":"sin-sesion"}', { status: 401, headers: h });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Quién es, según su propia sesión (la clave pública sola no es una sesión).
  const { data, error } = await admin.auth.getUser(token);
  const user = data && data.user;
  if (error || !user) return new Response('{"error":"sin-sesion"}', { status: 401, headers: h });

  await admin.from('push_subscriptions').delete().eq('user_id', user.id);
  await admin.from('states').delete().eq('user_id', user.id);
  const { error: e2 } = await admin.auth.admin.deleteUser(user.id);
  if (e2) return new Response('{"error":"no-borrada"}', { status: 500, headers: h });

  return new Response('{"ok":true}', { status: 200, headers: h });
});
