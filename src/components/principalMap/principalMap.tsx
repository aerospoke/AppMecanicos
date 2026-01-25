import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

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
  initialRegion = {
    latitude: -34.6037,
    longitude: -58.3816,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  },
  markers = [
    { latitude: -34.6037, longitude: -58.3816, title: 'Ubicación', description: 'Centro' },
  ],
}: PrincipalMapProps) {
  return (
    <View style={[styles.container, { height }]}> 
      <MapView provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={initialRegion}>
        {markers.map((m, idx) => (
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
