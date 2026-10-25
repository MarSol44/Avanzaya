# Puesta en marcha: sincronización, recordatorio y correo semanal

Esto es una guía de un solo uso, para desplegar las piezas que necesitan
infraestructura fuera del sitio estático. Una vez hecho, no hay que repetirlo
salvo que cambies las funciones o las claves.

## 0. Qué cambió en el código

- `vendor/supabase.js` — librería cliente de Supabase (vendorizada, sin CDN externo).
- `sync.js` — sincroniza el estado, activa el recordatorio push y pone el
  badge de racha en el icono. Se carga después de `app.js`. La primera vez
  se ofrece con una barra abajo; después se activa, desactiva o cambia de
  hora desde **Perfil → Recordatorio diario**.
- `app.js`, `index.html`, `sw.js`, `app.css`, `.htaccess` — enganches mínimos
  para que lo anterior funcione (login/registro también dan de alta en
  Supabase, el service worker atiende notificaciones push, CSP permite
  hablar con tu proyecto de Supabase).
- `supabase/schema.sql` y `supabase/functions/*` — solo para desplegar desde
  tu máquina con el CLI de Supabase. **No subas la carpeta `supabase/` a
  Hostinger**, no la necesita el sitio público.

Todo es aditivo: si algo de esto falla, la app sigue funcionando 100% local
como antes.

## 1. Ejecuta el esquema en Supabase

Panel de Supabase → tu proyecto → **SQL Editor** → pega el contenido de
`supabase/schema.sql` → **Run**.

No hay que pegar ningún secreto: el script genera dentro de la base de datos
el secreto con el que pg_cron llama a tus funciones (`cron_secret`) y lo
guarda en **Supabase Vault**. pg_cron lo lee de ahí en cada ejecución y las
funciones lo comprueban con `cron_secret_ok()`, que solo puede usar el
servidor. No aparece en ningún archivo.

Si `create extension pg_cron` o `pg_net` fallan, actívalas primero en
**Database → Extensions** y vuelve a ejecutar el script (es idempotente).

## 2. Instala y conecta el CLI de Supabase

No hace falta instalarlo global, `npx` sirve para todo:

```bash
npx supabase login
npx supabase link --project-ref fgpwhdfvqtlvfmmzhxsy
```

`login` abre el navegador para autorizar tu cuenta de Supabase.

## 3. Genera las claves VAPID (recordatorio push)

```bash
node supabase/rotar-vapid.mjs
```

