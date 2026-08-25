# ADR-0003 — El arreglo OSC `/muse/data` tiene longitud congelada de 18 floats

- **Fecha:** 2026-08-25
- **Estado:** **Aceptada**

## Contexto

La telemetría principal viaja a Unreal en un solo mensaje OSC, `/muse/data`, como un arreglo de **exactamente 18 floats**. El Blueprint de Unreal los lee por posición con `Get OSC Message Float At Index`. Sólo cuatro índices llevan dato (13 = Calm Score, 15 = progreso de calibración, 16 = BT conectado, 17 = BT desconectado); los otros catorce se envían como `0.0` a propósito. Cambiar la longitud del arreglo provoca lecturas *out-of-bounds* en el Blueprint y rompe la instalación.

El Blueprint vive en el proyecto Unreal **`VR_DigitalSanctuary`** (`BP_OSCReceiver`, `/Game/OSC/`), un repositorio distinto, y **no se ha inspeccionado** en esta revisión: el contrato se conoce por el código del relay, no por el Blueprint. Confirmarlo abriendo el Blueprint es tarea previa a R4.

## Decisión

La longitud de `/muse/data` **se mantiene en 18 floats**. Los valores nuevos que pida el director (pulso, estado del sensor) **no** se añaden alargando este arreglo: se transportan por **direcciones OSC nuevas y dedicadas** (`/muse/calm`, `/muse/heart_rate` con tipo `f`, `/muse/sensor_active` con tipo `i`), decidido en R4 / D1.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Ampliar el arreglo a más floats | **Rompe Unreal** (out-of-bounds). Sólo con orden expresa y reajuste del Blueprint |
| Ocupar los huecos `0.0` existentes (idx 14 para pulso) | No permite el tipo `Integer`; el arreglo sigue siendo opaco y frágil |
| Direcciones nuevas dedicadas *(elegida)* | Tipos correctos, nombres legibles, `/muse/data` intacto. Coste: añadir nodos al Blueprint |

## Consecuencias

**A favor:** la instalación existente sigue funcionando sin tocar Unreal; los datos nuevos llegan con su tipo correcto y un nombre legible; `/muse/data` queda estable como contrato heredado.

**En contra, y se asume:** hay que añadir nodos nuevos en el Blueprint de Unreal para leer las direcciones nuevas, y probarlo **contra Unreal**, no sólo contra la sonda. Mientras tanto conviven un mensaje opaco heredado (18 floats) y direcciones nuevas legibles.

## Cómo se revierte

La longitud congelada no se revierte: es un contrato con un consumidor externo (el Blueprint). Si algún día se rehace el lado de Unreal, se escribiría un ADR nuevo que reemplace a este y defina el contrato desde cero.
