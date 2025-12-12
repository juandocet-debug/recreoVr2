import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';
import { TableManager } from '../../core/table-manager.js';

console.log('🚀 Módulo Grupos cargado');

let groupsTable;
let studentsTable;
let currentGroupId = null;

export async function loadGrupos() {
    const btn = document.getElementById('btnNew');
    const btnText = document.getElementById('btnNewText');
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');

    if (thead) thead.innerHTML = '';
    if (tbody) tbody.innerHTML = '';

    // Verificar rol del usuario
    const userRole = store.currentUser?.role;
    const userId = store.currentUser?.id;
    const isProfesor = userRole === 'profesor';
    const isAdmin = userRole === 'administrador' || userRole === 'coordinador';

    // Profesores no pueden crear grupos nuevos
    if (isProfesor) {
        if (btn) btn.style.display = 'none';
        document.getElementById('headerTitle').textContent = 'Mis Grupos Asignados';
    } else {
        if (btn) btn.style.display = '';
        if (btnText) btnText.textContent = 'Nuevo Grupo';
        if (btn) btn.onclick = () => openGroupModal();
    }

    try {
        const res = await window.authFetch('http://localhost:3001/api/groups');
        if (!res.ok) throw new Error('Error cargando grupos');

        const json = await res.json();
        let groups = json.data || [];

        // Debug: ver estructura de grupos y usuario
        console.log('Grupos recibidos:', groups);
        console.log('Usuario actual - ID:', userId, 'Rol:', userRole);

        // Si es profesor, filtrar grupos donde es asesor actual O fue asesor histórico
        if (isProfesor) {
            groups = groups.filter(g => {
                // Es asesor actual
                const profId = g.professorId || g.professor_id || g.advisor_id;
                if (profId == userId) {
                    g._isCurrentAdvisor = true; // Marcar para dar permisos completos
                    return true;
                }

                // Fue asesor histórico (revisar campo advisors)
                if (g.advisors) {
                    try {
                        const advisorsList = typeof g.advisors === 'string' ? JSON.parse(g.advisors) : g.advisors;
                        const wasAdvisor = Array.isArray(advisorsList) && advisorsList.some(a => a.id == userId);
                        if (wasAdvisor) {
                            g._isCurrentAdvisor = false; // Solo lectura
                            return true;
                        }
                    } catch (e) { }
                }

                return false;
            });
        }

        if (groupsTable) {
            groupsTable.updateData(groups);
        } else {
            groupsTable = new TableManager({
                containerId: 'dataSection',
                data: groups,
                columns: [
                    { header: 'Nombre', field: 'name' },
                    {
                        header: 'Asesor',
                        field: 'advisor_name',
                        render: (item) => item.advisor_name || 'Sin asignar'
                    },
                    {
                        header: 'Estudiantes',
                        field: 'id',
                        render: (item) => {
                            const count = (store.students || []).filter(s => s.groupId === item.id).length;
                            return `<span class="badge badge-info" style="background:#17a2b8;color:white;padding:2px 6px;border-radius:4px;">${count}</span>`;
                        }
                    },
                    { header: 'Fecha', field: 'created_at', render: (item) => item.created_at ? item.created_at.split('T')[0] : 'N/A' },
                    {
                        header: 'Gestión',
                        field: 'id',
                        render: (item) => {
                            // Profesores: diferentes botones según si es asesor actual o histórico
                            if (isProfesor) {
                                if (item._isCurrentAdvisor) {
                                    // Asesor actual: puede gestionar
                                    return `
                                        <button class="btn btn-sm btn-secondary" onclick="window.showGroupControl('${item.id}')" title="Control de Grupo" style="margin-right:5px;"><i class="fas fa-clipboard-list"></i></button>
                                        <button class="btn btn-sm btn-info" onclick="window.viewGroupStudents('${item.id}')" title="Ver Estudiantes" style="margin-right:5px;"><i class="fas fa-eye"></i></button>
                                        <button class="btn btn-sm btn-success" onclick="window.openStudentForm('${item.id}')" title="Agregar Estudiante" style="margin-right:5px;"><i class="fas fa-user-plus"></i></button>
                                        <button class="btn btn-sm btn-primary" onclick="window.uploadGroupDocuments('${item.id}')" title="Subir Documentos"><i class="fas fa-file-upload"></i></button>
                                    `;
                                } else {
                                    // Asesor histórico: solo lectura
                                    return `
                                        <span class="badge" style="background:#fbbf24;color:#000;padding:4px 8px;border-radius:4px;margin-right:5px;">Histórico</span>
                                        <button class="btn btn-sm btn-secondary" onclick="window.showGroupControl('${item.id}')" title="Ver Control" style="margin-right:5px;"><i class="fas fa-clipboard-list"></i></button>
                                        <button class="btn btn-sm btn-info" onclick="window.viewGroupStudents('${item.id}', true)" title="Ver Estudiantes"><i class="fas fa-eye"></i></button>
                                    `;
                                }
                            }
                            // Admin/Coordinador: acceso completo
                            return `
                                <button class="btn btn-sm btn-secondary" onclick="window.showGroupControl('${item.id}')" title="Control de Grupo" style="margin-right:5px;"><i class="fas fa-clipboard-list"></i></button>
                                <button class="btn btn-sm btn-info" onclick="window.viewGroupStudents('${item.id}')" title="Ver Estudiantes" style="margin-right:5px;"><i class="fas fa-eye"></i></button>
                                <button class="btn btn-sm btn-warning" onclick="window.inviteStudents('${item.id}')" title="Invitar Estudiantes" style="margin-right:5px;"><i class="fas fa-envelope"></i></button>
                                <button class="btn btn-sm btn-success" onclick="window.openStudentForm('${item.id}')" title="Registrar Estudiante" style="margin-right:5px;"><i class="fas fa-user-plus"></i></button>
                                <button class="btn btn-sm btn-primary" onclick="window.uploadGroupDocuments('${item.id}')" title="Agregar Documentos"><i class="fas fa-file-upload"></i></button>
                            `;
                        }
                    }
                ],
                // Solo admin/coordinador pueden editar/eliminar grupos
                actions: isAdmin ? { edit: true, delete: true } : { edit: false, delete: false },
                onEdit: (id) => openGroupModal(id),
                onDelete: (id) => deleteGroup(id)
            });
        }

        // Mostrar mensaje si el profesor no tiene grupos
        if (isProfesor && groups.length === 0) {
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#666;font-style:italic;">No tienes grupos asignados como asesor</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error:', error);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:red">Error cargando grupos</td></tr>';
        }
    }
}

