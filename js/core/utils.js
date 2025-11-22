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
