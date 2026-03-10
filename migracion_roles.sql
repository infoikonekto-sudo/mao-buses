-- ==========================================
-- SCRIPT FINAL ANTI-RECURSIÓN (SOLUCIÓN DEFINITIVA)
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

-- 3. ELIMINAR TODAS LAS POLÍTICAS PREVIAS (Limpieza total para evitar conflictos)
DO $$ 
BEGIN
    DELETE FROM pg_policy WHERE tablename = 'user_profiles';
END $$;

-- 4. FUNCIÓN SECURITY DEFINER (Crucial: Rompe la recursión)
-- Esta función se ejecuta con permisos de sistema, ignorando RLS.
CREATE OR REPLACE FUNCTION public.check_is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (role = 'superadmin')
    FROM public.user_profiles
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. NUEVAS POLÍTICAS NO RECURSIVAS
-- A. Lectura: Cualquier usuario autenticado puede leer perfiles (Sin comprobación de rol aquí para evitar bucle)
CREATE POLICY "perfiles_lectura_autenticados" 
ON public.user_profiles FOR SELECT 
TO authenticated 
USING (true);

-- B. Escritura/Gestión: Solo Superadmins (Usando la función especial)
CREATE POLICY "perfiles_gestion_superadmin" 
ON public.user_profiles FOR ALL 
TO authenticated 
USING (public.check_is_superadmin());

-- 6. Trigger para timestamps (Opcional pero recomendado)
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
SELECT '✅ Políticas anti-recursión aplicadas. Reinicia tu app.' as resultado;