El script genera un par de claves nuevo y lo guarda directamente como
secretos de las funciones (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Después
escribe la clave **pública** en `sync.js`, que es pública por diseño. La
privada no se muestra ni se guarda en ningún archivo del proyecto: solo vive
en el gestor de secretos de Supabase.

## 4. Crea tu cuenta de Resend (correo semanal)

1. Ve a resend.com y crea una cuenta gratuita.
2. **Domains** → añade tu dominio real (el mismo que pongas en `index.html`
   en vez de `TUDOMINIO.com`) → te da 2-3 registros DNS (TXT/CNAME/MX) →
   añádelos en el panel de DNS de Hostinger → espera a que Resend lo marque
   como verificado (puede tardar unos minutos).
   - Mientras no verifiques un dominio, Resend solo deja enviar correos a tu
     propia cuenta de prueba: suficiente para probar, no para usuarios reales.
3. **API Keys** → crea una con permiso de envío → cópiala (empieza por `re_`).

## 5. Configura los secretos de las funciones

Las claves VAPID ya las puso el paso 3 y el secreto de cron vive en Vault
(paso 1). Quedan estos:

```bash
npx supabase secrets set VAPID_SUBJECT=mailto:tu-correo@tudominio.com
npx supabase secrets set RESEND_API_KEY=re_TU_CLAVE_AQUI
npx supabase secrets set RESEND_FROM="Brújula de Vida <hola@tudominio.com>"
```

`RESEND_FROM` tiene que usar el dominio que verificaste en el paso 4.

## 6. Despliega las dos funciones

```bash
npx supabase functions deploy send-reminders --no-verify-jwt
npx supabase functions deploy send-weekly-email --no-verify-jwt
```

`--no-verify-jwt` es correcto aquí: la protección la hace la propia función
comprobando la cabecera `x-cron-secret`, no el JWT de Supabase (pg_cron no
sabe generar uno).

## 7. Recomendado: desactiva la confirmación de correo en Supabase Auth

**Authentication → Providers → Email → "Confirm email"** → apágalo.

La app ya protege el acceso con su propia contraseña local; exigir además
confirmar el correo en Supabase solo retrasa que la sincronización empiece a
funcionar en el primer dispositivo. Si lo dejas activado, el primer registro
mostrará un aviso pidiendo confirmar el correo antes de que la sincronización
arranque — sigue siendo seguro, solo más lento.

## 8. Sube los archivos nuevos/cambiados a Hostinger

Por FTP o el Administrador de archivos, a `public_html`:

```
index.html      (cambiado)
app.js          (cambiado)
app.css         (cambiado)
sw.js           (cambiado)
.htaccess       (cambiado)
sync.js         (nuevo)
vendor/supabase.js   (nuevo)
```

No subas `supabase/` ni `SUPABASE_SETUP.md`: son solo para ti, no para el sitio.

Como `sw.js` cambió de versión (`brujula-v2`), los navegadores que ya tenían
la app instalada verán el aviso de "Hay una versión nueva" automáticamente.

## 9. Probar sin esperar al cron

Los recordatorios corren cada 15 min y el correo semanal cada domingo. Para
probarlos ya mismo sin sacar el secreto de Vault, lánzalos desde el
**SQL Editor**; usan el mismo camino que pg_cron:

```sql
select net.http_post(
  url     := 'https://fgpwhdfvqtlvfmmzhxsy.supabase.co/functions/v1/send-reminders',
  headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
               (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
  body    := '{}'::jsonb
);
-- (cambia send-reminders por send-weekly-email para el correo)

-- respuesta, unos segundos después:
select status_code, content from net._http_response order by id desc limit 1;
```

Cada una devuelve un JSON con cuántos envíos hizo.

## Rotar secretos

Hazlo si alguno pudo quedar expuesto, y en cualquier caso antes del
lanzamiento.

**Primera vez tras este cambio** (pasar del secreto escrito en el SQL a Vault):

```bash
# 1. SQL Editor → pega supabase/schema.sql → Run
#    (crea cron_secret en Vault y reprograma pg_cron para leerlo de ahí;
#     las tareas viejas, que llevaban el secreto escrito, se sustituyen)
# 2. despliega las funciones, que ahora comprueban contra Vault:
npx supabase functions deploy send-reminders --no-verify-jwt
npx supabase functions deploy send-weekly-email --no-verify-jwt
# 3. borra el secreto viejo, que ya no usa nadie:
npx supabase secrets unset CRON_SECRET
# 4. claves VAPID nuevas:
node supabase/rotar-vapid.mjs
```

Entre el paso 1 y el 2 puede fallar algún recordatorio; son un par de minutos.

**Rotaciones siguientes:**

1. **Secreto de cron:** SQL Editor → pega `supabase/rotar-cron-secret.sql` → Run.
   Genera uno nuevo en Vault y el cambio es inmediato para pg_cron y para las
   funciones; no hay que copiar nada.
2. **Claves VAPID:** `node supabase/rotar-vapid.mjs`, después sube `sync.js` y
   `sw.js` al hosting. Los móviles con el recordatorio activo se vuelven a
   suscribir solos con la clave nueva al abrir la app, y conservan su hora.
3. Nunca escribas valores de secretos en este documento ni en el repositorio:
   solo en el gestor de secretos de Supabase (Vault y los secretos de las
   funciones).

## 10. Lista de comprobación

- [ ] Registrar una cuenta en la app → aparece una fila en la tabla `states` de Supabase.
- [ ] Iniciar sesión con la misma cuenta en otro navegador/incógnito → llegan los mismos datos.
- [ ] Activar el recordatorio en la barra inferior → aparece una fila en `push_subscriptions`.
- [ ] `curl` de prueba del paso 9 → llega la notificación push al dispositivo con el recordatorio activado.
- [ ] Cuenta de Resend con dominio verificado → `curl` del correo semanal → llega el correo.
