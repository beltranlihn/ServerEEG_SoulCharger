---
name: arch-map
description: Navegar y mantener el mapa de arquitectura de Soul Charger. Usar ANTES de buscar en el código para localizar cualquier componente, función, identificador o flujo — y DESPUÉS de cambiar código para mantener el mapa sincronizado. Cubre COMPONENTS.md (inventario), ARCHITECTURE.md (cómo funciona) y docs/adr/ (por qué se decidió).
user-invocable: true
argument-hint: "[find <cosa> | update <subsistema> | adr <decisión>]"
---

# arch-map — mapa vivo de Soul Charger

**No re-escanear el código entero para localizar algo.** El mapa ya existe:

- **`COMPONENTS.md`** — inventario: cada componente con `archivo · función`, estado y ticket. Índice maestro
  arriba, bloques de detalle abajo.
- **`ARCHITECTURE.md`** — el relato: componentes, flujos, conceptos transversales, riesgos y deuda, glosario.
- **`docs/adr/`** — las decisiones y su porqué.
- **`PLAN.md`** — bitácora por ronda, lo más nuevo arriba.

## Para LOCALIZAR algo, antes de buscar en el código

1. Abrir `COMPONENTS.md` y buscar el subsistema en el índice maestro.
2. La fila da `archivo · función`. Ir directo, leyendo sólo ese tramo.
3. Si hace falta el *porqué* o el *flujo*: bloque de detalle → `ARCHITECTURE.md` → `docs/adr/`.
4. **Si el mapa no lo tiene**, delegar la búsqueda al subagente `arch-explorer`, que busca en su propio
   contexto y devuelve sólo `archivo:línea`. Al encontrarlo, **añadir la fila que faltaba a
   `COMPONENTS.md`**.

## Para MANTENER el mapa (regla anti-pudrición)

Al cambiar código:

- Actualizar su fila en `COMPONENTS.md` — ubicación, estado, ticket — **en el mismo commit** que el código.
- Si se retiró código, **archivar, no borrar**: copiarlo tal cual a `_backup/deprecated/` con su encabezado
  (origen, motivo, cómo restaurar) y añadir la fila al índice de esa carpeta.
- Si se tomó una decisión cara o arriesgada de revertir, escribir una **ADR nueva**. Una ADR aceptada no se
  edita: se escribe otra que la reemplaza.
- Mantener el mapa **mínimo y podado**. Una documentación pequeña y fresca vale más que una grande y vieja.

## Estados

✅ estable · 🚧 en progreso o parcial · ⚠️ frágil · 🗑️ obsoleto · 🗄️ archivado.

## Precisión

Los números de línea orientan; **verificar el símbolo por búsqueda**, no confiar sólo en el número.
