import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import './Sidebar.css';

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const items = [
    // ... (sin cambios en items)
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'scan', icon: '📱', label: 'Escanear' },
    { id: 'alumnos', icon: '👤', label: 'Alumnos' },
    { id: 'bus', icon: '🚌', label: 'Gestión de Bus' },
    { id: 'qr', icon: '🎫', label: 'QR / Carnets' },
    { id: 'historial', icon: '🕐', label: 'Historial' },
    { id: 'analytics', icon: '📈', label: 'Analíticas' },
    { id: 'config', icon: '⚙️', label: 'Configuración' },
    // enlaces a las pantallas de cola (se abren en pestaña nueva)
    { id: 'pantalla-primaria', icon: '📺', label: 'Pantalla Primaria', href: '/display/primaria' },
    { id: 'pantalla-preprimaria', icon: '📺', label: 'Pantalla Preprimaria', href: '/display/preprimaria' },
    { id: 'pantalla-secundaria', icon: '📺', label: 'Pantalla Secundaria', href: '/display/secundaria' }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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
        {items.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => {
              if (item.href) {
                // pantallas de cola se abren en pestaña nueva para no salir del panel
                window.open(item.href, '_blank');
              } else {
                onTabChange(item.id);
              }
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