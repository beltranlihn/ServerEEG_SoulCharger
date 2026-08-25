# CLAUDE.md

Guía para trabajar en este repositorio. Los datos de aquí están verificados contra el código, no contra documentación previa.

## Qué es esto

Soul Charger es un puente de biorretroalimentación entre una diadema **Muse 2** y un motor gráfico (**Unreal Engine** / TouchDesigner).

```
Muse 2  ──Web Bluetooth──>  Navegador (Chrome/Edge)  ──WebSocket:3000──>  Node.js relay  ──OSC/UDP:8000──>  Unreal
```

Todo corre en local. No hay build step, ni bundler, ni framework: los HTML son autocontenidos y las dependencias viven en `vendor/`.

## Estructura

```
soul-charger-admin.html   Panel de operador. La aplicación principal (~95 KB, HTML+CSS+JS inline).
soul-charger-app.html     Vista de participante, versión de un solo usuario.
vendor/                   Dependencias servidas offline (sin CDN).
  chart.umd.min.js          Chart.js para las gráficas de telemetría.
  muse-js.bundle.js         Cliente Web Bluetooth de la Muse.
  fonts/all-fonts.css       Tipografías locales.
backend/
  server.js               Servidor HTTP estático + relay WebSocket→OSC. El único proceso de servidor.
  functions/              Firebase Cloud Functions. INACTIVO (ver "Estado de Firebase").
Iniciar Soul Charger.bat  Lanzador: libera puertos, arranca el relay y abre el navegador.
hardware/Source/          C++ para Unreal (SoulChargerBLE, SoulChargerBrainFlow). Vía nativa alternativa,
                          no la usa la app web. Requiere SDK/ para compilar.
SDK/                      SDK propietario de Muse para Windows. NO versionado (1.1 GB). Ver README.
research/                 Capturas PNG que genera el servidor al guardar gráficas. NO versionado.
generate_analysis_doc.js  Script que produce Soul_Charger_Analisis_de_Datos.docx.
```

## Cómo se ejecuta

```bash
cd backend && npm install && npm start
```

O bien `Iniciar Soul Charger.bat`, que además libera los puertos y abre Chrome/Edge (Web Bluetooth **no** funciona en Firefox ni Safari).

| Puerto | Qué es |
|---|---|
| `5500` | HTTP estático. Sirve la raíz del proyecto. `/` redirige a `soul-charger-admin.html`. |
| `3000` | WebSocket, el canal navegador → relay. |
| `8000` | Destino OSC/UDP (Unreal). Configurable por panel desde la UI. |

El servidor abre un socket UDP **por cada cliente WebSocket**, así que dos panels pueden apuntar a IPs distintas simultáneamente.

## ⚠️ Contrato OSC — no romper

El mensaje `/muse/data` es un arreglo de **exactamente 18 floats**. Unreal lo lee con `Get OSC Message Float At Index`; cambiar la longitud provoca fallos *out-of-bounds* en el Blueprint.

| Índice (0-based) | Unreal | Valor |
|---|---|---|
| 13 | `muse/data14` | Calm Score (`0.0`–`1.0`) |
| 15 | `muse/data16` | Progreso de calibración (`0.0`–`1.0`) |
| 16 | `muse/data17` | BT conectado (`1.0` / `0.0`) |
| 17 | `muse/data18` | BT desconectado — siempre complementario al 16 |

Los demás 14 índices se envían como `0.0` a propósito (giroscopio, acelerómetro y bandas puras están silenciados). **Se envían igual** para preservar la longitud.

Otras direcciones:
- `/muse/v2/calm` — float suelto, en mensajes de tipo `calm_update`.
- `/unreal/end_session` — **entrante**, desde Unreal. El relay lo reenvía al navegador como `unreal_command`.

## Algoritmo de Calm Score

Definido en `soul-charger-admin.html` (y duplicado en `soul-charger-app.html` — si tocas uno, revisa el otro).

Ratio base: `alpha / (beta + 0.4 * gamma + 0.001)`. Gamma actúa como proxy de ruido EMG (mandíbula).

Máquina de estados, en un loop de **50 ms (20 Hz)**:

1. `WARMUP` — 2 s estabilizando señal.
2. `CALIBRATING` — acumula `TARGET_CALIBRATION_SAMPLES = 300` muestras (≈15 s) y calcula media y desviación estándar del baseline. Se pausa si `sensorActive === 0`.
3. `RUNNING` — z-score contra el baseline, recortado a ±2.0, normalizado a `0.0`–`1.0`, y suavizado con media móvil de `MA_WINDOW = 115` muestras (≈5.75 s).

Tras completar la calibración, el índice 15 se mantiene en `1.0` durante 5 s y luego cae a `0.0` (`calibProgressLocked`).

## Convenciones y trampas conocidas

- **Sin build.** Se edita el HTML directamente y se recarga el navegador. No agregues un bundler sin pedirlo.
- **Sin CDN.** Todo lo externo va a `vendor/`. Las instalaciones son offline en eventos.
- **NaN shield** (`server.js`): los micro-cortes de Bluetooth producen `NaN` → `null` en JSON, que revienta a los oyentes OSC. `safeFloat()` retiene el último valor sano por cliente. Cualquier campo nuevo debe pasar por ahí.
- **Dos paneles por defecto** en el admin: `P1 → 127.0.0.1:8000` y `P2 → 192.168.1.50:8000`. La IP de P2 está escrita en el código.
- **Estado en `localStorage`**, no en servidor: `soulcharger_users`, `soulcharger_sessions`, `soulcharger_theme`, `soulcharger_seed_version`.
- **Vista Research**: `soul-charger-admin.html?view=research`, refresco cada 2 s.
- El navegador puede guardar gráficas mandando `save_chart_image` por WebSocket; el servidor las escribe en `research/` como `sesion_P{n}{sufijo}_{timestamp}.png`.

## Estado de Firebase

Desactivado a propósito. `frontend/src/firebase-config.js` fue eliminado y `backend/functions/` (Cloud Functions de Firestore) sigue en el repo pero **no se despliega ni se invoca**. La telemetría es local vía OSC. Si se reactiva la nube, ese es el punto de partida.
