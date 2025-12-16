# 📱 Sistema de Tracking en Tiempo Real - Documentación Completa

## 🎯 Resumen del Flujo

### **USUARIO (Cliente)**
1. Solicita servicio desde su ubicación actual
2. La solicitud queda `pending` en la base de datos
3. Espera notificación push cuando un mecánico acepte
4. **Ve al mecánico moviéndose en tiempo real** en el mapa
5. Recibe actualizaciones de ETA (tiempo estimado de llegada)
6. Es notificado cuando el mecánico llega
7. Puede calificar el servicio al finalizar

### **MECÁNICO**
1. Ve solicitudes pendientes en el dashboard
2. Al aceptar:
   - El servicio cambia a `accepted`
   - **Se inicia tracking GPS automático**
   - Su ubicación se actualiza cada 10 segundos en Supabase
   - El cliente lo ve moviéndose en el mapa
3. Al llegar, marca "He Llegado" → Estado `arrived`
4. Al comenzar el trabajo → Estado `in_progress`
5. Al terminar → Estado `completed` + **Se detiene el GPS tracking**

---

## 🗄️ Estructura de la Base de Datos

### Tabla: `service_requests`

```sql
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  mechanic_id UUID REFERENCES auth.users(id),
  
  -- Ubicación del CLIENTE (fija)
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  
  -- Ubicación del MECÁNICO (actualizada en tiempo real)
  mechanic_latitude DOUBLE PRECISION,
  mechanic_longitude DOUBLE PRECISION,
  mechanic_last_update TIMESTAMP WITH TIME ZONE,
  
  -- Información del servicio
  service_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Estimaciones
  estimated_arrival TIMESTAMP WITH TIME ZONE
);
```

### Estados del Servicio

| Estado | Descripción | Quién lo cambia | GPS Activo |
|--------|-------------|-----------------|------------|
| `pending` | Esperando mecánico | Usuario crea | ❌ |
| `accepted` | Mecánico en camino | Mecánico acepta | ✅ |
| `arrived` | Mecánico llegó | Mecánico confirma | ✅ |
| `in_progress` | Trabajando en vehículo | Mecánico inicia trabajo | ⚠️ Opcional |
| `completed` | Servicio terminado | Mecánico completa | ❌ |
| `cancelled` | Cancelado | Usuario o Mecánico | ❌ |

---

## 📡 Sistema de Tracking GPS

### Archivo: `trackingService.ts`

#### **1. Iniciar Tracking (Mecánico)**

```typescript
await startMechanicTracking(serviceId, mechanicId);
```

**¿Qué hace?**
- Solicita permisos de ubicación
- Inicia `Location.watchPositionAsync()` con:
  - **Precisión**: `BestForNavigation` (máxima precisión)
  - **Intervalo de tiempo**: 10 segundos
  - **Intervalo de distancia**: 20 metros
- **Actualiza Supabase** cada vez que el mecánico se mueve
- Guarda: `mechanic_latitude`, `mechanic_longitude`, `mechanic_last_update`

**Cuándo se activa:**
- Cuando el mecánico presiona "Aceptar Servicio"

**Cuándo se detiene:**
- Cuando el mecánico presiona "Completar Servicio"
- Si el servicio se cancela

---

#### **2. Suscripción en Tiempo Real (Cliente)**

```typescript
subscribeMechanicLocation(serviceId, (location) => {
  // Se ejecuta cada vez que el mecánico se mueve
  setMechanicLocation(location);
});
```

**¿Qué hace?**
- Crea un **Realtime Channel** de Supabase
- Escucha cambios en la tabla `service_requests`
- Cuando el mecánico actualiza su ubicación → El cliente recibe la nueva posición **inmediatamente**
- Actualiza el marcador del mecánico en el mapa

**Frecuencia de actualización:**
- Cada 10 segundos (o antes si el mecánico se mueve 20+ metros)

---

## 🔄 Flujo Técnico Completo

### **Caso 1: Usuario solicita servicio**

