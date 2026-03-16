import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import logo from '../assets/logo.png';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const technicalEmail = username.includes('@') ? username : `${username.toLowerCase().trim()}@roosevelt.edu`;

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: technicalEmail,
        password,
      });

      if (authError) {
        let errorMsg = authError.message;
        if (errorMsg.includes('Email not confirmed')) {
          errorMsg = 'El correo no ha sido confirmado. Por favor, desactiva "Confirm Email" en Supabase.';
        } else if (errorMsg.includes('Invalid login credentials')) {
          errorMsg = 'Usuario o contraseña incorrectos. Verifica los datos.';
        }
        setError(errorMsg);
        setLoading(false);
        return;
      }

      if (data?.user) {
        setSuccess('¡Sesión iniciada exitosamente!');
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      }
    } catch (err) {
      setError('Error inesperado: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Logo Section */}
        <div className="login-header">
          <div className="logo-circle">
            <img src={logo} alt="Mao Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1>Colegio Manos a la Obra</h1>
          <p>Sistema de Control de Salidas</p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="login-form">
          {/* Error Alert */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="alert alert-exito">
              <CheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <div className="input-wrapper">
              <Mail size={20} />
              <input
                type="text"
                id="username"
                placeholder="Ingresa tu usuario (ej: guardia1)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-wrapper">
              <Lock size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-login"
            disabled={loading || !username || !password}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>

          {/* Help Text */}
          <div className="login-footer">
            <p className="text-center">
              ¿Necesitas ayuda? Contacta al administrador del sistema.
            </p>
          </div>
        </form>

        {/* Background Decoration */}
        <div className="login-decoration">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
      </div>
    </div>
  );
}