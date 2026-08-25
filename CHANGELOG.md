# Changelog del Proyecto

Historial de cambios técnicos importantes para tener un registro trazable de las modificaciones realizadas.

## [2026-05-11] - Reset de calibProgress + Modo claro (macOS pastel)

### Añadido
- **Reset automático de `calibProgress`** (idx 16 / `/muse/data16`):
  - Tras completar la calibración (transición a `RUNNING`), el valor enviado por OSC se mantiene en `1.0` durante **5 segundos** y luego cae a `0.0` para el resto de la sesión.
  - Implementado en `soul-charger-app.html` y `soul-charger-admin.html` (ambos paneles P1/P2 con timers independientes por instancia).
  - Se limpia al reconectar o desconectar para no arrastrar estado entre sesiones.
- **Modo claro tipo macOS** en `soul-charger-admin.html`:
  - Botón toggle `☾ / ☀` en la topbar (junto al contador de Users).
  - Paleta pastel: fondo `#F4F4F7` con gradientes radiales rosa/azul, accent `#6B8AFE`, texto `#1D1D1F` / `#6E6E73`.
  - Persiste preferencia en `localStorage` (`soulcharger_theme`).
  - Aplica a topbar, overlays (Research, Deep Analysis), dev panels, chart cards, inputs y badges.

## [2024-05-08] - Optimización y Reparación de la Trama OSC

### Cambiado
- **Servidor Node.js (`backend/server.js`)**: 
  - Se optimizó el envío de datos mediante OSC (`/muse/data`) silenciando métricas irrelevantes. 
  - Se sustituyeron las variables del arreglo monolítico que enviaban los sensores inerciales y de ondas puras por `0.0`.
  - **CRÍTICO:** Se restauró y forzó la longitud de la matriz OSC a exactamente **18 elementos** flotantes. Se documentó que este tamaño es rígido para evitar romper el flujo de Blueprint en Unreal Engine.
  - Se respetaron estrictamente los índices históricos solicitados por el lado de Unreal:
    - Índice 13: `calm_state`
    - Índice 15: `calib_progress`
    - Índice 17: `calib_completed`

### Solucionado
- **Bug Fix**: Corrección de un problema provocado por acortar la longitud del arreglo OSC a 3 elementos. Esto provocaba que en Unreal Engine, el nodo `Get OSC Message Float At Index` arrojara valores de `0.0` fijos al consultar índices que ya no existían en el arreglo (como el índice 15). Al devolver el arreglo a su tamaño original de 18 elementos, Blueprint pudo volver a leer los floats exitosamente.
