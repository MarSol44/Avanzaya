-- Brújula de Vida — esquema de sincronización.
-- Cómo usarlo: Supabase → tu proyecto → SQL Editor → pega esto entero → Run.
-- Es idempotente: puedes volver a ejecutarlo si algo cambia sin duplicar nada.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ══════════════════════════════════════════════════ estado sincronizado
create table if not exists public.states (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.states enable row level security;

drop policy if exists "estado: lectura propia" on public.states;
create policy "estado: lectura propia" on public.states
  for select using (auth.uid() = user_id);

drop policy if exists "estado: alta propia" on public.states;
create policy "estado: alta propia" on public.states
  for insert with check (auth.uid() = user_id);

drop policy if exists "estado: edición propia" on public.states;
create policy "estado: edición propia" on public.states
  for update using (auth.uid() = user_id);

-- updated_at lo fija siempre el servidor: así ningún reloj de cliente
-- desincronizado puede hacer que un dispositivo pise los datos de otro.
create or replace function public.tocar_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists states_updated_at on public.states;
create trigger states_updated_at
  before update on public.states
  for each row execute function public.tocar_updated_at();

-- ══════════════════════════════════════════════════ suscripciones push
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  reminder_hour int not null default 20 check (reminder_hour between 0 and 23),
  tz            text not null default 'UTC',
  last_sent_on  date,
  created_at    timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push: lectura propia" on public.push_subscriptions;
create policy "push: lectura propia" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push: alta propia" on public.push_subscriptions;
create policy "push: alta propia" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push: edición propia" on public.push_subscriptions;
create policy "push: edición propia" on public.push_subscriptions
  for update using (auth.uid() = user_id);

drop policy if exists "push: borrado propio" on public.push_subscriptions;
create policy "push: borrado propio" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════ llamadas programadas
-- Los "Edge Functions" llevan su propia comprobación de un secreto compartido
-- (cabecera x-cron-secret) para que nadie más pueda dispararlos desde fuera.
-- El secreto NO va escrito en ningún archivo: se genera dentro de la base de
-- datos y vive solo en Supabase Vault ('cron_secret'). pg_cron lo lee de ahí
-- en cada ejecución y las funciones lo comprueban con cron_secret_ok().
-- Para rotarlo: supabase/rotar-cron-secret.sql.
create extension if not exists supabase_vault;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret',
      'Cabecera x-cron-secret con la que pg_cron llama a las Edge Functions');
  end if;
end $$;

-- Solo el servidor (service_role, el que usan las funciones) puede preguntar
-- si un valor es el secreto; nadie puede leerlo desde la app.
create or replace function public.cron_secret_ok(s text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'cron_secret' and decrypted_secret = s
  );
$$;
revoke all on function public.cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.cron_secret_ok(text) to service_role;

select cron.unschedule('brujula-recordatorios') where exists (
  select 1 from cron.job where jobname = 'brujula-recordatorios'
);
select cron.schedule(
  'brujula-recordatorios',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://fgpwhdfvqtlvfmmzhxsy.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
                 (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body    := '{}'::jsonb
  );
  $$
);

select cron.unschedule('brujula-correo-semanal') where exists (
  select 1 from cron.job where jobname = 'brujula-correo-semanal'
);
select cron.schedule(
  'brujula-correo-semanal',
  '0 8 * * 0',   -- cada domingo a las 08:00 UTC
  $$
  select net.http_post(
    url     := 'https://fgpwhdfvqtlvfmmzhxsy.supabase.co/functions/v1/send-weekly-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
                 (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body    := '{}'::jsonb
  );
  $$
);
