// Brújula de Vida — rota las claves VAPID del recordatorio push.
//
// Uso (desde la carpeta del proyecto, con el CLI de Supabase ya autorizado
// con `npx supabase login`):
//   node supabase/rotar-vapid.mjs
//
// Qué hace:
//   1. Genera un par de claves VAPID nuevo (P-256) en memoria.
//   2. Las guarda directamente como secretos de las funciones de Supabase
//      (VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY), mediante un archivo temporal
//      privado que se sobrescribe y borra en cuanto el CLI termina.
//   3. Solo si eso salió bien, escribe la clave PÚBLICA en js/infraestructura/nube-supabase.js (es
//      pública por diseño: el navegador la necesita para suscribirse).
// La clave privada no se imprime ni se guarda en ningún archivo del proyecto.

import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF = 'fgpwhdfvqtlvfmmzhxsy';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SYNC = join(ROOT, 'js', 'infraestructura', 'nube-supabase.js');

// --- 1. claves nuevas
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const priv = privateKey.export({ format: 'jwk' });
const b = (s) => Buffer.from(s, 'base64url');
const VAPID_PUBLIC = Buffer.concat([Buffer.from([4]), b(pub.x), b(pub.y)]).toString('base64url');
const VAPID_PRIVATE = priv.d;
if (b(VAPID_PUBLIC).length !== 65 || b(VAPID_PRIVATE).length !== 32) {
  console.error('Las claves generadas no tienen el tamaño esperado. No se ha cambiado nada.');
  process.exit(1);
}

// --- 2. a los secretos de Supabase, sin dejar rastro en disco
const tmp = join(tmpdir(), 'bdv-vapid-' + randomBytes(8).toString('hex') + '.env');
let ok = false;
try {
  writeFileSync(tmp, 'VAPID_PUBLIC_KEY=' + VAPID_PUBLIC + '\nVAPID_PRIVATE_KEY=' + VAPID_PRIVATE + '\n', { mode: 0o600 });
  const r = spawnSync('npx', ['--yes', 'supabase', 'secrets', 'set', '--env-file', tmp, '--project-ref', PROJECT_REF], {
    stdio: 'inherit', shell: process.platform === 'win32'
  });
  ok = r.status === 0;
} finally {
  if (existsSync(tmp)) {
    try { writeFileSync(tmp, '0'.repeat(256)); } catch { /* se borra igual */ }
    unlinkSync(tmp);
  }
}

if (!ok) {
  console.error('\nNo se pudieron guardar los secretos en Supabase. No se ha cambiado nada.');
  console.error('Comprueba que has hecho `npx supabase login` y vuelve a ejecutar el script.');
  process.exit(1);
}

// --- 3. la pública, a sync.js
const src = readFileSync(SYNC, 'utf8');
const re = /(var VAPID_PUBLIC_KEY = ')[A-Za-z0-9_-]+(';)/;
if (!re.test(src)) {
  console.error('\nSecretos guardados, pero no encontré VAPID_PUBLIC_KEY en js/infraestructura/nube-supabase.js.');
  console.error('Pon a mano esta clave PÚBLICA en js/infraestructura/nube-supabase.js: ' + VAPID_PUBLIC);
  process.exit(1);
}
writeFileSync(SYNC, src.replace(re, '$1' + VAPID_PUBLIC + '$2'));

console.log('\nListo:');
console.log('  - VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY nuevas guardadas en Supabase.');
console.log('  - js/infraestructura/nube-supabase.js actualizado con la clave pública nueva.');
console.log('Siguiente: sube los cambios (js/infraestructura/nube-supabase.js y sw.js) al hosting. Los móviles con el');
console.log('recordatorio activo se volverán a suscribir solos al abrir la app.');
