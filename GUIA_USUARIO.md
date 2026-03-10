# 🎓 GUÍA DE USUARIO - COLEGIO MANOS A LA OBRA

## 🔐 INICIO DE SESIÓN

### Acceder al Sistema
1. Abre tu navegador en: **http://localhost:5176/**
2. Haz clic en **⚙️ Administración**
3. Serás redirigido a la página de LOGIN

### Página de Login
```
┌─────────────────────────────┐
│  Colegio Manos a la Obra   │
│  Sistema de Control de     │
│  Salidas                   │
├─────────────────────────────┤
│                             │
│ Correo Electrónico          │
│ → Ingresa tu correo         │
│                             │
│ Contraseña                  │
│ → Ingresa tu contraseña     │
│ → Haz clic 👁️ para mostrar |
│                             │
│ [→ Iniciar Sesión →]        │
│                             │
└─────────────────────────────┘
```

### ✅ Al Iniciar Sesión Exitosamente
- Verás el **Panel de Administración**
- Arriba derecha: Tu correo + botón **🚪 Salir**
- Sidebar izquierdo con 8 opciones

---

## 📊 IMPORTAR ALUMNOS (EXCEL)

### Paso 1: Preparar tu archivo Excel
Tu archivo debe tener estas columnas:

| Carnet | Nombre | Grado | Sección |
|--------|--------|-------|---------|
| 001234 | Juan Pérez López | Primero | A |
| 001235 | María García | Segundo | B |
| 001236 | Carlos López | Tercero | A |

**Formatos soportados:** .xlsx, .xls, .csv

### Paso 2: Ir a Importar Excel
```
En el Panel Admin:
1. Clic en [📊 Importar Excel] (parte superior derecha)
2. Se abrirá un modal
```

### Paso 3: Seleccionar Archivo
```
┌─────────────────────────────┐
│ Importar Alumnos desde Excel │
├─────────────────────────────┤
│                             │
│  📁 Arrastra tu archivo aquí│
│  o haz clic para seleccionar│
│                             │
│  Formato esperado:          │
│  Carnet | Nombre | Grado    │
│  Sección                    │
│                             │
│ ┌──────────┐ ┌───────────┐ │
│ │ Cancelar │ │ Importar  │ │
│ └──────────┘ └───────────┘ │
└─────────────────────────────┘
```

### Paso 4: Vista Previa
El sistema mostrará los primeros 10 registros:
- Verifica que los datos se vean correctamente
- Si hay errores, vuelve atrás y corrige el archivo

### Paso 5: Confirmar Importación
```
Botones disponibles:
[← Atrás] [Importar todos los registros →]
```

### Paso 6: Seguimiento en Tiempo Real
```
Procesando 250 registros...

[████████████░░░░░░░░░░] 55%

Insertados: 138
Fallidos: 0
```

### ✅ ¡Importación Exitosa!
```
✅ ¡Importación exitosa!
138 alumno(s) agregado(s) a la base de datos.

[Cerrar]
```

---

## 📱 NAVEGACIÓN EN ADMIN

### Sidebar (Menú Lateral)
Haz clic en cualquiera de estas opciones:

| Icono | Opción | Descripción |
|-------|--------|-------------|
| 📊 | Dashboard | Resumen en vivo del sistema |
| 📋 | Cola en vivo | Alumnos saliendo ahora |
| 🚌 | Bus | Gestión de buses |
| 👤 | Alumnos | Ver, editar, eliminar alumnos |
| 🎫 | QR / Carnets | Generar QR y carnets |
| 📈 | Reportes | Estadísticas y reportes |
| 📜 | Historial | Log de salidas |
| ⚙️ | Configuración | Ajustes del sistema |

---

## 🚪 CERRAR SESIÓN

1. Arriba a la derecha de la pantalla
2. Haz clic en **🚪 Salir**
3. Serás redirigido a la página de LOGIN

---

## 🎨 CARACTERÍSTICAS DEL NUEVO DISEÑO

### Colores Modernos
- 🔵 **Azul Oscuro**: Fondo y headers
- 💫 **Gradientes**: Botones y elementos destacados
- ✨ **Sombras Dinámicas**: Efecto de profundidad
- 🎯 **Acentos Vibrantes**: Alertas en rojo, verde, amarillo

### Animaciones
- 🔄 **Hover Effects**: Botones suben al pasar el mouse
- ⚡ **Transiciones Suaves**: 300ms entre estados
- 📍 **Loading Spinners**: Indicadores de progreso
- 🎬 **Fade Animations**: Entrada/salida suave

---

## ⚠️ SOLUCIÓN DE PROBLEMAS

### "Error: No puedo acceder a Admin"
✅ Verifica que hayas iniciado sesión correctamente
✅ Si no tienes cuenta, contacta al administrador del colegio

### "Error: Archivo no válido"
✅ Asegúrate de usar .xlsx, .xls o .csv
✅ Verifica que las columnas sean: Carnet, Nombre, Grado, Sección
✅ Que no haya filas vacías al principio

### "Error: Algunos registros fallaron"
✅ El sistema muestra cuál fila tuvo error
✅ Verifica que:
  - Carnet tenga máximo 20 caracteres
  - Nombre tenga máximo 100 caracteres
  - Grado y Sección no estén vacíos

### "El servidor dice 'Port in use'"
✅ Otro proceso está usando el puerto 5176
✅ En terminal: `npm run dev` abrirá otro puerto diferente

---

## 📞 CONTACTO Y SOPORTE

Si encuentras problemas:
1. Revisa esta guía
2. Contacta al administrador del sistema
3. Ten a mano:
   - El archivo Excel que intentaste importar
   - El mensaje de error exacto
   - Qué estabas intentando hacer

---

## ✨ VENTAJAS DEL NUEVO SISTEMA

✅ **Seguro**: Login con autenticación
✅ **Rápido**: Interfaz moderna y responsiva
✅ **Fácil**: Importar masivamente desde Excel
✅ **Hermoso**: Diseño profesional y limpio
✅ **Portable**: Funciona en cualquier navegador

---

**¡Bienvenido al nuevo Sistema de Control de Salida!** 🎉