async function openGroupModal(groupId = null) {
    window.showForm(groupId ? 'Editar Grupo' : 'Nuevo Grupo');

    let groupForm = document.getElementById('groupForm');
    if (groupForm) groupForm.remove();

    // Inicializar asesores
    window.currentAdvisors = [];

    createGroupForm(groupId);

    if (groupId) {
        try {
            const res = await window.authFetch('http://localhost:3001/api/groups');
            const json = await res.json();
            const group = json.data.find(g => g.id === groupId);

            if (group) {
                // Esperar a que se carguen las facultades
                await loadFacultiesForGroup();

                // Cargar año y período
                if (group.year) document.getElementById('groupYear').value = group.year;
                if (group.period) document.getElementById('groupPeriod').value = group.period;

                // Cargar facultad por nombre
                if (group.faculty_name) {
                    const facultySel = document.getElementById('groupFaculty');
                    const facultyOption = Array.from(facultySel.options).find(opt => opt.text === group.faculty_name);
                    if (facultyOption) {
                        facultySel.value = facultyOption.value;
                        // Trigger change para cargar programas
                        facultySel.dispatchEvent(new Event('change'));

                        // Esperar un momento para que se carguen los programas
                        await new Promise(resolve => setTimeout(resolve, 300));

                        // Cargar programa por nombre
                        if (group.program_name) {
                            const programSel = document.getElementById('groupProgram');
                            const programOption = Array.from(programSel.options).find(opt => opt.text === group.program_name);
                            if (programOption) {
                                programSel.value = programOption.value;
                            }
                        }
                    }
                }

                document.getElementById('groupId').value = group.id;
                document.getElementById('groupName').value = group.name;
                document.getElementById('groupDescription').value = group.description || '';

                // Cargar profesor
                if (group.advisor_id && store.professors) {
                    const prof = store.professors.find(p => p.id == group.advisor_id);
                    if (prof) {
                        window.selectGroupProfessor(prof.id);
                    }
                }

                // Mostrar documentos existentes
                if (group.documents && typeof group.documents === 'string') {
                    try {
                        const docs = JSON.parse(group.documents);
                        const docsList = document.getElementById('existingDocuments');
                        if (docsList && docs.length > 0) {
                            let tableHTML = `
                                <h4 style="margin:1rem 0 0.75rem;font-size:1rem;color:#10b981;">
                                    <i class="fas fa-file-alt"></i> Control de Documentos del Grupo
                                </h4>
                                <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                                    <thead>
                                        <tr style="background:#10b981;color:white;">
                                            <th style="padding:0.75rem;text-align:left;font-weight:600;">Cargado por</th>
                                            <th style="padding:0.75rem;text-align:left;font-weight:600;">Documentos</th>
                                            <th style="padding:0.75rem;text-align:center;font-weight:600;width:200px;">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                            `;

                            docs.forEach((doc, idx) => {
                                tableHTML += `
                                    <tr style="border-bottom:1px solid #e5e7eb;">
                                        <td style="padding:0.75rem;vertical-align:top;">
                                            <div style="font-weight:500;color:#374151;">${doc.uploadedBy || 'Usuario'}</div>
                                            <div style="font-size:0.75rem;color:#6b7280;margin-top:0.25rem;">${new Date(doc.uploadedAt).toLocaleDateString()} ${new Date(doc.uploadedAt).toLocaleTimeString()}</div>
                                        </td>
                                        <td style="padding:0.75rem;vertical-align:top;">
                                            <div style="font-weight:600;color:#111827;"><i class="fas fa-file"></i> ${doc.name}</div>
                                            <div style="font-size:0.875rem;color:#6b7280;margin-top:0.25rem;">${doc.size}</div>
                                        </td>
                                        <td style="padding:0.75rem;text-align:center;vertical-align:middle;white-space:nowrap;">
                                            <button type="button" class="btn btn-sm btn-info" onclick="window.viewDocument('${groupId}', ${idx})" title="Ver" style="margin:0 2px;"><i class="fas fa-eye"></i></button>
                                            <button type="button" class="btn btn-sm btn-success" onclick="window.downloadDocument('${groupId}', ${idx})" title="Descargar" style="margin:0 2px;"><i class="fas fa-download"></i></button>
                                            <button type="button" class="btn btn-sm btn-warning" onclick="window.printDocument('${groupId}', ${idx})" title="Imprimir" style="margin:0 2px;"><i class="fas fa-print"></i></button>
                                            <button type="button" class="btn btn-sm btn-danger" onclick="window.removeGroupDocument('${groupId}', ${idx})" title="Eliminar" style="margin:0 2px;"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `;
                            });

                            tableHTML += `
                                    </tbody>
                                </table>
                            `;

                            docsList.innerHTML = tableHTML;
                        }
                    } catch (parseError) {
                        console.error('Error parsing documents:', parseError);
                    }
                }

                // Cargar asesores históricos
                if (group.advisors) {
                    loadExistingAdvisors(group.advisors);
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

function createGroupForm(groupId = null) {
    const formSection = document.getElementById('formSection');
    const form = document.createElement('form');
    form.id = 'groupForm';

    form.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Facultad *</label>
                <select id="groupFaculty" class="form-control" required>
                    <option value="">-- Seleccionar --</option>
                </select>
            </div>
            <div class="form-group">
                <label>Programa *</label>
                <select id="groupProgram" class="form-control" required>
                    <option value="">-- Primero seleccione facultad --</option>
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Año *</label>
                <input type="number" id="groupYear" class="form-control" value="${new Date().getFullYear()}" required>
            </div>
            <div class="form-group">
                <label>Período *</label>
                <select id="groupPeriod" class="form-control" required>
                    <option value="">-- Seleccionar --</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                </select>
            </div>
        </div>

        <div class="form-group" style="text-align:center;margin:1rem 0;">
            <button type="button" id="btnGenerateCode" class="btn btn-primary" style="font-size:1.1rem;padding:0.75rem 2rem;">
                <i class="fas fa-magic"></i> Generar Código
            </button>
        </div>

        <div class="form-group">
            <label>Código del Grupo</label>
            <input id="groupId" class="form-control" readonly style="font-weight:bold;font-size:1.2rem;text-align:center;background:#f0f9ff;">
        </div>

        <div class="form-group">
            <label>Nombre del Grupo *</label>
            <input id="groupName" class="form-control" placeholder="Ej: Cohorte 2025-1" required>
        </div>
        
        <div class="form-group" style="position:relative;">
            <label>Profesor Asesor *</label>
            <input type="text" id="groupProfessorSearch" class="form-control" placeholder="Buscar por nombre o cédula..." autocomplete="off">
            <input type="hidden" id="groupProfessorId" required>
            <div id="groupProfessorResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #ddd;border-radius:4px;max-height:300px;overflow-y:auto;z-index:1000;box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
            
            <div id="selectedProfessorInfo" style="display:none;margin-top:1rem;padding:1rem;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
                <div style="display:flex;align-items:center;gap:1rem;">
                    <img id="infoProfPhoto" src="" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #3b82f6;">
                    <div style="flex:1;">
                        <div style="font-weight:bold;font-size:1.1rem;margin-bottom:0.5rem;" id="infoProfName"></div>
                        <div style="color:#666;"><i class="fas fa-id-card"></i> <span id="infoProfId"></span></div>
                    </div>
                    <button type="button" class="btn btn-sm btn-success" onclick="window.addGroupAdvisor()" title="Agregar al Historial"><i class="fas fa-plus"></i> Agregar Asesor</button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="window.clearGroupProfessor()">Cambiar</button>
                </div>
            </div>
        </div>

        <div class="form-group" id="advisorsHistorySection" style="display:none;">
            <label>Historial de Asesores/Tutores</label>
            <div id="advisorsList" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:0.5rem;"></div>
        </div>

        <div class="form-group">
            <label>Descripción</label>
            <textarea id="groupDescription" class="form-control" rows="3"></textarea>
        </div>

        <div class="form-group">
            <label>Documentos del Grupo</label>
            <input type="file" id="groupNewFiles" multiple class="form-control" style="padding:0.4rem;">
            <small style="color:#666;">Puede adjuntar múltiples archivos</small>
            <div id="existingDocuments" style="margin-top:0.5rem;"></div>
        </div>

        <div class="form-actions" style="margin-top:1.5rem;border-top:1px solid #eee;padding-top:1rem;">
            <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar Grupo</button>
        </div>
    `;

    formSection.appendChild(form);

    loadFacultiesForGroup();
    setupProfessorSearch();
    setupFacultyProgramLink();
    setupGenerateCodeBtn();

    form.onsubmit = (e) => {
        e.preventDefault();
        saveGroup();
    };

    form.querySelector('.btn-cancel').onclick = () => {
        form.remove();
        window.showDataSection('admin-grupos');
    };
}

async function loadFacultiesForGroup() {
    try {
        const res = await window.authFetch('http://localhost:3001/api/faculties');
        const json = await res.json();
        const faculties = json.data || [];

        const sel = document.getElementById('groupFaculty');
        sel.innerHTML = '<option value="">-- Seleccionar --</option>' +
            faculties.map(f => `<option value="${f.id}" data-name="${f.name}">${f.name}</option>`).join('');
    } catch (error) {
        console.error('Error:', error);
    }
}

function setupFacultyProgramLink() {
    const facultySel = document.getElementById('groupFaculty');
    const programSel = document.getElementById('groupProgram');

    facultySel.addEventListener('change', async () => {
        const facultyId = facultySel.value;

        if (!facultyId) {
            programSel.innerHTML = '<option value="">-- Primero seleccione facultad --</option>';
            return;
        }

        try {
            const res = await window.authFetch('http://localhost:3001/api/programs');
            const json = await res.json();
            const programs = json.data.filter(p => p.faculty_id == facultyId);

            programSel.innerHTML = '<option value="">-- Seleccionar --</option>' +
                programs.map(p => `<option value="${p.id}" data-code="${p.code}" data-name="${p.name}">${p.name}</option>`).join('');
        } catch (error) {
            console.error('Error:', error);
            programSel.innerHTML = '<option value="">Error cargando programas</option>';
        }
    });
}

function setupGenerateCodeBtn() {
    document.getElementById('btnGenerateCode').onclick = () => {
        const faculty = document.getElementById('groupFaculty');
        const program = document.getElementById('groupProgram');
        const year = document.getElementById('groupYear').value;
        const period = document.getElementById('groupPeriod').value;

        if (!faculty.value || !program.value || !year || !period) {
            window.showCustomAlert('Error', 'Complete Facultad, Programa, Año y Período primero', 'error');
            return;
        }

        const facultyOption = faculty.options[faculty.selectedIndex];
        const programOption = program.options[program.selectedIndex];

        const facCode = facultyOption.text.substring(0, 3).toUpperCase();
        const progCode = programOption.dataset.code || programOption.text.substring(0, 3).toUpperCase();

        const code = `${facCode}-${progCode}-${year}-${period}`;
        document.getElementById('groupId').value = code;
        document.getElementById('groupName').value = code;
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

    document.getElementById('groupProfessorId').value = prof.id;
    document.getElementById('groupProfessorSearch').style.display = 'none';
    document.getElementById('groupProfessorResults').style.display = 'none';

    document.getElementById('selectedProfessorInfo').style.display = 'block';
    document.getElementById('infoProfName').textContent = prof.name;
    document.getElementById('infoProfId').textContent = prof.identification || 'No registrado';

    const photoElem = document.getElementById('infoProfPhoto');
    if (prof.photo) {
        photoElem.src = prof.photo;
    } else {
        photoElem.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ddd" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="30"%3E' + (prof.name ? prof.name[0] : '?') + '%3C/text%3E%3C/svg%3E';
    }
};

window.clearGroupProfessor = function () {
    document.getElementById('groupProfessorId').value = '';
    document.getElementById('groupProfessorSearch').value = '';
    document.getElementById('groupProfessorSearch').style.display = 'block';
    document.getElementById('selectedProfessorInfo').style.display = 'none';
};

function validateProfessor(profId) {
    // Buscar por ID (convertir a número si es string)
    const profIdNum = parseInt(profId);
    const prof = store.professors.find(p => p.id === profIdNum || p.id === profId);

    if (!prof) {
        console.log('Profesor no encontrado. profId:', profId, 'Profesores disponibles:', store.professors);
        return { valid: false, message: 'Profesor no encontrado en la base de datos.' };
    }
    return { valid: true };
}

async function saveGroup() {
    const profId = document.getElementById('groupProfessorId').value;
    const groupId = document.getElementById('groupId').value;

    if (!groupId) {
        await window.showCustomAlert('Error', 'Debe generar el código del grupo primero', 'error');
        return;
    }

    if (!profId) {
        await window.showCustomAlert('Error', 'Debe seleccionar un profesor asesor', 'error');
        return;
    }

    const validation = validateProfessor(profId);
    if (!validation.valid) {
        await window.showCustomAlert('Error', validation.message, 'error');
        return;
    }

    const facultySel = document.getElementById('groupFaculty');
    const programSel = document.getElementById('groupProgram');
    const prof = store.professors.find(p => p.id === profId);

    // Procesar documentos - Cargar existentes si estamos editando
    let existingDocs = [];

    // Si estamos editando, obtener documentos existentes
    try {
        const checkRes = await window.authFetch('http://localhost:3001/api/groups');
        const checkJson = await checkRes.json();
        const existingGroup = checkJson.data.find(g => g.id === groupId);

        if (existingGroup && existingGroup.documents && typeof existingGroup.documents === 'string') {
            try {
                existingDocs = JSON.parse(existingGroup.documents);
            } catch (e) {
                existingDocs = [];
            }
        }
    } catch (e) {
        console.error('Error loading existing documents:', e);
    }

    // Agregar nuevos archivos del formulario
    const fileInput = document.getElementById('groupNewFiles');
    const newFiles = Array.from(fileInput?.files || []);

    console.log('📁 Archivos seleccionados:', newFiles.length);
    console.log('📄 Documentos existentes antes:', existingDocs.length);

    for (const file of newFiles) {
        console.log('Procesando archivo:', file.name, file.size);
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        existingDocs.push({
            name: file.name,
            size: `${(file.size / 1024).toFixed(2)} KB`,
            data: base64,
            uploadedAt: new Date().toISOString(),
            uploadedBy: localStorage.getItem('currentUserName') || 'Usuario',
            uploadedById: localStorage.getItem('currentUserId') || null
        });
    }

    console.log('📚 Total documentos después:', existingDocs.length);

    const groupData = {
        id: groupId,
        name: document.getElementById('groupName').value,
        faculty_name: facultySel.options[facultySel.selectedIndex]?.text || '',
        program_name: programSel.options[programSel.selectedIndex]?.text || '',
        year: parseInt(document.getElementById('groupYear').value),
        period: document.getElementById('groupPeriod').value,
        advisor_id: profId,
        advisor_name: prof?.name || '',
        advisor_identification: prof?.identification || '',
        description: document.getElementById('groupDescription').value,
        documents: existingDocs.length > 0 ? JSON.stringify(existingDocs) : null,
        advisors: window.currentAdvisors.length > 0 ? JSON.stringify(window.currentAdvisors) : null
    };

    try {
        // Verificar si existe
        const checkRes = await window.authFetch('http://localhost:3001/api/groups');
        const checkJson = await checkRes.json();
        const exists = checkJson.data.find(g => g.id === groupId);

        const url = exists
            ? `http://localhost:3001/api/groups/${groupId}`
            : 'http://localhost:3001/api/groups';
        const method = exists ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(groupData)
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error guardando grupo', 'error');
            return;
        }

        await window.showCustomAlert('Éxito', exists ? 'Grupo actualizado exitosamente' : 'Grupo creado exitosamente', 'success');

        document.getElementById('groupForm').remove();
        window.showDataSection('admin-grupos');
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error guardando grupo', 'error');
    }
}

async function deleteGroup(id) {
    try {
        const confirmed = await window.showCustomAlert(
            '¿Eliminar grupo?',
            '¿Está seguro de eliminar este grupo?\n\nTambién se eliminarán sus documentos asociados.',
            'warning',
            true
        );

        if (!confirmed) return;

        const res = await fetch(`http://localhost:3001/api/groups/${id}`, {
            method: 'DELETE'
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error eliminando grupo', 'error');
            return;
        }

        await window.showCustomAlert('Éxito', 'Grupo eliminado exitosamente', 'success');
        loadGrupos();
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error eliminando grupo', 'error');
    }
}

// ============ GESTIÓN DE ESTUDIANTES ============

window.viewGroupStudents = async function (groupId, readOnly = false) {
    try {
        // Obtener grupo
        const resGroup = await window.authFetch('http://localhost:3001/api/groups');
        const jsonGroup = await resGroup.json();
        const group = jsonGroup.data.find(g => g.id === groupId);

        if (!group) return;

        // Obtener estudiantes del grupo
        const resStudents = await fetch(`http://localhost:3001/api/groups/${groupId}/students`);
        const jsonStudents = await resStudents.json();
        const students = jsonStudents.data || [];

        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        // Botones de acción solo si NO es readOnly
        const actionButtons = readOnly ? '' : `
            <div style="margin-bottom:1rem;display:flex;gap:0.5rem;justify-content:flex-end;">
                <button class="btn btn-secondary" onclick="window.importStudents('${groupId}')">
                    <i class="fas fa-file-upload"></i> Importar desde Excel
                </button>
                <button class="btn btn-primary" onclick="window.openStudentForm('${groupId}')">
                    <i class="fas fa-user-plus"></i> Agregar Individual
                </button>
            </div>
        `;

        modal.innerHTML = `
            <div class="modal-content" style="max-width:900px;max-height:90vh;">
                <div class="modal-header">
                    <h3><i class="fas fa-users"></i> Estudiantes de ${group.name} ${readOnly ? '<span style="font-size:0.75em;background:#fbbf24;color:#000;padding:4px 8px;border-radius:4px;margin-left:10px;">Solo Lectura</span>' : ''}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="overflow:auto;max-height:75vh;">
                    ${actionButtons}
                    <div id="studentsListContainer"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        // Mostrar estudiantes
        const container = document.getElementById('studentsListContainer');
        if (students.length > 0) {
            let tableHTML = `
                <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background:#3b82f6;color:white;">
                            <th style="padding:0.75rem;text-align:left;font-weight:600;">Nombre</th>
                            <th style="padding:0.75rem;text-align:left;font-weight:600;">Usuario</th>
                            ${readOnly ? '' : '<th style="padding:0.75rem;text-align:center;font-weight:600;width:100px;">Acciones</th>'}
                        </tr>
                    </thead>
                    <tbody>
            `;

            students.forEach(student => {
                tableHTML += `
                    <tr style="border-bottom:1px solid #e5e7eb;">
                        <td style="padding:0.75rem;">${student.name || 'Sin nombre'}</td>
                        <td style="padding:0.75rem;">${student.username}</td>
                        ${readOnly ? '' : `
                            <td style="padding:0.75rem;text-align:center;">
                                <button type="button" class="btn btn-sm btn-danger" onclick="window.removeStudentFromGroup('${student.id}', '${groupId}')" title="Quitar del grupo">
                                    <i class="fas fa-user-times"></i>
                                </button>
                            </td>
                        `}
                    </tr>
                `;
            });

            tableHTML += `
                    </tbody>
                </table>
            `;
            container.innerHTML = tableHTML;
        } else {
            container.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;font-style:italic;">No hay estudiantes en este grupo</p>';
        }

    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error cargando estudiantes', 'error');
    }
};

window.openStudentForm = function (groupId, studentId = null) {
    const group = store.groups.find(g => g.id === groupId);
    window.showForm(studentId ? 'Editar Estudiante' : `Registrar Estudiante en ${group.name}`);

    let studentForm = document.getElementById('studentForm');
    if (studentForm) studentForm.remove();

    createStudentForm(groupId, studentId);
};

function createStudentForm(groupId, studentId = null) {
    const formSection = document.getElementById('formSection');
    const form = document.createElement('form');
    form.id = 'studentForm';

    form.innerHTML = `
        <style>
            .student-form-layout {
                display: grid;
                grid-template-columns: 250px 1fr;
                gap: 2rem;
                margin-bottom: 1.5rem;
            }
            .photo-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1rem;
            }
            .photo-upload-area {
                width: 200px;
                height: 240px;
                border: 2px dashed #cbd5e0;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f7fafc;
                cursor: pointer;
                transition: all 0.3s;
                position: relative;
                overflow: hidden;
            }
            .photo-upload-area:hover {
                border-color: #4299e1;
                background: #ebf8ff;
            }
            .photo-preview {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: none;
            }
            .photo-placeholder {
                text-align: center;
                color: #a0aec0;
            }
            .photo-placeholder i {
                font-size: 3rem;
                margin-bottom: 0.5rem;
            }
        </style>
        
        <div class="student-form-layout">
            <div class="photo-section">
                <h4 style="margin:0;font-size:1rem;color:#2d3748;">Fotografía</h4>
                <label for="studentPhoto" class="photo-upload-area">
                    <img id="studentPhotoPreview" class="photo-preview">
                    <div class="photo-placeholder" id="photoPlaceholder">
                        <i class="fas fa-camera"></i>
                        <div style="font-size:0.875rem;">Click para subir foto</div>
                    </div>
                </label>
                <input type="file" id="studentPhoto" style="display:none;" accept="image/*" onchange="window.handleStudentPhoto(event)">
                <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('studentPhoto').click()">
                    <i class="fas fa-upload"></i> Cambiar Foto
                </button>
            </div>
            
            <div class="fields-section">
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre Completo *</label>
                        <input id="studentName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Código Estudiantil *</label>
                        <input id="studentCode" class="form-control" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="studentEmail" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input id="studentPhone" class="form-control" placeholder="Ej: +57 300 123 4567">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Género *</label>
                        <select id="studentGender" class="form-control" required>
                            <option value="">-- Seleccionar --</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                            <option value="Prefiero no decir">Prefiero no decir</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Sexo Biológico *</label>
                        <select id="studentSex" class="form-control" required>
                            <option value="">-- Seleccionar --</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Intersexual">Intersexual</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Programa Académico</label>
                        <select id="studentProgram" class="form-control">
                            <option value="">-- Seleccionar --</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Semestre Actual</label>
                        <input type="number" id="studentSemester" class="form-control" min="1" max="12" placeholder="1-12">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Dirección de Residencia</label>
                    <input id="studentAddress" class="form-control" placeholder="Calle, número, barrio, ciudad">
                </div>
                
                <div class="form-group">
                    <label>Observaciones / Notas</label>
                    <textarea id="studentNotes" class="form-control" rows="3" placeholder="Información adicional relevante..."></textarea>
                </div>
            </div>
        </div>

        <div class="form-actions" style="margin-top:1.5rem;border-top:1px solid #eee;padding-top:1rem;">
            <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar Estudiante</button>
        </div>
    `;

    formSection.appendChild(form);

    // Populate programs
    const programSelect = document.getElementById('studentProgram');
    store.programs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        programSelect.appendChild(opt);
    });

    // Load data if editing
    if (studentId) {
        const student = store.students.find(s => s.id == studentId);
        if (student) {
            document.getElementById('studentName').value = student.name || '';
            document.getElementById('studentCode').value = student.code || '';
            document.getElementById('studentEmail').value = student.email || '';
            document.getElementById('studentPhone').value = student.phone || '';
            document.getElementById('studentGender').value = student.gender || '';
            document.getElementById('studentSex').value = student.sex || '';
            document.getElementById('studentProgram').value = student.programId || '';
            document.getElementById('studentSemester').value = student.semester || '';
            document.getElementById('studentAddress').value = student.address || '';
            document.getElementById('studentNotes').value = student.notes || '';

            if (student.photo) {
                const preview = document.getElementById('studentPhotoPreview');
                const placeholder = document.getElementById('photoPlaceholder');
                preview.src = student.photo;
                preview.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            }
        }
    }

    form.onsubmit = (e) => {
        e.preventDefault();
        saveStudent(groupId, studentId);
    };

    form.querySelector('.btn-cancel').onclick = () => {
        form.remove();
        window.viewGroupStudents(groupId);
    };
}

window.handleStudentPhoto = function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('studentPhotoPreview');
            const placeholder = document.getElementById('photoPlaceholder');
            preview.src = e.target.result;
            preview.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
};

function saveStudent(groupId, studentId) {
    const photoPreview = document.getElementById('studentPhotoPreview');
    const photoData = photoPreview.style.display !== 'none' ? photoPreview.src : null;

    const studentData = {
        id: studentId || Date.now(),
        groupId: groupId,
        name: document.getElementById('studentName').value,
        code: document.getElementById('studentCode').value,
        email: document.getElementById('studentEmail').value,
        phone: document.getElementById('studentPhone').value || '',
        gender: document.getElementById('studentGender').value || '',
        sex: document.getElementById('studentSex').value || '',
        programId: document.getElementById('studentProgram').value || '',
        semester: parseInt(document.getElementById('studentSemester').value) || 0,
        address: document.getElementById('studentAddress').value || '',
        notes: document.getElementById('studentNotes').value || '',
        photo: photoData,
        joinedDate: studentId ?
            store.students.find(s => s.id == studentId)?.joinedDate :
            new Date().toISOString().split('T')[0]
    };

    if (!store.students) store.students = [];

    const idx = store.students.findIndex(s => s.id == studentId);
    if (idx !== -1) {
        store.students[idx] = studentData;
        showNotification('Estudiante actualizado');
    } else {
        store.students.push(studentData);
        showNotification('Estudiante registrado');
    }

    document.getElementById('studentForm').remove();
    window.viewGroupStudents(groupId);
}

function deleteStudent(id) {
    if (confirm('¿Eliminar estudiante?')) {
        store.students = store.students.filter(s => s.id != id);
        window.viewGroupStudents(currentGroupId);
        showNotification('Estudiante eliminado');
    }
}

// ============ INVITACIONES ============

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

window.inviteStudents = async function (groupId) {
    try {
        const resGroup = await window.authFetch('http://localhost:3001/api/groups');
        const jsonGroup = await resGroup.json();
        const group = jsonGroup.data.find(g => g.id === groupId);

        if (!group) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px">
                <div class="modal-header">
                    <h3><i class="fas fa-envelope"></i> Código de Invitación</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:2rem;border-radius:8px;color:white;text-align:center;margin-bottom:1.5rem;">
                        <div style="font-size:0.875rem;opacity:0.9;margin-bottom:0.5rem;">Código del Grupo</div>
                        <div style="font-size:2rem;font-weight:bold;letter-spacing:2px;font-family:monospace;background:rgba(255,255,255,0.2);padding:0.75rem;border-radius:6px;">
                            ${groupId}
                        </div>
                        <button type="button" class="btn btn-light" onclick="window.copyInviteCode('${groupId}')" style="margin-top:1rem;">
                            <i class="fas fa-copy"></i> Copiar Código
                        </button>
                    </div>
                    
                    <div style="background:#f0f9ff;border:1px solid #0284c7;padding:1rem;border-radius:6px;">
                        <strong>📋 Instrucciones para Estudiantes:</strong>
                        <ol style="margin:0.5rem 0 0 1.2rem;line-height:1.8;">
                            <li>Ir a la página de registro del sistema</li>
                            <li>Ingresar sus datos personales</li>
                            <li>En "Código de Grupo", pegar: <code style="background:#fff;padding:0.2rem 0.4rem;border-radius:3px;">${groupId}</code></li>
                            <li>Completar el registro</li>
                        </ol>
                        <div style="margin-top:1rem;padding:0.75rem;background:white;border-radius:4px;">
                            <strong>Grupo:</strong> ${group.name}<br>
                            <strong>Asesor:</strong> ${group.advisor_name || 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error mostrando código', 'error');
    }
};

window.copyInviteCode = async function (code) {
    try {
        await navigator.clipboard.writeText(code);
        await window.showCustomAlert('Copiado', 'Código copiado al portapapeles', 'success');
    } catch (e) {
        console.error('Error:', e);
    }
};


window.uploadGroupDocuments = function (groupId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px">
            <div class="modal-header">
                <h3>Agregar Documentos al Grupo</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Seleccione los archivos que desea adjuntar al grupo:</p>
                <input type="file" id="groupFilesInput" multiple style="margin:1rem 0;padding:0.5rem;border:1px solid #ddd;border-radius:4px;width:100%;">
                <div id="filesList" style="margin:1rem 0;"></div>
                <div style="display:flex;gap:0.5rem;margin-top:1rem;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.saveGroupDocuments('${groupId}')">Guardar Documentos</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();

    document.getElementById('groupFilesInput').addEventListener('change', (e) => {
        const filesList = document.getElementById('filesList');
        filesList.innerHTML = '';
        Array.from(e.target.files).forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.style.cssText = 'padding:0.5rem;background:#f0f9ff;border:1px solid #bae6fd;border-radius:4px;margin-bottom:0.5rem;';
            fileDiv.innerHTML = `<i class="fas fa-file"></i> ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            filesList.appendChild(fileDiv);
        });
    });
};

