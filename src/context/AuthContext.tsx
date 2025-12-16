import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase';
import { Session, User } from '@supabase/supabase-js';
import { getUserProfile } from '../services/supabaseService';
import { registerForPushNotificationsAsync, savePushToken } from '../services/notificationService';

interface UserProfile {
  id: string;
  email: string;
  nombre?: string;
  telefono?: string;
  rol: 'usuario' | 'mecanico' | 'admin';
  created_at?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  userRole: 'usuario' | 'mecanico' | 'admin' | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userProfile: null,
  userRole: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<'usuario' | 'mecanico' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    console.log('🔍 Cargando perfil de usuario:', userId);
    const { data, error } = await getUserProfile(userId);
    if (!error && data) {
      console.log('✅ Perfil cargado:', data);
      setUserProfile(data as UserProfile);
      setUserRole(data.rol as 'usuario' | 'mecanico' | 'admin');
      
      // Registrar token de notificaciones para TODOS los usuarios
      console.log('📱 Registrando push token para:', data.rol);
      registerPushToken(userId);
    } else {
      console.log('⚠️ Error cargando perfil o no existe');
      // Si no existe perfil, asignar rol por defecto 'usuario'
      setUserRole("usuario");
    }
  };

  const registerPushToken = async (userId: string) => {
    try {
      console.log('🔄 Iniciando registro de push token...');
      const token = await registerForPushNotificationsAsync();
      console.log('📱 Token obtenido:', token);
      
      if (token) {
        console.log('💾 Guardando token en BD...');
        await savePushToken(userId, token);
        console.log('✅ Token de notificaciones registrado para mecánico');
      } else {
        console.log('⚠️ No se obtuvo token (puede ser emulador)');
      }
    } catch (error) {
      console.log('❌ Error registrando token de notificaciones:', error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id);
    }
  };

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, userProfile, userRole, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
