import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MechanicDashboardScreen from '../screens/MechanicDashboardScreen';
import TestSupabaseScreen from '../screens/TestSupabaseScreen';

// Definir tipos para la navegación
export type RootStackParamList = {
  Login: undefined;
  Home: { selectedService?: any } | undefined;
  Profile: undefined;
  MechanicDashboard: undefined;
  TestSupabase: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // El AuthContext ya maneja el loading
  }

  return (
    <Stack.Navigator
      id="RootNavigator"
      screenOptions={{
        headerShown: false,
      }}
    >
      {!user ? (
        // Usuario NO autenticado - Solo Login
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        // Usuario autenticado - Pantallas principales
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
          />
          <Stack.Screen 
            name="MechanicDashboard" 
            component={MechanicDashboardScreen}
          />
          <Stack.Screen 
            name="TestSupabase" 
            component={TestSupabaseScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
