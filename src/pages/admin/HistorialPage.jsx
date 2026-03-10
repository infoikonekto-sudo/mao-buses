import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import './HistorialPage.css';

export default function HistorialPage() {
  const [entradas, setEntradas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarHistorial();
  }, []);

  async function cargarHistorial() {
    setCargando(true);
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cola_dia')
      .select('*')
      .eq('fecha_dia', hoy)
      .order('turno', { ascending: true });

    if (!error && data) setEntradas(data);
    setCargando(false);
  }

  function exportarCSV() {
    const headers = ['turno','carnet','nombre','grado','seccion','nivel','bus','estado','hora_escaneo','hora_entrega'];
    const rows = entradas.map(e => headers.map(h => e[h]));
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_${hoy}.csv`;
    a.click();
  }

  return (
    <div>
      <h1>📜 Historial</h1>
      <button className="btn-primario" onClick={exportarCSV} disabled={entradas.length === 0}>
        Exportar CSV
      </button>

      {cargando ? (
        <p>Cargando historial...</p>
      ) : (
        <table className="historial-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Carnet</th>
              <th>Nombre</th>
              <th>Grado</th>
              <th>Secc.</th>
              <th>Bus</th>
              <th>Estado</th>
              <th>Escaneo</th>
              <th>Entrega</th>
            </tr>
          </thead>
          <tbody>
            {entradas.map((e, idx) => (
              <tr key={e.id}>
                <td>{e.turno}</td>
                <td>{e.carnet}</td>
                <td>{e.nombre}</td>
                <td>{e.grado}</td>
                <td>{e.seccion}</td>
                <td>{e.bus ? '🚌' : ''}</td>
                <td>{e.estado}</td>
                <td>{new Date(e.hora_escaneo).toLocaleTimeString()}</td>
                <td>{e.hora_entrega ? new Date(e.hora_entrega).toLocaleTimeString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}