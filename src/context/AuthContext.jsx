import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const CACHE_KEY = 'mao_profile_v2';

// ─── Cache helpers ──────────────────────────────────────────────────────────
function readCache(userId) {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.user_id === userId ? parsed : null;
    } catch { return null; }
}
function writeCache(p) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch { }
}
function clearCache() {
    localStorage.removeItem(CACHE_KEY);
}

// ─── Fetch de perfil en background (sin bloquear nada) ─────────────────────
async function fetchProfileBg(userId, email, onSuccess) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('user_id, email, role, permissions, areas_p, config')
            .eq('user_id', userId)
            .maybeSingle();

        if (!error && data) {
            onSuccess(data);
            return;
        }

        // Auto-reparación: buscar por email si el ID no coincide
        if (email) {
            const { data: byEmail } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('email', email.toLowerCase())
                .maybeSingle();

            if (byEmail) {
                // Actualizar el user_id para futuras sesiones
                const { data: patched } = await supabase
                    .from('user_profiles')
                    .update({ user_id: userId, updated_at: new Date().toISOString() })
                    .eq('email', email.toLowerCase())
                    .select()
                    .single();

                onSuccess(patched || byEmail);
            }
        }
    } catch (err) {
        console.warn('⚠️ Fetch perfil bg:', err.message);
    }
}

// ─── Provider ──────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let profileFetching = false;

        // ─── Función para iniciar la carga de perfil de forma no-bloqueante
        const startProfileLoad = (authUser) => {
            if (!authUser || profileFetching) return;
            profileFetching = true;

            // 1. Mostrar caché inmediatamente (0ms de espera)
            const cached = readCache(authUser.id);
            if (cached && !cancelled) setProfile(cached);
            if (!cancelled) setProfileLoading(true);

            // 2. Fetch en background (sin bloquear la UI)
            fetchProfileBg(authUser.id, authUser.email, (fresh) => {
                if (!cancelled) {
                    setProfile(fresh);
                    writeCache(fresh);
                }
            }).finally(() => {
                if (!cancelled) {
                    setProfileLoading(false);
                    profileFetching = false;
                }
            });
        };

        // ─── INICIALIZACIÓN: getSession() SIN timeout artificial ──────────
        // getSession() lee de localStorage si el token es válido (muy rápido).
        // Solo hace red si el token expiró y necesita refrescarse.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (cancelled) return;
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setLoading(false);
            setInitialized(true);
            if (currentUser) startProfileLoad(currentUser);
        }).catch((err) => {
            console.error('Error getSession:', err.message);
            if (!cancelled) {
                setLoading(false);
                setInitialized(true);
            }
        });

        // ─── CAMBIOS POSTERIORES: onAuthStateChange para LOGIN/LOGOUT ────
        // CRÍTICO: callback NO async para evitar deadlocks en Supabase v2
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (cancelled) return;
            const currentUser = session?.user ?? null;

            setUser(currentUser);

            if (event === 'SIGNED_IN') {
                profileFetching = false; // Reset para poder cargar de nuevo
                startProfileLoad(currentUser);
            } else if (event === 'SIGNED_OUT') {
                setProfile(null);
                setProfileLoading(false);
                clearCache();
                profileFetching = false;
            } else if (event === 'TOKEN_REFRESHED' && currentUser) {
                // El token se refrescó, verificar si el perfil sigue cargado
                if (!profile) startProfileLoad(currentUser);
            }
        });

        // ─── Safety-net: si getSession() no responde en 5s (offline total) ─
        const safetyNet = setTimeout(() => {
            if (!cancelled && !initialized) {
                console.warn('🛡️ Safety-net activado: sin respuesta de red.');
                setLoading(false);
                setInitialized(true);
            }
        }, 15000);

        return () => {
            cancelled = true;
            subscription.unsubscribe();
            clearTimeout(safetyNet);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const logout = async () => {
        clearCache();
        try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, profileLoading, initialized, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
}
