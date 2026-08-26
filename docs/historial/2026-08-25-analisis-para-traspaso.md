# Análisis para el traspaso — 2026-08-25

Lectura completa del código antes de planificar el encargo nuevo. Este documento es la **base del plan**: la
cola de trabajo está en `docs/NEXT.md` y aquí está el porqué de cada entrada.

Todo lo que sigue se verificó leyendo el código, no la documentación previa. Las referencias son
`fichero:línea` y los números orientan: verificar el símbolo por búsqueda.

---

## 1. Qué hay hoy

| Pieza | Fichero | Tamaño | Papel |
|---|---|---:|---|
| Panel de operador | `soul-charger-admin.html` | 1777 L | La aplicación real. Dos paneles (P1/P2), gráficas, vista Research, análisis profundo. |
| Vista de participante | `soul-charger-app.html` | 812 L | Un solo usuario. Duplica el pipeline del admin. |
| Relay | `backend/server.js` | 261 L | Servidor HTTP estático (5500) + WebSocket (3000) → OSC/UDP (8000). |

Cadena de datos actual:

```
Muse 2 ──BLE──> muse-js ──eegReadings──> pseudo-bandas ──ratio──> Calm Score
                                                                      │
                                            WebSocket:3000 ───────────┘
                                                   │
                                       server.js ──┴──> /muse/data (18 floats) ──UDP:8000──> Unreal
```

---

## 2. Hallazgos

Ordenados por gravedad. Los tres primeros afectan a la **validez de los datos**, no al transporte, y por eso
condicionan el encargo nuevo: da igual lo limpio que sea el envío si lo que se envía no mide lo que dice.

### H1 · Las bandas EEG no son bandas — BLOQUEANTE

`soul-charger-admin.html:1621-1627` y su gemelo `soul-charger-app.html:731-736`.

En el camino con hardware real, las cuatro bandas salen del **mismo escalar**:

```js
const avgPower = samples.reduce((acc, v) => acc + Math.abs(v), 0) / samples.length;
rawAlpha = smooth(rawAlpha, (avgPower * 0.10) % 1.0, dynamicAlphaEma);
rawBeta  = smooth(rawBeta,  (avgPower * 0.20) % 1.0, 0.05);
rawTheta = smooth(rawTheta, (avgPower * 0.15) % 1.0, 0.05);
rawDelta = smooth(rawDelta, (avgPower * 0.05) % 1.0, 0.05);
```

`avgPower` es la amplitud media absoluta de las muestras crudas. **No hay FFT ni descomposición espectral en
ninguna parte del repositorio.** Alfa, beta, theta y delta son el mismo número multiplicado por cuatro
constantes distintas y plegado con módulo 1.0.

Dos consecuencias:

1. **El Calm Score no mide calma.** El ratio `alpha / (beta + 0.4·gamma + 0.001)` se reduce a
   `((p·0.1) mod 1) / ((p·0.2) mod 1 + …)`: una función determinista de un solo escalar. La relación
   alfa/beta que la literatura asocia a relajación no interviene.
2. **El módulo introduce saltos.** Cuando `p·0.1` cruza un entero, el valor cae de 0.99 a 0.00 de golpe. Un
   cambio mínimo de amplitud produce un salto máximo de la señal.
3. **Los cuatro canales se mezclan en uno.** Cada `reading` trae un campo `electrode` —el Muse 2 tiene TP9,
   AF7, AF8 y TP10— y el código **no lo mira**: `const samples = reading.samples` (`:1618`) trata por igual lo
   que llega de la nuca y de la frente. A 256 Hz y 12 muestras por lectura, eso son unas 85 lecturas por
   segundo de cuatro sitios distintos del cráneo colapsadas en una sola variable suavizada. Los canales
   frontales son los más contaminados por parpadeo y tensión mandibular, así que el ruido de AF7/AF8 entra sin
   filtrar en la misma cifra que TP9/TP10.

Detalle incómodo: en modo simulación (`soul-charger-admin.html:1491-1495`) las bandas **sí** son cuatro señales
independientes con distinta frecuencia y ruido. La simulación es más realista que el hardware.

> **Cómo verificarlo sin diadema:** alimentar el pipeline con un seno de 10 Hz puro (banda alfa) y otro de
> 20 Hz (beta) con la misma amplitud. Un cálculo de bandas correcto da alfa alta / beta baja en el primero e
> invertido en el segundo. El código actual da **el mismo resultado** en ambos casos, porque la amplitud media
> es idéntica. Esa es la sonda que sabe fallar.

### H2 · El ritmo cardíaco es inventado — BLOQUEANTE para el requisito de pulso

- Camino real, `soul-charger-admin.html:1627`: `currentBpm = smooth(currentBpm, 70 + (avgPower % 30), 0.01)`.
  El pulso deriva del **mismo escalar de EEG** que las bandas. No es una medición cardíaca.
- Camino simulado, `soul-charger-admin.html:1497`: suma de dos senos más ruido.
- Valor inicial `75` (`:1128`), que es el que se envía mientras no hay nada mejor.

El Muse 2 **tiene sensor PPG**, que es el que mide pulso de verdad, y el bundle que ya está en el repositorio
lo soporta: `vendor/muse-js.bundle.js` expone `enablePpg` y `ppgReadings`. No se usa.

Además, **hoy el pulso ni siquiera sale por OSC**: `backend/server.js:229` escribe `0.0` en el índice 14, que
es justo el hueco que corresponde a `heart_rate` en el diccionario interno (`server.js:71`).

### H3 · Datos sintéticos mezclados con datos reales — BLOQUEANTE para el requisito de research

