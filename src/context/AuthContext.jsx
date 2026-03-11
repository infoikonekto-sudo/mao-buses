import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Helper para timeouts de red
const withTimeout = (promise, ms = 5000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_RED')), ms))
    ]);
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        let isMounted = true;

        // 🔥 TEMPORIZADOR DE RESCATE TOTAL (6 segundos)
        // Si en 6 segundos nada ha terminado, liberamos la UI a toda costa.
        const rescueTimer = setTimeout(() => {
            if (isMounted && !initialized) {
                console.warn('🚨 RESCATE TOTAL: Forzando desbloqueo de interfaz por bloqueo de red.');
                setLoading(false);
                setInitialized(true);
                setProfileLoading(false); // Liberar también la carga de perfil
            }
        }, 6000);

        const fetchProfile = async (u) => {
            if (!u) {
                setProfile(null);
                setProfileLoading(false);
                localStorage.removeItem('mao_cached_profile');
                return;
            }

            setProfileLoading(true);

            // 1. CARGA OPTIMISTA (Caché local) - Instantánea
            const cached = localStorage.getItem('mao_cached_profile');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (parsed.user_id === u.id) {
                        if (isMounted) {
                            console.log('📦 Perfil cargado desde caché (optimista)');
                            setProfile(parsed);
                        }
                    }
                } catch (e) {
                    console.error('Error parseando caché:', e);
                }
            }

            try {
                // 2. FETCH CON TIMEOUT (5 segundos máx)
                console.log('📡 Iniciando fetch de perfil con blindaje de tiempo...');
                const { data: profileData, error } = await withTimeout(
                    supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('user_id', u.id)
                        .maybeSingle(),
                    5000
                );

                if (error) throw error;

                let finalProfile = profileData;

                // 3. AUTO-REPARACIÓN (Por Email) si el ID no vincula
                if (!finalProfile && u.email) {
                    console.log('🔍 Re-vinculando perfil por email:', u.email);
                    const { data: fallbackData } = await withTimeout(
                        supabase
                            .from('user_profiles')
                            .select('*')
                            .eq('email', u.email.toLowerCase())
                            .maybeSingle(),
                        3000
                    );

                    if (fallbackData) {
                        const { data: updatedData, error: updateError } = await withTimeout(
                            supabase
                                .from('user_profiles')
                                .update({ user_id: u.id, updated_at: new Date().toISOString() })
                                .eq('email', u.email.toLowerCase())
                                .select()
                                .single(),
                            3000
                        );
                        if (!updateError) finalProfile = updatedData;
                    }
                }

                if (isMounted) {
                    if (finalProfile) {
                        console.log('🎯 Vínculo de perfil verificado:', finalProfile.role);
                        setProfile(finalProfile);
                        localStorage.setItem('mao_cached_profile', JSON.stringify(finalProfile));
                    } else {
                        console.warn('⚠️ No se encontró perfil para este usuario.');
                    }
                }
            } catch (err) {
                console.error('❌ Error en FETCH_PROFILE (posible timeout):', err.message);
                // Si falla por timeout, mantenemos el caché si existe
            } finally {
                if (isMounted) {
                    setProfileLoading(false);
                }
            }
        };

        const initAuth = async () => {
            try {
                const { data: { session }, error } = await withTimeout(supabase.auth.getSession(), 5000);
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
                console.error('❌ Error en INIT_AUTH:', err.message);
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
            localStorage.removeItem('mao_cached_profile');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, profileLoading, logout, initialized }}>
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
