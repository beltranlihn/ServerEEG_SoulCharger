# Soul Charger — bitácora

Una entrada por ronda, **lo más nuevo arriba**. Cada entrada dice **qué se cambió, por qué, y qué se midió**.

Un cambio sin medición anotada es un cambio que nadie podrá evaluar dentro de seis semanas — incluido quien lo
hizo.

---

## R4 · Contrato OSC nuevo — 2026-08-30 — Direcciones dedicadas para calma, pulso y sensor

Encargo del director: enviar índice de calma, ritmo cardíaco y estado del sensor. Se hace **fuera del orden del camino A** (iría tras R2/R3) porque es independiente de ellas y es lo primero que el director puede **testear con TouchDesigner**; la sonda de R1 ya lo cubría.

**Qué se hizo.**

1. **ADR-0004** (D1): los tres valores viajan por **direcciones OSC dedicadas**, no alargando el arreglo congelado de 18 floats (ADR-0003, que no admite el tipo entero). Las salientes conservan el prefijo `/muse/` sin id de panel: cada panel envía a su propia IP y el destino ya desambigua; el id de panel se reserva para el canal de entrada (R10).
2. **`backend/server.js`**: tras el envío de `/muse/data`, se emiten `/muse/calm` (`f`), `/muse/heart_rate` (`f`) y `/muse/sensor_active` (`i`), pasando por el escudo de NaN (floats) y coerción a 0/1 (entero). El arreglo **no se toca**.
3. **`CLAUDE.md`**: documentados los nodos a añadir en Unreal/TouchDesigner (`Get OSC Message Float/Int At Index 0`).
4. **`probe-osc`**: corregida la comprobación obsoleta del pulso — ahora afirma que el pulso viaja por `/muse/heart_rate` y que idx14 del arreglo sigue en `0.0` (contrato congelado), no que el arreglo lleve el pulso.

**Medido.** `npm run probe` pasa de **rojo (exit 1)** a **verde (exit 0)**: llegan `/muse/heart_rate` (f) ≈ 72 bpm, `/muse/sensor_active` de tipo entero (i), y el arreglo `/muse/data` intacto (18 floats, idx14 = 0.0). La misma sonda que cazaba la ausencia ahora confirma la presencia.

**Sin verificar.** No se ha probado **contra Unreal ni TouchDesigner** (no hay motor en este equipo): esa parte del encargo R4 queda para el director. Y el **valor** del pulso sigue siendo el inventado (H2) hasta R7; el del estado del sensor, hasta R3/R8: esta ronda fija el **transporte**, no la validez del contenido.

**Siguiente paso.** R2 (persistir IP), R3 (continuidad ante caídas) — o, en camino B, R7/R8 (señal real). Varias de las que quedan necesitan una diadema Muse física (R7, R8) o un estudio con personas (R11), y no se pueden cerrar sin ellas.

---

## R1 · La red de sondas — 2026-08-30 — `probe-osc` que sabe fallar

Segunda ronda de `docs/NEXT.md`. Instala la verificación **antes** de tocar código de señal: sin una forma de medir, el sistema nuevo se escribiría a ciegas (así se llegó al Calm Score que lleva meses sin medir calma, H1).

**Qué se hizo.**

1. **Lanzador único `npm run probe`** (`scratchpad/run-probes.js`): arranca un relay **aislado en puertos de test** (WS 3999 / HTTP 5599) para no interferir con la instalación del operador, corre todas las sondas y sale con código ≠0 si alguna falla.
2. **`probe-osc`** (`scratchpad/probe-osc.js`): conduce el relay real —le inyecta una trama `full_telemetry` por WebSocket— y valida lo que **emite por UDP**: direcciones, tipos y rangos. Mide la **conclusión** (lo que Unreal recibiría), no la premisa.
3. **`backend/server.js`**: puertos de escucha configurables por entorno (`RELAY_WS_PORT` / `RELAY_HTTP_PORT`, default 3000/5500). Cambio mínimo y retrocompatible que hace la sonda hermética.

**Medido — la sonda sabe fallar.** Ejecutada contra el código actual (`npm run probe`), sale en **rojo con código 1**, y falla justo donde tiene que fallar:
- **Verde (contrato actual):** `/muse/data` llega, 18 args, todos `f`, idx13 calm = 0.5 en rango, idx16/17 complementarios (6 comprobaciones).
- **Rojo (contrato R4, aún inexistente):** no llega `/muse/heart_rate` (f), no existe `/muse/sensor_active` (i), y el pulso viaja como `0.0` en idx14 (H2).

