# Soul Charger - Muse OSC Relay

Integración entre una diadema **Muse 2** (vía Web Bluetooth en el navegador) y **Unreal Engine** / TouchDesigner (vía OSC UDP desde un relay Node.js). Todo corre en local.

```
Muse 2 ──Web Bluetooth──> Navegador ──WebSocket:3000──> Node.js relay ──OSC/UDP:8000──> Unreal
```

## Estructura de la Aplicación
- **`soul-charger-admin.html`**: panel de operador y aplicación principal. Captura el EEG por Bluetooth, calcula el Calm Score y lo envía por WebSocket al backend. Es autocontenido (HTML + CSS + JS inline).
- **`soul-charger-app.html`**: vista de participante, versión de un solo usuario.
- **`vendor/`**: dependencias servidas de forma local (Chart.js, muse-js, tipografías). Sin CDN, para funcionar offline en eventos.
- **`backend/`**: servidor Node.js que hace de servidor HTTP estático y de relay WebSocket → UDP/OSC hacia Unreal Engine.
- **`hardware/Source/`**: integración nativa en C++ para Unreal (vía alternativa, no la usa la app web).

## Documentación

| Ruta | Qué es |
|---|---|
| **`docs/ESTRUCTURA-DEL-CODIGO.md`** | **Por dónde empezar a leer el código.** Orden de lectura y trampas conocidas. |
| `CLAUDE.md` | Contrato del proyecto: convenciones, comandos, contrato OSC, algoritmo, gotchas. |
| `ARCHITECTURE.md` | Cómo funciona: componentes, flujos, conceptos transversales, riesgos y deuda. |
| `COMPONENTS.md` | Inventario componente a componente, con `archivo · función` y estado. |
| `PLAN.md` | Bitácora por rondas: cada cambio con su motivo y sus mediciones (lo más nuevo arriba). |
| `METODO.md` | Las reglas de trabajo. Cada una nació de un fallo concreto. |
| `docs/adr/` | Decisiones de diseño con su porqué (inmutables). |
| `docs/NEXT.md` | Cola de trabajo pendiente, de rápido a complejo. |
| `docs/historial/` | Documentos cerrados: auditorías e investigaciones. Contexto, no referencia. |

Carpetas de trabajo: `scratchpad/` (sondas de verificación, sus volcados no se versionan) · `_backup/deprecated/` (código retirado, con fecha).

## Guía de Inicio

La forma rápida en Windows es ejecutar **`Iniciar Soul Charger.bat`**: libera los puertos, arranca el relay y abre el panel en Chrome o Edge.

Manualmente:

```bash
cd backend
npm install
npm start
```

Luego abre <http://localhost:5500/soul-charger-admin.html>.

> **Web Bluetooth solo funciona en Chrome o Edge.** Firefox y Safari no lo soportan.

| Puerto | Uso |
|---|---|
| `5500` | Servidor HTTP estático (sirve los HTML y `vendor/`). |
| `3000` | WebSocket entre el navegador y el relay. |
| `8000` | Destino OSC/UDP hacia Unreal (por defecto `127.0.0.1:8000`, configurable desde la UI). |

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
