-- Brújula de Vida — quita lo que dejó un prototipo anterior (Figma Make) y la app no usa.
-- Cómo usarlo: Supabase → tu proyecto → SQL Editor → pega esto → Run.
--
-- Por qué: la función «make-server-06f58416» seguía publicada. Con la clave
-- pública de la app, cualquiera podía crear cuentas ya confirmadas con el correo
-- que quisiera (sin el límite de altas de Supabase) y guardar datos sin límite.
-- La función se borra aparte, porque no vive en la base de datos:
--   npx supabase functions delete make-server-06f58416 --project-ref fgpwhdfvqtlvfmmzhxsy
-- o en el panel: Edge Functions → make-server-06f58416 → Delete.
--
-- Estas dos tablas solo las usaba esa función. Antes de borrarlas se comprueba
-- que están vacías: si alguna tiene filas, no se toca nada.
do $$
begin
  if exists (select 1 from public.kv_store_06f58416) or exists (select 1 from public.profiles) then
    raise exception 'Hay filas en kv_store_06f58416 o profiles: revísalas antes de borrar.';
  end if;
  drop table public.kv_store_06f58416;
  drop table public.profiles;
end $$;
