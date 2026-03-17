import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ChevronUp } from 'lucide-react';
import logo from '../assets/logo.png';
import './Sidebar.css';

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }) {
  const { logout, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const routes = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin', permission: 'dashboard' },
    { id: 'scan', label: 'Escanear', icon: '📱', path: '/admin/scan', permission: 'scan' },
    { id: 'alumnos', label: 'Alumnos', icon: '👥', path: '/admin/alumnos', permission: 'alumnos' },
    { id: 'bus', label: 'Gestión de Bus', icon: '🚌', path: '/admin/bus', permission: 'bus' },
    { id: 'qr', label: 'QR / Carnets', icon: '🎫', path: '/admin/qr', permission: 'qr' },
    { id: 'historial', label: 'Historial', icon: '🕒', path: '/admin/historial', permission: 'historial' },
    { id: 'analiticas', label: 'Analíticas', icon: '📈', path: '/admin/analytics', permission: 'analiticas' },
    { id: 'asistencia', label: 'Reporte Asistencia', icon: '📋', path: '/admin/asistencia', permission: 'asistencia' },
    { id: 'users', label: 'Gestión Usuarios', icon: '🔐', path: '/admin/users', permission: 'users' },
    { id: 'config', label: 'Configuración', icon: '⚙️', path: '/admin/config', permission: 'config' },
  ];

  const isProfileLoading = user && !profile;

  const filteredRoutes = routes.filter(route => {
    // Si no hay perfil, pero hay usuario, ocultamos rutas admin temporalmente
    if (!profile) return false;

    // Superadmin tiene acceso a todo
    if (profile.role === 'superadmin') return true;

    // Verificar permiso específico (debe ser distinto de 'none')
    const userPerm = profile.permissions?.[route.permission];
    return userPerm && userPerm !== 'none';
  });

  // enlaces a las pantallas de cola (se abren en pestaña nueva)
  const displayRoutes = [
    { id: 'pantalla-primaria', icon: '📺', label: 'Pantalla Primaria', href: '/display/primaria' },
    { id: 'pantalla-preprimaria', icon: '📺', label: 'Pantalla Preprimaria', href: '/display/preprimaria' },
    { id: 'pantalla-secundaria', icon: '📺', label: 'Pantalla Secundaria', href: '/display/secundaria' }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

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

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} `}>
      {/* Botón Cerrar (Solo Mobile) */}
      <button className="sidebar-close-btn" onClick={onClose}>×</button>
      {/* Logo */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="brand-text">
          <span className="brand-name">Colegio MAO</span>
          <span className="brand-sub">Sistema de Salida</span>
        </div>
      </div>

      {/* Divider */}
      <div className="sidebar-divider" />

      {/* Nav */}
      <nav className="sidebar-nav">
        {isProfileLoading && (
          <div className="nav-loading-profiles">
            <div className="spinner-mini"></div>
            <span>Validando acceso...</span>
          </div>
        )}
        {filteredRoutes.map((route) => (
          <button
            key={route.id}
            className={`nav-item ${isActive(route.path) ? 'active' : ''}`}
            onClick={() => {
              onTabChange(route.id);
              navigate(route.path);
              if (window.innerWidth < 1024) onClose();
            }}
          >
            <span className="nav-icon">{route.icon}</span>
            <span className="nav-label">{route.label}</span>
            {isActive(route.path) && <div className="nav-indicator" />}
          </button>
        ))}

        {(profile?.role === 'superadmin' || profile?.permissions?.displays !== 'none') && 
          displayRoutes.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                window.open(item.href, '_blank');
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {activeTab === item.id && <span className="nav-indicator" />}
            </button>
          ))
        }

        {/* Acceso rápido a escáneres según configuración */}
        <div className="sidebar-divider" style={{ margin: '12px 0' }} />
        {profile?.config?.can_scan_attendance && (
          <button className="nav-item special-scan" onClick={() => navigate('/admin/marcado')}>
            <span className="nav-icon">📝</span>
            <span className="nav-label">Marcado Entrada</span>
          </button>
        )}
      </nav>

      {/* Footer del sidebar con Menú de Usuario */}
      <div className="sidebar-footer" ref={menuRef}>
        {showUserMenu && (
          <div className="user-dropdown-menu">
            <div className="dropdown-header">
              <span className="dropdown-title">Mi Cuenta</span>
            </div>
            <button className="dropdown-item" onClick={() => navigate('/admin/users')}>
              <User size={16} />
              <span>Ver Perfil</span>
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item logout" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
        
        <button 
          className={`user-profile-button ${showUserMenu ? 'active' : ''}`}
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="user-avatar-container">
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <div className="user-info-text">
            <span className="user-name">
              {user?.email?.includes('@roosevelt.edu') 
                ? user.email.split('@')[0] 
                : user?.email || 'Usuario'}
            </span>
            <span className="user-role">{profile?.role || 'Personal'}</span>
          </div>
          <ChevronUp size={16} className={`chevron-icon ${showUserMenu ? 'rotate' : ''}`} />
        </button>
      </div>
    </aside>
  );
}