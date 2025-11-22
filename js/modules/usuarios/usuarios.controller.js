import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';
import { TableManager } from '../../core/table-manager.js';

console.log('🚀 Módulo Usuarios cargado');

let usuariosTable;

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

      // Handle name fields (new vs legacy)
      if (item.firstName) {
        document.getElementById('profFirstName').value = item.firstName;
        document.getElementById('profLastName1').value = item.lastName1;
        document.getElementById('profLastName2').value = item.lastName2 || '';
      } else {
        // Legacy fallback: try to split name
        const parts = item.name.split(' ');
        if (parts.length > 2) {
          document.getElementById('profFirstName').value = parts.slice(0, -2).join(' ');
          document.getElementById('profLastName1').value = parts[parts.length - 2];
          document.getElementById('profLastName2').value = parts[parts.length - 1];
        } else if (parts.length === 2) {
          document.getElementById('profFirstName').value = parts[0];
          document.getElementById('profLastName1').value = parts[1];
          document.getElementById('profLastName2').value = '';
        } else {
          document.getElementById('profFirstName').value = item.name;
          document.getElementById('profLastName1').value = '';
          document.getElementById('profLastName2').value = '';
        }
      }

      document.getElementById('profIdNum').value = item.identification || '';
      document.getElementById('profPhone').value = item.phone || '';
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

  // Limpiar headers manuales si existen, TableManager se encarga
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  if (thead) thead.innerHTML = '';
  if (tbody) tbody.innerHTML = '';

  if (btnText) btnText.textContent = 'Nuevo Profesor';
  if (btn) btn.onclick = () => window.openProfModal('create');

  const data = store.professors;
  console.log(`Encontrados ${data.length} profesores`);

  if (usuariosTable) {
    usuariosTable.updateData(data);
  } else {
    usuariosTable = new TableManager({
      containerId: 'dataSection',
      data: data,
      columns: [
        {
          header: 'Foto',
          field: 'photo',
          render: (item) => item.photo ? `<img src='${item.photo}' style='width:40px;height:40px;border-radius:50%'>` : `<div class='user-avatar' style='width:40px;height:40px'>${item.name.charAt(0)}</div>`
        },
        {
          header: 'Apellidos y Nombres',
          field: 'name',
          render: (item) => {
            if (item.lastName1) {
              return `<strong>${item.lastName1} ${item.lastName2 || ''}</strong>, ${item.firstName}`;
            }
            return item.name;
          },
          renderText: (item) => {
            if (item.lastName1) {
              return `${item.lastName1} ${item.lastName2 || ''}, ${item.firstName}`;
            }
            return item.name;
          }
        },
        { header: 'Cédula', field: 'identification' },
        { header: 'Perfil', field: 'profile' }
      ],
      actions: { edit: true, delete: true },
      onEdit: (id) => window.openProfModal('edit', id),
      onDelete: (id) => window.deleteProf(id)
    });
  }

  // Handle Form Submission
  const form = document.getElementById('profForm');
  if (form) {
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.onsubmit = (e) => {
      e.preventDefault();
      console.log('💾 Guardando profesor...');
      const mode = newForm.dataset.mode;
      const id = newForm.dataset.id;

      const firstName = document.getElementById('profFirstName').value;
      const lastName1 = document.getElementById('profLastName1').value;
      const lastName2 = document.getElementById('profLastName2').value;

      const newProf = {
        id: mode === 'create' ? Date.now() : parseInt(id),
        firstName,
        lastName1,
        lastName2,
        name: `${firstName} ${lastName1} ${lastName2}`.trim(),
        identification: document.getElementById('profIdNum').value,
        phone: document.getElementById('profPhone').value,
        email: document.getElementById('profEmail').value,
        specialty: document.getElementById('profSpecialty').value,
        cv: document.getElementById('profCv').value,
        profile: document.getElementById('profProfile').value,
        role: document.getElementById('profRole').value,
        photo: ''
      };

      if (mode === 'create') {
        store.professors.push(newProf);
        showNotification('Profesor creado');
      } else {
        const idx = store.professors.findIndex(p => p.id == id);
        if (idx !== -1) store.professors[idx] = { ...store.professors[idx], ...newProf };
        showNotification('Profesor actualizado');
      }

      if (usuariosTable) usuariosTable.updateData(store.professors);
      window.showDataSection('roles-permisos');
    };

    const cancelBtn = newForm.querySelector('.btn-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        window.showDataSection('roles-permisos');
      };
    }

  } else {
    console.error('❌ No se encontró el formulario profForm');
  }
}
