import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
    const [stats, setStats] = useState({ total: 0, pre: 0, pri: 0, sec: 0 });
    const [flowStats, setFlowStats] = useState({ asistencia: 0, entregados: 0, enColegio: 0 });
    const [recentEntries, setRecentEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeLevel, setActiveLevel] = useState('todos'); // 'todos', 'preprimaria', 'primaria', 'secundaria'
    const [horaActual, setHoraActual] = useState('');

    const { user, profile, profileLoading, initialized } = useAuth();

    useEffect(() => {
        if (initialized && !profileLoading && profile) {
            loadAllData();
        }

        // Reloj
        const interval = setInterval(() => {
            setHoraActual(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);

        // Suscribirse a cambios en tiempo real
        const hoy = new Date().toISOString().split('T')[0];
        const colaChannel = supabase
            .channel('admin_cola')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'cola_dia', filter: `fecha_dia=eq.${hoy}` },
                () => {
                    loadRecentEntries();
                    loadFlowStats();
                }
            )
            .subscribe();

        const asistenciaChannel = supabase
            .channel('admin_asistencia')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'asistencia_dia', filter: `fecha_dia=eq.${hoy}` },
                () => {
                    loadStats();
                    loadFlowStats();
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(colaChannel);
            supabase.removeChannel(asistenciaChannel);
        };
    }, [initialized, profileLoading, profile, activeLevel]);

    async function loadAllData() {
        setLoading(true);
        await Promise.all([
            loadRecentEntries(),
            loadStats(),
            loadFlowStats()
        ]);
        setLoading(false);
    }

    async function loadRecentEntries() {
        const hoy = new Date().toISOString().split('T')[0];
        let query = supabase
            .from('cola_dia')
            .select('*')
            .eq('fecha_dia', hoy)
            .order('hora_escaneo', { ascending: false })
            .limit(50);

        if (profile?.role !== 'superadmin' && activeLevel === 'todos') {
            query = query.in('nivel', profile?.areas_p || []);
        } else if (activeLevel !== 'todos') {
            query = query.eq('nivel', activeLevel);
        }

        const { data } = await query;
        if (data) setRecentEntries(data);
    }

    const loadStats = async () => {
        const hoy = new Date().toISOString().split('T')[0];
        let query = supabase.from('asistencia_dia').select('nivel').eq('fecha_dia', hoy);

        if (profile?.role !== 'superadmin' && activeLevel === 'todos') {
            query = query.in('nivel', profile?.areas_p || []);
        } else if (activeLevel !== 'todos') {
            query = query.eq('nivel', activeLevel);
        }

        const { data } = await query;
        if (data) {
            setStats({
                total: data.length,
                pre: data.filter(a => a.nivel === 'preprimaria').length,
                pri: data.filter(a => a.nivel === 'primaria').length,
                sec: data.filter(a => a.nivel === 'secundaria').length,
            });
        }
    };

    const loadFlowStats = async () => {
        const hoy = new Date().toISOString().split('T')[0];

        // Asistencias (Entradas)
        let qAsis = supabase.from('asistencia_dia').select('id', { count: 'exact' }).eq('fecha_dia', hoy);
        if (activeLevel !== 'todos') qAsis = qAsis.eq('nivel', activeLevel);
        else if (profile?.role !== 'superadmin') qAsis = qAsis.in('nivel', profile?.areas_p || []);

        // Salidas (Entregados)
        let qSalida = supabase.from('cola_dia').select('id', { count: 'exact' }).eq('fecha_dia', hoy).eq('estado', 'entregado');
        if (activeLevel !== 'todos') qSalida = qSalida.eq('nivel', activeLevel);
        else if (profile?.role !== 'superadmin') qSalida = qSalida.in('nivel', profile?.areas_p || []);

        const [asisRes, salidaRes] = await Promise.all([qAsis, qSalida]);

        setFlowStats({
            asistencia: asisRes.count || 0,
            entregados: salidaRes.count || 0,
            enColegio: Math.max(0, (asisRes.count || 0) - (salidaRes.count || 0))
        });
    };

    async function limpiarCola() {
        if (!window.confirm('¿Estás seguro de que deseas limpiar todas las pantallas?')) return;
        try {
            const hoy = new Date().toISOString().split('T')[0];
            let query = supabase
                .from('cola_dia')
                .update({ estado: 'entregado', hora_entrega: new Date().toISOString() })
                .eq('fecha_dia', hoy)
                .eq('estado', 'esperando');

            if (profile?.role !== 'superadmin' && activeLevel === 'todos') {
                query = query.in('nivel', profile?.areas_p || []);
            } else if (activeLevel !== 'todos') {
                query = query.eq('nivel', activeLevel);
            }

            const { error } = await query;
            if (error) throw error;
            loadAllData();
        } catch (err) {
            console.error(err);
            alert('Error al limpiar');
        }
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="header-left">
                    <h1>¡Hola Administrador!</h1>
                    <p className="welcome-msg">Resumen de flujo en tiempo real por área asignada.</p>
                </div>
                <div className="header-right">
                    <span className="hora-actual">{horaActual}</span>
                    <button className="btn-clean-all" onClick={limpiarCola}>🧹 Limpiar Pantallas</button>
                    <button className="btn-refresh" onClick={loadAllData}>🔄 Sincronizar</button>
                </div>
            </div>

            <div className="flow-stats-grid">
                <div className="flow-card asis">
                    <div className="flow-icon">📝</div>
                    <div className="flow-data">
                        <span className="flow-num">{flowStats.asistencia}</span>
                        <p>Total Asistencia</p>
                    </div>
                </div>
                <div className="flow-card out">
                    <div className="flow-icon">🚗</div>
                    <div className="flow-data">
                        <span className="flow-num">{flowStats.entregados}</span>
                        <p>Total Salida</p>
                    </div>
                </div>
                <div className="flow-card remain">
                    <div className="flow-icon">🏫</div>
                    <div className="flow-data">
                        <span className="flow-num">{flowStats.enColegio}</span>
                        <p>En el Colegio</p>
                    </div>
                </div>
            </div>

            <div className="estadisticas-grid">
                <StatCard nivel="Preprimaria" count={stats.pre} color="#7C3AED" icon="🌱" />
                <StatCard nivel="Primaria" count={stats.pri} color="#0891B2" icon="📚" />
                <StatCard nivel="Secundaria" count={stats.sec} color="#059669" icon="🎓" />
                <StatCard nivel="Total" count={stats.total} color="#0F2A4A" icon="📊" />
            </div>

            <div className="filtros-row">
                {['todos', 'preprimaria', 'primaria', 'secundaria'].map((f) => (
                    <button
                        key={f}
                        className={`filtro-pill ${activeLevel === f ? 'active' : ''}`}
                        onClick={() => setActiveLevel(f)}
                    >
                        {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div className="ultimas-salidas">
                <h2 className="feed-titulo">Últimas Llamadas <span className="feed-count">({recentEntries.length})</span></h2>
                {loading ? <p className="loading">Cargando...</p> : (
                    <div className="feed-list">
                        {recentEntries.map((s) => (
                            <div key={s.id} className="feed-item">
                                <div className="feed-avatar" style={{ background: avatarColor(s.nivel) }}>{s.nombre.charAt(0)}</div>
                                <div className="feed-info">
                                    <p className="feed-nombre">{s.nombre || 'Sin nombre'}</p>
                                    <p className="feed-grado">{s.grado} · {s.seccion}</p>
                                </div>
                                <div className="feed-meta">
                                    <span className={`badge badge-${s.nivel}`}>{s.nivel}</span>
                                    <span className="feed-hora">{new Date(s.hora_escaneo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ nivel, count, color, icon }) {
    return (
        <div className="stat-card" style={{ '--nivel-color': color }}>
            <div className="stat-top">
                <span className="stat-icon">{icon}</span>
                <span className="stat-badge" style={{ background: `${color}18`, color }}>{nivel}</span>
            </div>
            <div className="stat-number">{count}</div>
            <div className="stat-label">Asistencias hoy</div>
        </div>
    );
}

function avatarColor(nivel) {
    switch (nivel) {
        case 'preprimaria': return '#7C3AED';
        case 'primaria': return '#0891B2';
        case 'secundaria': return '#059669';
        default: return '#0F2A4A';
    }
}
