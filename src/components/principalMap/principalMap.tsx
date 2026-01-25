import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useLocationContext } from '../../context/LocationContext';

type MarkerItem = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
};

type PrincipalMapProps = {
  height?: DimensionValue;
  initialRegion?: Region;
  markers?: MarkerItem[];
  autoMoveOnLocation?: boolean;
  showUserLocationDot?: boolean;
};

export default function PrincipalMap({
  height = '70%',
  initialRegion,
  markers,
  autoMoveOnLocation = true,
  showUserLocationDot = true,
}: PrincipalMapProps) {
  const { location } = useLocationContext();
  const mapRef = useRef<MapView | null>(null);

  const resolvedRegion: Region = useMemo(() => {
    const baseLat = location?.latitude ?? -34.6037;
    const baseLng = location?.longitude ?? -58.3816;
    const region = initialRegion ?? {
      latitude: baseLat,
      longitude: baseLng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    return region;
  }, [initialRegion, location]);

  const resolvedMarkers: { latitude: number; longitude: number; title?: string; description?: string }[] = useMemo(() => {
    if (markers && markers.length > 0) return markers;
    const baseLat = location?.latitude ?? -34.6037;
    const baseLng = location?.longitude ?? -58.3816;
    return [{ latitude: baseLat, longitude: baseLng, title: 'Tu ubicación', description: 'Ubicación actual' }];
  }, [markers, location]);

  // Animar el mapa hacia la ubicación del usuario cuando esté disponible
  useEffect(() => {
    if (!mapRef.current) return;
    if (!location) return;
    if (!autoMoveOnLocation) return;
    const nextRegion: Region = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: resolvedRegion.latitudeDelta ?? 0.05,
      longitudeDelta: resolvedRegion.longitudeDelta ?? 0.05,
    };
    mapRef.current.animateToRegion(nextRegion, 600);
  }, [location, autoMoveOnLocation]);
  return (
    <View style={[styles.container, { height }]}> 
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={resolvedRegion}
        showsUserLocation={showUserLocationDot}
      >
        {resolvedMarkers.map((m, idx) => (
          <Marker
            key={idx}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.title}
            description={m.description}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  map: {
    flex: 1,
  },
});
