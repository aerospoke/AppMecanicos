import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

export default function TestSupabaseScreen() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  // 🔥 TEST 1: Leer datos del perfil
  const testReadProfile = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No hay usuario logueado');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      Alert.alert(
        '✅ Lectura Exitosa',
        `Nombre: ${data.nombre || 'N/A'}\n` +
        `Teléfono: ${data.telefono || 'N/A'}\n` +
        `Rol: ${data.rol}\n` +
        `Email: ${data.email}`
      );
    } catch (error: any) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 TEST 2: Escribir datos al perfil
  const testWriteProfile = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No hay usuario logueado');
      return;
    }

    setLoading(true);
    try {
      const testData = {
        nombre: 'Usuario Prueba ' + Date.now(),
        telefono: '+57 300 ' + Math.floor(Math.random() * 1000000),
      };

      const { error } = await supabase
        .from('profiles')
        .update(testData)
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert(
        '✅ Escritura Exitosa',
        `Nombre: ${testData.nombre}\n` +
        `Teléfono: ${testData.telefono}\n\n` +
        `Los datos se guardaron en Supabase!`
      );
    } catch (error: any) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 TEST 3: Contar servicios
  const testCountServices = async () => {
    setLoading(true);
    try {
      const { count, error } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      Alert.alert('✅ Conteo Exitoso', `Total de servicios: ${count || 0}`);
    } catch (error: any) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🧪 Pruebas Supabase</Text>
      <Text style={styles.subtitle}>
        Usuario: {user?.email || 'No logueado'}
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.readButton]}
          onPress={testReadProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳' : '📖'} Leer Mi Perfil
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.writeButton]}
          onPress={testWriteProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳' : '✏️'} Escribir Datos Aleatorios
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.countButton]}
          onPress={testCountServices}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳' : '📊'} Contar Servicios
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📋 Info Actual</Text>
        <Text style={styles.infoText}>Nombre: {userProfile?.nombre || 'N/A'}</Text>
        <Text style={styles.infoText}>Teléfono: {userProfile?.telefono || 'N/A'}</Text>
        <Text style={styles.infoText}>Rol: {userProfile?.rol || 'N/A'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 30,
  },
  button: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  readButton: {
    backgroundColor: '#3b82f6',
  },
  writeButton: {
    backgroundColor: '#10b981',
  },
  countButton: {
    backgroundColor: '#f59e0b',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
});
