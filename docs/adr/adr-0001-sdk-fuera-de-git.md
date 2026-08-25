# ADR-0001 — El SDK de Muse no se versiona

- **Fecha:** 2026-08-25
- **Estado:** **Aceptada**

## Contexto

La integración nativa de `hardware/Source/` (`SoulChargerBLE`, `SoulChargerBrainFlow`) requiere el SDK propietario de Muse para Windows (`SDK/libmuse_windows_8.0.5/`), unos **1,1 GB** de binarios `.lib`. En la limpieza del repositorio (RONDA 0 de preparación) el árbol versionado pasó de **2635 a 20 ficheros** y de **1,1 GB a 1,3 MB**; casi todo el peso era el SDK. La app web **no** usa esa vía: se conecta a la diadema por Web Bluetooth con `vendor/muse-js.bundle.js`, que sí está versionado.

## Decisión

El SDK **no entra en git**. Queda en disco local, fuera del control de versiones, y se documenta en `README.md` cómo obtenerlo (portal de desarrolladores de Muse, descomprimir en `SDK/`).

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Versionar el SDK | 1,1 GB en cada clon; binarios propietarios que no se pueden redistribuir |
| Git LFS | Sigue redistribuyendo binarios de terceros; añade dependencia de LFS a una instalación que se quiere simple |

## Consecuencias

**A favor:** repositorio liviano (1,3 MB); clonar es instantáneo; no se redistribuye software de terceros.

**En contra, y se asume:** quien quiera compilar `hardware/Source/` tiene que conseguir el SDK por su cuenta. Como la vía nativa **no la usa la app web**, el impacto es nulo para el flujo principal; si algún día se adopta esa vía, este ADR se revisa.

## Cómo se revierte

Trivial de revertir para un caso puntual (añadir el SDK y quitar su regla del `.gitignore`), pero la decisión de fondo —no redistribuir binarios propietarios de 1,1 GB— no debería revertirse sin un motivo fuerte.
