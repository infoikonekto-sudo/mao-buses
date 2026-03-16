import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import './App.css';

// Páginas
import ScanPage from './pages/ScanPage';
import DisplayScreen from './pages/DisplayScreen';
import PrimariaDisplay from './pages/PrimariaDisplay';
import SecundariaDisplay from './pages/SecundariaDisplay';
import PreprimariaDisplay from './pages/PreprimariaDisplay';
import AdminPanel from "./pages/admin/AdminPanel";
import LoginPage from './pages/LoginPage';
import AttendanceScanPage from './pages/AttendanceScanPage';
import NotFound from './pages/NotFound';

import { AuthProvider, useAuth } from './context/AuthContext';

// Componente para rutas protegidas
function ProtectedRoute({ children }) {
  const { user, loading, profileLoading } = useAuth();

  if (loading || profileLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0D2B55 0%, #1A5FA8 100%)',
        color: 'white',
        fontSize: '1.5rem',
        gap: '15px'
      }}>
        <div className="spinner"></div>
        <span>Cargando...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppContent() {
  const { user, initialized } = useAuth();
  const [showRescue, setShowRescue] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRescue(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [initialized]);

  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0D2B55 0%, #1A5FA8 100%)',
        color: 'white',
        fontSize: '1.5rem',
        textAlign: 'center'
      }}>
        <div className="spinner"></div>
        <p>Inicializando Sistema...</p>

        {showRescue && (
          <div style={{ marginTop: '20px', animation: 'fadeIn 0.5s' }}>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '15px' }}>
              La conexión está tardando más de lo normal.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid white',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              🔄 Recargar Aplicación
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/admin" replace /> : <LoginPage />}
        />

        <Route path="/scan" element={<ScanPage />} />
        <Route path="/display/primaria" element={<PrimariaDisplay />} />
        <Route path="/display/secundaria" element={<SecundariaDisplay />} />
        <Route path="/display/preprimaria" element={<PreprimariaDisplay />} />
        <Route path="/display/:nivel" element={<DisplayScreen />} />

        {/* Marcado de Asistencia será parte de Admin para tener Sidebar */}

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #051f33 0%, #0D2B55 50%, #1A5FA8 100%)',
      color: 'white',
      textAlign: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(74, 159, 224, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(45, 123, 196, 0.1) 0%, transparent 50%)',
        animation: 'gradientFloat 8s ease-in-out infinite'
      }}></div>

      <div style={{ position: 'relative', zIndex: 10 }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '15px', letterSpacing: '-1px' }}>
          🏫 Manos a la Obra
        </h1>
        <p style={{ fontSize: '1.3rem', marginBottom: '10px', opacity: 0.95 }}>
          Sistema de Control de Salida
        </p>
        {user && (
          <p style={{ fontSize: '0.95rem', marginBottom: '40px', opacity: 0.8 }}>
            Bienvenido, {user.email}
          </p>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          width: '100%',
          maxWidth: '1000px'
        }}>
          <MenuLink href="/scan" title="📱 Escaneo QR" desc="Registrar salida" />
          <MenuLink href="/display/preprimaria" title="📺 Preprimaria" desc="Pantalla en vivo" />
          <MenuLink href="/display/primaria" title="📺 Primaria" desc="Pantalla en vivo" />
          <MenuLink href="/display/secundaria" title="📺 Secundaria" desc="Pantalla en vivo" />
          <MenuLink href="/admin" title="⚙️ Admin" desc="Panel de control" />
        </div>
      </div>
    </div>
  );
}

function MenuLink({ href, title, desc }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '30px',
        backgroundColor: hovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '16px',
        color: 'white',
        textDecoration: 'none',
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered ? '0 20px 40px rgba(0,0,0,0.2)' : '0 10px 20px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{title}</div>
      <div style={{ fontSize: '0.9rem', opacity: 0.85, letterSpacing: '0.3px' }}>{desc}</div>
    </Link>
  );
}

export default App;
