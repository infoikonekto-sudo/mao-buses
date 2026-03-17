import { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, ChevronDown } from 'lucide-react';
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
import UsersPage from './UsersPage';
import AttendanceReportPage from './AttendanceReportPage';
import AttendanceScanPage from '../AttendanceScanPage';
import logo from '../../assets/logo.png';
import './AdminPanel.css';

export default function AdminPanel() {
  const [showExcelImporter, setShowExcelImporter] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
    if (path === '/admin/users') return 'users';
    if (path === '/admin/asistencia') return 'asistencia';
    if (path === '/admin/marcado') return 'marcado';
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
      config: '/admin/config',
      users: '/admin/users',
      asistencia: '/admin/asistencia',
      marcado: '/admin/marcado'
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
          <div className="app-header-right" ref={menuRef}>
            <button
              className="btn-import"
              style={{ display: 'none' }}
              onClick={() => setShowExcelImporter(true)}
            />
            <div className="topbar-user-container">
              <button 
                className={`topbar-user-button ${showUserMenu ? 'active' : ''}`}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="app-user-dot">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="user-email-text">
                  {user?.email?.includes('@roosevelt.edu') 
                    ? user.email.split('@')[0] 
                    : user?.email}
                </span>
                <ChevronDown size={14} className={`chevron-icon ${showUserMenu ? 'rotate' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="topbar-user-dropdown">
                  <div className="dropdown-info">
                    <span className="info-email">{user?.email}</span>
                    <span className="info-role">{profile?.role || 'Personal'}</span>
                  </div>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item" onClick={() => { navigate('/admin/users'); setShowUserMenu(false); }}>
                    <User size={16} />
                    <span>Mi Perfil</span>
                  </button>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
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
            <Route path="users" element={<UsersPage />} />
            <Route path="asistencia" element={<AttendanceReportPage />} />
            <Route path="marcado" element={<AttendanceScanPage />} />
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
