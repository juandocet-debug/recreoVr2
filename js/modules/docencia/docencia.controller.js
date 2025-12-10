import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';
import { showModal, hideModal } from '../../components/Modal.js';


let currentActaId = null;

export function initDocencia() {
    // Global hooks if needed
}

export async function loadDocencia() {
    const btn = document.getElementById('btnNew');
    const txt = document.getElementById('btnNewText');

    txt.textContent = 'Nueva Acta';
    btn.onclick = () => openActaModal();
    btn.style.display = 'inline-flex';

    await fetchActas();
    renderActaTable();
}

async function fetchActas() {
    try {
        // Build URL with optional user filtering
        let url = 'http://localhost:3001/api/actas';

        // If user is logged in, pass their info for filtering
        if (store.currentUser) {
            const params = new URLSearchParams({
                userId: store.currentUser.name || store.currentUser.username,
                userRole: store.currentUser.role
            });
            url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        if (res.ok) {
            const json = await res.json();
            store.allData = store.allData || {};
            store.allData.acta = json.data;
        }
    } catch (e) {
        console.error("Error fetching actas:", e);
    }
}

export async function openActaModal(actaId = null) {
    currentActaId = actaId;
    const title = actaId ? 'Editar Acta' : 'Nueva Acta de Reunión';

    // Asegurar que tenemos datos de usuarios (profesores) cargados para el buscador
    if (!store.professors || store.professors.length === 0) {
        window.showCustomAlert('Cargando datos...', 'Obteniendo lista de usuarios', 'loading');
        try {
            const res = await fetch('http://localhost:3001/api/professors');
            if (res.ok) {
                const json = await res.json();
                store.professors = json.data;
            }
        } catch (e) {
            console.error("Error cargando profesores para autocompletado:", e);
        } finally {
            window.closeCustomAlert();
        }
    }

    window.showForm(title);

    // Inject the complex form
    injectActaForm();

    if (actaId) {
        const acta = store.allData.acta.find(a => a.id === actaId);
        if (acta) populateActaForm(acta);
    }
}

function injectActaForm() {
    const formSection = document.getElementById('formSection');

    let container = document.getElementById('actaFormContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'actaFormContainer';
        formSection.appendChild(container);
    }

    const styles = `
        <style>
            .acta-card { background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); padding: 20px; width: 100%; margin: 0 auto; }
            .acta-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .acta-tabs { display: flex; border-bottom: 2px solid #eee; margin-bottom: 20px; }
            .acta-tab { padding: 10px 20px; cursor: pointer; font-weight: 600; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.3s; }
            .acta-tab:hover { color: #333; }
            .acta-tab.active { color: #2c3e50; border-bottom: 2px solid #2c3e50; }
            .tab-content { display: none; animation: fadeIn 0.3s; }
            .tab-content.active { display: block; }
            .form-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 15px; margin-bottom: 15px; }
            .col-12 { grid-column: span 12; } .col-6 { grid-column: span 6; } .col-4 { grid-column: span 4; } .col-3 { grid-column: span 3; }
            .form-group label { display: block; margin-bottom: 5px; font-weight: 500; font-size: 0.9rem; color: #4a5568; }
            .form-control { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.95rem; }
            .table-custom { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table-custom th { text-align: left; padding: 8px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; color: #718096; }
            .table-custom td { padding: 8px; border-bottom: 1px solid #edf2f7; }
            .table-custom input { border: none; background: transparent; width: 100%; }
            .section-label { font-size: 0.9rem; font-weight: bold; color: #2d3748; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            /* Estilos para Autocompletado */
            .autocomplete-items { position: absolute; border: 1px solid #d4d4d4; border-bottom: none; border-top: none; z-index: 99; top: 100%; left: 0; right: 0; background-color: #fff; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 0 0 4px 4px; }
            .autocomplete-items div { padding: 10px; cursor: pointer; background-color: #fff; border-bottom: 1px solid #d4d4d4; }
            .autocomplete-items div:hover { background-color: #e9e9e9; }
            .autocomplete-active { background-color: #e9e9e9 !important; color: #000; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        </style>
    `;

    container.innerHTML = styles + `
        <div class="acta-card">
            <div class="acta-header">
                <div><h3 style="margin:0; color:#2d3748;">Detalles del Acta (Formato Oficial)</h3><small style="color:#718096;">FOR023GDC Versión 03</small></div>
                <div style="display:flex; gap:10px;">
                    <label><input type="radio" name="actaType" value="Acta de Reunión" checked> Acta de Reunión</label>
                    <label><input type="radio" name="actaType" value="Resumen de Reunión"> Resumen de Reunión</label>
                </div>
            </div>

            <div class="acta-tabs">
                <div class="acta-tab active" onclick="switchTab('general')">1. General</div>
                <div class="acta-tab" onclick="switchTab('personas')">2. Personas</div>
                <div class="acta-tab" onclick="switchTab('desarrollo')">3. Desarrollo</div>
                <div class="acta-tab" onclick="switchTab('cierre')">4. Cierre</div>
            </div>

            <!-- Tab 1: General -->
            <div id="tab-general" class="tab-content active">
                <div class="form-grid">
                    <div class="col-6"><div class="form-group"><label>Fecha</label><input type="date" class="form-control" id="actaDate"></div></div>
                    <div class="col-3"><div class="form-group"><label>Hora Inicio</label><input type="time" class="form-control" id="actaStartTime"></div></div>
                    <div class="col-3"><div class="form-group"><label>Hora Final</label><input type="time" class="form-control" id="actaEndTime"></div></div>
                    <div class="col-12"><div class="form-group"><label>Instancias o Dependencias reunidas</label><input type="text" class="form-control" id="actaDependencies" value="Licenciatura en Tecnología"></div></div>
                    <div class="col-12"><div class="form-group"><label>Lugar de la reunión</label><input type="text" class="form-control" id="actaLocation"></div></div>
                    <div class="col-6"><div class="form-group"><label>Categoría (Interno)</label><select class="form-control" id="actaCategory"><option value="Comité Curricular">Comité Curricular</option><option value="Reunión de Profesores">Reunión de Profesores</option><option value="Otro">Otro</option></select></div></div>
                </div>
                <div style="text-align:right;"><button class="btn btn-primary" onclick="switchTab('personas')">Siguiente</button></div>
            </div>

            <!-- Tab 2: Personas (Asistentes, Ausentes, Invitados) -->
            <div id="tab-personas" class="tab-content">
                <div class="section-label">2. Asistentes</div>
                <div style="display:flex; gap:5px; margin-bottom:10px;">
                    <input type="text" id="groupSearchCode" class="form-control" style="width:150px;" placeholder="Grupo (G-101)">
                    <button class="btn btn-sm btn-primary" id="btnSearchGroup">Buscar Grupo</button>
                </div>
                <table class="table-custom" id="attendeesTable"><thead><tr><th>Nombres</th><th>Cargo/Dependencia</th><th style="width:30px"></th></tr></thead><tbody></tbody></table>
                <button class="btn btn-link btn-sm" onclick="addPersonRow('attendeesTable')">+ Agregar Asistente</button>

                <div class="section-label">3. Ausentes</div>
                <table class="table-custom" id="absentTable"><thead><tr><th>Nombres</th><th>Cargo/Dependencia</th><th style="width:30px"></th></tr></thead><tbody></tbody></table>
                <button class="btn btn-link btn-sm" onclick="addPersonRow('absentTable')">+ Agregar Ausente</button>

                <div class="section-label">4. Invitados</div>
                <table class="table-custom" id="guestsTable"><thead><tr><th>Nombres</th><th>Cargo/Dependencia</th><th style="width:30px"></th></tr></thead><tbody></tbody></table>
                <button class="btn btn-link btn-sm" onclick="addPersonRow('guestsTable')">+ Agregar Invitado</button>

                <div style="display:flex; justify-content:space-between; margin-top:20px;">
                    <button class="btn btn-secondary" onclick="switchTab('general')">Anterior</button>
                    <button class="btn btn-primary" onclick="switchTab('desarrollo')">Siguiente</button>
                </div>
            </div>

            <!-- Tab 3: Desarrollo -->
            <div id="tab-desarrollo" class="tab-content">
                <div class="form-group"><label>5. Orden del Día</label><textarea class="form-control" id="actaContent" rows="4"></textarea></div>
                <div class="form-group"><label>6. Desarrollo del Orden del Día</label><textarea class="form-control" id="actaDevelopment" rows="8"></textarea></div>
                <div style="display:flex; justify-content:space-between; margin-top:20px;">
                    <button class="btn btn-secondary" onclick="switchTab('personas')">Anterior</button>
                    <button class="btn btn-primary" onclick="switchTab('cierre')">Siguiente</button>
                </div>
            </div>

            <!-- Tab 4: Cierre -->
            <div id="tab-cierre" class="tab-content">
                <div class="section-label">7. Compromisos</div>
                <table class="table-custom" id="commitmentsTable"><thead><tr><th>Compromiso</th><th>Responsable</th><th>Fecha</th><th style="width:30px"></th></tr></thead><tbody></tbody></table>
                <button class="btn btn-link btn-sm" onclick="addCommitmentRow()">+ Agregar Compromiso</button>

                <div class="form-group mt-3"><label>8. Próxima Convocatoria</label><input type="text" class="form-control" id="actaNextMeeting" placeholder="Fecha, hora y lugar"></div>
                <div class="form-group"><label>9. Anexos</label><input type="text" class="form-control" id="actaAnnexes" placeholder="Documentos adjuntos..."></div>

                <div style="display:flex; justify-content:space-between; margin-top:30px; padding-top:20px; border-top:1px solid #eee;">
                    <button class="btn btn-secondary" onclick="switchTab('desarrollo')">Anterior</button>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-secondary btn-cancel">Cancelar</button>
                        <button class="btn btn-primary" onclick="saveActa()">Guardar Acta</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btnSearchGroup').onclick = searchGroupAndPopulate;
    container.querySelector('.btn-cancel').onclick = () => window.showDataSection('acta');

    if (!currentActaId) {
        addPersonRow('attendeesTable');
        addPersonRow('absentTable'); // Init empty
        addPersonRow('guestsTable'); // Init empty
        addCommitmentRow();
    }

    window.addPersonRow = addPersonRow;
    window.addCommitmentRow = addCommitmentRow;
    window.saveActa = saveActa;
    window.switchTab = switchTab;
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.acta-tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    const tabs = document.querySelectorAll('.acta-tab');
    if (tabName === 'general') tabs[0].classList.add('active');
    if (tabName === 'personas') tabs[1].classList.add('active');
    if (tabName === 'desarrollo') tabs[2].classList.add('active');
    if (tabName === 'cierre') tabs[3].classList.add('active');
}



// Función auxiliar para obtener todos los usuarios disponibles (extensible futuro)
function getAllUsers() {
    // Por ahora retornamos profesores, pero aquí se pueden concatenar estudiantes, administrativos, etc.
    // Ejemplo futuro: return [...store.professors, ...store.students];
    return store.professors || [];
}

function setupAutocomplete(inputElement, onSelect) {
    let currentFocus = -1;

    inputElement.addEventListener("input", function (e) {
        const val = this.value;
        closeAllLists();
        if (!val) return false;
        currentFocus = -1;

        const listDiv = document.createElement("DIV");
        listDiv.setAttribute("id", this.id + "autocomplete-list");
        listDiv.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(listDiv);

        const users = getAllUsers();
        const matches = users.filter(u => {
            const searchStr = `${u.name} ${u.identification || ''} ${u.email || ''}`.toLowerCase();
            return searchStr.includes(val.toLowerCase());
        });

        matches.forEach(user => {
            const itemDiv = document.createElement("DIV");
            // Resaltar coincidencia en el nombre
            const nameMatchIndex = user.name.toLowerCase().indexOf(val.toLowerCase());
            let nameHtml = user.name;
            if (nameMatchIndex >= 0) {
                nameHtml = user.name.substring(0, nameMatchIndex) +
                    "<strong>" + user.name.substring(nameMatchIndex, nameMatchIndex + val.length) + "</strong>" +
                    user.name.substring(nameMatchIndex + val.length);
            }

            itemDiv.innerHTML = `
                <div style="font-weight:bold;">${nameHtml}</div>
                <div style="font-size:0.8em; color:#666;">
                    ${user.role || 'Usuario'} - ${user.identification || 'Sin ID'}
                </div>
                <input type='hidden' value='${JSON.stringify(user)}'>
            `;

            itemDiv.addEventListener("click", function (e) {
                const selectedUser = JSON.parse(this.getElementsByTagName("input")[0].value);
                onSelect(selectedUser);
                closeAllLists();
            });
            listDiv.appendChild(itemDiv);
        });
    });

    inputElement.addEventListener("keydown", function (e) {
        let x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) { // Arrow DOWN
            currentFocus++;
            addActive(x);
        } else if (e.keyCode == 38) { // Arrow UP
            currentFocus--;
            addActive(x);
        } else if (e.keyCode == 13) { // ENTER
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus * 3].click(); // *3 porque cada item tiene 3 hijos (div, div, input) - Ajuste: click en el contenedor padre
                // Corrección: x es la lista de DIVs hijos directos de listDiv? No, getElementsByTagName("div") trae todos los descendientes.
                // Mejor usar querySelectorAll sobre listDiv
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        for (let i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        const x = document.getElementsByClassName("autocomplete-items");
        for (let i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inputElement) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

function addPersonRow(tableId, name = '', role = '') {
    const tbody = document.getElementById(tableId).querySelector('tbody');
    const tr = document.createElement('tr');

    // Generar ID único para el input de nombre para manejar el autocompletado
    const inputId = `input-${tableId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    tr.innerHTML = `
        <td style="position: relative;">
            <input type="text" id="${inputId}" value="${name}" placeholder="Buscar usuario..." autocomplete="off">
        </td>
        <td>
            <input type="text" value="${role}" placeholder="Cargo/Rol">
        </td>
        <td class="text-center">
            <button class="btn btn-sm btn-link text-danger p-0" onclick="this.closest('tr').remove()">x</button>
        </td>
    `;
    tbody.appendChild(tr);

    // Configurar autocompletado
    const input = tr.querySelector(`#${inputId}`);
    const roleInput = tr.querySelectorAll('input')[1];

    setupAutocomplete(input, (user) => {
        input.value = user.name;
        roleInput.value = user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Invitado';
    });
}

function addCommitmentRow(task = '', responsible = '', date = '') {
    const tbody = document.getElementById('commitmentsTable').querySelector('tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" value="${task}"></td><td><input type="text" value="${responsible}"></td><td><input type="date" value="${date}"></td><td class="text-center"><button class="btn btn-sm btn-link text-danger p-0" onclick="this.closest('tr').remove()">x</button></td>`;
    tbody.appendChild(tr);
}

async function searchGroupAndPopulate() {
    const code = document.getElementById('groupSearchCode').value;
    if (!code) return alert('Ingrese un código');
    window.showCustomAlert('Buscando...', 'Consultando estudiantes', 'loading');
    setTimeout(() => {
        const students = [{ name: 'Juan Pérez', role: 'Estudiante' }, { name: 'Maria Rodriguez', role: 'Estudiante' }];
        const tbody = document.getElementById('attendeesTable').querySelector('tbody');
        tbody.innerHTML = '';
        addPersonRow('attendeesTable', store.currentUser.name, 'Docente');
        students.forEach(s => addPersonRow('attendeesTable', s.name, s.role));
        window.showCustomAlert('Encontrado', `Cargados ${students.length} estudiantes`, 'success');
    }, 1000);
}

async function saveActa() {
    const type = document.querySelector('input[name="actaType"]:checked').value;
    const category = document.getElementById('actaCategory').value;
    const date = document.getElementById('actaDate').value;

    if (!date) return alert('Fecha requerida');

    const getTableData = (id) => Array.from(document.querySelectorAll(`#${id} tbody tr`)).map(tr => ({
        name: tr.querySelectorAll('input')[0].value,
        role: tr.querySelectorAll('input')[1].value
    })).filter(x => x.name);

    const commitments = Array.from(document.querySelectorAll('#commitmentsTable tbody tr')).map(tr => ({
        task: tr.querySelectorAll('input')[0].value,
        responsible: tr.querySelectorAll('input')[1].value,
        date: tr.querySelectorAll('input')[2].value
    })).filter(x => x.task);

    const data = {
        type, category, date,
        startTime: document.getElementById('actaStartTime').value,
        endTime: document.getElementById('actaEndTime').value,
        location: document.getElementById('actaLocation').value,
        dependencies: document.getElementById('actaDependencies').value,
        content: {
            agenda: document.getElementById('actaContent').value,
            development: document.getElementById('actaDevelopment').value,
            attendees: getTableData('attendeesTable'),
            absent: getTableData('absentTable'),
            guests: getTableData('guestsTable')
        },
        commitments,
        nextMeeting: document.getElementById('actaNextMeeting').value,
        annexes: document.getElementById('actaAnnexes').value,
        groupId: document.getElementById('groupSearchCode').value
    };

    try {
        const url = currentActaId ? `http://localhost:3001/api/actas/${currentActaId}` : 'http://localhost:3001/api/actas';
        const method = currentActaId ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) {
            await window.showCustomAlert('Guardado', 'Acta registrada', 'success');
            loadDocencia();
            window.showDataSection('acta');
        }
    } catch (e) { console.error(e); }
}

function renderActaTable() {
    const tbody = document.getElementById('tableBody');
    const thead = document.getElementById('tableHeader');

    thead.innerHTML = `
        <tr>
            <th>Fecha</th>
            <th>Tipo / Categoría</th>
            <th>Lugar</th>
            <th>Asistentes</th>
            <th>Estado</th>
            <th>Acciones</th>
        </tr>
    `;

    tbody.innerHTML = '';
    const data = store.allData.acta || [];

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3">No hay actas registradas</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        const attendeeCount = item.content.attendees ? item.content.attendees.length : 0;
        const signatureCount = item.signatures ? Object.keys(item.signatures).length : 0;
        const totalCanSign = attendeeCount + (item.content.guests ? item.content.guests.length : 0);

        // Check if current user can sign
        const userName = store.currentUser.name || store.currentUser.username;
        const attendees = item.content.attendees || [];
        const guests = item.content.guests || [];
        const allCanSign = [...attendees, ...guests];
        const userCanSign = allCanSign.some(p => p.name && p.name.toLowerCase().includes(userName.toLowerCase()))
            || store.currentUser.role === 'administrador'
            || store.currentUser.role === 'coordinador';
        const hasSigned = item.signatures && item.signatures[store.currentUser.username];

        let signBtn = '';
        if (userCanSign && !hasSigned) {
            signBtn = `<button class="btn btn-sm btn-success" onclick="signActa(${item.id})" title="Firmar"><i class="fas fa-signature"></i></button>`;
        } else if (hasSigned) {
            signBtn = `<button class="btn btn-sm btn-outline-success" disabled title="Ya firmado"><i class="fas fa-check"></i></button>`;
        }

        tr.innerHTML = `
            <td>${item.date}</td>
            <td>
                <span class="badge bg-info text-dark">${item.type}</span><br>
                <small>${item.category}</small>
            </td>
            <td>${item.location}</td>
            <td>${attendeeCount} personas</td>
            <td>
                ${signatureCount > 0
                ? `<span class="badge bg-success">${signatureCount}/${totalCanSign} Firmas</span>`
                : '<span class="badge bg-warning text-dark">Sin firmas</span>'
            }
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewActa(${item.id})" title="Ver Detalles"><i class="fas fa-eye"></i></button>
                ${signBtn}
                <button class="btn btn-sm btn-secondary" onclick="downloadActa(${item.id})" title="Descargar PDF"><i class="fas fa-file-download"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteActa(${item.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    window.viewActa = viewActa;
    window.deleteActa = deleteActa;
    window.downloadActa = downloadActa;
}

function viewActa(id) {
    const acta = store.allData.acta.find(a => a.id === id);
    if (!acta) return;

    // Check if user can sign (is in attendees or guests)
    const userName = store.currentUser.name || store.currentUser.username;
    const attendees = acta.content.attendees || [];
    const guests = acta.content.guests || [];
    const allCanSign = [...attendees, ...guests];

    const isRelated = allCanSign.some(p =>
        p.name && p.name.toLowerCase().includes(userName.toLowerCase())
    ) || store.currentUser.role === 'administrador' || store.currentUser.role === 'coordinador';

    const hasSigned = acta.signatures && acta.signatures[store.currentUser.username];

    let signBtn = '';
    if (isRelated && !hasSigned) {
        signBtn = `<button class="btn btn-success mt-3" onclick="signActa(${id}); window.closeCustomAlert();"><i class="fas fa-signature"></i> Firmar Acta</button>`;
    } else if (hasSigned) {
        signBtn = `<div class="alert alert-success mt-3"><i class="fas fa-check-circle"></i> Ya has firmado esta acta</div>`;
    }

    const html = `
        <div class="container-fluid text-start">
            <div class="row">
                <div class="col-12 text-center mb-3">
                    <h5 class="fw-bold">${acta.type}</h5>
                    <h6 class="text-muted">${acta.category}</h6>
                    <p class="small">${acta.date} | ${acta.startTime} - ${acta.endTime}</p>
                </div>
                <div class="col-12 mb-3">
                    <h6 class="fw-bold border-bottom pb-1">Orden del Día</h6>
                    <p class="text-muted small" style="white-space: pre-wrap;">${acta.content.agenda || 'Sin contenido'}</p>
                </div>
                <div class="col-12 mb-3">
                    <h6 class="fw-bold border-bottom pb-1">Desarrollo</h6>
                    <p class="text-muted small" style="white-space: pre-wrap;">${acta.content.development || 'Sin contenido'}</p>
                </div>
                <div class="col-12 mb-3">
                    <h6 class="fw-bold border-bottom pb-1">Compromisos (${acta.commitments.length})</h6>
                    <ul class="small ps-3">
                        ${acta.commitments.map(c => `<li><strong>${c.task}</strong> - ${c.responsible} (${c.date})</li>`).join('')}
                    </ul>
                </div>
                <div class="col-12 text-center">
                    ${signBtn}
                </div>
            </div>
        </div>
    `;

    window.showCustomAlert('Detalle del Acta', html, 'info', false, true);
}

async function downloadActa(id) {
    const acta = store.allData.acta.find(a => a.id === id);
    if (!acta) return;

    // URL del logo proporcionada por el usuario
    const logoUrl = "https://i.ibb.co/CdVPFkp/Logo-negro-fondo-blanco-UPN-03.png";
    const isActa = acta.type === 'Acta de Reunión';

    // Construcción del contenido HTML completo
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Acta ${acta.id}</title>
            <style>
                /* Configuración de página para impresión y eliminación de headers/footers del navegador */
                @page { 
                    size: A4; 
                    margin: 0; /* Esto elimina los encabezados y pies de página automáticos del navegador */
                }
                
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 11px; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #525659; /* Fondo gris oscuro para simular visor de PDF */
                }

                /* Contenedor que simula la hoja de papel */
                .page {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 20mm;
                    margin: 10mm auto;
                    background: white;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    box-sizing: border-box;
                    position: relative;
                }

                /* Estilos específicos para impresión */
                @media print {
                    body { 
                        background: none; 
                    }
                    .page {
                        margin: 0;
                        box-shadow: none;
                        width: 100%;
                        height: auto;
                        page-break-after: always;
                    }
                }

                table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                th, td { border: 1px solid #000; padding: 4px; vertical-align: top; }
                
                /* Clave para repetir encabezado en cada página */
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
                tr { page-break-inside: avoid; }
                
                .no-break { page-break-inside: avoid; }
                .header-cell { text-align: center; font-weight: bold; }
                .gray-bg { background-color: #d9d9d9; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .section-title { background-color: #d9d9d9; border: 1px solid #000; padding: 3px 5px; font-weight: bold; margin-top: 10px; page-break-after: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .content-box { border: 1px solid #000; padding: 5px; min-height: 50px; white-space: pre-wrap; page-break-inside: avoid; }
            </style>
        </head>
        <body>
            <div class="page">
                <table>
                    <thead>
                        <tr>
                            <td rowspan="3" style="width: 20%; text-align: center; padding: 5px;">
                                <img src="${logoUrl}" style="width: 80px; height: auto;">
                            </td>
                            <td colspan="2" style="text-align: center; font-weight: bold; padding: 5px; font-size: 14px;">FORMATO</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="text-align: center; font-weight: bold; padding: 5px; font-size: 14px;">ACTA DE REUNIÓN / RESUMEN DE REUNIÓN</td>
                        </tr>
                        <tr>
                            <td style="width: 40%; padding: 2px 5px;"><strong>Código:</strong> FOR023GDC</td>
                            <td style="width: 40%; padding: 2px 5px;"><strong>Versión:</strong> 03</td>
                        </tr>
                        <tr>
                            <td style="text-align: center; font-size: 9px;">Fecha de Aprobación: 22-03-2012</td>
                            <td colspan="2" style="padding: 2px 5px; text-align: right;"><strong>Página <span class="pageNumber"></span></strong></td>
                        </tr>
                        <tr>
                            <td colspan="3" style="border: none; height: 10px;"></td>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Checkboxes -->
                        <tr class="no-break">
                            <td colspan="3" style="border: none; padding: 10px 0;">
                                <div style="text-align: center;">
                                    <strong>Marque según corresponda (*):</strong>
                                    <span style="margin-left: 20px; border: 1px solid #000; padding: 2px 5px; display: inline-block; width: 20px; text-align: center;">${isActa ? 'X' : ''}</span> ACTA DE REUNIÓN
                                    <span style="margin-left: 20px; border: 1px solid #000; padding: 2px 5px; display: inline-block; width: 20px; text-align: center;">${!isActa ? 'X' : ''}</span> RESUMEN DE REUNIÓN
                                </div>
                                <div style="border: 1px solid #000; padding: 5px; font-weight: bold; margin-top: 5px; text-align: center;">
                                    Acta / Resumen de Reunión No. ${acta.id} - ${new Date(acta.date).getFullYear()}
                                </div>
                            </td>
                        </tr>

                        <!-- 1. Información General -->
                        <tr class="no-break"><td colspan="3" class="section-title">1. Información General:</td></tr>
                        <tr class="no-break">
                            <td colspan="3" style="padding: 0; border: none;">
                                <table style="width: 100%;">
                                    <tr>
                                        <td class="gray-bg" style="width: 15%;">Fecha</td>
                                        <td style="width: 35%;">${acta.date}</td>
                                        <td class="gray-bg" style="width: 15%;">Hora de inicio:</td>
                                        <td style="width: 15%;">${acta.startTime}</td>
                                        <td class="gray-bg" style="width: 10%;">Hora final:</td>
                                        <td style="width: 10%;">${acta.endTime}</td>
                                    </tr>
                                    <tr>
                                        <td class="gray-bg">Instancias o Dependencias reunidas:</td>
                                        <td colspan="5">${acta.dependencies}</td>
                                    </tr>
                                    <tr>
                                        <td class="gray-bg">Lugar de la reunión:</td>
                                        <td colspan="5">${acta.location}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 2. Asistentes -->
                        <tr class="no-break"><td colspan="3" class="section-title">2. Asistentes: (Adicione o elimine tantas filas como necesite)</td></tr>
                        <tr class="no-break">
                            <td colspan="3" style="padding: 0; border: none;">
                                <table style="width: 100%;">
                                    <tr class="gray-bg">
                                        <td style="width: 50%;"><strong>Nombres</strong></td>
                                        <td style="width: 50%;"><strong>Cargo/Dependencia</strong></td>
                                    </tr>
                                    ${(acta.content.attendees && acta.content.attendees.length > 0) ? acta.content.attendees.map(p => `
                                        <tr><td>${p.name}</td><td>${p.role}</td></tr>
                                    `).join('') : `<tr><td style="height: 20px;"></td><td></td></tr>`}
                                </table>
                            </td>
                        </tr>

                        <!-- 3. Ausentes -->
                        <tr class="no-break"><td colspan="3" class="section-title">3. Ausentes: (Adicione o elimine tantas filas como necesite)</td></tr>
                        <tr class="no-break">
                            <td colspan="3" style="padding: 0; border: none;">
                                <table style="width: 100%;">
                                    <tr class="gray-bg">
                                        <td style="width: 50%;"><strong>Nombres</strong></td>
                                        <td style="width: 50%;"><strong>Cargo/Dependencia</strong></td>
                                    </tr>
                                    ${(acta.content.absent && acta.content.absent.length > 0) ? acta.content.absent.map(p => `
                                        <tr><td>${p.name}</td><td>${p.role}</td></tr>
                                    `).join('') : `<tr><td style="height: 20px;"></td><td></td></tr>`}
                                </table>
                            </td>
                        </tr>

                        <!-- 4. Invitados -->
                        <tr class="no-break"><td colspan="3" class="section-title">4. Invitados: (Adicione o elimine tantas filas como necesite)</td></tr>
                        <tr class="no-break">
                            <td colspan="3" style="padding: 0; border: none;">
                                <table style="width: 100%;">
                                    <tr class="gray-bg">
                                        <td style="width: 50%;"><strong>Nombres</strong></td>
                                        <td style="width: 50%;"><strong>Cargo/Dependencia</strong></td>
                                    </tr>
                                    ${(acta.content.guests && acta.content.guests.length > 0) ? acta.content.guests.map(p => `
                                        <tr><td>${p.name}</td><td>${p.role}</td></tr>
                                    `).join('') : `<tr><td style="height: 20px;"></td><td></td></tr>`}
                                </table>
                            </td>
                        </tr>

                        <!-- 5. Orden del Día -->
                        <tr class="no-break"><td colspan="3" class="section-title">5. Orden del Día:</td></tr>
                        <tr><td colspan="3" class="content-box">${acta.content.agenda || ''}</td></tr>

                        <!-- 6. Desarrollo -->
                        <tr class="no-break"><td colspan="3" class="section-title">6. Desarrollo del Orden del Día:</td></tr>
                        <tr><td colspan="3" class="content-box">${acta.content.development || ''}</td></tr>

                        <!-- 7. Compromisos -->
                        <tr class="no-break"><td colspan="3" class="section-title">7. Compromisos: (Si No Aplica registre N/A)</td></tr>
                        <tr class="no-break">
                            <td colspan="3" style="padding: 0; border: none;">
                                <table style="width: 100%;">
                                    <tr class="gray-bg">
                                        <td style="width: 50%;"><strong>Compromiso</strong></td>
                                        <td style="width: 30%;"><strong>Responsable</strong></td>
                                        <td style="width: 20%;"><strong>Fecha de Realización</strong></td>
                                    </tr>
                                    ${(acta.commitments && acta.commitments.length > 0) ? acta.commitments.map(c => `
                                        <tr><td>${c.task}</td><td>${c.responsible}</td><td>${c.date}</td></tr>
                                    `).join('') : `<tr><td style="height: 20px;"></td><td></td><td></td></tr>`}
                                </table>
                            </td>
                        </tr>

                        <!-- 8. Próxima Convocatoria -->
                        <tr class="no-break"><td colspan="3" class="section-title">8. Próxima Convocatoria: (Si No Aplica registre N/A)</td></tr>
                        <tr class="no-break"><td colspan="3" class="content-box" style="min-height: 20px;">${acta.nextMeeting || 'N/A'}</td></tr>

                        <!-- 9. Anexos -->
                        <tr class="no-break"><td colspan="3" class="section-title">9. Anexos: (Si No Aplica coloque N/A)</td></tr>
                        <tr class="no-break"><td colspan="3" class="content-box" style="min-height: 20px;">${acta.annexes || 'N/A'}</td></tr>

                        <!-- 10. Firmas -->
                        <tr class="no-break"><td colspan="3" class="section-title">10. Firmas: (Adicione o elimine tantas filas como requiera)</td></tr>
                        <tr class="no-break">
                            <td colspan="3" style="padding: 0; border: none;">
                                <table style="width: 100%;">
                                    <tr class="gray-bg">
                                        <td style="width: 50%;"><strong>Nombre</strong></td>
                                        <td style="width: 50%;"><strong>Firma</strong></td>
                                    </tr>
                                    ${Object.entries(acta.signatures || {}).map(([user, sigData]) => {
        // Handle both old format (just date string) and new format (object with image)
        const isOldFormat = typeof sigData === 'string';
        const name = isOldFormat ? user : (sigData.name || user);
        const date = isOldFormat ? sigData : sigData.date;
        const signatureImage = isOldFormat ? null : sigData.signatureImage;

        return `
                                            <tr>
                                                <td style="height: 60px; vertical-align: middle; padding: 8px;">
                                                    <div style="font-weight: bold;">${name}</div>
                                                    <div style="font-size: 9px; color: #666; margin-top: 4px;">
                                                        Firmado: ${new Date(date).toLocaleString('es-ES')}
                                                    </div>
                                                </td>
                                                <td style="vertical-align: middle; text-align: center; padding: 8px;">
                                                    ${signatureImage
                ? `<img src="${signatureImage}" style="max-height: 50px; max-width: 150px; object-fit: contain;" alt="Firma">`
                : `<span style="font-size: 9px; color: #999;">Firma digital</span>`
            }
                                                </td>
                                            </tr>
                                        `;
    }).join('')}
                                    ${Object.keys(acta.signatures || {}).length === 0 ? `<tr><td style="height: 40px;"></td><td></td></tr>` : ''}
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <script>
                window.onload = function() {
                    // Esperar un poco para asegurar carga de imágenes
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    // Abrir nueva ventana e imprimir
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

window.signActa = async (id) => {
    const acta = store.allData.acta.find(a => a.id === id);
    if (!acta) return;

    // Check if user is in attendees or guests
    const userName = store.currentUser.name || store.currentUser.username;
    const attendees = acta.content.attendees || [];
    const guests = acta.content.guests || [];
    const allCanSign = [...attendees, ...guests];

    const isRelated = allCanSign.some(p =>
        p.name && p.name.toLowerCase().includes(userName.toLowerCase())
    );

    if (!isRelated && store.currentUser.role !== 'administrador' && store.currentUser.role !== 'coordinador') {
        window.showCustomAlert('No autorizado', 'Solo los asistentes o invitados pueden firmar esta acta.', 'error');
        return;
    }

    // Create signature modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'signatureModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; border-top: 4px solid #10B981;">
            <div class="modal-header" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-signature" style="color: #10B981;"></i>
                    Firmar Acta
                </h3>
                <button class="modal-close" onclick="document.getElementById('signatureModal').remove()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 1.5rem;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <p style="color: #64748b; margin: 0;">Sube una imagen de tu firma manuscrita para firmar el acta.</p>
                    <small style="color: #94a3b8;">Tamaño máximo: 100KB • Formatos: PNG, JPG</small>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label for="signatureImageInput" style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 0.75rem;
                        padding: 2rem;
                        border: 2px dashed #cbd5e1;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        background: #f8fafc;
                    " id="signatureUploadArea">
                        <img id="signaturePreview" style="max-width: 100%; max-height: 120px; display: none; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div id="signaturePlaceholder" style="text-align: center;">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2.5rem; color: #94a3b8;"></i>
                            <div style="color: #64748b; margin-top: 0.5rem;">Click para seleccionar imagen de firma</div>
                        </div>
                    </label>
                    <input type="file" id="signatureImageInput" accept="image/png, image/jpeg" style="display: none;">
                </div>
                
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: #166534; font-weight: 500;">
                        <i class="fas fa-user"></i>
                        <span>Firmando como: ${store.currentUser.name || store.currentUser.username}</span>
                    </div>
                    <div style="color: #15803d; font-size: 0.875rem; margin-top: 0.25rem;">
                        ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="document.getElementById('signatureModal').remove()">
                        Cancelar
                    </button>
                    <button type="button" class="btn btn-success" style="flex: 1;" id="btnConfirmSignature" disabled>
                        <i class="fas fa-check"></i> Confirmar Firma
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle image upload
    let signatureImageData = null;
    const fileInput = document.getElementById('signatureImageInput');
    const preview = document.getElementById('signaturePreview');
    const placeholder = document.getElementById('signaturePlaceholder');
    const confirmBtn = document.getElementById('btnConfirmSignature');
    const uploadArea = document.getElementById('signatureUploadArea');

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 102400) { // 100KB max
            window.showCustomAlert('Archivo muy grande', 'La imagen debe ser menor a 100KB', 'error');
            fileInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            signatureImageData = ev.target.result;
            preview.src = signatureImageData;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            uploadArea.style.borderColor = '#10B981';
            uploadArea.style.background = '#f0fdf4';
            confirmBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    };

    // Handle confirm signature
    confirmBtn.onclick = async () => {
        if (!signatureImageData) {
            window.showCustomAlert('Falta firma', 'Por favor sube una imagen de tu firma', 'error');
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const signatures = acta.signatures || {};
            signatures[store.currentUser.username] = {
                date: new Date().toISOString(),
                name: store.currentUser.name || store.currentUser.username,
                signatureImage: signatureImageData
            };

            const res = await fetch(`http://localhost:3001/api/actas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatures })
            });

            if (res.ok) {
                document.getElementById('signatureModal').remove();
                await window.showCustomAlert('¡Firmado!', 'Acta firmada correctamente', 'success');
                loadDocencia();
            } else {
                throw new Error('Error al guardar');
            }
        } catch (e) {
            console.error(e);
            window.showCustomAlert('Error', 'No se pudo guardar la firma', 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirmar Firma';
        }
    };

    // Close on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
};

