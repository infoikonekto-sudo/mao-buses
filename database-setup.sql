-- SQL para configurar completamente la base de datos
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 0. Limpiar tablas existentes (importante)
DROP TABLE IF EXISTS cola_dia CASCADE;
DROP TABLE IF EXISTS bus_asignaciones CASCADE;
DROP TABLE IF EXISTS alumnos CASCADE;

-- 1. Crear tabla alumnos
CREATE TABLE alumnos (
  id SERIAL PRIMARY KEY,
  carnet VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  grado VARCHAR(50) NOT NULL,
  seccion VARCHAR(10),
  bus_hoy BOOLEAN DEFAULT FALSE,
  foto_url TEXT,
  nivel VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla cola_dia
CREATE TABLE cola_dia (
  id SERIAL PRIMARY KEY,
  fecha_dia DATE NOT NULL DEFAULT CURRENT_DATE,
  turno INTEGER NOT NULL,
  carnet VARCHAR(20) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  grado VARCHAR(50) NOT NULL,
  seccion VARCHAR(10),
  nivel VARCHAR(20),
  bus BOOLEAN DEFAULT FALSE,
  estado VARCHAR(20) DEFAULT 'esperando',
  foto_url TEXT,
  hora_escaneo TIMESTAMP WITH TIME ZONE,
  hora_entrega TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla bus_asignaciones
CREATE TABLE bus_asignaciones (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  grado VARCHAR(50) NOT NULL,
  seccion VARCHAR(10),
  bus_asignado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_alumnos_carnet ON alumnos(carnet);
CREATE INDEX IF NOT EXISTS idx_alumnos_grado ON alumnos(grado);
CREATE INDEX IF NOT EXISTS idx_alumnos_bus_hoy ON alumnos(bus_hoy);
CREATE INDEX IF NOT EXISTS idx_cola_dia_fecha ON cola_dia(fecha_dia);
CREATE INDEX IF NOT EXISTS idx_cola_dia_turno ON cola_dia(turno);
CREATE INDEX IF NOT EXISTS idx_cola_dia_estado ON cola_dia(estado);
CREATE INDEX IF NOT EXISTS idx_bus_asignaciones_fecha ON bus_asignaciones(fecha);

-- 5. Habilitar RLS
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cola_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_asignaciones ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas de seguridad
DROP POLICY IF EXISTS "Permitir lectura alumnos autenticados" ON alumnos;
DROP POLICY IF EXISTS "Permitir escritura alumnos autenticados" ON alumnos;
DROP POLICY IF EXISTS "Permitir lectura cola_dia autenticados" ON cola_dia;
DROP POLICY IF EXISTS "Permitir escritura cola_dia autenticados" ON cola_dia;
DROP POLICY IF EXISTS "Permitir lectura bus_asignaciones autenticados" ON bus_asignaciones;
DROP POLICY IF EXISTS "Permitir escritura bus_asignaciones autenticados" ON bus_asignaciones;

CREATE POLICY "Permitir lectura alumnos autenticados" ON alumnos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir escritura alumnos autenticados" ON alumnos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura cola_dia autenticados" ON cola_dia
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir escritura cola_dia autenticados" ON cola_dia
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir lectura bus_asignaciones autenticados" ON bus_asignaciones
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir escritura bus_asignaciones autenticados" ON bus_asignaciones
  FOR ALL USING (auth.role() = 'authenticated');

-- 7. Insertar datos de prueba
INSERT INTO alumnos (carnet, nombre, grado, seccion, bus_hoy, nivel) VALUES
  ('20210001', 'Ana García López', 'Primero', 'A', false, 'primaria'),
  ('20210002', 'Carlos López Martínez', 'Segundo', 'B', true, 'primaria'),
  ('20210003', 'María Rodríguez Sánchez', 'Tercero', 'A', false, 'primaria'),
  ('20210004', 'José Hernández Gómez', 'Cuarto', 'B', true, 'primaria'),
  ('20210005', 'Laura Jiménez Torres', 'Quinto', 'A', false, 'primaria'),
  ('20210006', 'Miguel Ángel Castro', 'Sexto', 'B', true, 'primaria'),
  ('20200001', 'Sofía Morales Ruiz', 'Preparatoria', 'A', false, 'preprimaria'),
  ('20200002', 'Diego Vargas Peña', 'Kínder', 'B', true, 'preprimaria')
ON CONFLICT (carnet) DO NOTHING;

-- 8. Insertar registro de prueba en cola_dia
INSERT INTO cola_dia (fecha_dia, turno, carnet, nombre, grado, seccion, nivel, bus, estado, hora_escaneo, hora_entrega) VALUES
  (CURRENT_DATE, 1, '20210001', 'Ana García López', 'Primero', 'A', 'primaria', false, 'entregado', NOW(), NOW())
ON CONFLICT DO NOTHING;