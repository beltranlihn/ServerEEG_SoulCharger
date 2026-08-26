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
2. `docs/historial/2026-08-25-analisis-para-traspaso.md` — **el documento importante.** Contiene los nueve
   hallazgos de la lectura del código, con `fichero:línea`. Todas las entradas de esta cola remiten a él
   como `H1`…`H9`. **Su sección 5** es la investigación sobre qué medir para hablar de calma, con la mezcla
   de señales propuesta y el protocolo para demostrar que el número responde a algo.
3. `CLAUDE.md` — el contrato: puertos, contrato OSC, algoritmo, trampas.

**Lo inmediato: R12, el experimento del círculo**, previsto para el 2026-08-26 en cuanto haya diadema
disponible. Responde a la pregunta de la que dependen D8, D9 y R11 —¿puede una persona mover una señal a
voluntad, y cuál?— y de paso construye el corpus de grabación que R11 necesitaba igualmente. La aplicación de
grabación **se puede montar sin diadema**; sólo la sesión requiere hardware.

**Después, la Ronda 0.** No empezar por el encargo nuevo: primero el orden documental, y después la red de
sondas. Escribir el sistema nuevo sin forma de medirlo es cómo se llega a tener un Calm Score que lleva meses
sin medir calma (H1).

**Alcance actual: dos usuarios simultáneos** (P1 y P2), como hasta ahora. Crecer a más usuarios es
**arquitectura futura**, está descrito al final de este documento y **no se implementa en ninguna de las
rondas de abajo**. Lo único que se pide ahora es no clavar el número dos en sitios nuevos: ver D7.

**Lo que hay que saber antes de prometer nada al director:** tres de los datos que el sistema muestra hoy no
son lo que dicen ser — las bandas EEG (H1), el ritmo cardíaco (H2) y el promedio de calma del research, que
incluye 75 sesiones fabricadas (H3). No son fallos de transporte; son fallos de contenido. El encargo nuevo
—enviar calma, pulso y estado del sensor— se apoya justo encima de los tres.

### Dos caminos posibles, y hay que elegir

| | **Camino A — entregar antes** | **Camino B — validez antes** |
|---|---|---|
| Orden | R12 → R0 → R1 → R13 → R2 → R3 → R4 → R5 → R6 → R7 → R8 → R11 | R12 → R0 → R1 → R7 → R8 → R11 → luego el resto |
| Qué se consigue pronto | Un sistema completo, verificable y ordenado, que transporta y registra bien | Un índice de calma que se puede defender |
| Qué se asume | Durante un tiempo se registra y se envía un Calm Score y un pulso que no son válidos. Las filas quedan marcadas y se pueden descartar después | La instalación tarda más en tener CSV, IP persistente y recuperación ante caídas |

**R12 va primero en los dos caminos**, porque su resultado condiciona el resto: hasta saber qué señal se puede
mover a voluntad, no se sabe con qué se mueve la esfera ni qué entra en el índice. Y en los dos casos **R11 es
el final de la cadena**: es la ronda que define qué se mide cuando se dice «calma» y lo demuestra. R7 y R8 son
sus prerrequisitos —le dan pulso y bandas de verdad—, pero por sí solos no producen un índice defendible. Las
ADR de D8, D9 y D10 y el protocolo de validación se pueden escribir en cualquier momento, porque son decisión
y diseño, no código.

**Recomendación:** camino A **si hay una fecha de exhibición cerca**, porque R2–R6 son los que hacen que la
instalación no se rompa en vivo; camino B si lo próximo es publicar o defender resultados. Es una decisión del
director, no del desarrollador.

**R9 y R10 no están en ninguno de los dos caminos.** R9 (unificar el pipeline duplicado) se hace cuando pese
más el coste de arreglarlo todo dos veces. R10 (canal de vuelta desde la gafa) va justo después de R4 en
cuanto se decida, porque comparte el esquema de direcciones y es más barato diseñarlo a la vez que
renegociarlo después.

---

## Rápido

### R0 · Orden documental — no toca código

