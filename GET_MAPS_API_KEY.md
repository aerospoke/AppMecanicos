# 🗺️ Cómo Obtener la API Key de Google Maps

## Pasos para obtener tu API Key:

1. **Ve a Google Cloud Console:**
   https://console.cloud.google.com/

2. **Crea un proyecto nuevo** (o usa uno existente)
   - Haz clic en "Seleccionar proyecto" → "Nuevo proyecto"
   - Nombre: AppMecanicos
   - Clic en "Crear"

3. **Habilita Google Maps SDK para Android:**
   - Ve a "APIs y servicios" → "Biblioteca"
   - Busca "Maps SDK for Android"
   - Haz clic y presiona "HABILITAR"

4. **Crea credenciales:**
   - Ve a "APIs y servicios" → "Credenciales"
   - Clic en "+ CREAR CREDENCIALES" → "Clave de API"
   - Copia la API Key que se genera

5. **Restringe la API Key (IMPORTANTE para seguridad):**
   - Haz clic en la API Key creada
   - En "Restricciones de aplicaciones":
     - Selecciona "Aplicaciones de Android"
     - Agrega el nombre del paquete: `com.JbDeployments.AppMecanicos`
     - Agrega el certificado SHA-1 (ver abajo cómo obtenerlo)
   - En "Restricciones de API":
     - Selecciona "Restringir clave"
     - Marca: "Maps SDK for Android"
   - Guarda los cambios

## Obtener el SHA-1 del certificado:

### Para Debug:
```bash
cd android
keytool -list -v -keystore app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Para Release:
```bash
cd android
keytool -list -v -keystore app/app-release.keystore -alias app-key-alias -storepass AppMecanicos2026 -keypass AppMecanicos2026
```

Copia el valor de SHA1 que aparece.

## Una vez que tengas la API Key:

Añádela al archivo `android/gradle.properties`
