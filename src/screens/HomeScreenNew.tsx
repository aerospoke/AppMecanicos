import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { isMecanico } from '../utils/roleUtils';
import { supabase } from '../config/supabase';

export default function HomeScreen({ onNavigateToProfile, onNavigateToServiceRequest, onNavigateToMechanicDashboard }) {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const webViewRef = useRef(null);

  useEffect(() => {
    loadLocationAndServices();
  }, []);

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

      // Obtener solicitudes de servicio activas (pending e in_progress)
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!error && data) {
        setServiceRequests(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleRequestAssistance = () => {
    onNavigateToServiceRequest();
  };

  // Generar HTML dinámico con las ubicaciones reales
  const generateMapHTML = () => {
    const centerLat = currentLocation?.latitude || 4.7110;
    const centerLng = currentLocation?.longitude || -74.0721;

    // Generar código JavaScript para los marcadores de servicios
    const serviceMarkers = serviceRequests.map((service, index) => {
      const statusColor = service.status === 'pending' ? '#f59e0b' : '#10b981';
      const statusText = service.status === 'pending' ? 'Pendiente' : 'En Progreso';
      const serviceEmoji = service.service_icon || '🔧';
      
      return `
const service${index} = L.marker([${service.latitude}, ${service.longitude}], { 
  icon: L.divIcon({
    className: 'custom-icon',
    html: '<div style="background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white; font-size: 18px;">${serviceEmoji}</div>',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  })
}).addTo(map);

service${index}.bindPopup(\`
  <div class="popup-title">${serviceEmoji} ${service.service_name}</div>
  <div class="popup-detail">
    👤 ${service.user_email}<br>
    📝 ${service.service_description || 'Sin descripción'}<br>
    📊 Estado: ${statusText}
    ${service.mechanic_name ? '<br>🔧 Atendido por: ' + service.mechanic_name : ''}
  </div>
\`, {
  className: 'service-popup'
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
  .custom-popup .leaflet-popup-content-wrapper {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 16px;
    padding: 4px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }
  .custom-popup .leaflet-popup-content {
    margin: 12px 16px;
    font-size: 14px;
    line-height: 1.5;
  }
  .custom-popup .leaflet-popup-tip {
    background: #764ba2;
  }
  .user-popup .leaflet-popup-content-wrapper {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }
  .user-popup .leaflet-popup-tip {
    background: #2563eb;
  }
  .service-popup .leaflet-popup-content-wrapper {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  }
  .service-popup .leaflet-popup-tip {
    background: #7c3aed;
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
        key={serviceRequests.length} // Forzar recarga cuando cambien los servicios
      />
      
      <View style={styles.locationButtons}>
        {/* Botón para clientes: Solicitar Mecánico */}
        {userRole === 'cliente' && (
          <TouchableOpacity 
            style={styles.locationBtn}
            onPress={handleRequestAssistance}
          >
            <MaterialIcons name="build" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Solicitar Mecánico</Text>
          </TouchableOpacity>
        )}

        {/* Botón para mecánicos y admins: Ver Solicitudes */}
        {isMecanico(userRole) && (
          <TouchableOpacity 
            style={[styles.locationBtn, styles.mechanicBtn]}
            onPress={onNavigateToMechanicDashboard}
          >
            <MaterialIcons name="assignment" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Ver Solicitudes</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={styles.settingsBtn}
        onPress={onNavigateToProfile}
      >
        <MaterialIcons name="settings" size={28} color="#667eea" />
      </TouchableOpacity>
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
  locationButtons: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
});
