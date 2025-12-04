import React, { useState } from 'react';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreenNew from './src/screens/HomeScreenNew';
import ProfileScreen from './src/screens/ProfileScreen';
import ServiceRequestScreen from './src/screens/ServiceRequestScreen';
import MechanicDashboardScreen from './src/screens/MechanicDashboardScreen';
import ServiceMapScreen from './src/screens/ServiceMapScreen';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedService, setSelectedService] = useState(null);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  if (currentScreen === 'service') {
    return <ServiceRequestScreen onNavigateBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'profile') {
    return <ProfileScreen onNavigateBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'mechanic-dashboard') {
    return (
      <MechanicDashboardScreen 
        onNavigateBack={() => setCurrentScreen('home')} 
        onNavigateToMap={(service) => {
          setSelectedService(service);
          setCurrentScreen('service-map');
        }}
      />
    );
  }

  if (currentScreen === 'service-map' && selectedService) {
    return (
      <ServiceMapScreen 
        onNavigateBack={() => setCurrentScreen('mechanic-dashboard')} 
        onNavigateToHome={() => setCurrentScreen('home')}
        serviceRequest={selectedService}
      />
    );
  }

  return (
    <HomeScreenNew 
      onNavigateToProfile={() => setCurrentScreen('profile')}
      onNavigateToServiceRequest={() => setCurrentScreen('service')}
      onNavigateToMechanicDashboard={() => setCurrentScreen('mechanic-dashboard')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
