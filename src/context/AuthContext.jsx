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

        // Temporizador de rescate (6 segundos)
        const rescueTimer = setTimeout(() => {
            if (isMounted && !initialized) {
                console.warn('⚠️ Rescate: Forzando inicialización por demora de red.');
                setLoading(false);
                setInitialized(true);
            }
        }, 6000);

        const fetchProfile = async (u) => {
            if (!u) {
                setProfile(null);
                return;
            }
            try {
                const { data: profileData } = await Promise.race([
                    supabase.from('user_profiles').select('*').eq('user_id', u.id).maybeSingle(),
                    new Promise((_, r) => setTimeout(() => r('timeout'), 3000))
                ]).catch(() => ({ data: null }));

                if (isMounted) setProfile(profileData);
            } catch (err) {
                console.error('❌ Error cargando perfil:', err);
            }
        };

        const initAuth = async () => {
            try {
                // 1. Sesión inicial
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                const currentUser = session?.user ?? null;
                if (isMounted) {
                    setUser(currentUser);
                    if (currentUser) await fetchProfile(currentUser);
                }
            } catch (err) {
                console.error('❌ Error Auth:', err.message);
            } finally {
                if (isMounted) {
                    setLoading(false);
                    setInitialized(true);
                    clearTimeout(rescueTimer);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ?? null;
            if (isMounted) {
                setUser(currentUser);
                if (currentUser) {
                    await fetchProfile(currentUser);
                } else {
                    setProfile(null);
                }
            }
        });

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
