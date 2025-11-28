# Servicio de Supabase

Este servicio proporciona todas las funcionalidades necesarias para interactuar con Supabase.

## Configuración

1. Copia tu URL y Anon Key de Supabase en el archivo `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
   ```

## Uso

### Autenticación

```typescript
import { signUp, signIn, signOut, getCurrentUser } from './services/supabaseService';

// Registrar usuario
const { data, error } = await signUp('email@example.com', 'password123', {
  nombre: 'Juan',
  apellido: 'Pérez'
});

// Iniciar sesión
const { data, error } = await signIn('email@example.com', 'password123');

// Cerrar sesión
await signOut();

// Obtener usuario actual
const { user } = await getCurrentUser();
```

### Base de Datos

```typescript
import { getAll, getById, create, update, deleteRecord } from './services/supabaseService';

// Obtener todos los mecánicos
const { data: mecanicos } = await getAll('mecanicos');

// Obtener un mecánico por ID
const { data: mecanico } = await getById('mecanicos', 1);

// Crear nuevo mecánico
const { data } = await create('mecanicos', {
  nombre: 'Carlos',
  especialidad: 'Electricidad',
  telefono: '1234567890'
});

// Actualizar mecánico
const { data } = await update('mecanicos', 1, {
  telefono: '0987654321'
});

// Eliminar mecánico
await deleteRecord('mecanicos', 1);
```

### Storage (Archivos)

```typescript
import { uploadFile, getPublicUrl, deleteFile } from './services/supabaseService';

// Subir imagen
const file = new File([blob], 'foto.jpg');
const { data } = await uploadFile('avatares', 'users/123/avatar.jpg', file);

// Obtener URL pública
const url = getPublicUrl('avatares', 'users/123/avatar.jpg');

// Eliminar archivo
await deleteFile('avatares', ['users/123/avatar.jpg']);
```

### Realtime

```typescript
import { subscribeToTable, unsubscribe } from './services/supabaseService';

// Suscribirse a cambios
const subscription = subscribeToTable('mecanicos', (payload) => {
  console.log('Cambio detectado:', payload);
});

// Cancelar suscripción
await unsubscribe(subscription);
```
