import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { createServiceRequest } from '../services/supabaseService';

export default function ServiceRequestScreen({ onNavigateBack }) {
  const [selectedService, setSelectedService] = useState(null);

  const emergencyServices = [
    { id: 1, icon: 'battery-charging-full', name: 'Batería descargada', description: 'Arranque con cables o cambio de batería', type: 'emergency' },
    { id: 2, icon: 'build-circle', name: 'Llanta ponchada', description: 'Cambio de neumático en el lugar', type: 'emergency' },
    { id: 3, icon: 'warning', name: 'No arranca el motor', description: 'Diagnóstico y reparación básica', type: 'emergency' },
    { id: 4, icon: 'local-fire-department', name: 'Sobrecalentamiento', description: 'Revisión del sistema de enfriamiento', type: 'emergency' },
    { id: 5, icon: 'lock-open', name: 'Llaves dentro del auto', description: 'Apertura de vehículo sin daños', type: 'emergency' },
  ];

  const detailServices = [
    { id: 6, icon: 'settings', name: 'Kit de distribución', description: 'Cambio completo de kit de distribución', type: 'detail' },
    { id: 7, icon: 'water-drop', name: 'Cambio de aceite', description: 'Aceite y filtro de motor', type: 'detail' },
    { id: 8, icon: 'build', name: 'Frenos', description: 'Cambio de pastillas o discos de freno', type: 'detail' },
    { id: 9, icon: 'swap-vert', name: 'Suspensión', description: 'Reparación de amortiguadores', type: 'detail' },
    { id: 10, icon: 'ac-unit', name: 'Aire acondicionado', description: 'Recarga y reparación de A/C', type: 'detail' },
    { id: 11, icon: 'navigation', name: 'Alineación y balanceo', description: 'Servicio completo de alineación', type: 'detail' },
  ];

  const handleSelectService = async (service) => {
    setSelectedService(service);
    
    // Registrar la solicitud en Supabase
    const { data, error } = await createServiceRequest({
      service_name: service.name,
      service_description: service.description,
      service_type: service.type,
      service_icon: service.icon,
    });

    if (error) {
      Alert.alert(
        '❌ Error',
        'No se pudo registrar la solicitud. Por favor, intenta de nuevo.',
        [{ text: 'Aceptar' }]
      );
      setSelectedService(null);
      return;
    }

    Alert.alert(
      '✅ Solicitud Enviada',
      `${service.name}\n\nUn mecánico se pondrá en contacto contigo pronto.`,
      [
        {
          text: 'Aceptar',
          onPress: () => {
            setSelectedService(null);
            onNavigateBack();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onNavigateBack}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔧 Solicitar Servicio</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Servicios de Emergencia */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>🚨 Servicios de Emergencia</Text>
          <Text style={styles.categorySubtitle}>Atención inmediata en el lugar</Text>
          {emergencyServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                selectedService?.id === service.id && styles.serviceCardSelected
              ]}
              onPress={() => handleSelectService(service)}
            >
              <View style={styles.serviceIconContainer}>
                <MaterialIcons name={service.icon as any} size={28} color="#667eea" />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={32} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Servicios Detallados */}
        <View style={styles.categorySection}>
          <Text style={styles.categoryTitle}>⚙️ Servicios Detallados</Text>
          <Text style={styles.categorySubtitle}>Reparaciones y mantenimiento completo</Text>
          {detailServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceCard,
                selectedService?.id === service.id && styles.serviceCardSelected
              ]}
              onPress={() => handleSelectService(service)}
            >
              <View style={styles.serviceIconContainer}>
                <MaterialIcons name={service.icon as any} size={28} color="#667eea" />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={32} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categorySection: {
    marginTop: 24,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  serviceCardSelected: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceInfo: {
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
});
