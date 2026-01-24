# GitHub Actions CI/CD para EAS Build

Este proyecto incluye workflows automáticos de GitHub Actions para construir y desplegar la app usando Expo Application Services (EAS).

## 🔧 Configuración Requerida

### 1. Token de Expo
Necesitas crear un token de acceso de Expo y agregarlo a los secrets de GitHub:

1. Ve a https://expo.dev/accounts/[tu-usuario]/settings/access-tokens
2. Crea un nuevo token con el nombre "GitHub Actions"
3. Copia el token
4. En tu repositorio GitHub ve a: **Settings > Secrets and Variables > Actions**
5. Crea un nuevo secret llamado `EXPO_TOKEN` y pega el token

### 2. Service Account Key (Para auto-deploy a Google Play)
Si quieres auto-deploy a Google Play Store:

1. Sigue la [guía oficial de Expo](https://docs.expo.dev/submit/android/)
2. Descarga el archivo `service-account-key.json`
3. Agrégalo a los secrets de GitHub como `GOOGLE_SERVICE_ACCOUNT_KEY`

## 🚀 Workflows Disponibles

### `eas-build.yml` - Build Simple
- **Trigger**: Push a `main` o Pull Request
- **Acción**: Build de producción para Android

### `eas-build-deploy.yml` - Build y Deploy Completo
- **Pull Request**: Build preview para testing
- **Push a main**: Build de producción
- **Tags v***: Build + Deploy automático a tiendas

## 📱 Tipos de Build

### Preview (Pull Requests)
- **Formato**: APK para fácil instalación
- **Propósito**: Testing y QA
- **Distribución**: Interna

### Production (Main branch)
- **Formato**: AAB (Android App Bundle) optimizado
- **Propósito**: Release a producción
- **Distribución**: Google Play Store

## 🎯 Flujo de Trabajo Recomendado

1. **Desarrollo**: Trabajo en feature branches
2. **Pull Request**: Se crea build preview automáticamente
3. **Merge a main**: Se genera build de producción
4. **Tag release**: `git tag v1.0.0 && git push origin v1.0.0`
5. **Deploy**: Build + submit automático a Google Play

## 🔍 Monitoreo

- Builds disponibles en: https://expo.dev/accounts/jonathanbf2000/projects/app-mecanicos
- Logs de GitHub Actions en la pestaña "Actions" del repositorio
- Status de deploys en Google Play Console

## 🛠️ Comandos Útiles

```bash
# Build local para testing
eas build --profile preview --platform android

# Build de producción local
eas build --profile production --platform android

# Submit manual a tiendas
eas submit --platform android --latest
```

## 📄 Variables de Entorno

Si tu app necesita variables de entorno, configúralas en:
- **Expo Dashboard**: Para builds automáticos
- **GitHub Secrets**: Para valores sensibles en CI/CD