Se descubrió y sorteó un detalle real del relay: al fijar un puerto OSC nuevo, `initUDP()` reabre el socket de forma asíncrona y **pierde el primer envío**; por eso la sonda manda varias tramas espaciadas en vez de una (una sola daba un falso negativo del contrato actual).

**Sin verificar.** La sonda se probó contra el relay, no contra Unreal ni una diadema física; eso es correcto por diseño (una sonda corre sin ninguno de los dos). Las demás sondas del catálogo (`probe-bands`, `probe-dropout`, `probe-csv`, `probe-inbound`, `probe-calm`) se crean en sus rondas respectivas.

**Siguiente paso.** Depende del camino que elija el director (A o B en `docs/NEXT.md`). En cualquiera, la próxima es R2 (persistir la IP de la gafa) o R7/R8 (señal real).

---

## R0 · Orden documental — 2026-08-30 — Fusión de plantillas y relleno del mapa

Primera ronda de `docs/NEXT.md`. **No toca código de la aplicación**; deja la documentación lista para trabajar. Todo verificado contra el análisis de traspaso y el código, no contra documentación previa.

**Qué se hizo.**

1. **Fusión de las plantillas del método** en los ficheros reales de la raíz (conservando el contenido ya verificado): `CLAUDE.md` gana el mapa vivo, `/code-review` al cerrar cada ronda, las convenciones obligatorias (idioma castellano neutro sin voseo, archivar-no-borrar), los comandos, la entrega y la sección de *gotchas*; `README.md` gana la tabla de documentación.
2. **Relleno del mapa** desde el análisis: `ARCHITECTURE.md` (panorama, diagrama de componentes con el relay como extremo de dos sentidos, modelo de datos, cuatro flujos, conceptos transversales, tabla de riesgos H1–H9, glosario), `COMPONENTS.md` (5 subsistemas con `archivo · función` y estado, lo frágil marcado ⚠️) y `docs/ESTRUCTURA-DEL-CODIGO.md` (orden de lectura y trampas conocidas).
3. **Utillaje de `.claude/`**: `arch-map/SKILL.md` y `arch-explorer.md` apuntando a los ficheros reales; `commit.md` y `entrega.md` con los comandos reales (`node --check`, `npm run probe`, sin build, instalación local).
4. **Tres ADR** de las decisiones ya tomadas: `adr-0001` (SDK fuera de git), `adr-0002` (vendor sin CDN), `adr-0003` (arreglo OSC congelado de 18 floats), con su índice.
5. **Retirada de `docs/plantillas-sin-fusionar/`** una vez consumidas las dos fusiones.

**Medido.**

- Marcadores de plantilla `{{…}}` en los documentos vivos y el utillaje de `.claude/`: **de varias decenas a 0** (`grep -rn "{{"` sobre `CLAUDE.md`, `README.md`, `ARCHITECTURE.md`, `COMPONENTS.md`, `docs/ESTRUCTURA-DEL-CODIGO.md`, `.claude/` → sin resultados).
- Convención de idioma aplicada: 0 casos de voseo en la documentación nueva.
- Los nueve hallazgos del análisis quedan referidos desde el mapa (tabla de riesgos de `ARCHITECTURE.md` §6 y columna «Ticket» de `COMPONENTS.md`), no reescritos: una sola fuente.

**Sin verificar.** El Blueprint de Unreal sigue sin inspeccionar (`adr-0003` lo deja anotado como tarea previa a R4); el proyecto vive en `VR_DigitalSanctuary`, otro repositorio.

**Siguiente paso.** R1 (red de sondas), y antes la decisión del director entre camino A y camino B.

---

## RONDA 0 (preparación) — 2026-08-25 — Limpieza, sistema de trabajo y plan de traspaso

Ronda de preparación para incorporar a otra persona al proyecto. **No se escribió código de la aplicación.**

**Qué se hizo.**

1. **Publicación limpia del repositorio.** Se reemplazó el contenido de
   `github.com/beltranlihn/ServerEEG_SoulCharger` con historia nueva. Se sacaron del control de versiones el
   SDK de Muse, `node_modules/`, `__MACOSX/` y las capturas de sesión.
2. **Retirada de material obsoleto.** Se eliminaron `frontend/src/` (versión antigua, no referenciada por
   ningún punto de entrada y con dependencias de CDN), `auditoria_proyecto.md`, una copia de skill ajena al
   proyecto, ~400 capturas PNG y basura de macOS.
