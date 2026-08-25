# {{NOMBRE}}

{{DESCRIPCION_EN_DOS_FRASES}}

{{TECNOLOGIA}} · versión {{VERSION}} · {{ORGANIZACION}}

---

## Qué hay en cada sitio

### Código

| Ruta | Qué es |
|---|---|
| `{{RUTA}}` | {{QUE_ES}} |

### Documentación

| Ruta | Qué es |
|---|---|
| **`docs/ESTRUCTURA-DEL-CODIGO.md`** | **Por dónde empezar a leer el código.** |
| `ARCHITECTURE.md` | Cómo funciona: componentes, flujos, conceptos transversales. |
| `COMPONENTS.md` | Inventario componente a componente. |
| `PLAN.md` | Bitácora por rondas: cada cambio con su motivo y sus mediciones. |
| `CLAUDE.md` | Contrato del proyecto: convenciones, comandos, gotchas. |
| `docs/adr/` | Decisiones de diseño con su porqué. |
| `docs/NEXT.md` | Cola de trabajo pendiente. |
| `docs/historial/` | Documentos cerrados. Contexto, no referencia. |

### Carpetas de trabajo

| Ruta | Qué es |
|---|---|
| `scratchpad/` | Sondas de verificación. Sus volcados se regeneran y no se versionan. |
| `_backup/deprecated/` | Código retirado, con fecha. Se archiva en vez de borrarse. |

---

## Comandos

```bash
{{CMD_EJECUTAR}}     # ejecutar
{{CMD_COMPILAR}}     # compilar o empaquetar
{{CMD_PRUEBAS}}      # pruebas y sondas
{{CMD_ENTREGA}}      # entrega, con verificación
```

---

## Para revisar el código por primera vez

Leer `docs/ESTRUCTURA-DEL-CODIGO.md`. Describe el orden del repositorio y, lo que más tiempo ahorra, las
**trampas conocidas**: las cosas que parecen errores y son intencionadas.
