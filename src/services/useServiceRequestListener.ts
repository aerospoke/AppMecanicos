import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { useAuth } from '../context/AuthContext';

export function useServiceRequestListener() {
  const { user } = useAuth();
  const [serviceRequest, setServiceRequest] = useState(null);

  useEffect(() => {
    if (!user) return;

    // 1. Consulta inicial para ver si ya existe un servicio creado
    const fetchInitialServiceRequest = async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'accepted', 'in_progress']) // Puedes ajustar el filtro según tus necesidades
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) setServiceRequest(data);
      else setServiceRequest(null);
    };

    fetchInitialServiceRequest();

    // 2. Suscripción en tiempo real
    const channel = supabase
      .channel('service_request_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            setServiceRequest(payload.new);
          } 
        }
      )
      .subscribe();

    // Limpia la suscripción al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return serviceRequest;
}