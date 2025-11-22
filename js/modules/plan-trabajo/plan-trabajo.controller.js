import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';

let currentPlanId = null;

export function loadPlanTrabajo() {
    const btn = document.getElementById('btnNew');
    const btnText = document.getElementById('btnNewText');
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');

    if (btnText) btnText.textContent = 'Nuevo Plan de Trabajo';
    if (btn) btn.onclick = () => openPlanEditor('create');

    const headers = ['Profesor', 'Periodo', 'Estado', 'Horas Total', 'Acciones'];

    if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    if (tbody) tbody.innerHTML = '';

    const plans = store.workPlans || [];

    if (!plans.length && tbody) {
        tbody.innerHTML = `<tr><td colspan='${headers.length}' style='text-align:center;padding:1.5rem'>No hay planes registrados.</td></tr>`;
        return;
    }

    if (tbody) {
        plans.forEach(plan => {
            const prof = store.professors.find(p => p.id == plan.professorId);
            const statusText = plan.status === 'draft' ? 'Borrador' : plan.status === 'approved' ? 'Aprobado' : 'Firmado';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${prof ? prof.name : 'N/A'}</td>
                <td>${plan.period}</td>
                <td><span class="pill">${statusText}</span></td>
                <td>${plan.calculatedHours.total} / ${plan.generalInfo.dedication}h</td>
                <td>
                    <button class='btn btn-primary edit-btn' data-id="${plan.id}"><i class='fas fa-edit'></i></button>
                    <button class='btn btn-secondary print-btn' data-id="${plan.id}"><i class='fas fa-print'></i></button>
                    <button class='btn btn-danger delete-btn' data-id="${plan.id}"><i class='fas fa-trash'></i></button>
                </td>
            `;

            tr.querySelector('.edit-btn').addEventListener('click', () => openPlanEditor('edit', plan.id));
            tr.querySelector('.print-btn').addEventListener('click', () => generatePDF(plan.id));
            tr.querySelector('.delete-btn').addEventListener('click', () => deletePlan(plan.id));

            tbody.appendChild(tr);
        });
    }
}

function openPlanEditor(mode, planId = null) {
    window.showForm(mode === 'create' ? 'Nuevo Plan de Trabajo' : 'Editar Plan de Trabajo');

    // Show plan editor (we'll create custom forms for this)
    document.getElementById('dataForm').style.display = 'none';
    document.getElementById('profForm').style.display = 'none';

    let planEditorForm = document.getElementById('planWorkForm');
    if (!planEditorForm) {
        createPlanEditorForm();
        planEditorForm = document.getElementById('planWorkForm');
    }

    planEditorForm.style.display = 'block';

    if (mode === 'create') {
        currentPlanId = 'WP-' + Date.now();
        resetPlanForm();
    } else {
        currentPlanId = planId;
        loadPlanData(planId);
    }
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
                    <select id="planProfessor" class="form-control" required></select>
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

    // Cancel button
    const cancelBtn = planForm.querySelector('.btn-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            closePlanEditor();
            window.showDataSection('plan-trabajo');
        };
    }
}

function populateProfessorDropdown() {
    const sel = document.getElementById('planProfessor');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleccionar Profesor --</option>' +
        store.professors.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
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
}

function loadPlanData(planId) {
    const plan = store.workPlans.find(p => p.id === planId);
    if (!plan) return;

    document.getElementById('planProfessor').value = plan.professorId;
    document.getElementById('planPeriod').value = plan.period;
    document.getElementById('planYear').value = plan.year;
    document.getElementById('planFaculty').value = plan.generalInfo.facultyId || '';
    populateProgramDropdown(); // Refresh programs based on faculty
    document.getElementById('planProgram').value = plan.generalInfo.programId || '';
    document.getElementById('planVinculationType').value = plan.generalInfo.vinculationType;
    document.getElementById('planDedication').value = plan.generalInfo.dedication;

    // Load blocks - render saved items
    loadSavedBlocks(plan.blocks);
    updateHoursSummary();
}

function loadSavedBlocks(blocks) {
    // Clear all lists first
    const lists = {
        docencia: document.getElementById('docenciaList'),
        apoyoDocencia: document.getElementById('apoyoList'),
        trabajosGrado: document.getElementById('gradoList'),
        investigacion: document.getElementById('investigacionList'),
        pdi: document.getElementById('pdiList'),
        gestion: document.getElementById('gestionList')
    };

    Object.values(lists).forEach(list => {
        if (list) list.innerHTML = '';
    });

    // Load docencia (subjects)
    if (blocks.docencia && blocks.docencia.length) {
        blocks.docencia.forEach(subjectId => {
            const subject = store.subjects.find(s => s.id === subjectId);
            if (subject) {
                const program = store.programs.find(p => p.id === subject.programId);
                const item = document.createElement('div');
                item.className = 'plan-item';
                item.dataset.id = subjectId; // Store ID
                item.style.cssText = 'padding:1rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.75rem;';
                item.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:start;">
                        <div>
                            <strong>${subject.code}</strong> - ${subject.name}
                            <div style="font-size:0.875rem;color:#6b7280;margin-top:0.25rem;">
                                ${program ? program.name : 'N/A'} | ${subject.credits} créditos | <strong>${subject.hoursPerWeek}h/semana</strong>
                            </div>
                        </div>
                        <button class="btn btn-danger btn-sm" style="padding:0.25rem 0.5rem;" onclick="this.parentElement.parentElement.remove();updateHoursSummary();">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                lists.docencia.appendChild(item);
            }
        });
    }

    // Load other activities
    const activityBlocks = [
        { key: 'apoyoDocencia', list: lists.apoyoDocencia },
        { key: 'trabajosGrado', list: lists.trabajosGrado },
        { key: 'investigacion', list: lists.investigacion },
        { key: 'pdi', list: lists.pdi },
        { key: 'gestion', list: lists.gestion }
    ];

    activityBlocks.forEach(({ key, list }) => {
        if (blocks[key] && blocks[key].length && list) {
            blocks[key].forEach(activityId => {
                const activity = store.planActivities.find(a => a.id === activityId);
                if (activity) {
                    const item = document.createElement('div');
                    item.className = 'plan-item';
                    item.dataset.id = activityId; // Store ID
                    item.style.cssText = 'padding:1rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.75rem;';
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
                    list.appendChild(item);
                }
            });
        }
    });
}

function savePlan() {
    // Extract IDs from DOM items
    const extractIds = (listId) => {
        const list = document.getElementById(listId);
        if (!list) return [];
        const items = list.querySelectorAll('.plan-item[data-id]');
        return Array.from(items).map(item => item.dataset.id);
    };

    const planData = {
        id: currentPlanId,
        professorId: parseInt(document.getElementById('planProfessor').value),
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
            docencia: extractIds('docenciaList'),
            apoyoDocencia: extractIds('apoyoList'),
            trabajosGrado: extractIds('gradoList'),
            investigacion: extractIds('investigacionList'),
            pdi: extractIds('pdiList'),
            gestion: extractIds('gestionList')
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

    closePlanEditor();
    window.showDataSection('plan-trabajo');
}

function closePlanEditor() {
    // Remove the plan editor form
    const planForm = document.getElementById('planWorkForm');
    if (planForm) planForm.remove();

    // Restore standard forms visibility
    const dataForm = document.getElementById('dataForm');
    const profForm = document.getElementById('profForm');
    if (dataForm) dataForm.style.display = 'block';
    if (profForm) profForm.style.display = 'none';
}

function calculateTotalHours() {
    // Calculate hours from each block by counting items
    const docenciaList = document.getElementById('docenciaList');
    const apoyoList = document.getElementById('apoyoList');
    const gradoList = document.getElementById('gradoList');
    const investigacionList = document.getElementById('investigacionList');
    const pdiList = document.getElementById('pdiList');
    const gestionList = document.getElementById('gestionList');

    // Count hours from subjects in docencia block
    let docenciaHours = 0;
    if (docenciaList) {
        const items = docenciaList.querySelectorAll('.plan-item');
        items.forEach(item => {
            // Extract hours from the text (looks for "Xh/semana")
            const text = item.textContent;
            const match = text.match(/(\d+)h\/semana/);
            if (match) {
                docenciaHours += parseInt(match[1]);
            }
        });
    }

    // For activities, we'll count 2 hours per activity as default
    // (in future, activities can have their own hour values)
    const countActivityHours = (list, name) => {
        if (!list) {
            console.log(`⚠️ Lista ${name} no encontrada`);
            return 0;
        }
        const items = list.querySelectorAll('.plan-item');
        console.log(`📋 ${name}: ${items.length} items = ${items.length * 2}h`);
        return items.length * 2; // 2 hours per activity
    };

    const apoyoHours = countActivityHours(apoyoList, 'Apoyo');
    const gradoHours = countActivityHours(gradoList, 'Grado');
    const investigacionHours = countActivityHours(investigacionList, 'Investigación');
    const pdiHours = countActivityHours(pdiList, 'PDI');
    const gestionHours = countActivityHours(gestionList, 'Gestión');

    const total = docenciaHours + apoyoHours + gradoHours + investigacionHours + pdiHours + gestionHours;

    console.log(`📊 Total calculado: Docencia=${docenciaHours}h, Apoyo=${apoyoHours}h, Grado=${gradoHours}h, Investigación=${investigacionHours}h, PDI=${pdiHours}h, Gestión=${gestionHours}h, TOTAL=${total}h`);

    return {
        docencia: docenciaHours,
        apoyoDocencia: apoyoHours,
        trabajosGrado: gradoHours,
        investigacion: investigacionHours,
        pdi: pdiHours,
        gestion: gestionHours,
        total: total
    };
}

function updateHoursSummary() {
    const summary = document.getElementById('hoursSummary');
    const alert = document.getElementById('hoursAlert');
    if (!summary) return;

    const hours = calculateTotalHours();
    const dedication = parseInt(document.getElementById('planDedication').value) || 40;
    const percentage = Math.round((hours.total / dedication) * 100);

    // Determine color based on usage
    let statusColor = '#10b981'; // green
    let statusText = 'Disponible';
    if (percentage >= 100) {
        statusColor = '#ef4444'; // red
        statusText = 'Excedido';
    } else if (percentage >= 80) {
        statusColor = '#f59e0b'; // amber
        statusText = 'Cerca del límite';
    }

    summary.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
            <div style="text-align: center; padding: 0.75rem; background: #f0fdf4; border-radius: 6px;">
                <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem;">Docencia</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #059669;">${hours.docencia}h</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; background: #eff6ff; border-radius: 6px;">
                <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem;">Apoyo</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #2563eb;">${hours.apoyoDocencia}h</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; background: #fef3c7; border-radius: 6px;">
                <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem;">Trabajos Grado</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #d97706;">${hours.trabajosGrado}h</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; background: #f3e8ff; border-radius: 6px;">
                <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem;">Investigación</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #9333ea;">${hours.investigacion}h</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; background: #fce7f3; border-radius: 6px;">
                <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem;">PDI</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #db2777;">${hours.pdi}h</div>
            </div>
            <div style="text-align: center; padding: 0.75rem; background: #ecfccb; border-radius: 6px;">
                <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; margin-bottom: 0.25rem;">Gestión</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #65a30d;">${hours.gestion}h</div>
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.25rem; border-radius: 8px; color: white; text-align: center;">
            <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Asignado</div>
            <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 0.25rem;">${hours.total}h <span style="font-size: 1.5rem; opacity: 0.8;">/ ${dedication}h</span></div>
            <div style="margin-top: 0.75rem;">
                <div style="background: rgba(255,255,255,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: ${statusColor}; height: 100%; width: ${Math.min(percentage, 100)}%; transition: width 0.3s;"></div>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.9;">${percentage}% utilizado - ${statusText}</div>
            </div>
        </div>
    `;

    if (hours.total > dedication) {
        alert.innerHTML = `
            <div class="alert alert-danger" style="margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 1.25rem;"></i>
                <span><strong>Atención:</strong> Las horas asignadas (${hours.total}h) exceden la dedicación permitida (${dedication}h)</span>
            </div>
        `;
    } else if (hours.total >= dedication * 0.8) {
        alert.innerHTML = `
            <div style="margin-top: 1rem; padding: 0.75rem; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; color: #92400e; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-info-circle" style="font-size: 1.25rem;"></i>
                <span>Te estás acercando al límite de horas (${dedication}h disponibles, ${dedication - hours.total}h restantes)</span>
            </div>
        `;
    } else {
        alert.innerHTML = '';
    }
}

function deletePlan(planId) {
    if (confirm('¿Está seguro de eliminar este plan de trabajo?')) {
        store.workPlans = store.workPlans.filter(p => p.id !== planId);
        loadPlanTrabajo();
        showNotification('Plan eliminado');
    }
}

function generatePDF(planId) {
    // TODO: Open print view
    showNotification('Funcionalidad de PDF en desarrollo');
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
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3>Seleccionar Asignatura</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <input type="text" id="subjectSelector-search" class="form-control" placeholder="Buscar por código o nombre..." style="margin-bottom: 1rem;">
                <div id="subjectSelector-list" style="max-height: 400px; overflow-y: auto;"></div>
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
    const subject = store.subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const program = store.programs.find(p => p.id === subject.programId);
    const docenciaList = document.getElementById('docenciaList');

    const item = document.createElement('div');
    item.className = 'plan-item';
    item.dataset.id = subjectId; // Store ID for saving later
    item.style.cssText = 'padding:1rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.75rem;';
    item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
                <strong>${subject.code}</strong> - ${subject.name}
                <div style="font-size:0.875rem;color:#6b7280;margin-top:0.25rem;">
                    ${program ? program.name : 'N/A'} | ${subject.credits} créditos | <strong>${subject.hoursPerWeek}h/semana</strong>
                </div>
            </div>
            <button class="btn btn-danger btn-sm" style="padding:0.25rem 0.5rem;" onclick="this.parentElement.parentElement.remove();updateHoursSummary();">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    docenciaList.appendChild(item);
    // Wait for DOM to update before recalculating hours
    requestAnimationFrame(() => updateHoursSummary());
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
    item.dataset.id = activityId; // Store ID for saving later
    item.style.cssText = 'padding:1rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.75rem;';
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
    // Wait for DOM to update before recalculating hours
    requestAnimationFrame(() => updateHoursSummary());
    showNotification(`Actividad "${activity.name}" agregada`);
}

// Expose updateHoursSummary globally for onclick handlers
window.updateHoursSummary = updateHoursSummary;
window.closePlanEditor = closePlanEditor;
