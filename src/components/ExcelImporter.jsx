import { useState } from 'react';
import { parseExcelFile, validateAlumnoData } from '../lib/excelUtils';
import { supabase } from '../lib/supabase';
import './ExcelImporter.css';

export default function ExcelImporter({ onImportSuccess, onClose }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState([]);
  const [step, setStep] = useState(1); // 1: seleccionar, 2: vista previa, 3: importando

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const validExtensions = ['xlsx', 'xls', 'csv'];
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setError('❌ Formato inválido. Usa .xlsx, .xls o .csv');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError('');

    try {
      const data = await parseExcelFile(selectedFile);
      setPreview(data.slice(0, 10));
      setStep(2);
    } catch (err) {
      setError(`❌ Error al leer archivo: ${err.message}`);
      setFile(null);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('⚠️ Selecciona un archivo primero');
      return;
    }

    setLoading(true);
    setStep(3);
    setError('');
    setSuccess('');
    setStatus('Leyendo archivo...');
    setProgress(10);

    try {
      const data = await parseExcelFile(file);
      setStatus(`Procesando ${data.length} registros...`);
      setProgress(30);

      // Validar datos
      const validated = [];
      const errors = [];
      
      data.forEach((row, index) => {
        try {
          const validation = validateAlumnoData(row);
          if (validation.isValid) {
            validated.push(validation.data);
          } else {
            errors.push(`Fila ${index + 2}: ${validation.error}`);
          }
        } catch (err) {
          errors.push(`Fila ${index + 2}: ${err.message}`);
        }
      });

      if (errors.length > 0) {
        setError(`⚠️ ${errors.length} errores encontrados:\n${errors.slice(0, 5).join('\n')}`);
        setProgress(100);
        setLoading(false);
        setStep(1);
        return;
      }

      setStatus(`Insertando ${validated.length} registros en la base de datos...`);
      setProgress(50);

      // Insertar en lotes
      const batchSize = 50;
      let inserted = 0;
      let failed = 0;

      for (let i = 0; i < validated.length; i += batchSize) {
        const batch = validated.slice(i, i + batchSize);
        
        try {
          const { error: insertError, data: insertedData } = await supabase
            .from('alumnos')
            .insert(batch)
            .select();

          if (insertError) {
            failed += batch.length;
          } else {
            inserted += (insertedData?.length || 0);
          }
        } catch (err) {
          failed += batch.length;
        }

        setProgress(50 + ((i / validated.length) * 50));
        setStatus(`Insertados: ${inserted} | Fallidos: ${failed}`);
      }

      setProgress(100);

      if (inserted > 0) {
        setSuccess(`✅ ¡Importación exitosa!\n${inserted} alumno(s) agregado(s) a la base de datos.`);
        setTimeout(() => {
          onImportSuccess && onImportSuccess();
          onClose && onClose();
        }, 1500);
      } else {
        setError('❌ No se pudo insertar ningún registro');
        setLoading(false);
        setStep(1);
      }
    } catch (err) {
      setError(`❌ Error: ${err.message}`);
      setLoading(false);
      setStep(1);
    }
  };

  return (
    <div className="excel-importer-overlay">
      <div className="excel-importer-modal">
        <div className="importer-header">
          <h2>📊 Importar Alumnos desde Excel</h2>
          <button className="close-button" onClick={onClose} disabled={loading}>✕</button>
        </div>

        <div className="importer-body">
          {/* Paso 1: Seleccionar archivo */}
          {step === 1 && (
            <div className="step active">
              <div className="file-upload-zone">
                <div className="upload-icon">📁</div>
                <p className="upload-title">Arrastra tu archivo aquí</p>
                <p className="upload-subtitle">o haz clic para seleccionar</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="file-input"
                  disabled={loading}
                />
              </div>

              <div className="format-guide">
                <h4>Formato esperado:</h4>
                <div className="guide-table">
                  <div className="guide-row">
                    <span>Carnet</span>
                    <span>Nombre</span>
                    <span>Grado</span>
                    <span>Sección</span>
                  </div>
                  <div className="guide-row example">
                    <span>001234</span>
                    <span>Ejemplo Alumno</span>
                    <span>Primero</span>
                    <span>A</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Vista previa */}
          {step === 2 && (
            <div className="step active">
              <h3>Vista previa ({preview.length} registros)</h3>
              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Carnet</th>
                      <th>Nombre</th>
                      <th>Grado</th>
                      <th>Sección</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.carnet || '-'}</td>
                        <td>{row.nombre || '-'}</td>
                        <td>{row.grado || '-'}</td>
                        <td>{row.seccion || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paso 3: Importando */}
          {step === 3 && (
            <div className="step active">
              <div className="progress-container">
                <p className="progress-label">{status}</p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  >
                    <span className="progress-text">{progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="message-box error">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="message-box success">
              <p>{success}</p>
            </div>
          )}
        </div>

        <div className="importer-footer">
          {step === 1 && (
            <button className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
          )}

          {step === 2 && (
            <>
              <button 
                className="btn-secondary" 
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Atrás
              </button>
              <button 
                className="btn-primary" 
                onClick={handleImport}
                disabled={loading}
              >
                Importar todos los registros
              </button>
            </>
          )}

          {step === 3 && (
            <button 
              className="btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Cerrar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
