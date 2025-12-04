import React, { useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { isMecanico } from '../utils/roleUtils';

export default function HomeScreen({ onNavigateToProfile, onNavigateToServiceRequest, onNavigateToMechanicDashboard }) {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef(null);

  const handleRequestAssistance = () => {
    onNavigateToServiceRequest();
  };

  const htmlContent = `<!DOCTYPE html>
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
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
  .user-popup .leaflet-popup-tip {
    background: #f5576c;
  }
  .mechanic-popup .leaflet-popup-content-wrapper {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
  .mechanic-popup .leaflet-popup-tip {
    background: #00f2fe;
  }
  .popup-title {
    font-weight: 700;
    font-size: 15px;
    margin-bottom: 4px;
  }
  .popup-detail {
    font-size: 13px;
    opacity: 0.95;
  }
</style>
</head><body><div id="map"></div>
<script>
const map = L.map('map', {
  zoomControl: true,
  attributionControl: true
}).setView([4.7110, -74.0721], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 19
}).addTo(map);

const userIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(245,87,108,0.5); border: 3px solid white; font-size: 20px;">📍</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const mechanicIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(79,172,254,0.5); border: 3px solid white; font-size: 18px;">🔧</div>',
  iconSize: [38, 38],
  iconAnchor: [19, 19]
});

const userMarker = L.marker([4.7110, -74.0721], { icon: userIcon }).addTo(map);
userMarker.bindPopup('<div class="popup-title">📍 Tu Ubicación</div><div class="popup-detail">Bogotá, Colombia</div>', {
  className: 'user-popup'
}).openPopup();

const mechanic1 = L.marker([4.7210, -74.0621], { icon: mechanicIcon }).addTo(map);
mechanic1.bindPopup('<div class="popup-title">🔧 Taller Premium</div><div class="popup-detail">⭐⭐⭐⭐⭐ 4.8/5<br>📍 1.2 km • Disponible ahora</div>', {
  className: 'mechanic-popup'
});

const mechanic2 = L.marker([4.7010, -74.0821], { icon: mechanicIcon }).addTo(map);
mechanic2.bindPopup('<div class="popup-title">🔧 Taller Express</div><div class="popup-detail">⭐⭐⭐⭐ 4.5/5<br>📍 0.8 km • Disponible ahora</div>', {
  className: 'mechanic-popup'
});
</script></body></html>`;

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
