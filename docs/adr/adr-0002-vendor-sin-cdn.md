# ADR-0002 — Las dependencias se sirven en local, sin CDN

- **Fecha:** 2026-08-25
- **Estado:** **Aceptada**

## Contexto

Soul Charger se instala en **eventos y exhibiciones**, donde la conexión a internet no es fiable o no existe. Todas las dependencias del frontend —`chart.umd.min.js` (Chart.js), `muse-js.bundle.js` (cliente Web Bluetooth) y las tipografías— tienen que estar disponibles sin red. La versión antigua del frontend (`frontend/src/`, ya retirada) dependía de CDN, y fue una de las razones para retirarla.

## Decisión

Todo lo externo vive en **`vendor/`** y se sirve desde el propio relay (`backend/server.js`, HTTP estático en 5500). **No se reintroduce ningún CDN** ni carga remota en los HTML.

## Alternativas consideradas

| Alternativa | Por qué se descartó |
|---|---|
| CDN (unpkg, jsDelivr) | Falla sin internet; la instalación se cuelga en un evento sin red |
| Gestor de paquetes + bundler | Añade build a un proyecto que a propósito no tiene ninguno; complica la edición-recarga |

## Consecuencias

**A favor:** la instalación funciona 100 % offline; edición directa y recarga, sin paso de build; versiones de dependencia congeladas y auditables en el repo.

**En contra, y se asume:** actualizar una dependencia es manual (descargar el bundle y reemplazar el fichero en `vendor/`); no hay resolución automática de versiones ni de vulnerabilidades. Para el tamaño del proyecto es un coste menor frente a la garantía de funcionar sin red.

## Cómo se revierte

Reintroducir un CDN es trivial técnicamente, pero rompería el requisito de operar sin conexión. No revertir sin confirmar que toda instalación futura tendrá internet estable.
