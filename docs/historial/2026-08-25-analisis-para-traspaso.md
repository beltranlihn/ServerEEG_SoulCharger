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
| **Float · índice de calma normalizado 0–1** | Se envía en el índice 13. El rango sí es 0–1 (`:1393-1396`). | El transporte funciona; **el contenido no es válido (H1)**. |
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
librería de procesado. Afecta al presupuesto de CPU del navegador y a la latencia.

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

---

## 5. Cómo se verifica este proyecto

El método exige que exista una forma de medir desde el primer día. Aquí una sonda es un guion de Node que se
ejecuta sin diadema y sin Unreal:

| Sonda | Qué mide | Cómo sabe fallar |
|---|---|---|
| `probe-bands` | Alimenta el cálculo de bandas con senos puros de 10 Hz y 20 Hz de igual amplitud y compara alfa/beta. | Con el código actual (H1) los dos casos dan lo mismo: la sonda debe cazarlo. |
| `probe-osc` | Abre un puerto UDP, recibe los mensajes del relay y comprueba direcciones, **tipos** y rangos. | Con el código actual el pulso llega `0.0` y el sensor llega como `f`: debe fallar. |
| `probe-dropout` | Simula un corte a mitad de sesión y comprueba que el flujo OSC no se detiene y que el estado del sensor pasa a inactivo. | Hoy el flujo se congela con BT=1: debe fallar. |
| `probe-csv` | Ejecuta una sesión sintética y **abre el CSV resultante**, contando filas y validando cabeceras. | El material que se fabrica y no se mira esconde fallos. |
| `probe-inbound` | Envía un OSC al puerto de escucha **desde otra máquina o desde otro puerto de origen**, y comprueba que llega al navegador. | Hoy debe fallar: el puerto es efímero (H9). Enviar desde el puerto de origen del propio relay no vale — mediría la premisa, no la conclusión. |

Las cinco miden la conclusión —lo que Unreal recibe y lo que queda escrito—, no la premisa.

---

## 6. Lo que está bien y conviene no romper

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
