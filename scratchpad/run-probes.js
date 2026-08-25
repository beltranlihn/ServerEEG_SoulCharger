// Lanzador unico de sondas.  `npm run probe`.
// Arranca un relay AISLADO en puertos de test y ejecuta TODAS las sondas contra
// el.  Sale con codigo != 0 si alguna falla.  Ver docs/NEXT.md (R1) y METODO.md.
//
// Es hermetico a proposito: no reutiliza el relay que el operador pueda tener en
// marcha (puertos 3000/5500), sino que arranca uno propio en 3999/5599 con
// RELAY_WS_PORT/RELAY_HTTP_PORT.  Asi la sonda mide el codigo de ESTE repo y no
// interfiere con una instalacion en uso.
//
// Una sonda mide la CONCLUSION (lo que Unreal recibe), no la premisa, y SABE
// FALLAR: contra el codigo actual, alguna comprobacion sale en rojo.
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const BACKEND = path.join(__dirname, '..', 'backend');
const TEST_WS_PORT = 3999;
const TEST_HTTP_PORT = 5599;

// La sonda lee de aqui a que relay conectarse.
process.env.PROBE_RELAY_WS = `ws://127.0.0.1:${TEST_WS_PORT}`;

function portOpen(port) {
  return new Promise((res) => {
    const s = net.connect(port, '127.0.0.1');
    s.on('connect', () => { s.destroy(); res(true); });
    s.on('error', () => res(false));
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function startRelay() {
  if (await portOpen(TEST_WS_PORT)) {
    throw new Error(`El puerto de test ${TEST_WS_PORT} esta ocupado; cierra lo que lo use y reintenta`);
  }
  const child = spawn(process.execPath, [path.join(BACKEND, 'server.js')], {
    cwd: BACKEND,
    stdio: 'ignore',
    env: { ...process.env, RELAY_WS_PORT: String(TEST_WS_PORT), RELAY_HTTP_PORT: String(TEST_HTTP_PORT) },
  });
  for (let i = 0; i < 40; i++) {
    await wait(150);
    if (await portOpen(TEST_WS_PORT)) return child;
  }
  child.kill();
  throw new Error('El relay de test no arranco (¿faltan deps? cd backend && npm install)');
}

async function main() {
  const PROBES = [require('./probe-osc')];
  let child = null;
  let anyFail = false;

  try {
    child = await startRelay();
    console.log(`[probe] Relay de test en ws://127.0.0.1:${TEST_WS_PORT}`);

    for (const probe of PROBES) {
      const r = await probe.run();
      const ok = r.checks.every((c) => c.ok);
      console.log(`\n── ${r.name} ── ${ok ? 'OK' : 'FALLA'}`);
      for (const c of r.checks) console.log(`   ${c.ok ? 'PASA ' : 'FALLA'} ${c.msg}`);
      if (!ok) anyFail = true;
    }
  } catch (e) {
    console.error('[probe] Error del lanzador:', e.message);
    anyFail = true;
  } finally {
    if (child) child.kill();
  }

  console.log(anyFail
    ? '\nRESULTADO: FALLA — alguna sonda en rojo (esperado contra el codigo actual: el contrato R4 aun no existe).'
    : '\nRESULTADO: OK — todas las sondas en verde.');
  process.exit(anyFail ? 1 : 0);
}

main();
