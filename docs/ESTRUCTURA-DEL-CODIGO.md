# Estructura del código — {{NOMBRE}}

Guía de orientación para leer este repositorio por primera vez. Describe **qué hay, dónde está y en qué orden
leerlo**.

*Este documento es la capa de ORDEN DE LECTURA. El inventario de detalle está en `COMPONENTS.md` y el
funcionamiento en `ARCHITECTURE.md`; aquí se responde a «por dónde empiezo».*

## 1. Panorama

{{Qué es técnicamente, y la tabla de ficheros con su tamaño y su contenido.}}

| Fichero | Líneas | Contenido |
|---|---:|---|

## 2. Componentes y la frontera entre ellos

{{Los procesos o módulos y qué API los separa.}}

## 3. El modelo de datos

{{Las estructuras principales. Leer esto antes que ninguna función.}}

## 4. Recorrido del código en orden de lectura

{{Los tramos, en el orden en que conviene leerlos, con sus puntos de entrada.}}

| Ubicación | Bloque | Puntos de entrada |
|---|---|---|

## 5. Los flujos principales

{{Un esquema por flujo, mostrando la cadena de llamadas.}}

## 6. Empaquetado y entrega

## 7. Convenciones del código

- **Idioma:** comentarios y documentación en castellano; identificadores y textos de interfaz en inglés.
- **Marcas de ronda:** los comentarios llevan `[R##]`, que remite a la entrada de `PLAN.md`. Es el historial de
  por qué una línea es como es.
- **Archivar, no borrar:** el código retirado va a `_backup/deprecated/`.
- **Verificación:** {{cómo se ejecutan las sondas y las pruebas}}.

## 8. Trampas conocidas

*Lo que parece un error y no lo es. Un revisor que lea esto se ahorra medio día.*

| Asunto | Qué hay que saber |
|---|---|

## 9. Por dónde empezar a leer

1. `docs/adr/` completo.
2. `ARCHITECTURE.md`.
3. {{el modelo de datos, con su ubicación}}.
4. {{el bucle o punto de entrada principal}}.
5. `COMPONENTS.md` para localizar cualquier otra cosa sin volver a escanear el código.
