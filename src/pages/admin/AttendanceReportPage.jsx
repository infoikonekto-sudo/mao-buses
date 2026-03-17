import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, Download, FileText, Users, UserCheck, UserX, Bus, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './AttendanceReportPage.css';

export default function AttendanceReportPage() {
    const { profile } = useAuth();
    const [alumnos, setAlumnos] = useState([]);
    const [asistencias, setAsistencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0]);
    const [filtroTexto, setFiltroTexto] = useState('');
    const [filtroGrado, setFiltroGrado] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('todos'); // todos | presente | ausente
    const [exportando, setExportando] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, [filtroFecha]);

    async function cargarDatos() {
        setLoading(true);
        try {
            // 1. Cargar alumnos según áreas del perfil
            let queryAlumnos = supabase.from('alumnos').select('*').eq('activo', true);
            
            if (profile?.role !== 'superadmin') {
                queryAlumnos = queryAlumnos.in('nivel', profile?.areas_p || []);
            }

            const { data: dataAlumnos } = await queryAlumnos;

            // 2. Cargar asistencias del día
            const { data: dataAsis } = await supabase
                .from('asistencia_dia')
                .select('*')
                .eq('fecha_dia', filtroFecha);

            setAlumnos(dataAlumnos || []);
            setAsistencias(dataAsis || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    // Lógica de filtrado combinada
    const alumnosProcesados = alumnos.map(alumno => {
        const asistencia = asistencias.find(a => a.carnet === alumno.carnet);
        return {
            ...alumno,
            presente: !!asistencia,
            hora_entrada: asistencia ? new Date(asistencia.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
        };
    }).filter(a => {
        const matchTexto = a.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) || a.carnet.includes(filtroTexto);
        const matchGrado = !filtroGrado || a.grado === filtroGrado;
        const matchEstado = filtroEstado === 'todos' || (filtroEstado === 'presente' ? a.presente : !a.presente);
        return matchTexto && matchGrado && matchEstado;
    });

    const stats = {
        total: alumnosProcesados.length,
        presentes: alumnosProcesados.filter(a => a.presente).length,
        ausentes: alumnosProcesados.filter(a => !a.presente).length,
        enBus: alumnosProcesados.filter(a => a.bus_hoy).length
    };

    function exportarExcel() {
        setExportando(true);
        const data = alumnosProcesados.map(a => ({
            Carnet: a.carnet,
            Nombre: a.nombre,
            Grado: a.grado,
            Sección: a.seccion,
            Nivel: a.nivel,
            Estado: a.presente ? 'PRESENTE' : 'AUSENTE',
            'Hora Entrada': a.hora_entrada || '--:--',
            'Usa Bus': a.bus_hoy ? 'SÍ' : 'NO'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
        XLSX.writeFile(wb, `Asistencia_${filtroFecha}.xlsx`);
        setExportando(false);
    }

    function exportarPDF() {
        setExportando(true);
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Membrete
        doc.setFillColor(15, 42, 74); // Azul Institucional
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('COLEGIO MANOS A LA OBRA', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text('REPORTE OFICIAL DE ASISTENCIA DIARIA', pageWidth / 2, 28, { align: 'center' });

        // Info Reporte
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(11);
        doc.text(`Fecha: ${filtroFecha}`, 14, 50);
        doc.text(`Generado por: ${profile?.email?.split('@')[0] || 'Admin'}`, 14, 56);
        doc.text(`Áreas: ${profile?.areas_p?.join(', ') || 'General'}`, 14, 62);

        // Stats resumidas
        doc.text(`Total Alumnos: ${stats.total}`, pageWidth - 50, 50);
        doc.text(`Presentes: ${stats.presentes}`, pageWidth - 50, 56);
        doc.text(`Ausentes: ${stats.ausentes}`, pageWidth - 50, 62);

        const tableData = alumnosProcesados.map(a => [
            a.carnet,
            a.nombre,
            `${a.grado} - ${a.seccion}`,
            a.presente ? 'PRESENTE' : 'AUSENTE',
            a.hora_entrada || '--:--',
            a.bus_hoy ? 'SÍ' : 'NO'
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['Carnet', 'Nombre del Alumno', 'Grado/Sec', 'Estado', 'Entrada', 'Bus']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [15, 42, 74], textColor: 255 },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    const status = data.cell.raw;
                    if (status === 'AUSENTE') {
                        doc.setTextColor(220, 38, 38); // Rojo para ausentes
                    } else {
                        doc.setTextColor(22, 163, 74); // Verde para presentes
                    }
                }
            },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { top: 70 }
        });

        doc.save(`Asistencia_Premium_${filtroFecha}.pdf`);
        setExportando(false);
    }

    const gradosUnicos = [...new Set(alumnos.map(a => a.grado))].sort();

    return (
        <div className="attendance-report">
            <header className="report-header">
                <div>
                    <h1>📋 Reporte de Asistencia</h1>
                    <p>Visualización por registros de entrada y áreas asignadas.</p>
                </div>
                <div className="header-controls">
                    <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="date-input" />
                    <div className="export-buttons">
                        <button className="btn-export pdf" onClick={exportarPDF} disabled={exportando}>
                            <FileText size={18} /> {exportando ? '...' : 'PDF'}
                        </button>
                        <button className="btn-export excel" onClick={exportarExcel} disabled={exportando}>
                            <Download size={18} /> {exportando ? '...' : 'Excel'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="stats-strip">
                <div className="stat-item">
                    <Users className="i-total" />
                    <div><span>{stats.total}</span><p>Matrícula</p></div>
                </div>
                <div className="stat-item">
                    <UserCheck className="i-check" />
                    <div><span>{stats.presentes}</span><p>Presentes</p></div>
                </div>
                <div className="stat-item">
                    <UserX className="i-x" />
                    <div><span>{stats.ausentes}</span><p>Ausentes</p></div>
                </div>
                <div className="stat-item">
                    <Bus className="i-bus" />
                    <div><span>{stats.enBus}</span><p>En Bus</p></div>
                </div>
            </div>

            <section className="filter-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input type="text" placeholder="Buscar por nombre o carnet..." value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
                </div>
                <div className="select-filters">
                    <select value={filtroGrado} onChange={e => setFiltroGrado(e.target.value)}>
                        <option value="">Todos los Grados</option>
                        {gradosUnicos.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <div className="toggle-group">
                        <button className={filtroEstado === 'todos' ? 'active' : ''} onClick={() => setFiltroEstado('todos')}>Todos</button>
                        <button className={filtroEstado === 'presente' ? 'active' : ''} onClick={() => setFiltroEstado('presente')}>Presentes</button>
                        <button className={filtroEstado === 'ausente' ? 'active' : ''} onClick={() => setFiltroEstado('ausente')}>Ausentes</button>
                    </div>
                </div>
            </section>

            <div className="table-container shadow-sm">
                {loading ? <div className="loader-p">Cargando datos...</div> : (
                    <table>
                        <thead>
                            <tr>
                                <th>Alumno</th>
                                <th>Grado / Sección</th>
                                <th>Estado</th>
                                <th>Hora Entrada</th>
                                <th>Bus</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alumnosProcesados.map(a => (
                                <tr key={a.carnet} className={!a.presente ? 'row-absent' : ''}>
                                    <td data-label="Alumno">
                                        <div className="cell-user">
                                            <div className="mini-avatar">{a.nombre.charAt(0)}</div>
                                            <div>
                                                <p className="u-name">{a.nombre}</p>
                                                <p className="u-id">{a.carnet}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Grado / Sección">
                                        <span className="u-grade">{a.grado}</span>
                                        <span className="u-section">{a.seccion}</span>
                                    </td>
                                    <td data-label="Estado">
                                        <span className={`status-pill ${a.presente ? 'present' : 'absent'}`}>
                                            {a.presente ? 'Presente' : 'Ausente'}
                                        </span>
                                    </td>
                                    <td data-label="Hora Entrada" className="u-time">{a.hora_entrada || '--:--'}</td>
                                    <td data-label="Bus">{a.bus_hoy ? <span className="bus-icon">🚌</span> : '--'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
