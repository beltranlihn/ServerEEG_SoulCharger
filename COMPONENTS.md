# COMPONENTS — mapa vivo de Soul Charger

Inventario de referencia. **Es la estructura que el código no muestra por sí solo.**

**Regla anti-pudrición:** al cambiar código, se actualiza su fila **en el mismo commit**. Un mapa desactualizado es peor que no tenerlo: se consulta con confianza y manda a un sitio equivocado.

**Estados:** ✅ estable · 🚧 en progreso o parcial · ⚠️ frágil, tratar con cuidado · 🗑️ obsoleto, a retirar · 🗄️ archivado en `_backup/deprecated/`.

Los números de línea orientan, no son exactos: verificar el símbolo por búsqueda, no confiar sólo en el número.

---

## Índice maestro

### 1 · Panel (navegador)
| Componente | Qué hace | Ubicación | Estado | Ticket |
|---|---|---|---|---|
| `MusePanel` | Un panel de operador: conexión BLE, UI, gráficas, envío WS. Dos instancias fijas P1/P2. | `soul-charger-admin.html` · `class MusePanel` (~L1100) | ⚠️ clavado en 2 | D7 |
| Constructor de paneles | Crea P1 (`127.0.0.1`) y P2 (`192.168.1.50`) con IP escrita en código | `soul-charger-admin.html:1772-1773` | ⚠️ | R2, D7 |
| Vista de participante | Un solo usuario. **Duplica** el pipeline del admin; sin botón Simulate | `soul-charger-app.html` (812 L) | ⚠️ duplicado | H7, R9 |
| Campo IP de destino | Editable, pero se sobrescribe en cada carga y no valida | `soul-charger-admin.html:1131` | ⚠️ no persiste | H6, R2 |

### 2 · Pipeline de señal (navegador)
| Componente | Qué hace | Ubicación | Estado | Ticket |
|---|---|---|---|---|
| Cálculo de bandas | `avgPower` → 4 pseudo-bandas `(avgPower·k) % 1.0` | `soul-charger-admin.html:1621-1627` · gemelo `app:731-736` | ⚠️ **no es FFT** | H1, R8 |
| Calm Score | Ratio `alpha/(beta+0.4·gamma+0.001)`, z-score, media móvil | `soul-charger-admin.html` (~L1390) | ⚠️ contenido inválido | H1, R11 |
| Ritmo cardíaco | `70 + (avgPower % 30)` — inventado, no PPG | `soul-charger-admin.html:1627` | ⚠️ **falso** | H2, R7 |
| `sensorActive` | `avgPower >= 1.0`; no mide contacto con la piel | `soul-charger-admin.html:1621` | ⚠️ | H8, R8 |
| Máquina de estados | `WARMUP → CALIBRATING → RUNNING`, loop 50 ms | `soul-charger-admin.html` | ✅ arquitectura correcta | — |
| Calibración / baseline | 300 muestras (≈15 s), media y desviación por participante | `soul-charger-admin.html` (`TARGET_CALIBRATION_SAMPLES`) | ✅ se conserva | R11 |
| Simulación | Señales sintéticas independientes (más realistas que el hardware) | `soul-charger-admin.html:1484-1512` | ✅ | H1, R3 |

### 3 · Transporte OSC (relay)
| Componente | Qué hace | Ubicación | Estado | Ticket |
|---|---|---|---|---|
| Relay WS→UDP | HTTP estático 5500 + WebSocket 3000 → OSC/UDP 8000 | `backend/server.js` (261 L) | ✅ | — |
| `UDPPort` por cliente | Un socket UDP por WebSocket; estado colgado de `ws` | `backend/server.js:82-88` | ✅ base de multi-panel | D7 |
| Empaquetado `/muse/data` | Arreglo de 18 floats; idx 14 (`heart_rate`) sale `0.0` | `backend/server.js:229` · diccionario `:71` | ⚠️ pulso ausente | H2, adr-0003 |
| Escudo de NaN | `safeFloat()` retiene el último valor sano por cliente | `backend/server.js:73-79` | ✅ **no romper** | — |
| Canal de entrada | Escucha `/unreal/end_session` en `localPort: 0` (efímero) | `backend/server.js:89-95, 120-128` | ⚠️ inalcanzable | H9, R10 |
| Guarda de ruta estática | Valida la ruta del servidor HTTP | `backend/server.js:28` | ✅ | — |
| Nombre de fichero PNG | Interpola `player`/`suffix` sin validar | `backend/server.js:140` | ⚠️ sanear al tocar | H5, R5 |

