import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';
import { TableManager } from '../../core/table-manager.js';

console.log('🚀 Módulo Usuarios cargado');

let usuariosTable;
let currentProfessorId = null;

function openProfModal(mode, id = null) {
  console.log('=== ABRIENDO FORMULARIO PREMIUM DE PROFESOR ===');
  window.showForm(mode === 'create' ? 'Nuevo Profesor' : 'Editar Profesor');

  currentProfessorId = id;

  const dataForm = document.getElementById('dataForm');
  if (dataForm) dataForm.style.display = 'none';

  setTimeout(() => {
    injectPremiumForm();
    if (mode === 'edit' && id) loadProfessorData(id);
  }, 50);
}

function injectPremiumForm() {
  const profForm = document.getElementById('profForm');
  if (!profForm) return;

  profForm.innerHTML = `
    <style>
      .professor-form-layout {
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: 2rem;
        margin-bottom: 1.5rem;
      }
      .prof-photo-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }
      .prof-photo-upload-area {
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
        overflow: hidden;
      }
      .prof-photo-upload-area:hover {
        border-color: #4299e1;
        background: #ebf8ff;
      }
      .prof-photo-preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: none;
      }
      .prof-photo-placeholder {
        text-align: center;
        color: #a0aec0;
      }
      .prof-photo-placeholder i {
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }
    </style>
    
    <div class="professor-form-layout">
      <div class="prof-photo-section">
        <h4 style="margin:0;font-size:1rem;color:#2d3748;">Fotografía</h4>
        <label for="profPhotoInput" class="prof-photo-upload-area">
          <img id="profPhotoPreview" class="prof-photo-preview">
          <div class="prof-photo-placeholder" id="profPhotoPlaceholder">
            <i class="fas fa-user-tie"></i>
            <div style="font-size:0.875rem;">Click para subir foto</div>
          </div>
        </label>
        <input type="file" id="profPhotoInput" style="display:none;" accept="image/*">
        <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('profPhotoInput').click()">
          <i class="fas fa-upload"></i> Cambiar Foto
        </button>
      </div>
      
      <div class="prof-fields-section">
        <div class="form-row">
          <div class="form-group">
            <label>Nombres *</label>
            <input id="profFirstName" class="form-control" required>
          </div>
          <div class="form-group">
            <label>Primer Apellido *</label>
            <input id="profLastName1" class="form-control" required>
          </div>
          <div class="form-group">
            <label>Segundo Apellido</label>
            <input id="profLastName2" class="form-control">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Cédula *</label>
            <input id="profIdNum" class="form-control" required>
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input id="profPhone" class="form-control" placeholder="Ej: +57 300 123 4567">
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input id="profEmail" type="email" class="form-control" required>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Género *</label>
            <select id="profGender" class="form-control" required>
              <option value="">-- Seleccionar --</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
              <option value="Prefiero no decir">Prefiero no decir</option>
            </select>
          </div>
          <div class="form-group">
            <label>Sexo Biológico *</label>
            <select id="profSex" class="form-control" required>
              <option value="">-- Seleccionar --</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Intersexual">Intersexual</option>
            </select>
          </div>
          <div class="form-group">
            <label>Especialidad</label>
            <input id="profSpecialty" class="form-control" placeholder="Área de especialización">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Rol en el Sistema *</label>
            <select id="profRole" class="form-control" required>
              <option value="profesor">Profesor</option>
              <option value="coordinador">Coordinador</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>Datos del CV / Formación Académica</label>
          <textarea id="profCv" class="form-control" rows="3" placeholder="Títulos, certificaciones, experiencia..."></textarea>
        </div>
        
        <div class="form-group">
          <label>Perfil Profesional</label>
          <textarea id="profProfile" class="form-control" rows="3" placeholder="Descripción breve del perfil profesional..."></textarea>
        </div>
      </div>
    </div>
    
    <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:1.5rem;border-top:1px solid #e2e8f0;padding-top:1rem">
      <button type="button" class="btn btn-secondary btn-cancel">Cancelar</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
    </div>
  `;

  profForm.style.display = 'block';

  document.getElementById('profPhotoInput').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('profPhotoPreview').src = ev.target.result;
        document.getElementById('profPhotoPreview').style.display = 'block';
        document.getElementById('profPhotoPlaceholder').style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  };

  profForm.onsubmit = (e) => {
    e.preventDefault();
    saveProfessor();
  };

  profForm.querySelector('.btn-cancel').onclick = () => {
    window.showDataSection('roles-permisos');
  };
}

