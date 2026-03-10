import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import './ScanPage.css';

export default function ScanPage() {
  const [estado, setEstado] = useState('idle'); // idle | scanning | success | error
  const [resultado, setResultado] = useState(null);
  const [carnetManual, setCarnetManual] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [scannerIniciado, setScannerIniciado] = useState(false);
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const lastScanRef = useRef({ carnet: null, time: 0 }); // Enfriamiento por carnet
  const timeoutRef = useRef(null);
  const location = useLocation();
  const showLocalHeader = !location.pathname.startsWith('/admin');

  useEffect(() => {
    const timer = setTimeout(() => {
      iniciarScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (scannerRef.current) {
        // Detener solo si está activo
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(err => { });
          }
        } catch (e) { }
      }
    };
  }, []);

  const iniciarScanner = async () => {
    try {
      const element = document.getElementById('qr-reader');
      if (!element) return;

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 30, // Aumentado a 30 FPS para máxima velocidad
          qrbox: (viewWidth, viewHeight) => {
            const size = Math.min(viewWidth, viewHeight) * 0.8;
            return { width: Math.max(size, 200), height: Math.max(size, 200) };
          },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        () => { }
      );
      setScannerIniciado(true);
    } catch (error) {
      console.error('Error iniciando scanner:', error);
      setEstado('error');
      setResultado({ ok: false, msg: 'Error al acceder a la cámara' });
    }
  };

  const onScanSuccess = useCallback(async (rawData) => {
    if (processingRef.current) return;

    // 1. Extraer carnet inmediatamente
    let carnet;
    try {
      const parsed = JSON.parse(rawData);
      carnet = parsed.c;
    } catch {
      const match = rawData.match(/\b\d{8}\b/);
      carnet = match ? match[0] : null;
    }

    if (!carnet) return;

    // 2. Bloqueo por carnet (Enfriamiento de 10 segundos)
    const ahora = Date.now();
    if (lastScanRef.current.carnet === carnet && (ahora - lastScanRef.current.time) < 10000) {
      console.log(`Bloqueo de duplicado para carnet ${carnet}`);
      return;
    }

    // 3. Bloqueo de procesamiento global
    processingRef.current = true;
    lastScanRef.current = { carnet, time: ahora };

    setProcesando(true);
    setEstado('scanning');

    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        setScannerIniciado(false);
      }

      await procesarScan(rawData);
    } catch (error) {
      console.error('Error procesando scan:', error);
      mostrarError('Error procesando el código');
    }
  }, [scannerIniciado]);

  async function procesarScan(rawData) {
    try {
      console.log('Procesando QR:', rawData);

      // Extraer carnet del QR
      let carnet;
      try {
        const parsed = JSON.parse(rawData);
        carnet = parsed.c;
      } catch {
        // Buscar patrón de 8 dígitos
        const match = rawData.match(/\b\d{8}\b/);
        carnet = match ? match[0] : null;
      }

      if (!carnet) {
        mostrarError('Código QR no válido');
        return;
      }

      console.log('Carnet extraído:', carnet);

      // Buscar alumno en Supabase
      const { data: alumno, error } = await supabase
        .from('alumnos')
        .select('*')
        .eq('carnet', carnet)
        .single();

      if (error || !alumno) {
        console.error('Alumno no encontrado:', error);
        mostrarError('Alumno no encontrado en el sistema');
        return;
      }

      console.log('Alumno encontrado:', alumno);

      // Anti-duplicado: verificar si ya fue escaneado en los últimos 3 minutos
      const hace3min = new Date(Date.now() - 180000).toISOString();
      const hoy = new Date().toISOString().split('T')[0];

      // Si estamos offline, guardar localmente y omitir verificación de duplicados remota por ahora
      if (!navigator.onLine) {
        console.log('Modo Offline detectado. Guardando localmente...');
        guardarEscaneoLocal({
          carnet: alumno.carnet,
          nombre: alumno.nombre,
          grado: alumno.grado,
          seccion: alumno.seccion,
          nivel: alumno.nivel,
          foto_url: alumno.foto_url,
          bus: alumno.bus_hoy,
          fecha_dia: hoy,
          estado: 'esperando',
          hora_escaneo: new Date().toISOString()
        });
        mostrarExito(alumno);
        return;
      }

      const { data: existente } = await supabase
        .from('cola_dia')
        .select('id')
        .eq('carnet', carnet)
        .eq('fecha_dia', hoy)
        .gte('hora_escaneo', hace3min);

      if (existente && existente.length > 0) {
        mostrarError(`${alumno.nombre.split(',')[1]?.trim() || alumno.nombre} ya fue escaneado recientemente`);
        return;
      }

      const nivelReal = getNivelFromGrado(alumno.grado);

      // Insertar en cola_dia
      const { error: insertError } = await supabase.from('cola_dia').insert({
        carnet: alumno.carnet,
        nombre: alumno.nombre,
        grado: alumno.grado,
        seccion: alumno.seccion,
        nivel: nivelReal, // Usar el nivel calculado para evitar errores de visualización
        foto_url: alumno.foto_url,
        bus: alumno.bus_hoy,
        fecha_dia: hoy,
        estado: 'esperando',
        hora_escaneo: new Date().toISOString(),
        turno: 0 // Valor por defecto temporal para evitar error NOT NULL hasta parche DB
      });

      if (insertError) {
        console.error('Error insertando en cola:', insertError);
        mostrarError('Error al registrar la salida');
        return;
      }

      console.log('Registro insertado correctamente');
      mostrarExito(alumno);

    } catch (err) {
      console.error('Error procesando scan:', err);
      mostrarError('Error de conexión. Intenta de nuevo.');
    }
  }

  // Lógica de Mapeo de Niveles Robustas
  function getNivelFromGrado(grado = '') {
    const g = grado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const preprimaria = ['nursery', 'pre-kinder', 'prekinder', 'kinder', 'preparatoria'];
    const primaria = ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'];

    if (preprimaria.some(p => g.includes(p))) return 'preprimaria';
    if (primaria.some(p => g.includes(p))) return 'primaria';
    return 'secundaria';
  }

  // Lógica Offline
  function guardarEscaneoLocal(datos) {
    const pendientes = JSON.parse(localStorage.getItem('scans_pendientes') || '[]');
    pendientes.push(datos);
    localStorage.setItem('scans_pendientes', JSON.stringify(pendientes));
    console.log('Escaneo guardado localmente. Total pendientes:', pendientes.length);
  }

  const sincronizarEscaneos = useCallback(async () => {
    if (!navigator.onLine) return;

    const pendientes = JSON.parse(localStorage.getItem('scans_pendientes') || '[]');
    if (pendientes.length === 0) return;

    console.log(`Sincronizando ${pendientes.length} escaneos pendientes...`);

    try {
      const { error } = await supabase.from('cola_dia').insert(pendientes);
      if (!error) {
        localStorage.removeItem('scans_pendientes');
        console.log('Sincronización exitosa');
      } else {
        console.error('Error en sincronización:', error);
      }
    } catch (err) {
      console.error('Error de red en sincronización:', err);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Conexión recuperada. Iniciando sincronización...');
      sincronizarEscaneos();
    };

    window.addEventListener('online', handleOnline);
    // Intentar sincronizar al cargar si estamos online
    if (navigator.onLine) sincronizarEscaneos();

    return () => window.removeEventListener('online', handleOnline);
  }, [sincronizarEscaneos]);

  function mostrarExito(alumno) {
    setResultado({ ok: true, alumno });
    setEstado('success');

    // Vibración (con manejo de errores de seguridad del navegador)
    try {
      if (navigator.vibrate) navigator.vibrate([80]);
    } catch (e) { console.log("Vibración bloqueada"); }

    // Beep de éxito
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log('Audio no disponible');
    }

    // Reiniciar scanner después del timeout
    timeoutRef.current = setTimeout(() => {
      setEstado('idle');
      setResultado(null);
      setProcesando(false);
      processingRef.current = false; // Liberar bloqueo
      iniciarScanner();
    }, 1500); // Reducido de 3s a 1.5s para mayor agilidad
  }

  function mostrarError(msg) {
    setResultado({ ok: false, msg });
    setEstado('error');

    try {
      if (navigator.vibrate) navigator.vibrate([100, 60, 100]);
    } catch (e) { console.log("Vibración bloqueada"); }

    // Reiniciar scanner después del timeout
    timeoutRef.current = setTimeout(() => {
      setEstado('idle');
      setResultado(null);
      setProcesando(false);
      processingRef.current = false; // Liberar bloqueo
      iniciarScanner();
    }, 1500); // Reducido a 1.5s
  }

  const handleManualSubmit = async () => {
    if (carnetManual.length !== 8) return;
    await procesarScan(JSON.stringify({ c: carnetManual }));
    setCarnetManual('');
  };

  return (
    <div className={`scan-page ${estado}`}>
      {/* Indicador de Conexión */}
      <div className={`connection-status ${navigator.onLine ? 'online' : 'offline'}`}>
        {navigator.onLine ? (
          <span>● Conectado</span>
        ) : (
          <span>! Modo Offline</span>
        )}
        {JSON.parse(localStorage.getItem('scans_pendientes') || '[]').length > 0 && (
          <span className="pending-badge">
            ({JSON.parse(localStorage.getItem('scans_pendientes') || '[]').length} pendientes)
          </span>
        )}
      </div>

      {/* Header solo para ruta independiente */}
      {showLocalHeader && (
        <div className="scan-header">
          <div className="scan-logo">🏫</div>
          <div>
            <h1 className="scan-title">Colegio MAO</h1>
            <p className="scan-sub">Sistema de Control de Salida</p>
          </div>
        </div>
      )}

      {/* Estado del scanner */}
      <div className="scan-status">
        {!scannerIniciado && (
          <div className="status-message">
            <div className="spinner"></div>
            <p>Iniciando cámara...</p>
          </div>
        )}
        {scannerIniciado && estado === 'idle' && (
          <div className="status-message">
            <span className="status-icon">📱</span>
            <p>Apunta la cámara al código QR</p>
          </div>
        )}
        {estado === 'scanning' && (
          <div className="status-message">
            <div className="spinner"></div>
            <p>Procesando...</p>
          </div>
        )}
      </div>

      {/* Visor de cámara */}
      <div className="scan-visor-container">
        <div className="scan-visor-wrapper">
          <div id="qr-reader" className="scan-visor"></div>

          {/* Esquinas del marco */}
          <div className="scan-corner top-left"></div>
          <div className="scan-corner top-right"></div>
          <div className="scan-corner bottom-left"></div>
          <div className="scan-corner bottom-right"></div>

          {/* Línea de escaneo animada */}
          {estado === 'idle' && <div className="scan-line"></div>}
        </div>
      </div>

      {/* Overlay de resultado */}
      {(estado === 'success' || estado === 'error') && resultado && (
        <div className={`scan-overlay ${estado}`}>
          <div className="overlay-content">
            {estado === 'success' ? (
              <>
                <div className="success-icon">✅</div>
                <h3>¡Salida Registrada!</h3>
                <div className="alumno-info">
                  <div className="alumno-foto">
                    {resultado.alumno.foto_url ? (
                      <img src={resultado.alumno.foto_url} alt="Foto" />
                    ) : (
                      <div className="foto-placeholder">
                        {resultado.alumno.nombre.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="alumno-details">
                    <p className="alumno-nombre">
                      {resultado.alumno.nombre.split(',').reverse().join(' ').trim()}
                    </p>
                    <p className="alumno-grado">
                      {resultado.alumno.grado} · Sección {resultado.alumno.seccion}
                    </p>
                    {resultado.alumno.bus_hoy && (
                      <span className="bus-badge">🚌 Va en bus</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="error-icon">⚠️</div>
                <h3>Error</h3>
                <p className="error-message">{resultado.msg}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Entrada manual */}
      <div className="scan-manual">
        <div className="manual-divider">
          <span>— o ingresa manualmente —</span>
        </div>

        <div className="manual-input-group">
          <input
            type="text"
            className="manual-input"
            placeholder="Ej: 20260123"
            value={carnetManual}
            onChange={(e) => setCarnetManual(e.target.value.replace(/\D/g, '').slice(0, 8))}
            maxLength={8}
          />
          <button
            className="manual-submit"
            disabled={carnetManual.length !== 8 || procesando}
            onClick={handleManualSubmit}
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="scan-footer">
        <button
          className="btn-secondary"
          onClick={() => window.open('/admin', '_blank')}
        >
          📊 Ir al Panel
        </button>
        <button
          className="btn-secondary"
          onClick={() => window.open('/admin/cola', '_blank')}
        >
          📋 Ver Cola
        </button>
      </div>
    </div>
  );
}
