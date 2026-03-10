import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import './ConfigPage.css';

export default function ConfigPage() {
  const [reseteando, setReseteando] = useState(false);

  async function resetBus() {
    if (!window.confirm('¿Seguro que desea resetear todos los switches de bus del día?')) return;
    setReseteando(true);
    await supabase
      .from('alumnos')
      .update({ bus_hoy: false })
      .eq('bus_hoy', true);
    setReseteando(false);
    alert('Bus reseteado');
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState(null);

  async function crearUsuario(e) {
    e.preventDefault();
    setMensaje({ type: 'info', text: 'Creando usuario...' });

    // En el modo actual de Supabase Auth (Client SDK), se usa signUp
    // Nota: El administrador real invitaría vía Dashboard o Edge Function
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      }
    });

    if (error) {
      setMensaje({ type: 'error', text: `Error: ${error.message}` });
    } else {
      setMensaje({ type: 'success', text: 'Usuario invitado. Revisa el correo de confirmación.' });
      setEmail('');
      setPassword('');
    }
  }

  return (
    <div className="config-container">
      <h1>⚙️ Configuración del Sistema</h1>

      <section className="config-section">
        <h2>👥 Gestión de Usuarios</h2>
        <p className="subtitle">Crea nuevos accesos para el personal administrativo.</p>

        <form onSubmit={crearUsuario} className="user-form">
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@mao.edu.gt"
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña Provisional</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
          <button type="submit" className="btn-primario">Invitar Usuario</button>
        </form>
        {mensaje && <p className={`config-message ${mensaje.type}`}>{mensaje.text}</p>}
      </section>

      <section className="config-section" style={{ marginTop: '40px' }}>
        <h2>🛡️ Acciones de Mantenimiento</h2>
        <div className="maintenance-card">
          <div>
            <h3>Reiniciar Ciclo del Bus</h3>
            <p>Limpia todos los estados de bus asignados hoy.</p>
          </div>
          <button className="btn-danger" onClick={resetBus} disabled={reseteando}>
            {reseteando ? 'Procesando...' : 'Resetear ahora'}
          </button>
        </div>
      </section>
    </div>
  );
}
