-- ==========================================
-- SCRIPT FINAL ANTI-RECURSIÓN (CORREGIDO)
-- ==========================================

-- 1. Asegurar tabla base
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'visor', 'bus_manager')),
    permissions JSONB DEFAULT '{
        "dashboard": "read",
        "alumnos": "read",
        "bus": "read",
        "qr": "read",
        "historial": "read",
        "analiticas": "read",
        "config": "none"
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR TODAS LAS POLÍTICAS PREVIAS (Sintaxis Estándar)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Superadmins can do everything" ON public.user_profiles;
    DROP POLICY IF EXISTS "auth_read_all" ON public.user_profiles;
    DROP POLICY IF EXISTS "superadmin_manage_all" ON public.user_profiles;
    DROP POLICY IF EXISTS "perfiles_lectura_autenticados" ON public.user_profiles;
    DROP POLICY IF EXISTS "perfiles_gestion_superadmin" ON public.user_profiles;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- 4. FUNCIÓN SECURITY DEFINER (Crucial: Rompe la recursión)
-- Esta función se ejecuta con permisos de sistema, ignorando RLS.
CREATE OR REPLACE FUNCTION public.check_is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. NUEVAS POLÍTICAS NO RECURSIVAS
-- A. Lectura: Cualquier usuario autenticado puede leer perfiles
CREATE POLICY "perfiles_lectura_autenticados" 
ON public.user_profiles FOR SELECT 
TO authenticated 
USING (true);

-- B. Escritura/Gestión: Solo Superadmins (Usando la función especial)
CREATE POLICY "perfiles_gestion_superadmin" 
ON public.user_profiles FOR ALL 
TO authenticated 
USING (public.check_is_superadmin());

-- 6. Trigger para timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- VERIFICACIÓN FINAL
SELECT '✅ Políticas anti-recursión aplicadas con éxito.' as resultado;
