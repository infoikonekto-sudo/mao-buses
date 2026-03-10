import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        let isMounted = true;

        // Temporizador de emergencia (8 segundos para redes muy lentas)
        const timer = setTimeout(() => {
            if (isMounted && !initialized) {
                console.warn('⚠️ Inicialización forzada por tiempo de espera (Timeout)');
                setInitialized(true);
                setLoading(false);
            }
        }, 8000);

        const checkSession = async () => {
            try {
                // Verificación inmediata de sesión (más rápido que esperar al evento)
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (session?.user) {
                    console.log('👤 Sesión activa detectada para:', session.user.email);
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else {
                    console.log('ℹ️ No hay sesión activa.');
                    setInitialized(true);
                    setLoading(false);
                }
            } catch (err) {
                console.error('❌ Error verificando sesión inicial:', err.message);
                setInitialized(true);
                setLoading(false);
            } finally {
                if (isMounted) clearTimeout(timer);
            }
        };

        checkSession();

        // Escuchar cambios futuros
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;
                console.log('🔔 Evento Auth:', event);

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    await fetchProfile(currentUser.id);
                } else {
                    setProfile(null);
                    setInitialized(true);
                    setLoading(false);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const fetchProfile = async (userId) => {
        if (!userId) return;
        console.log('🔍 Buscando perfil en DB para:', userId);

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle(); // Usamos maybeSingle para evitar error de 0 filas

            if (error) {
                console.error('❌ Error de red/permisos cargando perfil:', error.message);
                setProfile(null);
            } else if (!data) {
                console.warn('⚠️ ATENCIÓN: El usuario no tiene entrada en "user_profiles". Acceso restringido.');
                setProfile(null);
            } else {
                console.log('✅ Perfil cargado exitosamente. Rol:', data.role);
                setProfile(data);
            }
        } catch (err) {
            console.error('❌ Error crítico en fetchProfile:', err);
            setProfile(null);
        } finally {
            setInitialized(true);
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, logout, initialized }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined || context === null) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
}
