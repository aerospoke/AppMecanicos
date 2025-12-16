import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RoleGuard from '../components/RoleGuard';
import { useAuth } from '../context/AuthContext';
import { getAll, update } from '../services/supabaseService';
import { RootStackParamList } from '../navigation/AppNavigator';

type MechanicDashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MechanicDashboard'>;

/**
 * Pantalla para mecánicos - Ver y gestionar solicitudes
 */
export default function MechanicDashboardScreen() {
  const navigation = useNavigation<MechanicDashboardNavigationProp>();
  const { userProfile, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'in_progress', 'completed'

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await getAll('service_requests');
    setLoading(false);

    if (!error && data) {
      // Ordenar por más recientes primero
      const sorted = data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRequests(sorted);
    } else if (error) {
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    // Si el mecánico está aceptando el servicio, registrar su ID
    const updates: any = { status: newStatus };
    
    if (newStatus === 'in_progress' && user?.id) {
      updates.mechanic_id = user.id;
      updates.mechanic_name = userProfile?.nombre || user.email;
      updates.accepted_at = new Date().toISOString();
    }

    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await update('service_requests', requestId, updates);

    if (!error) {
      let message = `Estado actualizado a: ${getStatusText(newStatus)}`;
      if (newStatus === 'in_progress') {
        message = '✅ Has aceptado esta solicitud. Ahora te aparece como "En Proceso"';
      }
      Alert.alert('Éxito', message);
      loadRequests(); // Recargar lista
    } else {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  // Filtrar solicitudes según la pestaña activa
  const getFilteredRequests = () => {
    switch (activeTab) {
      case 'pending':
        return requests.filter(r => r.status === 'pending');
      case 'in_progress':
        return requests.filter(r => r.status === 'in_progress');
      case 'completed':
        // Solo mostrar los completados por el mecánico actual
        return requests.filter(r => 
          r.status === 'completed' && r.mechanic_id === user?.id
        );
      default:
        return requests;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Proceso';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const filteredRequests = getFilteredRequests();

  return (
    <RoleGuard allowedRoles={['mecanico', 'admin']}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🔧 Panel de Mecánico</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadRequests}>
            <MaterialIcons name="refresh" size={24} color="#667eea" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadRequests} />
          }
        >
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>
              Bienvenido, {userProfile?.nombre || 'Mecánico'}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {requests.length} solicitudes totales
            </Text>
          </View>

          {/* Pestañas de filtrado */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
              onPress={() => setActiveTab('pending')}
            >
              <View style={styles.tabContent}>
                <MaterialIcons 
                  name="pending-actions" 
                  size={18} 
                  color={activeTab === 'pending' ? '#667eea' : '#9ca3af'} 
                />
                <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                  Pendientes
                </Text>
              </View>
              <View style={[styles.badge, activeTab === 'pending' && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === 'pending' && styles.badgeTextActive]}>
                  {requests.filter(r => r.status === 'pending').length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tab, activeTab === 'in_progress' && styles.tabActive]}
              onPress={() => setActiveTab('in_progress')}
            >
              <View style={styles.tabContent}>
                <MaterialIcons 
                  name="engineering" 
                  size={18} 
                  color={activeTab === 'in_progress' ? '#667eea' : '#9ca3af'} 
                />
                <Text style={[styles.tabText, activeTab === 'in_progress' && styles.tabTextActive]}>
                  En Proceso
                </Text>
              </View>
              <View style={[styles.badge, activeTab === 'in_progress' && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === 'in_progress' && styles.badgeTextActive]}>
                  {requests.filter(r => r.status === 'in_progress').length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
              onPress={() => setActiveTab('completed')}
            >
              <View style={styles.tabContent}>
                <MaterialIcons 
                  name="done-all" 
                  size={18} 
                  color={activeTab === 'completed' ? '#667eea' : '#9ca3af'} 
                />
                <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
                  Completados
                </Text>
              </View>
              <View style={[styles.badge, activeTab === 'completed' && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === 'completed' && styles.badgeTextActive]}>
                  {requests.filter(r => r.status === 'completed' && r.mechanic_id === user?.id).length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>
            {activeTab === 'pending' && '📋 Solicitudes Pendientes'}
            {activeTab === 'in_progress' && '🔧 Servicios en Proceso'}
            {activeTab === 'completed' && '✅ Servicios que Completé'}
          </Text>

          {filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>
                {activeTab === 'pending' && '📭'}
                {activeTab === 'in_progress' && '🔧'}
                {activeTab === 'completed' && '✅'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'pending' && 'No hay solicitudes pendientes'}
                {activeTab === 'in_progress' && 'No tienes servicios en proceso'}
                {activeTab === 'completed' && 'Aún no has completado ningún servicio'}
              </Text>
            </View>
          ) : (
            filteredRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.serviceIconContainer}>
                    <Text style={styles.serviceIconText}>
                      {request.service_type === 'emergency' ? '🚨' : '⚙️'}
                    </Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.serviceName}>{request.service_name}</Text>
                    <Text style={styles.serviceDescription}>
                      {request.service_description}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="email" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{request.user_email}</Text>
                  </View>
                  
                  {request.latitude && request.longitude && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="place" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>
                        {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <MaterialIcons name="access-time" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>
                      {new Date(request.created_at).toLocaleString('es-ES')}
                    </Text>
                  </View>

                  {activeTab === 'completed' && request.completed_at && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="check-circle" size={16} color="#10b981" />
                      <Text style={[styles.detailText, { color: '#10b981' }]}>
                        Completado: {new Date(request.completed_at).toLocaleString('es-ES')}
                      </Text>
                    </View>
                  )}

                  {request.mechanic_name && activeTab !== 'completed' && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="build" size={16} color="#10b981" />
                      <Text style={[styles.detailText, { color: '#10b981', fontWeight: '600' }]}>
                        Atendido por: {request.mechanic_name}
                      </Text>
                    </View>
                  )}

                  {activeTab !== 'completed' && (
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                        {getStatusText(request.status)}
                      </Text>
                    </View>
                  )}
                </View>

                {request.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    {request.latitude && request.longitude ? (
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.mapBtn]}
                        onPress={() => navigation.navigate('Home', { selectedService: request })}
                      >
                        <MaterialIcons name="map" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Ver Ubicación en Mapa</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.noLocationNote}>
                        <MaterialIcons name="location-off" size={16} color="#ef4444" />
                        <Text style={styles.noLocationText}>Sin ubicación GPS</Text>
                      </View>
                    )}

                    <View style={styles.quickActions}>
                      <TouchableOpacity 
                        style={[styles.quickActionBtn, styles.acceptBtn]}
                        onPress={() => handleUpdateStatus(request.id, 'in_progress')}
                      >
                        <MaterialIcons name="check-circle" size={18} color="#fff" />
                        <Text style={styles.quickActionText}>Atender</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.quickActionBtn, styles.rejectBtn]}
                        onPress={() => handleUpdateStatus(request.id, 'cancelled')}
                      >
                        <MaterialIcons name="cancel" size={18} color="#fff" />
                        <Text style={styles.quickActionText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {request.status === 'in_progress' && (
                  <>
                    {request.mechanic_id === user?.id ? (
                      <View style={styles.actionButtons}>
                        {request.latitude && request.longitude && (
                          <TouchableOpacity 
                            style={[styles.actionBtn, styles.mapBtn]}
                            onPress={() => navigation.navigate('Home', { selectedService: request })}
                          >
                            <MaterialIcons name="map" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Ver Ubicación en Mapa</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.completeBtn]}
                          onPress={() => handleUpdateStatus(request.id, 'completed')}
                        >
                          <MaterialIcons name="done-all" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Marcar Completado</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.assignedNote}>
                        <MaterialIcons name="info" size={16} color="#667eea" />
                        <Text style={styles.assignedNoteText}>
                          Este servicio está siendo atendido por otro mecánico
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#f0f4ff',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabActive: {
    backgroundColor: '#f0f4ff',
    borderColor: '#667eea',
    shadowColor: '#667eea',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tabContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#667eea',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: '#667eea',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  badgeTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  requestCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceIconText: {
    fontSize: 24,
  },
  requestInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  requestDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 10,
    marginTop: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  mapBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  noLocationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  noLocationText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '500',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#10b981',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  completeBtn: {
    backgroundColor: '#667eea',
    marginTop: 16,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  assignedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  assignedNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
});
