# ADR-0006 — Dos señales separadas: quietud física (agencia) e índice de calma (estado)

- **Fecha:** 2026-08-28
- **Estado:** **Aceptada**

## Contexto

El director pidió una señal «más real time», recordando una instalación anterior en la que enviaba las
señales normalizadas de la aplicación de Muse y **una persona podía achicar una esfera relajándose y
agrandarla al desconcentrarse**, con sensación de control inmediata.

Al reconstruir qué ocurría allí, la explicación más probable la aportó él mismo: *«el relajo hacía que las
ondas bajaran, me imagino que por menos ruido»*. Si al relajarse bajaban **todas** las bandas a la vez, no es
un fenómeno cortical —el alfa habría subido mientras el resto bajaba—, sino la caída del nivel general de
señal, que en una diadema seca está dominado por **músculo**: mandíbula, frente, cuello y movimiento ocular.

Eso no es un error de medición. Relajar la musculatura es parte de relajarse, y esa señal tiene tres
propiedades que el índice de calma no tiene: es enorme frente al fondo, es inmediata y funciona con cualquier
persona sin entrenamiento.

Pero tiene requisitos **opuestos** a los del índice de calma, y ahí está el problema:

| | **Agencia** — «yo muevo esto» | **Estado** — «esto refleja cómo estoy» |
|---|---|---|
| Latencia tolerable | menos de ~200–300 ms | segundos; conviene que no tiemble |
| Ventana | ninguna, muestra a muestra | 2 s con solape, más suavizado |
| Frente al artefacto muscular | **responde gracias a él** | **lo rechaza** |
| Hay que poder defenderla en un informe | no hace falta | obligatorio |

## Decisión

Se emiten **dos señales distintas, con dos nombres distintos**, calculadas por rutas independientes:

| Dirección OSC | Qué mide | Ruta |
|---|---|---|
| `/muse/stillness` | **Quietud física**: relajación muscular | Amplitud media de **AF7/AF8**, alisada con constante de 120 ms, normalizada contra el baseline del participante e **invertida** |
| `/muse/calm` | **Estado de calma**: el índice de investigación | Ratio de bandas → z-score → media móvil de 5,75 s |

La quietud **no pasa por la media móvil** del índice de calma: tiene ruta propia desde la suscripción de EEG
hasta el envío. Se usan los canales **frontales**, que para el índice de calma son los peores por
contaminarse de músculo y para esto son los mejores por exactamente la misma razón.

Se conserva la arquitectura de calibración: la quietud calcula su propio baseline (media y desviación de la
amplitud frontal) durante el mismo tramo de `CALIBRATING`. Mientras no exista baseline se emite `0.5` neutro,
no un número inventado.

**Se llaman por su nombre.** «Quietud física», no «calma». Nombrar la señal por lo que mide es lo que impide
que un tramo de tensión mandibular acabe contado como relajación en el registro de investigación.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| Un solo número, más reactivo | Es la trampa central: el índice de calma **rechaza** el artefacto muscular y la quietud responde **gracias** a él. Al mejorar la validez, la esfera se quedaría muerta; al hacerla responder, el registro se llenaría de tensión etiquetada como calma |
| Bajar el suavizado del índice de calma | Lo haría más nervioso sin hacerlo más controlable: la fuente sólo se actualiza a ~21 Hz y el contenido sigue siendo el de H1 |
| Usar la amplitud de los cuatro canales | Los frontales llevan la señal muscular; los posteriores la diluyen. Mezclarlos empeora justo lo que aquí interesa |
| Esperar a R12 (el experimento del círculo) | R12 dirá **qué** correlaciona con la intención, y es información valiosa. Pero la quietud es útil como capa de agencia sea cual sea el resultado, y el director la pidió ahora |

## Consecuencias

**A favor:**

- La esfera puede sentirse viva desde el primer segundo sin comprometer el dato de investigación.
- La quietud llega con la cadencia de los paquetes de EEG (~47 ms), muy por debajo del umbral de ~200–300 ms
  en que se pierde la sensación de control.
- Al estar separadas, arreglar el índice de calma en `R8` no toca la experiencia, y ajustar la experiencia no
  contamina el registro.
- `avgPower` deja de ser sólo la materia prima de las pseudo-bandas de `H1` y pasa a tener un uso honesto y
  declarado.

**En contra, y se asume:**

- **Son cuatro mensajes OSC por tick en vez de tres**, a 60 Hz y por panel.
- La quietud **no mide calma cerebral**, y presentarla como tal sería exactamente el error que esta ADR
  intenta impedir. Todo lo que se construya sobre ella —visual o narrativa— tiene que asumirlo.
- **No está medido que responda a la *intención***. Que se mueva con la tensión muscular es seguro; que la
  persona pueda dirigirla a voluntad de forma fiable es la pregunta que responde `R12`, y hasta entonces se
  queda sin verificar.
- El baseline depende de que el participante esté razonablemente quieto durante la calibración. Si calibra
  apretando la mandíbula, su «cero» queda alto y perderá recorrido hacia abajo.

## Cómo se revierte

Barato y aislado: la quietud vive en su propia ruta. Basta con dejar de enviar `/muse/stillness` en el relay y
retirar el bloque de cálculo de los dos ficheros del frontend; nada del índice de calma depende de ella. La
sonda `probe-osc` exige hoy cuatro direcciones y que quietud y calma **no** sean el mismo número, así que al
revertir hay que ajustar esas comprobaciones.
