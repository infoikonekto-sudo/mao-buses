import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './ScanPage.css'; // Reutilizamos estilos de ScanPage

export default function AttendanceScanPage() {
    const { profile } = useAuth();
    const [estado, setEstado] = useState('idle');
    const [resultado, setResultado] = useState(null);
    const [carnetManual, setCarnetManual] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [scannerIniciado, setScannerIniciado] = useState(false);
    const scannerRef = useRef(null);
    const processingRef = useRef(false);
    const lastScanRef = useRef({ carnet: null, time: 0 });
    const timeoutRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        const timer = setTimeout(() => {
            iniciarScanner();
        }, 100);

        return () => {
            clearTimeout(timer);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    const iniciarScanner = async () => {
        try {
            const element = document.getElementById('qr-reader-attendance');
            if (!element) return;

            const scanner = new Html5Qrcode('qr-reader-attendance');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 30,
                    qrbox: (viewWidth, viewHeight) => {
                        const size = Math.min(viewWidth, viewHeight) * 0.8;
                        return { width: Math.max(size, 200), height: Math.max(size, 200) };
                    },
                    aspectRatio: 1.0,
                },
                onScanSuccess,
                () => {}
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

        let carnet;
        try {
            const parsed = JSON.parse(rawData);
            carnet = parsed.c;
        } catch {
            const match = rawData.match(/\b\d{8}\b/);
            carnet = match ? match[0] : null;
        }

        if (!carnet) return;

        const ahora = Date.now();
        if (lastScanRef.current.carnet === carnet && (ahora - lastScanRef.current.time) < 10000) return;

        processingRef.current = true;
        lastScanRef.current = { carnet, time: ahora };
        setProcesando(true);
        setEstado('scanning');

        try {
            if (scannerRef.current?.isScanning) {
                await scannerRef.current.stop();
                setScannerIniciado(false);
            }
            await procesarAsistencia(carnet);
        } catch (error) {
            console.error('Error:', error);
            mostrarError('Error procesando el código');
        }
    }, []);

    async function procesarAsistencia(carnet) {
        try {
            const hoy = new Date().toISOString().split('T')[0];

            // 1. Buscar alumno
            const { data: alumno, error: alumnoError } = await supabase
                .from('alumnos')
                .select('*')
                .eq('carnet', carnet)
                .single();

            if (alumnoError || !alumno) {
                mostrarError('Alumno no encontrado');
                return;
            }

            // 2. Verificar si ya marcó hoy
            const { data: existente } = await supabase
                .from('asistencia_dia')
                .select('id')
                .eq('carnet', carnet)
                .eq('fecha_dia', hoy)
                .maybeSingle();

            if (existente) {
                mostrarError(`${alumno.nombre.split(',')[1]?.trim() || alumno.nombre} ya marcó asistencia hoy`);
                return;
            }

            // 3. Registrar asistencia
            const { error: insertError } = await supabase.from('asistencia_dia').insert({
                carnet: alumno.carnet,
                nombre: alumno.nombre,
                grado: alumno.grado,
                seccion: alumno.seccion,
                nivel: alumno.nivel,
                fecha_dia: hoy,
                registrado_por: (await supabase.auth.getUser()).data.user?.id
            });

            if (insertError) throw insertError;

            mostrarExito(alumno);
        } catch (err) {
            console.error(err);
            mostrarError('Error de servidor');
        }
    }

    function mostrarExito(alumno) {
        setResultado({ ok: true, alumno });
        setEstado('success');
        try { if (navigator.vibrate) navigator.vibrate([80]); } catch (e) {}
        
        timeoutRef.current = setTimeout(() => {
            setEstado('idle');
            setResultado(null);
            setProcesando(false);
            processingRef.current = false;
            iniciarScanner();
        }, 1500);
    }

    function mostrarError(msg) {
        setResultado({ ok: false, msg });
        setEstado('error');
        try { if (navigator.vibrate) navigator.vibrate([100, 60, 100]); } catch (e) {}
        
        timeoutRef.current = setTimeout(() => {
            setEstado('idle');
            setResultado(null);
            setProcesando(false);
            processingRef.current = false;
            iniciarScanner();
        }, 1500);
    }

    return (
        <div className={`scan-page attendance ${estado}`}>
            <div className={`connection-status ${navigator.onLine ? 'online' : 'offline'}`}>
                {navigator.onLine ? <span>● Conectado (Asistencia)</span> : <span>! Modo Offline</span>}
            </div>

            <div className="scan-header">
                <div className="scan-logo">📝</div>
                <div>
                    <h1 className="scan-title">Marcado de Asistencia</h1>
                    <p className="scan-sub">Entrada matutina - Colegio MAO</p>
                </div>
            </div>

            <div className="scan-status">
                {!scannerIniciado && <div className="status-message"><div className="spinner"></div><p>Iniciando cámara...</p></div>}
                {scannerIniciado && estado === 'idle' && <div className="status-message"><span className="status-icon">📷</span><p>Escanea el carnet del alumno</p></div>}
            </div>

            <div className="scan-visor-container">
                <div className="scan-visor-wrapper">
                    <div id="qr-reader-attendance" className="scan-visor"></div>
                    <div className="scan-corner top-left"></div>
                    <div className="scan-corner top-right"></div>
                    <div className="scan-corner bottom-left"></div>
                    <div className="scan-corner bottom-right"></div>
                    {estado === 'idle' && <div className="scan-line"></div>}
                </div>
            </div>

            {(estado === 'success' || estado === 'error') && resultado && (
                <div className={`scan-overlay ${estado}`}>
                    <div className="overlay-content">
                        {estado === 'success' ? (
                            <>
                                <div className="success-icon">✅</div>
                                <h3>Asistencia Registrada</h3>
                                <div className="alumno-info">
                                    <div className="alumno-foto">
                                        {resultado.alumno.foto_url ? (
                                            <img src={resultado.alumno.foto_url} alt="Foto" />
                                        ) : (
                                            <div className="foto-placeholder">{resultado.alumno.nombre.charAt(0)}</div>
                                        )}
                                    </div>
                                    <div className="alumno-details">
                                        <p className="alumno-nombre">{resultado.alumno.nombre.split(',').reverse().join(' ').trim()}</p>
                                        <p className="alumno-grado">{resultado.alumno.grado} · {resultado.alumno.seccion}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="error-icon">⚠️</div>
                                <h3>Aviso</h3>
                                <p className="error-message">{resultado.msg}</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="scan-manual">
                <div className="manual-input-group">
                    <input
                        type="text"
                        className="manual-input"
                        placeholder="Carnet Manual"
                        value={carnetManual}
                        onChange={(e) => setCarnetManual(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        maxLength={8}
                    />
                    <button
                        className="manual-submit"
                        disabled={carnetManual.length !== 8 || procesando}
                        onClick={() => procesarAsistencia(carnetManual)}
                    >
                        Registrar
                    </button>
                </div>
            </div>
        </div>
    );
}
