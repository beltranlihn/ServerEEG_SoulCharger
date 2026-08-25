const osc = require("osc");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const http = require("http");

// ── Static file server (port 5500) ─────────────────────────────────────────
// [R1] Puertos configurables por entorno para que las sondas arranquen un relay
// aislado sin chocar con la instalacion del operador. Por defecto, 5500 / 3000.
const STATIC_PORT = Number(process.env.RELAY_HTTP_PORT) || 5500;
const STATIC_ROOT = path.join(__dirname, "..");
const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
};

http.createServer((req, res) => {
    let pathname = decodeURIComponent(req.url.split("?")[0]);
    if (pathname === "/") pathname = "/soul-charger-admin.html";
    const filepath = path.join(STATIC_ROOT, pathname);
    if (!filepath.startsWith(STATIC_ROOT)) {
        res.writeHead(403); res.end("Forbidden"); return;
    }
    fs.stat(filepath, (err, stats) => {
        if (err || !stats.isFile()) { res.writeHead(404); res.end("Not found"); return; }
        const ext = path.extname(filepath).toLowerCase();
        res.writeHead(200, {
            "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
            "Cache-Control": "no-store"
        });
        fs.createReadStream(filepath).pipe(res);
    });
}).listen(STATIC_PORT, () => {
    console.log(`[HTTP] Static server: http://localhost:${STATIC_PORT}`);
    console.log(`[HTTP] Admin URL:     http://localhost:${STATIC_PORT}/soul-charger-admin.html`);
});

const WS_PORT = Number(process.env.RELAY_WS_PORT) || 3000;
const wss = new WebSocket.Server({ port: WS_PORT });

