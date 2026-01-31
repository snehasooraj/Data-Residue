<script>
    let files = $state([]);
    let isDragging = $state(false);

    function handleFiles(selectedFiles) {
        if (selectedFiles && selectedFiles.length > 0) {
            // Convert FileList to Array and append to existing files
            const newFiles = Array.from(selectedFiles).map(file => ({
                name: file.name,
                size: formatSize(file.size),
                type: file.type,
                file: file, // Keep the actual file object if needed for upload
                id: Math.random().toString(36).substr(2, 9)
            }));
            files = [...files, ...newFiles];
        }
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function removeFile(id) {
        files = files.filter(f => f.id !== id);
    }

    function onDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
        const droppedFiles = e.dataTransfer.files;
        handleFiles(droppedFiles);
    }

    function onDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
    }
    
    function onDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
    }

    function uploadFiles() {
        if (files.length === 0) return;
        
        // Simulation of upload logic
        alert(`Uploading ${files.length} files...`);
        // In a real app, you would use fetch/FormData here
        // const formData = new FormData();
        // files.forEach(f => formData.append('files', f.file));
        // await fetch('/api/upload', { method: 'POST', body: formData });
        
        files = []; // Clear after upload
    }
</script>

<div class="mobile-container">
    <header class="mobile-header">
        <div class="logo">DR</div>
        <h1>Secure Upload</h1>
    </header>

    <main class="mobile-main">
        <!-- Upload Zone -->
        <label 
            class="upload-zone" 
            class:dragging={isDragging}
            ondrop={onDrop}
            ondragover={onDragOver}
            ondragleave={onDragLeave}
        >
            <input 
                type="file" 
                multiple 
                accept="image/*,.pdf,.doc,.docx" 
                onchange={(e) => handleFiles(e.target.files)}
                hidden
            />
            <div class="upload-content">
                <div class="icon-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <h3>Tap to Upload</h3>
                <p>Images, PDF, Word</p>
            </div>
        </label>

        <!-- File List -->
        {#if files.length > 0}
            <div class="files-wrapper">
                <div class="files-header">
                    <span>Selected Files ({files.length})</span>
                </div>
                <ul class="file-list">
                    {#each files as file (file.id)}
                        <li class="file-item" transition:slide>
                            <div class="file-icon">
                                {#if file.type.includes('image')}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                {:else if file.type.includes('pdf')}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                {:else}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                {/if}
                            </div>
                            <div class="file-info">
                                <span class="name">{file.name}</span>
                                <span class="size">{file.size}</span>
                            </div>
                            <button class="remove-btn" onclick={() => removeFile(file.id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    </main>

    {#if files.length > 0}
        <footer class="mobile-footer">
            <button class="send-btn" onclick={uploadFiles}>
                Send to PC
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
        </footer>
    {/if}
</div>

<style>
    /* Mobile First Styles */
    :global(body) {
        margin: 0;
        background-color: var(--bg-primary, #f0f2f5);
        font-family: 'Fira Code', monospace;
    }

    .mobile-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        max-height: 100vh;
        overflow: hidden;
        background: #f8fafc;
        position: relative;
    }

    .mobile-header {
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        background: white;
        border-bottom: 1px solid #e2e8f0;
        z-index: 10;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .logo {
        width: 40px;
        height: 40px;
        background: #111;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        border-radius: 8px;
        font-size: 1.2rem;
    }

    .mobile-header h1 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #0f172a;
        margin: 0;
    }

    .mobile-main {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    .upload-zone {
        background: white;
        border: 2px dashed #cbd5e1;
        border-radius: 16px;
        padding: 3rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        transition: all 0.2s ease;
        cursor: pointer;
        min-height: 200px;
    }

    .upload-zone:active {
        background: #f1f5f9;
        transform: scale(0.98);
    }

    .upload-zone.dragging {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .icon-circle {
        width: 64px;
        height: 64px;
        background: #f1f5f9;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
        color: #475569;
    }

    .upload-zone h3 {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
        color: #0f172a;
    }

    .upload-zone p {
        margin: 0;
        color: #64748b;
        font-size: 0.9rem;
    }

    .files-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-bottom: 6rem; /* Space for footer */
    }

    .files-header {
        font-size: 0.9rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .file-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .file-item {
        background: white;
        padding: 1rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        border: 1px solid #e2e8f0;
    }

    .file-icon {
        width: 40px;
        height: 40px;
        background: #f1f5f9;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #475569;
        flex-shrink: 0;
    }

    .file-info {
        flex: 1;
        min-width: 0; /* Text truncation fix */
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .file-info .name {
        font-weight: 500;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.95rem;
    }

    .file-info .size {
        font-size: 0.8rem;
        color: #64748b;
    }

    .remove-btn {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        background: transparent;
        border: none;
        border-radius: 50%;
        transition: all 0.2s;
        padding: 0;
    }

    .remove-btn:active {
        background: #fee2e2;
        color: #ef4444;
    }

    .mobile-footer {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        padding: 1.5rem;
        background: white;
        border-top: 1px solid #e2e8f0;
        z-index: 20;
    }

    .send-btn {
        width: 100%;
        background: #111;
        color: white;
        border: none;
        padding: 1rem;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        transition: transform 0.1s;
    }

    .send-btn:active {
        transform: scale(0.98);
        background: #000;
    }
</style>
