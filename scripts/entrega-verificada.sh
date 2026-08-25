#!/usr/bin/env bash
# Plantilla de guion de entrega. Lo importante no es copiar: es COMPROBAR.
#
# Un comando de copia que devuelve éxito no demuestra que la copia haya ocurrido — sobre todo si se lanza
# elevado, en segundo plano o a través de otro proceso. En el proyecto anterior, una instalación estuvo días
# corriendo una versión vieja mientras la entrega se daba por buena por ese motivo.
#
# Regla: si un paso puede fallar en silencio, este guion lo verifica y SALE CON ERROR si no cuadra.
set -euo pipefail

ORIGEN="{{RUTA_ORIGEN}}"
DESTINOS=( "{{RUTA_DESTINO_1}}" "{{RUTA_DESTINO_2}}" )

[ -f "$ORIGEN" ] || { echo "ERROR: no existe el origen: $ORIGEN" >&2; exit 1; }
REF=$(sha1sum "$ORIGEN" | cut -d' ' -f1)
echo "origen  $REF  $ORIGEN"

fallos=0
for D in "${DESTINOS[@]}"; do
  mkdir -p "$(dirname "$D")"
  cp -f "$ORIGEN" "$D"
  # La comprobación NO es el código de salida de la copia: es releer el destino y comparar.
  if [ ! -f "$D" ]; then
    echo "  FALLO  $D  (no se escribió)" >&2; fallos=$((fallos+1)); continue
  fi
  GOT=$(sha1sum "$D" | cut -d' ' -f1)
  if [ "$GOT" != "$REF" ]; then
    echo "  FALLO  $D  ($GOT)" >&2; fallos=$((fallos+1))
  else
    echo "  ok     $D"
  fi
done

if [ "$fallos" -ne 0 ]; then
  echo "*** $fallos destino(s) sin verificar: la entrega NO está hecha" >&2
  exit 1
fi
echo "Todos los destinos verificados."
