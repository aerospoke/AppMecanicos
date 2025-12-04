/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 SISTEMA DE ROLES - QUICK START GUIDE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este sistema implementa control de acceso basado en roles (RBAC) con
 * seguridad tanto en cliente (React Native) como servidor (Supabase RLS).
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// 📋 PASO 1: CONFIGURAR SUPABASE
// ============================================================================
/*
   Ejecuta el SQL del archivo SUPABASE_SECURITY.md en Supabase para:
   
   1. Crear tabla `profiles` con campo `rol`
   2. Habilitar Row Level Security (RLS)
   3. Crear políticas de seguridad
   4. Crear trigger para auto-crear perfiles
   
   Comando básico para asignar roles:
   
   UPDATE profiles SET rol = 'mecanico' WHERE email = 'usuario@ejemplo.com';
*/

// ============================================================================
// 🎯 PASO 2: USAR EN TU CÓDIGO
// ============================================================================

// ----------------------------------------------------------------------------
// Ejemplo 1: Proteger una pantalla completa
// ----------------------------------------------------------------------------
import RoleGuard from './src/components/RoleGuard';

function PanelMecanico() {
  return (
    <RoleGuard allowedRoles={['mecanico', 'admin']}>
      <View>
        <Text>Solo mecánicos y admins ven esto</Text>
      </View>
    </RoleGuard>
  );
}

// ----------------------------------------------------------------------------
// Ejemplo 2: Proteger secciones dentro de una pantalla
// ----------------------------------------------------------------------------
import { useAuth } from './src/context/AuthContext';
import { isMecanico, isAdmin } from './src/utils/roleUtils';

function Dashboard() {
  const { userRole } = useAuth();

  return (
    <View>
      {/* Todos ven esto */}
      <Text>Bienvenido</Text>
      
      {/* Solo mecánicos y admins */}
      {isMecanico(userRole) && (
        <Button title="Ver Solicitudes" />
      )}
      
      {/* Solo admins */}
      {isAdmin(userRole) && (
        <Button title="Panel Admin" />
      )}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Ejemplo 3: Acceder a información del usuario
// ----------------------------------------------------------------------------
function Profile() {
  const { user, userProfile, userRole } = useAuth();

  return (
    <View>
      <Text>Email: {user?.email}</Text>
      <Text>Nombre: {userProfile?.nombre}</Text>
      <Text>Rol: {userRole}</Text> {/* 'cliente', 'mecanico', o 'admin' */}
    </View>
  );
}

// ----------------------------------------------------------------------------
// Ejemplo 4: Funciones útiles de roles
// ----------------------------------------------------------------------------
import { hasRole, getRoleName, getRoleEmoji } from './src/utils/roleUtils';

// Verificar si tiene un rol específico
if (hasRole(userRole, 'admin')) {
  console.log('Es administrador');
}

// Verificar si tiene uno de varios roles
if (hasRole(userRole, ['mecanico', 'admin'])) {
  console.log('Puede atender solicitudes');
}

// Obtener nombre y emoji del rol
const roleName = getRoleName('mecanico'); // "Mecánico"
const roleEmoji = getRoleEmoji('admin');   // "⚡"

// ----------------------------------------------------------------------------
// Ejemplo 5: Actualizar perfil
// ----------------------------------------------------------------------------
import { updateUserProfile } from './src/services/supabaseService';

async function actualizarPerfil() {
  const { user, refreshProfile } = useAuth();
  
  const { data, error } = await updateUserProfile(user.id, {
    nombre: 'Nuevo Nombre',
    telefono: '1234567890',
  });

  if (!error) {
    await refreshProfile(); // Actualizar contexto
  }
}

// ============================================================================
// 🛡️ SEGURIDAD IMPLEMENTADA
// ============================================================================
/*
   NIVEL CLIENTE (React Native):
   ✓ Componente RoleGuard oculta UI según rol
   ✓ Hook useAuth() provee userRole
   ✓ Utilidades en roleUtils.ts
   
   NIVEL SERVIDOR (Supabase RLS):
   ✓ Clientes solo ven sus propias solicitudes
   ✓ Mecánicos ven todas las solicitudes
   ✓ Admins tienen acceso completo
   ✓ NADIE puede cambiar su propio rol
   
   ⚠️ IMPORTANTE:
   - RLS es la seguridad REAL
   - El código del cliente puede ser modificado
   - Siempre valida permisos en el servidor
*/

// ============================================================================
// 🎨 ROLES DISPONIBLES
// ============================================================================
/*
   cliente  👤  Crear y ver sus propias solicitudes
   mecanico 🔧  Ver y atender todas las solicitudes
   admin    ⚡  Acceso total, gestionar usuarios
   
   Por defecto: todos los usuarios nuevos son 'cliente'
*/

// ============================================================================
// 📚 ARCHIVOS DEL SISTEMA
// ============================================================================
/*
   Nuevos:
   ├── src/components/RoleGuard.tsx         # Proteger pantallas
   ├── src/utils/roleUtils.ts               # Funciones auxiliares
   ├── src/screens/MechanicDashboardScreen.tsx  # Ejemplo
   └── src/screens/RoleBasedNavigationExample.tsx  # Demo
   
   Modificados:
   ├── src/context/AuthContext.tsx          # Incluye userRole
   ├── src/services/supabaseService.ts      # getUserProfile()
   └── src/screens/ProfileScreen.tsx        # Muestra rol
   
   Documentación:
   ├── SUPABASE_SECURITY.md        # SQL para RLS
   ├── ROLE_SYSTEM_GUIDE.md        # Guía completa
   └── ROLE_SYSTEM_README.md       # Resumen ejecutivo
*/

// ============================================================================
// ✅ CHECKLIST DE IMPLEMENTACIÓN
// ============================================================================
/*
   [ ] 1. Ejecutar SQL de SUPABASE_SECURITY.md
   [ ] 2. Verificar que tabla 'profiles' existe
   [ ] 3. Verificar que RLS está habilitado
   [ ] 4. Crear un usuario de prueba
   [ ] 5. Asignar rol 'mecanico' a usuario de prueba
   [ ] 6. Probar acceso con diferentes roles
   [ ] 7. Verificar que RLS bloquea accesos no autorizados
*/

// ============================================================================
// 🆘 SOLUCIÓN DE PROBLEMAS
// ============================================================================
/*
   Problema: "No veo los datos aunque tengo permiso"
   Solución: Verifica que RLS esté habilitado y políticas creadas
   
   Problema: "El rol no se actualiza en la app"
   Solución: Llama a refreshProfile() o reinicia la app
   
   Problema: "Quiero añadir un nuevo rol"
   Solución: 
   1. Actualiza el CHECK en tabla profiles
   2. Añade políticas RLS para el nuevo rol
   3. Actualiza type UserRole en roleUtils.ts
*/

export {};
