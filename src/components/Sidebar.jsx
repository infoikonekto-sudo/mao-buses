import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import './Sidebar.css';

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }) {
  const { logout, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const routes = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin', permission: 'dashboard' },
    { id: 'scan', label: 'Escanear', icon: '📱', path: '/admin/scan', permission: 'qr' },
    { id: 'alumnos', label: 'Alumnos', icon: '👥', path: '/admin/alumnos', permission: 'alumnos' },
    { id: 'bus', label: 'Gestión de Bus', icon: '🚌', path: '/admin/bus', permission: 'bus' },
    { id: 'qr', label: 'QR / Carnets', icon: '🎫', path: '/admin/qr', permission: 'qr' },
    { id: 'historial', label: 'Historial', icon: '🕒', path: '/admin/historial', permission: 'historial' },
    { id: 'analiticas', label: 'Analíticas', icon: '📈', path: '/admin/analytics', permission: 'analiticas' },
    { id: 'users', label: 'Gestión Usuarios', icon: '🔐', path: '/admin/users', permission: 'users' },
    { id: 'config', label: 'Configuración', icon: '⚙️', path: '/admin/config', permission: 'config' },
  ];

  const filteredRoutes = routes.filter(route => {
    if (!profile) return true; // Si no hay perfil (ej: cargando), mostrar todo por ahora
    if (profile.role === 'superadmin') return true;

    const permission = profile.permissions?.[route.permission];
    return permission && permission !== 'none';
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
        {displayRoutes.map(item => (
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
        ))}
      </nav>

      {/* Footer del sidebar */}
      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">{user?.email?.charAt(0).toUpperCase() || 'L'}</div>
          <span className="user-email">{user?.email || 'usuario@mao.com'}</span>
        </div>
        <button className="btn-logout" onClick={handleLogout}>Salir</button>
      </div>
    </aside>
  );
}