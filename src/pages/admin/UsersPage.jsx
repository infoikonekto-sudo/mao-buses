import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Shield, Trash2, Mail, Lock } from 'lucide-react';
import './UsersPage.css';

export default function UsersPage() {
    const { user, profile, profileLoading, initialized } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('admin');
    const [newAreas, setNewAreas] = useState([]);
    const [newConfig, setNewConfig] = useState({ can_scan_exit: true, can_scan_attendance: true });
    const [editingUser, setEditingUser] = useState(null);

    // Permisos por defecto
    const INITIAL_PERMISSIONS = {
        dashboard: 'none',
        scan: 'none',
        alumnos: 'none',
        bus: 'none',
        qr: 'none',
        historial: 'none',
        analiticas: 'none',
        asistencia: 'none',
        displays: 'none',
        config: 'none',
        users: 'none'
    };

    const modules = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'scan', label: 'Escanear (Salidas)' },
        { id: 'alumnos', label: 'Alumnos' },
        { id: 'bus', label: 'Gestión de Bus' },
        { id: 'qr', label: 'Generar QR / Carnets' },
        { id: 'historial', label: 'Historial' },
        { id: 'analiticas', label: 'Analíticas' },
        { id: 'asistencia', label: 'Reporte Asistencia' },
        { id: 'displays', label: 'Pantallas (TV / Cola)' },
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

    const handleEditClick = (u) => {
        setEditingUser(u);
        setNewUsername(u.email?.split('@')[0] || '');
        setNewRole(u.role || 'admin');
        setNewAreas(u.areas_p || []);
        setNewConfig(u.config || { can_scan_exit: true, can_scan_attendance: true });
        setPermissions(u.permissions || INITIAL_PERMISSIONS);
        setIsAdding(true);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingUser(null);
        setNewUsername('');
        setNewPassword('');
        setPermissions(INITIAL_PERMISSIONS);
        setNewAreas([]);
        setNewConfig({ can_scan_exit: true, can_scan_attendance: true });
    };

    async function handleCreateUser(e) {
        e.preventDefault();
        if (!newUsername || !newPassword) {
            alert('Por favor completa todos los campos.');
            return;
        }

        const technicalEmail = `${newUsername.toLowerCase().trim()}@roosevelt.edu`;

        try {
            setLoading(true);
            console.log('🔍 Buscando si el perfil ya existe para:', technicalEmail);

            // 1. Verificar si ya existe un perfil para este username
            const { data: existingProfile, error: searchError } = await supabase
                .from('user_profiles')
                .select('user_id')
                .eq('email', technicalEmail)
                .maybeSingle();

            if (searchError) console.warn('Aviso búsqueda:', searchError);

            let targetUserId = existingProfile?.user_id;

            if (!targetUserId) {
                console.log('🆕 No se encontró perfil previo. Intentando crear en Auth...');
                // 2. Intentar crear en Auth si no hay perfil previo
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: technicalEmail,
                    password: newPassword,
                });

                if (authError) throw authError;

                const user = authData?.user;
                if (!user || (!user.identities && !user.app_metadata)) {
                    // Si no hay user o está vacío, Supabase está protegiendo una cuenta existente
                    throw new Error('Este correo ya está registrado en el sistema. Si no aparece en la lista, el usuario debe confirmar su correo o un administrador debe gestionar su cuenta desde el panel de Supabase.');
                }

                targetUserId = user.id;
                console.log('✅ Usuario Auth creado:', targetUserId);
            } else {
                console.log('♻️ Reutilizando ID de usuario existente:', targetUserId);
            }

            // 3. Upsert en user_profiles (Usamos user_id como clave de conflicto)
            const { error: profileError } = await supabase
                .from('user_profiles')
                .upsert({
                    user_id: targetUserId,
                    email: technicalEmail,
                    role: newRole,
                    permissions: permissions,
                    areas_p: newAreas,
                    config: newConfig,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (profileError) {
                // Capturar específicamente el error de FK (23503)
                if (profileError.code === '23503') {
                    throw new Error('Conflicto de Identidad (FK): El correo ya existe en Supabase Auth pero no tiene un perfil vinculado. Por favor, elimina al usuario de la sección "Authentication" en Supabase e intenta de nuevo.');
                }
                throw profileError;
            }

            alert(editingUser ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
            resetForm();
            fetchUsers();
        } catch (err) {
            console.error('❌ Error detallado:', err);
            alert('Aviso: ' + (err.message || 'Error inesperado.'));
        } finally {
            setLoading(false);
        }
    }

    if (!initialized || profileLoading) {
        return (
            <div className="users-loading">
                <div className="spinner"></div>
                <h1>Validando acceso...</h1>
                <p>Por favor espera un momento mientras verificamos tus credenciales.</p>
            </div>
        );
    }

    if (initialized && user && !profile) {
        return (
            <div className="access-denied">
                <Shield size={48} color="#f59e0b" />
                <h1>Dificultad de Conexión</h1>
                <p>No logramos cargar tus permisos. Por favor, intenta recargar la página o revisa tu conexión a internet.</p>
                <button onClick={() => window.location.reload()} className="btn-save" style={{ marginTop: '20px' }}>
                    🔄 Reintentar Conexión
                </button>
            </div>
        );
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
                                <label>Nombre de Usuario (Username)</label>
                                <div className="input-with-icon">
                                    <UserPlus size={16} />
                                    <input
                                        type="text"
                                        placeholder="ej: guardia_matinal"
                                        value={newUsername}
                                        onChange={e => setNewUsername(e.target.value.replace(/\s/g, ''))}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Contraseña {editingUser ? '(Dejar en blanco para no cambiar)' : 'Temporal'}</label>
                                <div className="input-with-icon">
                                    <Lock size={16} />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required={!editingUser}
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

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Áreas Asignadas (Niveles)</label>
                                <div className="areas-selector">
                                    {['preprimaria', 'primaria', 'secundaria'].map(area => (
                                        <label key={area} className="area-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={newAreas.includes(area)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setNewAreas([...newAreas, area]);
                                                    else setNewAreas(newAreas.filter(a => a !== area));
                                                }}
                                            />
                                            {area.charAt(0).toUpperCase() + area.slice(1)}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '15px' }}>
                                <label>Capacidades de Escaneo</label>
                                <div className="config-toggles">
                                    <label className="toggle-label">
                                        <input
                                            type="checkbox"
                                            checked={newConfig.can_scan_attendance}
                                            onChange={(e) => setNewConfig({ ...newConfig, can_scan_attendance: e.target.checked })}
                                        />
                                        Marcado Asistencia (Entrada)
                                    </label>
                                    <label className="toggle-label">
                                        <input
                                            type="checkbox"
                                            checked={newConfig.can_scan_exit}
                                            onChange={(e) => setNewConfig({ ...newConfig, can_scan_exit: e.target.checked })}
                                        />
                                        Control Salida
                                    </label>
                                </div>
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
                    <div className="form-actions">
                        <button type="submit" className="btn-save-user">
                            {editingUser ? 'Guardar Cambios' : 'Crear y Asignar Permisos'}
                        </button>
                        {editingUser && (
                            <button type="button" className="btn-cancel" onClick={resetForm}>
                                Cancelar Edición
                            </button>
                        )}
                    </div>
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
                                <td data-label="Usuario">
                                    <div className="user-info">
                                        <span className="email">{u.email?.split('@')[0]}</span>
                                    </div>
                                </td>
                                <td data-label="Rol">
                                    <span className={`role-badge ${u.role}`}>{u.role}</span>
                                </td>
                                <td data-label="Permisos">
                                    <div className="permissions-summary">
                                        <div className="areas-badges">
                                            {(u.areas_p || []).map(a => (
                                                <span key={a} className={`area-badge mini ${a}`}>{a}</span>
                                            ))}
                                        </div>
                                        {Object.entries(u.permissions || {}).map(([mod, p]) => (
                                            p !== 'none' && <span key={mod} className={`perm-tag ${p}`}>{mod}</span>
                                        ))}
                                    </div>
                                </td>
                                <td data-label="Registro">{new Date(u.created_at).toLocaleDateString()}</td>
                                <td data-label="Acciones">
                                    <div className="action-buttons">
                                        <button className="btn-edit" onClick={() => handleEditClick(u)}>
                                            <Shield size={16} />
                                        </button>
                                        <button className="btn-delete" onClick={() => alert('Próximamente...')}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
