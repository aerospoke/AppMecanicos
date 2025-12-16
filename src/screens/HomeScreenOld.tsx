import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
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

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const { userRole, user } = useAuth();
  
  const selectedServiceFromDashboard = route.params?.selectedService;
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [myActiveService, setMyActiveService] = useState(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    loadLocationAndServices();
    if (userRole === 'usuario') {
      checkMyActiveService();
    }
  }, []);

  useEffect(() => {
    // Si hay un servicio seleccionado desde el dashboard, actualizar
    if (selectedServiceFromDashboard) {
      loadLocationAndServices();
    }
  }, [route.params?.selectedService]);

  const checkMyActiveService = async () => {
    // Verificar si el usuario tiene un servicio activo
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
      // Obtener ubicación actual
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }

      // Si hay un servicio seleccionado desde dashboard, mostrar solo ese
      if (selectedServiceFromDashboard) {
        setServiceRequests([selectedServiceFromDashboard]);
        return;
      }

      // Obtener solo solicitudes de servicio en progreso
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('status', 'in_progress')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!error && data) {
        setServiceRequests(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleAcceptService = async () => {
    if (!selectedServiceFromDashboard) return;

    const updates: any = { 
      status: 'in_progress',
      mechanic_id: user?.id,
      mechanic_name: user?.email,
      accepted_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('service_requests')
      .update(updates)
      .eq('id', selectedServiceFromDashboard.id);

    if (!error) {
      Alert.alert(
        '✅ Servicio Aceptado',
        'Has aceptado esta solicitud. Ahora aparece en "En Proceso"',
        [
          {
            text: 'Entendido',
            onPress: () => {
              navigation.navigate('MechanicDashboard');
            }
          }
        ]
      );
    } else {
      Alert.alert('❌ Error', 'No se pudo aceptar el servicio');
    }
  };

  const handleRequestAssistance = () => {
    if (myActiveService) {
      // Si ya tiene un servicio activo, mostrar detalles
      Alert.alert(
        '📋 Servicio Activo',
        `Ya tienes un servicio "${myActiveService.service_name}" ${myActiveService.status === 'pending' ? 'pendiente' : 'en proceso'}.\n\nEstado: ${myActiveService.status === 'pending' ? '⏳ Esperando mecánico' : '🔧 Mecánico en camino'}`,
        [{ text: 'Entendido' }]
      );
    } else {
      // Mostrar modal de servicios
      setShowServiceModal(true);
    }
  };

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
    setShowServiceModal(false);
    
    const { data, error } = await createServiceRequest({
      service_name: service.name,
      service_description: service.description,
      service_type: service.type,
      service_icon: service.icon,
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
    });

    if (error) {
      Alert.alert('❌ Error', 'No se pudo registrar la solicitud.');
      return;
    }

    setMyActiveService(data[0]);
    
    // 🔔 Enviar notificación push a todos los mecánicos
    await sendPushToMechanics(
      '🔧 Nueva Solicitud de Servicio',
      `${service.name} - Un cliente necesita asistencia`,
      {
        serviceId: data[0]?.id,
        serviceName: service.name,
        serviceType: service.type,
      }
    );
    
    Alert.alert(
      '✅ Solicitud Enviada',
      `${service.name}\n\nUn mecánico se pondrá en contacto contigo pronto.`,
      [{ text: 'Aceptar' }]
    );
    loadLocationAndServices();
    checkMyActiveService();
  };

  // Generar HTML dinámico con las ubicaciones reales
  const generateMapHTML = () => {
    const centerLat = currentLocation?.latitude || 4.7110;
    const centerLng = currentLocation?.longitude || -74.0721;

    // Generar código JavaScript para los marcadores de servicios
    const serviceMarkers = serviceRequests.map((service, index) => {
      const statusColor = '#10b981';
      const statusText = 'En Progreso';
      
      return `
const service${index} = L.marker([${service.latitude}, ${service.longitude}], { 
  icon: L.divIcon({
    className: 'custom-icon',
    html: '<div style="background: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid ${statusColor}; font-size: 18px;">👤</div>',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  })
}).addTo(map);

service${index}.bindPopup(\`
  <div class="user-popup-content">
    <div class="user-popup-header">
      <div class="user-avatar">👤</div>
      <div class="user-info">
        <div class="user-name">${service.user_email}</div>
        <div class="status-badge status-in_progress">${statusText}</div>
      </div>
    </div>
    <div class="service-info">
      <div class="info-row">
        <span class="info-label">Servicio:</span>
        <span class="info-value">${service.service_name}</span>
      </div>
      ${service.service_description ? '<div class="info-row"><span class="info-label">Descripción:</span><span class="info-value">' + service.service_description + '</span></div>' : ''}
      ${service.mechanic_name ? '<div class="info-row"><span class="info-label">Mecánico:</span><span class="info-value">🔧 ' + service.mechanic_name + '</span></div>' : ''}
    </div>
  </div>
\`, {
  className: 'white-popup',
  maxWidth: 280
});
`;
    }).join('\n');

    return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  #map { height: 100vh; width: 100vw; }
  
  /* Modal blanco para usuarios */
  .white-popup .leaflet-popup-content-wrapper {
    background: white;
    border-radius: 16px;
    padding: 0;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  }
  .white-popup .leaflet-popup-content {
    margin: 0;
    font-size: 14px;
  }
  .white-popup .leaflet-popup-tip {
    background: white;
  }
  
  .user-popup-content {
    padding: 16px;
  }
  
  .user-popup-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-right: 12px;
    flex-shrink: 0;
  }
  
  .user-info {
    flex: 1;
    min-width: 0;
  }
  
  .user-name {
    font-weight: 700;
    font-size: 15px;
    color: #1f2937;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }
  
  .status-pending {
    background: #fef3c7;
    color: #d97706;
  }
  
  .status-in_progress {
    background: #d1fae5;
    color: #059669;
  }
  
  .service-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .info-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .info-label {
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .info-value {
    font-size: 14px;
    color: #1f2937;
    font-weight: 500;
  }
  
  /* Popup de ubicación actual */
  .user-popup .leaflet-popup-content-wrapper {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border-radius: 16px;
    padding: 4px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }
  .user-popup .leaflet-popup-content {
    margin: 12px 16px;
    font-size: 14px;
    line-height: 1.5;
  }
  .user-popup .leaflet-popup-tip {
    background: #2563eb;
  }
  .popup-title {
    font-weight: 700;
    font-size: 15px;
    margin-bottom: 4px;
  }
  .popup-detail {
    font-size: 13px;
    opacity: 0.95;
    line-height: 1.6;
  }
  
  /* Estilo para la ruta */
  .route-line {
    color: #7aea66ff;
    weight: 8;
    opacity: 0.7;
  }
</style>
</head><body><div id="map"></div>
<script>
const map = L.map('map', {
  zoomControl: true,
  attributionControl: true
}).setView([${centerLat}, ${centerLng}], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 19
}).addTo(map);

${currentLocation ? `
const userIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59,130,246,0.5); border: 3px solid white; font-size: 20px;">📍</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const userMarker = L.marker([${centerLat}, ${centerLng}], { icon: userIcon }).addTo(map);
userMarker.bindPopup('<div class="popup-title">📍 Tu Ubicación</div><div class="popup-detail">Ubicación actual</div>', {
  className: 'user-popup'
}).openPopup();
` : ''}

${serviceMarkers}

${currentLocation && serviceRequests.length > 0 ? `
// Dibujar rutas desde la ubicación actual a cada servicio
${serviceRequests.map((service, index) => `
fetch('https://router.project-osrm.org/route/v1/driving/${centerLng},${centerLat};${service.longitude},${service.latitude}?overview=full&geometries=geojson')
  .then(response => response.json())
  .then(data => {
    if (data.routes && data.routes[0]) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      
      L.polyline(coordinates, {
        color: '#ffd500ff',
        weight: 8,
        opacity: 0.7,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(map);
      
      // Enviar información de ruta al componente React Native
      const distance = (route.distance / 1000).toFixed(1);
      const duration = Math.round(route.duration / 60);
      
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'routeInfo',
        distance: distance,
        duration: duration
      }));
      
      console.log('Ruta ${index}: ' + distance + ' km, ' + duration + ' min');
    }
  })
  .catch(err => console.error('Error obteniendo ruta:', err));
`).join('\n')}
` : ''}

${serviceRequests.length > 0 ? `
// Ajustar vista para mostrar todos los marcadores
const bounds = L.latLngBounds([
  ${currentLocation ? `[${centerLat}, ${centerLng}],` : ''}
  ${serviceRequests.map(s => `[${s.latitude}, ${s.longitude}]`).join(',\n  ')}
]);
map.fitBounds(bounds, { padding: [50, 50] });
` : ''}
</script></body></html>`;
  };

  const htmlContent = generateMapHTML();

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'routeInfo') {
        setRouteInfo({
          distance: data.distance,
          duration: data.duration
        });
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleWebViewMessage}
        key={serviceRequests.length} // Forzar recarga cuando cambien los servicios
      />
      
      {/* Mostrar información de ruta */}
      {routeInfo && isMecanico(userRole) && (
        <View style={styles.routeInfoContainer}>
          <MaterialIcons name="directions-car" size={20} color="#fff" />
          <Text style={styles.routeInfoText}>
            {routeInfo.distance} km · {routeInfo.duration} min
          </Text>
        </View>
      )}
      
      <View style={styles.locationButtons}>
        {/* Botones cuando se está viendo un servicio específico desde el dashboard */}
        {selectedServiceFromDashboard && isMecanico(userRole) && (
          <>
            <TouchableOpacity 
              style={[styles.locationBtn, styles.backToListBtn]}
              onPress={() => {
                navigation.navigate('MechanicDashboard');
              }}
            >
              <MaterialIcons name="arrow-back" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Volver</Text>
            </TouchableOpacity>

            {selectedServiceFromDashboard.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.locationBtn, styles.acceptBtn]}
                onPress={handleAcceptService}
              >
                <MaterialIcons name="check-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Aceptar</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Botón para clientes: Solicitar Mecánico (solo cuando NO hay servicio seleccionado) */}
        {!selectedServiceFromDashboard && userRole === 'usuario' && (
          <TouchableOpacity 
            style={styles.locationBtn}
            onPress={handleRequestAssistance}
          >
            <MaterialIcons name="build" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Solicitar Mecánico</Text>
          </TouchableOpacity>
        )}

        {/* Botón Ver Solicitudes (solo cuando NO hay servicio seleccionado) */}
        {!selectedServiceFromDashboard && isMecanico(userRole) && (
          <TouchableOpacity 
            style={[styles.locationBtn, styles.mechanicBtn]}
            onPress={() => navigation.navigate('MechanicDashboard')}
          >
            <MaterialIcons name="assignment" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Ver Solicitudes</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={styles.settingsBtn}
        onPress={() => navigation.navigate('Profile')}
      >
        <MaterialIcons name="settings" size={28} color="#667eea" />
      </TouchableOpacity>

      {/* Modal de Servicios */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowServiceModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setShowServiceModal(false)}>
              <MaterialIcons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>🔧 Solicitar Servicio</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>🚨 Servicios de Emergencia</Text>
              <Text style={styles.categorySubtitle}>Atención inmediata en el lugar</Text>
              {emergencyServices.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
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

            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>⚙️ Servicios Detallados</Text>
              <Text style={styles.categorySubtitle}>Reparaciones y mantenimiento completo</Text>
              {detailServices.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
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
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loadingContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', zIndex: 1000,
  },
  routeInfoContainer: {
    position: 'absolute',
    bottom: 110,
    left: 125,
    backgroundColor: '#ffd500',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: '50%',
  },
  routeInfoText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  locationButtons: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  locationBtn: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 35,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mechanicBtn: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  acceptBtn: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  backToListBtn: {
    backgroundColor: '#6b7280',
    shadowColor: '#6b7280',
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  settingsBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#fff',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  backToDashboardBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#fff',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  backBtn: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
