/**
 * @file roles.js
 * @description Role management page logic
 */

(function() {
    'use strict';

    let selectedGuildId = document.getElementById('guildIdData')?.dataset.guildId;

    if (!selectedGuildId) {
        console.error('Guild ID not found');
        return;
    }

    document.addEventListener('DOMContentLoaded', () => {
        initializeRolePage();
    });

    /**
     * Initialize role page functionality
     */
    function initializeRolePage() {
        // Initialize filtering system
        if (typeof setupTableFiltering === 'function') {
            setupTableFiltering('searchRole', '.btn-filter-large', '.role-row', filterRolesTable);
        }

        // Initialize modals
        if (typeof setupModalOverlays === 'function') {
            setupModalOverlays();
        }

        // Setup event listeners
        setupEventListeners();
    }

    /**
     * Setup all event listeners
     */
    function setupEventListeners() {
        // Delegated event listener for all buttons
        document.addEventListener('click', handleButtonClicks);

        // Permission checkboxes
        document.querySelectorAll('.perm-checkbox').forEach(cb => {
            cb.addEventListener('change', updatePermissions);
        });

        // Edit role form
        const editForm = document.getElementById('editRoleForm');
        if (editForm) {
            editForm.addEventListener('submit', submitEditRole);
        }
    }

    /**
     * Handle all button clicks through event delegation
     */
    function handleButtonClicks(e) {
        // Edit role button
        if (e.target.closest('.btn-edit-role')) {
            const btn = e.target.closest('.btn-edit-role');
            editRole(btn.dataset.roleId, btn.dataset.roleName);
            return;
        }

        // Delete role button
        if (e.target.closest('.btn-delete-role')) {
            const btn = e.target.closest('.btn-delete-role');
            deleteRole(btn.dataset.roleId, btn.dataset.roleName);
            return;
        }

        // Close modal button
        if (e.target.closest('.modal-close')) {
            const btn = e.target.closest('.modal-close');
            if (typeof closeModal === 'function') {
                closeModal(btn.dataset.modalId);
            }
            return;
        }

        // Cancel modal button
        if (e.target.closest('.btn-cancel-modal')) {
            const btn = e.target.closest('.btn-cancel-modal');
            if (typeof closeModal === 'function') {
                closeModal(btn.dataset.modalId);
            }
            return;
        }

        // Delete role confirmation button
        if (e.target.closest('.btn-submit-delete')) {
            submitDeleteRole();
            return;
        }
    }

    /**
     * Open edit role modal
     */
    function editRole(roleId, roleName) {
        const row = document.querySelector(`.btn-edit-role[data-role-id="${roleId}"]`)?.closest('.role-row');
        if (!row) return;

        const colorDot = row.querySelector('.role-color-dot');
        const roleColor = colorDot?.getAttribute('data-color') || '#99aab5';

        document.getElementById('editRoleId').value = roleId;
        document.getElementById('editRoleName').value = roleName;
        document.getElementById('editRoleColor').value = roleColor;

        // Reset permissions
        document.querySelectorAll('.perm-checkbox').forEach(cb => {
            cb.checked = false;
        });

        if (typeof openModal === 'function') {
            openModal('editRoleModal');
        }
    }

    /**
     * Open delete role confirmation modal
     */
    function deleteRole(roleId, roleName) {
        document.getElementById('deleteRoleId').value = roleId;
        document.getElementById('deleteRoleName').textContent = roleName;
        
        if (typeof openModal === 'function') {
            openModal('deleteRoleModal');
        }
    }

    /**
     * Update permissions based on checkbox selection
     */
    function updatePermissions() {
        const selected = Array.from(
            document.querySelectorAll('.permission-item input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        
        document.getElementById('editRolePermissions').value = JSON.stringify(selected);
    }

    /**
     * Submit edit role form
     */
    async function submitEditRole(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.message || 'Error al editar rol');
            }
        } catch (error) {
            console.error('Error editing role:', error);
            if (typeof showToast === 'function') {
                showToast(error.message, 'error');
            }
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    /**
     * Submit delete role request
     */
    async function submitDeleteRole() {
        const roleId = document.getElementById('deleteRoleId').value;
        const btn = document.querySelector('.btn-submit-delete');
        const originalText = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

        try {
            const response = await fetch(`/roles/${selectedGuildId}/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleId })
            });

            const data = await response.json();

            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.message || 'Error al eliminar rol');
            }
        } catch (error) {
            console.error('Error deleting role:', error);
            if (typeof showToast === 'function') {
                showToast(error.message, 'error');
            }
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    /**
     * Filter roles table
     */
    function filterRolesTable(searchTerm, filter) {
        const rows = document.querySelectorAll('.role-row');
        
        rows.forEach(row => {
            const name = (row.dataset.name || '').toLowerCase();
            const matchesSearch = name.includes(searchTerm);
            const matchesFilter = filter === 'all' || row.dataset.type === filter;
            
            row.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
        });
    }

    // Expose filter function globally if needed
    window.filterRolesTable = filterRolesTable;
})();
