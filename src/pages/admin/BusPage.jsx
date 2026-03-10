import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bus, UserMinus, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';
import './BusPage.css';

export default function BusPage() {
  const { profile } = useAuth();
  const isVisor = profile?.role === 'visor';
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [filtroRuta, setFiltroRuta] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('');
  const [saving, setSaving] = useState(null); // carnet del alumno guardando

  useEffect(() => {
    cargarAlumnosBus();
  }, []);

  async function cargarAlumnosBus() {
    setLoading(true);
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .eq('bus_hoy', true)
      .eq('activo', true)
      .order('ruta', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error cargando bus:', error);
    } else {
      setAlumnos(data || []);
    }
    setLoading(false);
  }

  async function updateField(carnet, field, value) {
    setSaving(carnet);
    try {
      const { error } = await supabase
        .from('alumnos')
        .update({ [field]: value })
        .eq('carnet', carnet);

      if (error) throw error;

      setAlumnos(prev => prev.map(a =>
        a.carnet === carnet ? { ...a, [field]: value } : a
      ));

      // Feedback visual de guardado exitoso
      setTimeout(() => setSaving(null), 1000);
    } catch (err) {
      console.error('Error actualizando campo:', err);
      setSaving('error');
      setTimeout(() => setSaving(null), 3000);
    }
  }

  async function resetDiario() {
    if (!window.confirm('¿Deseas limpiar todas las ausencias y notas de cambio para iniciar un nuevo día?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('alumnos')
        .update({ ausente: false, cambio: '', act_l_m: false, act_m_j: false })
        .eq('bus_hoy', true);

      if (error) throw error;
      cargarAlumnosBus();
    } catch (err) {
      console.error(err);
      alert('Error al resetear datos');
    } finally {
      setLoading(false);
    }
  }

  const alumnosFiltrados = alumnos.filter(a => {
    const matchesSearch = a.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      a.carnet.includes(filtro);
    const matchesRuta = filtroRuta === '' || (a.ruta && a.ruta.toString() === filtroRuta);
    const matchesGrado = filtroGrado === '' || a.grado === filtroGrado;

    return matchesSearch && matchesRuta && matchesGrado;
  });

  const gradosUnicos = [...new Set(alumnos.map(a => a.grado))].sort();

  if (loading) return <div className="bus-loading">Cargando lista de transporte...</div>;

  return (
    <div className="bus-container">
      <header className="bus-header">
        <div className="header-info">
          <h1>🚌 Control de Bus Diario</h1>
          <p>Gestiona las rutas y asistencias para el despacho escolar.</p>
        </div>
        <div className="header-stats">
          <div className="stat-mini">
            <span className="stat-val">{alumnos.length}</span>
            <span className="stat-lab">Total Bus</span>
          </div>
          <div className="stat-mini danger">
            <span className="stat-val">{alumnos.filter(a => a.ausente).length}</span>
            <span className="stat-lab">Ausentes</span>
          </div>
        </div>
      </header>

      <div className="bus-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nombre o carnet..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            className="select-filter"
            value={filtroRuta}
            onChange={(e) => setFiltroRuta(e.target.value)}
          >
            <option value="">Todas las Rutas</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12].map(r => (
              <option key={r} value={r}>Ruta {r}</option>
            ))}
          </select>

          <select
            className="select-filter"
            value={filtroGrado}
            onChange={(e) => setFiltroGrado(e.target.value)}
          >
            <option value="">Todos los Grados</option>
            {gradosUnicos.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-actions">
          {!isVisor && (
            <button className="btn-reset-day" onClick={resetDiario}>
              扫 Reinicio Diario
            </button>
          )}
          <button className="btn-sync" onClick={cargarAlumnosBus}>
            🔄 Refrescar
          </button>
        </div>
      </div>

      <div className="bus-table-wrapper shadow-sm">
        <table className="bus-table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Grado / Sec</th>
              <th>Ruta</th>
              <th className="center">Ausente</th>
              <th>Cambio / Observación</th>
              <th className="center">L-M</th>
              <th className="center">M-J</th>
            </tr>
          </thead>
          <tbody>
            {alumnosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-row">No hay alumnos asignados a bus hoy</td>
              </tr>
            ) : (
              alumnosFiltrados.map((alumno) => (
                <tr key={alumno.carnet} className={alumno.ausente ? 'row-absent' : ''}>
                  <td>
                    <div className="student-cell">
                      <div className="student-avatar">
                        {alumno.foto_url ? (
                          <img src={alumno.foto_url} alt="" />
                        ) : (
                          <span>{alumno.nombre.charAt(0)}</span>
                        )}
                      </div>
                      <div className="student-name">
                        <span className="name">{alumno.nombre}</span>
                        <span className="carnet">{alumno.carnet}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="grade-badge">{alumno.grado} - {alumno.seccion}</span>
                  </td>
                  <td>
                    <select
                      className="select-ruta"
                      value={alumno.ruta || ''}
                      disabled={isVisor}
                      onChange={(e) => updateField(alumno.carnet, 'ruta', e.target.value)}
                    >
                      <option value="">Sin Ruta</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12].map(r => (
                        <option key={r} value={r}>Ruta {r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="center">
                    <input
                      type="checkbox"
                      className="check-absent"
                      checked={alumno.ausente || false}
                      disabled={isVisor}
                      onChange={(e) => updateField(alumno.carnet, 'ausente', e.target.checked)}
                    />
                  </td>
                  <td>
                    <div className="edit-cell">
                      <input
                        type="text"
                        className="input-cambio"
                        placeholder={isVisor ? "" : "Ej: Solo hoy ruta 5"}
                        value={alumno.cambio || ''}
                        disabled={isVisor}
                        onBlur={(e) => updateField(alumno.carnet, 'cambio', e.target.value)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAlumnos(prev => prev.map(a =>
                            a.carnet === alumno.carnet ? { ...a, cambio: val } : a
                          ));
                        }}
                      />
                      {saving === alumno.carnet && <span className="save-indicator">💾</span>}
                    </div>
                  </td>
                  <td className="center">
                    <input
                      type="checkbox"
                      checked={alumno.act_l_m || false}
                      disabled={isVisor}
                      onChange={(e) => updateField(alumno.carnet, 'act_l_m', e.target.checked)}
                    />
                  </td>
                  <td className="center">
                    <input
                      type="checkbox"
                      checked={alumno.act_m_j || false}
                      disabled={isVisor}
                      onChange={(e) => updateField(alumno.carnet, 'act_m_j', e.target.checked)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bus-legend">
        <p><strong>L-M / M-J:</strong> Extrema / Francés / Tutoría (Actividades Extracurriculares)</p>
      </div>
    </div>
  );
}
