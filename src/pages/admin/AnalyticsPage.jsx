import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    BarChart,
    Clock,
    Users,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AnalyticsPage.css';

export default function AnalyticsPage() {
    const { user, profile, profileLoading, initialized } = useAuth();
    const [stats, setStats] = useState({
        avgWaitTime: 0,
        peakHour: '--:--',
        totalEscaneos: 0,
        entregados: 0,
        porcentajeEntrega: 0
    });
    const [hourlyData, setHourlyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroNivel, setFiltroNivel] = useState('todos');

    useEffect(() => {
        if (initialized && !profileLoading && profile) {
            fetchAnalyticsData();
        }
    }, [filtroNivel, initialized, profileLoading, profile]);

    async function fetchAnalyticsData() {
        setLoading(true);
        const hoy = new Date().toISOString().split('T')[0];

        let query = supabase
            .from('cola_dia')
            .select('hora_escaneo, hora_entrega, estado, nivel')
            .eq('fecha_dia', hoy);

        if (filtroNivel !== 'todos') {
            query = query.eq('nivel', filtroNivel);
        }

        const { data: registros, error } = await query;

        if (error) {
            console.error('Error fetching analytics:', error);
            setLoading(false);
            return;
        }

        if (registros && registros.length > 0) {
            // 1. Tiempo promedio de espera (solo para entregados)
            // Asumiendo que 'created_at' es cuando se marcó como entregado (o necesitamos un campo específico)
            // Por ahora usaremos la diferencia entre hora_escaneo y el tiempo actual para los que siguen esperando
            // o un timestamp de entrega si existiera. 
            // NOTA: Para analíticas reales necesitamos un campo 'hora_entrega'.
            // Simularemos con los datos disponibles.

            let totalWait = 0;
            let countEntregados = 0;

            registros.forEach(r => {
                if (r.estado === 'entregado' && r.hora_entrega && r.hora_escaneo) {
                    const escaneo = new Date(r.hora_escaneo).getTime();
                    const entrega = new Date(r.hora_entrega).getTime();
                    const diff = Math.max(0, (entrega - escaneo) / (1000 * 60)); // minutos
                    totalWait += diff;
                    countEntregados++;
                }
            });

            const avgWait = countEntregados > 0 ? (totalWait / countEntregados).toFixed(1) : 0;

            // 2. Horas Pico
            const hours = Array(24).fill(0);
            registros.forEach(r => {
                const hour = new Date(r.hora_escaneo).getHours();
                hours[hour]++;
            });

            const maxHourValue = Math.max(...hours);
            const peakHourIndex = hours.indexOf(maxHourValue);
            const peakHourStr = `${peakHourIndex.toString().padStart(2, '0')}:00`;

            const hourlyChartData = hours.map((count, hr) => ({
                hour: `${hr.toString().padStart(2, '0')}:00`,
                hourNum: hr,
                count
            })).filter(h => h.count > 0 || (h.hourNum >= 7 && h.hourNum <= 18)); // Rango escolar

            setStats({
                avgWaitTime: avgWait,
                peakHour: peakHourStr,
                totalEscaneos: registros.length,
                entregados: countEntregados,
                porcentajeEntrega: ((countEntregados / registros.length) * 100).toFixed(0)
            });
            setHourlyData(hourlyChartData);
        }
        setLoading(false);
    }

    if (!initialized || profileLoading) {
        return (
            <div className="analytics-loading">
                <div className="spinner"></div>
                <h1>Validando acceso...</h1>
                <p>Configurando tus métricas de rendimiento.</p>
            </div>
        );
    }

    if (initialized && user && !profile) {
        return (
            <div className="analytics-loading">
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
                <h1>Dificultad de Conexión</h1>
                <p>No pudimos cargar tus métricas de administrador. Reintenta por favor.</p>
                <button onClick={() => window.location.reload()} className="filter-btn active" style={{ marginTop: '20px', padding: '12px 24px' }}>
                    🔄 Reintentar Conexión
                </button>
            </div>
        );
    }

    if (loading) return <div className="analytics-loading">Analizando datos...</div>;

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <div>
                    <h1>📈 Analíticas de Salida</h1>
                    <p className="subtitle">Resumen de eficiencia operativa para el día de hoy</p>
                </div>
                <div className="analytics-filters">
                    {['todos', 'preprimaria', 'primaria', 'secundaria'].map((nivel) => (
                        <button
                            key={nivel}
                            className={`filter-btn ${filtroNivel === nivel ? 'active' : ''}`}
                            onClick={() => setFiltroNivel(nivel)}
                        >
                            {nivel === 'todos' ? 'Todos' : nivel.charAt(0).toUpperCase() + nivel.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card-modern shadow-sm">
                    <div className="stat-icon-wrap bg-blue-light">
                        <Clock className="text-blue" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Espera Promedio</span>
                        <div className="stat-value-group">
                            <span className="stat-value">{stats.avgWaitTime}</span>
                            <span className="stat-unit">min</span>
                        </div>
                        <div className="stat-footer text-green">
                            <TrendingUp size={14} /> <span>Eficiencia óptima</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card-modern shadow-sm">
                    <div className="stat-icon-wrap bg-purple-light">
                        <Users className="text-purple" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Hora Pico</span>
                        <div className="stat-value-group">
                            <span className="stat-value">{stats.peakHour}</span>
                        </div>
                        <div className="stat-footer text-orange">
                            <Calendar size={14} /> <span>Máxima afluencia</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card-modern shadow-sm">
                    <div className="stat-icon-wrap bg-green-light">
                        <TrendingUp className="text-green" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Tasa de Entrega</span>
                        <div className="stat-value-group">
                            <span className="stat-value">{stats.porcentajeEntrega}%</span>
                        </div>
                        <div className="stat-footer text-blue">
                            <ArrowUpRight size={14} /> <span>{stats.entregados} de {stats.totalEscaneos}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="charts-section">
                <div className="chart-card shadow-sm">
                    <div className="chart-header">
                        <h3>Distribución por Hora</h3>
                        <span className="badge-live">Hoy</span>
                    </div>
                    <div className="bar-chart-container">
                        {hourlyData.map((d, i) => (
                            <div key={i} className="bar-wrapper">
                                <div
                                    className="bar"
                                    style={{
                                        height: `${(d.count / Math.max(...hourlyData.map(x => x.count), 1)) * 100}%`,
                                        backgroundColor: d.hour.startsWith(stats.peakHour.split(':')[0]) ? '#7C3AED' : '#3B82F6'
                                    }}
                                    title={`${d.hour}: ${d.count} alumnos`}
                                />
                                <span className="bar-label">{d.hour}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="performance-tips">
                <h3>💡 Recomendación del Auditor</h3>
                <p>
                    Basado en la hora pico de las <strong>{stats.peakHour}</strong>, se recomienda reforzar el personal en
                    la puerta principal entre las {parseInt(stats.peakHour) - 1}:30 y las {stats.peakHour}.
                    El tiempo de espera es de {stats.avgWaitTime} min, lo cual está dentro del rango esperado.
                </p>
            </div>
        </div>
    );
}
