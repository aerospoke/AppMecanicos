import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function PruebasScreen() {
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<Record<string, { ok: boolean; detail?: string }>>({});
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  const log = (m: string) => setLogs((prev) => [...prev, m]);
  const set = (k: string, ok: boolean, detail?: string) => setResult((r) => ({ ...r, [k]: { ok, detail } }));

  const runDiagnostics = async () => {
    setLogs([]);
    setResult({});

    // 1) API key presence (ENV or app.json config)
    const configKey = (Constants?.expoConfig as any)?.android?.config?.googleMaps?.apiKey
      || (Constants?.expoConfig as any)?.ios?.config?.googleMapsApiKey
      || '';
    const envKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || configKey || '';

    console.log("🚀 ~ runDiagnostics ~ envKey:", envKey)



    if (envKey) {
      set('apiKeyEnv', true, envKey === configKey ? 'Key desde app.json' : 'ENV KEY presente');
    } else {
      set('apiKeyEnv', false, 'Falta EXPO_PUBLIC_GOOGLE_MAPS_API_KEY/GOOGLE_MAPS_API_KEY o app.json');
    }

    // 2) Location services + permissions
    try {
      const services = await Location.hasServicesEnabledAsync();
      set('servicesEnabled', services, services ? 'Servicios de ubicación activos' : 'Servicios de ubicación desactivados');
      log(`Servicios ubicación: ${services}`);

      const { status } = await Location.requestForegroundPermissionsAsync();
      set('permission', status === 'granted', `Permiso: ${status}`);
      log(`Permiso ubicación: ${status}`);

      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCurrentLocation(coords);
          set('getLocation', true, `${coords.latitude}, ${coords.longitude}`);
          log(`Ubicación: ${coords.latitude}, ${coords.longitude}`);
        } catch (e: any) {
          set('getLocation', false, e?.message || String(e));
          log(`Error getLocation: ${e?.message || String(e)}`);
        }
      }
    } catch (e: any) {
      set('permission', false, e?.message || String(e));
    }

    // 3) Directions API test (simple HEAD/GET)
    if (envKey) {
      try {
        const origin = currentLocation || { latitude: 4.7110, longitude: -74.0721 };
        const dest = { latitude: 4.65, longitude: -74.1 };
        console.log("🚀 ~ runDiagnostics ~ envKey: 2 ", envKey)
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}&key=${envKey}`;
        console.log("🚀 ~ runDiagnostics ~ url:", url)
        const res = await fetch(url);
        console.log("🚀 ~ runDiagnostics ~ res:", res)
        const json = await res.json();
        const ok = json?.status === 'OK' || json?.routes?.length >= 0; // En algunos entornos devuelve ZERO_RESULTS
        set('directions', !!ok, `status=${json?.status}`);
      } catch (e: any) {
        set('directions', false, e?.message || String(e));
      }
    }

    // 4) Map render test: center on location/default
    setTimeout(() => {
      if (mapRef.current) {
        const target = currentLocation || { latitude: 4.7110, longitude: -74.0721 };
        mapRef.current.animateToRegion({
          ...target,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 600);
        set('mapRender', true, 'MapView render llamado');
      }
    }, 300);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const Item = ({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) => (
    <View style={styles.item}>
      <MaterialIcons name={ok ? 'check-circle' : 'error'} size={20} color={ok ? '#10b981' : '#ef4444'} />
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={[styles.itemDetail, { color: ok ? '#6b7280' : '#ef4444' }]}>{detail || ''}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Pruebas / Diagnóstico</Text>
        <Text style={styles.subtitle}>Plataforma: {Platform.OS}</Text>

        <View style={styles.card}>
          <Item label="API Key (ENV)" ok={!!result.apiKeyEnv?.ok} detail={result.apiKeyEnv?.detail} />
          <Item label="Servicios de Ubicación" ok={!!result.servicesEnabled?.ok} detail={result.servicesEnabled?.detail} />
          <Item label="Permiso de Ubicación" ok={!!result.permission?.ok} detail={result.permission?.detail} />
          <Item label="Obtener Ubicación" ok={!!result.getLocation?.ok} detail={result.getLocation?.detail} />
          <Item label="Directions API" ok={!!result.directions?.ok} detail={result.directions?.detail} />
          <Item label="Render de Mapa" ok={!!result.mapRender?.ok} detail={result.mapRender?.detail} />
        </View>

        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ width: '100%', height: 260 }}
            initialRegion={{
              latitude: currentLocation?.latitude ?? 4.7110,
              longitude: currentLocation?.longitude ?? -74.0721,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            loadingEnabled
            loadingIndicatorColor="#3b82f6"
          >
            {currentLocation && (
              <Marker coordinate={currentLocation} title="Tu ubicación" />
            )}
          </MapView>
        </View>

        <View style={styles.card}>
          <Text style={styles.logsTitle}>Logs</Text>
          {logs.map((l, i) => (
            <Text key={i} style={styles.logLine}>• {l}</Text>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={runDiagnostics}>
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.buttonText}>Re-ejecutar pruebas</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 6 },
  subtitle: { color: '#6b7280', marginBottom: 12 },
  card: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  item: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemLabel: { marginLeft: 8, fontWeight: '500', color: '#111827', flex: 0 },
  itemDetail: { marginLeft: 8, flex: 1 },
  mapWrap: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
  logsTitle: { fontWeight: '600', color: '#111827', marginBottom: 8 },
  logLine: { color: '#374151', marginBottom: 4 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
});
