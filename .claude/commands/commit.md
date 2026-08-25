---
description: Commit local de los cambios actuales (sin push)
---

Haz un commit local de los cambios actuales. **No hagas push.**

1. `git status` y `git diff --stat` para ver qué cambió.
2. **Comprobación previa:** ejecuta `{{CMD_SINTAXIS}}` y `{{CMD_PRUEBAS}}`. Si algo falla, **para y avisa**; no
   commitees por encima de una comprobación en rojo.
3. Actualiza `PLAN.md` con la entrada de la ronda, **lo más nuevo arriba**, incluyendo **qué se midió**.
4. **Anti-pudrición:** si el cambio añadió, movió, renombró o eliminó un componente, actualiza su fila en
   `COMPONENTS.md` **en este mismo commit**. Si se tomó una decisión cara o arriesgada de revertir, añade una
   ADR en `docs/adr/`.
5. **Archivar, no borrar:** si se retiró código, archívalo tal cual en `_backup/deprecated/` con su encabezado
   y añade la fila al índice de esa carpeta.
6. `git add -A` y crea el commit. El mensaje va en castellano neutro y explica **el porqué y el número que se
   midió**, no sólo el qué. Si el cambio corrige una creencia equivocada anterior, dilo.
7. Termina el mensaje con:
   ```
   Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
   ```
8. Informa del hash corto y un resumen de una línea.

**Aviso práctico:** si el mensaje lleva acentos graves o barras invertidas, escríbelo en un fichero y usa
`git commit -F`. Pasarlo en línea deja que el intérprete de órdenes se lo coma.

Argumentos opcionales (`$ARGUMENTS`): si el usuario pasa texto, úsalo como base del mensaje.
