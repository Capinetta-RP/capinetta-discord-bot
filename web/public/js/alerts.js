/**
 * @file alerts.js
 * @description Auto-hide alerts utility
 */

(function() {
    'use strict';

    /**
     * Auto-hide alerts after 5 seconds
     */
    function initializeAlertAutoHide() {
        setTimeout(() => {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(alert => {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 300);
            });
        }, 5000);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAlertAutoHide);
    } else {
        initializeAlertAutoHide();
    }
})();
