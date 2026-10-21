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

Antes de ejecutar, sustituye las dos apariciones de `PON_AQUI_TU_CRON_SECRET`
por este valor (es un secreto solo para que pg_cron pueda llamar a tus
funciones; no lo compartas):

```
TU_CRON_SECRET
```

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

Ya las generé para ti; guárdalas, la privada no se vuelve a mostrar en
ningún sitio:

```
VAPID_PUBLIC_KEY  = BCJBsw2SkMr2W1hUKbdOpFyET_9trsBcPEIJpkKNBjvTqp-9tw47035GaPsmUv9Wz7r6HzxGq-I45ey4pB29KzE
VAPID_PRIVATE_KEY = TU_CLAVE_PRIVADA_VAPID
```

La pública ya está pegada en `sync.js` (es pública por diseño). La privada
**no debe estar en ningún archivo del proyecto** — solo como secreto del
servidor (siguiente paso).

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

```bash
npx supabase secrets set CRON_SECRET=TU_CRON_SECRET
npx supabase secrets set VAPID_PUBLIC_KEY=BCJBsw2SkMr2W1hUKbdOpFyET_9trsBcPEIJpkKNBjvTqp-9tw47035GaPsmUv9Wz7r6HzxGq-I45ey4pB29KzE
npx supabase secrets set VAPID_PRIVATE_KEY=TU_CLAVE_PRIVADA_VAPID
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

Los recordatorios corren cada 15 min y el correo semanal cada domingo — para
probarlos ya mismo, dispáralos a mano:

```bash
curl -X POST https://fgpwhdfvqtlvfmmzhxsy.supabase.co/functions/v1/send-reminders \
  -H "x-cron-secret: TU_CRON_SECRET"

curl -X POST https://fgpwhdfvqtlvfmmzhxsy.supabase.co/functions/v1/send-weekly-email \
  -H "x-cron-secret: TU_CRON_SECRET"
```

Cada una devuelve un JSON con cuántos envíos hizo.

## 10. Lista de comprobación

- [ ] Registrar una cuenta en la app → aparece una fila en la tabla `states` de Supabase.
- [ ] Iniciar sesión con la misma cuenta en otro navegador/incógnito → llegan los mismos datos.
- [ ] Activar el recordatorio en la barra inferior → aparece una fila en `push_subscriptions`.
- [ ] `curl` de prueba del paso 9 → llega la notificación push al dispositivo con el recordatorio activado.
- [ ] Cuenta de Resend con dominio verificado → `curl` del correo semanal → llega el correo.
