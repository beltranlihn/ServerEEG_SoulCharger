# Cola de trabajo

Ordenada de **rápido a complejo**. Se tacha lo cerrado; se poda lo que deje de tener sentido.

> **Una lista de pendientes envejece como un comentario.** Si una entrada lleva meses sin tocarse, o se hace o
> se borra.

> **Una hipótesis escrita aquí no es un hecho.** Lo que se anotó como causa probable vuelve a verificarse al
> retomarlo.

---

## EMPEZAR POR AQUÍ

**Estado a 2026-08-25.** El repositorio acaba de limpiarse (se retiraron el SDK del control de versiones, una
versión antigua del frontend, ~400 capturas y una auditoría que contradecía al código) y se ha instalado el
sistema de trabajo de Alma Digital Studio. **No se ha escrito código nuevo todavía.**

**Antes de tocar nada, leer en este orden:**

1. `METODO.md` — las reglas. No son opcionales; cada una nació de un fallo concreto.
2. `docs/historial/2026-08-25-analisis-para-traspaso.md` — **el documento importante.** Contiene los ocho
   hallazgos de la lectura del código, con `fichero:línea`. Todas las entradas de esta cola remiten a él
   como `H1`…`H8`.
3. `CLAUDE.md` — el contrato: puertos, contrato OSC, algoritmo, trampas.

**El siguiente paso es la Ronda 0.** No empezar por el encargo nuevo: primero el orden documental, y
después la red de sondas. Escribir el sistema nuevo sin forma de medirlo es cómo se llega a tener un Calm
Score que lleva meses sin medir calma (H1).

**Lo que hay que saber antes de prometer nada al director:** tres de los datos que el sistema muestra hoy no
son lo que dicen ser — las bandas EEG (H1), el ritmo cardíaco (H2) y el promedio de calma del research, que
incluye 75 sesiones fabricadas (H3). No son fallos de transporte; son fallos de contenido. El encargo nuevo
—enviar calma, pulso y estado del sensor— se apoya justo encima de los tres.

### Dos caminos posibles, y hay que elegir

| | **Camino A — entregar antes** | **Camino B — validez antes** |
|---|---|---|
| Orden | R0 → R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8 | R0 → R1 → R7 → R8 → luego el resto |
| Qué se consigue pronto | Un sistema completo, verificable y ordenado, que transporta y registra bien | Datos que miden de verdad lo que dicen |
| Qué se asume | Durante un tiempo se registra y se envía un Calm Score y un pulso que no son válidos. Las filas quedan marcadas y se pueden descartar después | La instalación tarda más en tener CSV, IP persistente y recuperación ante caídas |

**Recomendación:** camino A **si hay una fecha de exhibición cerca**, porque R2–R6 son los que hacen que la
instalación no se rompa en vivo; camino B si lo próximo es publicar o defender resultados. Es una decisión del
director, no del desarrollador.

---

## Rápido

### R0 · Orden documental — no toca código

- [ ] Fusionar `docs/plantillas-sin-fusionar/CLAUDE.md` con el `CLAUDE.md` de la raíz: añadir las secciones del
      método (mapa vivo, `/code-review` al cerrar cada ronda, convenciones de idioma, archivar-no-borrar,
      *gotchas*). **Conservar todo el contenido actual**, que está verificado contra el código.
- [ ] Fusionar `docs/plantillas-sin-fusionar/README.md`: añadir la tabla de documentación.
- [ ] Borrar `docs/plantillas-sin-fusionar/` cuando las dos fusiones estén hechas.
- [ ] Rellenar `ARCHITECTURE.md`. La materia prima está en las secciones 1 y 2 del análisis.
- [ ] Rellenar `COMPONENTS.md` con los subsistemas reales: *Panel*, *Pipeline de señal*, *Transporte OSC*,
      *Persistencia y research*, *Relay*, *Integración Unreal*. Marcar con ⚠️ lo que el análisis señala frágil.
- [ ] Personalizar `.claude/skills/arch-map/SKILL.md` y `.claude/agents/arch-explorer.md`: sustituir los
      `{{NOMBRE}}` y apuntar a los ficheros reales.
- [ ] Rellenar los `{{ }}` de `.claude/commands/commit.md` y `entrega.md` con los comandos reales.
- [ ] Escribir las ADR de las decisiones **ya tomadas**: no versionar el SDK, servir `vendor/` sin CDN, y el
      arreglo congelado de 18 floats.

### R1 · La red de sondas — antes que cualquier código nuevo

- [ ] Crear `scratchpad/` con un lanzador único (`npm run probe`) que ejecute todas las sondas y salga con
      error si alguna falla.
