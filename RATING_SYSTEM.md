# Sistema de Calificación de Servicios

## Problema Resuelto

Cuando el mecánico finalizaba el proceso, el último modal (banner de estado del servicio) quedaba visible y "bugeado" en la pantalla.

## Solución Implementada

### 1. **Corrección del Banner del Mecánico**

- El banner del servicio ahora se oculta automáticamente cuando el estado del servicio es `completed` o `cancelled`
- Se limpia el estado `activeServiceForMechanic` inmediatamente al completar el servicio
- Se eliminó el Alert intermedio que mostraba "El cliente puede calificar tu trabajo"
- El mecánico es redirigido automáticamente al Dashboard después de completar un servicio

**Cambios en**: [src/screens/HomeScreen.tsx](src/screens/HomeScreen.tsx)

### 2. **Sistema de Calificación para Clientes**

Cuando un servicio se completa, el cliente recibe automáticamente una alerta para calificar el servicio:

- **Alerta de Calificación**: Aparece automáticamente cuando el servicio cambia a estado `completed`
- **Opciones de Calificación**: El cliente puede elegir de 1 a 5 estrellas
- **Opción "Después"**: Permite al cliente calificar más tarde
- **Almacenamiento**: La calificación se guarda en la base de datos en el campo `rating`

**Nuevas Funciones**:
- `showRatingAlert(service)`: Muestra el diálogo de calificación
- `submitRating(serviceId, rating)`: Envía la calificación a Supabase

### 3. **Base de Datos**

Se agregó un nuevo campo a la tabla `service_requests`:

```sql
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
```

**Archivo**: [supabase_add_rating_field.sql](supabase_add_rating_field.sql)

## Instrucciones de Implementación

### 1. Actualizar la Base de Datos

Ejecutar el siguiente script en el **Supabase SQL Editor**:

```bash
# Copiar el contenido de supabase_add_rating_field.sql
# y ejecutarlo en Supabase SQL Editor
```

### 2. Probar el Flujo

**Como Mecánico**:
1. Aceptar un servicio desde el Dashboard
2. Completar todos los pasos: Aceptar → He Llegado → Iniciar Trabajo → Completar
3. Al presionar "Completar Servicio", deberías ser redirigido automáticamente al Dashboard
4. El banner del servicio desaparece inmediatamente

**Como Cliente**:
1. Crear una solicitud de servicio
2. Esperar a que un mecánico la complete
3. Automáticamente aparecerá una alerta para calificar el servicio
4. Seleccionar una calificación de 1 a 5 estrellas o presionar "Después"

## Mejoras Futuras Sugeridas

- [ ] Agregar campo de comentarios junto con la calificación
- [ ] Mostrar promedio de calificaciones del mecánico en su perfil
- [ ] Implementar pantalla dedicada de historial de servicios con calificaciones
- [ ] Agregar notificación push recordando al cliente calificar si no lo hizo
- [ ] Dashboard del mecánico mostrando sus calificaciones promedio

## Archivos Modificados

1. [src/screens/HomeScreen.tsx](src/screens/HomeScreen.tsx) - Lógica de calificación y corrección del banner
2. [supabase_add_rating_field.sql](supabase_add_rating_field.sql) - Script SQL para agregar campo rating
