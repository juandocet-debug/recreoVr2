// Configuración del API
// En desarrollo: http://localhost:3001
// En producción: se detecta automáticamente

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin;

window.API_URL = API_BASE_URL;

// Función helper para construir URLs del API
window.apiUrl = function (path) {
    // Limpiar el path (quitar \/ inicial si existe)
    const cleanPath = path.replace(/^\\\//, '/').replace(/^\//, '');
    return `${window.API_URL}/${cleanPath}`;
};

console.log('🌐 API URL:', window.API_URL);
