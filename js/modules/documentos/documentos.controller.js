import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';
import { showModal, hideModal } from '../../components/Modal.js';

export function loadDocumentos() {
  const btn = document.getElementById('btnNew');
  const txt = document.getElementById('btnNewText');

  txt.textContent = 'Nuevo Documento';
  btn.onclick = () => openDocModal();
  btn.style.display = 'inline-flex';

  renderDocTable();
}

function openDocModal() {
  window.showForm('Nuevo Documento');

  document.getElementById('dataForm').style.display = 'block';
  document.getElementById('profForm').style.display = 'none';

  // Show/Hide fields for Document
  document.getElementById('formGroupTitle').style.display = 'block';
  document.getElementById('formGroupType').style.display = 'block';
  document.getElementById('formGroupDate').style.display = 'block';
  document.getElementById('formGroupDescription').style.display = 'block';

  document.getElementById('formRowDocLink').style.display = 'none';
  document.getElementById('formGroupGroup').style.display = 'none';
  document.getElementById('formGroupAdvisor').style.display = 'none';
  document.getElementById('formGroupActaDetails').style.display = 'none';
  document.getElementById('formRowFiles').style.display = 'none';
  document.getElementById('formGroupSiteDetails').style.display = 'none';
  document.getElementById('formGroupGroupExtras').style.display = 'none';

  // Reset
  document.getElementById('dataForm').reset();
}

function renderDocTable() {
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');
  const headers = ['ID', 'Título', 'Tipo', 'Fecha Creación', 'Propósito', 'Acciones'];

  thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
  tbody.innerHTML = '';

  const data = store.allData.documentos || [];

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan='${headers.length}' style='text-align:center;padding:1.5rem'>No hay registros.</td></tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${item.id}</td>
      <td>${item.title}</td>
      <td><span class='pill'>${item.type}</span></td>
      <td>${new Date(item.date).toLocaleDateString('es-ES')}</td>
      <td>${(item.purpose || '').slice(0, 60)}...</td>
      <td>
        <button class='btn btn-danger delete-btn' data-id="${item.id}"><i class='fas fa-trash'></i></button>
      </td>
    `;
    tr.querySelector('.delete-btn').addEventListener('click', () => deleteDoc(item.id));
    tbody.appendChild(tr);
  });
}
