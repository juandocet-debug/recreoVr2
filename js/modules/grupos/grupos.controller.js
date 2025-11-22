import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';
import { TableManager } from '../../core/table-manager.js';

console.log('🚀 Módulo Grupos cargado');

let groupsTable;

export function loadGrupos() {
    const btn = document.getElementById('btnNew');
    const btnText = document.getElementById('btnNewText');

    // Clear manual headers
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    if (thead) thead.innerHTML = '';
    if (tbody) tbody.innerHTML = '';

    if (btnText) btnText.textContent = 'Nuevo Grupo';
    if (btn) btn.onclick = () => openGroupModal();

    if (groupsTable) {
        groupsTable.updateData(store.groups);
    } else {
        groupsTable = new TableManager({
            containerId: 'dataSection',
            data: store.groups,
            columns: [
                { header: 'ID', field: 'id' },
                { header: 'Nombre', field: 'name' },
                {
                    header: 'Asesor',
                    field: 'advisorId',
                    render: (item) => {
                        const prof = store.professors.find(p => p.id == item.advisorId);
                        return prof ? prof.name : 'Sin asignar';
                    }
                },
                {
                    header: 'Estudiantes', field: 'id', render: (item) => {
                        const count = (store.students || []).filter(s => s.groupId === item.id).length;
                        return `<span class="badge badge-info" style="background:#17a2b8;color:white;padding:2px 6px;border-radius:4px;">${count}</span>`;
                    }
                },
                { header: 'Fecha', field: 'date' },
                {
                    header: 'Gestión',
                    field: 'id',
                    render: (item) => `
                        <button class="btn btn-sm btn-warning" onclick="window.inviteStudents('${item.id}')" title="Invitar Estudiantes" style="margin-right:5px;"><i class="fas fa-envelope"></i></button>
                        <button class="btn btn-sm btn-success" onclick="window.openStudentRegistration('${item.id}')" title="Registrar Estudiante"><i class="fas fa-user-plus"></i></button>
                    `
                }
            ],
            actions: { edit: true, delete: true },
            onEdit: (id) => openGroupModal(id),
            onDelete: (id) => deleteGroup(id)
        });
    }
}

function openGroupModal(groupId = null) {
    window.showForm(groupId ? 'Editar Grupo' : 'Nuevo Grupo');

    // Remove existing custom form
    let groupForm = document.getElementById('groupForm');
    if (groupForm) groupForm.remove();

    createGroupForm();

    if (groupId) {
        const group = store.groups.find(g => g.id === groupId);
        if (group) {
            document.getElementById('groupId').value = group.id;
            document.getElementById('groupName').value = group.name;
            document.getElementById('groupDescription').value = group.description || '';

            const prof = store.professors.find(p => p.id == group.advisorId);
            if (prof) {
                window.selectGroupProfessor(prof.id);
            }
        }
    } else {
        document.getElementById('groupId').value = 'G-' + Date.now();
    }
}

