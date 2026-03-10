import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import JSZip from 'jszip';

export default function FotoUploader({ carnet, nombreActual, fotoActual, onUploaded }) {
  const [preview, setPreview] = useState(fotoActual);
  const [subiendo, setSubiendo] = useState(false);
  const [subiendoMasivo, setSubiendoMasivo] = useState(false);
  const [progresoMasivo, setProgresoMasivo] = useState('');
  const fileInput = useRef(null);
  const zipInput = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setSubiendo(true);

    try {
      const path = `alumnos/${carnet}.jpg`;
      const { error } = await supabase.storage
        .from('fotos-alumnos')
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data } = supabase.storage
        .from('fotos-alumnos')
        .getPublicUrl(path);

      // Actualizar URL en tabla alumnos
      const { error: err2 } = await supabase
        .from('alumnos')
        .update({ foto_url: data.publicUrl })
        .eq('carnet', carnet);

      if (err2) throw err2;

      if (onUploaded) {
        onUploaded(data.publicUrl);
      }
    } catch (err) {
      console.error('Error subiendo foto:', err);
    } finally {
      setSubiendo(false);
    }
  }

  async function handleZipUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendoMasivo(true);
    setProgresoMasivo('Procesando ZIP...');

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const imageFiles = Object.keys(zipContent.files).filter(name =>
        /\.(jpg|jpeg|png)$/i.test(name)
      );

      setProgresoMasivo(`Encontradas ${imageFiles.length} imágenes. Subiendo...`);

      let uploaded = 0;
      for (const fileName of imageFiles) {
        const fileData = await zipContent.files[fileName].async('blob');
        // Extraer carnet del nombre del archivo (asumiendo formato: CARNET.jpg)
        const carnetMatch = fileName.match(/^(\d+)\./);
        if (!carnetMatch) continue;

        const carnet = carnetMatch[1];
        const path = `alumnos/${carnet}.jpg`;

        try {
          const { error } = await supabase.storage
            .from('fotos-alumnos')
            .upload(path, fileData, { upsert: true });

          if (!error) {
            const { data } = supabase.storage
              .from('fotos-alumnos')
              .getPublicUrl(path);

            await supabase
              .from('alumnos')
              .update({ foto_url: data.publicUrl })
              .eq('carnet', carnet);
          }
        } catch (err) {
          console.error(`Error subiendo ${fileName}:`, err);
        }

        uploaded++;
        setProgresoMasivo(`Subidas ${uploaded}/${imageFiles.length} imágenes...`);
      }

      setProgresoMasivo(`✅ Completado: ${uploaded} fotos subidas`);
      setTimeout(() => setProgresoMasivo(''), 3000);

      // Notificar actualización masiva
      if (onUploaded) {
        onUploaded('bulk');
      }
    } catch (err) {
      console.error('Error procesando ZIP:', err);
      setProgresoMasivo('❌ Error procesando el archivo ZIP');
    } finally {
      setSubiendoMasivo(false);
    }
  }

  return (
    <div className="foto-uploader">
      <div
        className="foto-preview"
        onClick={() => fileInput.current.click()}
        style={{ cursor: 'pointer' }}
      >
        {preview ? (
          <img src={preview} alt="Foto alumno" />
        ) : (
          <div className="foto-empty">📷 Click para subir foto</div>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFile}
        disabled={subiendo}
      />
      <small>
        {carnet} · {nombreActual}{' '}
        {subiendo && <em>Subiendo...</em>}
      </small>

      {/* Botón para subida masiva - solo mostrar si no hay carnet específico */}
      {!carnet && (
        <div className="bulk-upload">
          <button
            className="btn-secundario"
            onClick={() => zipInput.current.click()}
            disabled={subiendoMasivo}
          >
            📦 Subir ZIP masivo
          </button>
          <input
            ref={zipInput}
            type="file"
            accept=".zip"
            hidden
            onChange={handleZipUpload}
            disabled={subiendoMasivo}
          />
          {progresoMasivo && <small>{progresoMasivo}</small>}
        </div>
      )}
    </div>
  );
}