`seedDemoData()` (`soul-charger-admin.html:627-687`) fabrica **75 sesiones** y fuerza su media a exactamente
`+7 %` mediante un bucle de reparto (`:650-657`). Las escribe en `soulcharger_sessions` y fija
`soulcharger_users = 75`.

Las sesiones reales van al **mismo array**: `persistSession()` (`:1326-1336`) hace `getSessions()` → `push` →
`saveSessions()`. Y `renderResearchView()` (`:704`) promedia sobre la mezcla sin distinguirlas.

El arranque (`:1664-1672`) es lo más peligroso:

```js
if (localStorage.getItem('soulcharger_seed_version') !== SEED_VERSION) { seedDemoData(); … }
else if (getSessions().length === 0) { seedDemoData(); }
```

La segunda rama significa que **borrar las sesiones y recargar la página replanta las 75 falsas**. El botón
«Delete all stored sessions» (`:1688`) no consigue dejar el sistema vacío.

Efectos colaterales:

- El contador de usuarios no cuadra con nada: `seedDemoData` lo fija a 75, `incrementUserCount()` lo sube al
  conectar (`:1480`) y también al simular (`:1588`).
- Comentario obsoleto en `:1650`: dice «*the displayed integer average is +4%*» cuando `TARGET_AVG = 7`. El
  método prohíbe comentarios con afirmaciones sin comprobar; éste ya se contradice con la línea de al lado.

### H4 · Un corte de Bluetooth a mitad de sesión no se detecta — afecta al requisito nuevo

**No existe ningún manejador de `gattserverdisconnected`** en el repositorio (búsqueda vacía). Un corte real
del enlace BLE no dispara nada.

Lo único que reacciona es el `eegWatchdog` de 800 ms (`:1628`), que pone `sensorActive = 0`. Pero la señal que
Unreal recibe como «BT conectado» (índice 16) sale de `_btOn` (`:1191`), que se calcula **sólo a partir del
estado de la aplicación**:

```js
const _btOn = this.btForceOff ? 0 : ((appState === 'WARMUP' || 'CALIBRATING' || 'RUNNING') ? 1 : 0);
```

Como `appState` no cambia cuando el enlace se cae en silencio, el sistema sigue afirmando que el casco está
conectado. Y como `rawAlpha`…`rawDelta` conservan su último valor —sólo se actualizan dentro de la
suscripción—, el Calm Score converge a una constante y **Unreal recibe un flujo congelado con pinta de
válido**. Es un fallo mudo: el estado roto se parece al normal.

Esto es exactamente lo que el encargo nuevo pide resolver con datos simulados.

### H5 · No hay tabla de texto: sólo imágenes

Lo único que se exporta son dos PNG por sesión (`soul-charger-admin.html:1308-1309` →
`backend/server.js:136-152` → `research/`). Un PNG no se puede analizar, agregar ni cruzar.

Todo lo necesario para una tabla ya se calcula por tick, pero no se guarda: calma, pulso, `sensorActive`,
progreso de calibración, las bandas y el `headsetName`.

Detalle a corregir de paso: `backend/server.js:140` interpola `player` y `suffix` directamente en el nombre del
fichero sin validarlos, mientras que el servidor estático sí comprueba la ruta (`:28`). El riesgo es bajo
—sólo escucha en local— pero es gratis cerrarlo cuando se toque esa función para escribir el CSV.

### H6 · La IP de destino no se recuerda — afecta al requisito nuevo

El constructor de `MusePanel` sobrescribe el campo en cada carga (`:1131`):

```js
if (this.inpOscIp) this.inpOscIp.value = defaultIp;
```

Y los valores por defecto están escritos en el código (`:1772-1773`): `P1 → 127.0.0.1`,
`P2 → 192.168.1.50`. El resultado es que **el operador tiene que reescribir la IP de la gafa en cada recarga**,
y los campos viven dentro del panel de desarrollo, no a la vista.

Tampoco hay validación: cualquier texto se acepta y se envía al relay, que lo pasa tal cual a `osc.UDPPort`
(`server.js:82-88`).

### H7 · El pipeline está duplicado en dos ficheros

Bandas, Calm Score, máquina de estados, calibración y telemetría están copiados en `soul-charger-admin.html`
y `soul-charger-app.html`, con las mismas constantes (`TARGET_CALIBRATION_SAMPLES = 300`, `MA_WINDOW = 115`)
mantenidas por separado. `soul-charger-app.html` **no tiene botón de simulación**.

Cualquier arreglo de H1, H2 o H4 que toque sólo uno de los dos ficheros está **empezado, no hecho**.

### H8 · `sensorActive` no distingue «diadema puesta» de «ruido»

`:1621`: `if (avgPower >= 1.0) this.sensorActive = 1;` — un umbral sobre amplitud media cruda. Sube a 1 con
cualquier señal por encima de 1 µV y sólo vuelve a 0 por el watchdog de 800 ms. No mide contacto con la piel.

El bundle expone `telemetryData` y `batteryLevel`, que dan información de estado del dispositivo, y el propio
`connectionStatus` de muse-js informa del enlace. Ninguno se usa.

### H9 · El canal de entrada OSC no tiene puerto fijo — bloquea la bidireccionalidad

El relay **ya recibe** OSC: `backend/server.js:120-128` escucha `/unreal/end_session` y lo reenvía al navegador
como `unreal_command`. La bidireccionalidad está esbozada.

Pero el socket se abre así (`server.js:89-95`):

```js
ws.udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 0,               // ← el sistema operativo asigna un puerto libre
    remoteAddress: ws.targetIp,
    remotePort: ws.targetPort,
});
```

`localPort: 0` significa que **el puerto de escucha es efímero y distinto en cada conexión**, y cambia otra vez
cada vez que se reconfigura la IP, porque `initUDP()` cierra y reabre el socket (`:86-88`).

