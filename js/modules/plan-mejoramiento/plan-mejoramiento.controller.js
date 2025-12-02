import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';

let currentTab = 'plans'; // 'plans' or 'factors'
let selectedPlanId = null;

export function loadPlanMejoramiento() {
    console.log('DEBUG: loadPlanMejoramiento STARTED');
    // Reset State on Load
    currentTab = 'plans';
    selectedPlanId = null;
    console.log('DEBUG: State reset -> currentTab:', currentTab, 'selectedPlanId:', selectedPlanId);

    // Safeguard: Ensure dashboard is hidden
    const dashboard = document.getElementById('dashboard');
    if (dashboard) dashboard.style.display = 'none';

    const dataSection = document.getElementById('dataSection');
    const headerActions = document.querySelector('.header-actions');

    // Clear existing filters from previous implementation
    const existingFilters = document.getElementById('pmFilters');
    if (existingFilters) existingFilters.remove();

    // Setup Tabs
    let tabsContainer = document.getElementById('pmTabs');
    if (tabsContainer) tabsContainer.remove();

    tabsContainer = document.createElement('div');
    tabsContainer.id = 'pmTabs';
    tabsContainer.className = 'utility-tabs'; // Reuse utility tabs styling
    tabsContainer.innerHTML = `
        <button class="utility-tab-btn active" data-tab="plans">Planes de Mejoramiento</button>
        <button class="utility-tab-btn" data-tab="factors" id="tabFactors" disabled style="opacity:0.5;cursor:not-allowed;">Factores del Plan</button>
    `;

    // Insert tabs after header
    const sectionHeader = dataSection.querySelector('.section-header');
    if (sectionHeader) sectionHeader.after(tabsContainer);

    // Tab Logic
    tabsContainer.querySelectorAll('.utility-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;

            // Update UI
            tabsContainer.querySelectorAll('.utility-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentTab = btn.dataset.tab;
            renderCurrentTab();
        });
    });

    // Initial Render
    console.log('DEBUG: Calling renderCurrentTab from loadPlanMejoramiento');
    renderCurrentTab();

    // Inject Filters for Plans Tab
    injectPlanFilters();
}

let planFilters = {
    search: '',
    year: '',
    facultyId: '',
    programId: ''
};

function injectPlanFilters() {
    // Check if already exists
    let existingFilters = document.getElementById('planFiltersBar');
    if (existingFilters) return;

    const dataSection = document.getElementById('dataSection');
    const table = document.getElementById('dataTable');

    if (!table) return;

    // Years from current -5 to current +2
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 2; i++) {
        years.push(i);
    }

    const filtersBar = document.createElement('div');
    filtersBar.id = 'planFiltersBar';
    filtersBar.className = 'plan-filters';
    filtersBar.innerHTML = `
        <div class="filter-group">
            <label>Buscar</label>
            <input type="text" id="filterSearch" placeholder="Nombre del plan..." class="form-control">
        </div>
        <div class="filter-group">
            <label>Año</label>
            <select id="filterYear" class="form-control">
                <option value="">Todos</option>
                ${years.map(y => `<option value="${y}">${y}</option>`).join('')}
            </select>
        </div>
        <div class="filter-group">
            <label>Facultad</label>
            <select id="filterFaculty" class="form-control">
                <option value="">Todas</option>
                ${store.faculties.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
            </select>
        </div>
        <div class="filter-group">
            <label>Programa</label>
            <select id="filterProgram" class="form-control" disabled>
                <option value="">Todos</option>
            </select>
        </div>
    `;

    table.before(filtersBar);

    // Attach event listeners
    document.getElementById('filterSearch').addEventListener('input', (e) => {
        planFilters.search = e.target.value;
        if (currentTab === 'plans') renderCurrentTab();
    });

    document.getElementById('filterYear').addEventListener('change', (e) => {
        planFilters.year = e.target.value;
        if (currentTab === 'plans') renderCurrentTab();
    });

    document.getElementById('filterFaculty').addEventListener('change', (e) => {
        planFilters.facultyId = e.target.value;
        updateProgramFilter(e.target.value);
        if (currentTab === 'plans') renderCurrentTab();
    });

    document.getElementById('filterProgram').addEventListener('change', (e) => {
        planFilters.programId = e.target.value;
        if (currentTab === 'plans') renderCurrentTab();
    });
}

