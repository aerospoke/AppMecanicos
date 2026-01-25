import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useLocationContext } from '../../context/LocationContext';

type MarkerItem = {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
};

type PrincipalMapProps = {
  height?: number;
  initialRegion?: Region;
  markers?: MarkerItem[];
};

export default function PrincipalMap({
  height = 300,
  initialRegion,
  markers,
}: PrincipalMapProps) {
  const { location } = useLocationContext();

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
  return (
    <View style={[styles.container, { height }]}> 
      <MapView provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={resolvedRegion}>
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
