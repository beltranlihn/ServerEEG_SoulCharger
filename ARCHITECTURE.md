# Arquitectura — Soul Charger

Cómo funciona el sistema. El inventario de detalle está en `COMPONENTS.md`; el porqué de las decisiones, en `docs/adr/`.

## 1. Panorama

Soul Charger convierte la actividad cerebral de una persona, medida con una diadema **Muse 2**, en un valor que un motor gráfico (**Unreal Engine** o **TouchDesigner**) usa para conducir una experiencia de VR. La cadena es enteramente local:

```
Muse 2 ──BLE──> muse-js ──eegReadings──> pseudo-bandas ──ratio──> Calm Score
                                                                     │
                                           WebSocket:3000 ───────────┘
                                                  │
                                      server.js ──┴──> 3 direcciones OSC ──UDP:8000──> Unreal
```

El navegador (Chrome/Edge) hace todo el trabajo de señal: se conecta a la diadema por Web Bluetooth, calcula el índice de calma y lo emite por WebSocket. El **relay** de Node.js sólo transporta: recibe por WebSocket y reenvía por OSC/UDP a la IP configurada. No hay build, ni bundler, ni framework.

> 🔴 **Advertencia de validez, no de transporte.** El transporte funciona; el *contenido* que viaja no es hoy lo que dice ser: las bandas EEG son un solo escalar plegado con módulo (H1), el pulso es inventado (H2) y el research mezcla 75 sesiones fabricadas (H3). Ver §6 y `docs/historial/2026-08-25-analisis-para-traspaso.md`.

## 2. Componentes y frontera entre ellos

Tres procesos, dos fronteras. La frontera navegador↔relay es un WebSocket; la frontera relay↔motor es OSC/UDP. **El relay es un extremo de dos sentidos:** hoy emite y, de forma esbozada e insegura, también recibe (`/unreal/end_session`); la sincronización bidireccional plena está planificada (R10, ADR de D6).

```
┌─────────────────────────┐        ┌──────────────────────┐        ┌───────────────────┐
│  NAVEGADOR (Chrome/Edge) │        │  RELAY (Node.js)     │        │  MOTOR GRÁFICO    │
│  soul-charger-admin.html │        │  backend/server.js   │        │  Unreal / TouchD. │
│  ─ Web Bluetooth → Muse 2│        │                      │        │                   │
│  ─ pipeline de señal     │  WS    │  ─ HTTP estático 5500│  OSC   │  ─ Blueprint lee  │
│  ─ Calm Score + estado   │ ─────> │  ─ WS 3000 → UDP     │ ─────> │    3 direcciones  │
│  ─ paneles P1 / P2       │  3000  │  ─ 1 UDPPort/cliente │  8000  │                   │
│  ─ research (localStorage)│ <───── │  ─ NaN shield        │ <╌╌╌╌╌ │  ─ /unreal/end_.. │
└─────────────────────────┘        └──────────────────────┘        └───────────────────┘
        (todo en la misma máquina)         (─── emite ·  ╌╌╌ recibe, hoy inalcanzable H9)
```

Aislamiento por cliente: cada WebSocket abre **su propio `UDPPort`** con su IP/puerto de destino (`server.js:82-88`). Todo el estado —destino, escudo de NaN, temporizadores— cuelga del objeto `ws`. No hay estado global compartido entre clientes: por eso P1 y P2 pueden apuntar a IPs distintas, y por eso el relay ya escalaría a N paneles sin tocarlo (D7).

## 3. Modelo de datos

*Leer esto antes que ninguna función.*

**Las tres direcciones OSC** (ADR `adr-0005`). Un mensaje por valor, con su tipo:

| Dirección | Tipo | Valor | Rango |
|---|---|---|---|
| `/muse/calm` | `f` | Índice de calma | `0.0`–`1.0` |
| `/muse/heart_rate` | `f` | Ritmo cardíaco | bpm |
| `/muse/sensor_active` | `i` | Sensor activo | `0` / `1` |

Hasta la ronda `R16` viajaba además `/muse/data`, un arreglo de 18 floats leído por índice cuya longitud
estaba congelada (`adr-0003`, ya reemplazada). Se retiró al confirmar el director que Unreal consume las
direcciones con nombre. Con él se fueron el **progreso de calibración** y el **estado del Bluetooth**, que no
tienen dirección propia: hoy no salen del navegador.

**Sesión de research** (objeto en `localStorage`, clave `soulcharger_sessions`): array de sesiones con panel, `headsetName`, marca de tiempo, delta de calma. Hoy **mezcla reales y sintéticas** sin distinguir origen (H3). El plan (R5) añade una fila CSV por tick con calma, pulso, `sensorActive`, bandas, progreso y **origen del dato** (`real`/`simulado`).

**Estado del pipeline** (por panel, en memoria del navegador): `appState` (`WARMUP`/`CALIBRATING`/`RUNNING`), `rawAlpha`…`rawDelta`, `currentBpm`, `sensorActive`, baseline (media y desviación), buffers de la media móvil.

## 4. Flujos principales

### F1 · EEG real → Calm Score → OSC (el camino principal)
Muse 2 emite `eegReadings` por BLE → `muse-js` los entrega al navegador → el pipeline calcula pseudo-bandas y el ratio de calma en un loop de 16,67 ms (60 Hz) → la máquina de estados `WARMUP→CALIBRATING→RUNNING` normaliza contra el baseline del participante → el resultado se manda por WebSocket → `server.js` lo reenvía como tres mensajes OSC/UDP a la IP del panel → Unreal lee cada dirección por su nombre.

### F2 · Simulación (sin diadema)
El botón *Simulate* (sólo en el admin, H7) sustituye la fuente real por señales sintéticas (`soul-charger-admin.html:1484-1512`). **Detalle relevante:** en simulación las cuatro bandas *sí* son señales independientes con distinta frecuencia y ruido — la simulación es más realista que el hardware (H1).

