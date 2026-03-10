# 🚀 QUICK START - Código Listo para Copiar y Pegar

## 1️⃣ USAR CONTEXTO DE AUTENTICACIÓN

### En cualquier componente:
```javascript
import { useAuth } from '../App';

function MiComponente() {
  const { user, logout, loading } = useAuth();
  
  if (loading) return <div>Cargando...</div>;
  
  if (!user) return <div>No autenticado</div>;
  
  return (
    <div>
      <p>Bienvenido {user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## 2️⃣ USAR IMPORTADOR DE EXCEL

### En AdminPanel o donde lo necesites:
```javascript
import ExcelImporter from '../components/ExcelImporter';
import { useState } from 'react';

function MiComponente() {
  const [showImporter, setShowImporter] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowImporter(true)}>
        📊 Importar
      </button>
      
      {showImporter && (
        <ExcelImporter
          onClose={() => setShowImporter(false)}
          onImportSuccess={() => {
            setShowImporter(false);
            // Recargar datos o notificar
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
```

---

## 3️⃣ VALIDAR Y PARSEAR EXCEL MANUALMENTE

```javascript
import { parseExcelFile, validateAlumnoData } from '../lib/excelUtils';

async function importarAlumnos(file) {
  try {
    // 1. Parsear archivo
    const data = await parseExcelFile(file);
    console.log('Datos leídos:', data);
    
    // 2. Validar cada fila
    const validos = [];
    const errores = [];
    
    data.forEach((row, idx) => {
      const validation = validateAlumnoData(row);
      if (validation.isValid) {
        validos.push(validation.data);
      } else {
        errores.push(`Fila ${idx + 2}: ${validation.error}`);
      }
    });
    
    console.log(`✅ ${validos.length} registros válidos`);
    console.log(`❌ ${errores.length} registros con error`);
    
    // 3. Insertar en Supabase
    const { data: inserted, error } = await supabase
      .from('alumnos')
      .insert(validos)
      .select();
    
    if (error) throw error;
    console.log('Insertados:', inserted);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

## 4️⃣ USAR CLASES CSS MODERNAS

```jsx
// Botones
<button className="btn-primario">Primario</button>
<button className="btn-secundario">Secundario</button>
<button className="btn-exito">Éxito</button>
<button className="btn-error">Error</button>

// Cards
<div className="card">Contenido</div>
<div className="card gradient">Con gradiente</div>

// Grid
<div className="grid grid-3">
  <div className="card">Item 1</div>
  <div className="card">Item 2</div>
  <div className="card">Item 3</div>
</div>

// Flex
<div className="flex">
  <span>Elemento 1</span>
  <span>Elemento 2</span>
</div>

<div className="flex-between">
  <span>Izquierda</span>
  <span>Derecha</span>
</div>

// Alertas
<div className="alert alert-exito">✅ Operación exitosa</div>
<div className="alert alert-error">❌ Error en la operación</div>
<div className="alert alert-advertencia">⚠️ Advertencia</div>

// Badges
<span className="badge badge-azul">Azul</span>
<span className="badge badge-verde">Verde</span>
<span className="badge badge-rojo">Rojo</span>

// Utilidades
<div style={{ marginTop: '24px' }} className="mt-4 mb-3">
  <span className="text-center">Centrado</span>
</div>
```

---

## 5️⃣ CREAR PÁGINA PROTEGIDA

```javascript
// pages/MiPaginaProtegida.jsx
import { useAuth } from '../App';

export default function MiPaginaProtegida() {
  const { user } = useAuth();
  
  return (
    <div className="card">
      <h1>Página Privada</h1>
      <p>Solo ves esto si estás autenticado como {user.email}</p>
    </div>
  );
}

// En App.jsx agregar ruta:
<Route
  path="/privada"
  element={
    <ProtectedRoute>
      <MiPaginaProtegida />
    </ProtectedRoute>
  }
/>
```

---

## 6️⃣ CRUD BÁSICO SUPABASE

```javascript
import { supabase } from '../lib/supabase';

// CREATE
const { data, error } = await supabase
  .from('alumnos')
  .insert([{ carnet: '001', nombre: 'Juan', grado: 'Primero', seccion: 'A' }])
  .select();

// READ
const { data: alumnos } = await supabase
  .from('alumnos')
  .select('*')
  .eq('grado', 'Primero');

// UPDATE
const { data: updated } = await supabase
  .from('alumnos')
  .update({ nombre: 'Juan Pedro' })
  .eq('carnet', '001')
  .select();

// DELETE
const { data: deleted } = await supabase
  .from('alumnos')
  .delete()
  .eq('carnet', '001');
```

---

## 7️⃣ REALIZAR LOGOUT PROGRAMÁTICAMENTE

```javascript
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';

function MiComponente() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  return <button onClick={handleLogout}>Cerrar Sesión</button>;
}
```

---

## 8️⃣ MOSTRAR SPINNER MIENTRAS CARGA

```javascript
function MiComponente() {
  const [loading, setLoading] = useState(true);
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '15px',
        height: '200px'
      }}>
        <div className="spinner"></div>
        <span>Cargando datos...</span>
      </div>
    );
  }
  
  return <div>Contenido</div>;
}
```

---

## 9️⃣ TABLA CON ESTILOS MODERNOS

```jsx
<div className="card">
  <h2>Lista de Alumnos</h2>
  <table>
    <thead>
      <tr>
        <th>Carnet</th>
        <th>Nombre</th>
        <th>Grado</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {alumnos.map(alumno => (
        <tr key={alumno.id}>
          <td>{alumno.carnet}</td>
          <td>{alumno.nombre}</td>
          <td>{alumno.grado}</td>
          <td>
            <button className="btn-primario" style={{ fontSize: '0.8rem' }}>
              Editar
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## 🔟 NOTIFICACIONES/TOASTS

```javascript
// Crear archivo: components/Toast.jsx
import { useState, useEffect } from 'react';

export function Toast({ message, type = 'info', duration = 3000 }) {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);
  
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      animation: 'slideInDown 0.3s ease-out',
      zIndex: 9999,
      ...(type === 'success' && {
        background: '#10B981',
        color: 'white'
      }),
      ...(type === 'error' && {
        background: '#EF4444',
        color: 'white'
      })
    }}>
      {message}
    </div>
  );
}

// Usar:
const [toast, setToast] = useState(null);

<Toast {...toast} />

// Mostrar:
setToast({ message: '✅ Importación exitosa', type: 'success' });
```

---

## 📝 NOTAS IMPORTANTES

✅ Todas las dependencias ya están instaladas  
✅ CSS variables están disponibles globalmente  
✅ AuthContext está disponible en toda la app  
✅ Supabase está configurado y conectado  
✅ ExcelImporter es plug-and-play  

---

**Ultimo Update**: 6 de marzo, 2026  
Preparado para Producción ✅
