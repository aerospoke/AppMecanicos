# 📚 Guía de Uso del Sistema de Roles

Esta guía explica cómo usar el sistema de roles implementado en la aplicación.

---

## 🎯 Roles Disponibles

- **`cliente`**: Usuario normal (por defecto)
- **`mecanico`**: Mecánico que atiende solicitudes
- **`admin`**: Administrador con acceso total

---

## 🛡️ 1. Proteger Pantallas Completas

### Opción A: Con componente RoleGuard

```tsx
import RoleGuard from '../components/RoleGuard';

export default function MiPantallaProtegida({ onNavigateBack }) {
  return (
    <RoleGuard allowedRoles={['mecanico', 'admin']}>
      <View>
        <Text>Esta pantalla solo la ven mecánicos y admins</Text>
      </View>
    </RoleGuard>
  );
}
```

### Opción B: Con mensaje personalizado de acceso denegado

```tsx
import RoleGuard from '../components/RoleGuard';

export default function AdminPanel() {
  return (
    <RoleGuard 
      allowedRoles={['admin']}
      fallback={
        <View>
          <Text>Solo administradores pueden acceder aquí</Text>
        </View>
      }
    >
      <View>
        <Text>Panel de Administrador</Text>
      </View>
    </RoleGuard>
  );
}
```

---

## 🔒 2. Proteger Secciones de una Pantalla

```tsx
import { useAuth } from '../context/AuthContext';
import { hasRole, isMecanico } from '../utils/roleUtils';

export default function HomeScreen() {
  const { userRole } = useAuth();

  return (
    <View>
      <Text>Contenido visible para todos</Text>
      
      {/* Solo mecánicos y admins ven esto */}
      {isMecanico(userRole) && (
        <View>
          <Text>Panel de Mecánico</Text>
          <Button title="Ver Solicitudes" />
        </View>
      )}

      {/* Solo admins ven esto */}
      {hasRole(userRole, 'admin') && (
        <View>
          <Text>Configuración de Admin</Text>
        </View>
      )}
    </View>
  );
}
```

---

## 👤 3. Acceder a la Información del Usuario

```tsx
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, userProfile, userRole } = useAuth();

  return (
    <View>
      <Text>Email: {user?.email}</Text>
      <Text>Nombre: {userProfile?.nombre}</Text>
      <Text>Rol: {userRole}</Text>
    </View>
  );
}
```

---

## 🔧 4. Funciones Útiles de Roles

```tsx
import { 
  hasRole, 
  isAdmin, 
  isMecanico, 
  isCliente,
  getRoleName,
  getRoleEmoji 
} from '../utils/roleUtils';

// Verificar si tiene un rol específico
if (hasRole(userRole, 'admin')) {
  console.log('Es admin');
}

// Verificar si tiene uno de varios roles
if (hasRole(userRole, ['mecanico', 'admin'])) {
  console.log('Es mecánico o admin');
}

// Funciones específicas
if (isAdmin(userRole)) { /* ... */ }
if (isMecanico(userRole)) { /* ... */ }
if (isCliente(userRole)) { /* ... */ }

// Obtener nombre legible del rol
const roleName = getRoleName('mecanico'); // "Mecánico"

// Obtener emoji del rol
const emoji = getRoleEmoji('admin'); // "⚡"
```

---

## 🔄 5. Actualizar el Perfil del Usuario

```tsx
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/supabaseService';

export default function EditProfile() {
  const { user, refreshProfile } = useAuth();

  const handleUpdate = async () => {
    if (!user) return;

    const { data, error } = await updateUserProfile(user.id, {
      nombre: 'Nuevo Nombre',
      telefono: '1234567890',
    });

    if (!error) {
      // Refrescar el perfil en el contexto
      await refreshProfile();
      Alert.alert('Éxito', 'Perfil actualizado');
    }
  };

  return (
    <Button title="Actualizar Perfil" onPress={handleUpdate} />
  );
}
```

---

## 🎨 6. Mostrar Contenido Dinámico según Rol

```tsx
import { useAuth } from '../context/AuthContext';
import { getRoleEmoji, getRoleName } from '../utils/roleUtils';

export default function Dashboard() {
  const { userRole, userProfile } = useAuth();

  const getDashboardTitle = () => {
    switch (userRole) {
      case 'admin':
        return '⚡ Panel de Administrador';
      case 'mecanico':
        return 'Dashboard';
      case 'cliente':
        return '👤 Mi Panel';
      default:
        return 'Dashboard';
    }
  };

  return (
    <View>
      <Text style={styles.title}>{getDashboardTitle()}</Text>
      <Text>
        {getRoleEmoji(userRole)} Bienvenido como {getRoleName(userRole)}
      </Text>
    </View>
  );
}
```

---

## 🚦 7. Navegación Condicional

```tsx
import { useAuth } from '../context/AuthContext';

export default function MainScreen() {
  const { userRole } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('home');

  return (
    <View>
      {/* Navegación común */}
      <Button title="Home" onPress={() => setCurrentScreen('home')} />
      <Button title="Perfil" onPress={() => setCurrentScreen('profile')} />
      
      {/* Solo mecánicos y admins ven este botón */}
      {(userRole === 'mecanico' || userRole === 'admin') && (
        <Button 
          title="Panel Mecánico" 
          onPress={() => setCurrentScreen('mechanic-dashboard')} 
        />
      )}
      
      {/* Solo admins ven este botón */}
      {userRole === 'admin' && (
        <Button 
          title="Admin Panel" 
          onPress={() => setCurrentScreen('admin-panel')} 
        />
      )}
    </View>
  );
}
```

---

## 📊 8. Ejemplo Completo: Lista de Solicitudes

```tsx
import { useAuth } from '../context/AuthContext';
import { getAll } from '../services/supabaseService';

export default function ServiceRequestsList() {
  const { user, userRole } = useAuth();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const { data, error } = await getAll('service_requests');
    
    if (!error && data) {
      // Los clientes solo ven sus solicitudes
      // Los mecánicos y admins ven todas (RLS lo maneja en el servidor)
      setRequests(data);
    }
  };

  return (
    <View>
      <Text>
        {userRole === 'cliente' 
          ? 'Mis Solicitudes' 
          : 'Todas las Solicitudes'}
      </Text>
      
      {requests.map((request) => (
        <View key={request.id}>
          <Text>{request.service_name}</Text>
          
          {/* Solo mecánicos pueden cambiar estado */}
          {(userRole === 'mecanico' || userRole === 'admin') && (
            <Button 
              title="Atender Solicitud"
              onPress={() => handleAccept(request.id)}
            />
          )}
        </View>
      ))}
    </View>
  );
}
```

---

## ⚠️ Notas Importantes

1. **Seguridad en el Cliente**: El sistema de roles en React Native es para la UI. La seguridad real está en Supabase con RLS.

2. **RLS es Obligatorio**: Siempre implementa Row Level Security en Supabase para que la seguridad sea real.

3. **No Confiar Solo en el Cliente**: Un usuario puede modificar el código del cliente, por eso RLS es crucial.

4. **Cambiar Roles**: Los usuarios NO pueden cambiar su propio rol. Solo los admins pueden hacerlo desde Supabase:
   ```sql
   UPDATE profiles SET rol = 'mecanico' WHERE email = 'usuario@ejemplo.com';
   ```

5. **Testing**: Prueba con diferentes roles para asegurarte que las políticas de RLS funcionan correctamente.
