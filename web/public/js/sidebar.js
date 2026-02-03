/**
 * Sidebar Management
 * Maneja el menú hamburguesa y la navegación en la barra lateral
 * Reutilizable en todas las páginas del dashboard
 */

/**
 * Inicializa el sistema de hamburguesa y sidebar
 * Debe llamarse una vez por página que tenga hamburger/sidebar
 */
function initSidebar() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (!hamburger || !sidebar) {
        return;
    }

    // Toggle sidebar al hacer click en hamburger
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('active');
    });

    // Cerrar sidebar al hacer click en un link (en móvil)
    const links = sidebar.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Cerrar sidebar al hacer click fuera (solo en móvil)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) && !hamburger.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    // Cerrar sidebar cuando cambia el tamaño de pantalla
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        } else {
            sidebar.classList.remove('active');
        }
    });

    // Estado inicial basado en tamaño de pantalla
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initSidebar);
