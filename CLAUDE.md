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
- **Pruebas y sondas:** `npm run probe` — arranca un relay aislado (WS 3999 / HTTP 5599), corre las sondas y sale con error si alguna falla. Hoy sólo `probe-osc`; las demás se crean en sus rondas.

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

## ⚠️ Contrato OSC — sólo tres direcciones

El relay emite **exactamente tres mensajes** por tick, a 60 Hz. No hay ningún otro. Registrado en
`docs/adr/adr-0005-retirada-del-arreglo-osc.md`.

| Dirección | Tipo | Valor | Estado del contenido |
|---|---|---|---|
| `/muse/calm` | `f` | Índice de calma, `0.0`–`1.0` | ⚠️ transporte correcto, **contenido no válido** (H1) hasta R8 |
| `/muse/heart_rate` | `f` | Ritmo cardíaco en bpm | ⚠️ transporte correcto, **valor inventado** (H2) hasta R7 |
| `/muse/sensor_active` | `i` | Sensor activo, `0` / `1` | ⚠️ entero correcto, **su veracidad** la arreglan R3/R8 (H4/H8) |
| `/muse/stillness` | `f` | Quietud física, `0.0`–`1.0` | ✅ mide lo que dice: relajación **muscular**, no cortical |

**⚠️ `calm` y `stillness` NO son la misma señal, y no deben fundirse** (ADR-0006). La calma es *estado*: lenta,
suavizada 5,75 s, y **rechaza** el artefacto muscular. La quietud es *agencia*: llega cada ~47 ms sin media
móvil, sale de la amplitud frontal (AF7/AF8) y responde **gracias** a ese mismo artefacto. Es la misma
magnitud física usada al revés. Si alguien las une en un número, al mejorar la validez la experiencia se queda
muerta, y al hacerla responder el registro se llena de tensión mandibular etiquetada como calma.

> **Nodos en Unreal / TouchDesigner:** un `OSC Message` por dirección →
> `Get OSC Message Float At Index 0` para `/muse/calm`, `/muse/heart_rate` y `/muse/stillness`;
> `Get OSC Message Int At Index 0` para `/muse/sensor_active`.
>
> **Para mover algo que el usuario sienta que controla, usa `/muse/stillness`, no `/muse/calm`.** La calma se
> mueve en segundos: sirve para el color o el tamaño de fondo, no para la respuesta inmediata.

**Retirado en R16 — no volver a añadirlo sin leer la ADR-0005:**
`/muse/data` (el arreglo de 18 floats) y `/muse/v2/calm`. El director confirmó que Unreal ya consume las
direcciones con nombre y no necesita nada más. El código está archivado en
`_backup/deprecated/20260828-arreglo-osc-18-floats.js` con instrucciones de restauración.

Consecuencia que conviene tener presente: **el progreso de calibración y el estado del Bluetooth ya no salen
por OSC**. Iban en los índices 15 y 16 del arreglo y no tienen dirección propia. Si algún día hacen falta en el
motor, hay que añadirlas explícitamente.

Verificado por `probe-osc` (`npm run probe`), que exige las tres direcciones con su tipo **y que el arreglo NO
se emita**. Comprobado que sabe fallar: contra el código anterior sale en rojo detectando cuatro direcciones.
Probado contra TouchDesigner; **contra Unreal sigue sin probarse desde este repositorio**.

Dirección **entrante**:
- `/unreal/end_session` — desde Unreal. El relay tiene código para reenviarlo al navegador como
  `unreal_command`, pero **no está comprobado que llegue nunca**: el socket escucha en un puerto efímero
  (`localPort: 0`, `backend/server.js`) que cambia en cada reconexión, así que Unreal no puede saber a dónde
  enviar (H9). Es lo primero que bloquea la sincronización bidireccional planificada (R10).

## Algoritmo de Calm Score

Definido en `soul-charger-admin.html` (y **duplicado** en `soul-charger-app.html` — si tocas uno, revisa el otro, H7).

Ratio base: `alpha / (beta + 0.4 * gamma + 0.001)`. Gamma actúa como proxy de ruido EMG (mandíbula).

Máquina de estados, en un loop de **16,67 ms (60 Hz)**, alineado con los 60 fps del motor. Subir la cadencia **no añade información** —el EEG llega a ~21 Hz por canal—: sirve para que cada fotograma tenga un mensaje fresco. La suavidad se interpola en Unreal.
1. `WARMUP` — 2 s estabilizando señal.
2. `CALIBRATING` — exige **`CALIBRATION_SECONDS = 15` s de tiempo activo Y `MIN_CALIBRATION_SAMPLES = 200` muestras**; con las dos calcula media y desviación del baseline. Se pausa si `sensorActive === 0`.
3. `RUNNING` — z-score contra el baseline, recortado a ±2.0, normalizado a `0.0`–`1.0`, suavizado con media móvil sobre una **ventana de `SMOOTHING_SECONDS = 5,75` s**.

Tras la calibración, el progreso se mantiene en `1.0` durante 5 s y luego cae a `0.0` (`calibProgressLocked`). Desde R16 **este valor ya no sale por OSC**: sólo alimenta la interfaz y el espejo hacia el navegador.

