# 🔔 Sistema de Notificaciones

## 📱 Cómo Funcionan las Notificaciones

El sistema tiene **DOS tipos** de notificaciones:

### 1. **Push Notifications** (Solo dispositivos físicos)
- ✅ Funcionan aunque la app esté cerrada
- ✅ Aparecen en la barra de notificaciones
- ❌ **NO funcionan en emuladores**
- ✅ Requieren permisos del usuario

### 2. **Notificaciones In-App Realtime** (Funcionan en todos lados)
- ✅ Funcionan en emuladores
- ✅ Funcionan en dispositivos físicos
- ✅ Aparecen como Alerts cuando la app está abierta
- ✅ Actualizan la lista automáticamente
- ✅ **NUEVA**: Ya implementadas

## 🚀 Qué Sucede Cuando un Cliente Crea una Solicitud

### Paso 1: Cliente crea solicitud
```
Cliente → Presiona "Solicitar Servicio" → Completa formulario
```

### Paso 2: Se ejecutan AMBOS sistemas

#### A) Push Notification (dispositivos físicos)
```javascript
await sendPushToMechanics(
  '🚨 Nueva Solicitud de Servicio',
  `Servicio: ${serviceType}${description}`,
  { serviceId: data.id }
);
```
- Se envía a **todos los mecánicos** con `push_token` registrado
- Solo funciona si el mecánico dio permisos
- Solo en dispositivos reales

#### B) Realtime Notification (NUEVA - funciona siempre)
```javascript
supabase.channel('new-service-requests')
  .on('INSERT', 'service_requests', (payload) => {
    Alert.alert('🚨 Nueva Solicitud', ...)
  })
```
- El mecánico ve un **Alert inmediato** en la app
- Funciona en emuladores y dispositivos
- La lista se actualiza automáticamente

## 🧪 Cómo Probar

### En Emulador (Solo Realtime)
1. Abre la app como **Cliente** en un emulador
2. Abre la app como **Mecánico** en otro emulador (o misma ventana, diferente usuario)
3. Cliente crea una solicitud
4. El mecánico verá un **Alert** inmediatamente
5. La lista se actualiza sola

### En Dispositivo Físico (Push + Realtime)
1. Instala la app en un dispositivo real
2. Login como **Mecánico**
3. Da permisos de notificaciones cuando los pida
4. **Cierra la app** o ponla en segundo plano
5. En otro dispositivo, login como **Cliente**
6. Crea una solicitud
7. El mecánico recibirá:
   - **Push notification** (aunque la app esté cerrada)
   - **Alert in-app** (si la app está abierta)

## 🔍 Verificar que Funciona

### Check 1: Ver logs en consola
```
🔔 Mecánico suscribiéndose a nuevas solicitudes...
📡 Estado de suscripción: SUBSCRIBED
🆕 Nueva solicitud detectada: {...}
```

### Check 2: Verificar tokens en BD
```sql
SELECT id, nombre, rol, push_token 
FROM profiles 
WHERE rol = 'mecanico';
```
- Si `push_token` es `null` → Solo funciona realtime
- Si `push_token` tiene valor → Funcionan ambos

### Check 3: Probar manualmente
1. Dashboard del Mecánico → Debe ver solicitudes pendientes
2. Crear nueva solicitud como cliente
3. Alert debe aparecer automáticamente
4. Lista se actualiza sola

## 🐛 Solución de Problemas

### "No recibo notificaciones"

**Si estás en emulador:**
- ✅ Las notificaciones **SÍ funcionan** (realtime)
- Asegúrate de que el MechanicDashboard esté abierto
- Verás un Alert cuando llegue una nueva solicitud

**Si estás en dispositivo físico:**
1. Verifica permisos:
   - Settings → Apps → MechGo → Notifications → Activadas
2. Verifica token en BD:
   ```sql
   SELECT push_token FROM profiles WHERE id = 'TU_ID';
   ```
3. Si `push_token` es null:
   - Cierra sesión y vuelve a iniciar
   - Acepta permisos cuando los pida

### "El Alert no aparece"
- Verifica que estés en el **MechanicDashboard**
- Revisa la consola, debe decir: `📡 Estado de suscripción: SUBSCRIBED`
- Si dice `CLOSED` o error, hay problema de conexión

### "La lista no se actualiza"
- El Alert debe tener botón "Ver" o "Después"
- Ambos recargan la lista automáticamente
- Si no, presiona el botón de refresh manualmente

## 📊 Comparación de Sistemas

| Característica | Push Notifications | Realtime In-App |
|----------------|-------------------|-----------------|
| Emuladores | ❌ No | ✅ Sí |
| Dispositivos | ✅ Sí | ✅ Sí |
| App cerrada | ✅ Sí | ❌ No |
| App abierta | ✅ Sí | ✅ Sí |
| Permisos | ✅ Requiere | ❌ No requiere |
| Actualización automática | ❌ Manual | ✅ Automática |

## ✅ Estado Actual

- [x] Push Notifications implementadas
- [x] Realtime Notifications implementadas (NUEVA)
- [x] Auto-actualización de lista
- [x] Alert con opciones "Ver" / "Después"
- [x] Funciona en emuladores
- [x] Funciona en dispositivos físicos
- [x] Logs para debugging

## 🎯 Siguiente Nivel (Opcional)

- [ ] Notificación con sonido personalizado
- [ ] Badge count en icono de app
- [ ] Vibración en dispositivos Android
- [ ] Notificaciones agrupadas
- [ ] Historial de notificaciones

---

**Ahora los mecánicos reciben notificaciones tanto en emuladores como en dispositivos reales!** 🎉
