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
        <button class="utility-tab-btn ${currentUtilityType === 'documents' ? 'active' : ''}" data-type="documents">Gestión de Documentos</button>
        <button class="utility-tab-btn ${currentUtilityType === 'categories' ? 'active' : ''}" data-type="categories">Categorías</button>
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
    else if (currentUtilityType === 'documents') loadDocuments(btn, btnText);
    else if (currentUtilityType === 'categories') loadCategories(btn, btnText);
}

/* -------------------------------------------------------------------------- */
/*                                 FACULTADES                                 */
/* -------------------------------------------------------------------------- */

async function loadFaculties(btn, btnText) {
    if (btnText) btnText.textContent = 'Nueva Facultad';
    if (btn) btn.onclick = () => openFacultyModal('create');

    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['Nombre', 'Descripción', 'Acciones'];

    if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    if (tbody) tbody.innerHTML = '';

    try {
        const res = await window.authFetch('http://localhost:3001/api/faculties');
        if (!res.ok) throw new Error('Error');

        const json = await res.json();
        const faculties = json.data || [];

        if (!faculties.length && tbody) {
            tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:1.5rem">No hay facultades.</td></tr>`;
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
    } catch (error) {
        console.error('Error:', error);
        if (tbody) tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;color:red">Error cargando</td></tr>`;
    }
}

async function openFacultyModal(mode, id = null) {
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
        try {
            const res = await window.authFetch('http://localhost:3001/api/faculties');
            const json = await res.json();
            const faculty = json.data.find(f => f.id == id);

            if (faculty) {
                document.getElementById('facName').value = faculty.name;
                document.getElementById('facDescription').value = faculty.description || '';
                facultyForm.dataset.mode = 'edit';
                facultyForm.dataset.id = id;
            }
        } catch (error) {
            console.error('Error:', error);
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

async function saveFaculty() {
    const form = document.getElementById('facultyForm');
    const facultyData = {
        name: document.getElementById('facName').value,
        description: document.getElementById('facDescription').value
    };

    try {
        const url = form.dataset.mode === 'create'
            ? 'http://localhost:3001/api/faculties'
            : `http://localhost:3001/api/faculties/${form.dataset.id}`;

        const method = form.dataset.mode === 'create' ? 'POST' : 'PUT';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(facultyData)
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error guardando facultad', 'error');
            return;
        }

        currentUtilityType = 'faculties';

        await window.showCustomAlert(
            'Éxito',
            form.dataset.mode === 'create' ? 'Facultad creada exitosamente' : 'Facultad actualizada exitosamente',
            'success'
        );

        window.showDataSection('utilidades');
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error guardando facultad', 'error');
    }
}

async function deleteFaculty(id) {
    try {
        const resGet = await window.authFetch('http://localhost:3001/api/faculties');
        const jsonGet = await resGet.json();
        const faculty = jsonGet.data.find(f => f.id == id);

        const confirmed = await window.showCustomAlert(
            '¿Eliminar facultad?',
            `¿Está seguro de eliminar "${faculty.name}"?\n\nLos grupos conservarán el nombre.`,
            'warning',
            true
        );

        if (!confirmed) return;

        const res = await fetch(`http://localhost:3001/api/faculties/${id}`, {
            method: 'DELETE'
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error eliminando facultad', 'error');
            return;
        }

        await window.showCustomAlert('Éxito', 'Facultad eliminada exitosamente', 'success');

        currentUtilityType = 'faculties';
        loadUtilidades();
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error eliminando facultad', 'error');
    }
}

/* -------------------------------------------------------------------------- */
/*                                  PROGRAMAS                                 */
/* -------------------------------------------------------------------------- */

async function loadPrograms(btn, btnText) {
    if (btnText) btnText.textContent = 'Nuevo Programa';
    if (btn) btn.onclick = () => openProgramModal('create');

    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['Código', 'Nombre', 'Facultad', 'Descripción', 'Acciones'];

    if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    tbody.innerHTML = '';

    try {
        const res = await window.authFetch('http://localhost:3001/api/programs');
        if (!res.ok) throw new Error('Error');

        const json = await res.json();
        const programs = json.data || [];

        if (!programs.length) {
            tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:1.5rem">No hay programas.</td></tr>`;
            return;
        }

        programs.forEach(prog => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${prog.code}</td>
                <td>${prog.name}</td>
                <td>${prog.faculty_name || 'N/A'}</td>
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
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;color:red">Error cargando</td></tr>`;
    }
}

async function openProgramModal(mode, id = null) {
    window.showForm(mode === 'create' ? 'Nuevo Programa' : 'Editar Programa');

    document.getElementById('dataForm').style.display = 'none';
    document.getElementById('profForm').style.display = 'none';

    let programForm = document.getElementById('programForm');
    if (!programForm) {
        createProgramForm();
        programForm = document.getElementById('programForm');
    }

    programForm.style.display = 'block';
    await populateFacultyDropdownInProgram();

    if (mode === 'create') {
        programForm.reset();
        programForm.dataset.mode = 'create';
        programForm.dataset.id = '';
    } else {
        try {
            const res = await window.authFetch('http://localhost:3001/api/programs');
            const json = await res.json();
            const program = json.data.find(p => p.id == id);

            if (program) {
                document.getElementById('progCode').value = program.code;
                document.getElementById('progName').value = program.name;
                document.getElementById('progFaculty').value = program.faculty_id;
                document.getElementById('progDescription').value = program.description || '';
                programForm.dataset.mode = 'edit';
                programForm.dataset.id = id;
            }
        } catch (error) {
            console.error('Error:', error);
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

async function populateFacultyDropdownInProgram() {
    const sel = document.getElementById('progFaculty');
    try {
        const res = await window.authFetch('http://localhost:3001/api/faculties');
        const json = await res.json();
        const faculties = json.data || [];
        sel.innerHTML = '<option value="">-- Seleccionar Facultad --</option>' +
            faculties.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    } catch (error) {
        console.error('Error:', error);
        sel.innerHTML = '<option value="">Error cargando facultades</option>';
    }
}

async function saveProgram() {
    const form = document.getElementById('programForm');
    const programData = {
        code: document.getElementById('progCode').value,
        name: document.getElementById('progName').value,
        faculty_id: document.getElementById('progFaculty').value,
        description: document.getElementById('progDescription').value
    };

    try {
        const url = form.dataset.mode === 'create'
            ? 'http://localhost:3001/api/programs'
            : `http://localhost:3001/api/programs/${form.dataset.id}`;

        const method = form.dataset.mode === 'create' ? 'POST' : 'PUT';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(programData)
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error guardando programa', 'error');
            return;
        }

        currentUtilityType = 'programs';

        await window.showCustomAlert(
            'Éxito',
            form.dataset.mode === 'create' ? 'Programa creado exitosamente' : 'Programa actualizado exitosamente',
            'success'
        );

        window.showDataSection('utilidades');
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error guardando programa', 'error');
    }
}

async function deleteProgram(id) {
    try {
        const resGet = await window.authFetch('http://localhost:3001/api/programs');
        const jsonGet = await resGet.json();
        const program = jsonGet.data.find(p => p.id == id);

        const confirmed = await window.showCustomAlert(
            '¿Eliminar programa?',
            `¿Está seguro de eliminar "${program.name}"?\n\nLos grupos conservarán el nombre.`,
            'warning',
            true
        );

        if (!confirmed) return;

        const res = await fetch(`http://localhost:3001/api/programs/${id}`, {
            method: 'DELETE'
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error eliminando programa', 'error');
            return;
        }

        await window.showCustomAlert('Éxito', 'Programa eliminado exitosamente', 'success');

        currentUtilityType = 'programs';
        loadUtilidades();
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error eliminando programa', 'error');
    }
}

/* -------------------------------------------------------------------------- */
/*                          GESTIÓN DE DOCUMENTOS                             */
/* -------------------------------------------------------------------------- */

function loadDocuments(btn, btnText) {
    if (btnText) btnText.textContent = 'Nuevo Tipo de Documento';
    if (btn) btn.onclick = () => openDocumentTypeModal('create');

    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['Nombre', 'Descripción', 'Acciones'];

    if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    if (tbody) tbody.innerHTML = '';

    const documentTypes = store.documentTypes || [];
    if (!documentTypes.length && tbody) {
        tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:1.5rem">No hay tipos de documentos registrados.</td></tr>`;
        return;
    }

    documentTypes.forEach(docType => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${docType.name}</td>
            <td>${docType.description || 'N/A'}</td>
            <td>
                <button class='btn btn-primary edit-btn'><i class='fas fa-edit'></i></button>
                <button class='btn btn-danger delete-btn'><i class='fas fa-trash'></i></button>
            </td>
        `;
        tr.querySelector('.edit-btn').addEventListener('click', () => openDocumentTypeModal('edit', docType.id));
        tr.querySelector('.delete-btn').addEventListener('click', () => deleteDocumentType(docType.id));
        tbody.appendChild(tr);
    });
}

function openDocumentTypeModal(mode, id = null) {
    window.showForm(mode === 'create' ? 'Nuevo Tipo de Documento' : 'Editar Tipo de Documento');
    document.getElementById('dataForm').style.display = 'none';
    document.getElementById('profForm').style.display = 'none';

    let documentTypeForm = document.getElementById('documentTypeForm');
    if (!documentTypeForm) {
        createDocumentTypeForm();
        documentTypeForm = document.getElementById('documentTypeForm');
    }

    documentTypeForm.style.display = 'block';

    if (mode === 'create') {
        documentTypeForm.reset();
        documentTypeForm.dataset.mode = 'create';
        documentTypeForm.dataset.id = '';
    } else {
        const docType = store.documentTypes.find(d => d.id === id);
        if (docType) {
            document.getElementById('docTypeName').value = docType.name;
            document.getElementById('docTypeDescription').value = docType.description || '';
            documentTypeForm.dataset.mode = 'edit';
            documentTypeForm.dataset.id = id;
        }
    }
}

function createDocumentTypeForm() {
    const formSection = document.getElementById('formSection');
    const form = document.createElement('form');
    form.id = 'documentTypeForm';
    form.style.display = 'none';
    form.innerHTML = `
        <div class="form-group">
            <label for="docTypeName">Nombre del Tipo de Documento *</label>
            <input id="docTypeName" class="form-control" required placeholder="Ej: Acta, Informe, Memorando">
        </div>
        <div class="form-group">
            <label for="docTypeDescription">Descripción</label>
            <textarea id="docTypeDescription" class="form-control" rows="3" placeholder="Descripción del tipo de documento"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:.5rem; margin-top:1.5rem; border-top:1px solid #e2e8f0; padding-top:1rem">
            <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
    `;
    form.onsubmit = e => { e.preventDefault(); saveDocumentType(); };
    formSection.appendChild(form);
}

function saveDocumentType() {
    const form = document.getElementById('documentTypeForm');
    const documentTypeData = {
        id: form.dataset.mode === 'create' ? 'DOCTYPE-' + Date.now() : form.dataset.id,
        name: document.getElementById('docTypeName').value,
        description: document.getElementById('docTypeDescription').value
    };

    if (!store.documentTypes) store.documentTypes = [];

    if (form.dataset.mode === 'create') {
        store.documentTypes.push(documentTypeData);
        showNotification('Tipo de documento creado');
    } else {
        const idx = store.documentTypes.findIndex(d => d.id === form.dataset.id);
        if (idx !== -1) store.documentTypes[idx] = documentTypeData;
        showNotification('Tipo de documento actualizado');
    }

    window.showDataSection('utilidades');
}


function deleteDocumentType(id) {
    if (confirm('¿Está seguro de eliminar este tipo de documento?')) {
        store.documentTypes = store.documentTypes.filter(d => d.id !== id);
        loadUtilidades();
        showNotification('Tipo de documento eliminado');
    }
}

/* -------------------------------------------------------------------------- */
/*                        CATEGORÍAS DE DOCUMENTOS                            */
/* -------------------------------------------------------------------------- */

async function loadCategories(btn, btnText) {
    if (btnText) btnText.textContent = 'Nueva Categoría';
    if (btn) btn.onclick = () => openCategoryModal('create');

    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    const headers = ['Nombre', 'Descripción', 'Acciones'];

    if (thead) thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    if (tbody) tbody.innerHTML = '';

    try {
        const res = await window.authFetch('http://localhost:3001/api/document-categories');
        if (!res.ok) throw new Error('Error cargando categorías');

        const json = await res.json();
        const categories = json.data || [];

        if (!categories.length && tbody) {
            tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:1.5rem">No hay categorías registradas.</td></tr>`;
            return;
        }

        categories.forEach(cat => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cat.name}</td>
                <td>${cat.description || 'N/A'}</td>
                <td>
                    <button class='btn btn-primary edit-btn'><i class='fas fa-edit'></i></button>
                    <button class='btn btn-danger delete-btn'><i class='fas fa-trash'></i></button>
                </td>
            `;
            tr.querySelector('.edit-btn').addEventListener('click', () => openCategoryModal('edit', cat.id));
            tr.querySelector('.delete-btn').addEventListener('click', () => deleteCategory(cat.id));
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:1.5rem;color:red">Error cargando categorías</td></tr>`;
        }
    }
}

async function openCategoryModal(mode, id = null) {
    window.showForm(mode === 'create' ? 'Nueva Categoría' : 'Editar Categoría');
    document.getElementById('dataForm').style.display = 'none';
    document.getElementById('profForm').style.display = 'none';

    let categoryForm = document.getElementById('categoryForm');
    if (!categoryForm) {
        createCategoryForm();
        categoryForm = document.getElementById('categoryForm');
    }

    categoryForm.style.display = 'block';

    if (mode === 'create') {
        categoryForm.reset();
        categoryForm.dataset.mode = 'create';
        categoryForm.dataset.id = '';
    } else {
        try {
            const res = await window.authFetch('http://localhost:3001/api/document-categories');
            const json = await res.json();
            const category = json.data.find(c => c.id == id);

            if (category) {
                document.getElementById('catName').value = category.name;
                document.getElementById('catDescription').value = category.description || '';
                categoryForm.dataset.mode = 'edit';
                categoryForm.dataset.id = id;
            }
        } catch (error) {
            console.error('Error cargando categoría:', error);
            showNotification('Error cargando categoría', 'error');
        }
    }
}

function createCategoryForm() {
    const formSection = document.getElementById('formSection');
    const form = document.createElement('form');
    form.id = 'categoryForm';
    form.style.display = 'none';
    form.innerHTML = `
        <div class="form-group">
            <label for="catName">Nombre de la Categoría *</label>
            <input id="catName" class="form-control" required placeholder="Ej: Comité Curricular, Consejo de Facultad">
        </div>
        <div class="form-group">
            <label for="catDescription">Descripción</label>
            <textarea id="catDescription" class="form-control" rows="3" placeholder="Descripción de la categoría"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:.5rem; margin-top:1.5rem; border-top:1px solid #e2e8f0; padding-top:1rem">
            <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
    `;
    form.onsubmit = e => { e.preventDefault(); saveCategory(); };
    formSection.appendChild(form);
}

async function saveCategory() {
    const form = document.getElementById('categoryForm');
    const categoryData = {
        name: document.getElementById('catName').value,
        description: document.getElementById('catDescription').value
    };

    try {
        const url = form.dataset.mode === 'create'
            ? 'http://localhost:3001/api/document-categories'
            : `http://localhost:3001/api/document-categories/${form.dataset.id}`;

        const method = form.dataset.mode === 'create' ? 'POST' : 'PUT';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error guardando categoría', 'error');
            return;
        }

        currentUtilityType = 'categories';

        await window.showCustomAlert(
            'Éxito',
            form.dataset.mode === 'create' ? 'Categoría creada exitosamente' : 'Categoría actualizada exitosamente',
            'success'
        );

        window.showDataSection('utilidades');
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error guardando categoría', 'error');
    }
}

async function deleteCategory(id) {
    try {
        // Primero obtener info de la categoría para mostrar mensaje informativo
        const resGet = await window.authFetch('http://localhost:3001/api/document-categories');
        const jsonGet = await resGet.json();
        const category = jsonGet.data.find(c => c.id == id);

        const confirmed = await window.showCustomAlert(
            '¿Eliminar categoría?',
            `¿Está seguro de eliminar la categoría "${category.name}"?\n\nNota: Las actas que usen esta categoría la conservarán en su registro.`,
            'warning',
            true
        );

        if (!confirmed) return;

        const res = await fetch(`http://localhost:3001/api/document-categories/${id}`, {
            method: 'DELETE'
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error eliminando categoría', 'error');
            return;
        }

        currentUtilityType = 'categories';

        const message = json.actasAffected > 0
            ? `Categoría eliminada.\n${json.actasAffected} acta(s) conservan el nombre.`
            : 'Categoría eliminada exitosamente';

        await window.showCustomAlert('Éxito', message, 'success');

        loadUtilidades();
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error eliminando categoría', 'error');
    }
}








