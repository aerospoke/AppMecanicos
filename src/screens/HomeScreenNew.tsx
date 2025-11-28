import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const [userLocation, setUserLocation] = useState({ lat: 19.4326, lng: -99.1332 });
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });
      }
    } catch (error) {
      console.log('Usando ubicación por defecto');
    }
  };

  const htmlContent = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body { margin: 0; padding: 0; } #map { height: 100vh; width: 100vw; }</style>
</head><body><div id="map"></div>
<script>
const map = L.map('map').setView([${userLocation.lat}, ${userLocation.lng}], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap', maxZoom: 19
}).addTo(map);
L.marker([${userLocation.lat}, ${userLocation.lng}]).addTo(map).bindPopup('📍 Aquí').openPopup();
L.marker([${userLocation.lat + 0.01}, ${userLocation.lng + 0.01}]).addTo(map).bindPopup('🔧 Taller 1');
L.marker([${userLocation.lat - 0.01}, ${userLocation.lng - 0.01}]).addTo(map).bindPopup('🔧 Taller 2');
</script></body></html>`;

  return (
    <View style={styles.container}>
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
    </View>
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
});
