import { store } from '../../core/store.js';

export function initAuth() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const r = document.getElementById('userRole').value;

    if (store.users[u] && store.users[u].password === p && store.users[u].role === r) {
        store.currentUser = { username: u, role: r, name: store.users[u].name };
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('userDisplay').textContent = store.currentUser.name;
        document.getElementById('userAvatar').textContent = store.currentUser.name.charAt(0);

        // Dispatch event to signal login success
        window.dispatchEvent(new CustomEvent('auth:login', { detail: store.currentUser }));
    } else {
        alert('Credenciales inválidas.');
    }
}

export function logout() {
    store.currentUser = null;
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginForm').reset();
}
