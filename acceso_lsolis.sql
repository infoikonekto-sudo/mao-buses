-- ==========================================
-- 🔐 ASIGNACIÓN DE SUPERADMIN - lsolis@mao.com
-- ==========================================

-- 1. Buscar el UUID del usuario e insertar/actualizar su perfil
-- Nota: La función handles auth check en user_profiles
DO $$ 
DECLARE
    v_user_id UUID;
BEGIN
    -- Obtenemos el ID de auth.users si ya se registró
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'lsolis@mao.com';

    IF v_user_id IS NOT NULL THEN
        -- Insertamos o actualizamos su perfil como Superadmin
        INSERT INTO public.user_profiles (user_id, email, role, permissions)
        VALUES (
            v_user_id, 
            'lsolis@mao.com', 
            'superadmin', 
            '{"dashboard": "write", "alumnos": "write", "bus": "write", "qr": "write", "historial": "write", "analiticas": "write", "config": "write", "users": "write"}'::jsonb
        )
        ON CONFLICT (user_id) DO UPDATE SET 
            role = 'superadmin',
            permissions = EXCLUDED.permissions;
            
        RAISE NOTICE '✅ Usuario lsolis@mao.com ahora tiene acceso total de Superadmin.';
    ELSE
        RAISE NOTICE '⚠️ El usuario lsolis@mao.com no se encuentra en la tabla de autenticación. Debe registrarse primero.';
    END IF;
END $$;
