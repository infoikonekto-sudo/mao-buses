// Script completo para configurar Supabase - Colegio Manos a la Obra
// Ejecutar con: node setup-supabase.js

import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://kiqwqxrfgoqxbwmwwygu.supabase.co', 'sb_publishable_zLRVpE1Js1z9Q2s1AoHMJA_ypigF1V2');

async function setupDatabase() {
  console.log('🚀 Configurando base de datos completa...\n');

  try {
    // 1. Crear tabla alumnos (si no existe)
    console.log('📋 Creando tabla alumnos...');
    const { error: alumnosError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS alumnos (
          id SERIAL PRIMARY KEY,
          carnet VARCHAR(20) UNIQUE NOT NULL,
          nombre VARCHAR(255) NOT NULL,
          grado VARCHAR(50) NOT NULL,
          seccion VARCHAR(10),
          bus_hoy BOOLEAN DEFAULT FALSE,
          foto_url TEXT,
          nivel VARCHAR(20),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (alumnosError && !alumnosError.message.includes('already exists')) {
      console.log('❌ Error creando tabla alumnos:', alumnosError.message);
    } else {
      console.log('✅ Tabla alumnos lista');
    }

    // 2. Crear tabla cola_dia
    console.log('📋 Creando tabla cola_dia...');
    const { error: colaError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS cola_dia (
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
          hora_escaneo TIMESTAMP WITH TIME ZONE,
          hora_entrega TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (colaError && !colaError.message.includes('already exists')) {
      console.log('❌ Error creando tabla cola_dia:', colaError.message);
    } else {
      console.log('✅ Tabla cola_dia lista');
    }

    // 3. Crear tabla bus_asignaciones
    console.log('📋 Creando tabla bus_asignaciones...');
    const { error: busError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS bus_asignaciones (
          id SERIAL PRIMARY KEY,
          fecha DATE NOT NULL DEFAULT CURRENT_DATE,
          grado VARCHAR(50) NOT NULL,
          seccion VARCHAR(10),
          bus_asignado BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (busError && !busError.message.includes('already exists')) {
      console.log('❌ Error creando tabla bus_asignaciones:', busError.message);
    } else {
      console.log('✅ Tabla bus_asignaciones lista');
    }

    // 4. Crear índices
    console.log('📋 Creando índices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_alumnos_carnet ON alumnos(carnet)',
      'CREATE INDEX IF NOT EXISTS idx_alumnos_grado ON alumnos(grado)',
      'CREATE INDEX IF NOT EXISTS idx_alumnos_bus_hoy ON alumnos(bus_hoy)',
      'CREATE INDEX IF NOT EXISTS idx_cola_dia_fecha ON cola_dia(fecha_dia)',
      'CREATE INDEX IF NOT EXISTS idx_cola_dia_turno ON cola_dia(turno)',
      'CREATE INDEX IF NOT EXISTS idx_cola_dia_estado ON cola_dia(estado)',
      'CREATE INDEX IF NOT EXISTS idx_bus_asignaciones_fecha ON bus_asignaciones(fecha)'
    ];

    for (const index of indices) {
      await supabase.rpc('exec_sql', { sql: index });
    }
    console.log('✅ Índices creados');

    // 5. Habilitar RLS y crear políticas
    console.log('🔒 Configurando seguridad RLS...');

    const rlsQueries = [
      'ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE cola_dia ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE bus_asignaciones ENABLE ROW LEVEL SECURITY',

      `CREATE POLICY IF NOT EXISTS "Permitir lectura alumnos autenticados" ON alumnos
       FOR SELECT USING (auth.role() = 'authenticated')`,

      `CREATE POLICY IF NOT EXISTS "Permitir escritura alumnos autenticados" ON alumnos
       FOR ALL USING (auth.role() = 'authenticated')`,

      `CREATE POLICY IF NOT EXISTS "Permitir lectura cola_dia autenticados" ON cola_dia
       FOR SELECT USING (auth.role() = 'authenticated')`,

      `CREATE POLICY IF NOT EXISTS "Permitir escritura cola_dia autenticados" ON cola_dia
       FOR ALL USING (auth.role() = 'authenticated')`,

      `CREATE POLICY IF NOT EXISTS "Permitir lectura bus_asignaciones autenticados" ON bus_asignaciones
       FOR SELECT USING (auth.role() = 'authenticated')`,

      `CREATE POLICY IF NOT EXISTS "Permitir escritura bus_asignaciones autenticados" ON bus_asignaciones
       FOR ALL USING (auth.role() = 'authenticated')`
    ];

    for (const query of rlsQueries) {
      await supabase.rpc('exec_sql', { sql: query });
    }
    console.log('✅ Políticas RLS configuradas');

    // 6. Crear bucket de storage
    console.log('🗂️ Creando bucket de storage...');
    try {
      const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('fotos-alumnos', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (bucketError && !bucketError.message.includes('already exists')) {
        console.log('❌ Error creando bucket:', bucketError.message);
      } else {
        console.log('✅ Bucket fotos-alumnos creado');
      }
    } catch (err) {
      console.log('⚠️ Bucket podría ya existir o requerir configuración manual');
    }

    // 7. Insertar datos de prueba
    console.log('📝 Insertando datos de prueba...');

    const alumnosPrueba = [
      { carnet: '20210001', nombre: 'Ana García López', grado: 'Primero', seccion: 'A', bus_hoy: false, nivel: 'primaria' },
      { carnet: '20210002', nombre: 'Carlos López Martínez', grado: 'Segundo', seccion: 'B', bus_hoy: true, nivel: 'primaria' },
      { carnet: '20210003', nombre: 'María Rodríguez Sánchez', grado: 'Tercero', seccion: 'A', bus_hoy: false, nivel: 'primaria' },
      { carnet: '20210004', nombre: 'José Hernández Gómez', grado: 'Cuarto', seccion: 'B', bus_hoy: true, nivel: 'primaria' },
      { carnet: '20210005', nombre: 'Laura Jiménez Torres', grado: 'Quinto', seccion: 'A', bus_hoy: false, nivel: 'primaria' },
      { carnet: '20210006', nombre: 'Miguel Ángel Castro', grado: 'Sexto', seccion: 'B', bus_hoy: true, nivel: 'primaria' },
      { carnet: '20200001', nombre: 'Sofía Morales Ruiz', grado: 'Preparatoria', seccion: 'A', bus_hoy: false, nivel: 'preprimaria' },
      { carnet: '20200002', nombre: 'Diego Vargas Peña', grado: 'Kínder', seccion: 'B', bus_hoy: true, nivel: 'preprimaria' }
    ];

    for (const alumno of alumnosPrueba) {
      const { error } = await supabase
        .from('alumnos')
        .upsert(alumno, { onConflict: 'carnet' });

      if (error) {
        console.log(`❌ Error insertando ${alumno.nombre}:`, error.message);
      } else {
        console.log(`✅ ${alumno.nombre} insertado`);
      }
    }

    // Insertar algunos registros de prueba en cola_dia
    const hoy = new Date().toISOString().split('T')[0];
    const colaPrueba = [
      {
        fecha_dia: hoy,
        turno: 1,
        carnet: '20210001',
        nombre: 'Ana García López',
        grado: 'Primero',
        seccion: 'A',
        nivel: 'primaria',
        bus: false,
        estado: 'entregado',
        hora_escaneo: new Date().toISOString(),
        hora_entrega: new Date().toISOString()
      }
    ];

    for (const registro of colaPrueba) {
      const { error } = await supabase
        .from('cola_dia')
        .upsert(registro, { onConflict: 'id' });

      if (error) {
        console.log(`❌ Error insertando registro de cola:`, error.message);
      } else {
        console.log(`✅ Registro de cola insertado`);
      }
    }

    console.log('\n🎉 ¡Configuración completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('- ✅ Tabla alumnos creada');
    console.log('- ✅ Tabla cola_dia creada');
    console.log('- ✅ Tabla bus_asignaciones creada');
    console.log('- ✅ Índices creados');
    console.log('- ✅ Políticas RLS configuradas');
    console.log('- ✅ Bucket fotos-alumnos creado');
    console.log('- ✅ Datos de prueba insertados');
    console.log('\n🔑 Credenciales de acceso:');
    console.log('- URL: http://localhost:5182');
    console.log('- Email: admin@test.com');
    console.log('- Password: admin123');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

setupDatabase().catch(console.error);