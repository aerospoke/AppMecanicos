import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

interface ServiceMapScreenProps {
  onNavigateBack: () => void;
  onNavigateToHome?: () => void;
  serviceRequest: {
    id: string;
    user_email: string;
    service_name: string;
    service_description: string;
    service_icon: string;
    latitude: number;
    longitude: number;
    status: string;
  };
}

export default function ServiceMapScreen({ onNavigateBack, onNavigateToHome, serviceRequest }: ServiceMapScreenProps) {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mechanicLocation, setMechanicLocation] = useState(null);

  useEffect(() => {
    getMechanicLocation();
  }, []);

  const getMechanicLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setMechanicLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error obteniendo ubicación del mecánico:', error);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === 'in_progress') {
        updateData.mechanic_id = user?.id;
        updateData.mechanic_name = userProfile?.nombre || user?.email;
        updateData.accepted_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('service_requests')
        .update(updateData)
        .eq('id', serviceRequest.id);

      if (error) throw error;

      if (newStatus === 'in_progress') {
        // Si acepta el servicio, redirigir al mapa principal
        Alert.alert(
          '✅ Servicio Aceptado',
          'Has aceptado el servicio. Te redirigiremos al mapa principal.',
          [{ text: 'OK', onPress: () => onNavigateToHome?.() || onNavigateBack() }]
        );
      } else {
        // Si rechaza, volver al dashboard
        Alert.alert(
          newStatus === 'cancelled' ? '❌ Servicio Rechazado' : '✅ Actualizado',
          newStatus === 'cancelled' ? 'Has rechazado el servicio' : 'Servicio actualizado',
          [{ text: 'OK', onPress: onNavigateBack }]
        );
      }
    } catch (error) {
      console.error('Error actualizando servicio:', error);
      Alert.alert('❌ Error', 'No se pudo actualizar el servicio');
    }
  };

  const generateMapHTML = () => {
    const clientLat = serviceRequest.latitude;
    const clientLng = serviceRequest.longitude;
    const mechanicLat = mechanicLocation?.latitude || clientLat;
    const mechanicLng = mechanicLocation?.longitude || clientLng;

    // Calcular punto medio para centrar el mapa
    const centerLat = (clientLat + mechanicLat) / 2;
    const centerLng = (clientLng + mechanicLng) / 2;

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
  .client-popup .leaflet-popup-content-wrapper {
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  }
  .client-popup .leaflet-popup-tip {
    background: #f97316;
  }
  .mechanic-popup .leaflet-popup-content-wrapper {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }
  .mechanic-popup .leaflet-popup-tip {
    background: #2563eb;
  }
  .popup-title {
    font-weight: 700;
    font-size: 16px;
    margin-bottom: 6px;
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
}).setView([${centerLat}, ${centerLng}], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 19
}).addTo(map);

// Marcador del cliente
const clientIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(245,158,11,0.6); border: 4px solid white; font-size: 22px;">📍</div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

const clientMarker = L.marker([${clientLat}, ${clientLng}], { icon: clientIcon }).addTo(map);

${mechanicLocation ? `
// Marcador del mecánico
const mechanicIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(59,130,246,0.6); border: 4px solid white; font-size: 22px;">🔧</div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

const mechanicMarker = L.marker([${mechanicLat}, ${mechanicLng}], { icon: mechanicIcon }).addTo(map);

// Dibujar línea entre cliente y mecánico
const routeLine = L.polyline(
  [[${clientLat}, ${clientLng}], [${mechanicLat}, ${mechanicLng}]], 
  {
    color: '#3b82f6',
    weight: 3,
    opacity: 0.7,
    dashArray: '10, 10'
  }
).addTo(map);

// Ajustar vista para mostrar ambos marcadores
const bounds = L.latLngBounds([
  [${clientLat}, ${clientLng}],
  [${mechanicLat}, ${mechanicLng}]
]);
map.fitBounds(bounds, { padding: [80, 80] });
` : `
// Solo centrar en el cliente si no hay ubicación del mecánico
map.setView([${clientLat}, ${clientLng}], 15);
`}
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
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        onLoadEnd={() => setLoading(false)}
        key={mechanicLocation ? 'with-mechanic' : 'client-only'}
      />

      <TouchableOpacity 
        style={styles.backBtn}
        onPress={onNavigateBack}
      >
        <MaterialIcons name="arrow-back" size={24} color="#fff" />
        <Text style={styles.backBtnText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <MaterialIcons name="person" size={20} color="#667eea" />
          <Text style={styles.infoText}>{serviceRequest.user_email}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="build" size={20} color="#667eea" />
          <Text style={styles.infoText}>{serviceRequest.service_name}</Text>
        </View>
        {mechanicLocation && (
          <View style={[styles.infoRow, styles.successRow]}>
            <MaterialIcons name="location-on" size={20} color="#10b981" />
            <Text style={styles.successText}>Ubicaciones sincronizadas</Text>
          </View>
        )}

        {/* Botones de acción solo si el servicio está pendiente */}
        {serviceRequest.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleUpdateStatus('in_progress')}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Atender</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleUpdateStatus('cancelled')}
            >
              <MaterialIcons name="cancel" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: { 
    flex: 1 
  },
  loadingContainer: {
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#fff', 
    zIndex: 1000,
  },
  backBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  infoCard: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  successRow: {
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  successText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '600',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
