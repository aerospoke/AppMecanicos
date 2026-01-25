import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';

type LatLng = { latitude: number; longitude: number };

type LocationContextType = {
  location: LatLng | null;
  loading: boolean;
  refreshLocation: () => Promise<void>;
};

const LocationContext = createContext<LocationContextType>({
  location: null,
  loading: true,
  refreshLocation: async () => {},
});

export const useLocationContext = () => useContext(LocationContext);

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Fallback a Bogotá
        setLocation({ latitude: 4.711, longitude: -74.0721 });
        setLoading(false);
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        latitude: current.coords.latitude || 4.711,
        longitude: current.coords.longitude || -74.0721,
      });
    } catch (e) {
      // Fallback a Bogotá
      setLocation({ latitude: 4.711, longitude: -74.0721 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocationContext.Provider value={{ location, loading, refreshLocation }}>
      {children}
    </LocationContext.Provider>
  );
};
