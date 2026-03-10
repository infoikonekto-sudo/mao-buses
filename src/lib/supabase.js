import { createClient } from '@supabase/supabase-js';

// Estructura de variables de entorno esperadas:
// VITE_SUPABASE_URL = URL del proyecto Supabase
// VITE_SUPABASE_ANON_KEY = Clave anónima de Supabase

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kiqwqxrfgoqxbwmwwygu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zLRVpE1Js1z9Q2s1AoHMJA_ypigF1V2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mapeo de grados a niveles (lógica de asignación automática)
export const NIVEL_MAP = {
  'Nursery': 'preprimaria',
  'Pre-Kínder': 'preprimaria',
  'Kínder': 'preprimaria',
  'Preparatoria': 'preprimaria',
  'Primero': 'primaria',
  'Segundo': 'primaria',
  'Tercero': 'primaria',
  'Cuarto': 'primaria',
  'Quinto': 'primaria',
  'Sexto': 'primaria',
  'Séptimo': 'secundaria',
  'Octavo': 'secundaria',
  'Noveno': 'secundaria',
  'Décimo CCLL': 'secundaria',
  'Décimo Computación': 'secundaria',
  'Undécimo CCLL': 'secundaria',
  'Undécimo Computación': 'secundaria',
};

// Versiones alternativas comunes
export const NIVEL_MAP_EXTENDED = {
  ...NIVEL_MAP,
  'Décimo Comp.': 'secundaria',
  'Undécimo Comp.': 'secundaria',
  '10': 'secundaria',
  '11': 'secundaria',
};
