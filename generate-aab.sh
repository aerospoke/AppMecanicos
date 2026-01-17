#!/bin/bash

# Script para generar AAB de MechGo
# Ejecutar desde la raíz del proyecto: ./generate-aab.sh

echo "🚀 Iniciando generación de AAB para MechGo..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

# Limpiar archivos de build previos
echo "🧹 Limpiando archivos de build previos..."
rm -rf android/app/build/outputs

# Generar el AAB
echo "📦 Generando AAB..."
cd android
./gradlew bundleRelease
cd ..

# Verificar si el build fue exitoso
if [ -f "android/app/build/outputs/bundle/release/app-release.aab" ]; then
    # Copiar AAB a la raíz con nombre descriptivo
    cp android/app/build/outputs/bundle/release/app-release.aab MechGo-release.aab
    
    echo ""
    echo "✅ ¡AAB generado exitosamente!"
    echo ""
    echo "📍 El archivo AAB está en:"
    echo "   - MechGo-release.aab (raíz del proyecto)"
    echo "   - android/app/build/outputs/bundle/release/app-release.aab"
    echo ""
    echo "📦 Tamaño:"
    ls -lh MechGo-release.aab | awk '{print "   " $5}'
    echo ""
    echo "📤 Siguiente paso: Subir a Google Play Console"
    echo "   https://play.google.com/console"
else
    echo ""
    echo "❌ Error al generar el AAB"
    echo "   El archivo no fue encontrado en la ubicación esperada"
    echo "   Revisa los errores arriba y consulta BUILD_GUIDE.md"
    exit 1
fi
