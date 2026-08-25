# El método

Reglas de trabajo destiladas de un año de desarrollo. Cada una nació de un fallo concreto, y ese fallo está
anotado: sin el motivo, una regla se salta en cuanto incomoda.

---

## 1. El ciclo de una ronda

Una **ronda** es una unidad de trabajo: uno o varios arreglos que se cierran juntos. El ciclo siempre es el
mismo.

1. **Tomar el trabajo de la cola** (`docs/NEXT.md`), o del encargo del director.
2. **Localizar** con el mapa (`COMPONENTS.md`), no releyendo el código entero.
3. **Escribir el cambio.**
4. **Verificarlo con una sonda** que mida el comportamiento, no la intención.
5. **Cerrar con revisión** (`/code-review`). Siempre. Ver la regla 3.
6. **Confirmar en un commit** cuyo mensaje explique **por qué** y **qué se midió**.
7. **Actualizar el mapa** (`COMPONENTS.md`) y la bitácora (`PLAN.md`) en ese mismo commit.

---

## 2. Verificar: las dos preguntas que más fallos han cazado

### ¿La sonda mide la CONCLUSIÓN o sólo la premisa?

Una sonda comprobaba que cierta tabla de datos **se leía**. Pasaba. El arreglo llevaba dos rondas dado por
bueno y no hacía nada: leer la tabla era la premisa, y la conclusión — que el fotograma entregado fuese el
correcto — nunca se midió.

> Antes de dar un arreglo por bueno: ¿lo que mide la sonda es exactamente lo que el usuario notaría si el
> arreglo faltara?

### ¿Sabe fallar?

Una red que no se ha visto en rojo no prueba nada. **Reconstruir el estado anterior al arreglo y exigir que la
sonda lo cace.** Si con el código viejo también pasa, la sonda no vale.

### Corolarios

- **Comparar dos implementaciones no verifica ninguna.** Si las dos comparten el error, coinciden. Hace falta
  un criterio independiente del código que se juzga.
- **Una hipótesis escrita en la cola no es un hecho.** Al retomarla, vuelve a verificarse.
- **Lo que se anota como «no verificable» se pudre protegido.** Si algo no se puede medir, se dice así en el
  informe y se deja abierto, en vez de darlo por cerrado.
- **El material que se fabrica y no se mira esconde fallos.** Si el proceso genera un fichero, hay que abrirlo.

---

## 3. La revisión cierra CADA ronda

No cada tres o cuatro: **cada una**.

El motivo es medido: tres revisiones consecutivas encontraron que la mayoría de lo que había que arreglar eran
**correcciones anteriores a medias**. Anotarlo en la memoria no bastó para evitar la siguiente. Un arreglo
inerte documentado como cerrado sale mucho más caro que revisar al cerrar: una corrección vivió dos rondas sin
hacer nada, y un centinela dejado a medias llegó a producción convertido en regresión.

---

## 4. Reglas de arreglar sin romper

- **Un arreglo que cubre un caso de la familia está empezado, no hecho.** Al corregir algo, buscar los
  gemelos: los otros sitios con la misma forma. Verificar por reversión sólo prueba el caso probado.
- **Poner la decisión donde vive**, en vez de replicar guardas en cada llamador. Las guardas replicadas se
  desincronizan.
- **Dos guardas escritas sobre la misma propiedad se anulan**, y el fallo sale **mudo** cuando el estado roto
  se parece al normal.
- **Cambiar un centinela a medias deja una regresión, no un arreglo inerte.** Si se toca una comprobación, se
  termina.
- **Ningún comentario con una afirmación sin comprobar.** Un comentario que afirma algo falso es peor que
  ninguno: se cita como fuente.
- **Una lista de pendientes envejece como un comentario.** Se poda o miente.

---

## 5. Lo que se entrega, se comprueba

**Un despliegue sin comprobar no está hecho: está supuesto.** En este proyecto, una instalación estuvo días
corriendo una versión vieja mientras el despliegue se daba por bueno, porque el comando de copia devolvía éxito
sin que la copia hubiese ocurrido.

Regla general: **si un paso puede fallar en silencio, el guion que lo ejecuta tiene que verificar el
resultado** — comparando un hash, releyendo el fichero, contando las filas. Y salir con error si no cuadra.

---

## 6. Archivar, no borrar

El código retirado se copia a `_backup/deprecated/` con fecha, origen y motivo, y se anota en el índice de esa
carpeta. Cuesta un minuto y evita la arqueología en el historial cuando alguien pregunta por qué desapareció
algo.

---

## 7. El mapa no se pudre

**Al cambiar código, se actualiza su fila en `COMPONENTS.md` en el mismo commit.** Un mapa desactualizado es
peor que no tenerlo: se consulta con confianza y manda a un sitio equivocado.

El mapa se mantiene **mínimo y podado**. Una documentación pequeña y fresca vale más que una grande y vieja.

---

## 8. Decisiones: ADR

Una decisión **cara o arriesgada de revertir** se escribe como ADR en `docs/adr/`: contexto, decisión,
consecuencias. Una ADR aceptada **no se edita**; si cambia el criterio, se escribe otra que la reemplaza.

Sirve para lo mismo en todos los proyectos: impedir que dentro de seis semanas alguien —persona o asistente—
deshaga por descuido algo que costó una semana decidir.

---

## 9. Cómo se informa

- **Decir lo que se midió, con el número.** «Mejora la nitidez» no es un resultado; «18,66 → 20,92, un +12,1 %»
  sí lo es.
- **Si algo falla, se dice, con la salida.** Si un paso se saltó, se dice.
- **Corregirse en cuanto se detecta un error propio**, sin dramatizar y sin repasar la equivocación.
- **No dar por hecho lo que no se ha comprobado.** «Debería funcionar» no es un informe.

---

## 10. Comunicación con el director creativo

- El director decide **qué** y **por qué**; el desarrollador decide **cómo**, y avisa cuando el cómo cambia el
  qué.
- **Una objeción se dice una vez, con su motivo.** Si el director la mantiene, se ejecuta el encargo completo.
- **Reducir el alcance no es decisión del desarrollador.** Si algo se queda fuera, se dice explícitamente.