console.log("");
console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║   RELAY OSC v3 — BT idx 16/17 (muse/data17 + muse/data18)   ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log("║   WS port:    3000                                           ║");
console.log("║   OSC array:  18 floats @ /muse/data                         ║");
console.log("║   Active:     idx 13=calm   15=calib   16=BT_ON   17=BT_OFF  ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log("");

wss.on('connection', function connection(ws) {
    console.log("[WS] Frontend Biorreactivo Conectado al Relay");
    
    // Estado y puertos exclusivos por cada cliente WS conectado
    ws.targetIp = "127.0.0.1";
    ws.targetPort = 8000;
    ws.udpPort = null;
    
    // ==========================================
    // NaN SHIELD: Retención del Último Valor Sano (AISLADO POR CLIENTE)
    // ==========================================
    ws.lastValidValues = {
        status_on: 0.0, status_active: 0.0,
        gyro1: 0.0, gyro2: 0.0, gyro3: 0.0,
        accel1: 0.0, accel2: 0.0, accel3: 0.0,
        eeg_alpha: 0.0, eeg_beta: 0.0, eeg_gamma: 0.0, eeg_theta: 0.0, eeg_delta: 0.0,
        calm_state: 0.0, heart_rate: 75.0, calib_progress: 0.0, calm_final: 0.0,
        bt_connected: 0.0, bt_disconnected: 1.0
    };

    function safeFloat(val, key) {
        if (val == null || typeof val === 'undefined' || Number.isNaN(Number(val))) {
            return ws.lastValidValues[key];
        }
        ws.lastValidValues[key] = Number(val);
        return ws.lastValidValues[key];
    }

    function initUDP() {
        if (ws.udpPort) {
            try { ws.udpPort.close(); } catch(e){}
        }
        
        ws.udpPort = new osc.UDPPort({
            localAddress: "0.0.0.0",
            localPort: 0, // El SO asigna un puerto libre automáticamente para este cliente
            remoteAddress: ws.targetIp,
            remotePort: ws.targetPort,
            metadata: true
        });
        
        ws.udpPort.open();
        
        ws.udpPort.on("ready", function () {
            console.log(`[OSC] Conexión UDP lista. Flujo enviado a -> ${ws.targetIp}:${ws.targetPort}`);
        });
        
        ws.udpPort.on("error", function (err) {
            console.error("[OSC] Error UDP: ", err);
        });

        // Escucha de comandos entrantes desde Unreal a este puerto UDP específico
        ws.udpPort.on("message", function (oscMsg) {
            if (oscMsg.address === "/unreal/end_session") {
                console.log(`[OSC IN] Orden de fin de sesión desde Unreal (${ws.targetIp}:${ws.targetPort}).`);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'unreal_command', command: 'end_session' }));
                }
            }
        });
    }

    // Inicializamos el UDP al conectar el socket
    initUDP();
    
    // Al conectar, forzamos sincronizar los parámetros actuales hacia el frontend
    ws.send(JSON.stringify({ type: 'config_sync', ip: ws.targetIp, port: ws.targetPort }));

    ws.on('message', function message(data) {
        try {
            const parsedData = JSON.parse(data);
            
            if (parsedData.type === 'config_update') {
               ws.targetIp = parsedData.ip || ws.targetIp;
               ws.targetPort = parseInt(parsedData.port) || ws.targetPort;
               initUDP(); // Reinicia el socket UDP exclusivo hacia la nueva IP
               ws.send(JSON.stringify({ status: 'info', msg: `Ruta OSC actualizada a ${ws.targetIp}:${ws.targetPort}` }));
            }

            if (parsedData.type === 'save_chart_image') {
                const base64Data = parsedData.image.replace(/^data:image\/png;base64,/, '');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const suffix = parsedData.suffix || '';
                const filename = `sesion_P${parsedData.player}${suffix}_${timestamp}.png`;
                const researchDir = path.join(__dirname, '..', 'research');
                if (!fs.existsSync(researchDir)) fs.mkdirSync(researchDir, { recursive: true });
                const filepath = path.join(researchDir, filename);
                try {
                    fs.writeFileSync(filepath, base64Data, 'base64');
                    console.log(`[Chart] Guardado: research/${filename}`);
                } catch(e) {
                    console.error('[Chart] Error al guardar:', e);
                }
            }

            if (parsedData.type === 'bio_update' || parsedData.type === 'calm_update') {
                if(parsedData.type === 'calm_update' && ws.udpPort) {
                    ws.udpPort.send({ address: "/muse/v2/calm", args: [{ type: "f", value: parsedData.score }] });
                }
            }

            if (parsedData.type === 'full_telemetry') {
                // Actualizar destino OSC si el frontend indica un nuevo IP/puerto
                const reqIp   = (parsedData.oscIp   || '').trim();
                const reqPort = parseInt(parsedData.oscPort) || 0;
                if (reqIp && (reqIp !== ws.targetIp || reqPort !== ws.targetPort)) {
                    ws.targetIp   = reqIp;
                    ws.targetPort = reqPort;
                    console.log(`[OSC] Target → ${ws.targetIp}:${ws.targetPort}`);
                    initUDP();
                }

                if (!ws.udpPort) return;

                const {
                    sensorOn, sensorActive, gyro, accel,
                    alpha, beta, gamma, theta, delta,
                    calm, bpm, calibProgress, calm_final, calib_completed, headset_id
                } = parsedData;

                let fOn = safeFloat(sensorOn ? 1 : 0, 'status_on');
                let fAct = safeFloat(sensorActive ? 1 : 0, 'status_active');
                const isOff = (fOn === 0 || fAct === 0);

                let g1 = safeFloat(gyro ? gyro[0] : 0, 'gyro1');
                let g2 = safeFloat(gyro ? gyro[1] : 0, 'gyro2');
                let g3 = safeFloat(gyro ? gyro[2] : 0, 'gyro3');

                let a1 = safeFloat(accel ? accel[0] : 0, 'accel1');
                let a2 = safeFloat(accel ? accel[1] : 0, 'accel2');
                let a3 = safeFloat(accel ? accel[2] : 0, 'accel3');

                // Interpolación Visual: Permitimos que los últimos valores se mantengan al perder la conexión
                const v = {
                    1: fOn, 2: fAct,
                    3: g1,
                    4: g2,
                    5: g3,
                    6: a1,
                    7: a2,
                    8: a3,
                    9: safeFloat(alpha, 'eeg_alpha'),
                    10: safeFloat(beta, 'eeg_beta'),
                    11: safeFloat(gamma, 'eeg_gamma'),
                    12: safeFloat(theta, 'eeg_theta'),
                    13: safeFloat(delta, 'eeg_delta'),
                    14: safeFloat(calm, 'calm_state'),
                    15: safeFloat(bpm, 'heart_rate'),
                    16: safeFloat(calibProgress, 'calib_progress'),
                    17: safeFloat(calm_final, 'calm_final'),
                    18: safeFloat(calib_completed, 'calib_completed')
                };

                // Force scalar coercion: defends against truthy strings, NaN, undefined
                const btOn  = (Number(fOn) === 1) ? 1.0 : 0.0;
                const btOff = 1.0 - btOn;

                // Log every BT state transition so it's clearly visible
                if (ws._lastBtOn !== btOn) {
                    console.log(`[BT TRANSITION] btOn ${ws._lastBtOn ?? '∅'} → ${btOn}  |  OSC idx16=${btOn}  idx17=${btOff}  (sensorOn_raw=${sensorOn})`);
                    ws._lastBtOn = btOn;
                }

                // 18-float array. Active indices: 13=calm, 15=calibProgress, 16=btConnected, 17=btDisconnected
                ws.udpPort.send({
                    address: "/muse/data",
                    args: [
                        { type: "f", value: 0.0 }, { type: "f", value: 0.0 },
                        { type: "f", value: 0.0 }, { type: "f", value: 0.0 }, { type: "f", value: 0.0 },
                        { type: "f", value: 0.0 }, { type: "f", value: 0.0 }, { type: "f", value: 0.0 },
                        { type: "f", value: 0.0 }, { type: "f", value: 0.0 }, { type: "f", value: 0.0 },
                        { type: "f", value: 0.0 }, { type: "f", value: 0.0 },
                        { type: "f", value: v[14] }, { type: "f", value: 0.0 },
                        { type: "f", value: v[16] },   // idx 15: calibProgress  → muse/data16
                        { type: "f", value: btOn },    // idx 16: BT connected   → muse/data17
                        { type: "f", value: btOff }    // idx 17: BT disconnected → muse/data18
                    ]
                });

                // Eliminado el envío de /muse/headset para no romper el Blueprint de Unreal

                // Solo devolvemos el mirror a ESTE cliente
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'mirror_bio', calm: v[14], bpm: v[15], calibProgress: v[16] }));

                    // Reducimos log a 1 vez cada segundo para no saturar, pero siempre si hay ruido
                    let now = Date.now();
                    if (!ws.lastLogTime || now - ws.lastLogTime > 1000 || isOff) {
                        ws.lastLogTime = now;
                        console.log(`[DEBUG] ${ws.targetIp}:${ws.targetPort} -> [On:${fOn}, Act:${fAct}, Calm:${v[14].toFixed(2)}, Calib:${v[16].toFixed(3)}]`);
                    }
                }
            }
        } catch (e) {
            console.error("[Relay] Error de parseo o envío: ", e);
        }
    });

    ws.on('close', () => {
        console.log(`[WS] Frontend Desconectado. Cerrando puerto UDP asociado a ${ws.targetIp}:${ws.targetPort}`);
        if (ws.udpPort) {
            try { ws.udpPort.close(); } catch(e){}
        }
    });
});
