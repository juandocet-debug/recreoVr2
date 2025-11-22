import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';

let currentUtilityType = 'faculties';

export function loadUtilidades() {
    const btn = document.getElementById('btnNew');
    const btnText = document.getElementById('btnNewText');
    const dataSection = document.getElementById('dataSection');

    let existingTabs = document.getElementById('utilityTabs');
    if (existingTabs) existingTabs.remove();

    const utilityTabs = document.createElement('div');
    utilityTabs.id = 'utilityTabs';
    utilityTabs.className = 'utility-tabs';
    utilityTabs.innerHTML = `
        <button class="utility-tab-btn ${currentUtilityType === 'faculties' ? 'active' : ''}" data-type="faculties">Facultades</button>
        <button class="utility-tab-btn ${currentUtilityType === 'programs' ? 'active' : ''}" data-type="programs">Programas</button>
        <button class="utility-tab-btn ${currentUtilityType === 'subjects' ? 'active' : ''}" data-type="subjects">Asignaturas</button>
        <button class="utility-tab-btn ${currentUtilityType === 'activities' ? 'active' : ''}" data-type="activities">Actividades</button>
    `;
    dataSection.querySelector('.section-header').after(utilityTabs);

    utilityTabs.querySelectorAll('.utility-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentUtilityType = btn.dataset.type;
            loadUtilidades();
        });
    });

    if (currentUtilityType === 'faculties') loadFaculties(btn, btnText);
    else if (currentUtilityType === 'programs') loadPrograms(btn, btnText);
    else if (currentUtilityType === 'subjects') loadSubjects(btn, btnText);
    else loadActivities(btn, btnText);
}

/* -------------------------------------------------------------------------- */
/*                                 FACULTADES                                 */
/* -------------------------------------------------------------------------- */

