# Código retirado

**Se archiva, no se borra.** Cada fichero conserva el bloque original tal cual, con un encabezado que dice de
dónde salió, por qué se retiró y cómo restaurarlo.

Cuesta un minuto y evita la arqueología en el historial cuando alguien pregunta por qué desapareció algo — o
cuando resulta que hacía falta.

**Nombre del fichero:** `AAAAMMDD-descripcion-corta.ext`

**Encabezado obligatorio:**

```
/* RETIRADO {{AAAA-MM-DD}} — ronda {{R##}}
   ORIGEN:     {{fichero}} · {{función}}
   MOTIVO:     {{por qué dejó de hacer falta, o qué lo sustituye}}
   RESTAURAR:  {{qué habría que rehacer para volver a activarlo}} */
```

## Índice

| Fichero | Qué era | Retirado en |
|---|---|---|
