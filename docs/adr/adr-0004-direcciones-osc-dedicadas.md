# ADR-0004 — Los valores nuevos viajan por direcciones OSC dedicadas

- **Fecha:** 2026-08-30
- **Estado:** **Aceptada**

## Contexto

El director pide enviar tres valores al motor gráfico: **índice de calma** (float 0–1), **ritmo cardíaco** (float) y **estado del sensor** (entero 0/1). El transporte actual, el arreglo `/muse/data` de 18 floats, está congelado por el Blueprint de Unreal (ADR `adr-0003`): no se puede alargar, y sólo admite el tipo `float`, así que no puede llevar el entero del estado del sensor con su tipo correcto. La librería `osc` que usa el relay **sí** soporta el tipo entero (`i`).

La decisión D1 del análisis (`docs/historial/2026-08-25-analisis-para-traspaso.md`, §4) plantea tres opciones. Ésta es su recomendación.

## Decisión

Los tres valores nuevos viajan por **direcciones OSC dedicadas**, además del arreglo heredado que se mantiene intacto:

- `/muse/calm` — `f`, rango 0–1 (duplica el idx 13 del arreglo con un nombre legible).
- `/muse/heart_rate` — `f`, en bpm.
- `/muse/sensor_active` — `i`, 0/1.

Los tres pasan por el escudo de NaN (`safeFloat` para los floats; para el entero, coerción a 0/1). El arreglo `/muse/data` **no se toca**: sigue con sus 18 floats para no romper la instalación existente.

**Nomenclatura.** Las salientes conservan el prefijo `/muse/` del contrato heredado, sin identificador de panel: cada panel ya envía a **su propia IP de destino** (un `UDPPort` por cliente), así que el destino desambigua sin necesidad de prefijo. El identificador de panel (`/soul/p{n}/...`) se reserva para el **canal de entrada** (R10, ADR de D6), donde sí hace falta distinguir de qué gafa viene un mensaje.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Alargar el arreglo de 18 floats | Rompe Unreal (out-of-bounds), y sigue sin permitir el tipo entero (`adr-0003`) |
| Ocupar el hueco idx 14 para el pulso | No permite `Integer`; el arreglo sigue opaco; no da nombre legible al dato |

## Consecuencias

**A favor:** cada valor llega con su tipo correcto y un nombre legible; `/muse/data` intacto (la instalación existente no se toca); fácil de leer y depurar en TouchDesigner/Unreal por dirección.

**En contra, y se asume:** hay que **añadir nodos nuevos en el Blueprint de Unreal** para leer las tres direcciones, y **probarlo contra Unreal**, no sólo contra la sonda. Conviven un mensaje opaco heredado y direcciones nuevas. El **valor** del pulso sigue siendo inválido hasta R7 (H2) y el del estado del sensor hasta R3/R8 (H4/H8): esta ADR fija el **transporte**, no la validez del contenido.

## Cómo se revierte

Quitar los tres `send` del relay y sus nodos en Unreal. Barato mientras nadie dependa de las direcciones nuevas; una vez la instalación las use, retirarlas es romper el contrato con la gafa, y requeriría un ADR que reemplace a éste.
