import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Helper para timeouts de red mejorado
const withTimeout = (promise, opName = 'OP', ms = 10000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT_RED_${opName}`)), ms))
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

        // 🔥 TEMPORIZADOR DE RESCATE TOTAL AMPLIADO (12 segundos)
        const rescueTimer = setTimeout(() => {
            if (isMounted && !initialized) {
                console.warn('🚨 RESCATE TOTAL: Forzando desbloqueo por internet extremadamente lento.');
                setLoading(false);
                setInitialized(true);
                setProfileLoading(false);
            }
        }, 12000);

        const fetchProfile = async (u) => {
            if (!u) {
                setProfile(null);
                setProfileLoading(false);
                localStorage.removeItem('mao_cached_profile');
                return;
            }

            setProfileLoading(true);

            // 1. CARGA OPTIMISTA (Caché local)
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
                // 2. FETCH CON TIMEOUT AMPLIADO (10 segundos máx)
                const { data: profileData, error } = await withTimeout(
                    supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('user_id', u.id)
                        .maybeSingle(),
                    'FETCH_ID',
                    10000
                );

                if (error) throw error;

                let finalProfile = profileData;

                // 3. AUTO-REPARACIÓN (Por Email)
                if (!finalProfile && u.email) {
                    console.log('🔍 Buscando perfil por email para re-vincular...');
                    const { data: fallbackData } = await withTimeout(
                        supabase
                            .from('user_profiles')
                            .select('*')
                            .eq('email', u.email.toLowerCase())
                            .maybeSingle(),
                        'FETCH_EMAIL',
                        7000
                    );

                    if (fallbackData) {
                        const { data: updatedData, error: updateError } = await withTimeout(
                            supabase
                                .from('user_profiles')
                                .update({ user_id: u.id, updated_at: new Date().toISOString() })
                                .eq('email', u.email.toLowerCase())
                                .select()
                                .single(),
                            'UPDATE_ID',
                            7000
                        );
                        if (!updateError) finalProfile = updatedData;
                    }
                }

                if (isMounted) {
                    if (finalProfile) {
                        setProfile(finalProfile);
                        localStorage.setItem('mao_cached_profile', JSON.stringify(finalProfile));
                    }
                }
            } catch (err) {
                console.warn(`⚠️ Aviso de Red: ${err.message}. El sistema usará el caché si está disponible.`);
            } finally {
                if (isMounted) setProfileLoading(false);
            }
        };

        const initAuth = async () => {
            try {
                const { data: { session }, error } = await withTimeout(
                    supabase.auth.getSession(),
                    'SESSION',
                    10000
                );
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
                console.error('❌ Error crítico en inicio de sesión:', err.message);
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
