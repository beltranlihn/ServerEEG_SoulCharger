# Soul Charger — bitácora

Una entrada por ronda, **lo más nuevo arriba**. Cada entrada dice **qué se cambió, por qué, y qué se midió**.

Un cambio sin medición anotada es un cambio que nadie podrá evaluar dentro de seis semanas — incluido quien lo
hizo.

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

**Siguiente paso.** Ronda 0 de `docs/NEXT.md` (orden documental), y después R1 (red de sondas). Antes de
empezar hace falta que el director elija entre el **camino A** (entregar antes) y el **camino B** (validez
antes), descritos en la cabecera de esa cola.
