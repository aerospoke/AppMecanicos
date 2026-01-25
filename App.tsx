import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Solicitar permisos de notificaciones al inicio (para todos los roles)
    registerForPushNotificationsAsync().catch((error) => {
      console.log('❌ Error solicitando permisos de notificaciones al inicio:', error);
    });
  }, []);

  return (
    <AuthProvider>
      <LocationProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </LocationProvider>
    </AuthProvider>
  );
}
