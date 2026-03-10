# 🚨 CONFIGURACIÓN COMPLETA - Colegio Manos a la Obra

## ⚠️ IMPORTANTE: Ejecutar ANTES de usar el sistema

### 1. Configurar Usuario Administrador

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication > Users**
4. Haz clic en **Add user**
5. Configura:
   - **Email:** `admin@test.com`
   - **Password:** `admin123`
   - **Auto confirm user:** ✅ Activado
   - **Role:** `authenticated`

### 2. Crear Bucket de Storage

1. Ve a **Storage** en el dashboard
2. Haz clic en **Create bucket**
3. Configura:
   - **Name:** `fotos-alumnos`
   - **Public bucket:** ✅ Activado
   - **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`
   - **File size limit:** `5MB`

### 3. ⚡ Ejecutar SQL Database Setup (CRÍTICO)

**ESTE PASO ES OBLIGATORIO**

1. Ve a **SQL Editor** en el dashboard
2. Copia y pega TODO el contenido del archivo `database-setup.sql`
3. Haz clic en **Run**

Este SQL crea:
- ✅ Tabla `alumnos`
- ✅ Tabla `cola_dia` (para el sistema de colas)
- ✅ Tabla `bus_asignaciones`
- ✅ Índices de rendimiento
- ✅ Políticas RLS de seguridad
- ✅ Datos de prueba

### 4. Verificar Configuración

Ejecuta esta consulta en SQL Editor para verificar:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('alumnos', 'cola_dia', 'bus_asignaciones');
```

Deberías ver las 3 tablas listadas.

## 🔑 Credenciales de Acceso

- **URL:** http://localhost:5183/
- **Email:** `admin@test.com`
- **Password:** `admin123`

## 📱 Funcionalidades Disponibles

Después de la configuración completa:

### ✅ Sistema de Colas
- Dashboard con cola en vivo
- Gestión de turnos
- Estados de entrega

### ✅ Gestión de Alumnos
- Lista completa de alumnos
- Búsqueda y filtros
- Asignación de buses

### ✅ Subida de Fotos
- Bucket `fotos-alumnos` configurado
- Almacenamiento público
- Integración con perfiles

### ✅ Historial
- Registros de entregas
- Exportación CSV
- Filtros por fecha

### ✅ Reportes
- Estadísticas generales
- Análisis de entregas
- Métricas de rendimiento

## 🐛 Solución de Problemas

### Error "Bucket not found"
- ✅ Verificar que el bucket `fotos-alumnos` existe en Storage
- ✅ Confirmar que es público

### Error "Invalid login credentials"
- ✅ Verificar usuario en Authentication > Users
- ✅ Confirmar email verificado

### Error 400 en cola_dia
- ✅ Ejecutar el SQL completo de `database-setup.sql`
- ✅ Verificar que la tabla `cola_dia` existe

### Error de conexión
- ✅ Verificar URLs en `.env`
- ✅ Confirmar credenciales correctas

## 📞 Soporte

Si tienes problemas:

1. **Verifica que ejecutaste TODO el SQL** de `database-setup.sql`
2. **Confirma que el usuario está creado** y confirmado
3. **Asegúrate que el bucket existe** y es público
4. **Revisa las políticas RLS** permiten las operaciones

## 🎯 Próximos Pasos

1. ✅ Ejecutar configuración completa
2. ✅ Probar login con `admin@test.com` / `admin123`
3. ✅ Verificar todas las secciones del panel admin
4. ✅ Probar subida de fotos
5. ✅ Testear sistema de colas

¡El sistema estará completamente funcional después de seguir estos pasos!
  bus_hoy BOOLEAN DEFAULT FALSE,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Permitir lectura para usuarios autenticados" ON alumnos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir escritura para usuarios autenticados" ON alumnos
  FOR ALL USING (auth.role() = 'authenticated');

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_alumnos_carnet ON alumnos(carnet);
CREATE INDEX IF NOT EXISTS idx_alumnos_grado ON alumnos(grado);
CREATE INDEX IF NOT EXISTS idx_alumnos_bus_hoy ON alumnos(bus_hoy);
```

### 5. Ejecutar Script de Configuración

Después de completar los pasos anteriores:

```bash
cd "c:\Users\ludin\Desktop\mao salidas\colegio-roosevelt"
node setup-supabase.js
```

## 🔑 Credenciales de Login

- **Email:** `admin@test.com`
- **Password:** `admin123`

## 📱 URLs del Sistema

- **Aplicación:** http://localhost:5174
- **Escaneo QR:** http://localhost:5174/scan
- **Pantalla de Salidas:** http://localhost:5174/display/primaria (o secundaria, preprimaria)

## 🐛 Solución de Problemas

### Error "Bucket not found"
- Verifica que el bucket `fotos-alumnos` existe en Storage
- Asegúrate de que sea público

### Error "Invalid login credentials"
- Verifica que el usuario existe en Authentication > Users
- Confirma que el email esté verificado

### Error de conexión
- Verifica las variables de entorno en `.env`
- Confirma que las URLs de Supabase sean correctas

## 📞 Soporte

Si tienes problemas, verifica:
1. Que todas las configuraciones de Supabase estén completas
2. Que el usuario esté creado y confirmado
3. Que el bucket de storage exista
4. Que las políticas RLS permitan las operaciones necesarias