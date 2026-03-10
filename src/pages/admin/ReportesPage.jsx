import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import './ReportesPage.css';

export default function ReportesPage() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0]);
  const [resumen, setResumen] = useState({});
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    cargarRegistros();
  }, [filtroFecha]);

  async function cargarRegistros() {
    setCargando(true);
    const { data, error } = await supabase
      .from('cola_dia')
      .select('*')
      .eq('fecha_dia', filtroFecha)
      .order('turno', { ascending: true });

    if (!error && data) {
      setRegistros(data);
      calcularResumen(data);
    }
    setCargando(false);
  }

  function calcularResumen(datos) {
    const resumenTmp = {
      total: datos.length,
      preprimaria: datos.filter(d => d.alumnos?.nivel === 'preprimaria').length,
      primaria: datos.filter(d => d.alumnos?.nivel === 'primaria').length,
      secundaria: datos.filter(d => d.alumnos?.nivel === 'secundaria').length,
      conFoto: datos.filter(d => d.foto_url).length,
      conBus: datos.filter(d => d.bus).length,
    };
    setResumen(resumenTmp);
  }

  function exportarExcel() {
    setExportando(true);
    const datosExcel = registros.map(r => ({
      Carnet: r.carnet,
      Nombre: r.alumnos?.nombre || 'N/A',
      Grado: r.alumnos?.grado || 'N/A',
      Sección: r.alumnos?.seccion || 'N/A',
      Nivel: r.alumnos?.nivel || 'N/A',
      Hora: new Date(r.hora).toLocaleTimeString(),
      Autobús: r.bus ? 'Sí' : 'No',
      'Con foto': r.foto_url ? 'Sí' : 'No',
    }));

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registro');
    XLSX.writeFile(wb, `salidas-${filtroFecha}.xlsx`);
    setExportando(false);
  }

  return (
    <div className="reportes-page">
      <div className="page-header">
        <h1>📊 Reportes de Salidas</h1>
        <div className="header-actions">
          <input
            type="date"
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
          />
          <button
            className="btn-primario"
            onClick={exportarExcel}
            disabled={exportando || registros.length === 0}
          >
            {exportando ? 'Exportando...' : '📥 Exportar Excel'}
          </button>
        </div>
      </div>

      <div className="resumen-grid">
        <div className="resumen-card">
          <div className="resumen-numero">{resumen.total}</div>
          <div className="resumen-label">Total Salidas</div>
        </div>
        <div className="resumen-card">
          <div className="resumen-numero">{resumen.preprimaria || 0}</div>
          <div className="resumen-label">Preprimaria</div>
        </div>
        <div className="resumen-card">
          <div className="resumen-numero">{resumen.primaria || 0}</div>
          <div className="resumen-label">Primaria</div>
        </div>
        <div className="resumen-card">
          <div className="resumen-numero">{resumen.secundaria || 0}</div>
          <div className="resumen-label">Secundaria</div>
        </div>
        <div className="resumen-card">
          <div className="resumen-numero">{resumen.conFoto || 0}</div>
          <div className="resumen-label">Con Foto</div>
        </div>
        <div className="resumen-card">
          <div className="resumen-numero">{resumen.conBus || 0}</div>
          <div className="resumen-label">En Autobús</div>
        </div>
      </div>

      <div className="registros-table">
        {cargando ? (
          <p className="loading">Cargando registros...</p>
        ) : registros.length === 0 ? (
          <p className="loading">No hay registros para esta fecha</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Carnet</th>
                <th>Nombre</th>
                <th>Grado</th>
                <th>Nivel</th>
                <th>Autobús</th>
                <th>Foto</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => (
                <tr key={i} className={r.bus ? 'con-bus' : ''}>
                  <td>{new Date(r.hora).toLocaleTimeString()}</td>
                  <td className="carnet">{r.carnet}</td>
                  <td className="nombre">{r.alumnos?.nombre || 'N/A'}</td>
                  <td>{r.alumnos?.grado || 'N/A'}</td>
                  <td className="nivel">{r.alumnos?.nivel || 'N/A'}</td>
                  <td className="bus-cell">{r.bus ? '🚌' : '—'}</td>
                  <td className="foto-cell">{r.foto_url ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