function loadProfessorData(id) {
  const prof = store.professors.find(p => p.id === id);
  if (!prof) return;

  if (prof.firstName) {
    document.getElementById('profFirstName').value = prof.firstName;
    document.getElementById('profLastName1').value = prof.lastName1;
    document.getElementById('profLastName2').value = prof.lastName2 || '';
  } else {
    const parts = prof.name.split(' ');
    if (parts.length > 2) {
      document.getElementById('profFirstName').value = parts.slice(0, -2).join(' ');
      document.getElementById('profLastName1').value = parts[parts.length - 2];
      document.getElementById('profLastName2').value = parts[parts.length - 1];
    } else if (parts.length === 2) {
      document.getElementById('profFirstName').value = parts[0];
      document.getElementById('profLastName1').value = parts[1];
    } else {
      document.getElementById('profFirstName').value = prof.name;
    }
  }

  document.getElementById('profIdNum').value = prof.identification || '';
  document.getElementById('profPhone').value = prof.phone || '';
  document.getElementById('profEmail').value = prof.email;
  document.getElementById('profGender').value = prof.gender || '';
  document.getElementById('profSex').value = prof.sex || '';
  document.getElementById('profSpecialty').value = prof.specialty || '';
  document.getElementById('profCv').value = prof.cv || '';
  document.getElementById('profProfile').value = prof.profile || '';
  document.getElementById('profRole').value = prof.role || 'profesor';

  if (prof.photo) {
    document.getElementById('profPhotoPreview').src = prof.photo;
    document.getElementById('profPhotoPreview').style.display = 'block';
    document.getElementById('profPhotoPlaceholder').style.display = 'none';
  }
}

function saveProfessor() {
  const preview = document.getElementById('profPhotoPreview');
  const photoData = preview.style.display !== 'none' ? preview.src : null;

  const firstName = document.getElementById('profFirstName').value;
  const lastName1 = document.getElementById('profLastName1').value;
  const lastName2 = document.getElementById('profLastName2').value;

  const professorData = {
    id: currentProfessorId || Date.now(),
    firstName,
    lastName1,
    lastName2,
    name: `${firstName} ${lastName1} ${lastName2}`.trim(),
    identification: document.getElementById('profIdNum').value,
    phone: document.getElementById('profPhone').value,
    email: document.getElementById('profEmail').value,
    gender: document.getElementById('profGender').value,
    sex: document.getElementById('profSex').value,
    specialty: document.getElementById('profSpecialty').value,
    cv: document.getElementById('profCv').value,
    profile: document.getElementById('profProfile').value,
    role: document.getElementById('profRole').value,
    photo: photoData
  };

  const idx = store.professors.findIndex(p => p.id === professorData.id);
  if (idx !== -1) {
    store.professors[idx] = professorData;
    showNotification('Profesor actualizado');
  } else {
    store.professors.push(professorData);
    showNotification('Profesor creado');
  }

  window.showDataSection('roles-permisos');
}

function deleteProf(id) {
  if (confirm('¿Eliminar profesor?')) {
    store.professors = store.professors.filter(p => p.id !== id);
    loadUsuarios();
    showNotification('Profesor eliminado');
  }
}

window.openProfModal = openProfModal;
window.deleteProf = deleteProf;

