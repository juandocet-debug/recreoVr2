import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';

let currentPlanId = null;

let currentPage = 1;
const itemsPerPage = 5;

export function loadPlanTrabajo() {
    const btn = document.getElementById('btnNew');
    const btnText = document.getElementById('btnNewText');
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');

    if (btnText) btnText.textContent = 'Nuevo Plan de Trabajo';
    if (btn) btn.onclick = () => openPlanEditor('create');

    // Inject Filters and Excel Button
    let controls = document.getElementById('planControls');
    if (!controls) {
        controls = document.createElement('div');
        controls.id = 'planControls';
        controls.style.cssText = 'display:flex; gap:1rem; margin-bottom:1rem; align-items:center; flex-wrap: wrap;';
        controls.innerHTML = `
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <label style="font-weight:500;">Año:</label>
                <select id="filterYear" class="form-control" style="width:100px;">
                    <option value="">Todos</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                </select>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
                <label style="font-weight:500;">Periodo:</label>
                <input id="filterPeriod" class="form-control" placeholder="Ej: 2025-1" style="width:120px;">
            </div>
            <button id="btnExportExcel" class="btn btn-success" style="background:#107c41;border:none;display:flex;align-items:center;gap:0.5rem;color:white;">
                <i class="fas fa-file-excel"></i> Exportar Excel
            </button>
        `;

        // Insert before the table
        const tableContainer = document.querySelector('.table-responsive') || document.querySelector('table')?.parentElement;
        if (tableContainer) {
            tableContainer.insertBefore(controls, tableContainer.firstChild);
        } else {
            // Fallback if table container not found
            const mainContent = document.getElementById('main-content') || document.body;
            mainContent.insertBefore(controls, mainContent.firstChild);
        }

        // Add event listeners
        document.getElementById('filterYear').addEventListener('change', () => { currentPage = 1; renderPlanTable(); });
        document.getElementById('filterPeriod').addEventListener('input', () => { currentPage = 1; renderPlanTable(); });
        document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
    }

    renderPlanTable();
}

