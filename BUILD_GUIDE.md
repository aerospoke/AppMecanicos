# 🚀 Guía para Generar AAB (Android App Bundle)

## 📋 Información del Keystore

**⚠️ GUARDAR ESTA INFORMACIÓN DE FORMA SEGURA ⚠️**

```
Keystore Path: android/app/mechgo-release.keystore
Keystore Password: MechGo2026Secure
Key Alias: mechgo-key-alias
Key Password: MechGo2026Secure
```

## 🔧 Primera Vez - Generar Keystore

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore mechgo-release.keystore -alias mechgo-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Responder a las preguntas:**
- Password: `MechGo2026Secure`
- Re-enter: `MechGo2026Secure`
- First and last name: Tu nombre
- Organizational unit: MechGo
- Organization: MechGo
- City: Tu ciudad
- State: Tu estado
- Country code: Tu país (ej: MX, US, etc)

## 📦 Generar AAB para Google Play

### Opción 1: Usar el script automatizado (RECOMENDADO)
```bash
./generate-aab.sh
```

### Opción 2: Comando manual
```bash
npx expo run:android --variant release
```

### Paso 3: Encontrar el AAB
El archivo AAB se generará en:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## 🔄 Proceso Completo (Copiar y Pegar)

```bash
# Desde la raíz del proyecto
rm -rf android/app/build android/build
npx expo run:android --variant release
```

## 📱 Subir a Google Play Console

1. Ve a https://play.google.com/console
2. Selecciona tu app (o crea una nueva)
3. Ve a "Producción" → "Crear nueva versión"
4. Sube el archivo `app-release.aab`
5. Completa la información requerida
6. Revisa y publica

## 🎨 Assets Necesarios para Google Play

### Iconos:
- **Icono de app**: 512x512 px (PNG)
- **Feature Graphic**: 1024x500 px (JPG o PNG)

### Screenshots (mínimo 2):
- **Teléfono**: 320-3840 px (lado más corto), relación 16:9
- **Tablet 7"**: 1024-7680 px
- **Tablet 10"**: 1024-7680 px

### Textos:
- **Título**: Máximo 50 caracteres (ej: "MechGo - Mecánico a domicilio")
- **Descripción corta**: Máximo 80 caracteres
- **Descripción completa**: Máximo 4000 caracteres

## 🔑 Backup del Keystore

**MUY IMPORTANTE:**
- Hacer backup de `android/app/mechgo-release.keystore`
- Guardar en un lugar seguro (Google Drive, Dropbox, etc.)
- **Si pierdes este archivo, NO podrás actualizar la app en Google Play**

## 🐛 Solución de Problemas

### Error: "Keystore not found"
```bash
# Verifica que el keystore existe
ls -la android/app/mechgo-release.keystore
```

### Error de firma
```bash
# Limpia y vuelve a intentar
cd android
./gradlew clean
./gradlew bundleRelease
```

### Error de memoria
```bash
# Aumenta memoria de Gradle
export GRADLE_OPTS="-Xmx4096m -XX:MaxPermSize=512m"
./gradlew bundleRelease
```

## 📝 Checklist antes de publicar

- [ ] Versión actualizada en `android/app/build.gradle`
- [ ] Nombre de app correcto
- [ ] Iconos actualizados
- [ ] Permisos correctos en AndroidManifest.xml
- [ ] Probado en dispositivo real
- [ ] AAB generado y probado
- [ ] Screenshots tomados
- [ ] Descripción escrita
- [ ] Política de privacidad lista

## 🔄 Actualizaciones Futuras

Para cada actualización:

1. **Incrementar versión** en `android/app/build.gradle`:
```gradle
versionCode 2  // Incrementar en 1
versionName "1.1.0"  // Actualizar según cambios
```

2. **Generar nuevo AAB**:
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

3. **Subir a Google Play** como nueva versión

---

**Creado el**: 16 de enero de 2026
**Última actualización**: 16 de enero de 2026