- [ ] Fusionar `docs/plantillas-sin-fusionar/CLAUDE.md` con el `CLAUDE.md` de la raíz: añadir las secciones del
      método (mapa vivo, `/code-review` al cerrar cada ronda, convenciones de idioma, archivar-no-borrar,
      *gotchas*). **Conservar todo el contenido actual**, que está verificado contra el código.
- [ ] Fusionar `docs/plantillas-sin-fusionar/README.md`: añadir la tabla de documentación.
- [ ] Borrar `docs/plantillas-sin-fusionar/` cuando las dos fusiones estén hechas.
- [ ] Rellenar `ARCHITECTURE.md`. La materia prima está en las secciones 1 y 2 del análisis. **Dibujar el
      relay como un extremo de dos sentidos**, no como un emisor: el director ha confirmado que habrá
      sincronización bidireccional con la gafa (envía OSC y también recibe). El uso concreto está sin definir,
      pero la arquitectura tiene que contemplarlo desde ahora — ver D6 y H9 en el análisis, y R10.
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

### R12 · El experimento del círculo: ¿hay control voluntario? — encargo del director

**Requiere la diadema.** Previsto para el 2026-08-26. Leer la sección 5.10 del análisis antes de montarlo.

Zanja la pregunta de fondo: ¿puede una persona mover una señal **a voluntad**, y cuál? El resultado
condiciona D8, D9 y R11. Cualquier resultado es informativo, así que no se puede desperdiciar.

**Montar la grabación (se puede hacer sin diadema)**

- [ ] Aplicación web con un círculo que **NO responde**: lazo abierto, sólo graba. Si reacciona mientras se
      intenta, la persona se adapta a él y deja de poder distinguirse quién mueve a quién.
- [ ] Grabar con **un único reloj**: los cuatro canales de EEG en crudo, PPG, acelerómetro y estado del clic.
      Si el clic y el EEG van por relojes distintos, no hay análisis posible.
- [ ] Marcar con **un clic para empezar y otro para terminar**, no manteniendo apretado: sostener el botón es
      tensión muscular que puede filtrarse a la señal.
- [ ] Fase 1, con señal en pantalla: alterna «ACHICAR» 20 s / «DESCANSO» 20 s, quince veces (~10 min).
- [ ] Fase 2, libre, sin señal: se marca cuando se quiera (~5 min).

**Analizar**

- [ ] Guion aparte que trocea en 250 ms y calcula: amplitud general por canal, alfa relativa, beta relativa,
      alfa/beta, potencia >30 Hz, movimiento y ritmo cardíaco.
- [ ] Correlacionar cada una con el clic **probando retardos de −2 a +5 s**. La intención precede a la señal y
      no se sabe cuánto.
- [ ] **Criterio de azar, obligatorio:** desplazar la serie de clics en el tiempo al azar y recalcular, 200
      veces. La correlación real tiene que superar al 95 % de esa distribución. **Sin esto la prueba no sabe
      fallar** y siempre «encuentra» algo.
- [ ] Escribir el guion de análisis **antes** de mirar los datos.

**Concluir**

- [ ] Anotar **con qué** correlaciona, no sólo si correlaciona. La tabla de interpretación está en 5.10:
      amplitud general → músculo; alfa relativa limpia → control cortical real; acelerómetro → movimiento de
      cabeza; nada → hay que tirar de actos deliberados.
- [ ] Anotar el **retardo del pico**: es el presupuesto de latencia de la esfera.
- [ ] Guardar las grabaciones etiquetadas: son el **corpus que R11 necesita** para `probe-calm`. Una sola
      construcción sirve para las dos cosas.

### R13 · La capa rápida: quietud física — D9

Lo que hace que la esfera se sienta viva. Barata: la señal **ya está calculada** en el código.

- [ ] **Escribir la ADR de D9.** Dos señales, dos nombres, dos destinos: `physical_stillness` para la
      experiencia, `calm_index` para el registro.
- [ ] Sacar la capa rápida de `avgPower` (`soul-charger-admin.html:1620`), que es una estimación honesta de
      amplitud general y lo único del pipeline de señal que mide algo real. Por electrodo, normalizada contra
      el baseline del participante e invertida.