### F3 · Persistencia y research
Al cerrar una sesión, `persistSession()` la añade a `soulcharger_sessions` y el navegador puede pedir al relay que guarde gráficas como PNG en `research/`. La vista Research (`?view=research`) promedia las sesiones. Hoy sólo produce imágenes (no tabla, H5) y promedia datos contaminados (H3).

### F4 · Canal de entrada (esbozado, hoy inalcanzable)
`server.js:120-128` escucha `/unreal/end_session` y lo reenviaría al navegador como `unreal_command`. **No se ha comprobado que llegue nunca** porque el socket usa `localPort: 0` (puerto efímero, H9). Es el punto de partida de R10.

## 5. Conceptos transversales

- **Gestión de estado:** todo en `localStorage` del navegador, no en servidor (`soulcharger_users`, `soulcharger_sessions`, `soulcharger_theme`, `soulcharger_seed_version`). El relay es sin estado persistente.
- **Escudo de NaN** (`server.js:73-79`): los micro-cortes de BLE producen `NaN` → `null` en JSON, que revienta a los oyentes OSC. `safeFloat()` retiene el último valor sano por cliente. **Cualquier campo nuevo debe pasar por ahí.**
- **Calibración con baseline por participante + z-score:** la potencia absoluta varía enormemente entre personas y sesiones; normalizar contra el propio baseline es el enfoque correcto y **se conserva** (§5.7 del análisis).
- **Pipeline duplicado (H7):** bandas, Calm Score, máquina de estados, calibración y telemetría están copiados en `soul-charger-admin.html` y `soul-charger-app.html`. **Todo arreglo se hace dos veces** hasta que se unifique (R9).
- **Idioma:** identificadores y UI en inglés; documentación y comentarios en castellano neutro.

## 6. Riesgos y deuda técnica

*Tan valiosa como el resto: es lo que evita que alguien «arregle» algo que está así a propósito, y lo que orienta la próxima refactorización.* Detalle con `fichero:línea` en `docs/historial/2026-08-25-analisis-para-traspaso.md`.

| Riesgo | Por qué existe | Qué lo mitigaría |
|---|---|---|
| **H1 · Las bandas EEG no son bandas** | `(avgPower·k) % 1.0`: un solo escalar plegado con módulo, sin FFT, sin separar electrodos | FFT por canal con ventana de Hann; potencias relativas y logaritmo (R8) |
| **H2 · Pulso inventado** | `70 + (avgPower % 30)`, y ni siquiera sale por OSC (idx 14 = `0.0`) | Leer el PPG real del Muse 2 (`enablePpg`), detección de latido (R7) |
| **H3 · Research contaminado** | `seedDemoData()` fabrica 75 sesiones con media forzada a +7 % y las replanta al recargar | Quitar el resembrado; marcar origen `real`/`demo`; recontar (R6) |
| **H4 · Caída de BLE no detectada** | No hay manejador de `gattserverdisconnected`; `_btOn` mira el estado de la app, no el enlace | Suscribir la desconexión y conmutar a simulación sin cortar el OSC (R3) |
| **H5 · Sólo hay PNG, no tabla** | La telemetría por tick se calcula pero no se guarda en texto | CSV por sesión + índice acumulado (R5) |
| **H6 · La IP de destino no se recuerda** | El constructor sobrescribe el campo en cada carga (`:1131`); sin validación | Persistir en `localStorage`, validar y mostrar la IP efectiva (R2) |
| **H7 · Pipeline duplicado** | Copiado en dos HTML con constantes mantenidas por separado | Extraer a un módulo compartido, o retirar `soul-charger-app.html` (R9) |
| **H8 · `sensorActive` no mide contacto** | `avgPower >= 1.0`: umbral sobre amplitud cruda, no contacto con la piel | Usar `telemetryData`/`connectionStatus` de muse-js (R8) |
| **H9 · Canal de entrada sin puerto fijo** | `localPort: 0`: puerto efímero que cambia en cada reconexión; la gafa no puede alcanzarlo | Puerto de escucha fijo y configurable, tabla de enrutado (R10) |

## 7. Glosario

- **Calm Score / índice de calma:** valor 0–1 que se envía a Unreal. Hoy es un ratio de pseudo-bandas; el objetivo (R11) es una **definición operativa**: fórmula fija, publicada y versionada, que responde de forma reproducible a maniobras que inducen relajación o activación. No pretende ser «verdadera», sino consistente, sensible y declarada.
- **Baseline:** media y desviación de la señal del propio participante, medidas durante la calibración. Todo se normaliza contra él (z-score).
- **RMSSD:** variabilidad del ritmo cardíaco latido a latido; marcador de tono parasimpático. Segundo pilar propuesto del índice, **independiente del EEG** (§5 del análisis).
- **PPG:** fotopletismografía; el sensor óptico del Muse 2 que mide pulso de verdad. Hoy sin usar (H2).
- **Bandas (delta/theta/alfa/beta):** rangos de frecuencia del EEG. Alfa (8–13 Hz) en TP9/TP10 sube al cerrar los ojos (efecto Berger): es el pilar cortical del índice.
- **Panel:** una instancia de `MusePanel` en el admin. Hoy hay dos fijos (P1/P2); la arquitectura debe tratarlo como *una instancia de un componente*, no como dos piezas (D7).
- **Relay:** el proceso Node (`server.js`). Extremo de dos sentidos entre el navegador y el motor gráfico.
- **Sonda (`probe-*`):** guion de Node que verifica un comportamiento sin diadema ni Unreal, y que **sabe fallar** contra el código viejo. Se crean en R1.