window.saveGroupDocuments = async function (groupId) {
    const files = document.getElementById('groupFilesInput').files;
    if (files.length === 0) {
        window.showCustomAlert('Error', 'Seleccione al menos un archivo', 'error');
        return;
    }

    try {
        // Obtener grupo actual
        const resGet = await window.authFetch('http://localhost:3001/api/groups');
        const jsonGet = await resGet.json();
        const group = jsonGet.data.find(g => g.id === groupId);

        if (!group) {
            await window.showCustomAlert('Error', 'Grupo no encontrado', 'error');
            return;
        }

        // Documentos existentes
        let existingDocs = [];
        if (group.documents && typeof group.documents === 'string') {
            try {
                existingDocs = JSON.parse(group.documents);
            } catch (e) {
                existingDocs = [];
            }
        }

        // Convertir nuevos archivos a base64
        for (const file of Array.from(files)) {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            existingDocs.push({
                name: file.name,
                size: `${(file.size / 1024).toFixed(2)} KB`,
                data: base64,
                uploadedAt: new Date().toISOString(),
                uploadedBy: localStorage.getItem('currentUserName') || 'Usuario',
                uploadedById: localStorage.getItem('currentUserId') || null
            });
        }

        // Actualizar grupo
        const res = await fetch(`http://localhost:3001/api/groups/${groupId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documents: JSON.stringify(existingDocs)
            })
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error guardando documentos', 'error');
            return;
        }

        await window.showCustomAlert('Éxito', `${files.length} documento(s) agregado(s) al grupo`, 'success');
        document.querySelector('.modal-overlay').remove();
        loadGrupos();
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error guardando documentos', 'error');
    }
};

window.viewDocument = async function (groupId, docIndex) {
    try {
        const resGet = await window.authFetch('http://localhost:3001/api/groups');
        const jsonGet = await resGet.json();
        const group = jsonGet.data.find(g => g.id === groupId);

        if (!group || !group.documents) return;

        const docs = JSON.parse(group.documents);
        const doc = docs[docIndex];

        if (!doc) return;

        // Crear modal de previsualización
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:90%;max-height:90vh;">
                <div class="modal-header">
                    <h3><i class="fas fa-file"></i> ${doc.name}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="overflow:auto;max-height:70vh;">
                    ${doc.data.startsWith('data:image/')
                ? `<img src="${doc.data}" style="max-width:100%;height:auto;">`
                : doc.data.startsWith('data:application/pdf')
                    ? `<iframe src="${doc.data}" style="width:100%;height:70vh;border:none;"></iframe>`
                    : `<div style="padding:2rem;text-align:center;"><i class="fas fa-file fa-3x"></i><p>Vista previa no disponible para este tipo de archivo</p><a href="${doc.data}" download="${doc.name}" class="btn btn-primary">Descargar para ver</a></div>`
            }
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    } catch (error) {
        console.error('Error:', error);
    }
};

window.downloadDocument = async function (groupId, docIndex) {
    try {
        const resGet = await window.authFetch('http://localhost:3001/api/groups');
        const jsonGet = await resGet.json();
        const group = jsonGet.data.find(g => g.id === groupId);

        if (!group || !group.documents) return;

        const docs = JSON.parse(group.documents);
        const doc = docs[docIndex];

        if (!doc) return;

        // Crear link de descarga
        const link = document.createElement('a');
        link.href = doc.data;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        await window.showCustomAlert('Éxito', 'Descargando documento...', 'success');
    } catch (error) {
        console.error('Error:', error);
    }
};

window.printDocument = async function (groupId, docIndex) {
    try {
        const resGet = await window.authFetch('http://localhost:3001/api/groups');
        const jsonGet = await resGet.json();
        const group = jsonGet.data.find(g => g.id === groupId);

        if (!group || !group.documents) return;

        const docs = JSON.parse(group.documents);
        const doc = docs[docIndex];

        if (!doc) return;

        // Abrir ventana de impresión
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir: ${doc.name}</title>
                    <style>
                        body { margin: 0; padding: 20px; }
                        img { max-width: 100%; height: auto; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    ${doc.data.startsWith('data:image/')
                ? `<img src="${doc.data}" onload="window.print();window.close();">`
                : doc.data.startsWith('data:application/pdf')
                    ? `<iframe src="${doc.data}" width="100%" height="100%" onload="window.print();"></iframe>`
                    : `<p>No se puede imprimir este tipo de archivo directamente. Por favor descárguelo primero.</p>`
            }
                </body>
            </html>
        `);
        printWindow.document.close();
    } catch (error) {
        console.error('Error:', error);
    }
};

