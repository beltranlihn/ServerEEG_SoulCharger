# Decisiones de arquitectura (ADR)

Una ADR registra una decisión **cara o arriesgada de revertir**, con su contexto y sus consecuencias.

## Por qué

Sin registro, una decisión que costó una semana se deshace por descuido seis semanas después, porque quien la
toca —persona o asistente— sólo ve el código y no el motivo. La ADR es lo que convierte «esto está raro» en
«esto está así por esto».

## Reglas

- **Una ADR aceptada no se edita.** Si el criterio cambia, se escribe otra que la reemplaza y se anota en la
  antigua qué la sustituye.
- **Se numeran en orden** y no se reutilizan números.
- **Se escriben cuando la decisión se toma**, no al final del proyecto.
- **Cortas.** Una página. Si necesita más, el sitio es una investigación en `docs/historial/`.

## Cuándo escribir una

- Elegir o descartar una dependencia importante.
- Fijar un formato de datos o un contrato entre componentes.
- Aceptar deliberadamente una limitación (rendimiento, alcance, plataforma).
- Cualquier cosa que un revisor futuro podría tomar por un error.

## Índice

| # | Decisión | Estado |
|---|---|---|
| 0001 | {{título}} | Aceptada |
