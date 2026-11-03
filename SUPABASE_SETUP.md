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
escribe la clave **pública** en `js/infraestructura/nube-supabase.js`, que es pública por diseño. La
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

## 7. Obligatorio: activa la confirmación de correo en Supabase Auth

**Authentication → Providers → Email → "Confirm email"** → actívalo.

Las cuentas se crean solo con correo (o con Google o Facebook), así que cada
persona confirma el suyo con el enlace que le llega. Hasta entonces la cuenta no
se abre: nadie puede registrarse con un correo que no es suyo. El enlace vuelve
a la app y lleva a iniciar sesión.

Para que eso funcione:

- **Authentication → URL Configuration**: tu dirección publicada como
  **Site URL** y también en **Redirect URLs** (ver 7b).
- **Authentication → Emails → SMTP Settings**: con usuarios reales, configura un
  SMTP propio (Resend sirve: el mismo que el correo semanal). El servidor de
  correo que trae Supabase envía muy pocos correos por hora y es para pruebas:
  con él, a partir de unas pocas altas los correos de confirmación dejan de
  llegar y esas personas no pueden entrar.
- Opcional: en **Authentication → Emails → Templates → Confirm signup** puedes
  poner el texto en español.

Las cuentas antiguas de teléfono o nombre de usuario (correo interno
`@usuarios.avanzaya.pages.dev`) ya no se pueden crear. Si quedara alguna en la
nube, con la confirmación activada no podría entrar desde otro dispositivo.

## 7c. Ajustes de seguridad del panel

No se pueden poner desde el código: hazlo una vez en el panel de Supabase.

- **Authentication → Attack Protection → Prevent use of leaked passwords**:
  actívalo (rechaza contraseñas que aparecen en filtraciones conocidas).
- **Authentication → Providers → Email → Minimum password length**: 8, igual que
  la app. Si no, alguien que llame a la API directamente puede usar una de 6.
- **Authentication → Rate Limits**: revisa el de altas y el de inicios de sesión
  por IP; los valores por defecto son generosos.
- **Authentication → Attack Protection → CAPTCHA** (Cloudflare Turnstile): la
  mejor defensa contra altas automáticas. Necesita también un cambio en la app
  (mandar el token del CAPTCHA al registrarse) y añadir
  `https://challenges.cloudflare.com` a la política de seguridad (`_headers`,
  `index.html` y `.htaccess`).
- **Edge Functions**: deja publicadas solo `send-reminders` y `send-weekly-email`.
  Cualquier otra que aparezca ahí y no esté en `supabase/functions/` sobra.

## 7a. Recuperar la contraseña

«¿Olvidaste tu contraseña?» envía un correo con un enlace que vuelve a la app.
Para que funcione, en Supabase → **Authentication → URL Configuration** tu
dirección publicada tiene que estar como **Site URL** y en **Redirect URLs**
(ver el apartado siguiente). El servidor de correo incluido en Supabase tiene un
límite bajo de envíos por hora y es para pruebas: con usuarios reales, configura
un SMTP propio en **Authentication → Emails → SMTP Settings**.

## 7b. Entrar con Google y con Facebook

Las dos van a través de Supabase. En ambos casos la dirección de vuelta
(*redirect*) que hay que dar al proveedor es:

```
https://fgpwhdfvqtlvfmmzhxsy.supabase.co/auth/v1/callback
```

Y en Supabase → **Authentication → URL Configuration** pon tu dirección
publicada (p. ej. `https://avanzaya.pages.dev`) como **Site URL** y añádela en
**Redirect URLs** (para probar en local, añade también `http://localhost:8765`).

**Google**
1. Google Cloud Console → APIs y servicios → Credenciales → Crear credenciales
   → ID de cliente de OAuth → tipo "Aplicación web".
2. En "URI de redireccionamiento autorizados", la dirección de vuelta de arriba.
3. Supabase → **Authentication → Providers → Google** → actívalo y pega el
   Client ID y el Client Secret.

**Facebook**
1. developers.facebook.com → **Mis apps → Crear app** → caso de uso
   "Autenticar y solicitar datos a los usuarios con el inicio de sesión con
   Facebook". Es gratis.
2. En el producto **Inicio de sesión con Facebook → Configuración**, añade la
   dirección de vuelta de arriba en "URI de redireccionamiento de OAuth válidos".
3. En **Configuración de la app → Básica** copia el identificador de la app y la
   clave secreta, y añade la URL de tu política de privacidad (puede ser la de
   la app publicada). Meta la pide para poner la app en modo público.
4. Supabase → **Authentication → Providers → Facebook** → actívalo y pega el
   identificador y la clave secreta.
5. Mientras la app de Meta esté en modo desarrollo, solo pueden entrar las
   personas añadidas como probadoras; para todo el mundo, pásala a modo activo.

Si alguien entra con Facebook sin compartir su correo, la app crea igualmente
su cuenta (identificada por su id de Facebook en Supabase).

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
2. **Claves VAPID:** `node supabase/rotar-vapid.mjs`, después sube `js/infraestructura/nube-supabase.js` y
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
