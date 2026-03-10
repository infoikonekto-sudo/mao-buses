import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ExcelImporter from '../../components/ExcelImporter';
import Sidebar from '../../components/Sidebar';
import ScanPage from '../ScanPage';
import AlumnosPage from './AlumnosPage';
import QRPage from './QRPage';
import HistorialPage from './HistorialPage';
import DashboardPage from './DashboardPage';
import AnalyticsPage from './AnalyticsPage';
import BusPage from './BusPage';
import ConfigPage from './ConfigPage';
import logo from '../../assets/logo.png';
import './AdminPanel.css';

export default function AdminPanel() {
  const [showExcelImporter, setShowExcelImporter] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determinar tab activo basado en la ruta
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/admin') return 'dashboard';
    if (path === '/admin/scan') return 'scan';
    if (path === '/admin/alumnos') return 'alumnos';
    if (path === '/admin/qr') return 'qr';
    if (path === '/admin/historial') return 'historial';
    if (path === '/admin/bus') return 'bus';
    if (path === '/admin/analytics') return 'analytics';
    if (path === '/admin/config') return 'config';
    return 'dashboard';
  };

  const handleTabChange = (tabId) => {
    const routes = {
      dashboard: '/admin',
      scan: '/admin/scan',
      alumnos: '/admin/alumnos',
      qr: '/admin/qr',
      historial: '/admin/historial',
      bus: '/admin/bus',
      analytics: '/admin/analytics',
      config: '/admin/config'
    };
    navigate(routes[tabId]);
    setSidebarOpen(false); // Cerrar al navegar en mobile
  };

  return (
    <div className={`admin-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Overlay para cerrar sidebar en mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        activeTab={getActiveTab()}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header moderno con logo, título y usuario */}
        <header className="app-header">
          <div className="app-header-left">
            <button className="hamburger-menu" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            {/* Logo/Título solo visibles en mobile si el sidebar está cerrado, 
                en Desktop el sidebar ya cumple esta función */}
            <div className="app-header-mobile-brand">
              <h1 className="app-title">Mao Salidas</h1>
            </div>
          </div>
          <div className="app-header-right">
            <button
              className="btn-import"
              style={{ display: 'none' }}
              onClick={() => setShowExcelImporter(true)}
            />
            <div className="app-user">
              <div className="app-user-dot">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
              <span className="user-email-text">{user?.email}</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          <Routes>
            <Route path="" element={<DashboardPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="alumnos" element={<AlumnosPage />} />
            <Route path="qr" element={<QRPage />} />
            <Route path="historial" element={<HistorialPage />} />
            <Route path="bus" element={<BusPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="config" element={<ConfigPage />} />
          </Routes>
        </div>
      </main>

      {/* Excel Importer Modal */}
      {showExcelImporter && (
        <ExcelImporter
          onClose={() => setShowExcelImporter(false)}
          onImportSuccess={() => {
            setShowExcelImporter(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