Consecuencia: para que la gafa alcance al relay tendría que enviar a un número de puerto que no puede conocer
de antemano y que cambia solo. Sólo funcionaría si el emisor respondiese al puerto de origen del datagrama que
recibió, y los emisores OSC de Unreal y TouchDesigner envían a una dirección **configurada**, no a la de
origen.

Es decir: la ruta de entrada existe en el código, pero **no se ha comprobado que llegue nunca nada por ella**.
Si `/unreal/end_session` funcionó alguna vez, conviene averiguar cómo, porque con esta configuración no
debería. Es lo primero que hay que resolver para el requisito de sincronización bidireccional.

---

## 3. Los requisitos nuevos frente al código actual

| Requisito del director | Qué hay hoy | Qué falta |
|---|---|---|
| **Float · índice de calma normalizado 0–1** | Se envía en el índice 13. El rango sí es 0–1 (`:1393-1396`). | El transporte funciona; **el contenido no es válido (H1)**. Qué medir y cómo demostrarlo: **sección 5**. |
| **Float · ritmo cardíaco** | Se calcula un número falso y se envía `0.0` (H2). | Leer PPG real y ocupar el índice 14, o dirección propia. |
| **Integer · sensor activo/inactivo** | Se envía como *float* en los índices 16/17, y miente al caerse el enlace (H4, H8). | Tipo OSC `i`, y una detección de estado que sea cierta. |
| **Elegir la IP de la gafa** | Campo editable pero no persistente, escondido y sin validar (H6). | Persistencia, validación y sitio visible. |
| **Guardar en tabla de textos ordenada** | Sólo PNG (H5). | CSV por sesión + índice acumulado. |
| **Research y sumatoria de usuarios** | Construido, pero contaminado con 75 sesiones falsas (H3). | Separar real de sintético; recontar. |
| **Ver el número de usuario que se está midiendo** | `soulcharger_users` existe pero es un contador global poco fiable (H3). | Número de participante de la sesión en curso, visible en el visor. |
| **Botón Simulate** | Existe en el admin (`:454`, `:488`). **No existe en `soul-charger-app.html`** (H7). | Llevarlo al visor y unificar su comportamiento. |
| **Si se cae a mitad de sesión, seguir enviando datos simulados** | No hay detección de caída; se congela el flujo (H4). | Detectar el corte y conmutar a simulación sin cortar el OSC. |
| **Sincronización bidireccional con la gafa** (futuro, uso sin definir) | Hay una ruta de entrada esbozada (`/unreal/end_session`) pero sobre un puerto efímero que la gafa no puede conocer (H9). | Puerto de escucha fijo y configurable, y una capa de enrutado de mensajes entrantes en vez de un `if` por caso. |

### Una advertencia sobre el último requisito

Que el OSC siga emitiendo con datos simulados es lo correcto **para la experiencia**: la instalación de VR no
puede congelarse porque un casco se descoloque. Pero significa que parte de una sesión grabada será
sintética.

Si esos tramos entran sin marcar en la tabla y en el research, se repite el problema H3 por otra puerta: el
promedio de «+X % de calma» incluiría datos fabricados. **La recomendación es que sea obligatorio marcar el
origen de cada fila** (`real` / `simulado` / `interpolado`) y que el research excluya por defecto lo que no sea
real, con la opción de incluirlo. Así el requisito se cumple entero y el dato sigue siendo defendible.

Esta es la objeción, dicha una vez. La decisión es del director; si se mantiene tal cual, se implementa
completo.

---

## 4. Decisiones que hay que tomar antes de escribir código

Cada una es candidata a ADR porque es cara de revertir.

**D1 · Cómo se transportan los tres valores nuevos.** El arreglo de 18 floats en `/muse/data` está congelado
por el Blueprint de Unreal: cambiar su longitud rompe la instalación. Tres opciones:

| Opción | A favor | En contra |
|---|---|---|
| Ocupar huecos del arreglo (idx 14 para pulso) | Cero cambios en Unreal | No permite el tipo `Integer`; el arreglo sigue siendo opaco |
| Ampliar el arreglo | Todo en un mensaje | **Rompe Unreal**. Descartada salvo orden expresa |
| **Direcciones nuevas dedicadas** (recomendada) | Tipos correctos (`f`, `f`, `i`), nombres legibles, `/muse/data` intacto | Hay que añadir nodos en el Blueprint |

**D2 · De dónde sale el Calm Score válido.** Implementar FFT propia sobre `eegReadings`, o adoptar una
librería de procesado. Afecta al presupuesto de CPU del navegador y a la latencia. **Es sólo la parte
mecánica**; qué se mide y cómo se demuestra que mide algo está en la sección 5 y se decide en D8.

**D3 · Dónde vive la tabla.** Fichero CSV escrito por el relay (ya sabe escribir en `research/`), o
`localStorage` exportable. El relay es preferible: sobrevive al cierre del navegador.

**D4 · Qué se hace con las 75 sesiones sintéticas.** Borrarlas, o conservarlas etiquetadas como `demo` para
las presentaciones comerciales. Hay que decidirlo antes de tocar el research.

**D5 · Un fichero o dos.** Si `soul-charger-app.html` sigue existiendo, todo arreglo se hace por duplicado.
Extraer el pipeline a un módulo compartido en `vendor/` o `src/` es la alternativa.

**D6 · La forma del canal de vuelta.** El director ha confirmado que habrá **sincronización bidireccional con
la gafa**: la aplicación enviará OSC y también recibirá. *Qué* se recibirá está sin definir, pero la
arquitectura tiene que contemplar desde ya que **el relay es un extremo de dos sentidos, no un emisor**.

