-- Funciones útiles para el sistema de calificaciones
-- Ejecutar este script DESPUÉS de crear la tabla service_ratings

-- Función para obtener el promedio de calificaciones de un mecánico
CREATE OR REPLACE FUNCTION get_mechanic_rating_average(mechanic_user_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_ratings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 2) as average_rating,
    COUNT(*)::BIGINT as total_ratings
  FROM service_ratings
  WHERE mechanic_id = mechanic_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un servicio ya fue calificado
CREATE OR REPLACE FUNCTION is_service_rated(service_request_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM service_ratings
    WHERE service_request_id = service_request_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista para ver calificaciones con información del servicio
CREATE OR REPLACE VIEW service_ratings_detailed AS
SELECT 
  sr.id,
  sr.service_request_id,
  sr.rating,
  sr.comment,
  sr.created_at,
  sr.user_id,
  sr.mechanic_id,
  sreq.service_name,
  sreq.service_type,
  sreq.status
FROM service_ratings sr
JOIN service_requests sreq ON sr.service_request_id = sreq.id;

-- Comentario en la vista
COMMENT ON VIEW service_ratings_detailed IS 'Vista con detalles completos de calificaciones y servicios';