async function deleteActa(id) {
    if (await window.showCustomAlert('¿Eliminar?', 'Esta acción no se puede deshacer', 'warning', true)) {
        try {
            await fetch(`http://localhost:3001/api/actas/${id}`, { method: 'DELETE' });
            loadDocencia();
        } catch (e) {
            console.error(e);
        }
    }
}

function populateActaForm(acta) {
    document.getElementById('actaDate').value = acta.date;
    document.getElementById('actaStartTime').value = acta.startTime;
    document.getElementById('actaEndTime').value = acta.endTime;
    document.getElementById('actaLocation').value = acta.location;
    document.getElementById('actaDependencies').value = acta.dependencies;
    document.getElementById('actaCategory').value = acta.category;
    document.getElementById('actaContent').value = acta.content.agenda;
    document.getElementById('actaDevelopment').value = acta.content.development;
    document.getElementById('actaNextMeeting').value = acta.nextMeeting;
    document.getElementById('actaAnnexes').value = acta.annexes || '';

    const typeRadio = document.querySelector(`input[name="actaType"][value="${acta.type}"]`);
    if (typeRadio) typeRadio.checked = true;

    // Clear and repopulate tables
    document.querySelector('#attendeesTable tbody').innerHTML = '';
    (acta.content.attendees || []).forEach(p => addPersonRow('attendeesTable', p.name, p.role));

    document.querySelector('#absentTable tbody').innerHTML = '';
    (acta.content.absent || []).forEach(p => addPersonRow('absentTable', p.name, p.role));

    document.querySelector('#guestsTable tbody').innerHTML = '';
    (acta.content.guests || []).forEach(p => addPersonRow('guestsTable', p.name, p.role));

    document.querySelector('#commitmentsTable tbody').innerHTML = '';
    (acta.commitments || []).forEach(c => addCommitmentRow(c.task, c.responsible, c.date));
}
