# {{NOMBRE}} — contrato del proyecto (leer siempre)

{{DESCRIPCION_EN_DOS_FRASES}} — {{TECNOLOGIA}}. Director creativo: {{DIRECTOR}}; desarrollador: Claude.

## 🗺️ Para ubicar cualquier cosa — LEER PRIMERO
Antes de re-escanear el código, consultar el **mapa vivo** (evita quemar contexto):
- **`COMPONENTS.md`** = inventario de referencia: cada componente con `archivo · función` · estado · ticket.
- **`ARCHITECTURE.md`** = cómo funciona (flujos, conceptos transversales, riesgos y deuda).
- **`docs/adr/`** = por qué (decisiones inmutables). · Skill **`arch-map`** = navegar y mantener el mapa.
  Subagente **`arch-explorer`** = búsqueda aislada que devuelve `archivo:línea`.
- **Anti-pudrición:** al cambiar código, actualizar la fila de `COMPONENTS.md` **en el mismo commit**.
- **`docs/NEXT.md`** = cola de trabajo activa; tachar a medida que se cierra.

## Al cerrar CADA ronda: `/code-review`
No cada tres o cuatro: **cada una**. La mayor fuente de defectos son los arreglos anteriores a medias, y
anotarlo no basta para evitar el siguiente. Junto con la revisión, las dos preguntas que más fallos cazan:
1. **¿La sonda mide la CONCLUSIÓN o sólo la premisa?**
2. **¿Sabe fallar?** Reconstruir el estado anterior al arreglo y exigir que la sonda lo cace.

El método completo, con el motivo de cada regla, está en `METODO.md`.

## Convenciones (obligatorias)
- **Idioma:** chat y documentación en **castellano neutro — PROHIBIDO el voseo y los argentinismos**.
  Identificadores y textos de interfaz en **inglés**.
- **Archivar, no borrar:** el código retirado va a `_backup/deprecated/` con fecha, origen y motivo.
- **Acciones destructivas** (borrar o mover ficheros del usuario, reinstalar): confirmar o dejar copia, salvo
  petición explícita.
- **Comentarios:** ninguno con una afirmación sin comprobar.
- {{RESTRICCIONES}}

## Comandos
- **Ejecutar:** `{{CMD_EJECUTAR}}`
- **Compilar / empaquetar:** `{{CMD_COMPILAR}}`
- **Comprobación rápida de sintaxis:** `{{CMD_SINTAXIS}}`
- **Pruebas y sondas:** `{{CMD_PRUEBAS}}`

## Entrega
> **Un despliegue sin comprobar no está hecho: está supuesto.** El guion de entrega tiene que **verificar el
> resultado** (hash, relectura, recuento) y salir con error si no cuadra.

`{{CMD_ENTREGA}}`

## Datos clave
- **Formato de datos / extensión:** {{FORMATO}}
- **Identificador de la aplicación:** {{APPID}}
- **Dependencias de ejecución:** {{DEPENDENCIAS}}

## Arquitectura en pocas líneas
{{RESUMEN_ARQUITECTURA}}

## Gotchas (no repetir errores)
*Esta sección empieza vacía y crece. Cada entrada sale de un fallo real: qué parecía, qué era, y cómo se
detecta. Es lo que más tiempo ahorra a quien llegue después.*

## Docs del repo
- **`README.md`** = índice del repositorio: qué hay en cada carpeta. Es la puerta de entrada.
- **`docs/ESTRUCTURA-DEL-CODIGO.md`** = guía de ORDEN DE LECTURA del código.
- **`PLAN.md`** = bitácora por rondas (lo más nuevo arriba). Una entrada por sesión.
- **`docs/historial/`** = auditorías, investigaciones y propuestas ya cerradas.
- **Higiene de la carpeta:** la raíz sólo lleva código, el manifiesto del proyecto y los documentos vivos. Lo
  cerrado va a `docs/historial/`. Los volcados de las sondas no se versionan.