```javascript
// HomeScreen.tsx (Usuario)
const handleSelectService = async (serviceType, description) => {
  const { data } = await createServiceRequest({
    service_name: serviceType,
    service_description: description,
    latitude: currentLocation.latitude,  // Ubicación FIJA del usuario
    longitude: currentLocation.longitude,
  });

  // Enviar push a TODOS los mecánicos cercanos
  await sendPushToMechanics(
    '🚨 Nueva Solicitud',
    `Servicio: ${serviceType}`,
    { serviceId: data.id }
  );
};
```

**Estado en DB:**
```json
{
  "id": "abc-123",
  "user_id": "user-456",
  "mechanic_id": null,
  "latitude": 4.7110,
  "longitude": -74.0721,
  "mechanic_latitude": null,
  "mechanic_longitude": null,
  "status": "pending"
}
```

---

### **Caso 2: Mecánico acepta servicio**

```javascript
// HomeScreen.tsx (Mecánico)
const handleAcceptService = async () => {
  // 1. Actualizar estado
  await supabase
    .from('service_requests')
    .update({ 
      status: 'accepted',
      mechanic_id: user.id,
    })
    .eq('id', serviceId);

  // 2. Iniciar GPS tracking
  await startMechanicTracking(serviceId, user.id);
  
  // 3. Notificar al cliente (TODO)
  await sendPushToUser(service.user_id, 
    '🚗 Mecánico en camino',
    'Tu mecánico está llegando'
  );
};
```

**¿Qué pasa internamente?**

```javascript
// trackingService.ts
Location.watchPositionAsync({
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 10000,  // 10 seg
  distanceInterval: 20, // 20 metros
}, async (location) => {
  // Cada 10 segundos actualiza DB
  await supabase
    .from('service_requests')
    .update({
      mechanic_latitude: location.coords.latitude,
      mechanic_longitude: location.coords.longitude,
      mechanic_last_update: new Date().toISOString(),
    })
    .eq('id', serviceId);
});
```

**Estado en DB (cada 10 seg):**
```json
{
  "id": "abc-123",
  "mechanic_id": "mech-789",
  "latitude": 4.7110,          // Usuario (fija)
  "longitude": -74.0721,
  "mechanic_latitude": 4.7050, // Mecánico (actualizada)
  "mechanic_longitude": -74.0680,
  "mechanic_last_update": "2025-12-16T10:30:45Z",
  "status": "accepted"
}
```

---

### **Caso 3: Cliente ve al mecánico moviéndose**

```javascript
// HomeScreen.tsx (Usuario)
useEffect(() => {
  if (myActiveService && myActiveService.mechanic_id) {
    // Suscribirse a cambios en tiempo real
    const subscription = subscribeMechanicLocation(
      myActiveService.id,
      (location) => {
        // ¡Se ejecuta automáticamente cuando el mecánico se mueve!
        setMechanicLocation({
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }
    );

    return () => subscription.unsubscribe();
  }
}, [myActiveService]);
```

**En el mapa:**
```jsx
{mechanicLocation && (
  <Marker
    coordinate={mechanicLocation}
    title="Tu Mecánico"
  >
    <View style={{ backgroundColor: '#10b981', padding: 8 }}>
      <MaterialIcons name="build-circle" size={32} color="#fff" />
    </View>
  </Marker>
)}
```

**Resultado visual:**
- El usuario ve un **ícono verde con herramienta** moviéndose en el mapa
- Se actualiza cada 10 segundos **sin necesidad de refrescar**
- Ve la distancia y tiempo estimado de llegada

---

## 🧪 Pruebas Necesarias

### **1. Probar en dispositivos físicos**
❌ **El emulador NO simula movimiento GPS realista**

**Cómo probar:**
1. Instala el APK en 2 dispositivos físicos
2. Dispositivo 1 (Usuario): Solicita servicio
3. Dispositivo 2 (Mecánico): Acepta servicio
4. **Camina con el dispositivo del mecánico**
5. En el dispositivo del usuario deberías ver el marcador moviéndose

---

### **2. Verificar actualización en Supabase**

```sql
-- Ver ubicaciones actualizándose en tiempo real
SELECT 
  id,
  service_type,
  status,
  latitude as user_lat,
  longitude as user_lng,
  mechanic_latitude as mech_lat,
  mechanic_longitude as mech_lng,
  mechanic_last_update,
  created_at
FROM service_requests
WHERE status = 'accepted'
ORDER BY mechanic_last_update DESC;
```

