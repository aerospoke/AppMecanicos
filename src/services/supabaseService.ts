import { supabase } from '../config/supabase';
import { AuthError, PostgrestError } from '@supabase/supabase-js';

/**
 * Servicio principal de Supabase
 * Maneja todas las operaciones de autenticación y base de datos
 */

// ========== AUTENTICACIÓN ==========

/**
 * Registrar un nuevo usuario
 */
export const signUp = async (email: string, password: string, userData?: any) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData, // Metadata adicional del usuario
      },
    });

    if (error) throw error;

    // Crear perfil automáticamente en la tabla profiles
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          nombre: userData?.nombre || '',
          telefono: userData?.telefono || '',
          rol: 'usuario', // Rol por defecto (usuario, mecanico, admin)
        });

      if (profileError) {
        console.error('Error creando perfil:', profileError);
        // No lanzamos error aquí para no bloquear el registro
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error en signUp:', error);
    return { data: null, error: error as AuthError };
  }
};

/**
 * Iniciar sesión
 */
export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en signIn:', error);
    return { data: null, error: error as AuthError };
  }
};

/**
 * Cerrar sesión
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error en signOut:', error);
    return { error: error as AuthError };
  }
};

/**
 * Obtener el usuario actual
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return { user: null, error: error as AuthError };
  }
};

/**
 * Obtener la sesión actual
 */
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session, error: null };
  } catch (error) {
    console.error('Error al obtener sesión:', error);
    return { session: null, error: error as AuthError };
  }
};

/**
 * Recuperar contraseña
 */
export const resetPassword = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en resetPassword:', error);
    return { data: null, error: error as AuthError };
  }
};

// ========== BASE DE DATOS ==========

/**
 * Obtener todos los registros de una tabla
 */
export const getAll = async <T>(tableName: string) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) throw error;
    return { data: data as T[], error: null };
  } catch (error) {
    console.error(`Error al obtener datos de ${tableName}:`, error);
    return { data: null, error: error as PostgrestError };
  }
};

/**
 * Obtener un registro por ID
 */
export const getById = async <T>(tableName: string, id: string | number) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data: data as T, error: null };
  } catch (error) {
    console.error(`Error al obtener registro de ${tableName}:`, error);
    return { data: null, error: error as PostgrestError };
  }
};

/**
 * Crear un nuevo registro
 */
export const create = async <T>(tableName: string, newData: Partial<T>) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert(newData)
      .select()
      .single();

    if (error) throw error;
    return { data: data as T, error: null };
  } catch (error) {
    console.error(`Error al crear en ${tableName}:`, error);
    return { data: null, error: error as PostgrestError };
  }
};

/**
 * Actualizar un registro
 */
export const update = async <T>(
  tableName: string,
  id: string | number,
  updates: Partial<T>
) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as T, error: null };
  } catch (error) {
    console.error(`Error al actualizar en ${tableName}:`, error);
    return { data: null, error: error as PostgrestError };
  }
};

/**
 * Eliminar un registro
 */
export const deleteRecord = async (tableName: string, id: string | number) => {
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error(`Error al eliminar en ${tableName}:`, error);
    return { error: error as PostgrestError };
  }
};

/**
 * Búsqueda con filtros personalizados
 */
export const query = async <T>(
  tableName: string,
  column: string,
  operator: string,
  value: any
) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .filter(column, operator, value);

    if (error) throw error;
    return { data: data as T[], error: null };
  } catch (error) {
    console.error(`Error en query de ${tableName}:`, error);
    return { data: null, error: error as PostgrestError };
  }
};

// ========== PERFILES DE USUARIO ==========

/**
 * Obtener perfil del usuario con su rol
 * Tabla: profiles
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return { data: null, error: error as PostgrestError };
  }
};

/**
 * Actualizar perfil del usuario
 * Tabla: profiles
 */
export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return { data: null, error: error as PostgrestError };
  }
};

// ========== SOLICITUDES DE SERVICIO ==========

/**
 * Crear una solicitud de servicio
 * Tabla: service_requests
 */
export const createServiceRequest = async (serviceData: {
  service_name: string;
  service_description: string;
  service_type: 'emergency' | 'detail';
  latitude?: number;
  longitude?: number;
}) => {
  try {
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!user) throw new Error('Usuario no autenticado');

    // Crear el registro de solicitud
    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        user_id: user.id,
        user_email: user.email,
        service_name: serviceData.service_name,
        service_description: serviceData.service_description,
        service_type: serviceData.service_type,
        latitude: serviceData.latitude,
        longitude: serviceData.longitude,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al crear solicitud de servicio:', error);
    return { data: null, error: error as PostgrestError };
  }
};

/**
 * Actualizar el estado de una solicitud de servicio
 * Tabla: service_requests
 */
export const updateServiceRequestStatus = async (
  serviceId: string,
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
) => {
  try {
    if (!serviceId) {
      throw new Error('ID del servicio es requerido');
    }

    const { data, error } = await supabase
      .from('service_requests')
      .update({ 
        status,
      })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al actualizar estado del servicio:', error);
    return { data: null, error: error as PostgrestError };
  }
};

// ========== STORAGE (Archivos) ==========

/**
 * Subir un archivo
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File | Blob
) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al subir archivo:', error);
    return { data: null, error };
  }
};

/**
 * Obtener URL pública de un archivo
 */
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Eliminar un archivo
 */
export const deleteFile = async (bucket: string, paths: string[]) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    return { data: null, error };
  }
};

// ========== REALTIME (Suscripciones) ==========

/**
 * Suscribirse a cambios en una tabla
 */
export const subscribeToTable = (
  tableName: string,
  callback: (payload: any) => void
) => {
  const subscription = supabase
    .channel(`${tableName}_changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      callback
    )
    .subscribe();

  return subscription;
};

/**
 * Cancelar suscripción
 */
export const unsubscribe = async (subscription: any) => {
  await supabase.removeChannel(subscription);
};

export default {
  // Auth
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getSession,
  resetPassword,
  
  // Database
  getAll,
  getById,
  create,
  update,
  deleteRecord,
  query,
  
  // User Profiles
  getUserProfile,
  updateUserProfile,
  
  // Service Requests
  createServiceRequest,
  updateServiceRequestStatus,
  
  // Storage
  uploadFile,
  getPublicUrl,
  deleteFile,
  
  // Realtime
  subscribeToTable,
  unsubscribe,
};