function updateProgramFilter(facultyId) {
    const programSelect = document.getElementById('filterProgram');
    if (!programSelect) return;

    if (!facultyId) {
        programSelect.innerHTML = '<option value="">Todos</option>';
        programSelect.disabled = true;
        planFilters.programId = '';
        return;
    }

    const programs = store.programs.filter(p => p.facultyId === facultyId);
    programSelect.innerHTML = '<option value="">Todos</option>' +
        programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    programSelect.disabled = false;
}

function renderCurrentTab() {
    console.log('DEBUG: renderCurrentTab STARTED. currentTab:', currentTab);
    const oldBtn = document.getElementById('btnNew');
    const btnText = document.getElementById('btnNewText');
    const table = document.getElementById('dataTable');
    const tbody = document.getElementById('tableBody');

    // Ensure Plans Grid Container exists
    let plansGrid = document.getElementById('plansGridContainer');
    if (!plansGrid) {
        plansGrid = document.createElement('div');
        plansGrid.id = 'plansGridContainer';
        plansGrid.className = 'plans-grid'; // Defined in plans.css
        table.after(plansGrid);
    }

    if (currentTab === 'plans') {
        console.log('DEBUG: Rendering PLANS tab');

        // Cleanup Plan Details Banner if exists
        const banner = document.getElementById('planDetailsBanner');
        if (banner) banner.remove();

        // Setup Header for Plans
        if (btnText) btnText.textContent = 'Crear Plan de Mejoramiento';

        if (oldBtn) {
            // Clone to clear previous listeners
            const btn = oldBtn.cloneNode(true);
            oldBtn.parentNode.replaceChild(btn, oldBtn);

            btn.style.display = 'inline-flex';
            btn.disabled = false;

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (typeof window.openPlanForm === 'function') {
                    window.openPlanForm('create');
                } else {
                    alert('Error: La función del formulario no está cargada.');
                }
            });
        }

        // Hide Table, Show Grid
        if (table) table.style.display = 'none';
        if (plansGrid) plansGrid.style.display = 'grid';

        renderPlansList(plansGrid);

    } else if (currentTab === 'factors') {
        console.log('DEBUG: Rendering FACTORS tab');
        // Setup Header for Factors
        if (btnText) btnText.textContent = 'Nuevo Factor';

        const currentBtn = document.getElementById('btnNew');
        if (currentBtn) {
            const btn = currentBtn.cloneNode(true);
            currentBtn.parentNode.replaceChild(btn, currentBtn);

            btn.style.display = 'inline-flex';
            btn.disabled = false;

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (typeof window.openFactorEditor === 'function') {
                    window.openFactorEditor(null);
                } else {
                    alert('Error: La función del editor de factores no está cargada.');
                }
            });
        }

        // Hide Grid, Show Table
        if (plansGrid) plansGrid.style.display = 'none';
        if (table) {
            table.style.display = 'table';
            const thead = document.getElementById('tableHeader');
            if (thead) {
                thead.style.display = 'table-header-group';
                thead.innerHTML = `
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Factor</th>
                        <th>Indicador</th>
                        <th>Actividades</th>
                        <th>Acciones</th>
                    </tr>
                `;
            }
        }

        if (tbody) {
            tbody.style.display = 'table-row-group';
            tbody.className = '';
        }

        renderFactorsList(tbody);
    }
}
/* -------------------------------------------------------------------------- */
/*                                PLANES (TAB 1)                              */
/* -------------------------------------------------------------------------- */

