import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * Ejemplo de navegación adaptativa según el rol del usuario
 * 
 * IMPORTANTE: Este es solo un ejemplo. 
 * En tu App.tsx ya tienes un sistema de navegación, 
 * este componente es solo para demostrar el concepto.
 */
export default function RoleBasedNavigation() {
  const { userRole, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  // Obtener opciones de menú según el rol
  const getMenuOptions = () => {
    const commonOptions = [
      { id: 'home', icon: 'home', label: 'Inicio', roles: ['cliente', 'mecanico', 'admin'] },
      { id: 'profile', icon: 'person', label: 'Perfil', roles: ['cliente', 'mecanico', 'admin'] },
    ];

    const clienteOptions = [
      { id: 'request-service', icon: 'build', label: 'Solicitar', roles: ['cliente'] },
      { id: 'my-requests', icon: 'list', label: 'Mis Solicitudes', roles: ['cliente'] },
    ];

    const mecanicoOptions = [
      { id: 'pending-requests', icon: 'assignment', label: 'Solicitudes', roles: ['mecanico', 'admin'] },
      { id: 'my-services', icon: 'work', label: 'Mis Servicios', roles: ['mecanico', 'admin'] },
      { id: 'map', icon: 'map', label: 'Mapa', roles: ['mecanico', 'admin'] },
    ];

    const adminOptions = [
      { id: 'admin-panel', icon: 'dashboard', label: 'Admin', roles: ['admin'] },
      { id: 'users', icon: 'people', label: 'Usuarios', roles: ['admin'] },
      { id: 'stats', icon: 'bar-chart', label: 'Estadísticas', roles: ['admin'] },
    ];

    const allOptions = [...commonOptions, ...clienteOptions, ...mecanicoOptions, ...adminOptions];

    // Filtrar opciones según el rol del usuario
    return allOptions.filter(option => option.roles.includes(userRole || 'cliente'));
  };

  const menuOptions = getMenuOptions();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {userRole === 'admin' && '⚡ Panel Administrador'}
          {userRole === 'mecanico' && '🔧 Panel Mecánico'}
          {userRole === 'cliente' && '👤 Mi Panel'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Bienvenido, {userProfile?.nombre || 'Usuario'}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.contentTitle}>Pantalla: {activeTab}</Text>
        <Text style={styles.contentText}>
          Aquí iría el contenido de la pantalla "{activeTab}"
        </Text>
      </View>

      {/* Navegación dinámica según rol */}
      <View style={styles.navbar}>
        {menuOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.navItem,
              activeTab === option.id && styles.navItemActive
            ]}
            onPress={() => setActiveTab(option.id)}
          >
            <MaterialIcons 
              name={option.icon as any} 
              size={24} 
              color={activeTab === option.id ? '#667eea' : '#9ca3af'} 
            />
            <Text style={[
              styles.navLabel,
              activeTab === option.id && styles.navLabelActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Indicador de rol actual */}
      <View style={styles.roleIndicator}>
        <Text style={styles.roleText}>
          Rol activo: {userRole || 'sin asignar'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  contentText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  navbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  navItemActive: {
    backgroundColor: '#f0f4ff',
  },
  navLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  roleIndicator: {
    backgroundColor: '#667eea',
    padding: 8,
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});
