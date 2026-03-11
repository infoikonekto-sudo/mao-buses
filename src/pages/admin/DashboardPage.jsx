import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [estadisticas, setEstadisticas] = useState({});
  const [filtroNivel, setFiltroNivel] = useState('');
  const [horaActual, setHoraActual] = useState('');

  const { profile, profileLoading, initialized } = useAuth();

  useEffect(() => {
    if (initialized && !profileLoading && profile) {
      cargarRegistros();
    }

    // Reloj
    const interval = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    // Suscribirse a cambios en tiempo real
    const hoy = new Date().toISOString().split('T')[0];
    const channel = supabase
      .channel('admin_cola')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cola_dia' },
        (payload) => {
          cargarRegistros();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cola_dia' },
        (payload) => {
          cargarRegistros();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  async function cargarRegistros() {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cola_dia')
      .select('*')
      .eq('fecha_dia', hoy)
      .order('hora_escaneo', { ascending: false }) // Cambiado a hora_escaneo para evitar problemas con turno:0
      .limit(50);

    if (error) {
      console.error('Error cargando Dashboard:', error);
    } else if (data) {
      setRegistros(data);
      calcularEstadisticas(data);
    }
    setCargando(false);
  }

  async function limpiarCola() {
    if (!window.confirm('¿Estás seguro de que deseas limpiar todas las pantallas de visualización? Los alumnos marcados como entregados ya no aparecerán.')) return;

    try {
      const hoy = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('cola_dia')
        .update({
          estado: 'entregado',
          hora_entrega: new Date().toISOString()
        })
        .eq('fecha_dia', hoy)
        .eq('estado', 'esperando');

      if (error) throw error;
      cargarRegistros();
    } catch (err) {
      console.error('Error al limpiar cola:', err);
      alert('Error al limpiar la cola');
    }
  }

  function calcularEstadisticas(datos) {
    const stats = {
      total: datos.length,
      preprimaria: datos.filter(d => d.nivel === 'preprimaria').length,
      primaria: datos.filter(d => d.nivel === 'primaria').length,
      secundaria: datos.filter(d => d.nivel === 'secundaria').length,
      conBus: datos.filter(d => d.bus).length,
      conFoto: datos.filter(d => d.foto_url).length,
      entregados: datos.filter(d => d.estado === 'entregado').length,
    };
    setEstadisticas(stats);
  }

  const registrosFiltrados = registros.filter(r => {
    if (!filtroNivel) return true;
    return r.nivel === filtroNivel;
  });

  /* helpers para el feed */
  function avatarColor(nivel) {
    switch (nivel) {
      case 'preprimaria': return '#7C3AED';
      case 'primaria': return '#0891B2';
      case 'secundaria': return '#059669';
      default: return '#0F2A4A';
    }
  }

  function formatearHora(ts) {
    if (!ts) return '--:--';
    return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function formatearNombre(nombre) {
    if (!nombre) return 'N/A';
    return nombre;
  }

  // Componente para las cards de estadísticas
  function StatCard({ nivel, count, color, icon, trend }) {
    return (
      <div className="stat-card" style={{ '--nivel-color': color }}>
        <div className="stat-top">
          <span className="stat-icon">{icon}</span>
          <span className="stat-badge" style={{ background: `${color}18`, color }}>
            {nivel}
          </span>
        </div>
        <div className="stat-number">{count}</div>
        <div className="stat-label">alumnos llamados hoy</div>
        <div className="stat-bar">
          <div className="stat-fill" style={{ width: `${Math.min(trend, 100)}%`, background: color }} />
        </div>
      </div>
    );
  }

  if (!initialized || profileLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <h1>Validando acceso...</h1>
        <p>Conectando con la base de datos central de Colegio MAO.</p>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="dashboard-loading">
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
        <h1>Dificultad de Conexión</h1>
        <p>No logramos recuperar tu perfil de administrador. Por favor, reintenta.</p>
        <button onClick={() => window.location.reload()} className="btn-refresh" style={{ marginTop: '20px' }}>
          🔄 Reintentar Conexión
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>¡Hola Administrador!</h1>
          <p className="welcome-msg">Aquí tienes el resumen de hoy en tiempo real.</p>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span>SISTEMA ACTIVO</span>
          </div>
        </div>
        <div className="header-right">
          <span className="hora-actual">{horaActual}</span>
          <button className="btn-clean-all" onClick={limpiarCola}>
            🧹 Limpiar Pantallas
          </button>
          <button className="btn-refresh" onClick={cargarRegistros}>
            🔄 Sincronizar
          </button>
        </div>
      </div>

      <div className="estadisticas-grid">
        <StatCard
          nivel="Preprimaria"
          count={estadisticas.preprimaria || 0}
          color="#7C3AED"
          icon="🌱"
          trend={(estadisticas.preprimaria / Math.max(estadisticas.total, 1)) * 100}
        />
        <StatCard
          nivel="Primaria"
          count={estadisticas.primaria || 0}
          color="#0891B2"
          icon="📚"
          trend={(estadisticas.primaria / Math.max(estadisticas.total, 1)) * 100}
        />
        <StatCard
          nivel="Secundaria"
          count={estadisticas.secundaria || 0}
          color="#059669"
          icon="🎓"
          trend={(estadisticas.secundaria / Math.max(estadisticas.total, 1)) * 100}
        />
        <StatCard
          nivel="Total"
          count={estadisticas.total || 0}
          color="#0F2A4A"
          icon="📊"
          trend={100}
        />
      </div>

      <div className="filtros-row">
        <span className="filtros-label">Filtrar:</span>
        {['todos', 'preprimaria', 'primaria', 'secundaria'].map((f) => (
          <button
            key={f}
            className={`filtro-pill ${(f === 'todos' && filtroNivel === '') || filtroNivel === f ? 'active' : ''
              }`}
            data-nivel={f}
            onClick={() => setFiltroNivel(f === 'todos' ? '' : f)}
          >
            {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="ultimas-salidas">
        <h2 className="feed-titulo">
          Últimas Salidas <span className="feed-count">({registrosFiltrados.length})</span>
        </h2>

        {cargando ? (
          <p className="loading">Cargando registros...</p>
        ) : registrosFiltrados.length === 0 ? (
          <p className="loading">No hay registros de hoy</p>
        ) : (
          <div className="feed-list">
            {registrosFiltrados.map((s) => (
              <div key={s.id} className="feed-item">
                <div className="feed-avatar" style={{ background: avatarColor(s.nivel) }}>
                  {s.nombre.charAt(0)}
                </div>
                <div className="feed-info">
                  <p className="feed-nombre">{formatearNombre(s.nombre)}</p>
                  <p className="feed-grado">{s.grado} · Sección {s.seccion}</p>
                </div>
                <div className="feed-meta">
                  <span className={`badge badge-${s.nivel}`}>{s.nivel}</span>
                  <span className="feed-hora">{formatearHora(s.hora_escaneo)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
