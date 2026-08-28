# Estructura del código — Soul Charger

Guía de orientación para leer este repositorio por primera vez. Describe **qué hay, dónde está y en qué orden leerlo**.

*Este documento es la capa de ORDEN DE LECTURA. El inventario de detalle está en `COMPONENTS.md` y el funcionamiento en `ARCHITECTURE.md`; aquí se responde a «por dónde empiezo».*

## 1. Panorama

Puente de biorretroalimentación Muse 2 → motor gráfico. Todo local, sin build: dos HTML autocontenidos hacen la señal en el navegador, y un relay de Node la transporta por OSC.

| Fichero | Líneas | Contenido |
|---|---:|---|
| `soul-charger-admin.html` | ~1777 | La aplicación real. Clase `MusePanel`, pipeline de señal, Calm Score, calibración, dos paneles P1/P2, vista Research y análisis profundo. |
| `soul-charger-app.html` | ~812 | Vista de participante, un usuario. **Duplica** el pipeline del admin (H7). |
| `backend/server.js` | ~261 | El relay: HTTP estático (5500) + WebSocket (3000) → OSC/UDP (8000). |
| `vendor/` | — | Dependencias offline: `muse-js.bundle.js`, `chart.umd.min.js`, fuentes. Sin CDN (ADR `adr-0002`). |
| `hardware/Source/` | — | C++ para Unreal (vía alternativa, no la usa la app web). Requiere SDK. |

## 2. Componentes y la frontera entre ellos

Tres procesos en la misma máquina, dos fronteras:
- **Navegador ↔ relay:** WebSocket en `3000` (JSON).
- **Relay ↔ motor:** OSC/UDP en `8000` (tres direcciones con nombre).

El relay es un **extremo de dos sentidos**: emite, y de forma esbozada también recibe (`/unreal/end_session`, hoy inalcanzable, H9). Diagrama en `ARCHITECTURE.md` §2.

## 3. El modelo de datos

*Leer esto antes que ninguna función.* Detalle en `ARCHITECTURE.md` §3.
- **Tres direcciones:** `/muse/calm` (f), `/muse/heart_rate` (f), `/muse/sensor_active` (i). El arreglo `/muse/data` se retiró en R16 (ADR `adr-0005`).
- **Sesión de research:** array en `localStorage` (`soulcharger_sessions`); hoy mezcla reales y sintéticas (H3).
- **Estado del pipeline:** `appState`, bandas, `currentBpm`, `sensorActive`, baseline — por panel, en memoria del navegador.

## 4. Recorrido del código en orden de lectura

| Ubicación | Bloque | Puntos de entrada |
|---|---|---|
| `backend/server.js` | El relay entero (es corto). Empezar aquí: define el contrato de transporte. | `wss.on('connection')`, `initUDP()`, `safeFloat()`, envío de las tres direcciones (~L204) |
| `soul-charger-admin.html` · `class MusePanel` | El panel: conexión BLE, UI, envío WS. | constructor (~L1100), `connect()` |
| `soul-charger-admin.html` · pipeline | Bandas → Calm Score → máquina de estados. **El corazón, y donde están H1/H2/H8.** | cálculo de bandas (~L1640), Calm Score (~L1410), loop de 16,67 ms (60 Hz) |
| `soul-charger-admin.html` · research | Persistencia y vista de datos. **Donde está H3.** | `seedDemoData()` (~L627), `persistSession()` (~L1326), `renderResearchView()` (~L704) |
| `soul-charger-app.html` | Sólo si se toca el pipeline: es el gemelo duplicado (H7). | — |

## 5. Los flujos principales

Esquemas en `ARCHITECTURE.md` §4. En resumen:
- **F1** EEG real → pseudo-bandas → Calm Score → tres mensajes OSC → Unreal.
- **F2** Simulación (señales sintéticas, sólo en el admin).
- **F3** Persistencia y research (hoy PNG, no tabla).
- **F4** Canal de entrada OSC (esbozado, inalcanzable).

## 6. Empaquetado y entrega

No hay empaquetado: los HTML se sirven tal cual desde `backend/server.js`. La entrega es una **instalación local** — arrancar el relay en la máquina del evento (`Iniciar Soul Charger.bat`) y confirmar que el OSC llega al motor. No hay despliegue remoto.

## 7. Convenciones del código

- **Idioma:** comentarios y documentación en castellano neutro (sin voseo); identificadores y textos de interfaz en inglés.
- **Marcas de ronda:** los comentarios de cambios llevan `[R##]`, que remite a la entrada de `PLAN.md`.
- **Archivar, no borrar:** el código retirado va a `_backup/deprecated/` con su encabezado.
- **Verificación:** `npm run probe` ejecuta las sondas sin diadema ni Unreal, y **saben fallar** contra el código viejo. Creadas en R1.

## 8. Trampas conocidas

*Lo que parece un error y no lo es. Un revisor que lea esto se ahorra medio día.* Catálogo completo con `fichero:línea` en `docs/historial/2026-08-25-analisis-para-traspaso.md`.

| Asunto | Qué hay que saber |
|---|---|
| Los 14 índices `0.0` del arreglo OSC | Son intencionados: preservan la longitud de 18 que espera el Blueprint. No «rellenarlos» sin motivo (ADR `adr-0003`). |
| La simulación es más realista que el hardware | En modo real las bandas son un solo escalar (H1); en simulación son 4 señales independientes. No es un bug de la simulación. |
| `_btOn` dice «conectado» con el casco caído | Se calcula desde el estado de la app, no del enlace BLE (H4). Un flujo congelado tiene pinta de válido. |
| Borrar las sesiones no las borra | El resembrado (`seedDemoData`) las replanta al recargar (H3). |
| El pipeline está duplicado | Todo arreglo de señal se hace en `admin` y en `app` (H7). |
| El escudo de NaN es obligatorio | Todo campo OSC nuevo pasa por `safeFloat()` o revienta a los oyentes. |

## 9. Por dónde empezar a leer

1. `docs/adr/` completo (las decisiones inmutables).
2. `ARCHITECTURE.md` (cómo encaja todo).
3. El **modelo de datos**: las tres direcciones en `backend/server.js` (~L204) y la tabla del contrato OSC en `CLAUDE.md`.
4. El **bucle principal**: el pipeline de señal en `soul-charger-admin.html` (~L1390–1627).
5. `COMPONENTS.md` para localizar cualquier otra cosa sin volver a escanear el código.
