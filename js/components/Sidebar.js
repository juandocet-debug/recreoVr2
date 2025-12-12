export function initSidebar() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');

    navItems.forEach(item => {
        // Handle submenu toggling
        if (item.nextElementSibling && item.nextElementSibling.classList.contains('submenu')) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Evitar que el clic expanda el sidebar
                toggleSubmenu(item);
            });
        }
    });

    // Auto-collapse sidebar on load
    if (sidebar) {
        sidebar.classList.add('collapsed');
    }

    // Click on collapsed sidebar to expand
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            // Solo expandir si está colapsado y el clic no viene del toggle button
            if (sidebar.classList.contains('collapsed') && !e.target.closest('.sidebar-toggle')) {
                sidebar.classList.remove('collapsed');
            }
        });
    }

    // Toggle button handler (solo para colapsar cuando está expandido)
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el clic se propague al sidebar
            sidebar.classList.add('collapsed');
        });
    }
}

function toggleSubmenu(navItem) {
    const submenu = navItem.nextElementSibling;

    // Close others
    document.querySelectorAll('.submenu.active').forEach(otherSubmenu => {
        if (otherSubmenu !== submenu) {
            otherSubmenu.classList.remove('active');
            otherSubmenu.previousElementSibling.classList.remove('expanded');
        }
    });

    navItem.classList.toggle('expanded');
    submenu.classList.toggle('active');
}