function renderPlanTable() {
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const filterYear = document.getElementById('filterYear')?.value;
    const filterPeriod = document.getElementById('filterPeriod')?.value?.toLowerCase();

    const headers = ['Profesor', 'Periodo', 'Estado', 'Horas Total', 'Acciones'];
    if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    if (tbody) tbody.innerHTML = '';

    let plans = store.workPlans || [];

    // Filtering
    if (filterYear) plans = plans.filter(p => p.year.toString() === filterYear);
    if (filterPeriod) plans = plans.filter(p => p.period.toLowerCase().includes(filterPeriod));

    if (!plans.length && tbody) {
        tbody.innerHTML = `<tr><td colspan='${headers.length}' style='text-align:center;padding:1.5rem'>No hay planes registrados.</td></tr>`;
        // Remove pagination if empty
        const pag = document.getElementById('paginationControls');
        if (pag) pag.remove();
        return;
    }

    // Pagination
    const totalPages = Math.ceil(plans.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedPlans = plans.slice(start, start + itemsPerPage);

    if (tbody) {
        paginatedPlans.forEach(plan => {
            const prof = store.professors.find(p => p.id == plan.professorId);
            const statusText = plan.status === 'draft' ? 'Borrador' : plan.status === 'approved' ? 'Aprobado' : 'Firmado';
            const photoUrl = prof?.photoUrl || 'https://ui-avatars.com/api/?name=' + (prof?.name || 'User') + '&background=random';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
            <div style="display:flex;align-items:center;gap:0.75rem;">
                <img src="${photoUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;">
                    <div>
                        <div style="font-weight:bold;">${prof ? prof.name : 'Profesor no encontrado'}</div>
                        <div style="font-size:0.8rem;color:#64748b;">${prof?.email || ''}</div>
                    </div>
            </div>
                </td >
                <td>${plan.period}</td>
                <td><span class="pill ${plan.status}">${statusText}</span></td>
                <td><strong>${plan.calculatedHours?.total || 0}</strong> / ${plan.generalInfo?.dedication || 40}h</td>
                <td>
                    <button class='btn btn-primary edit-btn' data-id="${plan.id}" title="Editar"><i class='fas fa-edit'></i></button>
                    <button class='btn btn-secondary print-btn' data-id="${plan.id}" title="Imprimir PDF"><i class='fas fa-print'></i></button>
                    <button class='btn btn-danger delete-btn' data-id="${plan.id}" title="Eliminar"><i class='fas fa-trash'></i></button>
                </td>
        `;

            tr.querySelector('.edit-btn').addEventListener('click', () => openPlanEditor('edit', plan.id));
            tr.querySelector('.print-btn').addEventListener('click', () => generatePDF(plan.id));
            tr.querySelector('.delete-btn').addEventListener('click', () => deletePlan(plan.id));

            tbody.appendChild(tr);
        });
    }

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    let paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationControls';
        paginationContainer.style.cssText = 'display:flex;justify-content:center;gap:0.5rem;margin-top:1rem;';
        const table = document.querySelector('table');
        if (table) table.parentElement.insertAdjacentElement('afterend', paginationContainer);
    }

    paginationContainer.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.className = `btn btn - sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'} `;
        btn.onclick = () => {
            currentPage = i;
            renderPlanTable();
        };
        paginationContainer.appendChild(btn);
    }
}

function exportToExcel() {
    const plans = store.workPlans || [];
    if (!plans.length) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }

    let tableHTML = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body>
        <table border="1">
            <thead>
                <tr style="background-color:#f0f0f0;font-weight:bold;">
                    <th>Profesor</th>
                    <th>Documento</th>
                    <th>Periodo</th>
                    <th>Año</th>
                    <th>Estado</th>
                    <th>Horas Totales</th>
                    <th>Dedicación</th>
                </tr>
            </thead>
            <tbody>
    `;

    plans.forEach(p => {
        const prof = store.professors.find(pr => pr.id == p.professorId);
        tableHTML += `
            <tr>
                <td>${prof ? prof.name : 'N/A'}</td>
                <td>${prof ? prof.document : 'N/A'}</td>
                <td>${p.period}</td>
                <td>${p.year}</td>
                <td>${p.status}</td>
                <td>${p.calculatedHours?.total || 0}</td>
                <td>${p.generalInfo?.dedication || 0}</td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table></body></html>`;

    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "planes_trabajo.xls";
    link.click();
}

function openPlanEditor(mode, planId = null) {
    // FORCE REMOVE existing form to guarantee fresh state
    const existingForm = document.getElementById('planWorkForm');
    if (existingForm) existingForm.remove();

    window.showForm(mode === 'create' ? 'Nuevo Plan de Trabajo' : 'Editar Plan de Trabajo');

    // Always create fresh form
    createPlanEditorForm();
    setupProfessorSearch(); // Initialize search listener
    const planEditorForm = document.getElementById('planWorkForm');

    planEditorForm.style.display = 'block';

    if (mode === 'create') {
        currentPlanId = 'WP-' + Date.now();
        resetPlanForm();
    } else {
        currentPlanId = planId;
        loadPlanData(planId);
    }
}

function loadPlanData(planId) {
    const plan = store.workPlans.find(p => p.id === planId);
    if (!plan) return;

    // Set professor using the new search UI
    selectProfessor(plan.professorId);
    document.getElementById('planPeriod').value = plan.period;
    document.getElementById('planYear').value = plan.year;
    document.getElementById('planFaculty').value = plan.generalInfo.facultyId || '';
    populateProgramDropdown(); // Refresh programs based on faculty
    document.getElementById('planProgram').value = plan.generalInfo.programId || '';
    document.getElementById('planVinculationType').value = plan.generalInfo.vinculationType;
    document.getElementById('planDedication').value = plan.generalInfo.dedication;

    // Restore blocks
    if (plan.blocks) {
        restoreBlockItems('docenciaList', plan.blocks.docencia, 'subject');
        restoreBlockItems('apoyoList', plan.blocks.apoyoDocencia, 'activity');
        restoreBlockItems('gradoList', plan.blocks.trabajosGrado, 'activity');
        restoreBlockItems('investigacionList', plan.blocks.investigacion, 'activity');
        restoreBlockItems('pdiList', plan.blocks.pdi, 'activity');
        restoreBlockItems('gestionList', plan.blocks.gestion, 'activity');
    }

    updateHoursSummary();
}

function restoreBlockItems(listId, items, type) {
    const list = document.getElementById(listId);
    if (!list || !items) return;
    list.innerHTML = '';

    items.forEach(data => {
        const item = document.createElement('div');
        item.className = 'plan-item';
        item.dataset.itemData = JSON.stringify(data);

        if (type === 'subject') {
            item.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div>
                        <strong>${data.code}</strong> - ${data.name}
                        <div style="font-size:0.875rem;color:#6b7280;margin-top:0.25rem;">
                             ${data.credits} créditos | <strong>${data.hours}h/semana</strong>
                        </div>
                    </div>
                    <button class="btn btn-danger btn-sm" style="padding:0.25rem 0.5rem;" onclick="this.parentElement.parentElement.remove(); updateHoursSummary();">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        } else {
            item.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div>
                        <strong>${data.name}</strong>
                        <div style="font-size:0.875rem;color:#6b7280;margin-top:0.25rem;">
                            ${data.description || 'Sin descripción'}
                        </div>
                    </div>
                    <button class="btn btn-danger btn-sm" style="padding:0.25rem 0.5rem;" onclick="this.parentElement.parentElement.remove();updateHoursSummary();">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
        list.appendChild(item);
    });
}

function createPlanEditorForm() {
    const formSection = document.getElementById('formSection');
    const planForm = document.createElement('form');
    planForm.id = 'planWorkForm';
    planForm.style.display = 'none';

    planForm.innerHTML = `
        <!-- General Info -->
        <div class="form-section">
            <h3>Información General</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Profesor</label>
                    <div style="position:relative;">
                        <input type="text" id="professorSearch" class="form-control" placeholder="Buscar por nombre o documento..." autocomplete="off">
                        <input type="hidden" id="planProfessor" required>
                        <div id="professorSearchResults" style="position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #e2e8f0;border-radius:0 0 6px 6px;max-height:200px;overflow-y:auto;z-index:10;display:none;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);"></div>
                    </div>
                    <div id="selectedProfessorCard" style="display:none;margin-top:0.5rem;padding:0.75rem;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;align-items:center;gap:0.75rem;">
                        <img id="selectedProfPhoto" src="" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
                        <div>
                            <div id="selectedProfName" style="font-weight:bold;color:#0c4a6e;"></div>
                            <div id="selectedProfId" style="font-size:0.8rem;color:#64748b;"></div>
                        </div>
                        <button type="button" class="btn btn-sm btn-danger" style="margin-left:auto;" onclick="clearSelectedProfessor()"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Periodo</label>
                    <input id="planPeriod" class="form-control" placeholder="2025-1" required>
                </div>
                <div class="form-group">
                    <label>Año</label>
                    <input type="number" id="planYear" class="form-control" value="2025" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Facultad *</label>
                    <select id="planFaculty" class="form-control" required></select>
                </div>
                <div class="form-group">
                    <label>Programa *</label>
                    <select id="planProgram" class="form-control" required></select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Tipo de Vinculación</label>
                    <select id="planVinculationType" class="form-control" onchange="window.updateDedicationHours()">
                        <option value="Planta">Planta</option>
                        <option value="Cátedra">Cátedra</option>
                        <option value="Ocasional">Ocasional</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Dedicación (horas/semana)</label>
                    <input type="number" id="planDedication" class="form-control" value="40" required readonly>
                    <small class="form-text text-muted">Auto-calculado según tipo de vinculación</small>
                </div>
            </div>
        </div>

        <!-- Tabs for Blocks -->
        <div class="plan-tabs">
            <button type="button" class="tab-btn active" data-tab="docencia">Docencia</button>
            <button type="button" class="tab-btn" data-tab="apoyo">Apoyo Docencia</button>
            <button type="button" class="tab-btn" data-tab="grado">Trabajos Grado</button>
            <button type="button" class="tab-btn" data-tab="investigacion">Investigación</button>
            <button type="button" class="tab-btn" data-tab="pdi">PDI</button>
            <button type="button" class="tab-btn" data-tab="gestion">Gestión</button>
        </div>

        <!-- Tab Content Placeholders -->
        <div id="tab-docencia" class="tab-content active">
            <h4>Asignaturas y Espacios Académicos</h4>
            <div id="docenciaList"></div>
            <button type="button" class="btn btn-secondary" onclick="window.addDocenciaItem()"><i class="fas fa-plus"></i> Agregar Asignatura</button>
        </div>

        <div id="tab-apoyo" class="tab-content">
            <h4>Actividades de Apoyo a la Docencia</h4>
            <div id="apoyoList"></div>
            <button type="button" class="btn btn-secondary" onclick="window.addApoyoItem()"><i class="fas fa-plus"></i> Agregar Actividad</button>
        </div>

        <div id="tab-grado" class="tab-content">
            <h4>Dirección de Trabajos de Grado</h4>
            <div id="gradoList"></div>
            <button type="button" class="btn btn-secondary" onclick="window.addGradoItem()"><i class="fas fa-plus"></i> Agregar Trabajo</button>
        </div>

        <div id="tab-investigacion" class="tab-content">
            <h4>Actividades de Investigación</h4>
            <div id="investigacionList"></div>
            <button type="button" class="btn btn-secondary" onclick="window.addInvestigacionItem()"><i class="fas fa-plus"></i> Agregar Proyecto</button>
        </div>

        <div id="tab-pdi" class="tab-content">
            <h4>Proyectos del Plan de Desarrollo Institucional</h4>
            <div id="pdiList"></div>
            <button type="button" class="btn btn-secondary" onclick="window.addPDIItem()"><i class="fas fa-plus"></i> Agregar Actividad PDI</button>
        </div>

        <div id="tab-gestion" class="tab-content">
            <h4>Actividades de Gestión Institucional</h4>
            <div id="gestionList"></div>
            <button type="button" class="btn btn-secondary" onclick="window.addGestionItem()"><i class="fas fa-plus"></i> Agregar Actividad</button>
        </div>

        <!-- Hours Summary -->
        <div class="hours-summary" style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
            <h3>Resumen de Horas</h3>
            <div id="hoursSummary"></div>
            <div id="hoursAlert" style="margin-top: 1rem;"></div>
        </div>

        <!-- Actions -->
        <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:1.5rem;border-top:1px solid #e2e8f0;padding-top:1">
            <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar Plan</button>
        </div>
    `;

    formSection.appendChild(planForm);

    // Wire up tab switching
    const tabBtns = planForm.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            planForm.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            btn.classList.add('active');
            planForm.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // Populate dropdowns
    populateProfessorDropdown();
    populateFacultyDropdown();

    // Wire up faculty change to update program dropdown
    const facultySelect = planForm.querySelector('#planFaculty');
    if (facultySelect) {
        facultySelect.addEventListener('change', () => {
            populateProgramDropdown();
        });
    }

    // Form submission
    planForm.onsubmit = (e) => {
        e.preventDefault();
        savePlan();
    };
}

// Setup Professor Search
setupProfessorSearch();


function setupProfessorSearch() {
    const input = document.getElementById('professorSearch');
    const results = document.getElementById('professorSearchResults');
    const hiddenInput = document.getElementById('planProfessor');

    if (!input) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) {
            results.style.display = 'none';
            return;
        }

        const filtered = store.professors.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.document && p.document.includes(query))
        );

        if (filtered.length === 0) {
            results.innerHTML = '<div style="padding:0.75rem;color:#64748b;">No se encontraron profesores</div>';
        } else {
            results.innerHTML = filtered.map(p => `
        <div class="prof-result-item" style="padding:0.75rem;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:0.5rem;" data-id="${p.id}">
            <img src="${p.photoUrl || 'https://ui-avatars.com/api/?name=' + p.name}" style="width:30px;height:30px;border-radius:50%;">
                <div>
                    <div style="font-weight:500;">${p.name}</div>
                    <div style="font-size:0.75rem;color:#64748b;">${p.document || 'Sin documento'}</div>
                </div>
            </div>
    `).join('');

            results.querySelectorAll('.prof-result-item').forEach(item => {
                item.onclick = () => selectProfessor(item.dataset.id);
            });
        }
        results.style.display = 'block';
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.style.display = 'none';
        }
    });
}

window.selectProfessor = function (profId) {
    const prof = store.professors.find(p => p.id == profId);
    if (!prof) return;

    document.getElementById('planProfessor').value = prof.id;
    document.getElementById('professorSearch').style.display = 'none';
    document.getElementById('professorSearchResults').style.display = 'none';

    const card = document.getElementById('selectedProfessorCard');
    card.style.display = 'flex';
    document.getElementById('selectedProfName').textContent = prof.name;
    document.getElementById('selectedProfId').textContent = prof.document || 'ID: ' + prof.id;
    document.getElementById('selectedProfPhoto').src = prof.photoUrl || 'https://ui-avatars.com/api/?name=' + prof.name;
};

window.clearSelectedProfessor = function () {
    document.getElementById('planProfessor').value = '';
    document.getElementById('professorSearch').value = '';
    document.getElementById('professorSearch').style.display = 'block';
    document.getElementById('selectedProfessorCard').style.display = 'none';
};

function populateProfessorDropdown() {
    // Deprecated in favor of search
}

function populateFacultyDropdown() {
    const sel = document.getElementById('planFaculty');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar Facultad --</option>' +
        store.faculties.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
}

function populateProgramDropdown() {
    const sel = document.getElementById('planProgram');
    if (!sel) return;

    const selectedFacultyId = document.getElementById('planFaculty').value;
    const filteredPrograms = store.programs.filter(p => p.facultyId === selectedFacultyId);

    sel.innerHTML = '<option value="">-- Seleccionar Programa --</option>' +
        filteredPrograms.map(p => `<option value="${p.id}">${p.name} (${p.code})</option>`).join('');
}

// Auto-update dedication based on employment type
window.updateDedicationHours = function () {
    const vinculationType = document.getElementById('planVinculationType').value;
    const dedicationInput = document.getElementById('planDedication');

    if (vinculationType === 'Planta') {
        dedicationInput.value = 40;
    } else if (vinculationType === 'Cátedra') {
        dedicationInput.value = 17;
    } else {
        dedicationInput.value = 20; // Ocasional
    }

    updateHoursSummary();
};

function resetPlanForm() {
    document.getElementById('planProfessor').value = '';
    document.getElementById('planPeriod').value = '';
    document.getElementById('planYear').value = new Date().getFullYear();

    // Clear all blocks
    const lists = ['docenciaList', 'apoyoList', 'gradoList', 'investigacionList', 'pdiList', 'gestionList'];
    lists.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    updateHoursSummary();
}



function savePlan() {
    // Helper to scrape items from DOM
    const getItemsFromList = (listId) => {
        const list = document.getElementById(listId);
        if (!list) return [];
        return Array.from(list.querySelectorAll('.plan-item')).map(item => {
            return JSON.parse(item.dataset.itemData || '{ }');
        });
    };

    const planData = {
        id: currentPlanId,
        professorId: document.getElementById('planProfessor').value,
        period: document.getElementById('planPeriod').value,
        year: parseInt(document.getElementById('planYear').value),
        status: 'draft',
        generalInfo: {
            facultyId: document.getElementById('planFaculty').value,
            programId: document.getElementById('planProgram').value,
            vinculationType: document.getElementById('planVinculationType').value,
            dedication: parseInt(document.getElementById('planDedication').value)
        },
        blocks: {
            docencia: getItemsFromList('docenciaList'),
            apoyoDocencia: getItemsFromList('apoyoList'),
            trabajosGrado: getItemsFromList('gradoList'),
            investigacion: getItemsFromList('investigacionList'),
            pdi: getItemsFromList('pdiList'),
            gestion: getItemsFromList('gestionList')
        },
        calculatedHours: calculateTotalHours()
    };

    const idx = store.workPlans.findIndex(p => p.id === currentPlanId);
    if (idx !== -1) {
        store.workPlans[idx] = planData;
        showNotification('Plan actualizado');
    } else {
        store.workPlans.push(planData);
        showNotification('Plan creado');
    }

    // CRITICAL: Remove the form from DOM
    const planForm = document.getElementById('planWorkForm');
    if (planForm) planForm.remove();

    window.showDataSection('plan-trabajo');
}

function calculateTotalHours() {
    console.log('🧮 calculateTotalHours iniciando...');

    // Calculate hours from each block by counting items
    const docenciaList = document.getElementById('docenciaList');
    const apoyoList = document.getElementById('apoyoList');
    const gradoList = document.getElementById('gradoList');
    const investigacionList = document.getElementById('investigacionList');
    const pdiList = document.getElementById('pdiList');
    const gestionList = document.getElementById('gestionList');

    console.log('📋 Listas encontradas:', {
        docencia: docenciaList ? `SÍ(${docenciaList.querySelectorAll('.plan-item').length} items)` : 'NO',
        apoyo: apoyoList ? `SÍ(${apoyoList.querySelectorAll('.plan-item').length} items)` : 'NO',
        grado: gradoList ? `SÍ(${gradoList.querySelectorAll('.plan-item').length} items)` : 'NO',
        investigacion: investigacionList ? `SÍ(${investigacionList.querySelectorAll('.plan-item').length} items)` : 'NO',
        pdi: pdiList ? `SÍ(${pdiList.querySelectorAll('.plan-item').length} items)` : 'NO',
        gestion: gestionList ? `SÍ(${gestionList.querySelectorAll('.plan-item').length} items)` : 'NO'
    });

    // Count hours from subjects in docencia block
    let docenciaHours = 0;
    if (docenciaList) {
        const items = docenciaList.querySelectorAll('.plan-item');
        items.forEach(item => {
            // Extract hours from the text (looks for "Xh/semana")
            const text = item.textContent;
            const match = text.match(/(\d+)h\/semana/);
            if (match) {
                const hours = parseInt(match[1]);
                console.log(`  ✓ Asignatura encontrada: ${hours} h / semana`);
                docenciaHours += hours;
            }
        });
    }

    // For activities, we'll count 2 hours per activity as default
    // (in future, activities can have their own hour values)
    const countActivityHours = (list) => {
        if (!list) return 0;
        const items = list.querySelectorAll('.plan-item');
        return items.length * 2; // 2 hours per activity
    };

    const apoyoHours = countActivityHours(apoyoList);
    const gradoHours = countActivityHours(gradoList);
    const investigacionHours = countActivityHours(investigacionList);
    const pdiHours = countActivityHours(pdiList);
    const gestionHours = countActivityHours(gestionList);

    const total = docenciaHours + apoyoHours + gradoHours + investigacionHours + pdiHours + gestionHours;

    const result = {
        docencia: docenciaHours,
        apoyoDocencia: apoyoHours,
        trabajosGrado: gradoHours,
        investigacion: investigacionHours,
        pdi: pdiHours,
        gestion: gestionHours,
        total: total
    };

    console.log('✅ Resultado del cálculo:', result);
    return result;
}

// ===== ADD ITEMS FUNCTIONS =====
window.addDocenciaItem = () => {
    openSubjectSelectorModal();
};

window.addApoyoItem = () => {
    openActivitySelectorModal('Apoyo Docencia');
};

window.addGradoItem = () => {
    showNotification('Función de Trabajos de Grado en desarrollo');
};

window.addInvestigacionItem = () => {
    openActivitySelectorModal('Investigación');
};

window.addPDIItem = () => {
    openActivitySelectorModal('PDI');
};

window.addGestionItem = () => {
    openActivitySelectorModal('Gestión');
};

// Subject Selector Modal
function openSubjectSelectorModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';

    modal.innerHTML = `
                    <div class="modal-content" style="background:white;border-radius:12px;max-width:700px;width:90%;max-height:80vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                        <div class="modal-header" style="padding:1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="margin:0;font-size:1.25rem;color:#1a202c;">Seleccionar Asignatura</h3>
                            <button class="modal-close" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#718096;padding:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:background 0.2s;" onmouseover="this.style.background='#f7fafc'" onmouseout="this.style.background='none'">&times;</button>
                        </div>
                        <div class="modal-body" style="padding:1.5rem;">
                            <input type="text" id="subjectSelector-search" class="form-control" placeholder="Buscar por código o nombre..." style="margin-bottom:1rem;width:100%;padding:0.75rem;border:2px solid #e2e8f0;border-radius:8px;font-size:1rem;">
                                <div id="subjectSelector-list" style="max-height:400px;overflow-y:auto;"></div>
                        </div>
                    </div>
                    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    // Render subjects
    renderSubjectList();

    // Search
    document.getElementById('subjectSelector-search').oninput = (e) => {
        renderSubjectList(e.target.value);
    };
}


function renderSubjectList(query = '') {
    const listDiv = document.getElementById('subjectSelector-list');
    if (!listDiv) return;

    const subjects = store.subjects || [];
    const filtered = subjects.filter(s =>
        s.code.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
    );

    if (!filtered.length) {
        listDiv.innerHTML = '<p style="text-align:center;padding:2rem;color:#6b7280;">No hay asignaturas registradas. Ve a Configuración > Asignaturas para crear una.</p>';
        return;
    }

    listDiv.innerHTML = filtered.map(subj => {
        const program = store.programs.find(p => p.id === subj.programId);
        return `
                    <div class="subject-item" style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;" data-id="${subj.id}">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <strong>${subj.code}</strong> - ${subj.name}
                                <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
                                    ${program ? program.name : 'N/A'} | ${subj.credits} créditos | ${subj.hoursPerWeek} horas/semana
                                </div>
                            </div>
                            <button class="btn btn-primary btn-sm" style="padding: 0.25rem 0.75rem;">Agregar</button>
                        </div>
                    </div>
                    `;
    }).join('');

    // Add click handlers
    listDiv.querySelectorAll('.subject-item').forEach(item => {
        item.onclick = () => {
            const subjectId = item.dataset.id;
            addSubjectToplan(subjectId);
            document.querySelector('.modal-overlay').remove();
        };
    });
}

function addSubjectToplan(subjectId) {
    console.log('➕ addSubjectToplan llamada con ID:', subjectId);

    const subject = store.subjects.find(s => s.id === subjectId);
    if (!subject) {
        console.error('❌ No se encontró la asignatura con ID:', subjectId);
        return;
    }

    console.log('✓ Asignatura encontrada:', subject);

    const program = store.programs.find(p => p.id === subject.programId);
    const docenciaList = document.getElementById('docenciaList');

    const item = document.createElement('div');
    item.className = 'plan-item';
    item.style.cssText = 'padding:1rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.75rem;';

    // Store data for scraping
    item.dataset.itemData = JSON.stringify({
        id: subject.id,
        code: subject.code,
        name: subject.name,
        hours: subject.hoursPerWeek,
        credits: subject.credits
    });

    item.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:start;">
                        <div>
                            <strong>${subject.code}</strong> - ${subject.name}
                            <div style="font-size:0.875rem;color:#6b7280;margin-top:0.25rem;">
                                ${program ? program.name : 'N/A'} | ${subject.credits} créditos | <strong>${subject.hoursPerWeek}h/semana</strong>
                            </div>
                        </div>
                        <button class="btn btn-danger btn-sm" style="padding:0.25rem 0.5rem;" onclick="this.parentElement.parentElement.remove(); updateHoursSummary();">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    `;

    docenciaList.appendChild(item);
    console.log('✓ Item agregado al DOM');

    updateHoursSummary();
    console.log('✓ updateHoursSummary llamada');

    showNotification(`Asignatura "${subject.name}" agregada`);
}


// Activity Selector Modal
function openActivitySelectorModal(activityType) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h3>Seleccionar Actividad - ${activityType}</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="activitySelector-list" style="max-height: 400px; overflow-y: auto;"></div>
                        </div>
                    </div>
                    `;

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    // Render activities
    renderActivityList(activityType);
}

function renderActivityList(activityType) {
    const listDiv = document.getElementById('activitySelector-list');
    if (!listDiv) return;

    const activities = (store.planActivities || []).filter(a => a.type === activityType);

    if (!activities.length) {
        listDiv.innerHTML = `<p style="text-align:center;padding:2rem;color:#6b7280;">No hay actividades de tipo "${activityType}" registradas. Ve a Configuración > Actividades para crear una.</p>`;
        return;
    }

    listDiv.innerHTML = activities.map(act => `
                    <div class="activity-item" style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;" data-id="${act.id}">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <strong>${act.name}</strong>
                                <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
                                    ${act.description || 'Sin descripción'}
                                </div>
                            </div>
                            <button class="btn btn-primary btn-sm" style="padding: 0.25rem 0.75rem;">Agregar</button>
                        </div>
                    </div>
                    `).join('');

    // Add click handlers
    listDiv.querySelectorAll('.activity-item').forEach(item => {
        item.onclick = () => {
            const activityId = item.dataset.id;
            addActivityToPlan(activityId, activityType);
            document.querySelector('.modal-overlay').remove();
        };
    });
}

function addActivityToPlan(activityId, activityType) {
    const activity = store.planActivities.find(a => a.id === activityId);
    if (!activity) return;

    // Determine which list to add to based on activity type
    let listId;
    switch (activityType) {
        case 'Apoyo Docencia': listId = 'apoyoList'; break;
        case 'Investigación': listId = 'investigacionList'; break;
        case 'PDI': listId = 'pdiList'; break;
        case 'Gestión': listId = 'gestionList'; break;
        default: return;
    }

    const targetList = document.getElementById(listId);
    if (!targetList) return;

    const item = document.createElement('div');
    item.className = 'plan-item';
    item.style.cssText = 'padding:1rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.75rem;';

    // Store data for scraping
    item.dataset.itemData = JSON.stringify({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        hours: 2, // Default hours, should be dynamic
        type: activityType
    });

    item.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:start;">
                        <div>
                            <strong>${activity.name}</strong>
                            <div style="font-size:0.875rem;color:#6b7280;margin-top:0.25rem;">
                                ${activity.description || 'Sin descripción'}
                            </div>
                        </div>
                        <button class="btn btn-danger btn-sm" style="padding:0.25rem 0.5rem;" onclick="this.parentElement.parentElement.remove();updateHoursSummary();">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    `;

    targetList.appendChild(item);
    showNotification(`Actividad "${activity.name}" agregada`);
    updateHoursSummary();
}

// VERSION MEJORADA DEL RESUMEN (Basada en la imagen)
window.updateHoursSummary = function () {
    console.log('🔄 updateHoursSummary llamada');

    const summary = document.getElementById('hoursSummary');
    const alert = document.getElementById('hoursAlert');

    if (!summary) return;

    const hours = calculateTotalHours();

    // Estilos basados en la imagen proporcionada
    summary.innerHTML = `
                    <div style="border: 1px solid #3b82f6; border-radius: 8px; overflow: hidden; font-family: system-ui, -apple-system, sans-serif;">
                        <div style="background: #eff6ff; padding: 1rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #0f172a; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                                📊 Resumen de Horas
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; font-size: 0.95rem; color: #1e293b;">
                                <div><strong>Docencia:</strong> ${hours.docencia}h</div>
                                <div><strong>Apoyo:</strong> ${hours.apoyoDocencia}h</div>
                                <div><strong>Grado:</strong> ${hours.trabajosGrado}h</div>
                                <div><strong>Investigación:</strong> ${hours.investigacion}h</div>
                                <div><strong>PDI:</strong> ${hours.pdi}h</div>
                                <div><strong>Gestión:</strong> ${hours.gestion}h</div>
                            </div>
                        </div>
                        <div style="background: #1e3a8a; color: white; padding: 0.75rem; text-align: center; font-size: 1.1rem; font-weight: bold;">
                            TOTAL: ${hours.total} horas
                        </div>
                    </div>
                    `;

    // Validación de horas (opcional, pero útil)
    const dedication = parseInt(document.getElementById('planDedication').value) || 40;
    if (hours.total > dedication) {
        if (alert) alert.innerHTML = `<div class="alert alert-warning" style="margin-top:1rem; color: #854d0e; background-color: #fef9c3; border: 1px solid #fde047; padding: 0.75rem; border-radius: 0.375rem;">⚠️ Las horas totales (${hours.total}) superan la dedicación permitida (${dedication}).</div>`;
    } else if (hours.total < dedication) {
        if (alert) alert.innerHTML = `<div class="alert alert-info" style="margin-top:1rem; color: #1e40af; background-color: #dbeafe; border: 1px solid #bfdbfe; padding: 0.75rem; border-radius: 0.375rem;">ℹ️ Aún tienes horas disponibles (${dedication - hours.total}).</div>`;
    } else {
        if (alert) alert.innerHTML = `<div class="alert alert-success" style="margin-top:1rem; color: #155724; background-color: #d4edda; border-color: #c3e6cb; padding: 0.75rem; border-radius: 0.375rem;">✅ Cumple con la dedicación exacta.</div>`;
    }
};

function deletePlan(planId) {
    if (confirm('¿Está seguro de eliminar este plan de trabajo?')) {
        store.workPlans = store.workPlans.filter(p => p.id !== planId);
        loadPlanTrabajo();
        showNotification('Plan eliminado');
    }
}

/*
function generatePDF(planId) {
    // ... content ...
}

function renderBlockForPDFHorizontal(title, activities, headers) {
    // ... content ...
}
*/