export function loadUsuarios() {
  const btn = document.getElementById('btnNew');
  const btnText = document.getElementById('btnNewText');
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');

  if (thead) thead.innerHTML = '';
  if (tbody) tbody.innerHTML = '';
  if (btnText) btnText.textContent = 'Nuevo Profesor';
  if (btn) btn.onclick = () => window.openProfModal('create');

  if (usuariosTable) {
    usuariosTable.updateData(store.professors);
  } else {
    usuariosTable = new TableManager({
      containerId: 'dataSection',
      data: store.professors,
      columns: [
        {
          header: 'Foto',
          field: 'photo',
          render: (item) => {
            if (item.photo) {
              return `<img src="${item.photo}" alt="${item.name}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`;
            }
            return `<div style="width:40px;height:40px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#666;">${item.name ? item.name[0] : '?'}</div>`;
          }
        },
        {
          header: 'Nombre',
          field: 'name',
          render: (item) => {
            if (item.lastName1) {
              return `<strong>${item.lastName1} ${item.lastName2 || ''}</strong>, ${item.firstName}`;
            }
            return item.name;
          }
        },
        { header: 'Identificación', field: 'identification' },
        { header: 'Email', field: 'email' },
        { header: 'Teléfono', field: 'phone' },
        { header: 'Especialidad', field: 'specialty' },
        {
          header: 'Perfil',
          field: 'id',
          render: (item) => `<button class="btn btn-sm btn-info" onclick="window.showProfessorProfile('${item.id}')" title="Ver Perfil"><i class="fas fa-id-card"></i></button>`
        }
      ],
      actions: { edit: true, delete: true },
      onEdit: (id) => window.openProfModal('edit', id),
      onDelete: (id) => window.deleteProf(id)
    });
  }
}

// Modal de perfil de profesor
window.showProfessorProfile = function (profId) {
  const prof = store.professors.find(p => p.id == profId);
  if (!prof) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header">
        <h3>Perfil del Profesor</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body" style="text-align:center;">
        ${prof.photo ?
      `<img src="${prof.photo}" style="width:150px;height:150px;border-radius:50%;object-fit:cover;margin:1rem auto;display:block;box-shadow:0 4px 8px rgba(0,0,0,0.1);">` :
      `<div style="width:150px;height:150px;border-radius:50%;background:#e2e8f0;margin:1rem auto;display:flex;align-items:center;justify-content:center;font-size:4rem;color:#64748b;">${prof.name ? prof.name[0] : '?'}</div>`
    }
        
        <h2 style="margin:1rem 0 0.5rem;color:#1e293b;">${prof.name}</h2>
        <p style="color:#64748b;margin:0;">${prof.role ? prof.role.charAt(0).toUpperCase() + prof.role.slice(1) : 'Profesor'}</p>
        
        <div style="background:#f8fafc;border-radius:8px;padding:1.5rem;margin:1.5rem 0;text-align:left;">
          <div style="margin-bottom:1rem;">
            <strong style="color:#475569;">📧 Email:</strong>
            <div style="color:#1e293b;margin-top:0.25rem;">${prof.email}</div>
          </div>
          
          ${prof.phone ? `
          <div style="margin-bottom:1rem;">
            <strong style="color:#475569;">📱 Teléfono:</strong>
            <div style="color:#1e293b;margin-top:0.25rem;">${prof.phone}</div>
          </div>
          ` : ''}
          
          ${prof.specialty ? `
          <div style="margin-bottom:1rem;">
            <strong style="color:#475569;">🎓 Especialidad:</strong>
            <div style="color:#1e293b;margin-top:0.25rem;">${prof.specialty}</div>
          </div>
          ` : ''}
          
          ${prof.identification ? `
          <div style="margin-bottom:1rem;">
            <strong style="color:#475569;">🆔 Identificación:</strong>
            <div style="color:#1e293b;margin-top:0.25rem;">${prof.identification}</div>
          </div>
          ` : ''}
          
          ${prof.cv ? `
          <div style="margin-bottom:1rem;">
            <strong style="color:#475569;">📄 Formación:</strong>
            <div style="color:#1e293b;margin-top:0.25rem;font-size:0.9rem;">${prof.cv}</div>
          </div>
          ` : ''}
          
          ${prof.profile ? `
          <div>
            <strong style="color:#475569;">👤 Perfil:</strong>
            <div style="color:#1e293b;margin-top:0.25rem;font-size:0.9rem;">${prof.profile}</div>
          </div>
          ` : ''}
        </div>
        
        <button class="btn btn-primary" style="width:100%;margin-top:1rem;" onclick="window.sendEmailToProfessor('${prof.email}', '${prof.name.replace(/'/g, "\\'")}')">
          <i class="fas fa-envelope"></i> Enviar Correo
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
};

// Función para enviar correo
window.sendEmailToProfessor = function (email, name) {
  const subject = encodeURIComponent(`Mensaje para ${name}`);
  const body = encodeURIComponent(`Estimado/a ${name},\n\n`);

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  showNotification(`Abriendo cliente de correo para ${name}`);
};