- [ ] **`probe-osc`**: abre un UDP en el 8000, recibe lo que emite el relay y valida direcciones, **tipos** y
      rangos. Debe fallar hoy: el pulso llega `0.0` y el estado del sensor llega como *float*.
- [ ] Verificar que la sonda **sabe fallar**: ejecutarla contra el código actual y comprobar que caza el
      problema. Una sonda que pasa siempre no vale.

### R2 · La IP de la gafa — H6

- [ ] Persistir IP y puerto por panel en `localStorage` y **dejar de sobrescribirlos** en el constructor
      (`soul-charger-admin.html:1131`).
- [ ] Validar el formato antes de enviarlo al relay; hoy se acepta cualquier texto.
- [ ] Sacar el campo del panel de desarrollo a un sitio visible: es un ajuste de operación, no de depuración.
- [ ] Mostrar en la interfaz la IP **efectivamente en uso** confirmada por el relay, no la que se escribió.
      El relay ya envía `config_sync` (`backend/server.js:113`); hoy no se usa para esto.

---

## Medio

### R3 · Continuidad ante caídas — H4, H7, y el encargo del director

Es la ronda que más protege la instalación en vivo.

- [ ] Suscribirse a `gattserverdisconnected` y a `connectionStatus` de muse-js. **Hoy no existe ningún
      manejador**, y por eso un corte no se detecta.
- [ ] Al detectar el corte a mitad de sesión, **conmutar a datos simulados sin interrumpir el envío OSC**. La
      simulación ya existe y es buena (`soul-charger-admin.html:1484-1512`): se reaprovecha.
- [ ] Arrancar la simulación desde el último valor real, no desde el valor inicial, para que Unreal no vea un
      salto.
- [ ] Corregir `_btOn` (`:1191`) para que refleje el enlace real y no el estado de la aplicación. Hoy miente:
      sigue diciendo «conectado» con el casco apagado.
- [ ] Señalizar el modo degradado en la interfaz. El operador tiene que ver que está en simulación.
- [ ] **Marcar el origen del dato** (`real` / `simulado`) desde este momento, para que R5 y R6 puedan
      separarlos. Ver la advertencia de la sección 3 del análisis.
- [ ] Llevar el botón **Simulate** a `soul-charger-app.html`, que hoy no lo tiene.
- [ ] Mostrar en el visor el **número de participante en curso**. Que sea el número de la sesión que se está
      midiendo ahora, no el contador global `soulcharger_users`, que no es fiable (H3).
- [ ] **`probe-dropout`**: comprobar que ante un corte el flujo OSC no se detiene y que el estado del sensor
      pasa a inactivo. Debe fallar con el código actual.
- [ ] Barrer los gemelos: lo que se arregle en el admin se arregla en `soul-charger-app.html` (H7).

### R4 · El contrato OSC nuevo — encargo del director

- [ ] **Escribir la ADR de D1 antes de tocar código.** Ver la tabla de opciones en la sección 4 del análisis.
      Recomendación: direcciones nuevas dedicadas, dejando `/muse/data` intacto.
- [ ] Añadir `/muse/calm` (`f`, 0–1), `/muse/heart_rate` (`f`) y `/muse/sensor_active` (`i`, 0/1).
      `osc.js` soporta el tipo entero.
- [ ] Pasar los tres por `safeFloat()` o su equivalente entero: el escudo de NaN existe por un fallo real
      (`backend/server.js:73-79`).
- [ ] **No modificar la longitud del arreglo de 18 floats.** Rompe el Blueprint de Unreal.
- [ ] Documentar los nodos que hay que añadir en Unreal, y **probarlo contra Unreal**, no sólo contra la sonda.
- [ ] Ampliar `probe-osc` para exigir los tres mensajes con sus tipos correctos.

### R5 · La tabla de textos — encargo del director, H5

- [ ] Decidir D3 (dónde vive la tabla) y anotarlo. Recomendación: la escribe el relay, que ya sabe escribir en
      `research/` y sobrevive al cierre del navegador.
- [ ] CSV por sesión, una fila por tick, con: marca de tiempo, panel, `headsetName`, número de participante,
      estado, calma, pulso, `sensorActive`, progreso de calibración, bandas y **origen del dato**.
- [ ] Índice acumulado con una fila por sesión: inicio, duración, participante, delta de calma, porcentaje de
      la sesión con datos reales.
- [ ] Sanear `player` y `suffix` al construir el nombre de fichero (`backend/server.js:140`), que hoy se
      interpolan sin validar mientras el servidor estático sí valida su ruta (`:28`).
