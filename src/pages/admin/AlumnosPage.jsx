import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import FotoUploader from '../../components/FotoUploader';
import * as XLSX from 'xlsx';
import './AlumnosPage.css';

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [importando, setImportando] = useState(false);
  const [mensajeImport, setMensajeImport] = useState('');
  const [showModalAdd, setShowModalAdd] = useState(false);
  const [formAlumno, setFormAlumno] = useState({
    carnet: '',
    nombre: '',
    grado: '',
    seccion: ''
  });

  useEffect(() => {
    cargarAlumnos();
  }, []);

  async function cargarAlumnos() {
    console.log('🔄 Iniciando carga de alumnos...');
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('alumnos')
        .select('*')
        .order('grado', { ascending: true })
        .order('seccion', { ascending: true });

      if (error) {
        console.error('❌ Error Supabase (Alumnos):', error);
      } else {
        console.log('✅ Alumnos cargados:', data?.length || 0);
        setAlumnos(data || []);
      }
    } catch (err) {
      console.error('❌ Excepción cargando alumnos:', err);
    } finally {
      setCargando(false);
      console.log('🏁 Proceso cargarAlumnos finalizado.');
    }
  }

  function handleFiltroChange(e) {
    setFiltro(e.target.value);
  }

  async function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImportando(true);
    setMensajeImport('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      // Procesar filas (columnas: Grado, Sección, Carnet, Nombre, Nivel)
      const alumnosImport = rows
        .filter(r => r['Carnet'] && r['Nombre'])
        .map(r => ({
          carnet: String(r['Carnet']).trim(),
          nombre: r['Nombre'].trim(),
          grado: r['Grado']?.trim() || '',
          seccion: r['Sección']?.trim() || '',
          nivel: r['Nivel']?.trim() || getNivelFromGrado(r['Grado']),
          activo: true,
          bus_hoy: false,
        }));

      // Insertar/actualizar en Supabase
      const { data: inserted, error } = await supabase
        .from('alumnos')
        .upsert(alumnosImport, { onConflict: 'carnet' });

      if (error) throw error;

      setMensajeImport(`✅ Importados ${alumnosImport.length} alumnos exitosamente`);
      cargarAlumnos(); // Recargar lista
    } catch (error) {
      console.error('Error importando:', error);
      setMensajeImport('❌ Error al importar. Verifica el formato del archivo.');
    } finally {
      setImportando(false);
    }
  }

  function getNivelFromGrado(grado = '') {
    const g = grado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const preprimaria = ['nursery', 'pre-kinder', 'prekinder', 'kinder', 'preparatoria'];
    const primaria = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'];

    if (preprimaria.some(p => g.includes(p))) return 'preprimaria';
    if (primaria.some(p => g.includes(p))) return 'primaria';
    return 'secundaria';
  }

  async function handleBusToggle(carnet, nuevoEstado) {
    try {
      const { error } = await supabase
        .from('alumnos')
        .update({ bus_hoy: nuevoEstado })
        .eq('carnet', carnet);

      if (error) throw error;

      setAlumnos(prev =>
        prev.map(a =>
          a.carnet === carnet ? { ...a, bus_hoy: nuevoEstado } : a
        )
      );
    } catch (error) {
      console.error('Error actualizando bus:', error);
    }
  }

  async function handleAddAlumnoManual(e) {
    e.preventDefault();
    if (formAlumno.carnet.length !== 8) return alert("El carnet debe tener 8 dígitos");
    if (!formAlumno.nombre || !formAlumno.grado) return alert("Completa los campos obligatorios");

    setImportando(true);
    try {
      const { error } = await supabase.from('alumnos').insert({
        ...formAlumno,
        nivel: getNivelFromGrado(formAlumno.grado),
        bus_hoy: false,
        activo: true
      });

      if (error) throw error;

      setShowModalAdd(false);
      setFormAlumno({ carnet: '', nombre: '', grado: '', seccion: '' });
      setMensajeImport("✅ Alumno agregado exitosamente");
      cargarAlumnos();
    } catch (err) {
      console.error(err);
      alert("Error al agregar alumno. ¿El carnet ya existe?");
    } finally {
      setImportando(false);
    }
  }

  const alumnosFiltrados = alumnos.filter((a) =>
    a.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    a.carnet.includes(filtro)
  );

  // Componente de card de alumno rediseñado
  function AlumnoCard({ alumno }) {
    const inicial = alumno.nombre.charAt(0);
    const gradients = ['#0F2A4A,#2D7DD2', '#059669,#34D399', '#7C3AED,#A78BFA', '#EA580C,#FB923C'];
    const grad = gradients[alumno.carnet.charCodeAt(7) % 4];

    return (
      <div className="alumno-card-v2">
        {/* Foto */}
        <div className="alumno-foto">
          {alumno.foto_url
            ? <img src={alumno.foto_url} alt={alumno.nombre} />
            : <div className="foto-inicial" style={{ background: `linear-gradient(135deg, ${grad})` }}>
              {inicial}
            </div>
          }
          <FotoUploader
            carnet={alumno.carnet}
            nombreActual={alumno.nombre}
            fotoActual={alumno.foto_url}
            onUploaded={(url) => {
              setAlumnos((prev) =>
                prev.map((x) =>
                  x.carnet === alumno.carnet ? { ...x, foto_url: url } : x
                )
              );
            }}
          >
            <div className="foto-overlay">
              <span>📷</span>
            </div>
          </FotoUploader>
        </div>

        {/* Info */}
        <div className="alumno-info">
          <p className="alumno-nombre">{alumno.nombre}</p>
          <p className="alumno-grado">{alumno.grado} · Sección {alumno.seccion}</p>
          <code className="alumno-carnet">{alumno.carnet}</code>
          <span className={`badge badge-${alumno.nivel}`}>{alumno.nivel}</span>
        </div>

        {/* Switch de bus */}
        <div className="alumno-bus">
          <span className="bus-label">Bus hoy</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={alumno.bus_hoy}
              onChange={() => handleBusToggle(alumno.carnet, !alumno.bus_hoy)}
            />
            <div className="switch-track">
              <div className="switch-thumb" />
            </div>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="alumnos-page">
      <header className="page-header">
        <h1>👤 Gestión de Alumnos</h1>
        <div className="header-actions">
          <button
            className="btn-add-manual"
            onClick={() => setShowModalAdd(true)}
          >
            ➕ Agregar Alumno
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              // Disparamos el click en el botón oculto del AdminPanel para abrir el modal
              document.querySelector('.btn-import')?.click();
            }}
          >
            📊 Importar Excel
          </button>
          <div className="bulk-photo-section">
            <FotoUploader
              onUploaded={(result) => {
                if (result === 'bulk') {
                  cargarAlumnos();
                }
              }}
            />
          </div>
        </div>
      </header>

      {mensajeImport && (
        <div className={`mensaje ${mensajeImport.startsWith('✅') ? 'exito' : 'error'}`}>
          {mensajeImport}
        </div>
      )}

      <div className="alumnos-searchbar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Buscar por nombre o carnet..."
            value={filtro}
            onChange={handleFiltroChange}
          />
          {filtro && (
            <button className="search-clear" onClick={() => setFiltro('')}>✕</button>
          )}
        </div>
        <span className="search-total">{alumnosFiltrados.length} alumnos</span>
      </div>

      {
        cargando ? (
          <div className="loading">Cargando alumnos...</div>
        ) : (
          <div className="alumnos-grid">
            {alumnosFiltrados.map((a) => (
              <AlumnoCard key={a.carnet} alumno={a} />
            ))}
          </div>
        )
      }

      {/* Modal Agregar Manual */}
      {showModalAdd && (
        <div className="modal-overlay">
          <div className="modal-content-premium">
            <div className="modal-header">
              <h2>➕ Nuevo Alumno</h2>
              <button className="btn-close" onClick={() => setShowModalAdd(false)}>✕</button>
            </div>
            <form onSubmit={handleAddAlumnoManual} className="modal-form">
              <div className="form-group">
                <label>Carnet (8 dígitos)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 20261122"
                  value={formAlumno.carnet}
                  onChange={e => setFormAlumno({ ...formAlumno, carnet: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                />
              </div>
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Apellidos, Nombres"
                  value={formAlumno.nombre}
                  onChange={e => setFormAlumno({ ...formAlumno, nombre: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Grado</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cuarto o Kinder"
                  value={formAlumno.grado}
                  onChange={e => setFormAlumno({ ...formAlumno, grado: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Sección</label>
                <input
                  type="text"
                  placeholder="Ej: A"
                  value={formAlumno.seccion}
                  onChange={e => setFormAlumno({ ...formAlumno, seccion: e.target.value.toUpperCase().slice(0, 1) })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModalAdd(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={importando}>
                  {importando ? 'Guardando...' : '💾 Guardar Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  );
}
