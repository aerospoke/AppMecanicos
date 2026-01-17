-- Crear tabla separada para calificaciones de servicios
-- Ejecutar este script en Supabase SQL Editor

-- Crear tabla de calificaciones
CREATE TABLE IF NOT EXISTS service_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mechanic_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios descriptivos
COMMENT ON TABLE service_ratings IS 'Calificaciones de servicios completados';
COMMENT ON COLUMN service_ratings.service_request_id IS 'ID del servicio calificado';
COMMENT ON COLUMN service_ratings.user_id IS 'ID del cliente que calificó';
COMMENT ON COLUMN service_ratings.mechanic_id IS 'ID del mecánico calificado';
COMMENT ON COLUMN service_ratings.rating IS 'Calificación de 1 a 5 estrellas';
COMMENT ON COLUMN service_ratings.comment IS 'Comentario opcional del cliente';

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_service_ratings_service ON service_ratings(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_ratings_user ON service_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_service_ratings_mechanic ON service_ratings(mechanic_id);

-- Asegurar que cada servicio solo pueda ser calificado una vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_ratings_unique ON service_ratings(service_request_id);

-- Habilitar Row Level Security
ALTER TABLE service_ratings ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propias calificaciones
CREATE POLICY "Users can view their own ratings"
  ON service_ratings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = mechanic_id);

-- Política: Los usuarios pueden crear calificaciones para sus propios servicios
CREATE POLICY "Users can create ratings for their services"
  ON service_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM service_requests
      WHERE id = service_request_id
      AND user_id = auth.uid()
      AND status = 'completed'
    )
  );

-- Política: Los usuarios pueden actualizar sus propias calificaciones
CREATE POLICY "Users can update their own ratings"
  ON service_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_service_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_service_ratings_timestamp ON service_ratings;
CREATE TRIGGER update_service_ratings_timestamp
  BEFORE UPDATE ON service_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_service_ratings_updated_at();
