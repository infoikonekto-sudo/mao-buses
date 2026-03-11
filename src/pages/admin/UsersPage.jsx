import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Shield, Trash2, Mail, Lock } from 'lucide-react';
import './UsersPage.css';

export default function UsersPage() {
    const { profile } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('admin');

    // Permisos por defecto
    const INITIAL_PERMISSIONS = {
        dashboard: 'read',
        qr: 'read',
        alumnos: 'read',
        bus: 'read',
        historial: 'read',
        analiticas: 'read',
        config: 'none',
        users: 'none'
    };

    const modules = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'qr', label: 'Escanear / QR' },
        { id: 'alumnos', label: 'Alumnos' },
        { id: 'bus', label: 'Gestión de Bus' },
        { id: 'historial', label: 'Historial' },
        { id: 'analiticas', label: 'Analíticas' },
        { id: 'config', label: 'Configuración' },
        { id: 'users', label: 'Usuarios' },
    ];

    const [permissions, setPermissions] = useState(INITIAL_PERMISSIONS);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setUsers(data || []);
        setLoading(false);
    }

    const handlePermissionChange = (modId, value) => {
        setPermissions(prev => ({ ...prev, [modId]: value }));
    };

    async function handleCreateUser(e) {
        e.preventDefault();
        if (!newEmail || !newPassword) return;

        try {
            // 1. Crear usuario en Auth
            const { data: { user }, error: authError } = await supabase.auth.signUp({
                email: newEmail,
                password: newPassword,
            });

            if (authError) throw authError;

            // 2. Crear perfil en user_profiles con la ponderación de permisos
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: user.id,
                    email: newEmail,
                    role: newRole,
                    permissions: permissions
                });

            if (profileError) throw profileError;

            alert('Usuario creado con éxito. Debe confirmar su correo.');
            setIsAdding(false);
            setNewEmail('');
            setNewPassword('');
            setPermissions(INITIAL_PERMISSIONS);
            fetchUsers();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }

    if (profile?.role !== 'superadmin') {
        return (
            <div className="access-denied">
                <Shield size={48} />
                <h1>Acceso Restringido</h1>
                <p>Solo el Superadministrador puede gestionar usuarios.</p>
            </div>
        );
    }

    return (
        <div className="users-container">
            <header className="users-header">
                <div>
                    <h1>🔐 Gestión de Usuarios</h1>
                    <p>Administra quién tiene acceso al sistema y sus permisos específicos.</p>
                </div>
                <button className={`btn-add-user ${isAdding ? 'cancel' : ''}`} onClick={() => setIsAdding(!isAdding)}>
                    <UserPlus size={18} /> {isAdding ? 'Cancelar' : 'Nuevo Usuario'}
                </button>
            </header>

            {isAdding && (
                <form className="user-form shadow-sm" onSubmit={handleCreateUser}>
                    <div className="form-sections">
                        <section className="form-auth-section">
                            <h3>Datos de Acceso</h3>
                            <div className="form-group">
                                <label>Correo Electrónico</label>
                                <div className="input-with-icon">
                                    <Mail size={16} />
                                    <input
                                        type="email"
                                        placeholder="ejemplo@mao.com"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Contraseña Temporal</label>
                                <div className="input-with-icon">
                                    <Lock size={16} />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Rol Principal</label>
                                <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                                    <option value="admin">Administrador</option>
                                    <option value="visor">Visor / Observador</option>
                                    <option value="bus_manager">Gestor de Bus</option>
                                    <option value="superadmin">Superadmin</option>
                                </select>
                            </div>
                        </section>

                        <section className="form-permissions-section">
                            <h3>Matriz de Permisos (Ponderación)</h3>
                            <div className="permissions-grid-header">
                                <span>Módulo</span>
                                <span>Ninguno</span>
                                <span>Lectura</span>
                                <span>Edición</span>
                            </div>
                            {modules.map(mod => (
                                <div key={mod.id} className="permission-row">
                                    <span className="mod-label">{mod.label}</span>
                                    <input
                                        type="radio"
                                        name={`perm-${mod.id}`}
                                        checked={permissions[mod.id] === 'none'}
                                        onChange={() => handlePermissionChange(mod.id, 'none')}
                                    />
                                    <input
                                        type="radio"
                                        name={`perm-${mod.id}`}
                                        checked={permissions[mod.id] === 'read'}
                                        onChange={() => handlePermissionChange(mod.id, 'read')}
                                    />
                                    <input
                                        type="radio"
                                        name={`perm-${mod.id}`}
                                        checked={permissions[mod.id] === 'write'}
                                        onChange={() => handlePermissionChange(mod.id, 'write')}
                                    />
                                </div>
                            ))}
                        </section>
                    </div>
                    <button type="submit" className="btn-save-user">Crear y Asignar Permisos</button>
                </form>
            )}

            <div className="users-list shadow-sm">
                <table>
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Rol</th>
                            <th>Permisos</th>
                            <th>Fecha Registro</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div className="user-info">
                                        <span className="email">{u.email}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`role-badge ${u.role}`}>{u.role}</span>
                                </td>
                                <td>
                                    <div className="permissions-summary">
                                        {Object.entries(u.permissions || {}).map(([mod, p]) => (
                                            p !== 'none' && <span key={mod} className={`perm-tag ${p}`}>{mod}</span>
                                        ))}
                                    </div>
                                </td>
                                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button className="btn-delete" onClick={() => alert('Próximamente...')}>
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