Lo que hay que decidir ahora, aunque el contenido llegue después:

| Punto | Opciones | Nota |
|---|---|---|
| Puerto de escucha | Fijo y configurable (p. ej. 9000) para todo el relay, o uno fijo por panel | Hoy es efímero y por eso no es alcanzable (H9). Un puerto fijo por proceso es lo más simple y lo que esperan Unreal y TouchDesigner |
| Enrutado | Tabla de direcciones → manejadores, o el `if` actual por caso | Con un solo mensaje el `if` bastaba; con un canal abierto se convierte en una escalera |
| Reenvío al navegador | Mensaje genérico `{type:'osc_in', address, args}`, o un tipo por caso | El genérico permite añadir mensajes sin tocar el relay |
| A qué panel va lo que entra | Por IP de origen, por un identificador en la dirección OSC, o difusión a todos | Con dos gafas en la misma red hace falta desambiguar; hoy no hay forma |

**Recomendación:** puerto de escucha fijo y configurable, tabla de enrutado, reenvío genérico al navegador, y
un identificador de panel en la dirección OSC (`/soul/p1/...`). Decidirlo ahora cuesta una tarde; decidirlo
cuando ya haya mensajes en producción obliga a romper el contrato con la gafa.

**Diseñar el canal ≠ inventar su contenido.** Mientras no se defina para qué sirve, se implementa el
transporte y un solo mensaje de prueba (`/soul/ping` → `/soul/pong`) que sirva de sonda. No añadir mensajes
especulativos: envejecen como comentarios.

**D7 · Escalabilidad a N usuarios — arquitectura futura, no se implementa ahora.** El alcance actual son
**dos usuarios simultáneos** (P1 y P2) y así se queda. Pero el director ha confirmado que habrá que crecer a
varios usuarios conectados, y conviene saber qué lo impide hoy para no clavar más el número dos en sitios
nuevos.

Qué escala ya, sin tocarlo:

- **El relay.** Cada WebSocket abre su propio `UDPPort` con su IP y puerto de destino
  (`backend/server.js:82-88`), y todo el estado —el escudo de NaN, el destino, los temporizadores— cuelga del
  objeto `ws`. No hay estado global compartido entre clientes. Añadir un tercer panel no requiere tocar el
  relay.

Qué está clavado en dos, con su ubicación:

| Punto | Dónde | Qué costaría |
|---|---|---|
| El HTML de los paneles | `soul-charger-admin.html`, **21 identificadores `-1` y 21 `-2` escritos a mano** | Generar el panel desde una plantilla en vez de duplicar el marcado |
| La creación de paneles | `:1772-1773`, dos `new MusePanel(...)` con IP fija | Una lista de configuración, y la IP persistida por panel (R2) |
| La comparación del análisis profundo | `:829-830`, `:1001-1007`, filtros `p1sessions` / `p2sessions` | Agrupar por `panelId` en vez de por dos constantes |
| El resumen de sesiones | `:841`, texto `P1: n · P2: n` | Lo mismo |
| El lanzador | `Iniciar Soul Charger.bat`, abre dos ventanas | Parametrizar el número |

Los límites reales que hay que medir antes de prometer un número:

- **Web Bluetooth.** Cada panel mantiene su propia conexión GATT desde la misma pestaña. Cuántas diademas
  aguanta Chrome de forma estable en un solo proceso **no se ha medido**, y es el techo más probable. Es un
  dato que hay que obtener con hardware, no razonando.
- **Coste de dibujo.** Una gráfica Chart.js por panel a 20 Hz. La auditoría anterior ya atribuía consumo de
  vídeo a este punto.
- **Una sola máquina.** Hoy navegador y relay comparten equipo. Con muchos usuarios, lo natural es separar el
  relay y que cada puesto tenga su navegador — lo que convierte `localhost:3000` en una dirección de red y
  obliga a revisar el modelo entero.

**Qué hacer ahora, que es casi gratis:** en R4 y R5, no nombrar nada «P1/P2» de forma cerrada. Un esquema de
direcciones OSC con identificador de panel (`/soul/p{n}/...`) y una columna `panel` en el CSV admiten N sin
cambiar el contrato. Clavar el dos otra vez es lo que hará caro el cambio después.

**D8 · La definición operativa del índice de calma.** Es la decisión más cara de revertir de todas, y por eso
tiene sección propia: **la 5**, que reúne qué señales da el hardware, qué mezcla se propone y cómo se
demuestra que el número responde a algo. Se resume al final de esa sección.

---

## 5. Qué medir para hablar de calma

Encargo explícito del director: *«la calma es algo ambiguo, no es una onda en particular, pero lo que sea que
estemos midiendo tenga algo de coherencia»*. Esta sección es la investigación de partida. Fija **qué se puede
medir con este hardware**, **qué mezcla se propone** y —lo que de verdad da coherencia— **cómo se demuestra
que el número responde a la calma y no al azar**.

### 5.1 El problema de fondo

La calma no es observable. No existe un sensor de calma ni una banda de calma, y cualquiera que diga que alfa
«es» relajación está simplificando. Lo que sí es defendible es esto:

> Un índice de calma es una **definición operativa**: una fórmula fija, publicada y versionada, que responde
> de forma **monótona y reproducible** a maniobras que sabemos que inducen relajación o activación.

Bajo esa definición, el índice no tiene que ser «verdadero»: tiene que ser **consistente, sensible y
declarado**. Eso es alcanzable con un Muse 2, y es lo que permite defender un resultado ante alguien que
pregunte. Lo que no es alcanzable —y conviene no prometerlo— es un diagnóstico del estado emocional.

### 5.2 Qué puede medir de verdad este hardware

