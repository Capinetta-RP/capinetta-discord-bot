// Dropdown initialization - external file to bypass CSP
(function() {
    function initServerDropdown() {
        const serverDropdownBtn = document.getElementById('serverDropdown');
        const serverMenu = document.getElementById('serverMenu');

        if (serverDropdownBtn && serverMenu) {
            serverDropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                serverMenu.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.server-dropdown')) {
                    serverMenu.classList.remove('show');
                }
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServerDropdown);
    } else {
        initServerDropdown();
    }
})();
