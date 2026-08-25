# Soul Charger - Muse OSC Relay

Este repositorio contiene la integración entre una diadema Muse (vía Web Bluetooth en el Frontend) y Unreal Engine (vía OSC UDP en el Backend Node.js).

## Estructura de la Aplicación
- **/frontend**: Aplicación web que captura las lecturas EEG por Bluetooth, calcula el algoritmo de calma y las envía por WebSocket al backend.
- **/backend**: Servidor Node.js (WebSocket a UDP/OSC Relay) que recibe la telemetría web y la reenvía como OSC a Unreal Engine en un puerto local.

## Guía de Inicio

### Backend (Relay OSC)
```bash
cd backend
npm install
npm start
```
El servidor inicia en `localhost:3000` (para el WebSocket del Frontend) y enviará OSC hacia la IP/Puerto definidos (por defecto `127.0.0.1:8000`).

---

## Requisitos externos (no versionados)

Para mantener el repositorio liviano, estos recursos **no están en git** y deben obtenerse por separado:

| Ruta | Qué es | Cómo obtenerlo |
|---|---|---|
| `SDK/libmuse_windows_8.0.5/` | SDK propietario de Muse para Windows (~1.1 GB de binarios `.lib`). Solo necesario para compilar la integración nativa de `hardware/Source`. | Descargar desde el portal de desarrolladores de Muse y descomprimir dentro de `SDK/`. |
| `backend/node_modules/` | Dependencias de Node. | `cd backend && npm install` |
| `research/`, `sesion_*.png` | Capturas y exports generados por las sesiones EEG. | Se regeneran al ejecutar sesiones; no forman parte del código. |

El frontend web (`soul-charger-app.html`) **no** requiere el SDK: se conecta a la diadema vía Web Bluetooth usando `vendor/muse-js.bundle.js`, que sí está versionado.

## ⚠️ ESQUEMA CRÍTICO DE PAYLOAD OSC (NO MODIFICAR)

Para mantener la compatibilidad con el Blueprint (`Get OSC Message Float At Index`) en Unreal Engine, el mensaje principal de telemetría bajo la dirección `/muse/data` se envía como un arreglo monolítico de **18 Floats** (Índices del 0 al 17).

Cualquier alteración en la longitud del arreglo provocará fallos de *Out-Of-Bounds* en Unreal Engine.

### Índices Activos (Configuración Actual)
El arreglo tiene **18 Floats** (Índices del 0 al 17). Todos los valores se envían como `0.0`, excepto los siguientes:

| Índice (0-based) | Unreal `muse/dataN` | Valor |
|---|---|---|
| 13 | muse/data14 | Calm Score (`0.0`–`1.0`) |
| 15 | muse/data16 | Calibration Progress (`0.0`–`1.0`, llega a `1.0` al completar) |
| 16 | muse/data17 | BT Connected — `1.0` mientras el headset está conectado, `0.0` si no |
| 17 | muse/data18 | BT Disconnected — `1.0` mientras el headset está desconectado, `0.0` si no |

> Los índices 16 y 17 son siempre complementarios.

*Nota:* Originalmente este arreglo enviaba datos de giroscopio, acelerómetro y ondas cerebrales, pero actualmente se silencian a `0.0` para optimizar el envío.
