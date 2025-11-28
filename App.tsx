import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { getCurrentUser, signIn, signOut } from './src/services/supabaseService';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    checkConnection();
    checkUser();
  }, []);

  const checkConnection = async () => {
    const result = "";
    setConnectionStatus(result);
    console.log('Estado de conexión:', result);
  };

  const checkUser = async () => {
    const { user } = await getCurrentUser();
    setUser(user);
    setLoading(false);
  };

  const handleLogin = async () => {
    // Ejemplo de login - reemplaza con tus credenciales reales
    const { data, error } = await signIn('test@example.com', 'password123');
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setUser(data.user);
      Alert.alert('Éxito', 'Sesión iniciada correctamente');
    }
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setUser(null);
      Alert.alert('Éxito', 'Sesión cerrada');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🔧 App Mecánicos</Text>
      
      {/* Estado de Conexión */}
      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>Estado de Supabase</Text>
        {connectionStatus && (
          <>
            <Text style={[
              styles.statusText,
              { color: connectionStatus.success ? '#22c55e' : '#ef4444' }
            ]}>
              {connectionStatus.message}
            </Text>
            {connectionStatus.details && (
              <Text style={styles.detailsText}>
                {JSON.stringify(connectionStatus.details, null, 2)}
              </Text>
            )}
          </>
        )}
        <Button 
          title="🔄 Verificar Conexión" 
          onPress={checkConnection}
          color="#3b82f6"
        />
      </View>

      {/* Estado de Usuario */}
      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>Sesión de Usuario</Text>
        <Text style={styles.subtitle}>
          {user ? `✅ Conectado: ${user.email}` : '⚪ No hay sesión activa'}
        </Text>
        
        {user ? (
          <Button title="Cerrar Sesión" onPress={handleLogout} color="#ef4444" />
        ) : (
          <Button title="Iniciar Sesión" onPress={handleLogin} color="#22c55e" />
        )}
      </View>
      
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 40,
    color: '#1f2937',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  detailsText: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 6,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#4b5563',
  },
});
