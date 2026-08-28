# Soul Charger - Muse OSC Relay

Integración entre una diadema **Muse 2** (vía Web Bluetooth en el navegador) y **Unreal Engine** / TouchDesigner (vía OSC UDP desde un relay Node.js). Todo corre en local.

```
Muse 2 ──Web Bluetooth──> Navegador ──WebSocket:3000──> Node.js relay ──OSC/UDP:8000──> Unreal
```

## Estructura de la Aplicación
- **`soul-charger-admin.html`**: panel de operador y aplicación principal. Captura el EEG por Bluetooth, calcula el Calm Score y lo envía por WebSocket al backend. Es autocontenido (HTML + CSS + JS inline).
- **`soul-charger-app.html`**: vista de participante, versión de un solo usuario.
- **`vendor/`**: dependencias servidas de forma local (Chart.js, muse-js, tipografías). Sin CDN, para funcionar offline en eventos.
- **`backend/`**: servidor Node.js que hace de servidor HTTP estático y de relay WebSocket → UDP/OSC hacia Unreal Engine.
- **`hardware/Source/`**: integración nativa en C++ para Unreal (vía alternativa, no la usa la app web).

## Documentación

| Ruta | Qué es |
|---|---|
| **`docs/ESTRUCTURA-DEL-CODIGO.md`** | **Por dónde empezar a leer el código.** Orden de lectura y trampas conocidas. |
| `CLAUDE.md` | Contrato del proyecto: convenciones, comandos, contrato OSC, algoritmo, gotchas. |
| `ARCHITECTURE.md` | Cómo funciona: componentes, flujos, conceptos transversales, riesgos y deuda. |
| `COMPONENTS.md` | Inventario componente a componente, con `archivo · función` y estado. |
| `PLAN.md` | Bitácora por rondas: cada cambio con su motivo y sus mediciones (lo más nuevo arriba). |
| `METODO.md` | Las reglas de trabajo. Cada una nació de un fallo concreto. |
| `docs/adr/` | Decisiones de diseño con su porqué (inmutables). |
| `docs/NEXT.md` | Cola de trabajo pendiente, de rápido a complejo. |
| `docs/historial/` | Documentos cerrados: auditorías e investigaciones. Contexto, no referencia. |

Carpetas de trabajo: `scratchpad/` (sondas de verificación, sus volcados no se versionan) · `_backup/deprecated/` (código retirado, con fecha).

## Guía de Inicio

La forma rápida en Windows es ejecutar **`Iniciar Soul Charger.bat`**: libera los puertos, arranca el relay y abre el panel en Chrome o Edge.

Manualmente:

```bash
cd backend
npm install
npm start
```

Luego abre <http://localhost:5500/soul-charger-admin.html>.

> **Web Bluetooth solo funciona en Chrome o Edge.** Firefox y Safari no lo soportan.

| Puerto | Uso |
|---|---|
| `5500` | Servidor HTTP estático (sirve los HTML y `vendor/`). |
| `3000` | WebSocket entre el navegador y el relay. |
| `8000` | Destino OSC/UDP hacia Unreal (por defecto `127.0.0.1:8000`, configurable desde la UI). |

## Requisitos externos (no versionados)

Para mantener el repositorio liviano, estos recursos **no están en git** y deben obtenerse por separado:

| Ruta | Qué es | Cómo obtenerlo |
|---|---|---|
| `SDK/libmuse_windows_8.0.5/` | SDK propietario de Muse para Windows (~1.1 GB de binarios `.lib`). Solo necesario para compilar la integración nativa de `hardware/Source`. | Descargar desde el portal de desarrolladores de Muse y descomprimir dentro de `SDK/`. |
| `backend/node_modules/` | Dependencias de Node. | `cd backend && npm install` |
| `research/`, `sesion_*.png` | Capturas y exports generados por las sesiones EEG. | Se regeneran al ejecutar sesiones; no forman parte del código. |

El frontend web (`soul-charger-app.html`) **no** requiere el SDK: se conecta a la diadema vía Web Bluetooth usando `vendor/muse-js.bundle.js`, que sí está versionado.

## Contrato OSC

El relay emite **exactamente tres mensajes** por tick, a 60 Hz, hacia la IP y el puerto que se configuran por
panel. No hay ningún otro.

| Dirección | Tipo | Valor |
|---|---|---|
| `/muse/calm` | `f` | Índice de calma, `0.0`–`1.0` |
| `/muse/heart_rate` | `f` | Ritmo cardíaco en bpm |
| `/muse/sensor_active` | `i` | Sensor activo, `0` / `1` |

En Unreal o TouchDesigner: un `OSC Message` por dirección, y `Get OSC Message Float At Index 0` para las dos
primeras, `Get OSC Message Int At Index 0` para la tercera.

> ⚠️ **El transporte es correcto; el contenido todavía no.** El índice de calma se calcula sobre pseudo-bandas
> que no son un análisis espectral, y el ritmo cardíaco es un número derivado del EEG, no una medición
> cardíaca. Están catalogados como `H1` y `H2` en `docs/historial/2026-08-25-analisis-para-traspaso.md` y los
> arreglan las rondas `R7` y `R8`. No presentar estas cifras como medidas hasta entonces.

**Histórico:** hasta la ronda `R16` se emitía además `/muse/data`, un arreglo monolítico de 18 floats que
Unreal leía por índice, y `/muse/v2/calm`. Se retiraron al confirmarse que ya no tenían consumidor. El porqué
está en `docs/adr/adr-0005-retirada-del-arreglo-osc.md` y el código en `_backup/deprecated/`.

Existe también una dirección **entrante**, `/unreal/end_session`, pero no está comprobado que llegue nunca: el
relay escucha en un puerto efímero que la gafa no puede conocer (`H9`). Es lo primero que resuelve la ronda
`R10`, la de sincronización bidireccional.
