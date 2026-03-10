import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function QueueDisplayPage({ nivel = 'primaria' }) {
  const [cola, setCola] = useState([]);
  const [ultimoEscaneado, setUltimoEscaneado] = useState(null);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    enBus: 0,
    sinBus: 0
  });

  useEffect(() => {
    // Suscripción en tiempo real a la cola del día
    const hoy = new Date().toISOString().split('T')[0];

    const subscription = supabase
      .channel(`cola_realtime_${nivel}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cola_dia'
      }, (payload) => {
        const nuevoAlumno = payload.new;
        console.log('Evento Realtime recibido:', nuevoAlumno);

        // Validación flexible de nivel (case-insensitive) y estado
        const nivelIgual = nuevoAlumno.nivel?.toLowerCase() === nivel.toLowerCase();
        const esEsperando = nuevoAlumno.estado === 'esperando';

        if (nivelIgual && esEsperando && nuevoAlumno.fecha_dia === hoy) {
          setCola(prev => {
            // Evitar duplicados visuales si el evento llega dos veces
            if (prev.some(a => a.id === nuevoAlumno.id)) return prev;
            return [nuevoAlumno, ...prev].slice(0, 10);
          });
          setUltimoEscaneado(nuevoAlumno);

          // Limpiar último escaneado después de 5 segundos
          setTimeout(() => setUltimoEscaneado(null), 8000);

          // Recargar estadísticas
          cargarDatosIniciales(hoy);
        }
      })
      .subscribe((status) => {
        console.log(`Estado suscripción ${nivel}:`, status);
      });

    // Cargar datos iniciales
    cargarDatosIniciales(hoy);

    // Intervalo de seguridad (Refresco automático cada 30s por si falla Realtime)
    const refreshInterval = setInterval(() => {
      cargarDatosIniciales(hoy);
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [nivel]);

  async function cargarDatosIniciales(fecha) {
    try {
      const { data } = await supabase
        .from('cola_dia')
        .select('*')
        .eq('fecha_dia', fecha)
        .eq('nivel', nivel)
        .eq('estado', 'esperando')
        .order('hora_escaneo', { ascending: false })
        .limit(10);

      if (data) {
        setCola(data);
      }

      // Estadísticas
      const { data: stats } = await supabase
        .from('cola_dia')
        .select('bus')
        .eq('fecha_dia', fecha)
        .eq('nivel', nivel);

      if (stats) {
        const enBus = stats.filter(item => item.bus).length;
        setEstadisticas({
          total: stats.length,
          enBus,
          sinBus: stats.length - enBus
        });
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  }

  // Helper para normalizar nombres y evitar errores de split
  const formatName = (name = '') => {
    if (!name) return 'S/N';
    if (name.includes(',')) {
      return name.split(',').reverse().join(' ').trim();
    }
    return name;
  };

  const getConfigNivel = () => {
    const configs = {
      primaria: {
        titulo: 'Primaria',
        color: 'var(--primary-500)',
        bgGradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
        icono: '🎒'
      },
      secundaria: {
        titulo: 'Secundaria',
        color: 'var(--secondary-500)',
        bgGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        icono: '📚'
      },
      preprimaria: {
        titulo: 'Preprimaria',
        color: 'var(--accent-500)',
        bgGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        icono: '🧸'
      }
    };
    return configs[nivel] || configs.primaria;
  };

  const config = getConfigNivel();

  return (
    <div className="queue-display-dark" data-nivel={nivel}>
      {/* Header Estilo Referencia */}
      <header className="display-header">
        <div className="header-col left">
          <span className="school-icon">🏫</span>
          <span className="school-name">Colegio Manos a la Obra</span>
        </div>

        <div className="header-col center">
          <div className="status-highlight">
            {ultimoEscaneado ? (
              <span className="name-call pulse">{formatName(ultimoEscaneado.nombre)}</span>
            ) : (
              <span className="name-idle">ESPERANDO ALUMNOS...</span>
            )}
          </div>
        </div>

        <div className="header-col right">
          <div className="display-clock">
            {new Date().toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="display-main">
        {ultimoEscaneado ? (
          <div className="featured-container">
            <div className="featured-photo-large">
              {ultimoEscaneado.foto_url ? (
                <img src={ultimoEscaneado.foto_url} alt={ultimoEscaneado.nombre} />
              ) : (
                <div className="photo-initial-large">{ultimoEscaneado.nombre.charAt(0)}</div>
              )}
            </div>
            <div className="featured-text">
              <h2 className="big-name">{formatName(ultimoEscaneado.nombre)}</h2>
              <p className="big-grade">{ultimoEscaneado.grado} · Sección {ultimoEscaneado.seccion}</p>
              {ultimoEscaneado.bus && <span className="big-bus-badge">🚌 TRANSPORTE ESCOLAR</span>}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="waiting-loader">⌛</div>
            <p>Esperando llamados de {config.titulo}...</p>
          </div>
        )}

        {/* Listado de los últimos alumnos llamados (más discreto) */}
        {!ultimoEscaneado && cola.length > 0 && (
          <div className="recent-grid-dark">
            {cola.slice(0, 6).map((alumno) => (
              <div key={`${alumno.carnet}-${alumno.hora_escaneo}-${alumno.id}`} className="recent-card-dark">
                <div className="recent-info-dark">
                  <p className="recent-name-dark">{formatName(alumno.nombre)}</p>
                  <p className="recent-meta-dark">{alumno.grado} - {alumno.seccion}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Estilo Referencia */}
      <footer className="display-footer">
        <div className="footer-stats">
          <div className="footer-stat">
            <span className="stat-label-dark">EN ESPERA:</span>
            <span className="stat-value-dark">{estadisticas.total}</span>
          </div>
          <div className="footer-divider"></div>
          <div className="footer-stat">
            <span className="stat-label-dark">ENTREGADOS:</span>
            <span className="stat-value-dark">{estadisticas.total - estadisticas.enBus}</span>
          </div>
          <div className="footer-divider"></div>
          <div className="footer-stat">
            <span className="stat-label-dark">BUS:</span>
            <span className="stat-value-dark">{estadisticas.enBus}</span>
          </div>
        </div>
        <div className="footer-area-badge" style={{ background: config.color }}>
          {config.titulo.toUpperCase()}
        </div>
      </footer>
    </div>
  );
}
