import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, Modal, ScrollView, Alert, ActivityIndicator, Linking, Platform, TextInput, Image } from 'react-native';
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
  service_name?: string;
  service_description?: string;
  latitude: number;
  longitude: number;
  mechanic_id?: string;
  created_at: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const { userRole, user } = useAuth();
  const enablePollingFallback = process.env.EXPO_PUBLIC_ENABLE_POLLING_FALLBACK !== 'false';
  
  const selectedServiceFromDashboard = route.params?.selectedService;
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showServiceDetailModal, setShowServiceDetailModal] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<{type: string, icon: string, desc: string, desc2: string, image: any} | null>(null);
  const [serviceDescription, setServiceDescription] = useState('');
  const [myActiveService, setMyActiveService] = useState<ServiceRequest | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRequest | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeDistance, setRouteDistance] = useState<string>('');
  const [routeDuration, setRouteDuration] = useState<string>('');
  const [mechanicLocation, setMechanicLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  // Estado local para mantener el servicio actualizado (mecánico)
  const [activeServiceForMechanic, setActiveServiceForMechanic] = useState<ServiceRequest | null>(null);
  // Refs para manejar suscripciones en tiempo real (cliente)
  const mechanicLocationSubRef = useRef<any>(null);
  const serviceStatusSubRef = useRef<any>(null);
  const newRequestsSubRef = useRef<any>(null); // Para notificaciones de nuevas solicitudes (mecánicos)
  const mapRef = useRef<MapView>(null);

  // Limpia la selección de servicio traída desde el dashboard del mecánico
  const clearSelectedServiceContext = () => {
    try {
      // Limpiar estados locales relacionados
      setActiveServiceForMechanic(null);
      setSelectedService(null);
      // Borrar el parámetro de ruta para evitar UI obsoleta al volver atrás
      if (route.params?.selectedService !== undefined) {
        // El cast a any evita fricciones con tipos de params opcionales
        navigation.setParams({ selectedService: undefined } as any);
      }
    } catch (e) {
      // Evitar romper el flujo por un error no crítico
      console.log('clearSelectedServiceContext error:', e);
    }
  };

  // Función para mostrar alerta de calificación al cliente
  const showRatingAlert = (service: ServiceRequest) => {
    Alert.alert(
      '🎉 ¡Servicio Completado!',
      `Tu servicio de ${service.service_name || service.service_type} ha sido completado.\n\n¿Cómo calificarías el servicio?`,
      [
        {
          text: '⭐',
          onPress: () => submitRating(service, 1),
        },
        {
          text: '⭐⭐',
          onPress: () => submitRating(service, 2),
        },
        {
          text: '⭐⭐⭐',
          onPress: () => submitRating(service, 3),
        },
        {
          text: '⭐⭐⭐⭐',
          onPress: () => submitRating(service, 4),
        },
        {
          text: '⭐⭐⭐⭐⭐',
          onPress: () => submitRating(service, 5),
        },
        {
          text: 'Después',
          style: 'cancel',
          onPress: () => {
            // Limpiar todo el estado del servicio
            setMyActiveService(null);
            setMechanicLocation(null);
            setRouteCoordinates([]);
            setRouteDistance('');
            setRouteDuration('');
          }
        }
      ],
      { cancelable: false }
    );
  };

  // Función para enviar la calificación a la tabla service_ratings
  const submitRating = async (service: ServiceRequest, rating: number) => {
    try {
      // Insertar en la nueva tabla service_ratings
      const { error } = await supabase
        .from('service_ratings')
        .insert({
          service_request_id: service.id,
          user_id: user?.id,
          mechanic_id: service.mechanic_id,
          rating: rating,
          comment: null, // Por ahora sin comentarios, se puede agregar después
        });

      if (error) {
        console.error('Error al guardar calificación:', error);
        Alert.alert('Error', 'No se pudo guardar tu calificación');
      } else {
        Alert.alert('¡Gracias!', `Has calificado el servicio con ${rating} estrella${rating > 1 ? 's' : ''}`);
        // Limpiar todo el estado del servicio
        setMyActiveService(null);
        setMechanicLocation(null);
        setRouteCoordinates([]);
        setRouteDistance('');
        setRouteDuration('');
      }
    } catch (error) {
      console.error('Error al enviar calificación:', error);
      Alert.alert('Error', 'Hubo un problema al enviar tu calificación');
    }
  };

  useEffect(() => {
    initializeMap();
    
    // Suscribirse a nuevas solicitudes si es mecánico
    if (isMecanico(userRole)) {
      subscribeToNewRequests();
    }
    
    // Limpiar suscripciones al desmontar
    return () => {
      if (newRequestsSubRef.current) {
        newRequestsSubRef.current.unsubscribe();
      }
    };
  }, [userRole]);

  // Suscribirse a nuevas solicitudes en tiempo real (para mecánicos)
  const subscribeToNewRequests = () => {
    console.log('🔔 Mecánico suscribiéndose a nuevas solicitudes desde mapa...');
    
    newRequestsSubRef.current = supabase
      .channel('new-service-requests-map')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests'
        },
        (payload) => {
          console.log('🆕 Nueva solicitud detectada en mapa:', payload.new);
          const newRequest = payload.new as ServiceRequest;
          
          // Mostrar notificación in-app
          Alert.alert(
            '🚨 Nueva Solicitud',
            `Servicio: ${newRequest.service_name || newRequest.service_type}\n${newRequest.service_description || ''}`,
            [
              {
                text: 'Ver Ubicación',
                onPress: () => {
                  // Recargar servicios primero
                  loadLocationAndServices();
                  
                  // Centrar el mapa en la nueva solicitud
                  if (mapRef.current && newRequest.latitude && newRequest.longitude) {
                    mapRef.current.animateToRegion({
                      latitude: newRequest.latitude,
                      longitude: newRequest.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }, 1000);
                  }
                  
                  // Seleccionar el servicio para mostrar detalles
                  setSelectedService(newRequest);
                }
              },
              {
                text: 'Después',
                style: 'cancel',
                onPress: () => loadLocationAndServices() // Recargar mapa
              }
            ]
          );
          
          // Recargar servicios en el mapa
          loadLocationAndServices();
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción (mapa):', status);
      });
  };

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
      
      // Centrar el mapa en la ubicación de la solicitud
      if (selectedServiceFromDashboard.latitude && selectedServiceFromDashboard.longitude) {
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: selectedServiceFromDashboard.latitude,
              longitude: selectedServiceFromDashboard.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          }
        }, 500);
      }
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
      const activeStatuses = ['accepted', 'arrived', 'in_progress'];
      if (service.mechanic_id && activeStatuses.includes(service.status) && !mechanicLocationSubRef.current) {
        console.log('👀 Suscribiéndose a ubicación del mecánico (cliente)...');
        mechanicLocationSubRef.current = subscribeMechanicLocation(
          service.id,
          (location) => {
            console.log('📍 Mecánico actualizado:', location);
            setMechanicLocation({
              latitude: location.latitude,
              longitude: location.longitude,
            });

            // Actualizar ruta hacia el cliente
            getDirections(
              { latitude: location.latitude, longitude: location.longitude },
              { latitude: service.latitude, longitude: service.longitude }
            );
          }
        );
      }
    }
  };

  // Suscripción en tiempo real al estado del servicio del CLIENTE
  useEffect(() => {
    if (!myActiveService) return;

    // Limpiar suscripción previa si existe
    if (serviceStatusSubRef.current) {
      try { serviceStatusSubRef.current.unsubscribe?.(); } catch {}
      serviceStatusSubRef.current = null;
    }

    console.log('🔄 Suscribiéndose a cambios del servicio del cliente:', myActiveService.id);
    serviceStatusSubRef.current = supabase
      .channel(`service-status:${myActiveService.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `id=eq.${myActiveService.id}` },
        (payload) => {
          const updated = payload.new as ServiceRequest;
          setMyActiveService(updated);

          // Cuando el mecánico acepta o está en estados activos, iniciar suscripción de ubicación si aún no existe
          const activeStatuses = ['accepted', 'arrived', 'in_progress'];
          if (activeStatuses.includes(updated.status) && updated.mechanic_id && !mechanicLocationSubRef.current) {
            console.log('✅ Servicio activo. Iniciando tracking de ubicación para cliente');
            mechanicLocationSubRef.current = subscribeMechanicLocation(
              updated.id,
              (location) => {
                setMechanicLocation({ latitude: location.latitude, longitude: location.longitude });
                // Calcular ruta y ETA
                getDirections(
                  { latitude: location.latitude, longitude: location.longitude },
                  { latitude: updated.latitude, longitude: updated.longitude }
                );
              }
            );
          }

          // Limpiar cuando se complete o cancele
          if (updated.status === 'completed' || updated.status === 'cancelled') {
            setMechanicLocation(null);
            setRouteCoordinates([]);
            setRouteDistance('');
            setRouteDuration('');
            if (mechanicLocationSubRef.current) {
              try { mechanicLocationSubRef.current.unsubscribe?.(); } catch {}
              mechanicLocationSubRef.current = null;
            }
            
            // Mostrar alerta de calificación cuando se complete
            if (updated.status === 'completed') {
              setTimeout(() => {
                showRatingAlert(updated);
              }, 500);
            } else if (updated.status === 'cancelled') {
              // Si se canceló, limpiar el servicio activo y notificar
              setTimeout(() => {
                setMyActiveService(null);
                Alert.alert(
                  '⚠️ Servicio Cancelado',
                  'El servicio ha sido cancelado. Puedes solicitar uno nuevo.',
                  [{ text: 'Entendido' }]
                );
              }, 500);
            }
          }
        }
      )
      .subscribe();

    return () => {
      try { serviceStatusSubRef.current?.unsubscribe?.(); } catch {}
      serviceStatusSubRef.current = null;
    };
  }, [myActiveService?.id]);

  // Fallback: Polling mientras el estado esté 'pending' para asegurar actualización automática
  useEffect(() => {
    if (!enablePollingFallback) return;
    if (!myActiveService || myActiveService.status !== 'pending') return;

    console.log('⏳ Iniciando polling de estado del servicio (cliente)');
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select('id, status, mechanic_id, latitude, longitude')
          .eq('id', myActiveService.id)
          .single();

        if (!error && data) {
          // Actualizar estado local si cambió
          if (data.status !== myActiveService.status || data.mechanic_id !== myActiveService.mechanic_id) {
            const updated: ServiceRequest = {
              ...myActiveService,
              status: data.status,
              mechanic_id: data.mechanic_id || undefined,
              latitude: data.latitude,
              longitude: data.longitude,
            };
            setMyActiveService(updated);

            // Si pasó a accepted, arrancar suscripción de ubicación
            if (updated.status === 'accepted' && updated.mechanic_id && !mechanicLocationSubRef.current) {
              console.log('✅ [Polling] Servicio aceptado. Iniciando tracking de ubicación');
              mechanicLocationSubRef.current = subscribeMechanicLocation(
                updated.id,
                (location) => {
                  setMechanicLocation({ latitude: location.latitude, longitude: location.longitude });
                  getDirections(
                    { latitude: location.latitude, longitude: location.longitude },
                    { latitude: updated.latitude, longitude: updated.longitude }
                  );
                }
              );
            }
          }
        }
      } catch (e) {
        // evitar ruido de errores intermitentes
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      console.log('🛑 Polling detenido');
    };
  }, [myActiveService?.id, myActiveService?.status, enablePollingFallback]);

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
              // Limpiar selección y params para evitar volver con UI desactualizada
              setActiveServiceForMechanic(null);
              clearSelectedServiceContext();
              // Redirigir inmediatamente al dashboard sin mostrar alert
              navigation.reset({
                index: 0,
                routes: [{ name: 'MechanicDashboard' }],
              });
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
                  status: 'pending',
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
              // Asegurar que no quede el botón de completar visible al volver
              clearSelectedServiceContext();

              Alert.alert(
                'Servicio Cancelado',
                'El servicio ha sido liberado y puedes aceptar otro.',
                [{
                  text: 'OK',
                  onPress: () =>
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'MechanicDashboard' }],
                    })
                }]
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

            try {
              const { error } = await supabase
                .from('service_requests')
                .update({ status: 'cancelled' })
                .eq('id', myActiveService.id)
                .eq('user_id', user?.id); // Asegurar que sea del usuario

              if (error) {
                console.error('Error cancelando servicio:', error);
                Alert.alert('Error', 'No se pudo cancelar el servicio');
                return;
              }

              // Limpiar suscripciones
              if (mechanicLocationSubRef.current) {
                try { mechanicLocationSubRef.current.unsubscribe(); } catch {}
                mechanicLocationSubRef.current = null;
              }
              if (serviceStatusSubRef.current) {
                try { serviceStatusSubRef.current.unsubscribe(); } catch {}
                serviceStatusSubRef.current = null;
              }

              // Limpiar estados
              setMyActiveService(null);
              setMechanicLocation(null);
              setRouteCoordinates([]);
              setRouteDistance('');
              setRouteDuration('');
              
              // Recargar servicios
              loadLocationAndServices();
              
              Alert.alert('Servicio Cancelado', 'El servicio ha sido cancelado exitosamente');
            } catch (error) {
              console.error('Error en handleCancelService:', error);
              Alert.alert('Error', 'Ocurrió un error al cancelar el servicio');
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
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
      if (!apiKey) {
        console.warn('⚠️ Google Maps API key no configurada. Define EXPO_PUBLIC_GOOGLE_MAPS_API_KEY o GOOGLE_MAPS_API_KEY.');
        return;
      }
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
                title={service.service_name || service.service_type}
                description={service.service_description || 'Sin descripción'}
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
        {myActiveService && 
         myActiveService.status !== 'completed' && 
         myActiveService.status !== 'cancelled' && (
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
                  {myActiveService.service_name || myActiveService.service_type}
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
        {activeServiceForMechanic && isMecanico(userRole) && 
         activeServiceForMechanic.status !== 'completed' && 
         activeServiceForMechanic.status !== 'cancelled' && (
          <View style={styles.serviceDetailBanner}>
            <View style={styles.serviceDetailContent}>
              <Text style={styles.serviceDetailTitle}>
                {activeServiceForMechanic.service_name || activeServiceForMechanic.service_type}
              </Text>
              <Text style={styles.serviceDetailDesc}>
                {activeServiceForMechanic.service_description || 'Sin descripción'}
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
                        `Servicio: ${activeServiceForMechanic.service_name || activeServiceForMechanic.service_type}\n\nDescripción: ${activeServiceForMechanic.service_description || 'Sin descripción'}\n\nEstado: Trabajando en el vehículo`,
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
                { type: 'Cambio de Llanta', icon: '🔧', desc: 'Cambio o reparación de llantas', desc2: "¿Tu llanta decidió 'tomar una siesta' en medio del camino? A veces el asfalto muerde, pero no te preocupes, nosotros traemos la curita (y el gato hidráulico).", image: require('../../assets/wheel-flat.png') },
                { type: 'Batería Descargada', icon: '🔋', desc: 'Auxilio con batería', desc2: "¿Tu batería se declaró en huelga de brazos caídos? Dale, que todos tenemos días de 'baja energía'. Nosotros llegamos con los cables mágicos para revivirla como en las películas. ¡Frankenstein estaría orgulloso!", image: require('../../assets/electric-damage.png') },
                { type: 'Falta de Gasolina', icon: '⛽', desc: 'Servicio de gasolina', desc2: "¿El tanque decidió hacer dieta sin avisarte? Tranquilo, hasta los mejores olvidan parar en la gasolinera. Te llevamos combustible para que tu auto deje de hacerse el dramático.", image: require('../../assets/without-gasoline.png') },
                { type: 'Remolque', icon: '🚗', desc: 'Servicio de grúa', desc2: "¿Tu auto dijo 'hoy no me levanto de la cama'? A veces necesitan un taxi VIP. Nuestra grúa lo llevará con todo el glamour que merece, como una estrella de cine en su limusina.", image: require('../../assets/grua.png') },
                { type: 'Revisión General', icon: '🔍', desc: 'Diagnóstico del vehículo', desc2: "¿Tu auto suena como orquesta desafinada? Ruidos, vibraciones, lucecitas misteriosas... Somos los detectives de motores. CSI Automotriz a tu servicio. ", image: require('../../assets/engine-dmaged.png') },
                { type: 'Otro', icon: '💡', desc: 'Otro tipo de servicio', desc2: "¿Tu problema es tan único que ni Google lo entiende? ¡Nos encantan los retos! Cuéntanos qué locura le pasó a tu auto y lo resolveremos juntos. Nada nos asusta... bueno, casi nada.", image: require('../../assets/not-idea-error.png') },
              ].map((service, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.serviceOption}
                  onPress={() => {
                    setSelectedServiceType(service);
                    setShowServiceModal(false);
                    setShowServiceDetailModal(true);
                  }}
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

      {/* Modal de detalles del servicio */}
      <Modal
        visible={showServiceDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowServiceDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modernModalContent}>
            {selectedServiceType && (
              <>
                {/* Ilustración del servicio */}
                <View style={styles.serviceImageContainer}>
                  <Image 
                    source={selectedServiceType.image} 
                    style={styles.modernServiceImage}
                    resizeMode="contain"
                  />
                </View>
                
                {/* Información del servicio */}
                <View style={styles.serviceInfoContainer}>
                  <Text style={styles.modernServiceTitle}>{selectedServiceType.type}</Text>
                  <Text style={styles.modernServiceDescription}>{selectedServiceType.desc2}</Text>
                  
                  {/* Tags de características */}
                  <View style={styles.modernServiceFeatures}>
                    <View style={styles.modernFeatureTag}>
                      <Text style={styles.modernFeatureIcon}>⚡</Text>
                      <Text style={styles.modernFeatureText}>Servicio rápido</Text>
                    </View>
                    <View style={styles.modernFeatureTag}>
                      <Text style={styles.modernFeatureIcon}>📍</Text>
                      <Text style={styles.modernFeatureText}>A domicilio</Text>
                    </View>
                    <View style={styles.modernFeatureTag}>
                      <Text style={styles.modernFeatureIcon}>✓</Text>
                      <Text style={styles.modernFeatureText}>Profesional</Text>
                    </View>
                  </View>
                </View>

                {/* Botón principal */}
                <TouchableOpacity
                  style={styles.modernConfirmBtn}
                  onPress={() => {
                    handleSelectService(selectedServiceType.type, serviceDescription || selectedServiceType.desc);
                    setShowServiceDetailModal(false);
                    setServiceDescription('');
                    setSelectedServiceType(null);
                  }}
                >
                  <Text style={styles.modernConfirmBtnText}>Solicitar Servicio</Text>
                </TouchableOpacity>

                {/* Botón volver */}
                <TouchableOpacity
                  style={styles.modernBackBtn}
                  onPress={() => {
                    setShowServiceDetailModal(false);
                    setShowServiceModal(true);
                  }}
                >
                  <Text style={styles.modernBackBtnText}>volver</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

