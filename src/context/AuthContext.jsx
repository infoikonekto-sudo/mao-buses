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
        let isProcessing = false;

        // Temporizador de rescate (10 segundos)
        const rescueTimer = setTimeout(() => {
            if (isMounted && !initialized) {
                console.warn('⚠️ Rescate: Forzando inicialización por demora de red.');
                setLoading(false);
                setInitialized(true);
            }
        }, 10000);

        const handleAuthUpdate = async (session) => {
            if (!isMounted || isProcessing) return;
            isProcessing = true;

            try {
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    console.log('👤 Sesión activa:', currentUser.email);

                    // Carrera de promesas: Si el perfil tarda más de 4s (posible loop RLS), abortar carga
                    const profilePromise = supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('user_id', currentUser.id)
                        .maybeSingle();

                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Profile Timeout (RLS Loop?)')), 4000)
                    );

                    try {
                        const { data, error } = await Promise.race([profilePromise, timeoutPromise]);
                        if (error) throw error;
                        console.log('✅ Perfil obtenido:', data?.role || 'Ninguno');
                        setProfile(data || null);
                    } catch (profileErr) {
                        console.error('⚠️ Error cargando perfil (se usará acceso básico):', profileErr.message);
                        setProfile(null);
                    }
                } else {
                    console.log('ℹ️ Sin sesión activa.');
                    setProfile(null);
                }
            } catch (err) {
                console.error('❌ Error crítico auth:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    setInitialized(true);
                    isProcessing = false;
                    clearTimeout(rescueTimer);
                }
            }
        };

        // Escuchamos el estado inicial y cambios futuros en una sola suscripción
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                console.log('🔔 Evento Auth:', _event);
                await handleAuthUpdate(session);
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(rescueTimer);
        };
    }, []);

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
