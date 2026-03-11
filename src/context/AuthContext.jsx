import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
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
                setProfileLoading(false);
                localStorage.removeItem('mao_cached_profile');
                return;
            }

            setProfileLoading(true);

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
                // 2. Fetch real desde Supabase por ID
                let { data: profileData, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', u.id)
                    .maybeSingle();

                if (error) throw error;

                // 3. AUTO-REPARACIÓN (Fallback por Email)
                // Si no hay perfil por ID, intentamos buscar por email para re-vincular
                if (!profileData && u.email) {
                    console.log('🔍 Perfil no hallado por ID. Intentando recuperación por email:', u.email);
                    const { data: fallbackData } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('email', u.email.toLowerCase())
                        .maybeSingle();

                    if (fallbackData) {
                        console.log('✅ Perfil hallado por email. Re-vinculando ID...');
                        // Actualizar el user_id en la DB para futuras sesiones
                        const { data: updatedData, error: updateError } = await supabase
                            .from('user_profiles')
                            .update({ user_id: u.id, updated_at: new Date().toISOString() })
                            .eq('email', u.email.toLowerCase())
                            .select()
                            .single();

                        if (!updateError) profileData = updatedData;
                    }
                }

                if (isMounted) {
                    if (profileData) {
                        console.log('🎯 Perfil cargado exitosamente:', profileData.role);
                        setProfile(profileData);
                        localStorage.setItem('mao_cached_profile', JSON.stringify(profileData));
                    } else {
                        console.warn('⚠️ Usuario autenticado pero sin perfil en la base de datos.');
                        setProfile(null);
                    }
                }
            } catch (err) {
                console.error('❌ Error crítico en fetchProfile:', err);
            } finally {
                if (isMounted) setProfileLoading(false);
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
