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
console.log("║   RELAY OSC v5 — 4 direcciones (ADR-0005 + ADR-0006)            ║");
console.log("╠══════════════════════════════════════════════════════════════╣");
console.log(`║   WS port:    ${WS_PORT}                                           ║`);
console.log("║   Emite:      /muse/calm (f)          lento, estado          ║");
console.log("║               /muse/heart_rate (f)                           ║");
console.log("║               /muse/sensor_active (i)                        ║");
console.log("║               /muse/stillness (f)     rápido, agencia        ║");
console.log("║   Retirado:   /muse/data y /muse/v2/calm (R16)               ║");
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
    // [R16] Una entrada por cada clave que safeFloat() usa realmente.
    ws.lastValidValues = {
        status_on: 0.0, status_active: 0.0,
        calm_state: 0.0, heart_rate: 75.0, calib_progress: 0.0,
        stillness: 0.5
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

                // [R16] Sólo se extrae lo que aún tiene consumidor. Giroscopio,
                // acelerómetro, bandas, calm_final, calib_completed y headset_id se
                // retiraron junto al arreglo (ADR-0005).
                const { sensorOn, sensorActive, calm, bpm, calibProgress, stillness } = parsedData;

                let fOn = safeFloat(sensorOn ? 1 : 0, 'status_on');
                let fAct = safeFloat(sensorActive ? 1 : 0, 'status_active');
                const isOff = (fOn === 0 || fAct === 0);

                // [R16] Sólo se conservan los tres valores que consume Unreal, más el
                // progreso de calibración que alimenta el espejo hacia el navegador.
                // Giroscopio, acelerómetro y bandas se retiraron con el arreglo: ver
                // ADR-0005 y _backup/deprecated/20260828-arreglo-osc-18-floats.js.
                // Todos pasan por el escudo de NaN, que existe por un fallo real.
                const v = {
                    14: safeFloat(calm, 'calm_state'),
                    15: safeFloat(bpm, 'heart_rate'),
                    16: safeFloat(calibProgress, 'calib_progress'),
                    // [R13] Capa rápida de quietud física. Señal distinta del índice de
                    // calma, con latencia distinta: no fundirlas (ADR-0006).
                    19: safeFloat(stillness, 'stillness')
                };

                // Force scalar coercion: defends against truthy strings, NaN, undefined
                const btOn = (Number(fOn) === 1) ? 1.0 : 0.0;

                // Log every BT state transition so it's clearly visible
                if (ws._lastBtOn !== btOn) {
                    console.log(`[BT TRANSITION] btOn ${ws._lastBtOn ?? '∅'} → ${btOn}  (sensorOn_raw=${sensorOn})`);
                    ws._lastBtOn = btOn;
                }

                // [R4/R16] Las tres ÚNICAS direcciones que se emiten. Cada valor con su
                // tipo correcto y su nombre. El arreglo /muse/data se retiró en R16 porque
                // Unreal ya no lo lee (ADR-0005 reemplaza a ADR-0003).
                // calm y heart_rate ya pasaron por el escudo de NaN (v[14], v[15]); el
                // estado del sensor se coacciona a entero 0/1.
                const sensorActiveInt = (fAct >= 0.5) ? 1 : 0;
                ws.udpPort.send({ address: "/muse/calm",          args: [{ type: "f", value: v[14] }] });
                ws.udpPort.send({ address: "/muse/heart_rate",    args: [{ type: "f", value: v[15] }] });
                ws.udpPort.send({ address: "/muse/sensor_active", args: [{ type: "i", value: sensorActiveInt }] });
                ws.udpPort.send({ address: "/muse/stillness",      args: [{ type: "f", value: v[19] }] });

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