function createGroupForm() {
    const formSection = document.getElementById('formSection');
    const form = document.createElement('form');
    form.id = 'groupForm';

    form.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>ID Grupo</label>
                <input id="groupId" class="form-control" readonly>
            </div>
            <div class="form-group">
                <label>Nombre del Grupo</label>
                <input id="groupName" class="form-control" placeholder="Ej: Cohorte 2025-1" required>
            </div>
        </div>
        
        <div class="form-group" style="position:relative;">
            <label>Profesor Asesor *</label>
            <input type="text" id="groupProfessorSearch" class="form-control" placeholder="Buscar profesor..." autocomplete="off">
            <input type="hidden" id="groupProfessorId" required>
            <div id="groupProfessorResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #ddd;border-radius:4px;max-height:200px;overflow-y:auto;z-index:1000;box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
            
            <div id="selectedProfessorInfo" style="display:none;margin-top:0.5rem;padding:0.5rem;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;">
                <div style="font-weight:bold" id="infoName"></div>
                <div style="font-size:0.875rem;color:#666" id="infoValidation"></div>
                <button type="button" class="btn btn-sm btn-link" style="color:#ef4444;padding:0;" onclick="window.clearGroupProfessor()">Cambiar</button>
            </div>
        </div>

        <div class="form-group">
            <label>Descripción</label>
            <textarea id="groupDescription" class="form-control" rows="3"></textarea>
        </div>

        <div class="form-actions" style="margin-top:1.5rem;border-top:1px solid #eee;padding-top:1rem;">
            <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar Grupo</button>
        </div>
    `;

    formSection.appendChild(form);

    setupProfessorSearch();

    form.onsubmit = (e) => {
        e.preventDefault();
        saveGroup();
    };

    form.querySelector('.btn-cancel').onclick = () => {
        form.remove();
        window.showDataSection('admin-grupos');
    };
}

function setupProfessorSearch() {
    const input = document.getElementById('groupProfessorSearch');
    const results = document.getElementById('groupProfessorResults');

    if (!input || !results) return;

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term.length < 2) {
            results.style.display = 'none';
            return;
        }

        const matches = store.professors.filter(p =>
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.identification && p.identification.includes(term))
        );

        if (matches.length > 0) {
            results.innerHTML = matches.map(p => `
                <div class="search-item" style="padding:0.5rem;cursor:pointer;border-bottom:1px solid #eee;" 
                     onclick="window.selectGroupProfessor('${p.id}')">
                    <div style="font-weight:bold">${p.name}</div>
                    <div style="font-size:0.75rem;">${p.email}</div>
                </div>
            `).join('');
            results.style.display = 'block';
        } else {
            results.innerHTML = '<div style="padding:0.5rem;">No encontrado</div>';
            results.style.display = 'block';
        }
    });
}

window.selectGroupProfessor = function (id) {
    const prof = store.professors.find(p => p.id == id);
    if (!prof) return;

    // VALIDATION
    const validation = validateProfessor(id);

    document.getElementById('groupProfessorId').value = prof.id;
    document.getElementById('groupProfessorSearch').style.display = 'none';
    document.getElementById('groupProfessorResults').style.display = 'none';

    document.getElementById('selectedProfessorInfo').style.display = 'block';
    document.getElementById('infoName').textContent = prof.name;

    const infoVal = document.getElementById('infoValidation');
    if (validation.valid) {
        infoVal.innerHTML = '<span style="color:green"><i class="fas fa-check-circle"></i> Habilitado para Asesoría (Tiene Apoyo a Docencia)</span>';
    } else {
        infoVal.innerHTML = `<span style="color:red"><i class="fas fa-times-circle"></i> ${validation.message}</span>`;
    }
};

window.clearGroupProfessor = function () {
    document.getElementById('groupProfessorId').value = '';
    document.getElementById('groupProfessorSearch').value = '';
    document.getElementById('groupProfessorSearch').style.display = 'block';
    document.getElementById('selectedProfessorInfo').style.display = 'none';
};

function validateProfessor(profId) {
    const plan = store.workPlans.find(p => p.professorId == profId);
    if (!plan) return { valid: false, message: 'No tiene Plan de Trabajo registrado.' };

    if (!plan.blocks.apoyoDocencia || plan.blocks.apoyoDocencia.length === 0) {
        return { valid: false, message: 'No tiene actividades de Apoyo a la Docencia.' };
    }

    return { valid: true };
}

function saveGroup() {
    const profId = document.getElementById('groupProfessorId').value;
    if (!profId) {
        showNotification('Debe seleccionar un profesor', 'error');
        return;
    }

    const validation = validateProfessor(profId);
    if (!validation.valid) {
        showNotification(validation.message, 'error');
        return;
    }

    const id = document.getElementById('groupId').value;
    const groupData = {
        id: id,
        name: document.getElementById('groupName').value,
        advisorId: profId,
        description: document.getElementById('groupDescription').value,
        date: new Date().toISOString().split('T')[0]
    };

    const idx = store.groups.findIndex(g => g.id === id);
    if (idx !== -1) {
        store.groups[idx] = groupData;
        showNotification('Grupo actualizado');
    } else {
        store.groups.push(groupData);
        showNotification('Grupo creado');
    }

    document.getElementById('groupForm').remove();
    window.showDataSection('admin-grupos');
}

function deleteGroup(id) {
    if (confirm('¿Eliminar grupo?')) {
        store.groups = store.groups.filter(g => g.id !== id);
        loadGrupos();
        showNotification('Grupo eliminado');
    }
}

// --- Invite & Register ---

window.inviteStudents = function (groupId) {
    const group = store.groups.find(g => g.id === groupId);
    const prof = store.professors.find(p => p.id == group.advisorId);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px">
            <div class="modal-header">
                <h3>Invitar Estudiantes</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Copie el siguiente correo para invitar a los estudiantes:</p>
                <div style="background:#f8f9fa;padding:1rem;border:1px solid #ddd;border-radius:4px;white-space:pre-wrap;font-family:monospace;font-size:0.9rem;">
Asunto: Invitación al Grupo ${group.name}

Hola,

Has sido invitado a unirte al grupo de investigación/trabajo "${group.name}".
Tu asesor será: ${prof ? prof.name : 'N/A'}.

Por favor regístrate en el sistema utilizando el siguiente código de grupo:
CÓDIGO: ${group.id}

Enlace de registro: http://rekreo-upn.edu/registro?grupo=${group.id}

Saludos,
Coordinación Académica
                </div>
                <button class="btn btn-primary" style="margin-top:1rem;width:100%" onclick="this.parentElement.parentElement.parentElement.remove();showNotification('Correo listo para copiar')">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
};

window.openStudentRegistration = function (groupId) {
    const group = store.groups.find(g => g.id === groupId);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px">
            <div class="modal-header">
                <h3>Registrar Estudiante en ${group.name}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="studentRegForm">
                    <div class="form-group">
                        <label>Nombre Completo</label>
                        <input id="stdName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Código Estudiantil</label>
                        <input id="stdCode" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="stdEmail" class="form-control" required>
                    </div>
                    <button type="submit" class="btn btn-success" style="width:100%;margin-top:1rem;">Registrar</button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.modal-close').onclick = () => modal.remove();

    modal.querySelector('form').onsubmit = (e) => {
        e.preventDefault();
        const student = {
            id: Date.now(),
            name: document.getElementById('stdName').value,
            code: document.getElementById('stdCode').value,
            email: document.getElementById('stdEmail').value,
            groupId: groupId,
            joinedDate: new Date().toISOString().split('T')[0]
        };

        if (!store.students) store.students = [];
        store.students.push(student);

        showNotification('Estudiante registrado exitosamente');
        modal.remove();
        loadGrupos(); // Refresh table count
    };
};
