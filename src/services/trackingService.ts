import * as Location from 'expo-location';
import { supabase } from '../config/supabase';

/**
 * Servicio de tracking GPS para mecánicos
 * Actualiza la ubicación del mecánico cada 10 segundos mientras está en servicio activo
 */

let locationSubscription: Location.LocationSubscription | null = null;
let isTracking = false;

/**
 * Inicia el tracking GPS del mecánico
 * Se llama cuando acepta un servicio
 */
export const startMechanicTracking = async (serviceId: string, mechanicId: string) => {
  if (isTracking) {
    console.log('⚠️ Tracking ya está activo');
    return;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permisos de ubicación denegados');
    }

    isTracking = true;
    console.log('🎯 Iniciando tracking para servicio:', serviceId);

    // Actualizar cada 10 segundos o cada 20 metros
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 10000, // 10 segundos
        distanceInterval: 20, // 20 metros
      },
      async (location) => {
        const { latitude, longitude, heading, speed } = location.coords;
        
        console.log(`📍 Mecánico ubicación: ${latitude}, ${longitude}`);

        // Actualizar ubicación en Supabase
        const { error } = await supabase
          .from('service_requests')
          .update({
            mechanic_latitude: latitude,
            mechanic_longitude: longitude,
            mechanic_last_update: new Date().toISOString(),
          })
          .eq('id', serviceId)
          .eq('mechanic_id', mechanicId);

        if (error) {
          console.error('❌ Error actualizando ubicación:', error);
        } else {
          console.log('✅ Ubicación actualizada en DB');
        }
      }
    );

    console.log('✅ Tracking iniciado exitosamente');
  } catch (error) {
    console.error('❌ Error iniciando tracking:', error);
    isTracking = false;
    throw error;
  }
};

/**
 * Detiene el tracking GPS del mecánico
 * Se llama cuando completa o cancela el servicio
 */
export const stopMechanicTracking = async () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
  isTracking = false;
  console.log('🛑 Tracking detenido');
};

/**
 * Verifica si el tracking está activo
 */
export const isTrackingActive = () => isTracking;

/**
 * Suscripción en tiempo real para que el CLIENTE vea al mecánico moviéndose
 */
export const subscribeMechanicLocation = (
  serviceId: string,
  onLocationUpdate: (location: { latitude: number; longitude: number; lastUpdate: string }) => void
) => {
  console.log('👀 Cliente suscribiéndose a ubicación del mecánico');

  const subscription = supabase
    .channel(`service:${serviceId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_requests',
        filter: `id=eq.${serviceId}`,
      },
      (payload) => {
        const data = payload.new as any;
        
        if (data.mechanic_latitude && data.mechanic_longitude) {
          console.log('📍 Nueva ubicación del mecánico recibida');
          onLocationUpdate({
            latitude: data.mechanic_latitude,
            longitude: data.mechanic_longitude,
            lastUpdate: data.mechanic_last_update,
          });
        }
      }
    )
    .subscribe();

  return subscription;
};

/**
 * Calcula el tiempo estimado de llegada basado en distancia y velocidad promedio
 */
export const calculateETA = (distanceInMeters: number, speedMps: number = 13.89): number => {
  // speedMps por defecto = 50 km/h = 13.89 m/s
  const timeInSeconds = distanceInMeters / speedMps;
  return Math.round(timeInSeconds / 60); // Retorna minutos
};

/**
 * Actualiza el estado del servicio
 */
export const updateServiceStatus = async (
  serviceId: string,
  status: 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
) => {
  const { error } = await supabase
    .from('service_requests')
    .update({ status })
    .eq('id', serviceId);

  if (error) {
    console.error('❌ Error actualizando estado:', error);
    throw error;
  }

  console.log(`✅ Estado actualizado a: ${status}`);
  return true;
};
