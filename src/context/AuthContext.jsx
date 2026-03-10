import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        // Temporizador de emergencia: Si en 5 segundos no ha inicializado, forzarlo.
        const timer = setTimeout(() => {
            if (!initialized) {
                console.warn('⚠️ Inicialización forzada por tiempo de espera excedido');
                setLoading(false);
                setInitialized(true);
            }
        }, 5000);

        // Suscribirse a cambios (esto también maneja la sesión inicial en Supabase v2)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔔 Evento Auth:', event);
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    await fetchProfile(currentUser.id);
                } else {
                    setProfile(null);
                    setLoading(false);
                    setInitialized(true);
                }
                clearTimeout(timer);
            }
        );

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const fetchProfile = async (userId) => {
        console.log('🔍 Cargando perfil para:', userId);
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.warn('⚠️ Perfil no encontrado o inaccesible:', error.message);
                setProfile(null);
            } else {
                console.log('✅ Perfil cargado:', data.role);
                setProfile(data);
            }
        } catch (err) {
            console.error('❌ Error crítico en fetchProfile:', err);
            setProfile(null);
        } finally {
            setLoading(false);
            setInitialized(true);
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
