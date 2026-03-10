/**
 * VoiceAgent - Maneja la síntesis de voz para anuncios de salida
 * Soporta múltiples voces y niveles educativos
 */

export class VoiceAgent {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voces = [];
    this.inicializarVoces();
    this.nivelActual = null;
  }

  inicializarVoces() {
    // Esperar a que las voces estén disponibles
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        this.voces = this.synth.getVoices();
      };
    } else {
      this.voces = this.synth.getVoices();
    }
  }

  /**
   * Anuncia la salida de un alumno
   * @param {string} nombre - Nombre del alumno
   * @param {string} nivel - Nivel educativo (primaria, secundaria, etc.)
   */
  async hablar(nombre, nivel) {
    if (!this.synth) {
      console.warn('Síntesis de voz no soportada');
      return;
    }

    // Limpiar nombre (remover apellidos si es necesario)
    const nombreLimpio = this.limpiarNombre(nombre);

    // Mensaje según nivel
    const mensaje = this.generarMensaje(nombreLimpio, nivel);

    // Crear utterance
    const utterance = new SpeechSynthesisUtterance(mensaje);

    // Configurar voz
    const voz = this.seleccionarVoz(nivel);
    if (voz) {
      utterance.voice = voz;
    }

    // Configurar parámetros de voz
    utterance.rate = this.getVelocidad(nivel);
    utterance.pitch = this.getTono(nivel);
    utterance.volume = 0.8;
    utterance.lang = 'es-ES'; // Español de España

    // Reproducir
    try {
      this.synth.speak(utterance);
    } catch (error) {
      console.error('Error en síntesis de voz:', error);
    }
  }

  /**
   * Limpia el nombre para el anuncio
   */
  limpiarNombre(nombreCompleto) {
    if (!nombreCompleto) return '';

    // Si tiene formato "Apellido, Nombre"
    if (nombreCompleto.includes(',')) {
      const partes = nombreCompleto.split(',');
      return partes[1]?.trim() || partes[0].trim();
    }

    // Si tiene múltiples nombres, tomar el primero
    const nombres = nombreCompleto.split(' ');
    return nombres[0];
  }

  /**
   * Genera el mensaje de anuncio según el nivel
   */
  generarMensaje(nombre, nivel) {
    const mensajes = {
      primaria: [
        `¡${nombre} de primaria se va a su casa!`,
        `${nombre} de primaria, ¡hasta mañana!`,
        `¡Adiós ${nombre} de primaria!`
      ],
      secundaria: [
        `${nombre} de secundaria ha salido`,
        `Salida de ${nombre}, secundaria`,
        `${nombre} de secundaria, ¡buen viaje!`
      ],
      preescolar: [
        `¡${nombre} de preescolar se va!`,
        `${nombre} de preescolar, ¡nos vemos mañana!`,
        `¡Adiós ${nombre} de preescolar!`
      ]
    };

    const opciones = mensajes[nivel] || [`${nombre} ha salido`];
    return opciones[Math.floor(Math.random() * opciones.length)];
  }

  /**
   * Selecciona la voz apropiada para el nivel
   */
  seleccionarVoz(nivel) {
    // Buscar voces en español
    const vocesEspanol = this.voces.filter(voz =>
      voz.lang.startsWith('es') && voz.localService
    );

    if (vocesEspanol.length === 0) {
      return this.voces.find(voz => voz.default) || this.voces[0];
    }

    // Para primaria, voz más amigable/juguetona
    if (nivel === 'primaria' || nivel === 'preescolar') {
      return vocesEspanol.find(voz =>
        voz.name.toLowerCase().includes('female') ||
        voz.name.toLowerCase().includes('mujer') ||
        voz.name.toLowerCase().includes('child')
      ) || vocesEspanol[0];
    }

    // Para secundaria, voz más formal
    return vocesEspanol.find(voz =>
      voz.name.toLowerCase().includes('male') ||
      voz.name.toLowerCase().includes('hombre')
    ) || vocesEspanol[0];
  }

  /**
   * Velocidad de habla según nivel
   */
  getVelocidad(nivel) {
    const velocidades = {
      primaria: 0.9,
      secundaria: 1.0,
      preescolar: 0.8
    };
    return velocidades[nivel] || 1.0;
  }

  /**
   * Tono de voz según nivel
   */
  getTono(nivel) {
    const tonos = {
      primaria: 1.1,
      secundaria: 1.0,
      preescolar: 1.2
    };
    return tonos[nivel] || 1.0;
  }

  /**
   * Anuncio especial para emergencias o avisos importantes
   */
  anunciarAviso(mensaje, urgente = false) {
    if (!this.synth) return;

    const utterance = new SpeechSynthesisUtterance(mensaje);
    utterance.rate = urgente ? 1.2 : 1.0;
    utterance.pitch = urgente ? 1.3 : 1.0;
    utterance.volume = urgente ? 1.0 : 0.7;

    // Repetir mensaje urgente
    if (urgente) {
      utterance.onend = () => {
        setTimeout(() => this.synth.speak(utterance), 500);
      };
    }

    this.synth.speak(utterance);
  }

  /**
   * Detiene cualquier anuncio en curso
   */
  detener() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Verifica si la síntesis de voz está disponible
   */
  estaDisponible() {
    return 'speechSynthesis' in window;
  }
}

// Instancia singleton
let voiceAgentInstance = null;

export function getVoiceAgent() {
  if (!voiceAgentInstance) {
    voiceAgentInstance = new VoiceAgent();
  }
  return voiceAgentInstance;
}
