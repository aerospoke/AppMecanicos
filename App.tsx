import React, { useState } from 'react';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreenNew from './src/screens/HomeScreenNew';
import ProfileScreen from './src/screens/ProfileScreen';
import ServiceRequestScreen from './src/screens/ServiceRequestScreen';
import MechanicDashboardScreen from './src/screens/MechanicDashboardScreen';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('home');

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
    return <MechanicDashboardScreen onNavigateBack={() => setCurrentScreen('home')} />;
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
