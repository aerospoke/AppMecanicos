-- 🔥 Script para agregar columnas de configuración al perfil
-- Ejecuta esto en Supabase SQL Editor

-- Agregar columna de configuración de notificaciones si no existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notif_enabled BOOLEAN DEFAULT true;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notif_sound BOOLEAN DEFAULT true;

-- Comentarios para documentar
COMMENT ON COLUMN profiles.notif_enabled IS 'Si el usuario tiene notificaciones activadas';
COMMENT ON COLUMN profiles.notif_sound IS 'Si el usuario tiene sonido en notificaciones activado';

-- Verificar que las columnas se crearon correctamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('notif_enabled', 'notif_sound');
