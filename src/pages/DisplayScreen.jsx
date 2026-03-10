import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getVoiceAgent } from '../lib/voiceAgent';
import './DisplayScreen.css';

const voiceAgent = getVoiceAgent();

// Mapeo de nombres de niveles
const NIVEL_LABELS = {
  preprimaria: '🌟 PREPRIMARIA',
  primaria: '📚 PRIMARIA',
  secundaria: '🎓 SECUNDARIA',
};

export default function DisplayScreen() {
  const { nivel } = useParams();
  const [cola, setCola] = useState([]);
  const [hora, setHora] = useState(new Date());
  const [estadisticas, setEstadisticas] = useState({
    esperando: 0,
    entregados: 0,
    bus: 0,
  });

  // Actualizar hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cargar cola inicial y suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!nivel || !['preprimaria', 'primaria', 'secundaria'].includes(nivel)) {
      return;
    }

    // Cargar datos iniciales
    cargarCola();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel(`display_${nivel}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cola_dia',
          filter: `nivel=eq.${nivel}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nuevo = payload.new;
            setCola((prev) => {
              // Agregar nuevo al inicio
              const updated = [nuevo, ...prev];
              // Mantener solo los primeros 8
              return updated.slice(0, 8);
            });
            // Leer en voz alta
            voiceAgent.hablar(nuevo.nombre, nivel);
            // Actualizar estadísticas
            actualizarEstadisticas();
          } else if (payload.eventType === 'UPDATE') {
            setCola((prev) =>
              prev.map((a) => (a.id === payload.new.id ? payload.new : a))
            );
            actualizarEstadisticas();
          } else if (payload.eventType === 'DELETE') {
            setCola((prev) => prev.filter((a) => a.id !== payload.old.id));
            actualizarEstadisticas();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [nivel]);

  async function cargarCola() {
    if (!nivel) return;

    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cola_dia')
      .select('*')
      .eq('nivel', nivel)
      .eq('fecha_dia', hoy)
      .order('turno', { ascending: false })
      .limit(8);

    if (error) {
      console.error('Error cargando cola:', error);
      return;
    }

    if (data) {
      setCola(data);
      actualizarEstadisticas();
    }
  }

  async function actualizarEstadisticas() {
    if (!nivel) return;

    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cola_dia')
      .select('estado, bus')
      .eq('nivel', nivel)
      .eq('fecha_dia', hoy);

    if (!error && data) {
      const esperando = data.filter(
        (a) => a.estado === 'esperando'
      ).length;
      const entregados = data.filter(
        (a) => a.estado === 'entregado'
      ).length;
      const bus = data.filter((a) => a.bus).length;

      setEstadisticas({ esperando, entregados, bus });
    }
  }

  const nivelLabel = NIVEL_LABELS[nivel] || 'DESCONOCIDO';
  const horaFormato = hora.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="display-screen">
      {/* Header */}
      <header className="display-header">
        <span className="display-logo">🏫 Colegio Manos a la Obra</span>
        <span className="nivel-badge">{nivelLabel}</span>
        <span className="display-clock">{horaFormato}</span>
      </header>

      {/* Cola de alumnos */}
      <main className="cola-list">
        {cola.length > 0 ? (
          cola.map((alumno, idx) => (
            <AlumnoCard
              key={alumno.id}
              alumno={alumno}
              isNew={idx === 0}
            />
          ))
        ) : (
          <div className="standby-msg">
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
            <div>Esperando alumnos...</div>
          </div>
        )}
      </main>

      {/* Footer con estadísticas */}
      <footer className="display-footer">
        <div className="stats-bar">
          <span className="stat">
            <span className="stat-label">En espera:</span>
            <span className="stat-value">{estadisticas.esperando}</span>
          </span>
          <span className="stat-separator">·</span>
          <span className="stat">
            <span className="stat-label">Entregados:</span>
            <span className="stat-value">{estadisticas.entregados}</span>
          </span>
          <span className="stat-separator">·</span>
          <span className="stat">
            <span className="stat-label">Bus:</span>
            <span className="stat-value">{estadisticas.bus}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function AlumnoCard({ alumno, isNew }) {
  const estadoClass = {
    esperando: 'estado-espera',
    llamado: 'estado-llamado',
    entregado: 'estado-entregado',
  }[alumno.estado] || 'estado-espera';

  const estadoIcon = {
    esperando: '⏳',
    llamado: '📢',
    entregado: '✅',
  }[alumno.estado] || '⏳';

  return (
    <div
      className={`alumno-card ${estadoClass} ${
        isNew ? 'entrada-animada' : ''
      }`}
    >
      {/* Número de turno */}
      <span className="turno">#{alumno.turno}</span>

      {/* Foto del alumno */}
      <div className="foto-container">
        {alumno.foto_url ? (
          <img
            src={alumno.foto_url}
            alt={alumno.nombre}
            className="foto-alumno"
          />
        ) : (
          <div className="foto-placeholder">
            {alumno.nombre.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Información del alumno */}
      <div className="info-alumno">
        <span className="nombre-alumno">{alumno.nombre}</span>
        <span className="grado-alumno">
          {alumno.grado} {alumno.seccion}
        </span>
      </div>

      {/* Iconos de estado y bus */}
      <div className="estado-icons">
        {alumno.bus && <span className="icono-bus">🚌</span>}
        <span className={`estado-icon ${estadoClass}`}>{estadoIcon}</span>
      </div>
    </div>
  );
}
