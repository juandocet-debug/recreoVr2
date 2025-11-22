export function initSidebar() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

    navItems.forEach(item => {
        // Handle submenu toggling
        if (item.nextElementSibling && item.nextElementSibling.classList.contains('submenu')) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                toggleSubmenu(item);
            });
        }
    });
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
