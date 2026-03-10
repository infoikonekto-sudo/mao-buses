import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        // Temporizador de emergencia: Si en 3.5 segundos no ha inicializado, forzarlo.
        const timer = setTimeout(() => {
            if (!initialized) {
                console.warn('Inicialización forzada por tiempo de espera excedido');
                setLoading(false);
                setInitialized(true);
            }
        }, 3500);

        const initializeAuth = async () => {
            try {
                console.log('Iniciando verificación de sesión...');
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    console.log('Usuario detectado:', currentUser.email);
                    await fetchProfile(currentUser.id);
                } else {
                    console.log('No hay sesión activa.');
                }
            } catch (error) {
                console.error('Error inicializando auth:', error);
            } finally {
                setLoading(false);
                setInitialized(true);
                clearTimeout(timer);
                console.log('Inicialización completada correctamente.');
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Cambio de estado auth:', event);
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (currentUser) {
                    await fetchProfile(currentUser.id);
                } else {
                    setProfile(null);
                    setLoading(false);
                    setInitialized(true);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (data) {
                setProfile(data);
            } else {
                // Si no hay perfil, el sistema sigue pero con permisos mínimos (o nulos)
                setProfile(null);
            }
        } catch (err) {
            console.error('Error en fetchProfile:', err);
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