Verificado contra `vendor/muse-js.bundle.js`: EEG a **256 Hz** en cuatro canales (**TP9, AF7, AF8, TP10**), 12
muestras por lectura; **PPG a 64 Hz**, 6 muestras por lectura; acelerómetro y giroscopio; telemetría y batería.

| Señal | Qué mide | Solidez | Nota para este proyecto |
|---|---|---|---|
| **Potencia relativa alfa** (8–13 Hz), en TP9/TP10 | Relajación con vigilia; sube mucho al cerrar los ojos | **Alta.** El aumento de alfa al cerrar los ojos —efecto Berger— es de los fenómenos más replicados del EEG | El pilar del índice. Usar canales posteriores: los frontales se contaminan con parpadeo |
| **Potencia relativa beta** (13–30 Hz) | Activación cognitiva, alerta | Media-alta como *proxy* de activación | Entra restando, no como denominador crudo |
| **Relación alfa/beta** | Índice clásico de neurofeedback de relajación | Media. Muy usada, pero inestable si el denominador se acerca a cero | Preferible trabajar con potencias relativas y restar en escala logarítmica |
| **Potencia relativa theta** (4–8 Hz) | Somnolencia, adormecimiento | Media | **Ambigua a propósito:** theta alta puede ser calma profunda o quedarse dormido. Útil para *detectar* somnolencia y marcarla, no para sumarla a la calma |
| **RMSSD** del PPG (variabilidad del ritmo cardíaco) | Tono parasimpático | **Alta.** Marcador consolidado de activación vagal, y estimable en ventanas cortas | Es el segundo pilar, y es **independiente del EEG**: dos vías que coinciden valen mucho más que una |
| **Ritmo cardíaco** del PPG | Activación autonómica general | Alta, pero muy sensible a postura y esfuerzo | Se envía como dato propio; dentro del índice aporta poco frente a RMSSD |
| **Quietud** del acelerómetro y giroscopio | Movimiento corporal | Alta como medida de lo que es | No es calma, pero moverse mucho la invalida. Sirve de **filtro**, no de sumando |
| **Potencia > 30 Hz** en canales frontales | Tensión muscular, apretar la mandíbula (EMG) | Alta como artefacto | Hoy se usa como «gamma». Su sitio real es **rechazar ventanas**, no restar puntos |
| **Asimetría alfa frontal** (AF7 vs AF8) | Valencia afectiva, aproximación/evitación | **Baja-media, y discutida** | No mide calma sino agrado. **Recomendación: no incluirla.** Añade fragilidad y no responde a la pregunta |

### 5.3 La mezcla que se propone

Dos ejes que miden por vías fisiológicas distintas, más una puerta de calidad. Que dos vías independientes se
muevan juntas es lo que da coherencia; un solo eje siempre se puede explicar por un artefacto.

```
                 ┌─ Eje cortical (EEG)  : z(log alfa_rel) − z(log beta_rel)
índice de calma ─┤
                 └─ Eje autonómico (PPG): z(log RMSSD)

        × puerta de validez: contacto OK · sin EMG · sin parpadeo · quietud
```

**Composición.** `calm_raw = w_c · eje_cortical + w_a · eje_autonómico`, con `w_c + w_a = 1`. Empezar en
**0,6 / 0,4** —el EEG responde antes, el HRV es más estable— y **dejar los pesos configurables y registrados
en cada sesión**, porque el valor correcto sólo se sabe midiendo (§5.5).

**Normalización a 0–1.** Cada componente se convierte en `z` contra el **baseline del propio participante**,
que es lo que ya hace la calibración actual y es el instinto correcto: la potencia absoluta en µV² varía
enormemente entre personas, entre sesiones y según el pelo y el contacto, y no es comparable en crudo. Después
se recorta a ±2,5 y se lleva a 0–1. Esto conserva la arquitectura de calibración que ya existe.

**Puerta de validez.** Si la ventana no pasa el control de calidad, **el índice no se actualiza y se marca la
muestra como no válida**. No se inventa un valor: se mantiene el último bueno y se registra que fue retenido.
Es la diferencia entre un dato defendible y uno maquillado.

**Reglas de forma que evitan los errores actuales:**

- **Potencias relativas, no absolutas.** Cada banda dividida por la potencia total de 1–40 Hz. Esto cancela
  buena parte de la variación por impedancia y contacto.
- **Logaritmo antes de promediar.** Las potencias de banda se distribuyen de forma aproximadamente
  log-normal; promediar en lineal deja que un pico domine la media.
- **Restar en vez de dividir.** `log(alfa) − log(beta)` es equivalente a la relación alfa/beta pero no explota
  cuando el denominador tiende a cero, que es de dónde salen los picos absurdos.
- **Nada de módulo.** El `% 1.0` actual es el origen de los saltos de 0,99 a 0,00 (H1).

### 5.4 Cómo se calcula, en concreto

1. **Separar por canal.** Acumular `reading.samples` en un búfer **por electrodo**, usando el campo
   `electrode` que hoy se ignora (H1, punto 3).
2. **Ventana de 2 s con solape del 75 %** — 512 muestras a 256 Hz, avanzando 128. Da resolución de 0,5 Hz,
   suficiente para separar bandas, y una actualización cada 500 ms.
3. **Ventana de Hann y FFT.** Potencia por banda: delta 1–4, theta 4–8, alfa 8–13, beta 13–30, y 30–45 sólo
   para detectar EMG.
4. **Control de calidad, antes de nada.** Descartar la ventana si hay saturación del amplificador, si la
   potencia de 30–45 Hz supera el umbral de EMG, si hay un transitorio de parpadeo en los canales frontales o
   si el acelerómetro indica movimiento brusco. **Descartar, no corregir.**
