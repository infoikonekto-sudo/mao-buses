import { supabase, NIVEL_MAP_EXTENDED } from './supabase';

/**
 * ScanAgent - Procesar y validar escaneos QR
 * Tiempo máximo: 300ms desde escaneo hasta inserción en BD
 */

export class ScanAgent {
  constructor() {
    this.ultimoScanTiempo = {};
    this.ultimoScanCarnet = null;
    this.INTERVALO_MINIMO = 3000; // 3 segundos entre escaneos del mismo código
  }

  /**
   * Procesar escaneo QR o entrada manual
   * @param {string} rawQRData - Datos crudos del QR (JSON o carnet)
   * @returns {Promise<{ok: boolean, alumno?: object, entrada?: object, error?: string, msg: string}>}
   */
  async procesarScan(rawQRData) {
    try {
      const inicio = Date.now();

      // PASO 1: Parsear QR de forma segura
      let qrData = this.parsearQR(rawQRData);
      if (!qrData.c) {
        return {
          ok: false,
          error: 'QR_INVALIDO',
          msg: 'Código no reconocido. Intenta de nuevo.',
        };
      }

      const carnet = qrData.c;

      // PASO 2: Anti-duplicado rápido en memoria (< 1ms)
      if (this.esUnDuplicado(carnet)) {
        return {
          ok: false,
          error: 'DUPLICADO',
          msg: 'Este código fue escaneado hace poco.',
        };
      }

      // PASO 3: Buscar alumno en base de datos
      const { data: alumno, error: errorAlumno } = await supabase
        .from('alumnos')
        .select('id, carnet, nombre, grado, seccion, nivel, foto_url, bus_hoy, activo')
        .eq('carnet', carnet)
        .single();

      if (errorAlumno || !alumno) {
        return {
          ok: false,
          error: 'NO_ENCONTRADO',
          msg: 'Este alumno no está en el sistema.',
        };
      }

      if (!alumno.activo) {
        return {
          ok: false,
          error: 'INACTIVO',
          msg: `${alumno.nombre} está marcado como inactivo.`,
        };
      }

      // PASO 4: Verificar anti-duplicado en BD (< 200ms)
      const hace3min = new Date(Date.now() - 180000).toISOString();
      const hoy = new Date().toISOString().split('T')[0];

      const { data: scanReciente, error: errorBusqueda } = await supabase
        .from('cola_dia')
        .select('id, estado, turno')
        .eq('carnet', carnet)
        .eq('fecha_dia', hoy)
        .gte('hora_escaneo', hace3min)
        .limit(1);

      if (errorBusqueda) {
        console.error('[ScanAgent] Error verificando duplicado:', errorBusqueda);
      }

      if (scanReciente && scanReciente.length > 0) {
        const scan = scanReciente[0];
        return {
          ok: false,
          error: 'DUPLICADO_BD',
          msg: `${alumno.nombre} ya fue escaneado recientemente (turno #${scan.turno}).`,
        };
      }

      // PASO 5: ÉXITO - Insertar en cola
      const { data: entrada, error: errorInsercion } = await supabase
        .from('cola_dia')
        .insert({
          alumno_id: alumno.id,
          carnet: alumno.carnet,
          nombre: alumno.nombre,
          grado: alumno.grado,
          seccion: alumno.seccion,
          nivel: alumno.nivel,
          foto_url: alumno.foto_url,
          bus: alumno.bus_hoy,
          estado: 'esperando',
          fecha_dia: hoy,
        })
        .select()
        .single();

      if (errorInsercion) {
        console.error('[ScanAgent] Error insertando entrada:', errorInsercion);
        return {
          ok: false,
          error: 'ERROR_BD',
          msg: 'Error interno al procesar. Intenta de nuevo.',
        };
      }

      // Actualizar caché anti-duplicado
      this.ultimoScanCarnet = carnet;
      this.ultimoScanTiempo[carnet] = Date.now();

      const duracion = Date.now() - inicio;
      console.log(`[ScanAgent] ✅ Escaneo exitoso en ${duracion}ms:`, alumno.nombre);

      return {
        ok: true,
        alumno,
        entrada,
        duracion,
      };
    } catch (error) {
      console.error('[ScanAgent] Error no capturado:', error);
      return {
        ok: false,
        error: 'ERROR_SISTEMA',
        msg: 'Error inesperado. Intenta de nuevo.',
      };
    }
  }

  /**
   * Parsear datos del QR
   * Intenta JSON primero, luego busca patrón de carnet (8 dígitos)
   */
  parsearQR(rawData) {
    // Intento 1: Parsear como JSON
    try {
      const parsed = JSON.parse(rawData);
      if (parsed.c && /^\d{8}$/.test(String(parsed.c))) {
        return { c: String(parsed.c) };
      }
    } catch {
      // No es JSON válido, continuar
    }

    // Intento 2: Buscar carnet directo (8 dígitos)
    const match = String(rawData).match(/\b(\d{8})\b/);
    if (match) {
      return { c: match[1] };
    }

    return { c: null };
  }

  /**
   * Verificar si es un duplicado reciente (en memoria)
   */
  esUnDuplicado(carnet) {
    const ultimoTiempo = this.ultimoScanTiempo[carnet];
    if (!ultimoTiempo) return false;

    const ahora = Date.now();
    const esReciente = ahora - ultimoTiempo < this.INTERVALO_MINIMO;

    return esReciente;
  }

  /**
   * Resetear caché (p.ej., cada día)
   */
  resetear() {
    this.ultimoScanTiempo = {};
    this.ultimoScanCarnet = null;
    console.log('[ScanAgent] Caché reseteado');
  }
}

// Instancia global
let scanAgentInstance = null;

export function getScanAgent() {
  if (!scanAgentInstance) {
    scanAgentInstance = new ScanAgent();
  }
  return scanAgentInstance;
}