- [ ] Usar **AF7 y AF8**, los frontales: para el índice de calma son los peores por contaminarse de músculo, y
      para esto son los mejores por la misma razón.
- [ ] **Sin el suavizado de 5,75 s.** `MA_WINDOW = 115` a 20 Hz mata cualquier sensación de control. La capa
      rápida necesita su propia ruta; el transporte no es el cuello de botella.
- [ ] Llamarla por su nombre en la interfaz y en el CSV: es **quietud física**, no estado de calma.
- [ ] **No mezclarla nunca con el índice de calma.** Ver el aviso de 5.8: el índice rechaza el artefacto
      muscular y la esfera responde gracias a él. Es la misma magnitud usada al revés.

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
- [ ] Añadir también **`/muse/stillness`** (`f`, 0–1), la capa rápida de R13. Son dos datos distintos con
      latencias distintas y **no deben fundirse en uno** (D9). Que vayan desde el principio evita renegociar
      el contrato con Unreal más adelante.
- [ ] Pasar los tres por `safeFloat()` o su equivalente entero: el escudo de NaN existe por un fallo real
      (`backend/server.js:73-79`).
- [ ] **No modificar la longitud del arreglo de 18 floats.** Rompe el Blueprint de Unreal.
- [ ] Documentar los nodos que hay que añadir en Unreal, y **probarlo contra Unreal**, no sólo contra la sonda.
- [ ] Ampliar `probe-osc` para exigir los tres mensajes con sus tipos correctos.
- [ ] **No cerrar la puerta al canal de vuelta.** El esquema de direcciones que se elija aquí es el mismo que
      usará R10 para recibir; si se nombran las salientes sin identificador de panel, la vuelta no podrá
      desambiguar entre dos gafas. Ver D6 en el análisis.

### R5 · La tabla de textos — encargo del director, H5

- [ ] Decidir D3 (dónde vive la tabla) y anotarlo. Recomendación: la escribe el relay, que ya sabe escribir en
      `research/` y sobrevive al cierre del navegador.
- [ ] CSV por sesión, una fila por tick, con: marca de tiempo, panel, `headsetName`, número de participante,
      estado, calma, pulso, `sensorActive`, progreso de calibración, bandas y **origen del dato**.
- [ ] Dejar sitio desde ya para lo que pedirá R11, aunque se rellene más tarde: los **subíndices** (alfa
      relativa, beta relativa, RMSSD), el **estado de la puerta de calidad** y `calm_index_version`. Con un
      solo número compuesto no se puede averiguar después por qué se movió, y sin versión las sesiones dejan
      de ser comparables en cuanto cambie la fórmula.
- [ ] Índice acumulado con una fila por sesión: inicio, duración, participante, delta de calma, porcentaje de
      la sesión con datos reales y **porcentaje de ventanas válidas**.
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

### R10 · Canal de vuelta desde la gafa — encargo del director, H9

Sincronización bidireccional: la aplicación envía OSC a la gafa y **también recibe**. El director ha
confirmado que ocurrirá; **para qué servirá está sin definir**. Esta ronda construye el transporte y lo deja
verificado, sin inventar mensajes.

Se puede hacer **inmediatamente después de R4**, porque toca el mismo código del relay y el mismo esquema de
direcciones. Hacerlo mucho más tarde obliga a renegociar el contrato con la gafa cuando ya esté en uso.

- [ ] **Escribir la ADR de D6 antes de tocar código.** La tabla de opciones está en la sección 4 del análisis.
- [ ] Dar al relay un **puerto de escucha fijo y configurable**. Hoy es efímero (`localPort: 0`,
      `backend/server.js:91`) y cambia en cada reconexión, así que la gafa no puede alcanzarlo: por eso la ruta
      de entrada que ya existe no es fiable.
- [ ] Averiguar si `/unreal/end_session` (`backend/server.js:120-128`) **ha llegado a funcionar alguna vez**.
      Con la configuración actual no debería. Si funcionaba, entender por qué antes de cambiar nada.