5. **Potencias relativas y logaritmo**, promediando alfa y beta entre TP9 y TP10.
6. **PPG en paralelo:** filtro paso banda 0,5–4 Hz, detección de picos sistólicos, serie de intervalos entre
   latidos, rechazo de intervalos imposibles (fuera de 300–2000 ms o con un salto mayor del 20 % respecto al
   anterior), y **RMSSD sobre una ventana deslizante de 60 s**. Menos de 30 s no da una estimación estable, y
   conviene decirlo en vez de mostrar un número que baila.
7. **Calibración:** durante el baseline, acumular media y desviación de cada componente. La duración actual
   —300 muestras a 20 Hz, unos 15 s— es corta para el eje autonómico; el RMSSD pedirá **60 s o más**. Es una
   decisión de diseño a tomar, no un detalle.
8. **Composición, suavizado y salida.** Media móvil sobre el índice compuesto, con la constante ajustada a lo
   que la instalación necesite: demasiado suave y no reacciona; demasiado vivo y tiembla.

### 5.5 Cómo se demuestra que mide algo — lo que da la coherencia

Sin esto, lo anterior es una fórmula bonita. **El protocolo de validación es el entregable de verdad**, y se
puede ejecutar en el estudio, sin laboratorio, con dos personas y media hora.

| Prueba | Maniobra | Qué tiene que pasar | Por qué vale |
|---|---|---|---|
| **A · Ojos cerrados / abiertos** | 60 s abiertos, 60 s cerrados, repetido 3 veces | El eje cortical **sube claramente** con ojos cerrados | Es la prueba decisiva. El efecto Berger es grande y fiable; **si el índice no separa esto, no mide estado cortical y no hay nada que discutir** |
| **B · Respiración pausada / cálculo mental** | 3 min respirando a 6 por minuto, contra 3 min restando de 7 en 7 desde 1000 | El eje autonómico **sube** con la respiración pausada y baja con el cálculo | Contraste clásico de relajación frente a carga cognitiva. Valida el PPG con una maniobra conocida |
| **C · Repetición** | La misma persona, la misma condición, dos días | Los valores **correlacionan** | Un índice que da cosas distintas el martes y el jueves no sirve para comparar participantes |
| **D · Artefactos** | Apretar la mandíbula, parpadear seguido, mover la cabeza | El índice **no se mueve**; las muestras salen marcadas como no válidas | Comprueba que la puerta de calidad funciona. Es el fallo más probable en una instalación con público |
| **E · Señal sintética** | Senos conocidos inyectados en el pipeline | Las bandas salen donde tienen que salir | Verifica el código de FFT antes de culpar a la fisiología |

**Cómo se informa.** Con el **tamaño del efecto**, no con una impresión: *«ojos cerrados frente a abiertos,
d = 1,4; el índice separa las dos condiciones en 9 de 10 repeticiones»*. «Se ve que sube» no es un resultado.

**Y esto es lo que fija los pesos.** `w_c` y `w_a` no se eligen por intuición: se ajustan para maximizar la
separación entre condiciones en las pruebas A y B, con los datos de varias personas. Si el eje autonómico no
aporta separación, se le baja el peso y se dice.

### 5.6 Reglas de honestidad del dato

Sin estas cuatro, dentro de seis meses no se podrá defender ninguna cifra:

1. **Versionar el índice.** Cada sesión guarda `calm_index_version` y los pesos usados. Si la fórmula cambia,
   las sesiones viejas **no son comparables** con las nuevas, y hay que poder saberlo sin adivinar.
2. **Guardar los subíndices, no sólo el compuesto.** El CSV lleva alfa relativa, beta relativa, RMSSD, el
   estado de la puerta de calidad y el compuesto. Con un solo número no se puede averiguar después por qué se
   movió.
3. **Registrar el porcentaje de muestras válidas** de cada sesión. Una sesión con el 30 % de ventanas
   rechazadas no vale lo mismo que una con el 95 %, y hoy no hay forma de distinguirlas.
4. **No presentar como calma lo que es otra cosa.** Si theta alta sugiere somnolencia, se marca la sesión; no
   se cuenta como calma profunda.

### 5.7 Qué se hace con lo que ya existe

No hay que tirarlo todo. **La arquitectura actual es correcta y lo que falla es el contenido:**

- La **calibración con baseline por participante** y el z-score se conservan: es exactamente el enfoque
  adecuado.
- La **máquina de estados** `WARMUP → CALIBRATING → RUNNING` se conserva.
- El **suavizado por media móvil** se conserva, revisando la constante.
- Lo que se retira, y se archiva en `_backup/deprecated/`, son las pseudo-bandas `(avgPower · k) % 1.0` y el
  pulso `70 + (avgPower % 30)`.

### 5.8 Dos señales para dos usos: agencia y estado

Aportación del director, a partir de una instalación anterior que sí funcionaba. Hay que separar dos cosas que
se confunden y que tienen requisitos **opuestos**:

| | **Agencia** — «yo muevo esto» | **Estado** — «esto refleja cómo estoy» |
|---|---|---|
| Latencia tolerable | Menos de ~200–300 ms, o se pierde la sensación de control | Segundos; conviene que no tiemble |
| Señal | Amplitud general y EMG: relajación **muscular** | Alfa/beta relativas y RMSSD: estado cortical y autonómico |
| Ventana | Ninguna, muestra a muestra | 2 s con solape, más suavizado |
| Para qué sirve | Mover la esfera | El registro de investigación |
| Se puede defender en un informe | No hace falta | Obligatorio |

