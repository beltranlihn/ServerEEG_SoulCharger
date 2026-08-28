/* RETIRADO 2026-08-28 — ronda R16
   ORIGEN:     backend/server.js · wss.on('connection') → ws.on('message') → full_telemetry
   MOTIVO:     El director confirmó que el Blueprint de Unreal ya consume las direcciones
               dedicadas de R4 (/muse/calm, /muse/heart_rate, /muse/sensor_active) y que no
               necesita ningún otro valor: «el resto de datos los procesaremos por la app».
               El arreglo monolítico dejó de tener consumidor. Reemplaza a ADR-0003
               (arreglo congelado) mediante ADR-0005.
   RESTAURAR:  Volver a pegar los dos bloques dentro del manejador de `full_telemetry`, y
               restaurar en el objeto `v` los índices 3–13, 17 y 18 junto a sus llamadas a
               safeFloat() para giroscopio, acelerómetro y bandas (hoy sólo se conservan
               14 calm, 15 heart_rate y 16 calib_progress, que alimentan mirror_bio).
               Restaurar también la constante btOff. En Unreal habría que volver a leer
               con `Get OSC Message Float At Index`. */

// ── Bloque 1: el arreglo monolítico de 18 floats ──────────────────────────────
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

// ── Bloque 2: el float suelto de calma, versión previa a R4 ───────────────────
if (parsedData.type === 'bio_update' || parsedData.type === 'calm_update') {
    if (parsedData.type === 'calm_update' && ws.udpPort) {
        ws.udpPort.send({ address: "/muse/v2/calm", args: [{ type: "f", value: parsedData.score }] });
    }
}

// ── Bloque 3: entradas del objeto `v` que sólo alimentaban al arreglo ─────────
//   3: g1, 4: g2, 5: g3,                       (giroscopio)
//   6: a1, 7: a2, 8: a3,                       (acelerómetro)
//   9:  safeFloat(alpha, 'eeg_alpha'),
//   10: safeFloat(beta,  'eeg_beta'),
//   11: safeFloat(gamma, 'eeg_gamma'),
//   12: safeFloat(theta, 'eeg_theta'),
//   13: safeFloat(delta, 'eeg_delta'),
//   17: safeFloat(calm_final, 'calm_final'),
//   18: safeFloat(calib_completed, 'calib_completed')
//
// Y sus fuentes:
//   let g1 = safeFloat(gyro  ? gyro[0]  : 0, 'gyro1');
//   let g2 = safeFloat(gyro  ? gyro[1]  : 0, 'gyro2');
//   let g3 = safeFloat(gyro  ? gyro[2]  : 0, 'gyro3');
//   let a1 = safeFloat(accel ? accel[0] : 0, 'accel1');
//   let a2 = safeFloat(accel ? accel[1] : 0, 'accel2');
//   let a3 = safeFloat(accel ? accel[2] : 0, 'accel3');
//   const btOff = 1.0 - btOn;