- [ ] Sustituir el `if` por dirección por una **tabla de enrutado** dirección → manejador.
- [ ] Reenviar lo entrante al navegador con un mensaje genérico `{type:'osc_in', address, args}`, para poder
      añadir mensajes nuevos sin volver a tocar el relay.
- [ ] Resolver **a qué panel corresponde** cada mensaje entrante: con dos gafas en la misma red hace falta
      desambiguar, y hoy no hay forma. Recomendación: identificador de panel en la dirección (`/soul/p1/...`).
- [ ] Implementar **un solo** mensaje de prueba, `/soul/ping` → `/soul/pong`, que sirve de sonda permanente.
      **No añadir mensajes especulativos**: envejecen como comentarios y nadie sabrá si alguien los usa.
- [ ] **`probe-inbound`**: enviar un OSC al puerto de escucha **desde otro puerto de origen** y comprobar que
      llega hasta el navegador. Enviar desde el propio socket del relay no vale: mediría la premisa, no la
      conclusión.
- [ ] Documentar en `CLAUDE.md` el contrato de entrada junto al de salida, y añadir el puerto a la tabla.

---

## Complejo

### R7 · Ritmo cardíaco real — H2

- [ ] Activar el PPG del Muse 2: `enablePpg` y `ppgReadings` ya están en `vendor/muse-js.bundle.js`.
- [ ] Implementar la detección de latido y el cálculo de pulso en bpm sobre la señal PPG.
- [ ] Extraer también la **serie de intervalos entre latidos**, no sólo el bpm medio: es la materia prima del
      RMSSD, que es el eje autonómico del índice de calma (R11). Rechazar intervalos imposibles —fuera de
      300–2000 ms, o con un salto mayor del 20 % respecto al anterior— antes de acumularlos.
- [ ] **Retirar** `currentBpm = smooth(currentBpm, 70 + (avgPower % 30), 0.01)` de los dos ficheros, y
      archivarlo en `_backup/deprecated/` con su encabezado.
- [ ] Manejar el caso «sin señal PPG válida»: enviar el último valor sano o marcarlo, nunca un número
      inventado.
- [ ] Sonda: contrastar contra un pulsioxímetro de dedo. Si no se puede, **decirlo y dejarlo abierto**, no
      cerrarlo por comodidad.

### R8 · Bandas EEG reales — H1

La base de todo lo demás: da la materia prima que R11 compone. Leer H1 entero, y la sección 5.4 del análisis
para el detalle del cálculo.

- [ ] **Decidir D10 primero:** `muse-js` sólo entrega datos **crudos** —verificado en el bundle—, así que las
      bandas hay que calcularlas. La alternativa es la app de Muse por OSC, que las da hechas más la calidad
      de contacto. Ver la tabla de 5.9: para el registro de investigación sólo sirve la vía propia, porque
      `mellow` es una caja negra.
- [ ] Usar la app de Muse como **referencia independiente** para validar el cálculo propio: si las bandas se
      mueven igual ante las mismas maniobras, es una comprobación que no depende del código propio.
- [ ] Decidir D2: FFT propia sobre `eegReadings` o librería de procesado. Anotar el coste en CPU y latencia.
- [ ] **Separar por electrodo.** Acumular en un búfer por canal usando el campo `electrode`, que hoy se ignora
      (H1, punto 3): ahora mismo TP9, AF7, AF8 y TP10 caen mezclados en la misma variable.
- [ ] Ventana de 2 s con solape del 75 % (512 muestras a 256 Hz, avance de 128), ventana de Hann y FFT.
      Resolución de 0,5 Hz y una actualización cada 500 ms.
- [ ] Bandas: delta 1–4, theta 4–8, alfa 8–13, beta 13–30, y 30–45 **sólo para detectar EMG**, no como
      «gamma» sumable.
- [ ] Potencias **relativas** sobre el total 1–40 Hz, y logaritmo. **Sin módulo**: el `% 1.0` es el origen de
      los saltos de 0,99 a 0,00.
