import * as XLSX from 'xlsx';
import { NIVEL_MAP_EXTENDED } from './supabase';

export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          reject(new Error('No se encontraron datos en el archivo'));
          return;
        }

        const normalized = jsonData.map(row => normalizeRow(row));
        resolve(normalized);
      } catch (error) {
        reject(new Error(`Error al procesar Excel: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsBinaryString(file);
  });
}

function normalizeRow(row) {
  const normalized = {};

  // Buscar y mapear columnas por diferentes nombres posibles
  const keys = Object.keys(row);

  for (const key of keys) {
    const lowerKey = key.toLowerCase().trim();
    const value = row[key];

    if (lowerKey.includes('carnet') || lowerKey.includes('código') || lowerKey.includes('id')) {
      normalized.carnet = String(value || '').trim();
    } else if (lowerKey.includes('nombre')) {
      normalized.nombre = String(value || '').trim();
    } else if (lowerKey.includes('grado') || lowerKey.includes('grade') || lowerKey.includes('nivel')) {
      normalized.grado = String(value || '').trim();
    } else if (lowerKey.includes('secc') || lowerKey.includes('section') || lowerKey.includes('grupo')) {
      normalized.seccion = String(value || '').trim();
    }
  }

  return normalized;
}

export function validateAlumnoData(row) {
  const errors = [];

  // Validar carnet
  if (!row.carnet || row.carnet.length === 0) {
    errors.push('Carnet es requerido');
  } else if (row.carnet.length > 20) {
    errors.push('Carnet muy largo (máx 20 caracteres)');
  }

  // Validar nombre
  if (!row.nombre || row.nombre.length === 0) {
    errors.push('Nombre es requerido');
  } else if (row.nombre.length > 100) {
    errors.push('Nombre muy largo (máx 100 caracteres)');
  }

  // Validar grado
  if (!row.grado || row.grado.length === 0) {
    errors.push('Grado es requerido');
  }

  // Validar sección
  if (!row.seccion || row.seccion.length === 0) {
    errors.push('Sección es requerida');
  } else if (row.seccion.length > 5) {
    errors.push('Sección muy larga (máx 5 caracteres)');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join('; ')
    };
  }

  // Mapear grado a nivel
  const nivel = mapearGradoANivel(row.grado);

  return {
    isValid: true,
    data: {
      carnet: row.carnet,
      nombre: row.nombre,
      grado: row.grado,
      seccion: row.seccion,
      nivel: nivel,
      created_at: new Date().toISOString(),
      estado: 'activo'
    }
  };
}

function mapearGradoANivel(grado) {
  // Mapeo exacto
  if (NIVEL_MAP_EXTENDED[grado]) {
    return NIVEL_MAP_EXTENDED[grado];
  }

  // Búsqueda flexible
  const gradoLower = grado.toLowerCase();

  if (gradoLower.includes('nursery') || gradoLower.includes('pre-k') || 
      gradoLower.includes('kinder') || gradoLower.includes('preparatoria')) {
    return 'preprimaria';
  }

  if (gradoLower.includes('primero') || gradoLower.includes('segundo') || 
      gradoLower.includes('tercero') || gradoLower.includes('cuarto') || 
      gradoLower.includes('quinto') || gradoLower.includes('sexto') ||
      (gradoLower.startsWith('1') || gradoLower.startsWith('2') || 
       gradoLower.startsWith('3') || gradoLower.startsWith('4') || 
       gradoLower.startsWith('5') || gradoLower.startsWith('6'))) {
    return 'primaria';
  }

  if (gradoLower.includes('séptimo') || gradoLower.includes('septimo') || 
      gradoLower.includes('octavo') || gradoLower.includes('noveno') || 
      gradoLower.includes('décimo') || gradoLower.includes('decimo') || 
      gradoLower.includes('undécimo') || gradoLower.includes('undecimo') ||
      (gradoLower.startsWith('7') || gradoLower.startsWith('8') || 
       gradoLower.startsWith('9') || gradoLower.startsWith('10') || 
       gradoLower.startsWith('11'))) {
    return 'secundaria';
  }

  return 'primaria'; // Default
}

export function generateExcelTemplate() {
  const template = [
    {
      'Carnet': '001001',
      'Nombre': 'Juan Pérez López',
      'Grado': 'Primero',
      'Sección': 'A'
    },
    {
      'Carnet': '001002',
      'Nombre': 'María García Rodríguez',
      'Grado': 'Segundo',
      'Sección': 'B'
    },
    {
      'Carnet': '001003',
      'Nombre': 'Carlos López Martínez',
      'Grado': 'Tercero',
      'Sección': 'A'
    },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 15 },
    { wch: 10 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
  XLSX.writeFile(wb, 'plantilla_alumnos.xlsx');
}