**Por qué la capa rápida funciona.** En una instalación previa se enviaban las señales normalizadas de la app
de Muse y, al relajarse, **bajaban todas las bandas a la vez**. Eso no es un fenómeno cortical: si lo fuera,
el alfa habría subido mientras el resto bajaba. Que baje todo junto indica que lo que mandaba era la caída del
nivel general, dominado por músculo —mandíbula, frente, cuello, movimiento ocular— en una diadema seca.

**Y eso es una señal legítima, no un error.** Relajar la musculatura es parte de relajarse. Tiene tres
propiedades que el alfa no tiene: es enorme frente al fondo, es inmediata, y funciona con cualquiera sin
entrenamiento. Para una instalación es justo lo que se necesita. Lo único obligatorio es **llamarla por su
nombre**: es *quietud física*, no *estado de calma*.

**Ya está calculada en el código.** `const avgPower = samples.reduce((acc, v) => acc + Math.abs(v), 0) /
samples.length` (`soul-charger-admin.html:1620`) es una estimación honesta de amplitud general, y es lo único
del pipeline de señal que mide algo real. El fallo de H1 es todo lo que se hace con ella después. Normalizarla
contra el baseline del participante e invertirla da la capa rápida **sin FFT, sin app de Muse y sin esperar a
R8**: llega cada 47 ms, que es la cadencia de los paquetes de EEG.

Para esto conviene usar **AF7 y AF8**, los frontales — que para el índice de calma son los peores por
contaminarse de músculo, y para esto son los mejores por exactamente la misma razón.

> **⚠️ La trampa que hay que evitar.** El índice de calma **rechaza** las ventanas con artefacto muscular. La
> esfera responde **gracias** a ese artefacto. Es la misma magnitud física usada al revés. Si se intenta que
> un solo número sirva para las dos cosas, al mejorar la validez la esfera se queda muerta, y al hacerla
> responder el registro se llena de tensión mandibular etiquetada como calma. **Tienen que ser dos señales
> separadas desde el origen**, no la misma con distinto suavizado.

**D9 · Dos señales, dos nombres, dos destinos.** `physical_stillness` para la experiencia y `calm_index` para
el registro. Se envían como floats distintos (R4) y se guardan en columnas distintas (R5).

### 5.9 De dónde salen las bandas: dos arquitecturas posibles

**Verificado:** `vendor/muse-js.bundle.js` sólo expone datos **crudos** — `eegReadings`, `ppgReadings`,
`accelerometerData`, `gyroscopeData`, `telemetryData`. No hay bandas calculadas, ni calidad de contacto, ni
métricas derivadas. El procesamiento de Muse vive en su SDK, no en el firmware de la diadema.

Eso explica el origen de H1: alguien eligió la vía del navegador y se quedó sin el procesamiento, y las
pseudo-bandas son el parche.

Existe una segunda vía, la que se usó en la instalación anterior: **la app de Muse enviando OSC** (Muse
Direct, Mind Monitor o MuseIO), que manda las bandas ya calculadas a unos 10 Hz, más calidad de contacto por
electrodo y métricas propias tipo `mellow` o `concentration`.

| | **A · Web Bluetooth propio** (lo actual) | **B · App de Muse por OSC** |
|---|---|---|
| Trabajo pendiente | Implementar el cálculo espectral (R8) | Funciona prácticamente ya |
| Equipo por usuario | Diadema y navegador | Diadema **más un móvil o app de escritorio por cada una** |
| Calidad de contacto | No la hay; hay que estimarla | La da el propio flujo, y es justo lo que falta hoy |
| Defender el dato | Fórmula propia, versionable y explicable | `mellow` es una **caja negra** sin documentar |
| Dependencias | Ninguna; funciona sin conexión | Software de terceros que puede cambiar o desaparecer |
| Escala a N usuarios (D7) | Limitado por las conexiones GATT del navegador | Limitado por el número de móviles |

**D10 · Qué vía se usa, y para qué.** No tienen por qué ser excluyentes:

- Para la **esfera**, cualquiera de las dos vale. Una caja negra es aceptable en una experiencia.
- Para el **registro de investigación**, sólo sirve A: no se puede publicar un número cuya fórmula se
  desconoce.
- El uso más valioso de B es como **referencia independiente** para validar el cálculo propio. Si las bandas
  de A se mueven como las de B ante las mismas maniobras, es una comprobación que no depende del código
  propio. No es verdad absoluta —comparar dos implementaciones no verifica ninguna si comparten el error—
  pero combinada con la prueba de señal sintética (5.5, prueba E) es una red sólida.

**Pendiente de confirmar con el director:** si en aquella instalación se enviaban las bandas
(`alpha_relative`, `beta_relative`) o el valor `mellow` ya compuesto. Lo primero es reproducible; lo segundo
es propiedad de Muse.

### 5.10 El experimento del círculo: ¿hay control voluntario?

Propuesta del director, y es el experimento que zanja la discusión anterior. La idea: una aplicación web con
un círculo; cada vez que la persona **intenta** achicarlo, marca con el ratón. Después se busca correlación
entre esa marca y las señales.

Es un **experimento de etiquetado**: el clic es una referencia temporal de la intención, sincronizada con la
señal. Es lo que falta para dejar de decidir por intuición.

**Tres fallos que lo invalidarían, con su arreglo:**

1. **El círculo no debe responder durante la prueba.** Si reacciona mientras lo intentas, te adaptas a él sin
   darte cuenta y deja de poder distinguirse si mueves la señal o reaccionas a ella. **Lazo abierto**: sólo se
   graba. La versión que responde viene después.
2. **Hace falta un criterio de azar.** Con datos suficientes casi siempre aparece «algo». Se resuelve gratis:
   **desplazar la serie de clics en el tiempo** al azar y recalcular, 200 veces. Eso da la distribución de lo
   que sale por casualidad, y la correlación real tiene que superar al 95 % de ella. **Sin esto la prueba no
   sabe fallar**, y siempre «encuentra» algo.
