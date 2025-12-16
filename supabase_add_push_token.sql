-- Agregar columna push_token a la tabla profiles
-- Ejecuta esto en el SQL Editor de Supabase

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Crear índice para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_push_token 
ON profiles(push_token) 
WHERE push_token IS NOT NULL;

-- Comentario para documentar
COMMENT ON COLUMN profiles.push_token IS 'Expo Push Token para notificaciones push';
