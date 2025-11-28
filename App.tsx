import React, { useState } from 'react';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreenNew from './src/screens/HomeScreenNew';
import ProfileScreen from './src/screens/ProfileScreen';

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

  return currentScreen === 'home' 
    ? <HomeScreenNew onNavigateToProfile={() => setCurrentScreen('profile')} />
    : <ProfileScreen onNavigateBack={() => setCurrentScreen('home')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
