-- SQL para configurar la base de datos del Colegio Manos a la Obra
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla de alumnos
CREATE TABLE IF NOT EXISTS alumnos (
  id SERIAL PRIMARY KEY,
  carnet VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  grado VARCHAR(50) NOT NULL,
  seccion VARCHAR(5) NOT NULL,
  nivel VARCHAR(20) NOT NULL DEFAULT 'primaria',
  estado VARCHAR(20) DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de cola del día
CREATE TABLE IF NOT EXISTS cola_dia (
  id SERIAL PRIMARY KEY,
  carnet VARCHAR(20) NOT NULL,
  hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bus VARCHAR(10),
  foto_url TEXT,
  verificado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla de asignaciones de bus
CREATE TABLE IF NOT EXISTS bus_asignaciones (
  id SERIAL PRIMARY KEY,
  carnet VARCHAR(20) NOT NULL,
  bus VARCHAR(10) NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habilitar Row Level Security
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cola_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_asignaciones ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de acceso (permitir todo por ahora)
CREATE POLICY "Enable all access on alumnos" ON alumnos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access on cola_dia" ON cola_dia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access on bus_asignaciones" ON bus_asignaciones FOR ALL USING (true) WITH CHECK (true);

-- 6. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_alumnos_carnet ON alumnos(carnet);
CREATE INDEX IF NOT EXISTS idx_alumnos_nivel ON alumnos(nivel);
CREATE INDEX IF NOT EXISTS idx_cola_dia_carnet ON cola_dia(carnet);
CREATE INDEX IF NOT EXISTS idx_cola_dia_hora ON cola_dia(hora);
CREATE INDEX IF NOT EXISTS idx_bus_asignaciones_carnet ON bus_asignaciones(carnet);

-- 7. Crear vistas útiles
CREATE OR REPLACE VIEW vue_resumen_hoy AS
SELECT
  COUNT(DISTINCT c.carnet) as total_salidas,
  COUNT(DISTINCT CASE WHEN a.nivel = 'preprimaria' THEN c.carnet END) as preprimaria,
  COUNT(DISTINCT CASE WHEN a.nivel = 'primaria' THEN c.carnet END) as primaria,
  COUNT(DISTINCT CASE WHEN a.nivel = 'secundaria' THEN c.carnet END) as secundaria
FROM cola_dia c
LEFT JOIN alumnos a ON c.carnet = a.carnet
WHERE DATE(c.hora) = CURRENT_DATE;

CREATE OR REPLACE VIEW vue_detalle_hoy AS
SELECT
  c.id,
  c.carnet,
  a.nombre,
  a.grado,
  a.seccion,
  a.nivel,
  c.hora,
  c.bus,
  c.foto_url,
  c.verificado
FROM cola_dia c
LEFT JOIN alumnos a ON c.carnet = a.carnet
WHERE DATE(c.hora) = CURRENT_DATE
ORDER BY c.hora DESC;

-- 8. Crear funciones útiles
CREATE OR REPLACE FUNCTION get_alumnos_bus_hoy(bus_param VARCHAR)
RETURNS TABLE (
  carnet VARCHAR,
  nombre VARCHAR,
  grado VARCHAR,
  seccion VARCHAR,
  hora TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.carnet,
    a.nombre,
    a.grado,
    a.seccion,
    c.hora
  FROM alumnos a
  LEFT JOIN cola_dia c ON a.carnet = c.carnet AND DATE(c.hora) = CURRENT_DATE
  WHERE a.carnet IN (
    SELECT DISTINCT ba.carnet
    FROM bus_asignaciones ba
    WHERE ba.bus = bus_param AND ba.fecha = CURRENT_DATE
  )
  ORDER BY c.hora DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION registrar_salida(
  p_carnet VARCHAR(20),
  p_bus VARCHAR(10) DEFAULT NULL,
  p_foto_url TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  v_nombre VARCHAR;
  v_result JSON;
BEGIN
  -- Verificar si el alumno existe
  SELECT nombre INTO v_nombre
  FROM alumnos
  WHERE carnet = p_carnet AND estado = 'activo';

  IF v_nombre IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Alumno no encontrado o inactivo'
    );
  END IF;

  -- Registrar la salida
  INSERT INTO cola_dia (carnet, bus, foto_url, verificado)
  VALUES (p_carnet, p_bus, p_foto_url, true);

  RETURN json_build_object(
    'success', true,
    'message', 'Salida registrada exitosamente',
    'alumno', json_build_object(
      'carnet', p_carnet,
      'nombre', v_nombre
    )
  );
END;
$$;

-- 9. Configurar realtime para las tablas
ALTER PUBLICATION supabase_realtime ADD TABLE cola_dia;
ALTER PUBLICATION supabase_realtime ADD TABLE alumnos;

-- 10. Insertar algunos datos de ejemplo (opcional)
-- INSERT INTO alumnos (carnet, nombre, grado, seccion, nivel) VALUES
-- ('001001', 'Juan Pérez López', 'Primero', 'A', 'primaria'),
-- ('001002', 'María García Rodríguez', 'Segundo', 'B', 'primaria'),
-- ('001003', 'Carlos López Martínez', 'Tercero', 'A', 'primaria');

-- Mensaje de confirmación
SELECT 'Base de datos configurada exitosamente para Colegio Manos a la Obra' as mensaje;