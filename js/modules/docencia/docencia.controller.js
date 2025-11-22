import { store } from '../../core/store.js';
import { showNotification, previewImage, previewFileName } from '../../core/utils.js';
import { showModal, hideModal } from '../../components/Modal.js';

export function initDocencia() {
    // Expose functions needed by HTML (if any) or attach listeners
    // For now, we assume the main router calls loadDocencia
}

export function loadDocencia() {
    const btn = document.getElementById('btnNew');
    const txt = document.getElementById('btnNewText');

    txt.textContent = 'Nuevo Registro';
    btn.onclick = () => openActaModal();
    btn.style.display = 'inline-flex';

    renderActaTable();
}

function openActaModal() {
    window.showForm('Nuevo Registro de Acta');

    document.getElementById('dataForm').style.display = 'block';
    document.getElementById('profForm').style.display = 'none';

    // Show/Hide fields for Acta
    document.getElementById('formRowDocLink').style.display = 'flex';
    document.getElementById('formGroupGroup').style.display = 'block';
    document.getElementById('formGroupAdvisor').style.display = 'block';
    document.getElementById('formGroupDate').style.display = 'block';
    document.getElementById('formGroupActaDetails').style.display = 'block';
    document.getElementById('formRowFiles').style.display = 'flex';

    document.getElementById('formGroupTitle').style.display = 'none';
    document.getElementById('formGroupType').style.display = 'none';
    document.getElementById('formGroupDescription').style.display = 'none';
    document.getElementById('formGroupSiteDetails').style.display = 'none';
    document.getElementById('formGroupGroupExtras').style.display = 'none';

    // Reset and Populate
    document.getElementById('dataForm').reset();
    fillLinkedDocSelect();
    fillGroupSelect();
    populateAdvisorDropdown();
}

function renderActaTable() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['ID', 'Cohorte', 'Docente', 'Fecha', 'Archivos', 'Acciones'];

    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = '';

    const data = store.allData.acta || [];

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan='${headers.length}' style='text-align:center;padding:1.5rem'>No hay registros.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        const fileCount = (item.pdfUrl ? 1 : 0) + (item.photo1 ? 1 : 0) + (item.photo2 ? 1 : 0);
        tr.innerHTML = `
      <td>#${String(item.id).slice(-4)}</td>
      <td>${item.group}</td>
      <td>${item.advisorName}</td>
      <td>${new Date(item.date).toLocaleDateString('es-ES')}</td>
      <td>${fileCount} archivo(s)</td>
      <td>
        <button class="btn btn-secondary view-btn" data-id="${item.id}"><i class='fas fa-eye'></i></button> 
        <button class='btn btn-danger delete-btn' data-id="${item.id}"><i class='fas fa-trash'></i></button>
      </td>
    `;

        // Attach listeners
        tr.querySelector('.view-btn').addEventListener('click', () => viewRecord(item.id));
        tr.querySelector('.delete-btn').addEventListener('click', () => deleteActa(item.id));

        tbody.appendChild(tr);
    });
}

function viewRecord(id) {
    const rec = store.allData.acta.find(a => a.id === id);
    if (!rec) return;

    const baseDoc = store.allData.documentos.find(d => d.id === rec.linkedDocId);

    document.getElementById('previewTitle').textContent = `Vista Previa del Acta — Cohorte ${rec.group}`;
    document.getElementById('previewPdfFrame').src = rec.pdfUrl || '';
    document.getElementById('previewLogros').textContent = rec.logros || '—';
    document.getElementById('previewAcuerdos').textContent = rec.acuerdos || '—';
    document.getElementById('previewSintesis').textContent = rec.sintesis || '—';

    const details = `
    <p><strong>Tipo:</strong> ${rec.type}</p>
    <p><strong>Cohorte:</strong> ${rec.group}</p>
    <p><strong>Docente:</strong> ${rec.advisorName}</p>
    <p><strong>Fecha:</strong> ${new Date(rec.date).toLocaleDateString('es-ES')}</p>
    ${baseDoc ? `<p><strong>Propósito (del documento base):</strong><br>${baseDoc.purpose || '—'}</p>` : ''}
  `;
    document.getElementById('previewGeneralDetails').innerHTML = details;

    const photos = [];
    if (rec.photo1) photos.push(`<img src='${rec.photo1}' style='width:100%;border-radius:8px;margin:.25rem 0'>`);
    if (rec.photo2) photos.push(`<img src='${rec.photo2}' style='width:100%;border-radius:8px;margin:.25rem 0'>`);
    document.getElementById('previewPhotos').innerHTML = photos.join('');

    showModal('previewModal');
}

// Helper functions for dropdowns
function fillLinkedDocSelect() {
    const sel = document.getElementById('linkedDoc');
    sel.innerHTML = '<option value="">-- Seleccionar Documento --</option>' +
        store.allData.documentos.map(d => `<option value="${d.id}">${d.title} — ${d.type} (${new Date(d.date).toLocaleDateString('es-ES')})</option>`).join('');

    sel.onchange = () => {
        const doc = store.allData.documentos.find(d => d.id == sel.value);
        if (doc) document.getElementById('recordDate').value = doc.date;
    };
}

function fillGroupSelect() {
    const sel = document.getElementById('recordGroup');
    sel.innerHTML = '<option value="">-- Seleccionar Cohorte --</option>' +
        store.groups.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
}

function populateAdvisorDropdown() {
    const sel = document.getElementById('recordAdvisor');
    sel.innerHTML = '<option value="">-- Seleccionar Docente --</option>' +
        store.professors.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

function deleteActa(id) {
    if (confirm('¿Está seguro de eliminar este registro?')) {
        store.allData.acta = store.allData.acta.filter(a => a.id !== id);
        renderActaTable();
        showNotification('Registro eliminado');
    }
}