3. **Instalación del método de trabajo** de Alma Digital Studio: `METODO.md`, `ARCHITECTURE.md`,
   `COMPONENTS.md`, `docs/`, `_backup/deprecated/`, `scripts/` y el utillaje de `.claude/`.
4. **Lectura completa del código** y redacción del análisis de traspaso y de la cola de trabajo.

**Medido.**

- Tamaño del árbol versionado: **2635 → 20 ficheros**, y **1,1 GB → 1,3 MB** de contenido publicado. El SDK
  sigue en disco local, fuera de git.
- Contraste del `auditoria_proyecto.md` retirado contra `backend/server.js` y `soul-charger-admin.html`:
  **cuatro afirmaciones falsas** — puerto 8080 (real: 3000), 16 direcciones OSC separadas (real: un arreglo
  de 18 floats en `/muse/data`), bucle a 60 Hz / 16 ms (real: 50 ms, 20 Hz) y calibración de 120 muestras
  ≈ 2 s (real: 300 muestras ≈ 15 s). Ése fue el motivo de retirarlo en vez de actualizarlo.
- Comprobación de que el utillaje de `.claude/` **no** queda ignorado tras fusionar el `.gitignore`:
  `git check-ignore` sobre los tres ficheros devuelve vacío.

**Trampas encontradas.** Están en
`docs/historial/2026-08-25-analisis-para-traspaso.md`, nueve hallazgos con `fichero:línea`. Las cuatro que
condicionan el encargo siguiente:

- **H1** — las bandas EEG no son bandas: alfa, beta, theta y delta salen del mismo escalar de amplitud media,
  multiplicado por cuatro constantes y plegado con módulo 1.0. No hay FFT en el repositorio. El Calm Score no
  mide calma.
- **H2** — el ritmo cardíaco es inventado (`70 + (avgPower % 30)`), y encima no llega a Unreal: el relay
  escribe `0.0` en su índice. El Muse 2 tiene PPG y el bundle ya lo soporta.
- **H3** — el research promedia 75 sesiones fabricadas con media forzada a `+7 %` mezcladas con las reales, y
  borrarlas no funciona: al recargar se replantan.
- **H9** — el canal OSC de entrada escucha en un puerto efímero (`localPort: 0`), que cambia en cada
  reconexión. La gafa no puede saber a dónde enviar, así que el único mensaje entrante que existe en el código
  (`/unreal/end_session`) probablemente nunca ha llegado. Es lo primero que bloquea la sincronización
  bidireccional que el director ha confirmado para más adelante.

**Sin verificar.** Nada se probó con diadema física ni contra Unreal; el análisis es lectura de código. Los
puntos abiertos están al final de `docs/NEXT.md`.

**Alcance fijado por el director en esta sesión.**

- Se trabaja para **dos usuarios simultáneos**. Crecer a N usuarios es dirección confirmada pero **arquitectura
  futura**: está descrita en D7 y en la sección «Arquitectura futura» de `docs/NEXT.md`, y no se implementa en
  ninguna ronda. Lo único que se pide es no volver a clavar el número dos.
- Habrá **sincronización bidireccional con la gafa** —el relay envía y recibe—, con el uso todavía sin
  definir. Se planifica el transporte (R10) sin inventar mensajes.
- El objetivo del proyecto es **medir estado de calma con coherencia**, asumiendo que la calma no es una onda
  concreta. Se aborda como **definición operativa**: una fórmula fija, publicada y versionada, que responde de
  forma reproducible a maniobras conocidas. La investigación de partida —qué señales da el hardware, qué
  mezcla se propone y cómo se demuestra— es la sección 5 del análisis; la ronda es R11 y la decisión es D8.

- La esfera de la instalación y el registro de investigación **no se mueven con el mismo número**: la primera
  con quietud física (rápida, muscular), el segundo con el índice de calma (lento, defendible). Separadas
  desde el origen — D9, y el aviso de la sección 5.8.

**Siguiente paso.** **R12, el experimento del círculo**, previsto para el 2026-08-26 en cuanto haya diadema:
graba EEG crudo en lazo abierto mientras la persona marca con el ratón cuándo *intenta* achicar el círculo, y
después se busca qué señal correlaciona con esa intención, contra un criterio de azar por permutación. Su
resultado condiciona D8, D9 y R11, y de paso construye el corpus de grabación que R11 necesitaba igualmente.
La aplicación de grabación se puede montar sin diadema.

Después, la Ronda 0 (orden documental) y R1 (red de sondas). Y hace falta que el director elija entre el
**camino A** (entregar antes) y el **camino B** (validez antes), descritos en la cabecera de la cola.
