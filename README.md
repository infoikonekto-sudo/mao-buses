# Sistema de Llamado Escolar – Colegio Roosevelt (MAO)

Proyecto completo para gestionar la salida de alumnos en el Colegio Roosevelt.

## 🌐 Stack
- React + Vite
- Supabase (PostgreSQL, Realtime, Storage, Auth)
- n8n para automatizaciones
- Web Speech API para TTS
- HTML5 QR Code para escaneo

## 🚀 Estructura del proyecto
```
/ (workspace root)
  /colegio-roosevelt         ← aplicación React/Vite
    /src
      /components            ← componentes reutilizables (FotoUploader, etc.)
      /lib                   ← utilitarios (supabase, agentes)
      /pages                 ← páginas y vistas
        /admin              ← panel de administración
        /display            ← pantallas de cola por nivel
        /scan               ← módulo de escaneo móvil
    supabase.sql            ← esquema de BD y publicaciones realtime
    package.json
    vite.config.js
    ...
  Datos_Alumnos_MAO_ROOS.xlsx ← lista original de alumnos (externa)
```

## 📦 Instalación
```bash
cd "c:\Users\ludin\Desktop\mao salidas\colegio-roosevelt"
npm install
# Crear archivo .env con las variables de Supabase (ver .env.example)
```

## 🛠️ Configuración de Supabase
1. Crear un proyecto gratuito en https://app.supabase.com
2. Abrir SQL editor y pegar el contenido de `supabase.sql` para crear tablas.
3. Crear bucket `fotos-alumnos` (público). Ajustar políticas si es necesario.
4. Copiar credenciales al `.env`.
5. Importar alumnos usando script JS (ver sección más abajo).

### 📥 Importación desde Excel
El archivo `Datos_Alumnos_MAO_ROOS.xlsx` contiene 860 registros.
Usar la siguiente plantilla para importarlos desde Node (ejecutar localmente):
```js
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
// ... (copiar función importarAlumnos del doc principal) ...
```

## 🧩 Uso de la aplicación
- `/scan`: módulo de escaneo móvil (Android/iOS Chrome)
- `/display/preprimaria`, `/display/primaria`, `/display/secundaria`: pantallas de cola en cada nivel.
- `/admin`: panel de gestión (requiere autenticación Supabase).

### Panel Admin
- Dashboard: cola en vivo con controles para llamar/entregar
- Bus: activar switches diarios + historial
- Alumnos: ver lista, subir fotos, buscar
- QR: generar códigos individuales (descargar PNG)
- Historial: exportar CSV del día
- Configuración: resetear bus, otros ajustes

## 🚌 Automatizaciones (n8n)
Instalar n8n via Docker y configurar flujos:
- Reset diario de `bus_hoy` a las 00:00.
- Alertas por WhatsApp/email cuando un alumno es entregado.
- Resumen diario para dirección.

## ✅ Checklist de validación
- Escaneo < 500ms, anti-duplicado 3min
- Voz lee nombres correctamente en español
- Los 3 displays actualizan en vivo vía Supabase Realtime
- Fotos aparecen o se muestran inicial si no existe
- Switch de bus se refleja con ícono 🚌
- Reseteo de bus se ejecuta cada día
- Sistema probado con 200 escaneos seguidos sin fallos

## 📝 Notas adicionales
- La UI usa la paleta blanco/azul del colegio y tipografías DM Sans/Serif/JetBrains Mono.
- El sistema está preparado para 860 alumnos y puede escalar con Supabase.

---
*Desarrollado marzo 2026 para Colegio Roosevelt (MAO).*