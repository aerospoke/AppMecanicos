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

export type PrincipalMapProps = {
  height?: DimensionValue;
  initialRegion?: Region;
  markers?: MarkerItem[];
  autoMoveOnLocation?: boolean;
  showUserLocationDot?: boolean;
  modalVisible?: boolean;
  selectedService?: any; // Add correct type if known
};

export default function PrincipalMap({
  height,
  initialRegion,
  markers,
  autoMoveOnLocation = true,
  showUserLocationDot = true,
  modalVisible,
  selectedService,
}: PrincipalMapProps) {
  console.log("🚀 ~ PrincipalMap ~ selectedService:", selectedService)
  
  const { location } = useLocationContext();
  const mapRef = useRef<MapView | null>(null);

  // Calcular la altura basada en si el modal está visible
  const mapHeight = height || ( '82%');

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
    let baseMarkers: { latitude: number; longitude: number; title?: string; description?: string }[] = [];
    if (markers && markers.length > 0) {
      baseMarkers = markers;
    } else {
      const baseLat = location?.latitude ?? -34.6037;
      const baseLng = location?.longitude ?? -58.3816;
      baseMarkers = [{ latitude: baseLat, longitude: baseLng, title: 'Tu ubicación', description: 'Ubicación actual' }];
    }
    // Si hay un servicio seleccionado con coordenadas, agregarlo como marcador especial
    if (selectedService && selectedService.latitude && selectedService.longitude) {
      baseMarkers = [
        ...baseMarkers,
        {
          latitude: selectedService.latitude,
          longitude: selectedService.longitude,
          title: selectedService.service_name || 'Servicio solicitado',
          description: selectedService.service_description || 'Ubicación del servicio',
        },
      ];
    }
    return baseMarkers;
  }, [markers, location, selectedService]);

  // Enfocar el mapa para mostrar tanto la ubicación del usuario como la del servicio seleccionado
  useEffect(() => {
    if (!mapRef.current) return;
    if (!autoMoveOnLocation) return;
    // Si hay selectedService con coordenadas y ubicación del usuario, enfocar ambos SIEMPRE
    if (
      selectedService &&
      selectedService.latitude &&
      selectedService.longitude &&
      location &&
      location.latitude &&
      location.longitude
    ) {
      mapRef.current.fitToCoordinates([
        { latitude: location.latitude, longitude: location.longitude },
        { latitude: selectedService.latitude, longitude: selectedService.longitude },
      ], {
        edgePadding: { top: 120, right: 120, bottom: 120, left: 120 },
        animated: true,
      });
    } else if (location) {
      // Si solo hay ubicación del usuario, centrar en ella
      const nextRegion: Region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: resolvedRegion.latitudeDelta ?? 0.05,
        longitudeDelta: resolvedRegion.longitudeDelta ?? 0.05,
      };
      mapRef.current.animateToRegion(nextRegion, 600);
    }
  }, [location, autoMoveOnLocation, modalVisible, selectedService, resolvedRegion.latitudeDelta, resolvedRegion.longitudeDelta]);
  return (
    <View style={[styles.container, { height: mapHeight }]}>
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
