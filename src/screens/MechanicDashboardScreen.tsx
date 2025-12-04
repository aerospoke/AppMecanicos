import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import RoleGuard from '../components/RoleGuard';
import { useAuth } from '../context/AuthContext';
import { getAll, update } from '../services/supabaseService';

/**
 * Pantalla para mecánicos - Ver y gestionar solicitudes
 */
export default function MechanicDashboardScreen({ onNavigateBack }) {
  const { userProfile, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

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
        new Date(b.created_at) - new Date(a.created_at)
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

  return (
    <RoleGuard allowedRoles={['mecanico', 'admin']}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onNavigateBack}>
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

          <Text style={styles.sectionTitle}>📋 Solicitudes de Servicio</Text>

          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No hay solicitudes</Text>
            </View>
          ) : (
            requests.map((request) => (
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

                  {request.mechanic_name && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="build" size={16} color="#10b981" />
                      <Text style={[styles.detailText, { color: '#10b981', fontWeight: '600' }]}>
                        Atendido por: {request.mechanic_name}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                      {getStatusText(request.status)}
                    </Text>
                  </View>
                </View>

                {request.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => handleUpdateStatus(request.id, 'in_progress')}
                    >
                      <MaterialIcons name="check-circle" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Atender</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleUpdateStatus(request.id, 'cancelled')}
                    >
                      <MaterialIcons name="cancel" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {request.status === 'in_progress' && (
                  <>
                    {request.mechanic_id === user?.id ? (
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.completeBtn]}
                        onPress={() => handleUpdateStatus(request.id, 'completed')}
                      >
                        <MaterialIcons name="done-all" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Marcar Completado</Text>
                      </TouchableOpacity>
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
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