- [ ] Promediar alfa y beta entre TP9 y TP10, que son los menos contaminados por parpadeo.
- [ ] **Retirar** las pseudo-bandas `(avgPower * k) % 1.0` de los dos ficheros y archivarlas.
- [ ] Revisar si `TARGET_CALIBRATION_SAMPLES = 300` y `MA_WINDOW = 115` siguen teniendo sentido con una señal
      que ya no da saltos por el módulo.
- [ ] **`probe-bands`**: alimentar el pipeline con senos de 10 Hz y 20 Hz de igual amplitud. Un cálculo
      correcto los distingue; el actual da lo mismo en ambos casos. Verificar que la sonda caza el código
      viejo antes de darla por buena.
- [ ] Revisar `sensorActive` (H8): `avgPower >= 1.0` no mide contacto con la piel.

### R11 · El índice de calma: definirlo y demostrar que mide algo — encargo del director

**Leer la sección 5 completa del análisis antes de empezar.** Es la ronda que da sentido al proyecto: sin
ella, R7 y R8 sólo producen bandas y pulso correctos sin nada que los combine con criterio.

El encargo del director es que el índice **tenga coherencia**, sabiendo que la calma no es una onda concreta.
La respuesta es tratarla como una **definición operativa**: una fórmula fija, publicada y versionada, que
responde de forma reproducible a maniobras que sabemos que relajan o activan. No hace falta que sea
«verdadera»; hace falta que sea consistente, sensible y declarada.

Depende de R7 (PPG real) y R8 (bandas reales). La ADR y el protocolo se pueden escribir antes.

**Definir**

- [ ] **Escribir la ADR de D8 antes de programar.** Es la decisión más cara de revertir del proyecto: una vez
      publicados resultados, cambiar la fórmula invalida lo anterior.
- [ ] Fijar los dos ejes: **cortical** `z(log alfa_rel) − z(log beta_rel)` sobre TP9/TP10, y **autonómico**
      `z(log RMSSD)` desde el PPG. Dos vías fisiológicas independientes que coinciden valen mucho más que una.
- [ ] Pesos iniciales 0,6 cortical / 0,4 autonómico, **configurables y registrados en cada sesión**. El valor
      correcto sale de las pruebas, no de la intuición.
- [ ] **No incluir la asimetría alfa frontal.** Mide valencia afectiva, no calma, y está discutida.
- [ ] Decidir qué hacer con theta: sirve para **detectar somnolencia y marcarla**, no para sumarla a la calma.

**Construir**

- [ ] Potencias **relativas** (banda / total 1–40 Hz) y **logaritmo** antes de promediar. **Restar** logaritmos
      en vez de dividir bandas: la división explota cuando el denominador tiende a cero.
- [ ] **Puerta de validez** antes de todo: contacto, EMG por encima de 30 Hz, parpadeo frontal y movimiento
      del acelerómetro. Las ventanas malas **se descartan, no se corrigen**, y el índice conserva el último
      valor bueno marcando la muestra como retenida.
- [ ] RMSSD sobre ventana deslizante de 60 s, con rechazo de intervalos imposibles. Por debajo de 30 s la
      estimación no es estable: decirlo en vez de mostrar un número que baila.
- [ ] Revisar la duración de la calibración: los 15 s actuales son cortos para el eje autonómico, que pide
      60 s o más. Es una decisión de diseño, no un detalle.
- [ ] Conservar lo que ya está bien: baseline por participante, z-score, máquina de estados y suavizado.

**Demostrar — es el entregable de verdad**

- [ ] Ejecutar el protocolo de la sección 5.5 con al menos 5 personas. Se hace en el estudio, sin laboratorio.
- [ ] **Prueba A, ojos cerrados frente a abiertos.** Es la decisiva: el efecto Berger es grande y fiable, y
      **si el índice no separa esto, no mide estado cortical y no hay nada que discutir**.
- [ ] **Prueba B**, respiración a 6 por minuto frente a cálculo mental, para el eje autonómico.
- [ ] **Prueba C**, repetición a dos días, para saber si los participantes son comparables entre sí.
- [ ] **Prueba D**, artefactos provocados: apretar la mandíbula, parpadear, mover la cabeza. El índice no debe
      moverse. Es el fallo más probable con público delante.
