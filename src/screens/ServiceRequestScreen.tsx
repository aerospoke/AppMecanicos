import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';

export default function ServiceRequestScreen({ onNavigateBack }) {
  const [selectedService, setSelectedService] = useState(null);

  const emergencyServices = [
    { id: 1, icon: '🔋', name: 'Batería descargada', description: 'Arranque con cables o cambio de batería', type: 'emergency' },
    { id: 2, icon: '🛞', name: 'Llanta ponchada', description: 'Cambio de neumático en el lugar', type: 'emergency' },
    { id: 3, icon: '⚠️', name: 'No arranca el motor', description: 'Diagnóstico y reparación básica', type: 'emergency' },
    { id: 4, icon: '🔥', name: 'Sobrecalentamiento', description: 'Revisión del sistema de enfriamiento', type: 'emergency' },
    { id: 5, icon: '🔓', name: 'Llaves dentro del auto', description: 'Apertura de vehículo sin daños', type: 'emergency' },
  ];

  const detailServices = [
    { id: 6, icon: '⚙️', name: 'Kit de distribución', description: 'Cambio completo de kit de distribución', type: 'detail' },
    { id: 7, icon: '🛢️', name: 'Cambio de aceite', description: 'Aceite y filtro de motor', type: 'detail' },
    { id: 8, icon: '🔧', name: 'Frenos', description: 'Cambio de pastillas o discos de freno', type: 'detail' },
    { id: 9, icon: '🔩', name: 'Suspensión', description: 'Reparación de amortiguadores', type: 'detail' },
    { id: 10, icon: '💨', name: 'Aire acondicionado', description: 'Recarga y reparación de A/C', type: 'detail' },
    { id: 11, icon: '🎯', name: 'Alineación y balanceo', description: 'Servicio completo de alineación', type: 'detail' },
  ];

  const handleSelectService = (service) => {
    setSelectedService(service);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onNavigateBack}>
          <Text style={styles.backIcon}>←</Text>
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
              <Text style={styles.serviceIcon}>{service.icon}</Text>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
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
              <Text style={styles.serviceIcon}>{service.icon}</Text>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
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
  serviceIcon: {
    fontSize: 32,
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
  arrowIcon: {
    fontSize: 32,
    color: '#9ca3af',
    fontWeight: '300',
  },
});