window.removeGroupDocument = async function (groupId, docIndex) {
    try {
        const confirmed = await window.showCustomAlert(
            '¿Eliminar documento?',
            '¿Está seguro de eliminar este documento del grupo?',
            'warning',
            true
        );

        if (!confirmed) return;

        // Obtener grupo
        const resGet = await window.authFetch('http://localhost:3001/api/groups');
        const jsonGet = await resGet.json();
        const group = jsonGet.data.find(g => g.id === groupId);

        if (!group || !group.documents) return;

        let docs = JSON.parse(group.documents);

        // Eliminar documento
        docs.splice(docIndex, 1);

        // Actualizar grupo
        const res = await fetch(`http://localhost:3001/api/groups/${groupId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documents: docs.length > 0 ? JSON.stringify(docs) : null
            })
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error eliminando documento', 'error');
            return;
        }

        await window.showCustomAlert('Éxito', 'Documento eliminado exitosamente', 'success');

        // Recargar modal
        openGroupModal(groupId);
    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error eliminando documento', 'error');
    }
};

// Variable global para almacenar asesores temporalmente
window.currentAdvisors = [];

window.addGroupAdvisor = async function () {
    const profId = document.getElementById('groupProfessorId').value;
    if (!profId) {
        await window.showCustomAlert('Error', 'Primero seleccione un profesor', 'error');
        return;
    }

    // Buscar profesor (comparar como número y string)
    const profIdNum = parseInt(profId);
    const prof = store.professors.find(p => p.id === profIdNum || p.id === profId || String(p.id) === profId);

    if (!prof) {
        console.log('Profesor no encontrado. profId:', profId, 'Profesores:', store.professors);
        await window.showCustomAlert('Error', 'Profesor no encontrado', 'error');
        return;
    }

    // Pedir período
    const period = prompt('Ingrese el período (Ejemplo: 2025-1):', `${new Date().getFullYear()}-1`);
    if (!period) return;

    // Agregar a lista temporal
    window.currentAdvisors.push({
        id: prof.id,
        name: prof.name,
        identification: prof.identification,
        photo: prof.photo,
        period: period,
        addedAt: new Date().toISOString()
    });

    // Mostrar lista
    renderAdvisorsList();

    // Limpiar selección actual
    window.clearGroupProfessor();
};

function renderAdvisorsList() {
    const section = document.getElementById('advisorsHistorySection');
    const list = document.getElementById('advisorsList');

    if (window.currentAdvisors.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = '';

    window.currentAdvisors.forEach((advisor, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:0.75rem;background:white;border:1px solid #d1d5db;border-radius:4px;margin-bottom:0.5rem;display:flex;align-items:center;gap:1rem;';
        div.innerHTML = `
            <img src="${advisor.photo || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'%3E%3Crect fill=\'%23ddd\' width=\'50\' height=\'50\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-size=\'20\'%3E${advisor.name[0]}%3C/text%3E%3C/svg%3E'}" 
                 style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid #3b82f6;">
            <div style="flex:1;">
                <div style="font-weight:bold;">${advisor.name}</div>
                <div style="font-size:0.875rem;color:#666;"><i class="fas fa-id-card"></i> ${advisor.identification || 'N/A'}</div>
                <div style="font-size:0.875rem;color:#3b82f6;"><i class="fas fa-calendar"></i> Período: ${advisor.period}</div>
            </div>
            <button type="button" class="btn btn-sm btn-danger" onclick="window.removeAdvisor(${idx})"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });
}

