-- Brújula de Vida — rota el secreto con el que pg_cron llama a las funciones.
-- Cómo usarlo: Supabase → tu proyecto → SQL Editor → pega esto → Run.
-- Genera un valor nuevo dentro de la base de datos y lo guarda en Vault.
-- No se muestra en ningún sitio ni hay que copiarlo: pg_cron y las funciones
-- lo leen de Vault, así que el cambio es inmediato en los dos lados.
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  nuevo text := encode(extensions.gen_random_bytes(32), 'hex');
  sid uuid := (select id from vault.secrets where name = 'cron_secret');
begin
  if sid is null then
    perform vault.create_secret(nuevo, 'cron_secret',
      'Cabecera x-cron-secret con la que pg_cron llama a las Edge Functions');
  else
    perform vault.update_secret(sid, nuevo);
  end if;
end $$;

-- Comprobación (devuelve true/false, nunca el valor):
select exists (select 1 from vault.secrets where name = 'cron_secret') as cron_secret_en_vault;
