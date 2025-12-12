// Configuración del API
// En desarrollo: http://localhost:3001
// En producción: se detecta automáticamente

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : window.location.origin;

window.API_URL = API_BASE_URL;

console.log('🌐 API URL:', window.API_URL);
