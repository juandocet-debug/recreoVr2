import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';
import { showModal, hideModal } from '../../components/Modal.js';

export function loadGrupos() {
    const btn = document.getElementById('btnNew');
    const txt = document.getElementById('btnNewText');

    txt.textContent = 'Nuevo Grupo';
    btn.onclick = () => openGroupModal();
    btn.style.display = 'inline-flex';

    renderGroupTable();
}

function openGroupModal() {
    window.showForm('Nuevo Grupo');

    document.getElementById('dataForm').style.display = 'block';
    document.getElementById('profForm').style.display = 'none';

    // Show/Hide fields for Group
    document.getElementById('formGroupTitle').style.display = 'block'; // Used for Group Name
    document.getElementById('labelTitle').textContent = 'Nombre del Grupo';
    document.getElementById('formGroupDate').style.display = 'block';
    document.getElementById('formGroupGroupExtras').style.display = 'block';

    document.getElementById('formRowDocLink').style.display = 'none';
    document.getElementById('formGroupType').style.display = 'none';
    document.getElementById('formGroupGroup').style.display = 'none';
    document.getElementById('formGroupAdvisor').style.display = 'none';
    document.getElementById('formGroupActaDetails').style.display = 'none';
    document.getElementById('formRowFiles').style.display = 'none';
    document.getElementById('formGroupSiteDetails').style.display = 'none';
    document.getElementById('formGroupDescription').style.display = 'none';

    // Reset and Populate
    document.getElementById('dataForm').reset();
    populateGroupAdvisorDropdown();
}

function renderGroupTable() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['ID', 'Cohorte', 'Asesor', 'Fecha Creación', 'Acciones'];

    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = '';

    const data = store.groups;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan='${headers.length}' style='text-align:center;padding:1.5rem'>No hay registros.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const adv = store.professors.find(p => p.id === item.advisorId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${adv ? adv.name : 'Sin asignar'}</td>
      <td>${new Date(item.date).toLocaleDateString('es-ES')}</td>
      <td>
        <button class='btn btn-danger delete-btn' data-id="${item.id}"><i class='fas fa-trash'></i></button>
      </td>
    `;
        tr.querySelector('.delete-btn').addEventListener('click', () => deleteGroup(item.id));
        tbody.appendChild(tr);
    });
}

function populateGroupAdvisorDropdown() {
    const sel = document.getElementById('groupAdvisor');
    if (!sel) return;
    const options = store.professors.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    sel.innerHTML = `<option value="">-- Seleccionar Asesor --</option>${options}`;
}
