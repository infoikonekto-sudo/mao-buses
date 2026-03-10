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

    // Form para nuevo usuario
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('admin');

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

            // 2. Definir permisos base según el rol
            let permissions = {
                dashboard: 'read',
                alumnos: 'read',
                bus: 'read',
                qr: 'read',
                historial: 'read',
                analiticas: 'read',
                config: 'none'
            };

            if (newRole === 'visor') {
                permissions = { ...permissions, bus: 'read' };
            } else if (newRole === 'admin') {
                permissions = {
                    dashboard: 'read',
                    alumnos: 'write',
                    bus: 'write',
                    qr: 'write',
                    historial: 'read',
                    analiticas: 'read',
                    config: 'none'
                };
            }

            // 3. Crear perfil en user_profiles
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: user.id,
                    email: newEmail,
                    role: newRole,
                    permissions: permissions
                });

            if (profileError) throw profileError;

            alert('Usuario creado con éxito. Debe confirmar su correo para entrar.');
            setIsAdding(false);
            setNewEmail('');
            setNewPassword('');
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
                    <p>Administra quién tiene acceso al sistema y sus permisos.</p>
                </div>
                <button className="btn-add-user" onClick={() => setIsAdding(!isAdding)}>
                    <UserPlus size={18} /> {isAdding ? 'Cancelar' : 'Nuevo Usuario'}
                </button>
            </header>

            {isAdding && (
                <form className="user-form shadow-sm" onSubmit={handleCreateUser}>
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
                        <label>Rol del Usuario</label>
                        <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                            <option value="admin">Administrador (Puede editar)</option>
                            <option value="visor">Visor (Solo lectura)</option>
                            <option value="bus_manager">Gestor de Bus</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-save-user">Crear Acceso</button>
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
