import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import './QRPage.css';

// Componente de Tarjeta QR para previsualización
function QRCard({ alumno, dark = false }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const generate = async () => {
      const data = JSON.stringify({ c: alumno.carnet });
      const qrUrl = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      });
      setUrl(qrUrl);
    };
    generate();
  }, [alumno.carnet]);

  return (
    <div className="qr-card-premium">
      <div className="qr-card-image-wrap">
        {url ? <img src={url} alt={`QR ${alumno.nombre}`} /> : <div className="spinner-small" />}
      </div>
      <div className="qr-card-info">
        <h3>{alumno.nombre}</h3>
        <p>{alumno.grado}</p>
        <p>Sección {alumno.seccion}</p>
        <div className="qr-card-carnet">{alumno.carnet}</div>
      </div>
    </div>
  );
}

export default function QRPage() {
  const [carnetInput, setCarnetInput] = useState('');
  const [individualStudent, setIndividualStudent] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [filtroGrado, setFiltroGrado] = useState('');

  useEffect(() => {
    cargarAlumnos();
  }, []);

  async function cargarAlumnos() {
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .order('grado', { ascending: true })
      .order('seccion', { ascending: true });
    if (!error && data) {
      setAlumnos(data);
    }
  }

  async function buscarIndividual() {
    if (!/^\d{8}$/.test(carnetInput)) return;
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .eq('carnet', carnetInput)
      .single();

    if (!error && data) {
      setIndividualStudent(data);
    } else {
      alert("Alumno no encontrado");
    }
  }

  async function generarCarnetsPDF() {
    setGenerandoPDF(true);
    const doc = new jsPDF();
    const alumnosParaGenerar = alumnos.filter(a =>
      !filtroGrado || a.grado === filtroGrado
    );

    let y = 20;
    let x = 20;

    for (let i = 0; i < alumnosParaGenerar.length; i++) {
      const alumno = alumnosParaGenerar[i];
      const qrData = JSON.stringify({ c: alumno.carnet });
      const qrUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 200,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      });

      // Diseño en el PDF amigable y premium
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(alumno.nombre.toUpperCase(), x, y);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`${alumno.grado} - Sección ${alumno.seccion}`, x, y + 6);
      doc.text(`ID: ${alumno.carnet}`, x, y + 11);

      doc.addImage(qrUrl, 'PNG', x, y + 15, 40, 40);

      x += 65;
      if (x > 180) {
        x = 20;
        y += 75;
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
      }
    }

    doc.save(`carnets-${filtroGrado || 'todos'}.pdf`);
    setGenerandoPDF(false);
  }

  const gradosUnicos = [...new Set(alumnos.map(a => a.grado))].sort();
  const alumnosFiltrados = alumnos.filter(a => !filtroGrado || a.grado === filtroGrado);

  return (
    <div className="qr-page">
      <header className="page-header">
        <h1>🎫 Generador de QR Premium</h1>
      </header>

      <section className="qr-section">
        <h2>Visualizar QR Individual</h2>
        <div className="qr-controls">
          <input
            type="text"
            placeholder="Carnet (8 dígitos)"
            value={carnetInput}
            onChange={e => setCarnetInput(e.target.value.replace(/[^0-9]/g, ''))}
            maxLength={8}
          />
          <button className="btn-marketing" onClick={buscarIndividual} disabled={!/^\d{8}$/.test(carnetInput)}>
            🔍 Buscar y Visualizar
          </button>
        </div>

        {individualStudent && (
          <div className="qr-preview-grid">
            <QRCard alumno={individualStudent} />
          </div>
        )}
      </section>

      <section className="carnets-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h2>Previsualización y Descarga Masiva</h2>
          <div className="pdf-controls" style={{ marginTop: 0 }}>
            <select value={filtroGrado} onChange={e => setFiltroGrado(e.target.value)}>
              <option value="">Cargar todos los grados</option>
              {gradosUnicos.map(grado => (
                <option key={grado} value={grado}>{grado}</option>
              ))}
            </select>
            <button
              className="btn-marketing"
              onClick={generarCarnetsPDF}
              disabled={generandoPDF || alumnosFiltrados.length === 0}
            >
              {generandoPDF ? '⚙️ Procesando...' : `📄 Descargar PDF (${alumnosFiltrados.length})`}
            </button>
          </div>
        </div>

        <p className="info-text">
          Estás previsualizando {alumnosFiltrados.length} carnets listos para impresión.
        </p>

        <div className="qr-preview-grid">
          {alumnosFiltrados.slice(0, 30).map(alumno => (
            <QRCard key={alumno.carnet} alumno={alumno} />
          ))}
          {alumnosFiltrados.length > 30 && (
            <div className="info-text" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
              Mostrando solo los primeros 30 para rendimiento. El PDF incluirá los {alumnosFiltrados.length} alumnos.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
