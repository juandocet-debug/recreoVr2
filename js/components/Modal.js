export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

export function initModals() {
    // Close buttons
    document.querySelectorAll('.modal .btn-secondary, .modal .close-btn').forEach(btn => {
        if (btn.getAttribute('onclick')) return; // Skip if inline handler exists (legacy support)

        // We can add generic close logic here if we want to remove inline handlers
        // For now, we'll expose these functions to window so inline onclicks work if needed,
        // but ideally we attach listeners.
    });

    // Expose to window for legacy compatibility during refactor
    window.hideModal = () => hideModal('dataModal');
    window.hideProfModal = () => hideModal('profModal');
    window.hidePreviewModal = () => hideModal('previewModal');
}
