-- 1. Actualización de la tabla user_profiles para roles granulares y áreas
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS areas_p TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{"can_scan_exit": true, "can_scan_attendance": true}';

-- 2. Creación de la tabla asistencia_dia
CREATE TABLE IF NOT EXISTS public.asistencia_dia (
    id BIGSERIAL PRIMARY KEY,
    carnet VARCHAR(8) NOT NULL REFERENCES public.alumnos(carnet),
    nombre VARCHAR(150),
    grado VARCHAR(50),
    seccion VARCHAR(2),
    nivel VARCHAR(20),
    fecha_dia DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registrado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(carnet, fecha_dia)
);

-- 3. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON public.asistencia_dia(fecha_dia);
CREATE INDEX IF NOT EXISTS idx_asistencia_carnet ON public.asistencia_dia(carnet);

-- 4. Habilitar RLS en la nueva tabla
ALTER TABLE public.asistencia_dia ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad (RLS)
-- Permitir lectura si el usuario tiene el área asignada en su perfil
CREATE POLICY "Lectura por área asignada" ON public.asistencia_dia
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'superadmin' OR nivel = ANY(areas_p))
    )
);

-- Permitir inserción si el usuario tiene permiso de asistencia en su config
CREATE POLICY "Inserción por permiso config" ON public.asistencia_dia
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE user_id = auth.uid() 
        AND (config->>'can_scan_attendance')::boolean = true
    )
);

-- Comentario informativo
COMMENT ON TABLE public.asistencia_dia IS 'Registro diario de entrada (asistencia) de los alumnos.';
