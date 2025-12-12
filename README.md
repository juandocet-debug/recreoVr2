# Recreo VR - Sistema de Gestión Académica

Sistema web para gestión de actas estudiantiles y grupos académicos.

## 🚀 Despliegue en Render.com

### Pasos:

1. **Crear cuenta en Render.com** (gratis)
   - Ve a https://render.com
   - Regístrate con GitHub

2. **Crear nuevo Web Service**
   - Click en "New" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Configuración:
     - **Name:** recreo-vr
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`

3. **Variables de entorno** (opcional)
   - No se requieren variables adicionales

4. **¡Listo!**
   - El servicio se desplegará automáticamente
   - Recibirás una URL como: `https://recreo-vr.onrender.com`

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start

# El servidor estará en http://localhost:3001
```

## 📁 Estructura del Proyecto

```
├── index.html          # Frontend principal
├── css/                # Estilos
├── js/                 # JavaScript del frontend
│   ├── config.js       # Configuración de API
│   ├── main.js         # Lógica principal
│   └── modules/        # Módulos del sistema
├── server/             # Backend Node.js
│   ├── app.js          # Servidor Express
│   └── db.js           # Base de datos SQLite
└── package.json        # Dependencias
```

## 👤 Credenciales por defecto

- **Usuario:** admin
- **Contraseña:** admin123
- **Rol:** Administrador

## 📝 Notas

- La base de datos SQLite se reinicia en cada deploy en Render (plan gratuito)
- Para persistencia permanente, considera migrar a PostgreSQL
