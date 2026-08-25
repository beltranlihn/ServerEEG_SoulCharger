# Soul Charger — contrato del proyecto (leer siempre)

Puente de biorretroalimentación entre una diadema **Muse 2** y un motor gráfico (**Unreal Engine** / TouchDesigner): captura EEG por Web Bluetooth, calcula un índice de calma y lo transporta por OSC/UDP. Todo corre en local — HTML+JS+Node, sin build ni framework. Director creativo: Beltrán; desarrollador: Claude.

> **Si acabas de llegar, empieza por `docs/NEXT.md`.** Explica el estado actual, qué leer y en qué orden. El análisis del que sale el plan está en `docs/historial/2026-08-25-analisis-para-traspaso.md`, con nueve hallazgos (`H1`…`H9`) y `fichero:línea`. Tres de ellos importan antes de tocar la señal: las bandas EEG, el ritmo cardíaco y el promedio del research **no miden hoy lo que su nombre dice**.

## 🗺️ Para ubicar cualquier cosa — LEER PRIMERO
Antes de re-escanear el código, consultar el **mapa vivo** (evita quemar contexto):
- **`COMPONENTS.md`** = inventario de referencia: cada componente con `archivo · función`, estado y ticket.
- **`ARCHITECTURE.md`** = cómo funciona (flujos, conceptos transversales, riesgos y deuda, glosario).
- **`docs/adr/`** = por qué (decisiones inmutables). · Skill **`arch-map`** = navegar y mantener el mapa. · Subagente **`arch-explorer`** = búsqueda aislada que devuelve `archivo:línea`.
- **`docs/NEXT.md`** = cola de trabajo activa; tachar a medida que se cierra.
- **Anti-pudrición:** al cambiar código, actualizar la fila de `COMPONENTS.md` **en el mismo commit**.

## Al cerrar CADA ronda: `/code-review`
No cada tres o cuatro: **cada una**. La mayor fuente de defectos son los arreglos anteriores a medias, y anotarlo no basta para evitar el siguiente. Junto con la revisión, las dos preguntas que más fallos cazan:
1. **¿La sonda mide la CONCLUSIÓN o sólo la premisa?**
2. **¿Sabe fallar?** Reconstruir el estado anterior al arreglo y exigir que la sonda lo cace.

El método completo, con el motivo de cada regla, está en `METODO.md`.

## Convenciones (obligatorias)
- **Idioma:** chat y documentación en **castellano neutro — PROHIBIDO el voseo y los argentinismos**. Identificadores y textos de interfaz en **inglés**.
- **Archivar, no borrar:** el código retirado va a `_backup/deprecated/` con fecha, origen y motivo.
- **Acciones destructivas** (borrar o mover ficheros del usuario, reinstalar): confirmar o dejar copia, salvo petición explícita.
- **Comentarios:** ninguno con una afirmación sin comprobar. Un comentario que afirma algo falso se cita como fuente.
- **Un arreglo que cubre un caso de la familia está empezado, no hecho:** buscar los gemelos (el pipeline está duplicado en `soul-charger-admin.html` y `soul-charger-app.html`, ver H7).

## Comandos
- **Ejecutar:** `cd backend && npm install && npm start` — o `Iniciar Soul Charger.bat` (libera puertos y abre Chrome/Edge).
- **Compilar / empaquetar:** *no hay build.* Los HTML son autocontenidos; se edita y se recarga el navegador.
- **Comprobación rápida de sintaxis:** `node --check backend/server.js` (el relay). Los HTML no tienen paso de compilación.
- **Pruebas y sondas:** `npm run probe` — *pendiente: las sondas se crean en R1 (`docs/NEXT.md`).* Hasta entonces no existe.

## Entrega
> **Un despliegue sin comprobar no está hecho: está supuesto.** El guion de entrega tiene que **verificar el resultado** (hash, relectura, recuento) y salir con error si no cuadra.

Instalación **local**, no hay despliegue remoto: la «entrega» es arrancar el relay en la máquina del evento y confirmar que el OSC llega a Unreal/TouchDesigner. Ver el comando `/entrega`.

## Cómo se ejecuta

| Puerto | Qué es |
|---|---|
| `5500` | HTTP estático. Sirve la raíz del proyecto. `/` redirige a `soul-charger-admin.html`. |
| `3000` | WebSocket, el canal navegador → relay. |
| `8000` | Destino OSC/UDP (Unreal). Configurable por panel desde la UI. |

El servidor abre un socket UDP **por cada cliente WebSocket**, así que dos paneles pueden apuntar a IPs distintas simultáneamente (`backend/server.js:82-88`). Web Bluetooth **no** funciona en Firefox ni Safari.

## ⚠️ Contrato OSC — no romper

El mensaje `/muse/data` es un arreglo de **exactamente 18 floats**. Unreal lo lee con `Get OSC Message Float At Index`; cambiar la longitud provoca fallos *out-of-bounds* en el Blueprint. **Decisión registrada en `docs/adr/adr-0003-arreglo-osc-congelado.md`.**