window.removeAdvisor = function (index) {
    window.currentAdvisors.splice(index, 1);
    renderAdvisorsList();
};

// Cargar asesores existentes al editar
function loadExistingAdvisors(advisorsData) {
    if (!advisorsData) return;

    try {
        window.currentAdvisors = JSON.parse(advisorsData);
        renderAdvisorsList();
    } catch (e) {
        console.error('Error loading advisors:', e);
    }
}

window.showGroupControl = async function (groupId) {
    try {
        const res = await window.authFetch('http://localhost:3001/api/groups');
        const json = await res.json();
        const group = json.data.find(g => g.id === groupId);

        if (!group) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:1000px;max-height:90vh;">
                <div class="modal-header">
                    <h3><i class="fas fa-clipboard-list"></i> Control de Grupo: ${group.name}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="overflow:auto;max-height:75vh;">
                    
                    <!-- Asesores Históricos -->
                    <div style="margin-bottom:2rem;">
                        <h4 style="border-bottom:2px solid #3b82f6;padding-bottom:0.5rem;color:#3b82f6;">
                            <i class="fas fa-chalkboard-teacher"></i> Historial de Asesores
                        </h4>
                        <div id="controlAdvisorsList"></div>
                    </div>

                    <!-- Documentos -->
                    <div>
                        <h4 style="border-bottom:2px solid #10b981;padding-bottom:0.5rem;color:#10b981;">
                            <i class="fas fa-file-alt"></i> Documentos del Grupo
                        </h4>
                        <div id="controlDocumentsList"></div>
                    </div>

                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        // Cargar asesores (históricos + actual)
        const advisorsList = document.getElementById('controlAdvisorsList');
        let allAdvisors = [];

        // Debug: ver estructura del grupo
        console.log('Datos del grupo:', group);

        // Agregar históricos (si existen)
        if (group.advisors && typeof group.advisors === 'string') {
            try {
                allAdvisors = JSON.parse(group.advisors);
            } catch (e) {
                allAdvisors = [];
            }
        } else if (Array.isArray(group.advisors)) {
            allAdvisors = group.advisors;
        }

        // Agregar asesor actual si existe (puede ser professorId o advisor_id)
        const currentAdvisorId = group.professorId || group.advisor_id;
        if (currentAdvisorId) {
            // Buscar datos del profesor en store
            const prof = store.professors?.find(p => p.id === currentAdvisorId || p.id === parseInt(currentAdvisorId));

            if (prof) {
                allAdvisors.push({
                    id: prof.id,
                    name: prof.name,
                    identification: prof.identification,
                    photo: prof.photo,
                    period: 'Actual',
                    addedAt: new Date().toISOString()
                });
            } else {
                // Si no está en store, usar datos del grupo
                allAdvisors.push({
                    id: currentAdvisorId,
                    name: group.advisor_name || group.professorName || 'Asesor',
                    identification: group.advisor_identification || 'N/A',
                    photo: null,
                    period: 'Actual',
                    addedAt: new Date().toISOString()
                });
            }
        }

        if (allAdvisors.length > 0) {
            allAdvisors.forEach(advisor => {
                const div = document.createElement('div');
                div.style.cssText = 'padding:1rem;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:0.75rem;display:flex;align-items:center;gap:1rem;';

                const initial = advisor.name ? advisor.name[0].toUpperCase() : '?';
                const photoHtml = advisor.photo
                    ? `<img src="${advisor.photo}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid #3b82f6;">`
                    : `<div style="width:60px;height:60px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:24px;color:#718096;border:3px solid #3b82f6;">${initial}</div>`;

                div.innerHTML = `
                    ${photoHtml}
                    <div style="flex:1;">
                        <div style="font-weight:bold;font-size:1.1rem;">${advisor.name}</div>
                        <div style="color:#666;margin-top:0.25rem;"><i class="fas fa-id-card"></i> ${advisor.identification || 'N/A'}</div>
                        <div style="color:#3b82f6;font-weight:500;margin-top:0.25rem;"><i class="fas fa-calendar"></i> Período: ${advisor.period}</div>
                    </div>
                `;
                advisorsList.appendChild(div);
            });
        } else {
            advisorsList.innerHTML = '<p style="color:#999;font-style:italic;">No hay asesores registrados</p>';
        }

        // Cargar documentos
        const docsList = document.getElementById('controlDocumentsList');
        if (group.documents && typeof group.documents === 'string') {
            try {
                const docs = JSON.parse(group.documents);
                if (docs.length > 0) {
                    let tableHTML = `
                        <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                            <thead>
                                <tr style="background:#10b981;color:white;">
                                    <th style="padding:0.75rem;text-align:left;font-weight:600;">Cargado por</th>
                                    <th style="padding:0.75rem;text-align:left;font-weight:600;">Documentos</th>
                                    <th style="padding:0.75rem;text-align:center;font-weight:600;width:180px;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    docs.forEach((doc, idx) => {
                        tableHTML += `
                            <tr style="border-bottom:1px solid #e5e7eb;">
                                <td style="padding:0.75rem;vertical-align:top;">
                                    <div style="font-weight:500;color:#374151;">${doc.uploadedBy || 'Usuario'}</div>
                                    <div style="font-size:0.75rem;color:#6b7280;margin-top:0.25rem;">${new Date(doc.uploadedAt).toLocaleDateString()} ${new Date(doc.uploadedAt).toLocaleTimeString()}</div>
                                </td>
                                <td style="padding:0.75rem;vertical-align:top;">
                                    <div style="font-weight:600;color:#111827;"><i class="fas fa-file"></i> ${doc.name}</div>
                                    <div style="font-size:0.875rem;color:#6b7280;margin-top:0.25rem;">${doc.size}</div>
                                </td>
                                <td style="padding:0.75rem;text-align:center;vertical-align:middle;white-space:nowrap;">
                                    <button type="button" class="btn btn-sm btn-info" onclick="window.viewDocument('${groupId}', ${idx})" title="Ver" style="margin:0 2px;"><i class="fas fa-eye"></i></button>
                                    <button type="button" class="btn btn-sm btn-success" onclick="window.downloadDocument('${groupId}', ${idx})" title="Descargar" style="margin:0 2px;"><i class="fas fa-download"></i></button>
                                    <button type="button" class="btn btn-sm btn-warning" onclick="window.printDocument('${groupId}', ${idx})" title="Imprimir" style="margin:0 2px;"><i class="fas fa-print"></i></button>
                                </td>
                            </tr>
                        `;
                    });

                    tableHTML += `
                            </tbody>
                        </table>
                    `;

                    docsList.innerHTML = tableHTML;
                } else {
                    docsList.innerHTML = '<p style="color:#999;font-style:italic;">No hay documentos cargados</p>';
                }
            } catch (e) {
                docsList.innerHTML = '<p style="color:#999;font-style:italic;">No hay documentos cargados</p>';
            }
        } else {
            docsList.innerHTML = '<p style="color:#999;font-style:italic;">No hay documentos cargados</p>';
        }

    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error cargando control de grupo', 'error');
    }
};

window.openStudentForm = async function (groupId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:700px;">
            <div class="modal-header">
                <h3><i class="fas fa-user-plus"></i> Agregar Estudiantes al Grupo</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Buscar Estudiante (mínimo 3 caracteres)</label>
                    <input type="text" id="searchStudent" class="form-control" placeholder="Escribe nombre o usuario..." autocomplete="off">
                </div>
                <div id="availableStudentsList" style="max-height:400px;overflow-y:auto;margin-top:1rem;">
                    <p style="text-align:center;color:#999;padding:2rem;">Escribe al menos 3 caracteres para buscar</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    let searchTimeout;
    const searchInput = document.getElementById('searchStudent');

    searchInput.addEventListener('input', async (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 3) {
            document.getElementById('availableStudentsList').innerHTML =
                '<p style="text-align:center;color:#999;padding:2rem;">Escribe al menos 3 caracteres para buscar</p>';
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                document.getElementById('availableStudentsList').innerHTML =
                    '<p style="text-align:center;color:#666;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Buscando...</p>';

                const res = await window.authFetch('http://localhost:3001/api/students/available');
                const json = await res.json();
                const available = json.data || [];

                const filtered = available.filter(s =>
                    s.name?.toLowerCase().includes(query.toLowerCase()) ||
                    s.username?.toLowerCase().includes(query.toLowerCase())
                );

                renderStudentResults(filtered, groupId);
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('availableStudentsList').innerHTML =
                    '<p style="text-align:center;color:#ef4444;padding:2rem;">Error al buscar</p>';
            }
        }, 300); // Esperar 300ms después de que deje de escribir
    });
};

function renderStudentResults(students, groupId) {
    const list = document.getElementById('availableStudentsList');

    if (students.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">No se encontraron estudiantes</p>';
        return;
    }

    let html = '';
    students.forEach(student => {
        html += `
            <div style="padding:0.75rem;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:600;">${student.name || 'Sin nombre'}</div>
                    <div style="font-size:0.875rem;color:#666;">Usuario: ${student.username}</div>
                </div>
                <button type="button" class="btn btn-sm btn-success" onclick="window.assignStudentToGroup('${student.id}', '${groupId}')">
                    <i class="fas fa-plus"></i> Agregar
                </button>
            </div>
        `;
    });
    list.innerHTML = html;
}

window.assignStudentToGroup = async function (studentId, groupId) {
    try {
        const res = await fetch(`http://localhost:3001/api/students/${studentId}/assign-group`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_id: groupId })
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error asignando estudiante', 'error');
            return;
        }

        await window.showCustomAlert('Éxito', 'Estudiante agregado al grupo', 'success');

        // Cerrar modal de agregar y reabrir vista de estudiantes
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        window.viewGroupStudents(groupId);

    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error asignando estudiante', 'error');
    }
};

window.removeStudentFromGroup = async function (studentId, groupId) {
    try {
        const confirmed = await window.showCustomAlert(
            '¿Quitar estudiante?',
            '¿Está seguro de quitar este estudiante del grupo?',
            'warning',
            true
        );

        if (!confirmed) return;

        const res = await fetch(`http://localhost:3001/api/students/${studentId}/remove-from-group`, {
            method: 'PUT'
        });

        const json = await res.json();

        if (!res.ok) {
            await window.showCustomAlert('Error', json.error || 'Error quitando estudiante', 'error');
            return;
        }

        await window.showCustomAlert('Éxito', 'Estudiante quitado del grupo', 'success');

        // Recargar vista
        window.viewGroupStudents(groupId);

    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error quitando estudiante', 'error');
    }
};

window.importStudents = function (groupId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
                <h3><i class="fas fa-file-upload"></i> Importar Estudiantes desde Excel</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="alert" style="background:#e0f2fe;border:1px solid #0284c7;padding:1rem;border-radius:6px;margin-bottom:1rem;">
                    <strong>Formato del archivo CSV/Excel:</strong><br>
                    <code>nombre,usuario,email</code><br>
                    <small style="color:#666;">
                        Ejemplo:<br>
                        Juan Pérez,jperez,juan@universidad.edu<br>
                        María García,mgarcia,maria@universidad.edu
                    </small>
                </div>
                
                <div class="form-group">
                    <label>Seleccionar archivo CSV o Excel</label>
                    <input type="file" id="importFile" accept=".csv,.xlsx,.xls" class="form-control" style="padding:0.5rem;">
                </div>
                
                <div class="form-actions" style="margin-top:1.5rem;text-align:right;">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="window.processImport('${groupId}')">
                        <i class="fas fa-upload"></i> Importar
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

window.processImport = async function (groupId) {
    const fileInput = document.getElementById('importFile');
    const file = fileInput?.files[0];

    if (!file) {
        await window.showCustomAlert('Error', 'Seleccione un archivo', 'error');
        return;
    }

    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            await window.showCustomAlert('Error', 'El archivo está vacío', 'error');
            return;
        }

        let created = 0;
        let errors = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',').map(p => p.trim());

            if (parts.length < 2) {
                console.warn(`Línea ${i + 1} inválida:`, line);
                errors++;
                continue;
            }

            const [name, username, email] = parts;

            try {
                // Crear usuario estudiante
                const res = await window.authFetch('http://localhost:3001/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        password: username, // Password temporal = usuario
                        name: name,
                        role: 'student',
                        group_id: groupId
                    })
                });

                if (res.ok) {
                    created++;
                } else {
                    errors++;
                    console.warn(`Error creando ${username}`);
                }
            } catch (e) {
                errors++;
                console.error(`Error procesando ${username}:`, e);
            }
        }

        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

        await window.showCustomAlert(
            'Importación Completa',
            `✅ ${created} estudiantes importados\n${errors > 0 ? `⚠️ ${errors} errores` : ''}`,
            'success'
        );

        // Recargar vista
        window.viewGroupStudents(groupId);

    } catch (error) {
        console.error('Error:', error);
        await window.showCustomAlert('Error', 'Error procesando archivo: ' + error.message, 'error');
    }
};








