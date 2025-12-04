import React, { useState } from 'react';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreenNew from './src/screens/HomeScreenNew';
import ProfileScreen from './src/screens/ProfileScreen';
import MechanicDashboardScreen from './src/screens/MechanicDashboardScreen';

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

  if (currentScreen === 'profile') {
    return <ProfileScreen onNavigateBack={() => setCurrentScreen('home')} />;
  }

  if (currentScreen === 'mechanic-dashboard') {
    return (
      <MechanicDashboardScreen 
        onNavigateBack={() => setCurrentScreen('home')} 
        onNavigateToMap={(service) => {
          setSelectedService(service);
          setCurrentScreen('home');
        }}
      />
    );
  }

  return (
    <HomeScreenNew 
      onNavigateToProfile={() => setCurrentScreen('profile')}
      onNavigateToServiceRequest={() => {}}
      onNavigateToMechanicDashboard={() => setCurrentScreen('mechanic-dashboard')}
      selectedServiceFromDashboard={selectedService}
      onClearSelectedService={() => setSelectedService(null)}
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
