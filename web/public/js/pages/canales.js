/**
 * @file canales.js
 * @description Channel management page logic with drag-and-drop sorting
 */

(function() {
    'use strict';

    const currentGuildId = document.getElementById('guildIdData')?.dataset.guildId;

    if (!currentGuildId) {
        console.error('Guild ID not found');
        return;
    }

    document.addEventListener('DOMContentLoaded', () => {
        initializeSortable();
        initializeCreateChannel();
    });

    /**
     * Initialize SortableJS for drag-and-drop channel sorting
     */
    function initializeSortable() {
        const channelLists = document.querySelectorAll('.channel-list');
        channelLists.forEach(list => {
            new Sortable(list, {
                group: 'channels',
                animation: 150,
                ghostClass: 'sortable-ghost',
                handle: '.channel-item',
                onEnd: handleChannelSort
            });
        });
    }

    /**
     * Handle channel sorting after drag-and-drop
     */
    async function handleChannelSort(evt) {
        const updates = [];

        // Process all lists to rebuild global state
        document.querySelectorAll('.channel-list').forEach(list => {
            let catId = list.dataset.categoryId;
            if (catId === 'uncategorized') catId = null;

            // Independent Counters for Text vs Voice
            let textIndex = 0;
            let voiceIndex = 0;

            list.querySelectorAll('.channel-item').forEach(item => {
                const type = parseInt(item.dataset.type);
                let pos = 0;

                // 2 (Voice) or 13 (Stage) -> Voice Group
                if (type === 2 || type === 13) {
                    pos = voiceIndex++;
                } else {
                    // 0 (Text), 5 (News), 15 (Forum) -> Text Group
                    pos = textIndex++;
                }

                updates.push({
                    channel: item.dataset.id,
                    position: pos,
                    parent: catId
                });
            });
        });

        try {
            document.body.style.cursor = 'wait';

            await fetch(`/canales/${currentGuildId}/positions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ positions: updates })
            });
        } catch (e) {
            console.error(e);
            if (typeof showToast === 'function') {
                showToast('Error al mover canal', 'error');
            }
        } finally {
            document.body.style.cursor = 'default';
        }
    }

    /**
     * Initialize create channel modal and form
     */
    function initializeCreateChannel() {
        const createBtn = document.getElementById('createChannelBtn');
        const createModal = document.getElementById('createChannelModal');
        const closeCreateBtn = document.getElementById('closeCreateBtn');
        const createForm = document.getElementById('createChannelForm');

        if (!createBtn || !createModal) return;

        createBtn.addEventListener('click', () => {
            createModal.style.display = 'flex';
            createModal.classList.add('active');
        });

        const closeCreate = () => {
            createModal.style.display = 'none';
            createModal.classList.remove('active');
        };

        if (closeCreateBtn) {
            closeCreateBtn.addEventListener('click', closeCreate);
        }

        createModal.addEventListener('click', (e) => {
            if (e.target === createModal) closeCreate();
        });

        if (createForm) {
            createForm.addEventListener('submit', handleCreateChannel);
        }
    }

    /**
     * Handle create channel form submission
     */
    async function handleCreateChannel(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

        try {
            const response = await fetch(`/canales/${currentGuildId}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('createName').value,
                    type: form.querySelector('input[name="createType"]:checked').value,
                    parentId: document.getElementById('createCategory').value
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error creating channel:', error);
            if (typeof showToast === 'function') {
                showToast(error.message || 'Error al crear canal', 'error');
            }
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
})();
