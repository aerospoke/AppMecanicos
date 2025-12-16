import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

/**
 * Configuración de notificaciones
 * Define cómo se comportan las notificaciones cuando llegan
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registrar dispositivo para recibir push notifications
 * Retorna el Expo Push Token que se guarda en la BD
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  console.log('🔍 Verificando si es dispositivo físico...');
  console.log('Device.isDevice:', Device.isDevice);

  // Solo funciona en dispositivos físicos (no emuladores)
  if (Device.isDevice) {
    console.log('✅ Es dispositivo físico, solicitando permisos...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    console.log('Estado de permisos actual:', existingStatus);
    
    if (existingStatus !== 'granted') {
      console.log('📝 Solicitando permisos de notificaciones...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('Resultado de permisos:', status);
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ No se otorgaron permisos para notificaciones');
      return null;
    }
    
    console.log('✅ Permisos otorgados, obteniendo token de Expo...');
    
    try {
      // Configurar canal para Android ANTES de obtener el token
      if (Platform.OS === 'android') {
        console.log('🤖 Configurando canal de notificaciones para Android...');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
        });
      }
      
      // Obtener el token de Expo con experienceId y projectId
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'b50a6bad-ca1f-4ecb-8744-468379871f0',
        // También incluir experienceId para compatibilidad
        // @ts-ignore - experienceId no está en los tipos pero funciona
        experienceId: '@aerospoke/AppMecanicos',
      });
      
      token = tokenData.data;
      console.log('📱 Push token obtenido exitosamente:', token);
    } catch (error: any) {
      console.error('❌ Error obteniendo token de Expo:', error);
      console.error('❌ Detalle del error:', error.message);
      console.error('❌ Stack:', error.stack);
      return null;
    }
  } else {
    console.log('⚠️ Las notificaciones push solo funcionan en dispositivos físicos');
  }

  return token;
}

/**
 * Guardar el token de notificación en la BD del usuario
 */
export async function savePushToken(userId: string, token: string) {
  console.log('💾 Guardando push token en BD...');
  console.log('   userId:', userId);
  console.log('   token:', token);
  
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', userId);

  if (error) {
    console.error('❌ Error guardando push token:', error);
    return { error };
  }

  console.log('✅ Push token guardado exitosamente en BD');
  return { error: null };
}

/**
 * Obtener tokens de todos los mecánicos activos
 */
export async function getMechanicTokens(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('rol', 'mecanico')
    .not('push_token', 'is', null);

  if (error) {
    console.error('❌ Error obteniendo tokens de mecánicos:', error);
    return [];
  }

  return data.map(profile => profile.push_token).filter(Boolean);
}

/**
 * Enviar notificación push a mecánicos
 * Usa la API de Expo Push Notifications
 */
export async function sendPushToMechanics(
  title: string,
  body: string,
  data?: any
) {
  try {
    // Obtener tokens de todos los mecánicos
    const mechanicTokens = await getMechanicTokens();

    if (mechanicTokens.length === 0) {
      console.log('⚠️ No hay mecánicos con tokens registrados');
      return { success: false, message: 'No hay mecánicos disponibles' };
    }

    // Preparar mensajes
    const messages = mechanicTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
      priority: 'high',
    }));

    // Enviar a la API de Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('📤 Notificaciones enviadas:', result);

    return { success: true, result };
  } catch (error) {
    console.error('❌ Error enviando notificaciones:', error);
    return { success: false, error };
  }
}

/**
 * Configurar listener para cuando se recibe una notificación
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Configurar listener para cuando el usuario toca una notificación
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
