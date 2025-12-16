import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, ScrollView, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { isMecanico } from '../utils/roleUtils';
import { supabase } from '../config/supabase';
import { createServiceRequest } from '../services/supabaseService';
import { sendPushToMechanics } from '../services/notificationService';
import { RootStackParamList } from '../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

const { width, height } = Dimensions.get('window');

interface ServiceRequest {
  id: string;
  user_id: string;
  status: string;
  service_type: string;
  latitude: number;
  longitude: number;
  description?: string;
  mechanic_id?: string;
  created_at: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const { userRole, user } = useAuth();
  
  const selectedServiceFromDashboard = route.params?.selectedService;
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [myActiveService, setMyActiveService] = useState<ServiceRequest | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRequest | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    await loadLocationAndServices();
    setIsLoadingMap(false);
    if (userRole === 'usuario') {
      checkMyActiveService();
    }
  };

  useEffect(() => {
    if (selectedServiceFromDashboard) {
      loadLocationAndServices();
      setSelectedService(selectedServiceFromDashboard);
    }
  }, [route.params?.selectedService]);

  const checkMyActiveService = async () => {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('user_id', user?.id)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setMyActiveService(data[0]);
    }
  };

  const loadLocationAndServices = async () => {
    try {
      // Ubicación por defecto (Bogotá, Colombia) para emulador/sin permisos
      const defaultLocation = {
        latitude: 4.7110,
        longitude: -74.0721,
      };

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 10,
          });
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          console.log('✅ Ubicación obtenida:', location.coords);
        } catch (locError) {
          console.log('⚠️ Error obteniendo ubicación, usando por defecto');
          setCurrentLocation(defaultLocation);
        }
      } else {
        console.log('⚠️ Permisos no concedidos, usando ubicación por defecto');
        setCurrentLocation(defaultLocation);
      }

      if (selectedServiceFromDashboard) {
        setServiceRequests([selectedServiceFromDashboard]);
        return;
      }

      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('status', 'in_progress')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!error && data) {
        setServiceRequests(data);
        console.log('📍 Servicios cargados:', data.length);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      // Establecer ubicación por defecto en caso de cualquier error (Bogotá)
      setCurrentLocation({
        latitude: 4.7110,
        longitude: -74.0721,
      });
    }
  };

  const handleAcceptService = async () => {
    if (!selectedServiceFromDashboard) return;

    const updates: any = { 
      status: 'in_progress',
      mechanic_id: user?.id,
    };

    const { error } = await supabase
      .from('service_requests')
      .update(updates)
      .eq('id', selectedServiceFromDashboard.id);

    if (error) {
      Alert.alert('Error', 'No se pudo aceptar el servicio');
    } else {
      Alert.alert('¡Éxito!', 'Has aceptado el servicio');
      navigation.navigate('MechanicDashboard');
    }
  };

  const handleCancelService = async () => {
    Alert.alert(
      'Cancelar Servicio',
      '¿Estás seguro de que deseas cancelar este servicio?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            if (!myActiveService) return;

            const { error } = await supabase
              .from('service_requests')
              .update({ status: 'cancelled' })
              .eq('id', myActiveService.id);

            if (error) {
              Alert.alert('Error', 'No se pudo cancelar el servicio');
            } else {
              setMyActiveService(null);
              loadLocationAndServices();
              Alert.alert('Servicio Cancelado', 'El servicio ha sido cancelado');
            }
          },
        },
      ]
    );
  };

  const handleSelectService = async (serviceType: string, description: string) => {
    if (!currentLocation) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
      return;
    }

    try {
      const serviceData = {
        service_name: serviceType,
        service_description: description,
        service_type: 'emergency' as const, // Todos los servicios de mecánico son de emergencia
        service_icon: getServiceIcon(serviceType),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };

      const { data, error } = await createServiceRequest(serviceData);

      if (error) {
        Alert.alert('Error', 'No se pudo crear la solicitud');
        return;
      }

      // Enviar notificación push a mecánicos
      await sendPushToMechanics(
        '🚨 Nueva Solicitud de Servicio',
        `Servicio: ${serviceType}${description ? ' - ' + description : ''}`,
        { serviceId: data.id, type: serviceType }
      );

      Alert.alert(
        '¡Solicitud Creada!',
        'Un mecánico cercano será notificado',
        [{ text: 'OK', onPress: () => {
          setShowServiceModal(false);
          checkMyActiveService();
        }}]
      );
    } catch (error) {
      console.error('Error creating service:', error);
      Alert.alert('Error', 'Ocurrió un error al crear la solicitud');
    }
  };

  const getServiceIcon = (serviceType: string): string => {
    const icons: { [key: string]: string } = {
      'Cambio de Llanta': '🔧',
      'Batería Descargada': '🔋',
      'Falta de Gasolina': '⛽',
      'Remolque': '🚗',
      'Revisión General': '🔍',
      'Otro': '💡',
    };
    return icons[serviceType] || '🔧';
  };

  const centerOnMyLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const getMarkerColor = (service: ServiceRequest) => {
    if (service.status === 'pending') return '#f59e0b';
    if (service.status === 'in_progress') return '#10b981';
    return '#6b7280';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔧 Mecánicos Cerca</Text>
        <View style={styles.headerButtons}>
          {isMecanico(userRole) && (
            <TouchableOpacity 
              style={styles.dashboardBtn}
              onPress={() => navigation.navigate('MechanicDashboard')}
            >
              <MaterialIcons name="dashboard" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <MaterialIcons name="person" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {currentLocation ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            showsTraffic={false}
            showsBuildings={true}
            showsIndoors={true}
            loadingEnabled={true}
            loadingIndicatorColor="#3b82f6"
            loadingBackgroundColor="#f9fafb"
          >
            {/* Marcadores de servicios */}
            {serviceRequests.map((service) => (
              <Marker
                key={service.id}
                coordinate={{
                  latitude: service.latitude,
                  longitude: service.longitude,
                }}
                pinColor={getMarkerColor(service)}
                title={service.service_type}
                description={service.description || 'Sin descripción'}
                onPress={() => setSelectedService(service)}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🗺️ Cargando mapa de Google...</Text>
            <Text style={styles.loadingSubtext}>
              {isLoadingMap ? 'Obteniendo tu ubicación...' : 'Casi listo...'}
            </Text>
          </View>
        )}

        {/* Botón para centrar en mi ubicación */}
        <TouchableOpacity 
          style={styles.myLocationBtn}
          onPress={centerOnMyLocation}
        >
          <MaterialIcons name="my-location" size={24} color="#1f2937" />
        </TouchableOpacity>

        {/* Botón flotante para solicitar servicio (solo usuarios) */}
        {!isMecanico(userRole) && !myActiveService && (
          <TouchableOpacity 
            style={styles.floatingBtn}
            onPress={() => setShowServiceModal(true)}
          >
            <MaterialIcons name="build" size={28} color="#fff" />
            <Text style={styles.floatingBtnText}>Solicitar Servicio</Text>
          </TouchableOpacity>
        )}

        {/* Banner de servicio activo */}
        {myActiveService && (
          <View style={styles.activeBanner}>
            <View style={styles.activeBannerContent}>
              <MaterialIcons name="build-circle" size={24} color="#10b981" />
              <View style={styles.activeBannerText}>
                <Text style={styles.activeBannerTitle}>
                  Servicio {myActiveService.status === 'pending' ? 'Pendiente' : 'En Progreso'}
                </Text>
                <Text style={styles.activeBannerSubtitle}>
                  {myActiveService.service_type}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleCancelService}>
              <MaterialIcons name="close" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Banner de servicio seleccionado desde dashboard (mecánico) */}
        {selectedServiceFromDashboard && isMecanico(userRole) && (
          <View style={styles.serviceDetailBanner}>
            <View style={styles.serviceDetailContent}>
              <Text style={styles.serviceDetailTitle}>
                {selectedServiceFromDashboard.service_type}
              </Text>
              <Text style={styles.serviceDetailDesc}>
                {selectedServiceFromDashboard.description || 'Sin descripción'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.acceptBtn}
              onPress={handleAcceptService}
            >
              <Text style={styles.acceptBtnText}>Aceptar Servicio</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modal de selección de servicio */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Qué servicio necesitas?</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.serviceList}>
              {[
                { type: 'Cambio de Llanta', icon: '🔧', desc: 'Cambio o reparación de llantas' },
                { type: 'Batería Descargada', icon: '🔋', desc: 'Auxilio con batería' },
                { type: 'Falta de Gasolina', icon: '⛽', desc: 'Servicio de gasolina' },
                { type: 'Remolque', icon: '🚗', desc: 'Servicio de grúa' },
                { type: 'Revisión General', icon: '🔍', desc: 'Diagnóstico del vehículo' },
                { type: 'Otro', icon: '💡', desc: 'Otro tipo de servicio' },
              ].map((service, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.serviceOption}
                  onPress={() => handleSelectService(service.type, service.desc)}
                >
                  <Text style={styles.serviceIcon}>{service.icon}</Text>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.type}</Text>
                    <Text style={styles.serviceDesc}>{service.desc}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dashboardBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 8,
  },
  profileBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: width,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingBtn: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  activeBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  activeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activeBannerText: {
    flex: 1,
  },
  activeBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  activeBannerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  serviceDetailBanner: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  serviceDetailContent: {
    marginBottom: 12,
  },
  serviceDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceDetailDesc: {
    fontSize: 14,
    color: '#6b7280',
  },
  acceptBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  serviceList: {
    padding: 16,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: 13,
    color: '#6b7280',
  },
});
