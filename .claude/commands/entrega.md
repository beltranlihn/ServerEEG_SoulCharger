---
description: Compila, verifica y entrega
---

Compila, **verifica la entrega** y publica. Sólo se ejecuta cuando el usuario lo pide.

1. **Comprobar antes de compilar:** `{{CMD_SINTAXIS}}` y `{{CMD_PRUEBAS}}`. Si falla, para y avisa.
2. **Commit local** de lo pendiente si el árbol no está limpio (ver `/commit`).
3. **Compilar:** `{{CMD_COMPILAR}}`.
4. **Entregar y VERIFICAR:** `{{CMD_ENTREGA}}`.

   > **Un despliegue sin comprobar no está hecho: está supuesto.** El guion tiene que comparar lo entregado
   > con lo compilado —hash, tamaño, relectura— y **salir con error** si no coincide. Un comando de copia que
   > devuelve éxito no demuestra que la copia haya ocurrido.

5. **Publicar:** `git push`.
6. Informa de: hash del commit, resultado de la verificación de la entrega y confirmación del push.

Argumentos opcionales (`$ARGUMENTS`): «sin push» o «sólo compilar» ajustan los pasos.
