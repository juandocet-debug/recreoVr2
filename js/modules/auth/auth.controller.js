import { store } from '../../core/store.js';

export function initAuth() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Check for persisted session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            store.currentUser = JSON.parse(savedUser);
            showApp();
        } catch (e) {
            console.error('Error parsing saved user', e);
            localStorage.removeItem('currentUser');
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const r = document.getElementById('userRole').value;

    try {
        const btn = e.target.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = 'Verificando...';
        btn.disabled = true;

        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p, role: r })
        });

        const data = await response.json();

        if (response.ok) {
            // Check if password change is required
            if (data.data.mustChangePassword) {
                // Show Change Password Modal
                document.getElementById('changePasswordModal').style.display = 'flex';

                // Setup Change Password Form
                const changePassForm = document.getElementById('changePasswordForm');
                changePassForm.onsubmit = (ev) => handleChangePassword(ev, data.data.id);

                btn.textContent = originalText;
                btn.disabled = false;
                return; // Stop login flow
            }

            store.currentUser = {
                id: data.data.id, // Store ID for filtering
                username: data.data.username,
                role: data.data.role,
                name: data.data.name,
                relatedId: data.data.relatedId
            };

            // Persist simple session
            localStorage.setItem('currentUser', JSON.stringify(store.currentUser));
            showApp();
        } else {
            alert(data.message || 'Error en el inicio de sesión');
        }

        btn.textContent = originalText;
        btn.disabled = false;

    } catch (error) {
        console.error('Login error:', error);
        alert('Error de conexión con el servidor. Asegúrate de que el backend esté corriendo en el puerto 3000.\n\nEjecuta: node server/app.js');
        const btn = e.target.querySelector('button');
        if (btn) {
            btn.textContent = 'Ingresar';
            btn.disabled = false;
        }
    }
}

async function handleChangePassword(e, userId) {
    e.preventDefault();
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (newPass !== confirmPass) {
        alert('Las contraseñas no coinciden');
        return;
    }

    try {
        const btn = e.target.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = 'Cambiando...';
        btn.disabled = true;

        const response = await fetch('http://localhost:3001/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, newPassword: newPass })
        });

        if (response.ok) {
            alert('Contraseña actualizada exitosamente. Por favor, inicia sesión nuevamente.');
            document.getElementById('changePasswordModal').style.display = 'none';
            document.getElementById('loginForm').reset();
            document.getElementById('changePasswordForm').reset();
        } else {
            const data = await response.json();
            alert(data.error || 'Error al cambiar la contraseña');
        }

        btn.textContent = originalText;
        btn.disabled = false;

    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

async function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';

    const userDisplay = document.getElementById('userDisplay');
    const userAvatar = document.getElementById('userAvatar');

    if (userDisplay) userDisplay.textContent = store.currentUser.name;
    if (userAvatar) userAvatar.textContent = store.currentUser.name.charAt(0);

    // Dispatch event to signal login success
    window.dispatchEvent(new CustomEvent('auth:login', { detail: store.currentUser }));

    // Load initial data AND WAIT FOR IT
    await fetchProfessors();

    // Restore last section if available, otherwise default to dashboard
    const lastSection = localStorage.getItem('currentSection');
    if (lastSection && window.showDataSection) {
        window.showDataSection(lastSection);
    } else {
        // Default to dashboard if no section saved
        if (window.showSection) window.showSection('dashboard');
    }
}

export async function fetchProfessors() {
    try {
        const response = await fetch('http://localhost:3001/api/professors');
        if (response.ok) {
            const json = await response.json();
            store.professors = json.data;
            console.log('Profesores cargados:', store.professors.length);
        }
    } catch (e) {
        console.error('Error cargando profesores:', e);
    }
}

export function logout() {
    store.currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginForm').reset();
}
