import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('cliente' | 'mecanico' | 'admin')[];
  fallback?: React.ReactNode;
}

/**
 * Componente para proteger contenido basado en el rol del usuario
 * 
 * Ejemplo de uso:
 * <RoleGuard allowedRoles={['admin', 'mecanico']}>
 *   <PanelMecanico />
 * </RoleGuard>
 */
export default function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { userRole, loading } = useAuth();

  if (loading) {
    return null; // O un loading spinner
  }

  // Si el usuario no tiene el rol permitido, mostrar fallback o mensaje
  if (!userRole || !allowedRoles.includes(userRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>Acceso Restringido</Text>
        <Text style={styles.message}>
          No tienes permisos para acceder a esta sección
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});