function loadFaculties(btn, btnText) {
    if (btnText) btnText.textContent = 'Nueva Facultad';
    if (btn) btn.onclick = () => openFacultyModal('create');

    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['Nombre', 'Descripción', 'Acciones'];

    if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    if (tbody) tbody.innerHTML = '';

    const faculties = store.faculties || [];
    if (!faculties.length && tbody) {
        tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:1.5rem">No hay facultades registradas.</td></tr>`;
        return;
    }

    faculties.forEach(fac => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${fac.name}</td>
            <td>${fac.description || 'N/A'}</td>
            <td>
                <button class='btn btn-primary edit-btn'><i class='fas fa-edit'></i></button>
                <button class='btn btn-danger delete-btn'><i class='fas fa-trash'></i></button>
            </td>
        `;
        tr.querySelector('.edit-btn').addEventListener('click', () => openFacultyModal('edit', fac.id));
        tr.querySelector('.delete-btn').addEventListener('click', () => deleteFaculty(fac.id));
        tbody.appendChild(tr);
    });
}

function openFacultyModal(mode, id = null) {
    const planWorkForm = document.getElementById('planWorkForm');
    if (planWorkForm) planWorkForm.remove();

    window.showForm(mode === 'create' ? 'Nueva Facultad' : 'Editar Facultad');
    document.getElementById('dataForm').style.display = 'none';
    document.getElementById('profForm').style.display = 'none';

    let facultyForm = document.getElementById('facultyForm');
    if (!facultyForm) {
        createFacultyForm();
        facultyForm = document.getElementById('facultyForm');
    }

    facultyForm.style.display = 'block';

    if (mode === 'create') {
        facultyForm.reset();
        facultyForm.dataset.mode = 'create';
        facultyForm.dataset.id = '';
    } else {
        const faculty = store.faculties.find(f => f.id === id);
        if (faculty) {
            document.getElementById('facName').value = faculty.name;
            document.getElementById('facDescription').value = faculty.description || '';
            facultyForm.dataset.mode = 'edit';
            facultyForm.dataset.id = id;
        }
    }
}

function createFacultyForm() {
    const formSection = document.getElementById('formSection');
    const form = document.createElement('form');
    form.id = 'facultyForm';
    form.style.display = 'none';
    form.innerHTML = `
        <div class="form-group">
            <label for="facName">Nombre de la Facultad *</label>
            <input id="facName" class="form-control" required>
        </div>
        <div class="form-group">
            <label for="facDescription">Descripción</label>
            <textarea id="facDescription" class="form-control" rows="3"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:.5rem; margin-top:1.5rem; border-top:1px solid #e2e8f0; padding-top:1rem">
            <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
    `;
    form.onsubmit = e => { e.preventDefault(); saveFaculty(); };
    formSection.appendChild(form);
}

function saveFaculty() {
    const form = document.getElementById('facultyForm');
    const facultyData = {
        id: form.dataset.mode === 'create' ? 'FAC-' + Date.now() : form.dataset.id,
        name: document.getElementById('facName').value,
        description: document.getElementById('facDescription').value
    };

    if (form.dataset.mode === 'create') {
        store.faculties.push(facultyData);
        showNotification('Facultad creada');
    } else {
        const idx = store.faculties.findIndex(f => f.id === form.dataset.id);
        if (idx !== -1) store.faculties[idx] = facultyData;
        showNotification('Facultad actualizada');
    }

    window.showDataSection('utilidades');
}

function deleteFaculty(id) {
    if (confirm('¿Está seguro de eliminar esta facultad?')) {
        store.faculties = store.faculties.filter(f => f.id !== id);
        loadUtilidades();
        showNotification('Facultad eliminada');
    }
}

/* -------------------------------------------------------------------------- */
/*                                  PROGRAMAS                                 */
/* -------------------------------------------------------------------------- */

function loadPrograms(btn, btnText) {
    if (btnText) btnText.textContent = 'Nuevo Programa';
    if (btn) btn.onclick = () => openProgramModal('create');

    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['Código', 'Nombre', 'Facultad', 'Descripción', 'Acciones'];

    if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = '';

    const programs = store.programs || [];
    if (!programs.length) {
        tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:1.5rem">No hay programas registrados.</td></tr>`;
        return;
    }

    programs.forEach(prog => {
        const faculty = store.faculties.find(f => f.id === prog.facultyId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${prog.code}</td>
            <td>${prog.name}</td>
            <td>${faculty ? faculty.name : 'N/A'}</td>
            <td>${prog.description || 'N/A'}</td>
            <td>
                <button class='btn btn-primary edit-btn'><i class='fas fa-edit'></i></button>
                <button class='btn btn-danger delete-btn'><i class='fas fa-trash'></i></button>
            </td>
        `;
        tr.querySelector('.edit-btn').addEventListener('click', () => openProgramModal('edit', prog.id));
        tr.querySelector('.delete-btn').addEventListener('click', () => deleteProgram(prog.id));
        tbody.appendChild(tr);
    });
}

function openProgramModal(mode, id = null) {
    window.showForm(mode === 'create' ? 'Nuevo Programa' : 'Editar Programa');

    const planWorkForm = document.getElementById('planWorkForm');
    if (planWorkForm) planWorkForm.remove();

    document.getElementById('dataForm').style.display = 'none';
    document.getElementById('profForm').style.display = 'none';

    let programForm = document.getElementById('programForm');
    if (!programForm) {
        createProgramForm();
        programForm = document.getElementById('programForm');
    }

    programForm.style.display = 'block';
    populateFacultyDropdownInProgram();

    if (mode === 'create') {
        programForm.reset();
        programForm.dataset.mode = 'create';
        programForm.dataset.id = '';
    } else {
        const program = store.programs.find(p => p.id === id);
        if (program) {
            document.getElementById('progCode').value = program.code;
            document.getElementById('progName').value = program.name;
            document.getElementById('progFaculty').value = program.facultyId;
            document.getElementById('progDocuments').value = program.documents || '';
            document.getElementById('progDescription').value = program.description || '';
            programForm.dataset.mode = 'edit';
            programForm.dataset.id = id;
        }
    }
}

function createProgramForm() {
    const formSection = document.getElementById('formSection');
    const form = document.createElement('form');
    form.id = 'programForm';
    form.style.display = 'none';
    form.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label for="progCode">Código *</label>
                <input id="progCode" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="progName">Nombre del Programa *</label>
                <input id="progName" class="form-control" required>
            </div>
        </div>
        <div class="form-group">
            <label for="progFaculty">Facultad *</label>
            <select id="progFaculty" class="form-control" required></select>
        </div>
        <div class="form-group">
            <label for="progDocuments">Documentos</label>
            <textarea id="progDocuments" class="form-control" rows="2"></textarea>
        </div>
        <div class="form-group">
            <label for="progDescription">Descripción</label>
            <textarea id="progDescription" class="form-control" rows="3"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:.5rem; margin-top:1.5rem; border-top:1px solid #e2e8f0; padding-top:1rem">
            <button type="button" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
    `;
    form.onsubmit = e => { e.preventDefault(); saveProgram(); };
    formSection.appendChild(form);
}

function populateFacultyDropdownInProgram() {
    const sel = document.getElementById('progFaculty');
    sel.innerHTML = '<option value="">-- Seleccionar Facultad --</option>' +
        store.faculties.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
}

function saveProgram() {
    const form = document.getElementById('programForm');
    const programData = {
        id: form.dataset.mode === 'create' ? 'PROG-' + Date.now() : form.dataset.id,
        code: document.getElementById('progCode').value,
        name: document.getElementById('progName').value,
        facultyId: document.getElementById('progFaculty').value,
        documents: document.getElementById('progDocuments').value,
        description: document.getElementById('progDescription').value
    };

    if (form.dataset.mode === 'create') {
        store.programs.push(programData);
        showNotification('Programa creado');
    } else {
        const idx = store.programs.findIndex(p => p.id === form.dataset.id);
        if (idx !== -1) store.programs[idx] = programData;
        showNotification('Programa actualizado');
    }

    window.showDataSection('utilidades');
}

function deleteProgram(id) {
    if (confirm('¿Está seguro de eliminar este programa?')) {
        store.programs = store.programs.filter(p => p.id !== id);
        loadUtilidades();
        showNotification('Programa eliminado');
    }
}

/* -------------------------------------------------------------------------- */
/*                                 ASIGNATURAS                                */
/* -------------------------------------------------------------------------- */

function loadSubjects(btn, btnText) {
    if (btnText) btnText.textContent = 'Nueva Asignatura';
    if (btn) btn.onclick = () => openSubjectModal('create');

    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['Código', 'Nombre', 'Programa', 'Créditos', 'Horas/Sem', 'Acciones'];

    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = '';

    let searchBox = document.getElementById('subjectSearchBox');
    if (!searchBox) {
        searchBox = document.createElement('div');
        searchBox.id = 'subjectSearchBox';
        searchBox.style.marginBottom = '1rem';
        searchBox.innerHTML = `
            <input type="text" id="subjectSearch" class="form-control" placeholder="Buscar por código o nombre..." style="max-width: 400px;">
        `;
        document.getElementById('dataSection').querySelector('.section-header').after(searchBox);
        document.getElementById('subjectSearch').addEventListener('input', e => filterSubjects(e.target.value));
    }

    const subjects = store.subjects || [];
    if (!subjects.length) {
        tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:1.5rem">No hay asignaturas registradas.</td></tr>`;
        return;
    }

    renderSubjects(subjects, tbody);
}

function renderSubjects(subjects, tbody) {
    tbody.innerHTML = '';
    subjects.forEach(subj => {
        const program = store.programs.find(p => p.id === subj.programId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${subj.code}</td>
            <td>${subj.name}</td>
            <td>${program ? program.name : 'N/A'}</td>
            <td>${subj.credits}</td>
            <td>${subj.hoursPerWeek}</td>
            <td>
                <button class='btn btn-primary edit-btn'><i class='fas fa-edit'></i></button>
                <button class='btn btn-danger delete-btn'><i class='fas fa-trash'></i></button>
            </td>
        `;
        tr.querySelector('.edit-btn').addEventListener('click', () => openSubjectModal('edit', subj.id));
        tr.querySelector('.delete-btn').addEventListener('click', () => deleteSubject(subj.id));
        tbody.appendChild(tr);
    });
}

function filterSubjects(query) {
    const subjects = store.subjects || [];
    const filtered = subjects.filter(s =>
        s.code.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
    );
    const tbody = document.getElementById('tableBody');
    renderSubjects(filtered, tbody);
}

function openSubjectModal(mode, id = null) {
    window.showForm(mode === 'create' ? 'Nueva Asignatura' : 'Editar Asignatura');

    // Clean up plan form if exists
    const planWorkForm = document.getElementById('planWorkForm');
    if (planWorkForm) planWorkForm.remove();
    const planEditorForm = document.getElementById('planEditorForm');
    if (planEditorForm) planEditorForm.remove();

    document.getElementById('dataForm').style.display = 'none';
    document.getElementById('profForm').style.display = 'none';

    const searchBox = document.getElementById('subjectSearchBox');
    if (searchBox) searchBox.style.display = 'none';

    let subjectForm = document.getElementById('subjectForm');
    if (!subjectForm) {
        createSubjectForm();
        subjectForm = document.getElementById('subjectForm');
    }

    subjectForm.style.display = 'block';
    populateProgramDropdownInSubject();

    if (mode === 'create') {
        subjectForm.reset();
        subjectForm.dataset.mode = 'create';
        subjectForm.dataset.id = '';
    } else {
        const subject = store.subjects.find(s => s.id === id);
        if (subject) {
            document.getElementById('subjCode').value = subject.code;
            document.getElementById('subjName').value = subject.name;
            document.getElementById('subjProgram').value = subject.programId;
            document.getElementById('subjCredits').value = subject.credits;
            document.getElementById('subjHours').value = subject.hoursPerWeek;
            subjectForm.dataset.mode = 'edit';
            subjectForm.dataset.id = id;
        }
    }
}

function createSubjectForm() {
    const formSection = document.getElementById('formSection');
    const form = document.createElement('form');
    form.id = 'subjectForm';
    form.style.display = 'none';
    form.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label for="subjCode">Código *</label>
                <input id="subjCode" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="subjName">Nombre *</label>
                <input id="subjName" class="form-control" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="subjProgram">Programa *</label>
                <select id="subjProgram" class="form-control" required></select>
            </div>
            <div class="form-group">
                <label for="subjCredits">Créditos *</label>
                <input type="number" id="subjCredits" class="form-control" min="1" max="10" required>
            </div>
            <div class="form-group">
                <label for="subjHours">Horas/Semana *</label>
                <input type="number" id="subjHours" class="form-control" min="1" max="20" required>
            </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:.5rem; margin-top:1.5rem; border-top:1px solid #e2e8f0; padding-top:1rem">
            <button type="button" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
    `;
    form.onsubmit = e => { e.preventDefault(); saveSubject(); };
    formSection.appendChild(form);
}

function populateProgramDropdownInSubject() {
    const sel = document.getElementById('subjProgram');
    sel.innerHTML = '<option value="">-- Seleccionar Programa --</option>' +
        store.programs.map(p => {
            const faculty = store.faculties.find(f => f.id === p.facultyId);
            return `<option value="${p.id}">${p.name} (${faculty ? faculty.name : 'N/A'})</option>`;
        }).join('');
}

function saveSubject() {
    const form = document.getElementById('subjectForm');
    const subjectData = {
        id: form.dataset.mode === 'create' ? 'SUBJ-' + Date.now() : form.dataset.id,
        code: document.getElementById('subjCode').value,
        name: document.getElementById('subjName').value,
        programId: document.getElementById('subjProgram').value,
        credits: parseInt(document.getElementById('subjCredits').value),
        hoursPerWeek: parseInt(document.getElementById('subjHours').value)
    };

    if (!store.subjects) store.subjects = [];

    if (form.dataset.mode === 'create') {
        store.subjects.push(subjectData);
        showNotification('Asignatura creada');
    } else {
        const idx = store.subjects.findIndex(s => s.id === form.dataset.id);
        if (idx !== -1) store.subjects[idx] = subjectData;
        showNotification('Asignatura actualizada');
    }

    const searchBox = document.getElementById('subjectSearchBox');
    if (searchBox) searchBox.style.display = 'block';

    window.showDataSection('utilidades');
}

function deleteSubject(id) {
    if (confirm('¿Está seguro de eliminar esta asignatura?')) {
        store.subjects = store.subjects.filter(s => s.id !== id);
        loadUtilidades();
        showNotification('Asignatura eliminada');
    }
}

/* -------------------------------------------------------------------------- */
/*                                 ACTIVIDADES                                */
/* -------------------------------------------------------------------------- */

function loadActivities(btn, btnText) {
    if (btnText) btnText.textContent = 'Nueva Actividad';
    if (btn) btn.onclick = () => openActivityModal('create');

    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['Tipo', 'Nombre', 'Descripción', 'Acciones'];

    thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = '';

    const activities = store.planActivities || [];
    if (!activities.length) {
        tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:1.5rem">No hay actividades registradas.</td></tr>`;
        return;
    }

    activities.forEach(act => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="pill">${act.type}</span></td>
            <td>${act.name}</td>
            <td>${act.description || 'N/A'}</td>
            <td>
                <button class='btn btn-primary edit-btn'><i class='fas fa-edit'></i></button>
                <button class='btn btn-danger delete-btn'><i class='fas fa-trash'></i></button>
            </td>
        `;
        tr.querySelector('.edit-btn').addEventListener('click', () => openActivityModal('edit', act.id));
        tr.querySelector('.delete-btn').addEventListener('click', () => deleteActivity(act.id));
        tbody.appendChild(tr);
    });
}

function openActivityModal(mode, id = null) {
    window.showForm(mode === 'create' ? 'Nueva Actividad' : 'Editar Actividad');

    // Clean up plan form if exists
    const planWorkForm = document.getElementById('planWorkForm');
    if (planWorkForm) planWorkForm.remove();
    const planEditorForm = document.getElementById('planEditorForm');
    if (planEditorForm) planEditorForm.remove();

    document.getElementById('dataForm').style.display = 'none';
    document.getElementById('profForm').style.display = 'none';

    let activityForm = document.getElementById('activityForm');
    if (!activityForm) {
        createActivityForm();
        activityForm = document.getElementById('activityForm');
    }

    activityForm.style.display = 'block';

    if (mode === 'create') {
        activityForm.reset();
        activityForm.dataset.mode = 'create';
        activityForm.dataset.id = '';
    } else {
        const activity = store.planActivities.find(a => a.id === id);
        if (activity) {
            document.getElementById('actType').value = activity.type;
            document.getElementById('actName').value = activity.name;
            document.getElementById('actDescription').value = activity.description;
            activityForm.dataset.mode = 'edit';
            activityForm.dataset.id = id;
        }
    }
}

function createActivityForm() {
    const formSection = document.getElementById('formSection');
    const form = document.createElement('form');
    form.id = 'activityForm';
    form.style.display = 'none';
    form.innerHTML = `
        <div class="form-group">
            <label for="actType">Tipo de Actividad *</label>
            <select id="actType" class="form-control" required>
                <option value="">-- Seleccionar Tipo --</option>
                <option value="Apoyo Docencia">Apoyo Docencia</option>
                <option value="Trabajos de Grado">Trabajos de Grado</option>
                <option value="Investigación">Investigación</option>
                <option value="PDI">PDI</option>
                <option value="Gestión">Gestión</option>
            </select>
        </div>
        <div class="form-group">
            <label for="actName">Nombre de la Actividad *</label>
            <input id="actName" class="form-control" required>
        </div>
        <div class="form-group">
            <label for="actDescription">Descripción</label>
            <textarea id="actDescription" class="form-control" rows="3"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:.5rem; margin-top:1.5rem; border-top:1px solid #e2e8f0; padding-top:1rem">
            <button type="button" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
    `;
    form.onsubmit = e => { e.preventDefault(); saveActivity(); };
    formSection.appendChild(form);
}

function saveActivity() {
    const form = document.getElementById('activityForm');
    const activityData = {
        id: form.dataset.mode === 'create' ? 'ACT-' + Date.now() : form.dataset.id,
        type: document.getElementById('actType').value,
        name: document.getElementById('actName').value,
        description: document.getElementById('actDescription').value
    };

    if (!store.planActivities) store.planActivities = [];

    if (form.dataset.mode === 'create') {
        store.planActivities.push(activityData);
        showNotification('Actividad creada');
    } else {
        const idx = store.planActivities.findIndex(a => a.id === form.dataset.id);
        if (idx !== -1) store.planActivities[idx] = activityData;
        showNotification('Actividad actualizada');
    }

    window.showDataSection('utilidades');
}

function deleteActivity(id) {
    if (confirm('¿Está seguro de eliminar esta actividad?')) {
        store.planActivities = store.planActivities.filter(a => a.id !== id);
        loadUtilidades();
        showNotification('Actividad eliminada');
    }
}

