-- Política para permitir que los usuarios actualicen sus propias solicitudes de servicio
-- Ejecutar este script en Supabase SQL Editor

-- Política: Los usuarios pueden actualizar sus propias solicitudes (para cancelar)
CREATE POLICY "Users can update their own service requests"
  ON service_requests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política alternativa más permisiva (si la anterior no funciona)
-- Descomenta si necesitas permitir más acciones
/*
DROP POLICY IF EXISTS "Users can update their own service requests" ON service_requests;

CREATE POLICY "Users can update their own service requests"
  ON service_requests
  FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    auth.uid() = mechanic_id
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() = mechanic_id
  );
*/
