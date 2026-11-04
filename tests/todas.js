// Brújula de Vida — ejecuta todas las pruebas: node tests/todas.js
// Cada archivo *.test.js imprime «ok» o «FALLO» por comprobación y sale con
// código 1 si algo falla. Esto los lanza uno tras otro y resume.
// No necesitan instalar nada: solo Node. No se publican (build.sh copia una
// lista cerrada de archivos).
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');

const dir = __dirname;
let total = 0, fallos = 0;
fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort().forEach(f => {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  const salida = (r.stdout || '') + (r.stderr || '');
  const ok = (salida.match(/^ok /gm) || []).length, ko = (salida.match(/^FALLO/gm) || []).length;
  total += ok + ko; fallos += ko + (r.status !== 0 && !ko ? 1 : 0);
  console.log((r.status === 0 ? 'ok   ' : 'FALLO') + ' ' + f + ': ' + ok + ' bien, ' + ko + ' mal');
  if (r.status !== 0) console.log(salida.split('\n').filter(l => /FALLO|Error/.test(l)).join('\n'));
});
console.log('\n' + total + ' comprobaciones, ' + fallos + ' fallos');
process.exit(fallos ? 1 : 0);