- [ ] **`probe-csv`**: ejecutar una sesión sintética y **abrir el CSV**, contando filas y validando cabeceras.
      El material que se fabrica y no se mira esconde fallos.

### R6 · Limpiar el research — H3

- [ ] **Quitar el resembrado automático** (`soul-charger-admin.html:1664-1672`). Hoy, borrar las sesiones y
      recargar replanta las 75 falsas: el botón «Delete all» no consigue dejar el sistema vacío.
- [ ] Decidir D4: borrar las sesiones sintéticas o conservarlas etiquetadas como `demo` para las
      presentaciones. Etiquetarlas es lo que permite las dos cosas.
- [ ] Separar el almacén real del sintético, o añadir un campo `origen` a cada sesión y filtrar por defecto.
- [ ] Recontar los usuarios a partir de las sesiones reales en vez del contador suelto `soulcharger_users`,
      que se incrementa al conectar (`:1480`) y también al simular (`:1588`).
- [ ] Corregir el comentario obsoleto de `:1650`, que dice «+4%» cuando `TARGET_AVG = 7`.
- [ ] Revisar que el research y el análisis profundo declaren cuántas sesiones son reales.

---

## Complejo

### R7 · Ritmo cardíaco real — H2

- [ ] Activar el PPG del Muse 2: `enablePpg` y `ppgReadings` ya están en `vendor/muse-js.bundle.js`.
- [ ] Implementar la detección de latido y el cálculo de pulso en bpm sobre la señal PPG.
- [ ] **Retirar** `currentBpm = smooth(currentBpm, 70 + (avgPower % 30), 0.01)` de los dos ficheros, y
      archivarlo en `_backup/deprecated/` con su encabezado.
- [ ] Manejar el caso «sin señal PPG válida»: enviar el último valor sano o marcarlo, nunca un número
      inventado.
- [ ] Sonda: contrastar contra un pulsioxímetro de dedo. Si no se puede, **decirlo y dejarlo abierto**, no
      cerrarlo por comodidad.

### R8 · Bandas EEG reales — H1

La ronda que da validez a todo lo demás. Leer H1 entero antes de empezar.

- [ ] Decidir D2: FFT propia sobre `eegReadings` o librería de procesado. Anotar el coste en CPU y latencia.
- [ ] Implementar la descomposición espectral real: delta, theta, alfa, beta, gamma por canal.
- [ ] Recalcular el Calm Score sobre la relación alfa/beta de verdad.
- [ ] **Retirar** las pseudo-bandas `(avgPower * k) % 1.0` de los dos ficheros y archivarlas.
- [ ] Revisar si `TARGET_CALIBRATION_SAMPLES = 300` y `MA_WINDOW = 115` siguen teniendo sentido con una señal
      que ya no da saltos por el módulo.
- [ ] **`probe-bands`**: alimentar el pipeline con senos de 10 Hz y 20 Hz de igual amplitud. Un cálculo
      correcto los distingue; el actual da lo mismo en ambos casos. Verificar que la sonda caza el código
      viejo antes de darla por buena.
- [ ] Revisar `sensorActive` (H8): `avgPower >= 1.0` no mide contacto con la piel.

### R9 · Un solo pipeline — H7

- [ ] Decidir D5: extraer bandas, Calm Score, calibración y telemetría a un módulo compartido, o retirar
      `soul-charger-app.html` si el admin ya cubre su función.
- [ ] Mientras haya dos copias, **todo arreglo se hace dos veces**. Es la causa más probable de que una
      corrección quede a medias.

---

## Abierto y sin verificar

- [ ] **El Blueprint de Unreal no se ha inspeccionado** — no verificado: no hay proyecto de Unreal en este
      repositorio. Todo lo que se afirma del lado de Unreal sale del código del relay y del README anterior.
      Antes de R4, abrir el Blueprint y confirmar qué índices lee de verdad.
- [ ] **Nada se ha probado con una diadema Muse física** en esta revisión — no verificado: el análisis es
      lectura de código. Los hallazgos H1, H2 y H8 predicen comportamiento; confirmarlos con hardware antes de
      dimensionar R7 y R8.
- [ ] **`hardware/Source/` (C++ para Unreal) no se ha revisado.** Requiere el SDK, que ya no está versionado.
      Sin decidir si sigue vivo o se archiva.
- [ ] **`backend/functions/` (Firebase) está inactivo** y sin decidir. Ver `CLAUDE.md`.
- [ ] La IP `192.168.1.50` del panel P2 (`:1773`) parece de una instalación concreta — sin confirmar si sigue
      siendo la de la gafa actual.
