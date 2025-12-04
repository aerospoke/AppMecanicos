# 🔧 Sistema de Asignación de Mecánicos

## ✅ Cambios Implementados

### 📋 Campos Añadidos a `service_requests`

```sql
mechanic_id        UUID           -- ID del mecánico que aceptó el servicio
mechanic_name      TEXT           -- Nombre del mecánico para mostrar
accepted_at        TIMESTAMP      -- Cuándo aceptó el servicio
completed_at       TIMESTAMP      -- Cuándo completó el servicio
```

---

## 🔄 Flujo de Trabajo

### 1. **Cliente Solicita Servicio**
```
Estado: pending
mechanic_id: null
mechanic_name: null
```

### 2. **Mecánico Acepta Servicio**
```
Al presionar "Atender":
- Estado cambia a: in_progress
- Se registra: mechanic_id (ID del mecánico)
- Se registra: mechanic_name (Nombre del mecánico)
- Se registra: accepted_at (Fecha/hora actual)
```

### 3. **Mecánico Completa Servicio**
```
Al presionar "Marcar Completado":
- Estado cambia a: completed
- Se registra: completed_at (Fecha/hora actual)
- Solo el mecánico asignado puede completarlo
```

---

## 🛡️ Seguridad Implementada

### Reglas de Negocio:

1. ✅ **Cualquier mecánico** puede aceptar un servicio pendiente
2. ✅ **Solo el mecánico asignado** puede completar el servicio
3. ✅ **Otros mecánicos** ven que está asignado pero no pueden completarlo
4. ✅ **Admins** pueden hacer cualquier acción

### En la UI:

```tsx
// Servicio pendiente → Cualquier mecánico puede aceptar
[Atender] [Rechazar]

// Servicio en proceso (mecánico asignado = yo)
[Marcar Completado]

// Servicio en proceso (mecánico asignado = otro)
ℹ️ Este servicio está siendo atendido por otro mecánico
```

---

## 📊 Información Mostrada

### Para Cada Solicitud:

```
🚨 Batería descargada
   Arranque con cables o cambio de batería

📧 user@ejemplo.com
📍 4.7110, -74.0721
🕐 3 dic 2025, 14:30
🔧 Atendido por: Juan Pérez  ← NUEVO (si está asignado)

[Pendiente] o [En Proceso] o [Completado]
```

---

## 🗄️ Actualización de Base de Datos

### Ejecutar en Supabase:

```sql
-- Añadir columnas nuevas
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS mechanic_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS mechanic_name TEXT,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_service_requests_mechanic 
ON service_requests(mechanic_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_status 
ON service_requests(status);
```

---

## 📱 Ejemplos de Uso

### Ejemplo 1: Mecánico acepta servicio

```typescript
// Al presionar "Atender"
await update('service_requests', requestId, {
  status: 'in_progress',
  mechanic_id: currentUser.id,
  mechanic_name: 'Juan Pérez',
  accepted_at: new Date().toISOString()
});
```

### Ejemplo 2: Mecánico completa servicio

```typescript
// Al presionar "Marcar Completado"
// Solo si mechanic_id === currentUser.id
await update('service_requests', requestId, {
  status: 'completed',
  completed_at: new Date().toISOString()
});
```

### Ejemplo 3: Consultar servicios por mecánico

```sql
-- Ver todos los servicios de un mecánico
SELECT * FROM service_requests 
WHERE mechanic_id = 'uuid-del-mecanico';

-- Ver servicios activos del mecánico
SELECT * FROM service_requests 
WHERE mechanic_id = 'uuid-del-mecanico' 
AND status = 'in_progress';
```

---

## 📈 Métricas Disponibles

Con estos campos ahora puedes calcular:

- ✅ Cuántos servicios ha completado cada mecánico
- ✅ Tiempo promedio de respuesta (accepted_at - created_at)
- ✅ Tiempo promedio de servicio (completed_at - accepted_at)
- ✅ Servicios activos por mecánico
- ✅ Ranking de mecánicos por servicios completados

---

## 🎯 Próximas Mejoras Sugeridas

1. **Notificaciones**: Avisar al cliente cuando un mecánico acepta
2. **Chat**: Permitir comunicación entre cliente y mecánico
3. **Calificación**: Cliente puede calificar al mecánico
4. **Historial**: Ver todos los servicios de un mecánico
5. **Cancelación**: Mecánico puede liberar un servicio si no puede atenderlo

---

## ⚠️ Importante

- El sistema **registra automáticamente** el ID del mecánico al aceptar
- Solo el **mecánico asignado** puede marcar como completado
- Los **admins** pueden modificar cualquier solicitud
- La base de datos guarda **timestamps** para auditoría

---

¡El sistema de asignación está listo! 🎉
