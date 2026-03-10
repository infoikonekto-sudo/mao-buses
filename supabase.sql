-- Supabase SQL schema para Colegio Roosevelt

-- Tabla principal de alumnos
CREATE TABLE IF NOT EXISTS alumnos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  carnet      VARCHAR(10) UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  grado       TEXT NOT NULL,
  seccion     CHAR(1) NOT NULL,
  nivel       TEXT NOT NULL CHECK (nivel IN ('preprimaria','primaria','secundaria')),
  foto_url    TEXT,
  bus_hoy     BOOLEAN DEFAULT FALSE,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Cola del día actual
CREATE TABLE IF NOT EXISTS cola_dia (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id       UUID REFERENCES alumnos(id),
  carnet          VARCHAR(10) NOT NULL,
  nombre          TEXT NOT NULL,
  grado           TEXT NOT NULL,
  seccion         CHAR(1) NOT NULL,
  nivel           TEXT NOT NULL,
  foto_url        TEXT,
  bus             BOOLEAN DEFAULT FALSE,
  turno           SERIAL,
  estado          TEXT DEFAULT 'esperando' CHECK (estado IN ('esperando','llamado','entregado')),
  hora_escaneo    TIMESTAMPTZ DEFAULT NOW(),
  hora_entrega    TIMESTAMPTZ,
  fecha_dia       DATE DEFAULT CURRENT_DATE
);

-- Configuración de bus por día
CREATE TABLE IF NOT EXISTS bus_asignaciones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id   UUID REFERENCES alumnos(id),
  carnet      VARCHAR(10) NOT NULL,
  fecha       DATE DEFAULT CURRENT_DATE,
  confirmado  BOOLEAN DEFAULT FALSE,
  UNIQUE(alumno_id, fecha)
);

-- Habilitar realtime
-- Ejecutar en SQL editor de Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE alumnos;
ALTER PUBLICATION supabase_realtime ADD TABLE cola_dia;
ALTER PUBLICATION supabase_realtime ADD TABLE bus_asignaciones;
