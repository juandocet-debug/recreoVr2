import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';

console.log('🚀 Módulo Usuarios cargado');

// Define functions locally
function openProfModal(mode, id = null) {
  console.log(`Abrir modal profesor: ${mode}, id=${id}`);
  window.showForm(mode === 'create' ? 'Nuevo Profesor' : 'Editar Profesor');

  const form = document.getElementById('profForm');
  const dataForm = document.getElementById('dataForm');

  // Toggle forms
  if (dataForm) dataForm.style.display = 'none';
  if (form) form.style.display = 'block';

  if (mode === 'create') {
    form.reset();
    form.dataset.mode = 'create';
    form.dataset.id = '';
  } else {
    const item = store.professors.find(p => p.id === id);
    if (item) {
      form.dataset.mode = 'edit';
      form.dataset.id = id;
      document.getElementById('profName').value = item.name;
      document.getElementById('profEmail').value = item.email;
      document.getElementById('profSpecialty').value = item.specialty || '';
      document.getElementById('profCv').value = item.cv || '';
      document.getElementById('profProfile').value = item.profile || '';
      document.getElementById('profRole').value = item.role || 'profesor';
    } else {
      console.error('Profesor no encontrado:', id);
    }
  }
}

function deleteProf(id) {
  if (confirm('¿Está seguro de eliminar este profesor?')) {
    store.professors = store.professors.filter(p => p.id !== id);
    loadUsuarios();
    showNotification('Profesor eliminado correctamente');
  }
}

// Expose to window
window.openProfModal = openProfModal;
window.deleteProf = deleteProf;

export function loadUsuarios() {
  console.log('👥 loadUsuarios ejecutándose');
  const btn = document.getElementById('btnNew');
  const btnText = document.getElementById('btnNewText');
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');

  if (btnText) btnText.textContent = 'Nuevo Profesor';
  if (btn) btn.onclick = () => window.openProfModal('create');

  const headers = ['Foto', 'Nombre', 'Perfil', 'Acciones'];

  if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
  if (tbody) tbody.innerHTML = '';

  const data = store.professors;
  console.log(`Encontrados ${data.length} profesores`);

  if (!data.length && tbody) {
    tbody.innerHTML = `<tr><td colspan='${headers.length}' style='text-align:center;padding:1.5rem'>No hay registros.</td></tr>`;
    return;
  }

  if (tbody) {
    data.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.photo ? `<img src='${item.photo}' style='width:40px;height:40px;border-radius:50%'>` : `<div class='user-avatar' style='width:40px;height:40px'>${item.name.charAt(0)}</div>`}</td>
        <td>${item.name}</td>
        <td>${item.profile || ''}</td>
        <td>
            <button class='btn btn-primary edit-btn' data-id="${item.id}"><i class='fas fa-edit'></i></button> 
            <button class='btn btn-danger delete-btn' data-id="${item.id}"><i class='fas fa-trash'></i></button>
        </td>
        `;
      tr.querySelector('.edit-btn').addEventListener('click', () => openProfModal('edit', item.id));
      tr.querySelector('.delete-btn').addEventListener('click', () => deleteProf(item.id));
      tbody.appendChild(tr);
    });
  }

  // Handle Form Submission
  const form = document.getElementById('profForm');
  if (form) {
    // Remove previous listener to avoid duplicates if any
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.onsubmit = (e) => {
      e.preventDefault();
      console.log('💾 Guardando profesor...');
      const mode = newForm.dataset.mode;
      const id = newForm.dataset.id;

      const newProf = {
        id: mode === 'create' ? Date.now() : parseInt(id),
        name: document.getElementById('profName').value,
        email: document.getElementById('profEmail').value,
        specialty: document.getElementById('profSpecialty').value,
        cv: document.getElementById('profCv').value,
        profile: document.getElementById('profProfile').value,
        role: document.getElementById('profRole').value,
        photo: '' // Handle photo if needed
      };

      if (mode === 'create') {
        store.professors.push(newProf);
        showNotification('Profesor creado');
      } else {
        const idx = store.professors.findIndex(p => p.id == id);
        if (idx !== -1) store.professors[idx] = { ...store.professors[idx], ...newProf };
        showNotification('Profesor actualizado');
      }

      window.showDataSection('roles-permisos');
    };
  } else {
    console.error('❌ No se encontró el formulario profForm');
  }
}
