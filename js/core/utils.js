export function showNotification(msg, type = 'info') {
    const n = document.createElement('div');
    n.textContent = msg;
    n.style.position = 'fixed'; n.style.right = '16px'; n.style.bottom = '16px';
    n.style.padding = '10px 14px'; n.style.borderRadius = '10px';
    n.style.color = '#fff';
    n.style.background = type === 'success' ? '#38a169' : (type === 'error' ? '#e53e3e' : '#4a5568');
    n.style.boxShadow = '0 10px 20px rgba(0,0,0,.15)';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2200);
}

export function previewImage(e, id) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); const prev = document.getElementById(id);
    const cont = prev.closest('.file-upload-box').querySelector('.upload-content');
    r.onload = ev => {
        prev.src = ev.target.result;
        prev.style.display = 'block';
        if (cont) cont.style.display = 'none';
    };
    r.readAsDataURL(f);
}

export function previewFileName(e, id) {
    const f = e.target.files[0];
    document.getElementById(id).textContent = f ? f.name : 'Seleccionar PDF';
}

// ========== VALIDACIÓN DE FORMULARIOS (GLOBAL) ==========

// Mostrar error en un campo
export function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.style.borderColor = '#e53e3e';
    field.style.boxShadow = '0 0 0 3px rgba(229, 62, 62, 0.2)';

    let errorEl = field.parentElement.querySelector('.field-error');
    if (!errorEl) {
        errorEl = document.createElement('span');
        errorEl.className = 'field-error';
        errorEl.style.cssText = 'color: #e53e3e; font-size: 12px; display: block; margin-top: 4px; font-weight: 500;';
        field.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
}

// Limpiar error de un campo
export function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.style.borderColor = '';
    field.style.boxShadow = '';

    const errorEl = field.parentElement.querySelector('.field-error');
    if (errorEl) errorEl.remove();
}

// Limpiar todos los errores
export function clearAllErrors(fieldIds) {
    fieldIds.forEach(id => clearFieldError(id));
}

// Validadores predefinidos
export const fieldValidators = {
    required: (value, msg = 'Campo requerido') => !value || value.trim() === '' ? msg : null,
    minLength: (min) => (value, msg) => value && value.length < min ? (msg || `Mínimo ${min} caracteres`) : null,
    maxLength: (max) => (value, msg) => value && value.length > max ? (msg || `Máximo ${max} caracteres`) : null,
    email: (value, msg = 'Email inválido') => value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? msg : null,
    phone: (value, msg = 'Teléfono inválido') => value && !/^[0-9\s\-\+\(\)]{7,20}$/.test(value) ? msg : null,
    date: (value, msg = 'Fecha inválida (YYYY-MM-DD)') => value && !/^\d{4}-\d{2}-\d{2}$/.test(value) ? msg : null,
    time: (value, msg = 'Hora inválida (HH:MM)') => value && !/^\d{2}:\d{2}$/.test(value) ? msg : null,
    oneOf: (options) => (value, msg) => !options.includes(value) ? (msg || 'Opción inválida') : null
};

// Validar formulario completo
export function validateForm(rules) {
    let hasErrors = false;
    const fieldIds = Object.keys(rules);

    // Limpiar errores anteriores
    clearAllErrors(fieldIds);

    // Validar cada campo
    for (const [fieldId, validators] of Object.entries(rules)) {
        const field = document.getElementById(fieldId);
        const value = field ? field.value.trim() : '';

        // validators puede ser un array o una función
        const validatorList = Array.isArray(validators) ? validators : [validators];

        for (const validator of validatorList) {
            const error = typeof validator === 'function' ? validator(value) : null;
            if (error) {
                showFieldError(fieldId, error);
                hasErrors = true;
                break; // Solo mostrar primer error por campo
            }
        }
    }

    // Scroll al primer error
    if (hasErrors) {
        const firstError = document.querySelector('.field-error');
        if (firstError) {
            firstError.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    return !hasErrors; // true si es válido
}

// Exponer globalmente
window.showFieldError = showFieldError;
window.clearFieldError = clearFieldError;
window.clearAllErrors = clearAllErrors;
window.fieldValidators = fieldValidators;
window.validateForm = validateForm;

// ========== FETCH AUTENTICADO ==========
// Usa esta función para TODAS las peticiones al servidor
export async function authFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');

    // Si no hay token, lanzar error
    if (!token) {
        throw new Error('No hay sesión activa');
    }

    // Construir URL completa si es relativa
    // Limpiar caracteres de escape \/ que quedaron
    let cleanUrl = url.replace(/\\\//g, '/');
    let fullUrl = cleanUrl;

    if (cleanUrl.startsWith('/')) {
        fullUrl = (window.API_URL || '') + cleanUrl;
    } else if (!cleanUrl.startsWith('http')) {
        fullUrl = (window.API_URL || '') + '/' + cleanUrl;
    }

    // Agregar token al header
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    // Si es JSON, agregar content-type
    if (options.body && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(fullUrl, {
        ...options,
        headers
    });

    // Si el token expiró o es inválido
    if (response.status === 401) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        // Solo mostrar mensaje, no recargar automáticamente
        console.warn('Sesión expirada');
        throw new Error('Sesión expirada');
    }

    // Si no tiene permisos (403)
    if (response.status === 403) {
        // No lanzar error, solo retornar la respuesta para que el código decida
        console.warn('Sin permisos para:', url);
    }

    return response;
}

// Exponer globalmente para uso fácil
window.authFetch = authFetch;
