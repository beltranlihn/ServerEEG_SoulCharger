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
`docs/historial/2026-08-25-analisis-para-traspaso.md`, ocho hallazgos con `fichero:línea`. Las tres que
condicionan el encargo siguiente:

- **H1** — las bandas EEG no son bandas: alfa, beta, theta y delta salen del mismo escalar de amplitud media,
  multiplicado por cuatro constantes y plegado con módulo 1.0. No hay FFT en el repositorio. El Calm Score no
  mide calma.
- **H2** — el ritmo cardíaco es inventado (`70 + (avgPower % 30)`), y encima no llega a Unreal: el relay
  escribe `0.0` en su índice. El Muse 2 tiene PPG y el bundle ya lo soporta.
- **H3** — el research promedia 75 sesiones fabricadas con media forzada a `+7 %` mezcladas con las reales, y
  borrarlas no funciona: al recargar se replantan.

**Sin verificar.** Nada se probó con diadema física ni contra Unreal; el análisis es lectura de código. Los
puntos abiertos están al final de `docs/NEXT.md`.

**Siguiente paso.** Ronda 0 de `docs/NEXT.md` (orden documental), y después R1 (red de sondas). Antes de
empezar hace falta que el director elija entre el **camino A** (entregar antes) y el **camino B** (validez
antes), descritos en la cabecera de esa cola.