- [ ] Ajustar los pesos maximizando la separación entre condiciones. Si el eje autonómico no aporta, se le
      baja el peso **y se dice**.
- [ ] Informar con **tamaño del efecto**, no con impresiones: «d = 1,4; separa en 9 de 10 repeticiones».
- [ ] Guardar las grabaciones etiquetadas como corpus de regresión y montar **`probe-calm`**, que las
      reproduce y exige una separación mínima. Mientras ese corpus no exista, **el índice no está verificado y
      se dice así**, no se cierra por comodidad. La infraestructura de grabación sale de R12.
- [ ] Incorporar lo que haya dicho R12: si el control voluntario resultó ser muscular, **el índice no debe
      responder a él** y hay que comprobar que no lo hace.
- [ ] Dejar escrito —en `CLAUDE.md` y en el código— que **la esfera no se mueve con este índice**, sino con la
      capa rápida de R13, y por qué (D9). Es justo el tipo de cosa que dentro de seis meses alguien «arregla»
      sin saber que estaba así a propósito.

**Que el dato siga siendo defendible dentro de seis meses**

- [ ] `calm_index_version` y los pesos en cada sesión del CSV. Si la fórmula cambia, las sesiones viejas no
      son comparables y hay que poder saberlo sin adivinar.
- [ ] Guardar los **subíndices** además del compuesto: alfa relativa, beta relativa, RMSSD y el estado de la
      puerta de calidad. Con un solo número no se puede averiguar después por qué se movió.
- [ ] Registrar el **porcentaje de ventanas válidas** de cada sesión. Una sesión con el 30 % rechazado no vale
      lo mismo que una con el 95 %, y hoy no hay forma de distinguirlas.
- [ ] Actualizar `CLAUDE.md` con la definición vigente del índice, sustituyendo la descripción del algoritmo
      actual.

### R9 · Un solo pipeline — H7

- [ ] Decidir D5: extraer bandas, Calm Score, calibración y telemetría a un módulo compartido, o retirar
      `soul-charger-app.html` si el admin ya cubre su función.
- [ ] Mientras haya dos copias, **todo arreglo se hace dos veces**. Es la causa más probable de que una
      corrección quede a medias.

---

## Arquitectura futura — NO planificado, no se implementa todavía

Esto **no son rondas** y no tiene fecha. Está escrito para que las decisiones de las rondas de arriba no
cierren la puerta, no para hacerlo ahora.

### Escalabilidad a múltiples usuarios — D7

El alcance actual son **dos usuarios**. El crecimiento a N usuarios conectados está confirmado como dirección,
sin plazo ni número concreto.

**Ya escala:** el relay. Todo el estado cuelga del objeto `ws` de cada cliente, con su propio socket UDP
(`backend/server.js:82-88`). Un tercer panel no requiere tocarlo.

**Está clavado en dos:** 21 identificadores `-1` y 21 `-2` escritos a mano en el HTML del admin; los dos
`new MusePanel(...)` de `:1772-1773`; los filtros `p1sessions`/`p2sessions` de `:829-830` y `:1001-1007`; el
resumen `P1: n · P2: n` de `:841`; y las dos ventanas del lanzador `.bat`.

**Sin medir, y hay que medirlo antes de prometer un número:** cuántas conexiones GATT simultáneas aguanta
Chrome de forma estable en una sola pestaña. Es el techo más probable y sólo se sabe con hardware.

**Lo único que se pide en las rondas de arriba** (coste casi nulo, y evita rehacer el contrato después):

- [ ] En R4, nombrar las direcciones OSC con identificador de panel (`/soul/p{n}/...`), no «P1/P2» cerrado.
- [ ] En R5, incluir una columna `panel` en el CSV en vez de dos ficheros o dos columnas fijas.
- [ ] En R10, resolver a qué panel corresponde cada mensaje entrante de forma que admita N.
- [ ] En R0, que `ARCHITECTURE.md` describa el panel como **una instancia de un componente**, no como dos
      piezas distintas.

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
