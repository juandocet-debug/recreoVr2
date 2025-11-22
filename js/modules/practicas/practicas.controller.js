import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';
import { showModal, hideModal } from '../../components/Modal.js';

export function loadPracticas() {
    const btn = document.getElementById('btnNew');
    const txt = document.getElementById('btnNewText');

    txt.textContent = 'Crear Sitio';
    btn.onclick = () => openSiteModal();
    btn.style.display = 'inline-flex';

    renderSitesTable();
}

function openSiteModal() {
    window.showForm('Registrar Sitio de Práctica');

    document.getElementById('dataForm').style.display = 'block';
    document.getElementById('profForm').style.display = 'none';

    // Show/Hide fields for Site
    document.getElementById('formGroupSiteDetails').style.display = 'block';

    document.getElementById('formRowDocLink').style.display = 'none';
    document.getElementById('formGroupGroup').style.display = 'none';
    document.getElementById('formGroupAdvisor').style.display = 'none';
    document.getElementById('formGroupDate').style.display = 'none';
    document.getElementById('formGroupActaDetails').style.display = 'none';
    document.getElementById('formRowFiles').style.display = 'none';
    document.getElementById('formGroupTitle').style.display = 'none';
    document.getElementById('formGroupType').style.display = 'none';
    document.getElementById('formGroupDescription').style.display = 'none';
    document.getElementById('formGroupGroupExtras').style.display = 'none';

    // Reset and Populate
    document.getElementById('dataForm').reset();
    populateSiteProfessorDropdown();
}

function renderSitesTable() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['Empresa', 'Departamento', 'Contacto', 'Profesor', 'Acciones'];

    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = '';

    const data = store.allData.sites || [];

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan='${headers.length}' style='text-align:center;padding:1.5rem'>No hay registros.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const prof = store.professors.find(p => p.id === item.professorId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${item.companyName || ''}</td>
      <td>${item.department || ''}</td>
      <td>${item.contactName || ''}</td>
      <td>${prof ? prof.name : 'N/A'}</td>
      <td>
        <button class='btn btn-danger delete-btn' data-id="${item.id}"><i class='fas fa-trash'></i></button>
      </td>
    `;
        tr.querySelector('.delete-btn').addEventListener('click', () => deleteSite(item.id));
        tbody.appendChild(tr);
    });
}

function populateSiteProfessorDropdown() {
    const sel = document.getElementById('siteProfessor');
    if (!sel) return;
    const options = store.professors.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    sel.innerHTML = `<option value="">-- Seleccionar Profesor --</option>${options}`;
}