**Deberías ver:**
- `mechanic_last_update` actualizándose cada ~10 segundos
- `mechanic_latitude` y `mechanic_longitude` cambiando

---

## 🐛 Problemas Comunes

### **1. "No se actualiza la ubicación del mecánico"**

**Causas:**
- ✅ Verifica que iniciaste tracking: `await startMechanicTracking()`
- ✅ Permisos de ubicación denegados
- ✅ GPS del dispositivo desactivado
- ✅ Columnas `mechanic_latitude/longitude` no existen en DB

**Solución:**
```sql
-- Agregar columnas si faltan
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS mechanic_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS mechanic_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS mechanic_last_update TIMESTAMP WITH TIME ZONE;
```

---

### **2. "El cliente no ve al mecánico moviéndose"**

**Causas:**
- ✅ Realtime no está habilitado en Supabase
- ✅ No se llamó a `subscribeMechanicLocation()`
- ✅ El servicio no tiene `mechanic_id` asignado

**Solución:**
```javascript
// Verificar en consola del cliente
console.log('Servicio activo:', myActiveService);
console.log('Ubicación mecánico:', mechanicLocation);
```

---

### **3. "Consume mucha batería"**

**Solución:**
- Cambiar intervalo de tracking:
```javascript
timeInterval: 30000, // 30 segundos en lugar de 10
distanceInterval: 50, // 50 metros en lugar de 20
```

- Detener tracking cuando el mecánico llega:
```javascript
if (status === 'arrived') {
  await stopMechanicTracking();
}
```

---

## 📊 Métricas de Rendimiento

| Configuración | Frecuencia | Batería | Precisión |
|---------------|-----------|---------|-----------|
| **Actual** | 10 seg / 20m | Media-Alta | Muy Alta |
| **Balanceada** | 30 seg / 50m | Media | Alta |
| **Ahorro** | 60 seg / 100m | Baja | Media |

---

## ✅ Checklist de Implementación

### Base de Datos
- [ ] Agregar columnas `mechanic_latitude`, `mechanic_longitude`, `mechanic_last_update`
- [ ] Habilitar Realtime en Supabase para tabla `service_requests`
- [ ] Crear índice en `status` para consultas rápidas

### Código
- [x] Crear `trackingService.ts` ✅
- [x] Implementar `startMechanicTracking()` ✅
- [x] Implementar `subscribeMechanicLocation()` ✅
- [x] Agregar marcador del mecánico en mapa ✅
- [x] Agregar botones de flujo (Llegué, Completar) ✅
- [ ] Implementar notificaciones push al cliente
- [ ] Agregar sistema de calificación

### Pruebas
- [ ] Probar en 2 dispositivos físicos simultáneamente
- [ ] Verificar actualización en Supabase cada 10 seg
- [ ] Medir consumo de batería
- [ ] Probar reconexión si pierde señal GPS

---

## 🚀 Próximos Pasos

1. **Agregar las columnas en Supabase** (5 min)
2. **Habilitar Realtime** en el dashboard de Supabase (2 min)
3. **Generar nuevo APK** con el código actualizado (5 min)
4. **Probar con 2 dispositivos** caminando por la calle (15 min)

**Comando para generar APK:**
```bash
npx expo run:android --variant release && \
cp android/app/build/outputs/apk/release/app-release.apk \
~/Desktop/AppMecanicos-Tracking.apk
```

---

## 💡 Mejoras Futuras

1. **Optimización de batería**: Pausar tracking cuando el mecánico no se mueve
2. **Modo offline**: Guardar ubicaciones localmente y sincronizar cuando vuelva internet
3. **Historial de ruta**: Guardar el camino que tomó el mecánico
4. **Alertas inteligentes**: Notificar al cliente cuando el mecánico está a 5 minutos
5. **Compartir ubicación por link**: Generar enlace para que familiares vean el servicio

---

**¿Necesitas ayuda con algo específico? ¡Pregúntame!** 🚀