| Índice (0-based) | Unreal | Valor |
|---|---|---|
| 13 | `muse/data14` | Calm Score (`0.0`–`1.0`) |
| 15 | `muse/data16` | Progreso de calibración (`0.0`–`1.0`) |
| 16 | `muse/data17` | BT conectado (`1.0` / `0.0`) |
| 17 | `muse/data18` | BT desconectado — siempre complementario al 16 |

Los otros 14 índices se envían como `0.0` a propósito (giroscopio, acelerómetro y bandas puras silenciados). **Se envían igual** para preservar la longitud. ⚠️ El índice 14 (`heart_rate` en el diccionario interno, `server.js:71`) sale hoy como `0.0`: el pulso no llega a Unreal (H2).

Otras direcciones:
- `/muse/v2/calm` — float suelto, en mensajes de tipo `calm_update`.
- `/unreal/end_session` — **entrante**, desde Unreal. El relay tiene código para reenviarlo al navegador como `unreal_command`, pero **no está comprobado que llegue nunca**: el socket escucha en un puerto efímero (`localPort: 0`, `backend/server.js:91`) que cambia en cada reconexión, así que Unreal no puede saber a dónde enviar (H9). Es lo primero que bloquea la sincronización bidireccional planificada (R10).

## Algoritmo de Calm Score

Definido en `soul-charger-admin.html` (y **duplicado** en `soul-charger-app.html` — si tocas uno, revisa el otro, H7).

Ratio base: `alpha / (beta + 0.4 * gamma + 0.001)`. Gamma actúa como proxy de ruido EMG (mandíbula).

Máquina de estados, en un loop de **50 ms (20 Hz)**:
1. `WARMUP` — 2 s estabilizando señal.
2. `CALIBRATING` — acumula `TARGET_CALIBRATION_SAMPLES = 300` muestras (≈15 s), media y desviación del baseline. Se pausa si `sensorActive === 0`.
3. `RUNNING` — z-score contra el baseline, recortado a ±2.0, normalizado a `0.0`–`1.0`, suavizado con media móvil de `MA_WINDOW = 115` muestras (≈5.75 s).

Tras la calibración, el índice 15 se mantiene en `1.0` durante 5 s y luego cae a `0.0` (`calibProgressLocked`).

> 🔴 **El contenido no es válido, aunque el transporte funcione:** las bandas son pseudo-bandas `(avgPower·k) % 1.0`, no un FFT (H1). La definición de un índice de calma defendible es la sección 5 del análisis y la ronda R11. Cuando se implemente, esta sección se sustituye por la definición vigente.

## Gotchas (no repetir errores)
*Esta sección empieza vacía y crece. Cada entrada sale de un fallo real: qué parecía, qué era, cómo se detecta.*

- *(aún sin entradas de código nuevo — los fallos conocidos del código actual están catalogados como H1…H9 en `docs/historial/2026-08-25-analisis-para-traspaso.md`.)*

## Convenciones y trampas conocidas del código actual
- **Sin build.** Se edita el HTML y se recarga. No agregar un bundler sin pedirlo.
- **Sin CDN.** Todo lo externo va a `vendor/`. Las instalaciones son offline en eventos. **ADR `adr-0002`.**
- **NaN shield** (`server.js:73-79`): los micro-cortes de Bluetooth producen `NaN` → `null` en JSON, que revienta a los oyentes OSC. `safeFloat()` retiene el último valor sano por cliente. Cualquier campo nuevo debe pasar por ahí.
- **Dos paneles por defecto** en el admin: `P1 → 127.0.0.1:8000` y `P2 → 192.168.1.50:8000`. La IP de P2 está escrita en el código (`:1773`).
- **Estado en `localStorage`**, no en servidor: `soulcharger_users`, `soulcharger_sessions`, `soulcharger_theme`, `soulcharger_seed_version`.
- **Vista Research**: `soul-charger-admin.html?view=research`, refresco cada 2 s.
- El navegador puede guardar gráficas (`save_chart_image` por WebSocket); el servidor las escribe en `research/` como `sesion_P{n}{sufijo}_{timestamp}.png`.

## Docs del repo
- **`README.md`** = índice del repositorio: qué hay en cada carpeta. Puerta de entrada.
- **`docs/ESTRUCTURA-DEL-CODIGO.md`** = guía de ORDEN DE LECTURA del código.
- **`PLAN.md`** = bitácora por rondas (lo más nuevo arriba). Una entrada por sesión.
- **`docs/historial/`** = auditorías, investigaciones y propuestas ya cerradas.
- **Higiene de la carpeta:** la raíz sólo lleva código, el manifiesto del proyecto y los documentos vivos. Lo cerrado va a `docs/historial/`. Los volcados de las sondas no se versionan.

## Estado de Firebase
Desactivado a propósito. `frontend/src/firebase-config.js` fue eliminado y `backend/functions/` (Cloud Functions de Firestore) sigue en el repo pero **no se despliega ni se invoca**. La telemetría es local vía OSC. Si se reactiva la nube, ese es el punto de partida.
