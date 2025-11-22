import { initAuth, logout } from './modules/auth/auth.controller.js';
import { initSidebar } from './components/Sidebar.js';
import { initModals } from './components/Modal.js';
import { loadDashboard } from './modules/dashboard/dashboard.controller.js';
import { loadDocencia } from './modules/docencia/docencia.controller.js';
import { loadPracticas } from './modules/practicas/practicas.controller.js';
import { loadUsuarios } from './modules/usuarios/usuarios.controller.js';
import { loadDocumentos } from './modules/documentos/documentos.controller.js';
import { loadGrupos } from './modules/grupos/grupos.controller.js';
import { loadPlanTrabajo } from './modules/plan-trabajo/plan-trabajo.controller.js';
import { loadUtilidades } from './modules/utilidades/utilidades.controller.js';
import { store } from './core/store.js';
import { previewImage, previewFileName } from './core/utils.js';

// Expose global functions for legacy HTML onclick support
window.logout = logout;
window.previewImage = previewImage;
window.previewFileName = previewFileName;

window.showSection = (section) => {
    document.getElementById('dashboard').style.display = section === 'dashboard' ? 'block' : 'none';
    document.getElementById('dataSection').style.display = section === 'dashboard' ? 'none' : 'block';
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('headerTitle').textContent = section === 'dashboard' ? 'Dashboard' : document.getElementById('sectionTitle').textContent;

    if (section === 'dashboard') {
        loadDashboard();
        // Update sidebar active state
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
        const homeLink = document.querySelector('.sidebar-nav .nav-item[onclick*="dashboard"]');
        if (homeLink) homeLink.classList.add('active');
    }
};

window.showDataSection = (sectionType) => {
    store.currentSection = sectionType;
    store.currentPage = 1;

    // Update Sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
    // Find the link that calls this section - simple heuristic
    const activeLink = Array.from(document.querySelectorAll('.nav-item')).find(el => el.onclick && el.onclick.toString().includes(`'${sectionType}'`));
    if (activeLink) activeLink.classList.add('active');

    const titles = {
        acta: 'Registro de Actas Estudiantiles',
        documentos: 'Gestión de Documentos',
        'admin-grupos': 'Administración de Grupos',
        'roles-permisos': 'Gestión de Profesores',
        sites: 'Administrar Sitio de Práctica',
        'plan-trabajo': 'Plan de Trabajo Docente',
        'utilidades': 'Configuración y Utilidades'
    };

    document.getElementById('sectionTitle').textContent = titles[sectionType] || 'Gestión de Datos';
    document.getElementById('headerTitle').textContent = titles[sectionType] || 'Gestión de Datos';

    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('dataSection').style.display = 'block';
    document.getElementById('formSection').style.display = 'none';

    // Clean up utility-specific elements
    const utilityTabs = document.getElementById('utilityTabs');
    if (utilityTabs) utilityTabs.remove();
    const searchBox = document.getElementById('subjectSearchBox');
    if (searchBox) searchBox.remove();

    // Clean up all custom forms to prevent duplication
    const customForms = ['facultyForm', 'programForm', 'subjectForm', 'activityForm', 'planWorkForm', 'planEditorForm'];
    customForms.forEach(formId => {
        const form = document.getElementById(formId);
        if (form) form.remove();
    });

    // Router Logic
    switch (sectionType) {
        case 'acta': loadDocencia(); break;
        case 'documentos': loadDocumentos(); break;
        case 'admin-grupos': loadGrupos(); break;
        case 'roles-permisos': loadUsuarios(); break;
        case 'sites': loadPracticas(); break;
        case 'plan-trabajo': loadPlanTrabajo(); break;
        case 'utilidades': loadUtilidades(); break;
        default: console.warn('Unknown section:', sectionType);
    }
};

window.showForm = (title) => {
    document.getElementById('dataSection').style.display = 'none';
    const formSection = document.getElementById('formSection');
    formSection.style.display = 'block';
    document.getElementById('formTitle').textContent = title;

    // SOLUCIÓN SIMPLE: Ocultar los formularios estáticos
    const dataForm = document.getElementById('dataForm');
    const profForm = document.getElementById('profForm');
    if (dataForm) dataForm.style.display = 'none';
    if (profForm) profForm.style.display = 'none';

    // Setup Cancel Button
    const cancelBtns = document.querySelectorAll('.btn-cancel');
    cancelBtns.forEach(btn => {
        btn.onclick = () => {
            window.showDataSection(store.currentSection);
        };
    });

    // Setup Header Cancel Button
    const headerCancel = document.getElementById('btnCancelForm');
    if (headerCancel) {
        headerCancel.onclick = () => {
            window.showDataSection(store.currentSection);
        };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initSidebar();
    initModals();

    // Global Error Handler
    window.addEventListener('error', e => console.error(e));
});
