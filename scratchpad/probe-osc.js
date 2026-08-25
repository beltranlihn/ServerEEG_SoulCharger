// Sonda OSC.  Conduce el relay real (le inyecta una trama `full_telemetry` por
// WebSocket) y valida lo que EMITE por UDP: direcciones, TIPOS y rangos — que es
// exactamente lo que Unreal recibiria.  No mide la premisa (que el relay lea la
// trama), mide la conclusion (que el mensaje OSC entregado sea el correcto).
//
// SABE FALLAR contra el codigo actual:
//   - el pulso no viaja: el arreglo /muse/data pone idx 14 en 0.0 (H2)
//   - no existen las direcciones dedicadas /muse/heart_rate (f) ni
//     /muse/sensor_active (i) que definira R4.
// Cuando R4 este hecho, esas comprobaciones pasan a verde.
const path = require('path');
const NM = path.join(__dirname, '..', 'backend', 'node_modules');
const osc = require(path.join(NM, 'osc'));
const WebSocket = require(path.join(NM, 'ws'));

const PROBE_UDP_PORT = 8100;            // la sonda escucha aqui (no 8000: evita chocar con un Unreal/TouchDesigner real)
const RELAY_WS = process.env.PROBE_RELAY_WS || 'ws://127.0.0.1:3000';
const SENT = { calm: 0.5, bpm: 72, sensorActive: 1, sensorOn: 1, calibProgress: 1.0 };

function run() {
  return new Promise((resolve) => {
    const checks = [];
    const add = (ok, msg) => checks.push({ ok, msg });
    const messages = [];

    const udp = new osc.UDPPort({ localAddress: '0.0.0.0', localPort: PROBE_UDP_PORT, metadata: true });
    let done = false;

    const finish = () => {
      if (done) return; done = true;
      try { udp.close(); } catch (e) {}
      evaluate();
      resolve({ name: 'probe-osc', checks });
    };

    udp.on('message', (m) => messages.push(m));
    udp.on('error', (e) => { add(false, `No se pudo abrir el puerto UDP ${PROBE_UDP_PORT}: ${e.message}`); finish(); });
    udp.on('ready', () => {
      const ws = new WebSocket(RELAY_WS);
      const frame = () => JSON.stringify({
        type: 'full_telemetry',
        oscIp: '127.0.0.1', oscPort: PROBE_UDP_PORT,
        sensorOn: SENT.sensorOn, sensorActive: SENT.sensorActive,
        gyro: [0, 0, 0], accel: [0, 0, 0],
        alpha: 0, beta: 0, gamma: 0, theta: 0, delta: 0,
        calm: SENT.calm, bpm: SENT.bpm, calibProgress: SENT.calibProgress,
        calm_final: 0, calib_completed: 0, headset_id: 'PROBE',
      });
      // Se envian varias tramas espaciadas a proposito: al fijar un puerto OSC
      // nuevo el relay reabre su socket UDP de forma asincrona (initUDP) y PIERDE
      // el primer envio; las siguientes ya llegan.  Enviar una sola daria un
      // falso negativo del contrato actual.
      ws.on('open', () => {
        let n = 0;
        const t = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(frame());
          if (++n >= 6) clearInterval(t);
        }, 120);
      });
      ws.on('error', (e) => { add(false, `No se pudo conectar al relay: ${e.message}`); });
      setTimeout(() => { try { ws.close(); } catch (e) {} finish(); }, 1400); // ventana de recepcion
    });
    udp.open();

    const byAddr = (a) => messages.filter((m) => m.address === a);
    const last = (arr) => arr[arr.length - 1];

    function evaluate() {
      // ── Contrato ACTUAL (debe estar en verde) ──────────────────────────
      const data = byAddr('/muse/data');
      add(data.length > 0, `se recibe /muse/data (mensajes: ${data.length})`);
      if (data.length) {
        const m = last(data);
        add(m.args.length === 18, `/muse/data lleva 18 args (lleva ${m.args.length})`);
        add(m.args.every((a) => a.type === 'f'), 'todos los args de /muse/data son float (f)');
        const calm = m.args[13] && m.args[13].value;
        add(Math.abs(calm - SENT.calm) < 1e-3, `idx13 calm = ${calm} ≈ ${SENT.calm}`);
        add(calm >= 0 && calm <= 1, 'idx13 calm en rango 0–1');
        const on = m.args[16] && m.args[16].value;
        const off = m.args[17] && m.args[17].value;
        add(Math.abs((on + off) - 1) < 1e-6, `idx16/17 BT complementarios (${on} / ${off})`);
      }

      // ── Contrato NUEVO de R4 (HOY EN ROJO: la sonda sabe fallar) ────────
      // Nota: R4 sólo verifica el TRANSPORTE del pulso; su VALOR sigue siendo el
      // inventado (H2) hasta R7 (PPG real).
      const hr = byAddr('/muse/heart_rate');
      add(hr.length > 0 && hr[0].args[0] && Math.abs(hr[0].args[0].value - SENT.bpm) < 2,
        `[R4] /muse/heart_rate (f) ≈ ${SENT.bpm} bpm (transporte; valor real = R7)`);
      const sa = byAddr('/muse/sensor_active');
      add(sa.length > 0 && sa[0].args[0] && sa[0].args[0].type === 'i',
        '[R4] /muse/sensor_active de tipo entero (i)');
      // El pulso viaja por su direccion dedicada, NO en el arreglo congelado:
      // idx14 se queda en 0.0 a proposito (ADR-0003 / ADR-0004).
      if (data.length) {
        const idx14 = last(data).args[14] && last(data).args[14].value;
        add(idx14 === 0, `[R4] idx14 del arreglo sigue en 0.0 (el pulso va por /muse/heart_rate, no aqui)`);
      }
    }
  });
}

module.exports = { run };
