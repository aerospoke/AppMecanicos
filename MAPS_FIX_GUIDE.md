# 🔧 Solución: Mapa no funciona en dispositivos reales

## ❌ Problema
El mapa no se ve en dispositivos Android reales porque **falta la API Key de Google Maps**.

## ✅ Solución Rápida

### 1. Obtener API Key de Google Maps
👉 Sigue las instrucciones en: **[GET_MAPS_API_KEY.md](GET_MAPS_API_KEY.md)**

Resumen rápido:
1. Ve a https://console.cloud.google.com/
2. Crea un proyecto
3. Habilita "Maps SDK for Android"
4. Crea credenciales → Clave de API
5. Copia la API Key

### 2. Configurar las restricciones (MUY IMPORTANTE)

En Google Cloud Console, configura tu API Key con:

**Restricciones de aplicación:**
- Tipo: Aplicaciones de Android
- Nombre del paquete: `com.JbDeployments.AppMecanicos`
- Certificados SHA-1:
  - **Debug:** `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
  - **Release:** `56:21:11:5F:27:04:FF:57:9E:A8:C7:58:5C:35:AF:6E:75:74:D0:9D`

**Restricciones de API:**
- Selecciona: "Restringir clave"
- Marca: ☑️ Maps SDK for Android

### 3. Añadir la API Key al proyecto

Edita el archivo: `android/gradle.properties`

Reemplaza esta línea:
```properties
GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

Por:
```properties
GOOGLE_MAPS_API_KEY=TuAPIKeyAquí
```

### 4. Limpiar y reconstruir

```bash
# Limpiar builds anteriores
cd android
./gradlew clean

# Volver a la raíz
cd ..

# Construir nueva versión
npm run android
```

## 📱 Para crear un nuevo APK/AAB con el mapa funcionando:

```bash
# Construir AAB para Play Store
cd android
./gradlew bundleRelease

# O construir APK
./gradlew assembleRelease
```

El AAB/APK estará en:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

## ✅ Verificación

Después de configurar la API Key, el mapa debería:
- ✅ Mostrarse correctamente en dispositivos reales
- ✅ Mostrar marcadores
- ✅ Mostrar la ubicación del usuario
- ✅ Mostrar rutas entre puntos

## ⚠️ Notas importantes

1. **Sin API Key** → El mapa aparece gris/en blanco
2. **API Key incorrecta** → El mapa aparece con marca de agua "For development purposes only"
3. **SHA-1 incorrecto** → El mapa no se autoriza
4. **API no habilitada** → El mapa no carga

## 🔍 Verificar que todo está bien configurado

1. La API Key está en `android/gradle.properties`
2. El AndroidManifest tiene: `<meta-data android:name="com.google.android.geo.API_KEY" android:value="${GOOGLE_MAPS_API_KEY}"/>`
3. El build.gradle inyecta la variable: `manifestPlaceholders = [GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY]`
4. Los permisos de ubicación están en el manifest ✅ (ya están)
5. El código usa `PROVIDER_GOOGLE` ✅ (ya está)

## 📞 Si sigues teniendo problemas

Verifica en el logcat:
```bash
adb logcat | grep -i "google\|maps\|api"
```

Busca errores como:
- "API key not found"
- "This app is not authorized"
- "Maps SDK for Android is not enabled"
