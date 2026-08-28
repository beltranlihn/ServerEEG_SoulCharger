# ADR-0005 — Retirar el arreglo `/muse/data` y emitir sólo tres direcciones

- **Fecha:** 2026-08-28
- **Estado:** **Aceptada** · Reemplaza a ADR-0003

## Contexto

`ADR-0003` congeló el mensaje `/muse/data` en exactamente 18 floats porque el Blueprint de Unreal los leía por
índice con `Get OSC Message Float At Index`, y cualquier cambio de longitud provocaba fallos *out-of-bounds*.
Esa restricción condicionó el diseño durante meses: en `R4` las tres direcciones dedicadas
(`/muse/calm`, `/muse/heart_rate`, `/muse/sensor_active`) se añadieron **junto** al arreglo, no en su lugar,
precisamente para no romperlo.

El 2026-08-28, probando en TouchDesigner, el director preguntó qué eran `data14` y `data17` —los dos únicos
índices no cero— y al explicárselo respondió: *«Solo necesitamos sensor active, heart rate y calm, porque eso
es lo que utilizo en Unreal. El resto de datos los procesaremos por la app.»* Confirmó además que el Blueprint
**ya consume las direcciones con nombre**.

Con eso, la premisa de `ADR-0003` deja de ser cierta: el arreglo ya no tiene consumidor.

Medido en ese momento, con el sistema en marcha: de los 18 floats sólo dos eran distintos de cero —el índice
13 (Calm Score, idéntico a `/muse/calm`: ambos `0.375`) y el índice 16 (Bluetooth conectado)—. Los otros
dieciséis viajaban a `0.0` únicamente para preservar la longitud.

## Decisión

El relay emite **exactamente tres mensajes OSC** por tick, y ninguno más:

| Dirección | Tipo | Valor |
|---|---|---|
| `/muse/calm` | `f` | Índice de calma, `0.0`–`1.0` |
| `/muse/heart_rate` | `f` | Ritmo cardíaco en bpm |
| `/muse/sensor_active` | `i` | Sensor activo, `0` / `1` |

Se retiran `/muse/data` (18 floats) y `/muse/v2/calm` (legado previo a `R4`). El código retirado se archiva en
`_backup/deprecated/20260828-arreglo-osc-18-floats.js` con sus instrucciones de restauración.

Se poda además lo que sólo alimentaba al arreglo: giroscopio, acelerómetro, las cinco pseudo-bandas,
`calm_final` y `calib_completed`, tanto en el objeto `v` como en el diccionario del escudo de NaN, que queda
con las cinco claves que `safeFloat()` usa de verdad.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Mantener el arreglo indefinidamente por si acaso | Un contrato sin consumidor se pudre: nadie sabe si puede tocarlo. Ya generó confusión real —el director preguntando qué era `data14`— y consumía ancho de banda en cada tick |
| Mantenerlo marcado como obsoleto durante una transición | Se ofreció al director; respondió que Unreal ya está migrado. Una transición sin fecha de fin es un arreglo a medias |
| Retirar sólo los índices a cero y acortar el arreglo | Es exactamente lo que `ADR-0003` prohíbe, y sigue dejando un mensaje opaco leído por posición |

## Consecuencias

**A favor:**

- El contrato pasa de un arreglo opaco de 18 posiciones a tres mensajes con nombre y tipo correcto — el entero
  de `sensor_active` no cabía en un arreglo de floats.
- Cuatro mensajes por tick pasan a tres; a 60 Hz y con dos paneles son 240 datagramas por segundo menos.
- Desaparece la duplicidad: `data14` y `/muse/calm` llevaban el mismo número.
- El relay se simplifica: se van las variables muertas y el escudo de NaN queda con cinco claves en vez de
  diecinueve.

**En contra, y se asume:**

- **Cualquier instalación de Unreal o TouchDesigner que aún lea `/muse/data` deja de recibir datos.** No hay
  aviso ni degradación: sencillamente no llega nada a esa dirección. El director confirmó que la suya está
  migrada, pero **no se ha inspeccionado el Blueprint** desde este repositorio.
- El progreso de calibración y el estado del Bluetooth **dejan de salir por OSC**. Iban en los índices 15 y 16
  y no tienen dirección dedicada. Si algún día hacen falta en el motor, hay que añadirlas.
- Se pierde el hueco reservado para giroscopio, acelerómetro y bandas. Cuando `R8` produzca bandas reales
  habrá que decidir de nuevo cómo se transportan, en vez de tener sitio esperando.

## Cómo se revierte

Barato. Se restauran los dos bloques archivados en `_backup/deprecated/20260828-arreglo-osc-18-floats.js`
dentro del manejador de `full_telemetry`, junto con los índices del objeto `v` y las llamadas a `safeFloat()`
que documenta ese fichero. Del lado del motor hay que volver a leer por índice.

La sonda `probe-osc` exige hoy lo contrario —que `/muse/data` **no** se emita—, así que al revertir hay que
invertir también esas dos comprobaciones. Está verificado que las caza: ejecutada contra el código anterior
sale en rojo detectando cuatro direcciones en lugar de tres.
