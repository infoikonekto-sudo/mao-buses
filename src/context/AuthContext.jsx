import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const CACHE_KEY = 'mao_profile_v2';

// ─── Helpers de cache ──────────────────────────────────────────────────────

function readCache(userId) {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.user_id === userId ? parsed : null;
    } catch {
        return null;
    }
}

function writeCache(profile) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
    } catch { /* sin espacio */ }
}

function clearCache() {
    localStorage.removeItem(CACHE_KEY);
}

// ─── Fetch de perfil (sin timeout arbitrario) ──────────────────────────────
// Supabase ya maneja sus propios timeouts de red internamente.
// Usando timeouts arbitrarios creamos TIMEOUT_RED_SESSION falsos.

async function fetchProfileFromDB(userId, email) {
    // Intento 1: por user_id (caso normal y más rápido)
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (!error && data) return data;

    // Intento 2: auto-reparación por email si el user_id está desincronizado
    if (email) {
        const { data: byEmail, error: errEmail } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (!errEmail && byEmail) {
            // Re-vincula el user_id en la base de datos
            const { data: patched } = await supabase
                .from('user_profiles')
                .update({ user_id: userId, updated_at: new Date().toISOString() })
                .eq('email', email.toLowerCase())
                .select()
                .single();

            return patched || byEmail;
        }
    }

    if (error) console.warn('⚠️ Fetch de perfil:', error.message);
    return null;
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Evita llamadas paralelas de fetchProfile
    const fetchingRef = useRef(false);
    const initializedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const loadProfile = async (authUser) => {
            if (!authUser) {
                setProfile(null);
                setProfileLoading(false);
                clearCache();
                return;
            }

            if (fetchingRef.current) return;
            fetchingRef.current = true;
            setProfileLoading(true);

            // 1. Mostrar caché inmediatamente sin esperar la red
            const cached = readCache(authUser.id);
            if (cached && !cancelled) {
                setProfile(cached);
            }

            // 2. Actualizar desde la DB en background
            try {
                const fresh = await fetchProfileFromDB(authUser.id, authUser.email);
                if (!cancelled) {
                    if (fresh) {
                        setProfile(fresh);
                        writeCache(fresh);
                    } else if (!cached) {
                        setProfile(null); // Solo resetear si tampoco había caché
                    }
                    // Si no hay fresh pero sí había caché, el caché sigue activo
                }
            } catch (err) {
                console.warn('⚠️ Perfil en modo caché:', err.message);
            } finally {
                if (!cancelled) {
                    setProfileLoading(false);
                    fetchingRef.current = false;
                }
            }
        };

        // ─────────────────────────────────────────────────────────────────
        // ESTRATEGIA PRINCIPAL: onAuthStateChange como fuente de verdad.
        //
        // A diferencia de supabase.auth.getSession(), onAuthStateChange
        // dispara INITIAL_SESSION usando el token del localStorage SIN hacer
        // una llamada de red, lo que elimina TIMEOUT_RED_SESSION.
        // ─────────────────────────────────────────────────────────────────
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (cancelled) return;

            const currentUser = session?.user ?? null;

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                clearCache();
                fetchingRef.current = false;
                if (!initializedRef.current) {
                    setLoading(false);
                    setInitialized(true);
                    initializedRef.current = true;
                }
                return;
            }

            setUser(currentUser);

            // Marcar la app como inicializada al recibir el primer evento
            if (!initializedRef.current) {
                setLoading(false);
                setInitialized(true);
                initializedRef.current = true;
            }

            if (currentUser) {
                await loadProfile(currentUser);
            } else {
                setProfile(null);
                setProfileLoading(false);
                clearCache();
            }
        });

        // Safety net: si onAuthStateChange no dispara en 8s (router offline total)
        const safetyNet = setTimeout(() => {
            if (!cancelled && !initializedRef.current) {
                console.warn('🛡️ Safety-net: red completamente inaccesible.');
                setLoading(false);
                setInitialized(true);
                setProfileLoading(false);
                initializedRef.current = true;
            }
        }, 8000);

        return () => {
            cancelled = true;
            subscription.unsubscribe();
            clearTimeout(safetyNet);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const logout = async () => {
        clearCache();
        fetchingRef.current = false;
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Error al cerrar sesión:', e);
        } finally {
            setUser(null);
            setProfile(null);
        }
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
