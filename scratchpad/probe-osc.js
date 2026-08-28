// Sonda OSC.  Conduce el relay real (le inyecta una trama `full_telemetry` por
// WebSocket) y valida lo que EMITE por UDP: direcciones, TIPOS y rangos — que es
// exactamente lo que Unreal recibiria.  No mide la premisa (que el relay lea la
// trama), mide la conclusion (que el mensaje OSC entregado sea el correcto).
//
// SABE FALLAR contra el codigo actual:
//   - R4: no existian las direcciones dedicadas /muse/heart_rate (f) ni
//     /muse/sensor_active (i).
//   - R16: el arreglo /muse/data seguia emitiendose aunque Unreal ya no lo lee.
// Cada ronda pasa a verde su parte, y la sonda sigue exigiendo la anterior.
const path = require('path');
const NM = path.join(__dirname, '..', 'backend', 'node_modules');
const osc = require(path.join(NM, 'osc'));
const WebSocket = require(path.join(NM, 'ws'));

const PROBE_UDP_PORT = 8100;            // la sonda escucha aqui (no 8000: evita chocar con un Unreal/TouchDesigner real)
const RELAY_WS = process.env.PROBE_RELAY_WS || 'ws://127.0.0.1:3000';
const SENT = { calm: 0.5, bpm: 72, sensorActive: 1, sensorOn: 1, calibProgress: 1.0, stillness: 0.8 };

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
        stillness: SENT.stillness,
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
      // ── Se emiten EXACTAMENTE tres direcciones, ni una más ─────────────
      const dirs = [...new Set(messages.map((m) => m.address))].sort();
      add(dirs.length === 4, `se emiten 4 direcciones (se emiten ${dirs.length}: ${dirs.join(' ') || 'ninguna'})`);

      // ── [R16] El arreglo y el float legado ya NO deben emitirse ─────────
      // El director confirmó que Unreal consume las direcciones dedicadas y nada
      // más. Emitir el arreglo era ancho de banda y confusión (ADR-0005).
      add(byAddr('/muse/data').length === 0, '[R16] /muse/data ya NO se emite');
      add(byAddr('/muse/v2/calm').length === 0, '[R16] /muse/v2/calm ya NO se emite');

      // ── Calma, con su valor y su rango ─────────────────────────────────
      const cm = byAddr('/muse/calm');
      add(cm.length > 0, `se recibe /muse/calm (mensajes: ${cm.length})`);
      if (cm.length) {
        const c = last(cm).args[0];
        add(c.type === 'f', `/muse/calm es float (es ${c.type})`);
        add(Math.abs(c.value - SENT.calm) < 1e-3, `/muse/calm = ${c.value} ≈ ${SENT.calm}`);
        add(c.value >= 0 && c.value <= 1, '/muse/calm en rango 0–1');
      }

      // Nota: R4 sólo verifica el TRANSPORTE del pulso; su VALOR sigue siendo el
      // inventado (H2) hasta R7 (PPG real).
      const hr = byAddr('/muse/heart_rate');
      add(hr.length > 0 && hr[0].args[0] && Math.abs(hr[0].args[0].value - SENT.bpm) < 2,
        `[R4] /muse/heart_rate (f) ≈ ${SENT.bpm} bpm (transporte; valor real = R7)`);
      const sa = byAddr('/muse/sensor_active');
      add(sa.length > 0 && sa[0].args[0] && sa[0].args[0].type === 'i',
        '[R4] /muse/sensor_active de tipo entero (i)');

      // ── [R13] Capa rápida de quietud física ────────────────────────────
      // Es una señal DISTINTA del indice de calma, con latencia distinta.
      // Que existan las dos por separado es el contrato de la ADR-0006.
      const st = byAddr('/muse/stillness');
      add(st.length > 0, `[R13] se recibe /muse/stillness (mensajes: ${st.length})`);
      if (st.length) {
        const q = last(st).args[0];
        add(q.type === 'f', `[R13] /muse/stillness es float (es ${q.type})`);
        add(Math.abs(q.value - SENT.stillness) < 1e-3, `[R13] /muse/stillness = ${q.value} ≈ ${SENT.stillness}`);
        add(q.value >= 0 && q.value <= 1, '[R13] /muse/stillness en rango 0–1');
      }
      // No deben ser el mismo numero: calma y quietud viajan por separado.
      if (st.length && cm.length) {
        add(Math.abs(last(st).args[0].value - last(cm).args[0].value) > 1e-6,
          '[R13] quietud y calma son valores DISTINTOS, no el mismo dato duplicado');
      }

    }
  });
}

module.exports = { run };
