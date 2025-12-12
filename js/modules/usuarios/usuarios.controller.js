import { store } from '../../core/store.js';
import { showNotification } from '../../core/utils.js';
import { TableManager } from '../../core/table-manager.js';

console.log('🚀 Módulo Usuarios cargado');

let usuariosTable;
let currentProfessorId = null;

function openProfModal(mode, id = null) {
  console.log('=== ABRIENDO FORMULARIO PREMIUM DE USUARIO ===');
  window.showForm(mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario');

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
              <option value="estudiante">Estudiante</option>
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
      <button type="button" id="btnSaveProfessor" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
    </div>
  `;

  profForm.style.display = 'block';

  document.getElementById('profPhotoInput').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 102400) { // 100KB limit
        alert('La imagen es demasiado pesada. El tamaño máximo permitido es 100KB.');
        e.target.value = ''; // Clear input
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('profPhotoPreview').src = ev.target.result;
        document.getElementById('profPhotoPreview').style.display = 'block';
        document.getElementById('profPhotoPlaceholder').style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  };

  // Use onclick instead of onsubmit to prevent ANY chance of page reload
  document.getElementById('btnSaveProfessor').onclick = (e) => {
    e.preventDefault(); // Just in case
    saveProfessor();
  };

  // Remove onsubmit just to be safe
  profForm.onsubmit = (e) => { e.preventDefault(); return false; };

  profForm.querySelector('.btn-cancel').onclick = () => {
    window.showDataSection('roles-permisos');
  };
}

function loadProfessorData(id) {
  const prof = store.professors.find(p => p.id == id);
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

async function saveProfessor() {
  // ========== VALIDACIÓN INLINE DEL FRONTEND ==========
  let hasErrors = false;

  // Helper para mostrar/limpiar error en un campo
  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.style.borderColor = '#e53e3e';
    field.style.boxShadow = '0 0 0 3px rgba(229, 62, 62, 0.2)';

    // Crear o actualizar mensaje de error
    let errorEl = field.parentElement.querySelector('.field-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'field-error';
      errorEl.style.cssText = 'color: #e53e3e; font-size: 12px; display: block; margin-top: 4px;';
      field.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
    hasErrors = true;
  }

  function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.style.borderColor = '';
    field.style.boxShadow = '';

    const errorEl = field.parentElement.querySelector('.field-error');
    if (errorEl) errorEl.remove();
  }

  // Limpiar errores anteriores
  ['profFirstName', 'profLastName1', 'profIdNum', 'profEmail', 'profPhone', 'profRole'].forEach(clearFieldError);

  // Obtener valores
  const firstName = document.getElementById('profFirstName').value.trim();
  const lastName1 = document.getElementById('profLastName1').value.trim();
  const identification = document.getElementById('profIdNum').value.trim();
  const email = document.getElementById('profEmail').value.trim();
  const phone = document.getElementById('profPhone').value.trim();
  const role = document.getElementById('profRole').value;

  // Validar cada campo
  if (!firstName || firstName.length < 2) {
    showFieldError('profFirstName', 'Mínimo 2 caracteres');
  }

  if (!lastName1 || lastName1.length < 2) {
    showFieldError('profLastName1', 'Mínimo 2 caracteres');
  }

  if (!identification) {
    showFieldError('profIdNum', 'Campo requerido');
  } else if (identification.length < 5 || identification.length > 20) {
    showFieldError('profIdNum', 'Entre 5 y 20 caracteres');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('profEmail', 'Formato de email inválido');
  }

  if (phone && !/^[0-9\s\-\+\(\)]{7,20}$/.test(phone)) {
    showFieldError('profPhone', 'Formato inválido (7-20 dígitos)');
  }

  const validRoles = ['administrador', 'coordinador', 'profesor', 'estudiante'];
  if (!validRoles.includes(role)) {
    showFieldError('profRole', 'Seleccione un rol válido');
  }

  // Si hay errores, hacer scroll al primero y no continuar
  if (hasErrors) {
    const firstError = document.querySelector('.field-error');
    if (firstError) {
      firstError.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // ========== PROCEDER CON GUARDADO ==========
  const loadingPromise = new Promise(resolve => setTimeout(resolve, 1500));
  window.showCustomAlert('Procesando...', 'Por favor espere mientras guardamos los cambios.', 'loading');

  const btn = document.getElementById('btnSaveProfessor');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

  const preview = document.getElementById('profPhotoPreview');
  const photoData = preview.style.display !== 'none' ? preview.src : null;

  // Usar firstName/lastName1 ya declarados arriba en validación
  const lastName2 = document.getElementById('profLastName2').value.trim();

  const professorData = {
    id: currentProfessorId || 'P-' + Date.now(),
    name: `${firstName} ${lastName1} ${lastName2}`.trim(),
    email: document.getElementById('profEmail').value,
    photo: photoData,
    specialty: document.getElementById('profSpecialty').value,
    cv: document.getElementById('profCv').value,
    profile: document.getElementById('profProfile').value,
    role: document.getElementById('profRole').value,
    identification: document.getElementById('profIdNum').value,
    phone: document.getElementById('profPhone').value,
    gender: document.getElementById('profGender').value,
    sex: document.getElementById('profSex').value
  };

  try {
    const url = currentProfessorId
      ? `http://localhost:3001/api/professors/${currentProfessorId}`
      : 'http://localhost:3001/api/professors';

    const method = currentProfessorId ? 'PUT' : 'POST';

    const response = await window.authFetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(professorData)
    });

    // Wait for the minimum delay
    await loadingPromise;

    const resJson = await response.json();
    console.log('Server Response:', resJson);

    if (response.ok) {
      if (resJson.credentials) {
        console.log('Credentials found, showing modal...'); // DEBUG
        const email = professorData.email;
        const name = professorData.name;
        const username = resJson.credentials.username;
        const password = resJson.credentials.password;

        // Show Manual Credentials Modal
        showCredentialsModal(name, email, username, password);
      } else {
        await window.showCustomAlert('¡Guardado!', 'Usuario guardado exitosamente', 'success');
      }

      // Reload data manually
      try {
        const res = await window.authFetch('http://localhost:3001/api/professors');
        if (res.ok) {
          const json = await res.json();
          store.professors = json.data;

          // Correctly navigate back to the professors list using the main app logic
          if (window.showDataSection) {
            window.showDataSection('roles-permisos');
          } else {
            // Fallback if function not found
            loadUsuarios();
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('dataSection').style.display = 'block';
            document.getElementById('formSection').style.display = 'none';
            document.getElementById('sectionTitle').textContent = 'Gestión de Usuarios';
          }
        }
      } catch (err) {
        console.error("Error reloading data:", err);
      }
    } else {
      // Usar resJson que ya fue parseado arriba
      window.showCustomAlert('Error', 'Error al guardar: ' + (resJson.error || resJson.message || JSON.stringify(resJson.details)), 'error');
    }
  } catch (e) {
    console.error(e);
    window.showCustomAlert('Error', 'Error de conexión con el servidor', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
    // Only close if it's still the loading alert (success/error alerts handle their own closing via user interaction)
    // Actually, showCustomAlert replaces the content, so we don't need to explicitly close unless we want to clear it.
    // But since we awaited the success alert above, it's already closed by the user.
    // If it was an error, the user clicked OK.
    // So we don't need window.closeCustomAlert() here, it might close a subsequent alert if we are not careful.
    // However, for safety, if we are just finishing the loading state without a result alert (unlikely path), we might need it.
    // But in this flow, we always showed a result alert.
    // The previous code had window.closeCustomAlert() in finally, which might have been closing the SUCCESS alert immediately if it wasn't awaited properly?
    // No, I awaited it. But let's remove the forced close in finally to be safe.
  }
}

