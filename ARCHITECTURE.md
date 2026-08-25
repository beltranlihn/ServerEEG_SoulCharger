# Arquitectura — {{NOMBRE}}

Cómo funciona el sistema. El inventario de detalle está en `COMPONENTS.md`; el porqué de las decisiones, en
`docs/adr/`.

## 1. Panorama

{{QUE_ES_TECNICAMENTE}}

## 2. Componentes y frontera entre ellos

*Un diagrama sencillo, en texto, con las piezas y quién habla con quién. Si hay procesos separados o una
frontera de seguridad, dibujarla: es lo primero que necesita entender quien llegue.*

```
{{DIAGRAMA}}
```

## 3. Modelo de datos

*Las estructuras sobre las que trabaja todo lo demás. Leer esto antes que ninguna función.*

{{MODELO_DE_DATOS}}

## 4. Flujos principales

*Uno por cada recorrido que atraviesa el sistema entero. Para cada uno: qué lo dispara, por dónde pasa y dónde
termina.*

### {{FLUJO_1}}

## 5. Conceptos transversales

*Lo que aparece en muchos sitios y conviene entender una sola vez: gestión de estado, errores, concurrencia,
internacionalización, registro de actividad.*

## 6. Riesgos y deuda técnica

*Lo que se sabe frágil, con su motivo. Esta sección es tan valiosa como el resto: es lo que evita que alguien
«arregle» algo que está así a propósito, y lo que orienta la próxima refactorización.*

| Riesgo | Por qué existe | Qué lo mitigaría |
|---|---|---|

## 7. Glosario

*Los términos del dominio, definidos una vez.*