> 🔴 **El contenido no es válido, aunque el transporte funcione:** las bandas son pseudo-bandas `(avgPower·k) % 1.0`, no un FFT (H1). La definición de un índice de calma defendible es la sección 5 del análisis y la ronda R11. Cuando se implemente, esta sección se sustituye por la definición vigente.

## Gotchas (no repetir errores)
*Esta sección empieza vacía y crece. Cada entrada sale de un fallo real: qué parecía, qué era, cómo se detecta.*

- **Una ventana en segundo plano estrangula el flujo OSC a ~1 Hz.** *Qué parece:* la diadema falla o el relay
  se cuelga — el motor recibe valores congelados y la calibración no avanza. *Qué es:* Chrome estrangula los
  temporizadores de las pestañas ocultas. Reproducido el 2026-08-28: **62,5 Hz con la ventana visible, 1,5 Hz
  al ocultarla**, con huecos de 1000 ms exactos. *Cómo se detecta:* si los huecos entre mensajes son múltiplos
  de un segundo, es esto. *Qué hacer:* mantener la ventana del panel visible durante toda la sesión. Desde
  R15 el sistema degrada con honestidad —la calibración no se completa con datos basura— pero **sigue sin
  avisar**; darle aviso es parte de R3.
- **Contar ticks no es medir tiempo.** *Qué parece:* una ventana «de 15 s» definida como 300 muestras.
  *Qué es:* `setInterval` no cumple su promesa —medido, entrega 61,8 Hz cuando se le piden 60— y bajo
  estrangulamiento la misma cuenta puede tardar minutos. *Qué hacer:* las ventanas se cierran contra el reloj,
  con los milisegundos por tick acotados (`MAX_TICK_DELTA_MS`) para que una pausa del navegador no cuente
  como tiempo medido.
- *(los fallos conocidos del código heredado están catalogados como H1…H9 en `docs/historial/2026-08-25-analisis-para-traspaso.md`.)*

## Convenciones y trampas conocidas del código actual
- **Sin build.** Se edita el HTML y se recarga. No agregar un bundler sin pedirlo.
- **Sin CDN.** Todo lo externo va a `vendor/`. Las instalaciones son offline en eventos. **ADR `adr-0002`.**
- **NaN shield** (`server.js:73-79`): los micro-cortes de Bluetooth producen `NaN` → `null` en JSON, que revienta a los oyentes OSC. `safeFloat()` retiene el último valor sano por cliente. Cualquier campo nuevo debe pasar por ahí.
- **Dos paneles por defecto** en el admin: `P1 → 127.0.0.1:8000` y `P2 → 192.168.1.50:8000`. La IP de P2 está escrita en el código (`:1773`).
- **Estado en `localStorage`**, no en servidor: `soulcharger_users`, `soulcharger_sessions`, `soulcharger_theme`, `soulcharger_seed_version`.
- **Vista Research**: `soul-charger-admin.html?view=research`, refresco cada 2 s.
- **Monitor OSC en vivo** (R17/R18): bajo cada panel, tres osciloscopias con lo que sale por cable y la
  **cadencia real en Hz**. Si baja de 30 se pone en rojo — es el aviso del estrangulamiento que faltaba. El
  **dibujo** va por `requestAnimationFrame` (se para con la pestaña oculta, a propósito); las **cifras y la
  cadencia** van por `setInterval`, para que no se queden congeladas con pinta de actuales.
- ⚠️ **El trazo de pulso es un electrocardiograma SINTÉTICO** (R18): un complejo PQRST dibujado a la frecuencia
  que marca el bpm, no una onda cardíaca medida. Etiquetado «trace synthesized» en la interfaz. Ni siquiera
  con el PPG real de R7 será una onda medida, salvo que se dibuje explícitamente.
- ⚠️ **La gráfica de sesión de Chart.js sigue existiendo, fuera de pantalla** (`.charts-row`, R18). No es
  decoración muerta: de ella cuelgan el PNG que se guarda en `research/` y la llamada a `persistSession()`.
  Si alguien borra ese bloque del DOM, **las sesiones dejan de registrarse en silencio**.
- El navegador puede guardar gráficas (`save_chart_image` por WebSocket); el servidor las escribe en `research/` como `sesion_P{n}{sufijo}_{timestamp}.png`.

## Docs del repo
- **`README.md`** = índice del repositorio: qué hay en cada carpeta. Puerta de entrada.
- **`docs/ESTRUCTURA-DEL-CODIGO.md`** = guía de ORDEN DE LECTURA del código.
- **`PLAN.md`** = bitácora por rondas (lo más nuevo arriba). Una entrada por sesión.
- **`docs/historial/`** = auditorías, investigaciones y propuestas ya cerradas.
- **Higiene de la carpeta:** la raíz sólo lleva código, el manifiesto del proyecto y los documentos vivos. Lo cerrado va a `docs/historial/`. Los volcados de las sondas no se versionan.

## Estado de Firebase
Desactivado a propósito. `frontend/src/firebase-config.js` fue eliminado y `backend/functions/` (Cloud Functions de Firestore) sigue en el repo pero **no se despliega ni se invoca**. La telemetría es local vía OSC. Si se reactiva la nube, ese es el punto de partida.