window.openProfModal = openProfModal;

async function deleteProf(id) {
  const result = await window.showCustomAlert(
    '¿Estás seguro?',
    "No podrás revertir esta acción",
    'warning',
    true // showCancel
  );

  if (result) {
    try {
      // Show loading with delay
      const loadingPromise = new Promise(resolve => setTimeout(resolve, 1500));
      window.showCustomAlert('Eliminando...', 'Por favor espere.', 'loading');

      const response = await window.authFetch(`http://localhost:3001/api/professors/${id}`, {
        method: 'DELETE'
      });

      await loadingPromise;

      if (response.ok) {
        await window.showCustomAlert('¡Eliminado!', 'El usuario ha sido eliminado.', 'success');

        // Reload data manually
        try {
          const res = await window.authFetch('http://localhost:3001/api/professors');
          if (res.ok) {
            const json = await res.json();
            store.professors = json.data;
            // loadUsuarios(); // Removed redundant call

            // Ensure we stay on list using the main app logic
            if (window.showDataSection) {
              window.showDataSection('roles-permisos');
            } else {
              loadUsuarios();
              document.getElementById('dashboard').style.display = 'none';
              document.getElementById('dataSection').style.display = 'block';
              document.getElementById('formSection').style.display = 'none';
            }
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        window.showCustomAlert('Error', 'Error al eliminar', 'error');
      }
    } catch (e) {
      console.error(e);
      window.showCustomAlert('Error', 'Error de conexión', 'error');
    }
  }
}

window.deleteProf = deleteProf;

export function loadUsuarios() {
  const btn = document.getElementById('btnNew');
  const btnText = document.getElementById('btnNewText');
  const thead = document.getElementById('tableHeader');
  const tbody = document.getElementById('tableBody');

  if (thead) thead.innerHTML = '';
  if (tbody) tbody.innerHTML = '';
  if (btnText) btnText.textContent = 'Nuevo Usuario';
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
        { header: 'Rol', field: 'role' },
        {
          header: 'Perfil',
          field: 'id',
          render: (item) => `<button class="btn btn-sm btn-info" onclick="window.showProfessorProfile('${item.id}')" title="Ver Perfil"><i class="fas fa-id-card"></i></button>`
        },
        {
          header: 'Acciones',
          field: 'id',
          render: (item) => `
            <div style="display:flex;gap:5px;justify-content:center;">
              <button class="btn btn-sm btn-warning" onclick="window.showInviteModal('${item.id}')" title="Invitar (Gmail)"><i class="fas fa-envelope"></i></button>
              <button class="btn btn-sm btn-primary" onclick="window.openProfModal('edit', '${item.id}')" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="window.deleteProf('${item.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
          `
        }
      ],
      actions: {} // Desactivamos acciones automáticas para usar la columna personalizada
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
        <h3>Perfil del Usuario</h3>
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
        
        <button class="btn btn-primary" style="width:100%;margin-top:1rem;" onclick="window.showInviteModal('${prof.id}')">
          <i class="fas fa-envelope"></i> Enviar Invitación
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

// Función para enviar correo desde el perfil (usando la misma lógica de invitación)
window.sendEmailToProfessor = function (email, name) {
  const prof = store.professors.find(p => p.email === email);
  if (prof) {
    window.showInviteModal(prof.id);
  } else {
    const subject = encodeURIComponent("Comunicado Rekreo");
    window.location.href = `mailto:${email}?subject=${subject}`;
  }
};

// Nueva Función: Modal de Invitación con Logo y Gmail
window.showInviteModal = function (id) {
  const prof = store.professors.find(p => p.id == id);
  if (!prof) return;

  const username = prof.identification || 'No definido';
  const password = prof.identification || 'No definido';

  const subject = "Bienvenido a Rekreo - Credenciales de Acceso";
  const body = `Hola ${prof.name},\n\nTu cuenta ha sido creada exitosamente.\n\nUsuario: ${username}\nContraseña: ${password}\n\nPor favor ingresa al sistema y cambia tu contraseña inmediatamente.\n\nSaludos,\nAdministración.`;

  // Enlace para Gmail Web
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${prof.email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px; border-top: 5px solid #EAB308;">
      <div class="modal-header" style="border-bottom:none; padding-bottom:0;">
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body" style="text-align:center; padding-top:0;">
        <img src="https://i.ibb.co/CdVPFkp/Logo-negro-fondo-blanco-UPN-03.png" alt="Logo UPN" style="max-width:150px; margin-bottom:1.5rem;">
        
        <h2 style="color:#1e293b; margin-bottom:0.5rem;">Enviar Credenciales</h2>
        <p style="color:#64748b; margin-bottom:1.5rem;">Se enviarán los siguientes datos de acceso a <strong>${prof.email}</strong></p>
        
        <div style="background:#f1f5f9; border-radius:12px; padding:1.5rem; margin-bottom:1.5rem; text-align:left; border:1px solid #e2e8f0;">
          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.75rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Usuario</label>
            <div style="font-family:monospace; font-size:1.1rem; color:#0f172a; background:white; padding:0.5rem; border-radius:6px; border:1px solid #cbd5e1;">${username}</div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Contraseña</label>
            <div style="font-family:monospace; font-size:1.1rem; color:#0f172a; background:white; padding:0.5rem; border-radius:6px; border:1px solid #cbd5e1;">${password}</div>
          </div>
        </div>

        <a href="${gmailLink}" target="_blank" class="btn btn-primary" style="width:100%; display:flex; align-items:center; justify-content:center; gap:0.5rem; font-size:1.1rem; padding:0.75rem;">
          <i class="fas fa-envelope"></i> Redactar en Gmail
        </a>
        <p style="font-size:0.8rem; color:#94a3b8; margin-top:1rem;">Esto abrirá una nueva pestaña en Gmail con el mensaje pre-cargado.</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
};








