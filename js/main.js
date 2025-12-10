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
import { loadPlanMejoramiento } from './modules/plan-mejoramiento/plan-mejoramiento.controller.js';
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
    if (!checkPermission(sectionType)) {
        window.showCustomAlert('Acceso Denegado', 'No tienes permisos para acceder a esta sección.', 'error');
        return;
    }

    store.currentSection = sectionType;
    localStorage.setItem('currentSection', sectionType); // Persist section
    store.currentPage = 1;

    // Update Sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
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

    // Clean up Plan de Mejoramiento elements
    const pmTabs = document.getElementById('pmTabs');
    if (pmTabs) pmTabs.remove();
    const planFiltersBar = document.getElementById('planFiltersBar');
    if (planFiltersBar) planFiltersBar.remove();
    const planDetailsBanner = document.getElementById('planDetailsBanner');
    if (planDetailsBanner) planDetailsBanner.remove();
    const plansGridContainer = document.getElementById('plansGridContainer');
    if (plansGridContainer) plansGridContainer.remove();

    // Reset Table Display (fix for Plan Mejoramiento grid mode)
    const dataTable = document.getElementById('dataTable');
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');

    if (dataTable) dataTable.style.display = '';
    if (tableHeader) tableHeader.style.display = '';
    if (tableBody) {
        tableBody.style.display = '';
        tableBody.className = ''; // Remove grid class
    }

    // Aggressive Form Cleanup
    // Remove ANY form that is not one of the static ones
    const staticForms = ['dataForm', 'profForm'];
    const formSection = document.getElementById('formSection');
    const forms = formSection.querySelectorAll('form');
    forms.forEach(f => {
        if (!staticForms.includes(f.id)) {
            f.remove();
        }
    });

    // Also ensure static forms are hidden/reset if needed
    staticForms.forEach(id => {
        const f = document.getElementById(id);
        if (f) f.style.display = 'none';
    });

    // Router Logic
    switch (sectionType) {
        case 'acta': loadDocencia(); break;
        case 'documentos': loadDocumentos(); break;
        case 'admin-grupos': loadGrupos(); break;
        case 'roles-permisos': loadUsuarios(); break;
        case 'sites': loadPracticas(); break;
        case 'plan-trabajo': loadPlanTrabajo(); break;
        case 'plan-mejoramiento': loadPlanMejoramiento(); break;
        case 'utilidades': loadUtilidades(); break;
        default: console.warn('Unknown section:', sectionType);
    }
};

window.showForm = (title) => {
    document.getElementById('dataSection').style.display = 'none';
    const formSection = document.getElementById('formSection');
    formSection.style.display = 'block';
    document.getElementById('formTitle').textContent = title;

    // 1. Ocultar formularios estáticos conocidos
    const staticForms = ['dataForm', 'profForm'];
    staticForms.forEach(id => {
        const f = document.getElementById(id);
        if (f) f.style.display = 'none';
    });

    // 2. Eliminar formularios dinámicos inyectados previamente (Aggressive Cleanup)
    // Keep only the header and static forms
    const keptIds = ['section-header', 'dataForm', 'profForm'];
    Array.from(formSection.children).forEach(child => {
        if (!keptIds.includes(child.id) && !child.classList.contains('section-header')) {
            child.remove();
        }
    });

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

    // Listen for login to update sidebar
    window.addEventListener('auth:login', (e) => {
        updateSidebar(e.detail.role);
    });
});

function updateSidebar(role) {
    const navItems = document.querySelectorAll('.sidebar-nav > .nav-item, .sidebar-nav > .submenu > .nav-item');

    // Strategy:
    // 1. Define allowed sections per role.
    // 2. Iterate all items with onclick="showDataSection(...)".
    // 3. If allowed, show. Else hide.
    // 4. Iterate all parent items (submenu triggers). If all children hidden, hide parent.

    const allowed = {
        'administrador': ['*'],
        'coordinador': ['*'],
        'profesor': ['acta', 'plan-trabajo'],
        'estudiante': ['acta']
    };

    const userAllowed = allowed[role] || [];
    const isAll = userAllowed.includes('*');

    // 1. Filter Leaf Items
    document.querySelectorAll('.sidebar-nav .submenu .nav-item, .sidebar-nav > .nav-item[onclick]').forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (!onclick) return;

        // Extract section name: showDataSection('acta') -> acta
        const match = onclick.match(/'([^']+)'/);
        if (match) {
            const section = match[1];
            if (section === 'dashboard') return; // Always show dashboard? Or maybe not?

            if (isAll || userAllowed.includes(section)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        }
    });

    // 2. Filter Parents (Submenu headers)
    document.querySelectorAll('.sidebar-nav > .nav-item').forEach(parent => {
        if (parent.nextElementSibling && parent.nextElementSibling.classList.contains('submenu')) {
            const submenu = parent.nextElementSibling;
            const visibleChildren = Array.from(submenu.children).filter(c => c.style.display !== 'none');

            if (visibleChildren.length > 0) {
                parent.style.display = 'flex';
            } else {
                parent.style.display = 'none';
            }
        }
    });

    // 3. Dashboard Cards
    document.querySelectorAll('.dashboard-card').forEach(card => {
        const links = card.querySelectorAll('a');
        let hasVisibleLinks = false;
        links.forEach(link => {
            const onclick = link.getAttribute('onclick');
            if (onclick) {
                const match = onclick.match(/'([^']+)'/);
                if (match) {
                    const section = match[1];
                    if (isAll || userAllowed.includes(section)) {
                        hasVisibleLinks = true;
                        link.parentElement.style.display = 'block'; // Show LI
                    } else {
                        link.parentElement.style.display = 'none'; // Hide LI
                    }
                }
            }
        });

        if (hasVisibleLinks) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function checkPermission(section) {
    if (!store.currentUser) return false;
    const role = store.currentUser.role;

    const allowed = {
        'administrador': ['*'],
        'coordinador': ['*'],
        'profesor': ['acta', 'plan-trabajo'],
        'estudiante': ['acta']
    };

    const userAllowed = allowed[role] || [];
    if (userAllowed.includes('*')) return true;
    return userAllowed.includes(section);
}
