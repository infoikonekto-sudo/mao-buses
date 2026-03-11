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
                localStorage.removeItem('mao_cached_profile');
                return;
            }

            // 1. Carga optimista desde caché local
            const cached = localStorage.getItem('mao_cached_profile');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.user_id === u.id) {
                        if (isMounted) setProfile(parsed);
                    }
                } catch (e) {
                    console.error('Error parseando caché:', e);
                }
            }

            try {
                // 2. Fetch real desde Supabase (con reintentos leves)
                const { data: profileData, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', u.id)
                    .maybeSingle();

                if (error) throw error;

                if (isMounted && profileData) {
                    setProfile(profileData);
                    localStorage.setItem('mao_cached_profile', JSON.stringify(profileData));
                }
            } catch (err) {
                console.error('❌ Error cargando perfil:', err);
                // Si falla el fetch pero tenemos caché, mantenemos el caché.
            }
        };

        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                const currentUser = session?.user ?? null;
                if (isMounted) {
                    setUser(currentUser);
                    if (currentUser) {
                        await fetchProfile(currentUser);
                    } else {
                        localStorage.removeItem('mao_cached_profile');
                    }
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

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;
            if (isMounted) {
                setUser(currentUser);
                if (currentUser) {
                    await fetchProfile(currentUser);
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    localStorage.removeItem('mao_cached_profile');
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
