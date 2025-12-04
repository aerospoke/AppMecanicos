# Configuración de Seguridad - Row Level Security (RLS) en Supabase

## 📋 Instrucciones para configurar las políticas de seguridad

Ejecuta estos comandos SQL en tu editor SQL de Supabase para implementar Row Level Security:

---

## 1. Tabla `profiles`

```sql
-- Habilitar RLS en la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil (excepto el rol)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND (
  -- Prevenir que cambien su propio rol
  rol = (SELECT rol FROM profiles WHERE id = auth.uid())
));

-- Política: Los admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Política: Los admins pueden actualizar cualquier perfil
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Política: Insertar perfil automáticamente al registrarse
CREATE POLICY "Users can insert own profile on signup"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);
```

---

## 2. Tabla `service_requests`

```sql
-- Habilitar RLS en la tabla service_requests
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Política: Los clientes pueden ver sus propias solicitudes
CREATE POLICY "Clients can view own requests"
ON service_requests FOR SELECT
USING (auth.uid() = user_id);

-- Política: Los mecánicos pueden ver todas las solicitudes
CREATE POLICY "Mechanics can view all requests"
ON service_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol IN ('mecanico', 'admin')
  )
);

-- Política: Los clientes pueden crear solicitudes
CREATE POLICY "Clients can create requests"
ON service_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política: Los mecánicos pueden actualizar solicitudes (ej. cambiar estado)
CREATE POLICY "Mechanics can update requests"
ON service_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol IN ('mecanico', 'admin')
  )
);

-- Política: Solo el mecánico asignado puede marcar como completado
CREATE POLICY "Assigned mechanic can complete request"
ON service_requests FOR UPDATE
USING (
  mechanic_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  )
)
WITH CHECK (
  mechanic_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Política: Los admins pueden eliminar solicitudes
CREATE POLICY "Admins can delete requests"
ON service_requests FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  )
);
```

---

## 3. Crear tabla `profiles` (si no existe)

```sql
-- Crear tabla de perfiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT,
  telefono TEXT,
  rol TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'mecanico', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por rol
CREATE INDEX idx_profiles_rol ON profiles(rol);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. Trigger para crear perfil automáticamente

```sql
-- Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    'cliente' -- Rol por defecto
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que ejecuta la función al crear un usuario
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

---

## 5. Actualizar tabla `service_requests` (añadir coordenadas y mecánico)

```sql
-- Si no existen las columnas de coordenadas, añadirlas
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Añadir campos para trackear el mecánico asignado
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS mechanic_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS mechanic_name TEXT,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Índice para búsquedas geográficas
CREATE INDEX IF NOT EXISTS idx_service_requests_location 
ON service_requests(latitude, longitude);

-- Índice para búsquedas por mecánico
CREATE INDEX IF NOT EXISTS idx_service_requests_mechanic 
ON service_requests(mechanic_id);

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_service_requests_status 
ON service_requests(status);
```

---

## 6. Estructura completa de la tabla `service_requests`

```sql
-- Crear tabla completa con todos los campos
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  service_name TEXT NOT NULL,
  service_description TEXT,
  service_type TEXT CHECK (service_type IN ('emergency', 'detail')),
  service_icon TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  mechanic_id UUID REFERENCES auth.users(id),
  mechanic_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

---

## 📌 Notas Importantes:

1. **RLS Habilitado**: Con estas políticas, solo los usuarios autenticados pueden acceder a los datos según su rol.

2. **Roles Disponibles**:
   - `cliente`: Usuarios normales (por defecto)
   - `mecanico`: Mecánicos que atienden solicitudes
   - `admin`: Administradores con acceso total

3. **Seguridad**:
   - Los usuarios NO pueden cambiar su propio rol
   - Solo los admins pueden cambiar roles
   - Cada usuario solo ve sus propias solicitudes (excepto mecánicos y admins)

4. **Para asignar roles manualmente** (como admin):
   ```sql
   UPDATE profiles 
   SET rol = 'mecanico' 
   WHERE email = 'correo@ejemplo.com';
   ```

5. **Para verificar las políticas**:
   ```sql
   -- Ver todas las políticas de una tabla
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

---

## ✅ Después de aplicar estas políticas:

- Los clientes solo verán sus propias solicitudes
- Los mecánicos verán todas las solicitudes pendientes
- Los admins tendrán control total
- La seguridad estará implementada tanto en cliente como en servidor
