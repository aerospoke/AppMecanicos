import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput, Modal, Switch } from 'react-native';
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
  const { user, userProfile, userRole, refreshProfile } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<string>('Cargando...');
  
  // Estados para editar perfil
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para notificaciones
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  
  // Estados para privacidad
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Estados para ayuda
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    loadPushToken();
    // Cargar datos actuales del perfil
    if (userProfile) {
      setEditNombre(userProfile.nombre || '');
      setEditTelefono(userProfile.telefono || '');
    }
  }, [user, userProfile]);

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

  // 🔥 FUNCIÓN REAL: Editar perfil en Supabase
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nombre: editNombre.trim(),
          telefono: editTelefono.trim(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Refrescar el perfil en el contexto
      await refreshProfile();
      
      Alert.alert('Perfil Actualizado', 'Tu información se guardó correctamente');
      setShowEditModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  // 🔥 FUNCIÓN REAL: Guardar preferencias de notificaciones
  const handleSaveNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notif_enabled: notifEnabled,
          notif_sound: notifSound,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      Alert.alert('✅ Configuración Guardada', 'Tus preferencias se actualizaron');
      setShowNotifModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar la configuración');
    }
  };

  // 🔥 FUNCIÓN REAL: Eliminar cuenta (con confirmación)
  const handleDeleteAccount = async () => {
    Alert.alert(
      ' Eliminar Cuenta',
      'Esta acción es irreversible. ¿Estás seguro de que deseas eliminar tu cuenta permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Eliminar perfil de Supabase
              const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user?.id);
              
              if (error) throw error;
              
              // Cerrar sesión
              await signOut();
              Alert.alert('Cuenta Eliminada', 'Tu cuenta ha sido eliminada correctamente');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar la cuenta');
            }
          }
        }
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
              <Text style={styles.infoLabel}>Usuario desde:</Text>
              <Text style={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString()}
              </Text>
            </View>
          </>
        )}
     

      {/* DEBUG: Push Token Status */}
      {/* <View style={styles.debugCard}>
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
        
        <TouchableOpacity 
          style={[styles.testButton, { backgroundColor: '#10b981', marginTop: 10 }]} 
          onPress={() => navigation.navigate('TestSupabase')}
        >
          <Text style={styles.testButtonText}>🔥 Probar Supabase READ/WRITE</Text>
        </TouchableOpacity>
      </View> */}

      
        <Text style={styles.cardTitle}>Configuración</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowEditModal(true)}
        >
          <MaterialIcons name="edit" size={20} color="#3b82f6" />
          <Text style={styles.actionButtonText}>Editar Perfil</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowNotifModal(true)}
        >
          <MaterialIcons name="notifications" size={20} color="#f59e0b" />
          <Text style={styles.actionButtonText}>Notificaciones</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowPrivacyModal(true)}
        >
          <MaterialIcons name="lock" size={20} color="#10b981" />
          <Text style={styles.actionButtonText}>Privacidad</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowHelpModal(true)}
        >
          <MaterialIcons name="help" size={20} color="#8b5cf6" />
          <Text style={styles.actionButtonText}>Ayuda</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Pruebas')}
        >
          <MaterialIcons name="science" size={20} color="#3b82f6" />
          <Text style={styles.actionButtonText}>Pruebas (Diagnóstico)</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Versión 1.0.0</Text>
      </View>
    </ScrollView>

    {/* 🔥 MODAL REAL: Editar Perfil */}
    <Modal
      visible={showEditModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={editNombre}
              onChangeText={setEditNombre}
              placeholder="Tu nombre completo"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={editTelefono}
              onChangeText={setEditTelefono}
              placeholder="+57 300 123 4567"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* 🔥 MODAL REAL: Notificaciones */}
    <Modal
      visible={showNotifModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowNotifModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔔 Notificaciones</Text>
            <TouchableOpacity onPress={() => setShowNotifModal(false)}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Activar Notificaciones</Text>
              <Text style={styles.settingDesc}>Recibe alertas de servicios</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={notifEnabled ? '#3b82f6' : '#f3f4f6'}
            />
          </View>

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Sonido</Text>
              <Text style={styles.settingDesc}>Reproducir sonido al recibir notificación</Text>
            </View>
            <Switch
              value={notifSound}
              onValueChange={setNotifSound}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={notifSound ? '#3b82f6' : '#f3f4f6'}
            />
          </View>

          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveNotifications}
          >
            <Text style={styles.saveButtonText}>💾 Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* 🔥 MODAL REAL: Privacidad */}
    <Modal
      visible={showPrivacyModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPrivacyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔒 Privacidad</Text>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.privacyContent}>
            <Text style={styles.privacySection}>📍 Ubicación</Text>
            <Text style={styles.privacyText}>
              Tu ubicación se comparte solo cuando solicitas un servicio o estás atendiendo uno como mecánico.
            </Text>

            <Text style={styles.privacySection}>📞 Datos de Contacto</Text>
            <Text style={styles.privacyText}>
              Tu teléfono y correo son visibles solo para los mecánicos asignados a tu servicio.
            </Text>

            <Text style={styles.privacySection}>🔐 Seguridad</Text>
            <Text style={styles.privacyText}>
              Todos tus datos están protegidos con cifrado end-to-end y almacenados en servidores seguros.
            </Text>
          </ScrollView>

          <TouchableOpacity 
            style={[styles.deleteButton, { backgroundColor: '#ef4444' }]}
            onPress={handleDeleteAccount}
          >
            <MaterialIcons name="delete-forever" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Eliminar mi cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* 🔥 MODAL REAL: Ayuda */}
    <Modal
      visible={showHelpModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowHelpModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>❓ Ayuda</Text>
            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.helpContent}>
            <TouchableOpacity style={styles.helpItem}>
              <MaterialIcons name="phone" size={24} color="#3b82f6" />
              <View style={styles.helpItemText}>
                <Text style={styles.helpItemTitle}>Soporte Técnico</Text>
                <Text style={styles.helpItemDesc}>Llama al: +57 300 123 4567</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpItem}>
              <MaterialIcons name="email" size={24} color="#10b981" />
              <View style={styles.helpItemText}>
                <Text style={styles.helpItemTitle}>Email</Text>
                <Text style={styles.helpItemDesc}>soporte@appmecanicos.com</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpItem}>
              <MaterialIcons name="chat" size={24} color="#f59e0b" />
              <View style={styles.helpItemText}>
                <Text style={styles.helpItemTitle}>WhatsApp</Text>
                <Text style={styles.helpItemDesc}>Chat en vivo 24/7</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpItem}>
              <MaterialIcons name="description" size={24} color="#8b5cf6" />
              <View style={styles.helpItemText}>
                <Text style={styles.helpItemTitle}>Preguntas Frecuentes</Text>
                <Text style={styles.helpItemDesc}>Consulta nuestro FAQ</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    marginVertical: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
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
  // Estilos para modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
    color: '#6b7280',
  },
  privacyContent: {
    maxHeight: 400,
  },
  privacySection: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  helpContent: {
    maxHeight: 400,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  helpItemText: {
    flex: 1,
  },
  helpItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  helpItemDesc: {
    fontSize: 14,
    color: '#6b7280',
  },
});
