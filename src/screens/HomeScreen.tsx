import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, Modal, ScrollView, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { isMecanico } from '../utils/roleUtils';
import { supabase } from '../config/supabase';
import { createServiceRequest } from '../services/supabaseService';
import { sendPushToMechanics } from '../services/notificationService';
import { startMechanicTracking, stopMechanicTracking, subscribeMechanicLocation, updateServiceStatus } from '../services/trackingService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { styles } from './HomeScreen.styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

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
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeDistance, setRouteDistance] = useState<string>('');
  const [routeDuration, setRouteDuration] = useState<string>('');
  const [mechanicLocation, setMechanicLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  // Estado local para mantener el servicio actualizado (mecánico)
  const [activeServiceForMechanic, setActiveServiceForMechanic] = useState<ServiceRequest | null>(null);
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
      setActiveServiceForMechanic(selectedServiceFromDashboard);
    }
  }, [route.params?.selectedService]);

  const checkMyActiveService = async () => {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('user_id', user?.id)
      .in('status', ['pending', 'accepted', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      const service = data[0];
      setMyActiveService(service);

      // Si el servicio fue aceptado y hay un mecánico asignado
      // Suscribirse a su ubicación en tiempo real
      if (service.mechanic_id && service.status === 'accepted') {
        console.log('👀 Suscribiéndose a ubicación del mecánico...');
        
        const subscription = subscribeMechanicLocation(
          service.id,
          (location) => {
            console.log('📍 Mecánico actualizado:', location);
            setMechanicLocation({
              latitude: location.latitude,
              longitude: location.longitude,
            });

            // Actualizar ruta si es necesario
            if (currentLocation) {
              getDirections(location, {
                latitude: service.latitude,
                longitude: service.longitude,
              });
            }
          }
        );

        // Limpiar suscripción al desmontar
        return () => {
          subscription.unsubscribe();
        };
      }
    }
  };

  // Verificar si el mecánico ya tiene un servicio activo
  const checkMechanicHasActiveService = async (): Promise<boolean> => {
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('service_requests')
      .select('id, status, service_type')
      .eq('mechanic_id', user.id)
      .in('status', ['accepted', 'arrived', 'in_progress'])
      .limit(1);
    
    if (!error && data && data.length > 0) {
      console.log('⚠️ Mecánico ya tiene servicio activo:', data[0]);
      return true;
    }
    return false;
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
    if (!selectedServiceFromDashboard || !user) return;

    try {
      // Verificar si ya tiene un servicio activo
      const hasActiveService = await checkMechanicHasActiveService();
      if (hasActiveService) {
        Alert.alert(
          '⚠️ Servicio Activo',
          'Ya tienes un servicio en progreso. Complétalo antes de aceptar otro.',
          [{ text: 'Entendido' }]
        );
        return;
      }

      // 1. Actualizar estado a 'accepted' (mecánico en camino)
      const { error } = await supabase
        .from('service_requests')
        .update({ 
          status: 'accepted',
          mechanic_id: user.id,
        })
        .eq('id', selectedServiceFromDashboard.id);

      if (error) {
        Alert.alert('Error', 'No se pudo aceptar el servicio');
        return;
      }

      // 2. Iniciar tracking GPS del mecánico
      await startMechanicTracking(selectedServiceFromDashboard.id, user.id);

      // 3. Actualizar estado local
      setActiveServiceForMechanic({
        ...selectedServiceFromDashboard,
        status: 'accepted',
        mechanic_id: user.id,
      });

      // 4. Enviar notificación al cliente
      // TODO: Implementar sendPushToUser() para notificar al cliente
      
      Alert.alert(
        '🎯 Servicio Aceptado',
        'Tu ubicación se está compartiendo con el cliente en tiempo real.',
        [
          {
            text: 'Entendido',
            onPress: () => {
              // Quedarse en la pantalla con navegación activa
              console.log('✅ Mecánico en camino con GPS activo');
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error aceptando servicio:', error);
      Alert.alert('Error', 'No se pudo iniciar el tracking GPS');
    }
  };

  const handleArrived = async () => {
    if (!selectedServiceFromDashboard) return;

    Alert.alert(
      '📍 Confirmar Llegada',
      '¿Has llegado a la ubicación del cliente?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, he llegado',
          onPress: async () => {
            try {
              await updateServiceStatus(selectedServiceFromDashboard.id, 'arrived');
              setActiveServiceForMechanic({
                ...selectedServiceFromDashboard,
                status: 'arrived',
                mechanic_id: user?.id,
              });
              Alert.alert('✅ Llegada Confirmada', 'El cliente ha sido notificado');
              // TODO: Enviar push al cliente
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el estado');
            }
          }
        }
      ]
    );
  };

  const handleStartWork = async () => {
    if (!selectedServiceFromDashboard) return;

    try {
      await updateServiceStatus(selectedServiceFromDashboard.id, 'in_progress');
      setActiveServiceForMechanic({
        ...selectedServiceFromDashboard,
        status: 'in_progress',
        mechanic_id: user?.id,
      });
      Alert.alert('🔧 Servicio Iniciado', 'Puedes comenzar a trabajar en el vehículo');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleCompleteService = async () => {
    if (!selectedServiceFromDashboard) return;

    Alert.alert(
      '✅ Completar Servicio',
      '¿El servicio ha sido completado exitosamente?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, completar',
          onPress: async () => {
            try {
              await updateServiceStatus(selectedServiceFromDashboard.id, 'completed');
              await stopMechanicTracking();
              // Limpiar el marcador del mecánico
              setMechanicLocation(null);
              setRouteCoordinates([]);
              setRouteDistance('');
              setRouteDuration('');
              Alert.alert(
                '🎉 Servicio Completado',
                'El cliente puede calificar tu trabajo',
                [{ text: 'OK', onPress: () => navigation.navigate('MechanicDashboard') }]
              );
            } catch (error) {
              Alert.alert('Error', 'No se pudo completar el servicio');
            }
          }
        }
      ]
    );
  };

  // Función para que el mecánico cancele el servicio
  const handleMechanicCancelService = async () => {
    if (!selectedServiceFromDashboard) return;

    Alert.alert(
      '⚠️ Cancelar Servicio',
      '¿Estás seguro? Esto afectará tu calificación y el cliente será notificado.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Detener tracking GPS
              await stopMechanicTracking();
              
              // Actualizar servicio a cancelado y liberar al mecánico
              const { error } = await supabase
                .from('service_requests')
                .update({ 
                  status: 'cancelled',
                  mechanic_id: null, // Liberar el servicio
                })
                .eq('id', selectedServiceFromDashboard.id);

              if (error) {
                Alert.alert('Error', 'No se pudo cancelar el servicio');
                return;
              }

              // Limpiar estados locales
              setMechanicLocation(null);
              setRouteCoordinates([]);
              setRouteDistance('');
              setRouteDuration('');

              Alert.alert(
                'Servicio Cancelado',
                'El servicio ha sido liberado y puedes aceptar otro.',
                [{ text: 'OK', onPress: () => navigation.navigate('MechanicDashboard') }]
              );
            } catch (error) {
              console.error('Error cancelando servicio:', error);
              Alert.alert('Error', 'Ocurrió un problema al cancelar');
            }
          }
        }
      ]
    );
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
              // Limpiar el marcador del mecánico y la ruta
              setMechanicLocation(null);
              setRouteCoordinates([]);
              setRouteDistance('');
              setRouteDuration('');
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

  const getDirections = async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAncz2JIS0VyL21Ywo9gDZyQUAPPxjgrnw';
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(points);
        
        // Obtener distancia y duración
        const leg = route.legs[0];
        setRouteDistance(leg.distance.text);
        setRouteDuration(leg.duration.text);

        // Ajustar el mapa para mostrar toda la ruta
        if (mapRef.current) {
          mapRef.current.fitToCoordinates([origin, destination], {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error('Error obteniendo direcciones:', error);
    }
  };

  // Decodificar polyline de Google Maps
  const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  };

  // Llamar a getDirections cuando hay un servicio seleccionado
  useEffect(() => {
    if (selectedServiceFromDashboard && currentLocation) {
      getDirections(currentLocation, {
        latitude: selectedServiceFromDashboard.latitude,
        longitude: selectedServiceFromDashboard.longitude,
      });
    }
  }, [selectedServiceFromDashboard, currentLocation]);

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
            {/* Línea de ruta */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#3b82f6"
                strokeWidth={4}
              />
            )}

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

            {/* Marcador del mecánico en movimiento (para el cliente) */}
            {mechanicLocation && myActiveService && (
              <Marker
                coordinate={mechanicLocation}
                title="Tu Mecánico"
                description="Llegando a tu ubicación"
              >
                <View style={{ 
                  backgroundColor: '#10b981', 
                  padding: 8, 
                  borderRadius: 20,
                  borderWidth: 3,
                  borderColor: '#fff',
                }}>
                  <MaterialIcons name="build-circle" size={32} color="#fff" />
                </View>
              </Marker>
            )}
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
                  {myActiveService.status === 'pending' && 'Buscando Mecánico...'}
                  {myActiveService.status === 'accepted' && '🚗 Mecánico en camino'}
                  {myActiveService.status === 'arrived' && '📍 Mecánico ha llegado'}
                  {myActiveService.status === 'in_progress' && '🔧 Servicio en progreso'}
                </Text>
                <Text style={styles.activeBannerSubtitle}>
                  {myActiveService.service_type}
                  {routeDuration && myActiveService.status === 'accepted' && ` • Llega en ${routeDuration}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleCancelService}>
              <MaterialIcons name="close" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Banner de servicio seleccionado desde dashboard (mecánico) */}
        {activeServiceForMechanic && isMecanico(userRole) && (
          <View style={styles.serviceDetailBanner}>
            <View style={styles.serviceDetailContent}>
              <Text style={styles.serviceDetailTitle}>
                {activeServiceForMechanic.service_type}
              </Text>
              <Text style={styles.serviceDetailDesc}>
                {activeServiceForMechanic.description || 'Sin descripción'}
              </Text>
              {routeDistance && routeDuration && (
                <View style={styles.routeInfo}>
                  <View style={styles.routeInfoItem}>
                    <MaterialIcons name="directions-car" size={16} color="#6b7280" />
                    <Text style={styles.routeInfoText}>{routeDistance}</Text>
                  </View>
                  <View style={styles.routeInfoItem}>
                    <MaterialIcons name="access-time" size={16} color="#6b7280" />
                    <Text style={styles.routeInfoText}>{routeDuration}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Botones según el estado del servicio */}
            <View style={{ gap: 8, marginTop: 12 }}>
              {activeServiceForMechanic.status === 'pending' && (
                <TouchableOpacity 
                  style={styles.acceptBtn}
                  onPress={handleAcceptService}
                >
                  <Text style={styles.acceptBtnText}>✅ Aceptar Servicio</Text>
                </TouchableOpacity>
              )}

              {activeServiceForMechanic.status === 'accepted' && (
                <>
                  <TouchableOpacity 
                    style={[styles.acceptBtn, { backgroundColor: '#f59e0b' }]}
                    onPress={handleArrived}
                  >
                    <Text style={styles.acceptBtnText}>📍 He Llegado</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.acceptBtn, { backgroundColor: '#ef4444' }]}
                    onPress={handleMechanicCancelService}
                  >
                    <Text style={styles.acceptBtnText}>❌ Cancelar Servicio</Text>
                  </TouchableOpacity>
                </>
              )}

              {activeServiceForMechanic.status === 'arrived' && (
                <>
                  <TouchableOpacity 
                    style={[styles.acceptBtn, { backgroundColor: '#3b82f6' }]}
                    onPress={handleStartWork}
                  >
                    <Text style={styles.acceptBtnText}>🔧 Iniciar Trabajo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.acceptBtn, { backgroundColor: '#ef4444' }]}
                    onPress={handleMechanicCancelService}
                  >
                    <Text style={styles.acceptBtnText}>❌ Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}

              {activeServiceForMechanic.status === 'in_progress' && (
                <>
                  <TouchableOpacity 
                    style={[styles.acceptBtn, { backgroundColor: '#10b981' }]}
                    onPress={handleCompleteService}
                  >
                    <Text style={styles.acceptBtnText}>✅ Completar Servicio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.acceptBtn, { backgroundColor: '#6b7280' }]}
                    onPress={() => {
                      Alert.alert(
                        'ℹ️ Información del Servicio',
                        `Tipo: ${activeServiceForMechanic.service_type}\n\nDescripción: ${activeServiceForMechanic.description || 'Sin descripción'}\n\nEstado: Trabajando en el vehículo`,
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Text style={styles.acceptBtnText}>ℹ️ Más Info</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
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