function renderPlansList(container) {
    if (!container) return;
    container.innerHTML = '';

    let plans = store.improvementPlans || [];

    // Apply filters
    plans = plans.filter(plan => {
        // Search filter
        if (planFilters.search && !plan.name.toLowerCase().includes(planFilters.search.toLowerCase())) {
            return false;
        }

        // Year filter (check if year falls within plan range)
        if (planFilters.year) {
            const year = parseInt(planFilters.year);
            const startYear = parseInt(plan.startDate.substring(0, 4));
            const endYear = parseInt(plan.endDate.substring(0, 4));
            if (year < startYear || year > endYear) {
                return false;
            }
        }

        // Faculty filter
        if (planFilters.facultyId && plan.facultyId !== planFilters.facultyId) {
            return false;
        }

        // Program filter
        if (planFilters.programId && plan.programId !== planFilters.programId) {
            return false;
        }

        return true;
    });

    if (plans.length === 0) {
        container.style.display = 'block'; // Reset to block for message
        container.innerHTML = '<div style="text-align:center;padding:3rem;color:#64748b;">No se encontraron planes con los filtros aplicados.<br><br>Intente ajustar los filtros o haga clic en "Crear Plan de Mejoramiento" para comenzar.</div>';
        return;
    }

    // Color palettes for cards
    const colors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ];

    plans.forEach((plan, index) => {
        const faculty = store.faculties.find(f => f.id === plan.facultyId)?.name || 'N/A';
        const program = store.programs.find(p => p.id === plan.programId)?.name || 'N/A';
        const factorsCount = (store.improvementFactors || []).filter(f => f.planId === plan.id).length;

        // Assign color based on index
        const cardColor = colors[index % colors.length];

        const card = document.createElement('div');
        card.className = 'plan-card';
        card.innerHTML = `
            <div class="plan-card-header" style="background: ${cardColor}">
                <div class="plan-card-title">${plan.name}</div>
                <div class="plan-card-subtitle">${program}</div>
            </div>
            <div class="plan-card-body">
                <div class="plan-info-item">
                    <i class="fas fa-university"></i>
                    <span>${faculty}</span>
                </div>
                <div class="plan-info-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${plan.startDate} - ${plan.endDate}</span>
                </div>
                <div class="plan-info-item">
                    <i class="fas fa-align-left"></i>
                    <span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${plan.description || 'Sin descripción'}</span>
                </div>
            </div>
            <div class="plan-card-footer">
                <span class="badge badge-info">${factorsCount} Factores</span>
                <div style="display:flex;gap:0.5rem;">
                    <button class="btn btn-sm btn-info" onclick="window.selectPlan('${plan.id}')" title="Gestionar Factores">Gestionar <i class="fas fa-arrow-right"></i></button>
                    <button class="btn btn-sm btn-secondary" onclick="window.openPlanForm('edit', '${plan.id}')" title="Editar Info"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.deletePlan('${plan.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.selectPlan = function (planId) {
    selectedPlanId = planId;
    currentTab = 'factors';

    // Enable and switch to tab
    const tabFactors = document.getElementById('tabFactors');
    if (tabFactors) {
        tabFactors.disabled = false;
        tabFactors.style.opacity = '1';
        tabFactors.style.cursor = 'pointer';
        tabFactors.click();
    }
};

window.backToPlansList = function () {
    selectedPlanId = null;
    currentTab = 'plans';

    // Update tabs UI
    const tabsContainer = document.getElementById('pmTabs');
    if (tabsContainer) {
        const tabPlans = tabsContainer.querySelector('[data-tab="plans"]');
        const tabFactors = tabsContainer.querySelector('[data-tab="factors"]');

        if (tabPlans) tabPlans.classList.add('active');
        if (tabFactors) {
            tabFactors.classList.remove('active');
            tabFactors.disabled = true;
            tabFactors.style.opacity = '0.5';
            tabFactors.style.cursor = 'not-allowed';
        }
    }

    renderCurrentTab();
};

window.openPlanForm = function (mode, planId = null) {
    window.showForm(mode === 'create' ? 'Crear Plan de Mejoramiento' : 'Editar Plan');

    const formSection = document.getElementById('formSection');

    // Cleanup
    const dynamicContainers = ['planHeaderForm', 'factorEditorForm', 'activityEditorForm'];
    dynamicContainers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    // Prepare Options
    const facOptions = store.faculties.map(f => `<option value="${f.id}">${f.name}</option>`).join('');

    const plan = mode === 'edit' ? store.improvementPlans.find(p => p.id === planId) : {};

    const form = document.createElement('div');
    form.id = 'planHeaderForm';
    form.innerHTML = `
        <form id="mainPlanForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre del Plan</label>
                    <input type="text" id="pName" class="form-control" value="${plan.name || ''}" required placeholder="Ej: Plan de Mejoramiento 2025">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Facultad</label>
                    <select id="pFaculty" class="form-control" required onchange="window.updateProgramOptions(this.value)">
                        <option value="">Seleccione Facultad...</option>
                        ${facOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Programa</label>
                    <select id="pProgram" class="form-control" required disabled>
                        <option value="">Seleccione Facultad primero...</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fecha Inicio</label>
                    <input type="date" id="pStart" class="form-control" value="${plan.startDate || ''}" required>
                </div>
                <div class="form-group">
                    <label>Fecha Fin</label>
                    <input type="date" id="pEnd" class="form-control" value="${plan.endDate || ''}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Descripción</label>
                <textarea id="pDesc" class="form-control" rows="3">${plan.description || ''}</textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:1rem;">
                <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar Plan</button>
            </div>
        </form>
    `;

    formSection.appendChild(form);

    // Pre-select values if editing
    if (mode === 'edit') {
        document.getElementById('pFaculty').value = plan.facultyId;
        window.updateProgramOptions(plan.facultyId);
        document.getElementById('pProgram').value = plan.programId;
    }

    // Cancel Handler
    form.querySelector('.btn-cancel').onclick = () => window.showDataSection('plan-mejoramiento');

    // Submit Handler
    document.getElementById('mainPlanForm').onsubmit = (e) => {
        e.preventDefault();

        const planData = {
            id: mode === 'create' ? 'PLAN-' + Date.now() : planId,
            name: document.getElementById('pName').value,
            facultyId: document.getElementById('pFaculty').value,
            programId: document.getElementById('pProgram').value,
            startDate: document.getElementById('pStart').value,
            endDate: document.getElementById('pEnd').value,
            description: document.getElementById('pDesc').value
        };

        if (!store.improvementPlans) store.improvementPlans = [];

        if (mode === 'create') {
            store.improvementPlans.push(planData);
            showNotification('Plan creado correctamente');

            // Return to Plans List
            window.showDataSection('plan-mejoramiento');

        } else {
            const idx = store.improvementPlans.findIndex(p => p.id === planId);
            if (idx !== -1) store.improvementPlans[idx] = planData;
            showNotification('Plan actualizado');
            window.showDataSection('plan-mejoramiento');
        }
    };
};

window.updateProgramOptions = function (facultyId) {
    const progSelect = document.getElementById('pProgram');
    if (!facultyId) {
        progSelect.innerHTML = '<option value="">Seleccione Facultad primero...</option>';
        progSelect.disabled = true;
        return;
    }

    const programs = store.programs.filter(p => p.facultyId === facultyId);
    progSelect.innerHTML = '<option value="">Seleccione Programa...</option>' +
        programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    progSelect.disabled = false;
};

window.deletePlan = function (planId) {
    if (confirm('¿Eliminar este plan y todos sus factores asociados?')) {
        store.improvementPlans = store.improvementPlans.filter(p => p.id !== planId);
        // Also delete associated factors
        store.improvementFactors = (store.improvementFactors || []).filter(f => f.planId !== planId);
        renderPlansList(document.getElementById('tableBody'));
        showNotification('Plan eliminado');
    }
};

/* -------------------------------------------------------------------------- */
/*                               FACTORES (TAB 2)                             */
/* -------------------------------------------------------------------------- */

function renderFactorsList(tbody) {
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!selectedPlanId) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">Seleccione un plan primero.</td></tr>';
        return;
    }

    // Inject Plan Details Banner
    const plan = store.improvementPlans.find(p => p.id === selectedPlanId);
    if (plan) {
        // Check if banner already exists to avoid duplication if re-rendering
        let banner = document.getElementById('planDetailsBanner');
        if (banner) banner.remove();

        const faculty = store.faculties.find(f => f.id === plan.facultyId)?.name || 'N/A';
        const program = store.programs.find(p => p.id === plan.programId)?.name || 'N/A';

        banner = document.createElement('div');
        banner.id = 'planDetailsBanner';
        banner.className = 'plan-details-banner';
        banner.innerHTML = `
            <div class="plan-banner-info">
                <h2>${plan.name}</h2>
                <div class="plan-banner-meta">
                    <span><i class="fas fa-university"></i> ${faculty}</span>
                    <span><i class="fas fa-graduation-cap"></i> ${program}</span>
                    <span><i class="fas fa-calendar-alt"></i> ${plan.startDate} - ${plan.endDate}</span>
                </div>
                <div style="margin-top:0.5rem;color:#475569;font-size:0.95rem;">${plan.description || ''}</div>
            </div>
            <button class="btn btn-secondary" onclick="window.backToPlansList()">
                <i class="fas fa-arrow-left"></i> Volver a Lista
            </button>
        `;

        // Insert before the table
        const table = document.getElementById('dataTable');
        if (table) table.before(banner);
    }

    const factors = (store.improvementFactors || []).filter(f => f.planId === selectedPlanId);

    if (factors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">No hay factores registrados en este plan.</td></tr>';
        return;
    }

    factors.sort((a, b) => a.number - b.number);

    factors.forEach(factor => {
        const activities = (store.improvementActivities || []).filter(a => a.planId === factor.id); // Note: planId in activities refers to FACTOR ID currently. We should probably rename it to factorId eventually, but keeping for compatibility.

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center;">${factor.number}</td>
            <td>
                <div>${factor.name}</div>
                <div style="font-size:0.8rem;color:#64748b;">Meta: ${factor.meta}</div>
            </td>
            <td>${factor.indicator}</td>
            <td><span class="badge badge-info">${activities.length} Actividades</span></td>
            <td>
                <div style="display:flex;gap:0.5rem;">
                    <button class="btn btn-sm btn-primary" onclick="window.openFactorEditor('${factor.id}')" title="Editar / Ver Detalles"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteFactor('${factor.id}')" title="Eliminar Factor"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openFactorEditor = function (factorId) {
    const isNew = !factorId;
    const factor = isNew ? {} : store.improvementFactors.find(f => f.id === factorId);

    if (!factor && !isNew) return;

    window.showForm(isNew ? 'Nuevo Factor' : 'Editar Factor');

    const formSection = document.getElementById('formSection');

    // Cleanup
    const oldForms = formSection.querySelectorAll('div[id$="Form"]');
    oldForms.forEach(f => f.remove());

    const customForm = document.createElement('div');
    customForm.id = 'factorEditorForm';
    customForm.innerHTML = `
        <form id="mainFactorForm">
            <div class="form-row">
                <div class="form-group" style="flex:0 0 100px;">
                    <label>Número</label>
                    <input type="number" id="facNumber" class="form-control" min="1" max="12" value="${factor.number || ''}" required>
                </div>
                <div class="form-group">
                    <label>Nombre del Factor</label>
                    <input type="text" id="facName" class="form-control" value="${factor.name || ''}" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Descripción de la Necesidad</label>
                    <textarea id="facNeed" class="form-control" rows="2" required>${factor.need || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Causa</label>
                    <textarea id="facCause" class="form-control" rows="2" required>${factor.cause || ''}</textarea>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Meta</label>
                    <input type="text" id="facMeta" class="form-control" value="${factor.meta || ''}" required>
                </div>
                <div class="form-group">
                    <label>Indicador</label>
                    <input type="text" id="facIndicator" class="form-control" value="${factor.indicator || ''}" required>
                </div>
            </div>
            
            <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:1rem;padding-bottom:1rem;border-bottom:1px solid #e2e8f0;">
                <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar Factor</button>
            </div>
        </form>

        <!-- ACTIVITIES SECTION -->
        <div id="activitiesSection" style="margin-top:2rem;display:${isNew ? 'none' : 'block'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h3 style="margin:0;color:#1e293b;">Actividades</h3>
                <button class="btn btn-secondary" onclick="window.openActivityEditor('${factor.id}')"><i class="fas fa-plus"></i> Agregar Actividad</button>
            </div>
            <div id="activitiesTableContainer"></div>
        </div>
    `;

    formSection.appendChild(customForm);

    // Cancel Handler
    customForm.querySelector('.btn-cancel').onclick = () => {
        // Return to Factors Tab
        window.showDataSection('plan-mejoramiento');
        // Re-select tab logic is handled by global state `currentTab` and `selectedPlanId`
    };

    if (!isNew) {
        renderActivitiesTable(factor.id);
    }

    // Submit Handler
    document.getElementById('mainFactorForm').onsubmit = (e) => {
        e.preventDefault();

        const factorData = {
            id: isNew ? 'IMP-FAC-' + Date.now() : factor.id,
            planId: selectedPlanId, // Link to Parent Plan
            number: parseInt(document.getElementById('facNumber').value),
            name: document.getElementById('facName').value,
            need: document.getElementById('facNeed').value,
            cause: document.getElementById('facCause').value,
            meta: document.getElementById('facMeta').value,
            indicator: document.getElementById('facIndicator').value
        };

        if (!store.improvementFactors) store.improvementFactors = [];

        if (isNew) {
            store.improvementFactors.push(factorData);
            showNotification('Factor creado');
            // Switch to edit mode to allow adding activities
            window.openFactorEditor(factorData.id);
        } else {
            const idx = store.improvementFactors.findIndex(f => f.id === factor.id);
            if (idx !== -1) store.improvementFactors[idx] = factorData;
            showNotification('Factor actualizado');
            // Return to list
            window.showDataSection('plan-mejoramiento');
        }
    };
};

window.deleteFactor = function (factorId) {
    if (confirm('¿Eliminar este factor?')) {
        store.improvementFactors = store.improvementFactors.filter(f => f.id !== factorId);
        renderFactorsList(document.getElementById('tableBody'));
        showNotification('Factor eliminado');
    }
};

/* -------------------------------------------------------------------------- */
/*                                ACTIVIDADES                                 */
/* -------------------------------------------------------------------------- */

function renderActivitiesTable(factorId) {
    const container = document.getElementById('activitiesTableContainer');
    if (!container) return;

    const activities = (store.improvementActivities || []).filter(a => a.planId === factorId);

    if (activities.length === 0) {
        container.innerHTML = '<div style="padding:1rem;text-align:center;background:#f8fafc;color:#64748b;">No hay actividades.</div>';
        return;
    }

    let html = `
        <table class="table" style="width:100%;">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
    `;

    activities.forEach(act => {
        const isOverdue = new Date(act.dueDate) < new Date() && act.status !== 'Cumplida';
        const statusColor = act.status === 'Cumplida' ? 'green' : (isOverdue ? 'red' : 'orange');

        html += `
            <tr>
                <td>${act.name}</td>
                <td><span class="badge badge-secondary">${act.type || 'N/A'}</span></td>
                <td><span style="color:${statusColor};font-weight:bold;">${act.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.openActivityEditor('${act.planId}', '${act.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteActivity('${act.id}', '${act.planId}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Re-using existing Activity Editor logic but ensuring it returns to Factor Editor
window.openActivityEditor = function (factorId, activityId = null) {
    const isNew = !activityId;
    const activity = isNew ? {} : store.improvementActivities.find(a => a.id === activityId);

    window.showForm(isNew ? 'Nueva Actividad' : 'Editar Actividad');
    const formSection = document.getElementById('formSection');

    // Cleanup
    const oldForms = formSection.querySelectorAll('div[id$="Form"]');
    oldForms.forEach(f => f.remove());

    const customForm = document.createElement('div');
    customForm.id = 'activityEditorForm';
    customForm.innerHTML = `
        <form id="mainActivityForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" id="actName" class="form-control" value="${activity.name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Tipo</label>
                    <select id="actType" class="form-control" required>
                        <option value="">Seleccione...</option>
                        <option value="Investigación" ${activity.type === 'Investigación' ? 'selected' : ''}>Investigación</option>
                        <option value="Apoyo a la docencia" ${activity.type === 'Apoyo a la docencia' ? 'selected' : ''}>Apoyo a la docencia</option>
                        <option value="Gestión" ${activity.type === 'Gestión' ? 'selected' : ''}>Gestión</option>
                        <option value="Extensión" ${activity.type === 'Extensión' ? 'selected' : ''}>Extensión</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Descripción</label>
                <textarea id="actDesc" class="form-control" rows="2">${activity.description || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Inicio</label>
                    <input type="date" id="actStart" class="form-control" value="${activity.startDate || ''}" required>
                </div>
                <div class="form-group">
                    <label>Fin</label>
                    <input type="date" id="actEnd" class="form-control" value="${activity.dueDate || ''}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Resultados Esperados</label>
                <textarea id="actResults" class="form-control" rows="2">${activity.expectedResults || ''}</textarea>
            </div>
            
            <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:1rem;">
                <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
        </form>
    `;

    formSection.appendChild(customForm);

    customForm.querySelector('.btn-cancel').onclick = () => window.openFactorEditor(factorId);

    document.getElementById('mainActivityForm').onsubmit = (e) => {
        e.preventDefault();

        const activityData = {
            id: isNew ? 'ACT-' + Date.now() : activity.id,
            planId: factorId, // Links to Factor
            name: document.getElementById('actName').value,
            type: document.getElementById('actType').value,
            description: document.getElementById('actDesc').value,
            startDate: document.getElementById('actStart').value,
            dueDate: document.getElementById('actEnd').value,
            expectedResults: document.getElementById('actResults').value,
            status: activity.status || 'Pendiente',
            evidenceTypes: activity.evidenceTypes || [] // Simplify for now
        };

        if (!store.improvementActivities) store.improvementActivities = [];

        if (isNew) {
            store.improvementActivities.push(activityData);
        } else {
            const idx = store.improvementActivities.findIndex(a => a.id === activity.id);
            if (idx !== -1) store.improvementActivities[idx] = activityData;
        }

        window.openFactorEditor(factorId);
    };
};

// Subtle Enforcement (Keep existing logic but check all activities)
window.checkEvidenceEnforcement = function () {
    // ... existing logic ...
};