### 4 · Persistencia y research (navegador)
| Componente | Qué hace | Ubicación | Estado | Ticket |
|---|---|---|---|---|
| `seedDemoData()` | Fabrica 75 sesiones con media forzada a +7 %; se replanta al recargar | `soul-charger-admin.html:627-687, 1664-1672` | 🗑️ contamina | H3, R6 |
| `persistSession()` | Añade la sesión al mismo array que las sintéticas | `soul-charger-admin.html:1326-1336` | ⚠️ sin marcar origen | H3, R5 |
| `renderResearchView()` | Promedia sesiones (reales + sintéticas mezcladas) | `soul-charger-admin.html:704` | ⚠️ | H3 |
| Contador de usuarios | `soulcharger_users`: sube al conectar y al simular; poco fiable | `soul-charger-admin.html:1480, 1588` | ⚠️ | H3, R6 |
| Exportación PNG | Guarda gráficas como imagen (no hay tabla de texto) | `soul-charger-admin.html:1308` → `server.js:136-152` | 🚧 falta CSV | H5, R5 |

### 6 · Verificación (sondas) — `scratchpad/`
| Componente | Qué hace | Ubicación | Estado | Ticket |
|---|---|---|---|---|
| Lanzador de sondas | `npm run probe`: arranca un relay aislado (WS 3999 / HTTP 5599) y corre todas las sondas; sale ≠0 si alguna falla | `scratchpad/run-probes.js` | ✅ | R1 |
| `probe-osc` | Conduce el relay (inyecta `full_telemetry`) y valida el OSC emitido: direcciones, tipos, rangos. **Sabe fallar:** hoy en rojo por H2/contrato R4 | `scratchpad/probe-osc.js` | ✅ | R1 |
| Puerto del relay configurable | `RELAY_WS_PORT` / `RELAY_HTTP_PORT` (default 3000/5500) para arrancar un relay de test aislado | `backend/server.js:8, 45` | ✅ | R1 |

### 5 · Integración Unreal / motor gráfico
| Componente | Qué hace | Ubicación | Estado | Ticket |
|---|---|---|---|---|
| Blueprint receptor OSC | Lee los 18 floats por índice (`Get OSC Message Float At Index`) | **En el proyecto Unreal `VR_DigitalSanctuary`** (`BP_OSCReceiver`, `/Game/OSC/`) — no en este repo | ⚠️ sin inspeccionar | «Abierto» en NEXT, R4 |
| Integración nativa C++ | `SoulChargerBLE`, `SoulChargerBrainFlow`: vía alternativa, no la usa la app web | `hardware/Source/` (requiere SDK) | ⚪ sin decidir | Abierto |

---

## Deuda técnica y huecos detectados

| Asunto | Dónde | Por qué importa |
|---|---|---|
| Contenido de señal no válido | Pipeline §2 (H1, H2, H8) | El transporte funciona pero se envía algo que no mide lo que dice |
| Pipeline duplicado | admin + app (H7) | Cada arreglo se hace dos veces; una copia queda a medias |
| Research contaminado | §4 (H3) | El promedio de calma incluye 75 sesiones fabricadas |
| Sin detección de caída BLE | §2/§3 (H4) | Un corte congela el flujo con pinta de válido |
| Canal de entrada inalcanzable | §3 (H9) | Bloquea la bidireccionalidad confirmada por el director |

---

# Bloques de detalle

## Cálculo de bandas (⚠️ H1 — el más importante)
- **Propósito:** de las muestras EEG saca 4 bandas que alimentan el Calm Score.
- **Invariantes y trampas:** hoy **no hay FFT**; las 4 bandas son `avgPower` (amplitud media absoluta) × 4 constantes, plegado con `% 1.0`. Ignora el campo `electrode` (mezcla TP9/AF7/AF8/TP10). El `% 1.0` produce saltos de 0.99→0.00. La **simulación** sí genera 4 señales reales — no confundir su realismo con el del hardware.
- **Estado:** ⚠️ se reemplaza en R8 por FFT por canal. Lo retirado se archiva en `_backup/deprecated/`.

## Escudo de NaN (✅ no romper)
- **Propósito:** los micro-cortes de BLE producen `NaN`, que serializa a `null` y revienta a los oyentes OSC.
- **Invariantes y trampas:** `safeFloat()` (`server.js:73-79`) retiene el último valor sano **por cliente**. **Cualquier campo nuevo que se envíe por OSC debe pasar por aquí** (o su equivalente entero para `sensor_active`).
- **Estado:** ✅ estable. Base sobre la que se apoyan los campos nuevos de R4.

## Canal de entrada OSC (⚠️ H9)
- **Propósito:** recibir OSC desde Unreal/gafa y reenviarlo al navegador. Base de la bidireccionalidad (R10).
- **Invariantes y trampas:** el socket usa `localPort: 0` → puerto efímero que cambia en cada reconexión, así que la gafa no puede saber a dónde enviar. `/unreal/end_session` existe en el código pero **no se ha comprobado que llegue nunca**. `initUDP()` cierra y reabre el socket al reconfigurar la IP.
- **Estado:** ⚠️ inalcanzable hasta R10 (puerto fijo configurable + tabla de enrutado).