3. **El clic contamina.** Mantener el botón apretado es tensión muscular sostenida que puede filtrarse. Mejor
   **un clic para empezar y otro para terminar**, y en la primera fase que sea la pantalla la que marque el
   turno, para que la etiqueta no dependa de acordarse.

**Protocolo.** Fase 1, con señal en pantalla (~10 min): alterna «ACHICAR» 20 s / «DESCANSO» 20 s, quince
veces, confirmando con el clic. Fase 2, libre (~5 min): sin señal, se marca cuando se quiera; se parece más a
la instalación real.

**Qué se graba**, todo con **el mismo reloj**: los cuatro canales de EEG en crudo, el PPG, el acelerómetro y
el estado del clic. Si el clic y el EEG van por relojes distintos, no hay análisis posible.

**Qué se analiza**, en tramos de 250 ms: amplitud general por canal, alfa relativa, beta relativa, alfa/beta,
potencia por encima de 30 Hz, movimiento y ritmo cardíaco. Cada una contra el clic, **probando retardos de −2
a +5 s**, porque la intención precede a la señal y no se sabe cuánto.

**Lo valioso no es «hay correlación», es con QUÉ correlaciona:**

| Si lo que correlaciona es… | Entonces… |
|---|---|
| Amplitud general o potencia >30 Hz | Es relajación muscular. Perfecto para la esfera, y se le pone ese nombre (D9) |
| Alfa relativa, tras rechazar artefactos | Hay control cortical real. Resultado excelente, y cambia lo que se puede prometer |
| El acelerómetro | Se está moviendo la cabeza sin darse cuenta |
| Nada supera al azar | Se evita construir la instalación sobre una ilusión, y se tira de actos deliberados: cerrar los ojos, mandíbula |

**El retardo del pico da gratis el otro dato que hacía falta:** cuánto puede tardar la esfera en responder sin
sentirse muerta.

**Bonus:** la aplicación de grabación es, casi tal cual, el **corpus etiquetado que R11 necesita** para
validar el índice. Una sola construcción sirve para las dos cosas, y no depende de R8: se graba crudo y se
analiza después con un guion.

---

**Resumen de decisiones de esta sección.**

**D8 · La definición operativa del índice de calma.** Es la decisión más cara de revertir del proyecto —una
vez publicados resultados, cambiar la fórmula invalida lo anterior— y por eso necesita ADR propia, escrita
**antes** de programar y **revisada después** de la validación, con los números medidos dentro.

**D9 · Dos señales para dos usos** (5.8): quietud física para la experiencia, índice de calma para el
registro. Separadas desde el origen.

**D10 · Qué vía alimenta las bandas** (5.9): Web Bluetooth propio, app de Muse, o las dos con papeles
distintos.

---

## 6. Cómo se verifica este proyecto

El método exige que exista una forma de medir desde el primer día. Aquí una sonda es un guion de Node que se
ejecuta sin diadema y sin Unreal:

| Sonda | Qué mide | Cómo sabe fallar |
|---|---|---|
| `probe-bands` | Alimenta el cálculo de bandas con senos puros de 10 Hz y 20 Hz de igual amplitud y compara alfa/beta. | Con el código actual (H1) los dos casos dan lo mismo: la sonda debe cazarlo. |
| `probe-osc` | Abre un puerto UDP, recibe los mensajes del relay y comprueba direcciones, **tipos** y rangos. | Con el código actual el pulso llega `0.0` y el sensor llega como `f`: debe fallar. |
| `probe-dropout` | Simula un corte a mitad de sesión y comprueba que el flujo OSC no se detiene y que el estado del sensor pasa a inactivo. | Hoy el flujo se congela con BT=1: debe fallar. |
| `probe-csv` | Ejecuta una sesión sintética y **abre el CSV resultante**, contando filas y validando cabeceras. | El material que se fabrica y no se mira esconde fallos. |
| `probe-inbound` | Envía un OSC al puerto de escucha **desde otra máquina o desde otro puerto de origen**, y comprueba que llega al navegador. | Hoy debe fallar: el puerto es efímero (H9). Enviar desde el puerto de origen del propio relay no vale — mediría la premisa, no la conclusión. |
| `probe-calm` | Reproduce grabaciones etiquetadas de ojos abiertos y ojos cerrados y exige que el índice las separe con un tamaño de efecto mínimo. | Es la sonda de la conclusión del proyecto entero. Requiere el corpus de la sección 5.5; hasta que exista, el índice **no está verificado y se dice así**. |

Las seis miden la conclusión —lo que Unreal recibe y lo que queda escrito—, no la premisa.

---

## 7. Lo que está bien y conviene no romper

Para que la lista de arriba no dé una impresión equivocada, esto ya está resuelto y es correcto:

- **El aislamiento por cliente en el relay.** Cada WebSocket abre su propio `UDPPort` (`server.js:82-88`), así
  que P1 y P2 pueden apuntar a IPs distintas. Es la base sobre la que se apoya el requisito de elegir IP.
- **El escudo de NaN** (`server.js:73-79`). Los micro-cortes de BLE producen `NaN` → `null` en JSON, que
  revienta a los oyentes OSC. Cualquier campo nuevo debe pasar por `safeFloat()`.
- **Servir todo en local, sin CDN.** `vendor/` existe para que la instalación funcione sin conexión. No
  reintroducir CDN.
- **La guarda de ruta del servidor estático** (`server.js:28`).
- **El lanzador `.bat`**, que libera puertos y detecta navegador compatible.
- **La vista Research y el análisis profundo** están bien construidos visualmente: el problema es la
  procedencia de los datos, no el código que los dibuja.
