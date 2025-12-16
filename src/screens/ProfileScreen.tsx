import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signOut } from '../services/supabaseService';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { getRoleName, getRoleEmoji } from '../utils/roleUtils';
import { RootStackParamList } from '../navigation/AppNavigator';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { supabase } from '../config/supabase';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, userProfile, userRole } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<string>('Cargando...');

  useEffect(() => {
    loadPushToken();
  }, [user]);

  const loadPushToken = async () => {
    if (!user?.id) return;
    
    try {
      // Obtener token desde BD
      const { data, error } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', user.id)
        .single();
      
      if (data?.push_token) {
        setPushToken(data.push_token);
        setTokenStatus('✅ Token guardado en BD');
      } else {
        setTokenStatus('⚠️ Sin token en BD');
      }
    } catch (error) {
      setTokenStatus('❌ Error: ' + error);
    }
  };

  const testPushToken = async () => {
    if (!user?.id) return;
    
    setTokenStatus('🔄 Obteniendo token...');
    try {
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        setPushToken(token);
        setTokenStatus('✅ Token obtenido: ' + token.substring(0, 40) + '...');
        
        // Guardar en BD
        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', user.id);
        
        if (error) {
          setTokenStatus('❌ Error guardando en BD: ' + error.message);
          Alert.alert('Error al guardar', error.message);
        } else {
          setTokenStatus('✅ Token guardado exitosamente en BD!');
          Alert.alert('¡Éxito!', 'Token de notificaciones registrado correctamente.\n\n' + token);
        }
      } else {
        setTokenStatus('❌ Token NULL - Revisa permisos o verifica que sea dispositivo real');
        Alert.alert(
          'No se pudo obtener el token',
          'Verifica:\n\n' +
          '1. Que sea un dispositivo físico (no emulador)\n' +
          '2. Que hayas aceptado los permisos de notificaciones\n' +
          '3. Revisa la configuración de notificaciones en Android'
        );
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      setTokenStatus('❌ Excepción: ' + errorMsg);
      Alert.alert('Error', 'Excepción capturada:\n\n' + errorMsg);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas salir?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
      </TouchableOpacity>
      
      <View style={styles.header}>
        <Text style={styles.logo}>👤</Text>
        <Text style={styles.title}>Mi Perfil</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información Personal</Text>
        {user && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>
                {userProfile?.nombre || user.user_metadata?.nombre || 'No especificado'}
              </Text>
            </View>
            
            {(userProfile?.telefono || user.user_metadata?.telefono) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Teléfono:</Text>
                <Text style={styles.infoValue}>
                  {userProfile?.telefono || user.user_metadata.telefono}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rol:</Text>
              <View style={styles.roleContainer}>
                <Text style={styles.roleEmoji}>
                  {userRole ? getRoleEmoji(userRole) : '❓'}
                </Text>
                <Text style={styles.roleValue}>
                  {userRole ? getRoleName(userRole) : 'No asignado'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Usuario desde:</Text>
              <Text style={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString()}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* DEBUG: Push Token Status */}
      <View style={styles.debugCard}>
        <Text style={styles.debugTitle}>🔔 Estado Push Token</Text>
        <Text style={styles.debugStatus}>{tokenStatus}</Text>
        {pushToken && (
          <Text style={styles.debugToken} numberOfLines={2}>
            {pushToken}
          </Text>
        )}
        <TouchableOpacity style={styles.testButton} onPress={testPushToken}>
          <Text style={styles.testButtonText}>🧪 Probar Registro Token</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configuración</Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>✏️ Editar Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>🔔 Notificaciones</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>🔒 Privacidad</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>❓ Ayuda</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Versión 1.0.0</Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleEmoji: {
    fontSize: 18,
  },
  roleValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '700',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  debugCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 8,
  },
  debugStatus: {
    fontSize: 14,
    color: '#78350f',
    marginBottom: 8,
    fontWeight: '500',
  },
  debugToken: {
    fontSize: 11,
    color: '#78350f',
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
