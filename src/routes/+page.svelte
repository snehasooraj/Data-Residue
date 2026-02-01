<script>
    import { onMount } from 'svelte';
    import { renderDocx, renderPdf } from '$lib/docRenderer';
    import QRCode from 'qrcode';

	let items = $state([]);
    let qrCodeDataUrl = $state('');
    let publicUrl = $state('');

    $effect(() => {
        if (publicUrl) {
             console.log("Generating QR for:", publicUrl);
            const targetUrl = publicUrl.replace(/\/$/, '') + '/mobile';
            QRCode.toDataURL(targetUrl, { width: 300, margin: 2 })
                .then(url => qrCodeDataUrl = url)
                .catch(err => console.error("QR Error:", err));
        }
    });

    async function loadItems() {
        try {
            // Using relative path (proxied by Vite)
            const res = await fetch('/api/files');
            if (res.ok) {
                items = await res.json();
            }
        } catch (e) {
            console.error("Failed to load items", e);
        }
    }

    async function fetchTunnelUrl() {
        try {
            const res = await fetch('/api/tunnel-url');
            if (res.ok) {
                const data = await res.json();
                if (data.url && data.url !== publicUrl) {
                    publicUrl = data.url;
                }
            }
        } catch (e) {
            console.error("Failed to fetch tunnel URL", e);
        }
    }

    onMount(() => {
        // Poll for items and tunnel URL
        loadItems();
        fetchTunnelUrl();

        const itemInterval = setInterval(loadItems, 1000);
        const tunnelInterval = setInterval(fetchTunnelUrl, 5000); // Check for URL update every 5s
        
        return () => {
            clearInterval(itemInterval);
            clearInterval(tunnelInterval);
        };
    });

    let sortedItems = $derived(
        [...items].sort((a, b) => Number(a.opened) - Number(b.opened))
    );

	let showPrintModal = $state(false);
	let printingItem = $state(null);
    let printDetails = $state({ copies: 1, color: false });

	function openItem(id) {
		const index = items.findIndex(i => i.id === id);
		if (index !== -1) {
            // If strictly switching from unopened to opened, start the timer
            if (!items[index].opened) {
			    items[index].opened = true;

                 // Sync with server
                fetch('/api/files', {
                    method: 'PATCH',
                    body: JSON.stringify({ id, opened: true }),
                    headers: { 'Content-Type': 'application/json' }
                }).catch(e => console.error("Sync failed", e));

                // Auto-delete after 15 minutes (15 * 60 * 1000 ms)
                setTimeout(() => {
                    fetch(`/api/files?id=${id}`, { method: 'DELETE' })
                        .catch(e => console.error("Auto-delete failed", e));
                    // The next poll will update the UI to remove it
                }, 900000); 
            }
		}
	}

	function printItem(event, item) {
		event.stopPropagation();
        openItem(item.id); // Mark as read immediately
		printingItem = item;
        printDetails = { copies: 1, color: false }; // Reset defaults
		showPrintModal = true;
	}

    function cancelPrint() {
        showPrintModal = false;
        printingItem = null;
    }

    async function confirmPrint() {
        showPrintModal = false;
        
        // Wait for modal to close
        await new Promise(r => setTimeout(r, 100));

        const container = document.getElementById('doc-render-container');
        
        if (printingItem && printingItem.content) {
            try {
                if (printingItem.type === 'application/pdf') {
                    // Ensure container is rendered for canvas context to work
                    // (It is off-screen but display:block)
                    await renderPdf(printingItem.content, container);
                } else if (printingItem.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || printingItem.type === 'application/msword') {
                     // Convert base64 to ArrayBuffer for Mammoth
                    const base64 = printingItem.content.split(',')[1];
                    const binaryString = window.atob(base64);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const html = await renderDocx(bytes.buffer);
                    container.innerHTML = html;
                }
            } catch (e) {
                console.error("Rendering failed", e);
                container.innerHTML += "<p style='color:red'>Error rendering document content</p>";
            }
        }

        // Allow DOM to update
        setTimeout(() => {
            window.print();
            
            console.log(`Printed ${printingItem.title} with ${printDetails.copies} copies`);
            
            printingItem = null;
        }, 500);
    }

    function handleKeydown(e) {
        // Disable Ctrl+S (Save) to prevent saving page
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            // Optional: User feedback could go here, but silence is often more secure/confusing for attackers
            console.log("Saving is disabled");
            addToast("Secure Environment: Saving disabled", "warning");
        }
    }

    // TOAST NOTIFICATIONS
    let toasts = $state([]);
    function addToast(message, type = 'info') {
        const id = Date.now();
        toasts = [...toasts, { id, message, type }];
        setTimeout(() => {
            toasts = toasts.filter(t => t.id !== id);
        }, 3000);
    }

    // ICONS
    function getFileIcon(type) {
        if (type?.includes('pdf')) return 'pdf';
        if (type?.includes('image')) return 'image';
        if (type?.includes('word') || type?.includes('document')) return 'word';
        return 'file';
    }
</script>

<svelte:window 
    oncontextmenu={(e) => e.preventDefault()} 
    onkeydown={handleKeydown}
/>

<div class="page-container">
    <header class="app-header">
        <div class="logo-area">
            <div class="lock-circle">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h1>Secure Box Kiosk <span class="subtitle">Secure Print Environment</span></h1>
        </div>
        <div class="badge-safe">
            <span class="pulse"></span>
            Secure & Encrypted
        </div>
    </header>

	<main class="layout-wrapper">
		<section class="tile-section">
			<div class="tile">
				<header class="tile-header">
					<h2>Incoming Data</h2>
					<span class="badge">{items.filter(i => !i.opened).length} New</span>
				</header>
				<ul class="file-list">
					{#each sortedItems as item (item.id)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
						<li 
							class="file-item" 
							class:opened={item.opened} 
							class:unopened={!item.opened}
							role="button"
							onclick={() => openItem(item.id)}
						>
							<div class="row">
                                <div class="file-info">
                                    <span class="file-icon {getFileIcon(item.type)}">
                                        {#if getFileIcon(item.type) === 'pdf'}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                        {:else if getFileIcon(item.type) === 'image'}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                        {:else if getFileIcon(item.type) === 'word'}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                        {:else}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                        {/if}
                                    </span>
								    <span class="file-name">{item.title}</span>
                                </div>
                                <div class="meta-group">
                                    <span class="file-date">{item.date}</span>
                                    <button 
                                        class="print-btn" 
                                        onclick={(e) => printItem(e, item)}
                                        title="Print"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-printer"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H6a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-6"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                    </button>
                                </div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<section class="qr-section">
			<div class="qr-card">
                <header class="qr-header">
                    <h3>Mobile Upload</h3>
                </header>
                <div class="qr-body">
                    {#if qrCodeDataUrl}
                        <img src={qrCodeDataUrl} alt="Scan to Upload" class="qr-code" />
                        <p class="qr-label">Scan with Mobile</p>
                    {:else}
                        <div class="qr-placeholder">
                            <span>QR Code</span>
                            <small>Loading...</small>
                        </div>
                    {/if}
                </div>
			</div>
		</section>
	</main>

    <!-- STATUS BAR -->
    <footer class="status-bar">
        <div class="status-item">
            <span class="status-dot {publicUrl ? 'active' : 'inactive'}"></span>
            <span>Secure Tunnel: {publicUrl ? 'Active' : 'Connecting...'}</span>
        </div>
        <div class="status-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Privacy Mode Enforced</span>
        </div>
        <div class="status-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span>v1.0.4 Stable</span>
        </div>
    </footer>

    <!-- TOASTS -->
    <div class="toast-container">
        {#each toasts as toast (toast.id)}
            <div class="toast toast-{toast.type}" role="alert">
                {toast.message}
            </div>
        {/each}
    </div>
</div>

<!-- Off-screen Printable Area allowing rendering -->
<div id="printable-area" style="position: absolute; left: -20000px; top: 0; width: 100%; opacity: 0; pointer-events: none;">
    <div class="print-document">
        <!-- Pure document content only - no wrappers, headers or footers -->
        <div id="doc-render-container">
            <!-- Content injected via JS before print -->
            {#if printingItem?.content}
                {#if printingItem.type?.startsWith('image/')}
                        <img src={printingItem.content} alt="Printed Content" />
                {:else if printingItem.type === 'text/plain'}
                        <pre style="white-space: pre-wrap;">{atob(printingItem.content.split(',')[1])}</pre>
                {/if}
                <!-- PDF and DOCX are populated by confirmPrint logic -->
            {/if}
        </div>
    </div>
</div>

{#if showPrintModal}
    <div class="modal-overlay" onclick={cancelPrint} role="button" tabindex="0">
        <div class="modal" onclick={(e) => e.stopPropagation()} role="button" tabindex="0">
            <h3>Print Document</h3>
            <p class="modal-file-name">{printingItem?.title}</p>
            
            <div class="form-group">
                <label for="copies">Copies</label>
                <input type="number" id="copies" bind:value={printDetails.copies} min="1" max="100">
            </div>

            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" bind:checked={printDetails.color}>
                    <span>Print in Color</span>
                </label>
            </div>

            <div class="modal-actions">
                <button class="btn-secondary" onclick={cancelPrint}>Cancel</button>
                <button class="btn-primary" onclick={confirmPrint}>Print</button>
            </div>
        </div>
    </div>
{/if}

<style>
	/* Layout Containers */
	.page-container {
		display: flex;
        flex-direction: column;
		height: 100vh;
		width: 100vw;
		background: var(--bg-primary);
		align-items: center;
        /* justify-content center removed to handle header flow */
	}

    /* HEADER */
    .app-header {
        width: 100%;
        padding: 1rem 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.4);
        backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        z-index: 20;
    }

    .logo-area {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .lock-circle {
        width: 40px;
        height: 40px;
        background: var(--primary-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
    }

    .app-header h1 {
        font-size: 1.4rem;
        color: var(--primary-color);
        font-weight: 700;
        display: flex;
        flex-direction: column;
        line-height: 1.1;
    }

    .subtitle {
        font-size: 0.8rem;
        color: #64748b;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .badge-safe {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.5rem 1rem;
        background: rgba(13, 148, 136, 0.1);
        color: var(--secondary-color);
        border: 1px solid rgba(13, 148, 136, 0.2);
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
    }

    .pulse {
        width: 8px;
        height: 8px;
        background: var(--secondary-color);
        border-radius: 50%;
        box-shadow: 0 0 0 rgba(13, 148, 136, 0.4);
        animation: pulse-green 2s infinite;
    }

    @keyframes pulse-green {
        0% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(13, 148, 136, 0); }
        100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0); }
    }

	.layout-wrapper {
		display: flex;
		width: 100%;
        flex: 1; /* Fill remaining height */
		padding: 2% 5%; 
        box-sizing: border-box;
        align-items: center; 
		justify-content: space-between; 
	}

	/* Tile Section */
	.tile-section {
		flex: 1; /* Take available space */
        max-width: 65%; /* Limit width to keep proportion */
		display: flex;
		flex-direction: column;
        justify-content: center;
        height: 85%; 
	}

	.tile {
		background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.6);
		border-radius: 16px; /* Modern curve */
		height: 100%; 
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.1), 0 0 2px rgba(0,0,0,0.05); /* Soft, deep shadow */
		overflow: hidden;
        transition: transform 0.3s ease;
	}

	.tile-header {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--primary-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
        background: var(--primary-color); /* Navy Blue Header */
	}

	.tile-header h2 {
		font-size: 1.1rem;
		font-weight: 600;
		color: #ffffff; /* White text on Navy */
		letter-spacing: 0.5px;
        text-transform: uppercase;
	}

	.badge {
		background: var(--secondary-color); /* Teal Badge */
		color: #ffffff;
		padding: 4px 10px;
		border-radius: 2px;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.5px;
	}

	.file-list {
		flex: 1;
		overflow-y: auto;
	}

	.file-item {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #f1f5f9;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
        animation: fadeIn 0.4s ease-out forwards;
	}

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

	.file-item:hover {
		background: #f9fafb;
	}

	.file-item:last-child {
		border-bottom: none;
	}

	.row {
		display: flex;
		justify-content: space-between;
		width: 100%;
		align-items: center;
	}

	/* State Styling */
    /* Security: Prevent text selection to discourage copying */
    :global(body) {
        user-select: none;
        -webkit-user-select: none;
    }

	.file-item.unopened .file-name {
		color: #111111;
		font-weight: 700;
	}

    .file-item.unopened .file-date {
        color: #111111;
        font-weight: 700;
        opacity: 1;
    }

    .file-item.unopened {
        background: #ffffff;
        border-left: 4px solid var(--secondary-color); /* Teal accent */
    }

    .file-item.unopened:hover {
        background: #f0fdfa; /* Teal Tint */
        transform: translateX(4px);
    }

    .meta-group {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .print-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        border-radius: 6px;
        background: transparent;
        color: inherit;
        opacity: 0.6;
        transition: all 0.2s;
        border: 1px solid transparent;
    }

    .print-btn:hover {
        opacity: 1;
        background: rgba(0,0,0,0.05);
        border-color: rgba(0,0,0,0.1);
    }
    
    .file-item.unopened .print-btn {
        color: #111;
    }

	.file-item.opened .file-name {
		color: #6b7280;
		font-weight: 400; 
	}
    
    .file-item.opened .file-date {
        color: #9ca3af;
    }

    .file-item.opened {
        background: #f1f5f9; /* Dull grey background */
        border-left: 4px solid #cbd5e1; /* Grey accent */
        opacity: 0.8;
    }

    .file-item.opened:hover {
        opacity: 1;
        background: #e2e8f0;
    }

	.file-date {
		font-size: 0.85rem;
	}

	/* QR Section */
	.qr-section {
		flex: 0 0 30%; /* Fixed width for QR side */
		display: flex;
        flex-direction: column;
		align-items: center;
		justify-content: center; /* Center QR in its section */
        gap: 1rem;
	}

	.qr-card {
		width: 100%;
		max-width: 350px;
		background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
		border: 1px solid white;
		border-radius: 16px;
        box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.15);
		display: flex;
		flex-direction: column;
		overflow: hidden;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}
    
    .qr-card:hover {
        transform: translateY(-5px);
    }

    .qr-header {
        background: var(--primary-color);
        padding: 1rem;
        text-align: center;
        border-bottom: 1px solid var(--primary-color);
    }

    .qr-header h3 {
        color: #ffffff;
        font-size: 1.1rem;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
    }

    .qr-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: #ffffff;
    }

	.qr-placeholder {
		text-align: center;
		color: #444;
	}
    
    .qr-placeholder span {
        display: block;
        font-size: 1.2rem;
        margin-bottom: 0.5rem;
        letter-spacing: 1px;
    }

    .qr-code {
        width: 100%;
        height: auto;
        border-radius: 8px;
    }

    .qr-label {
        font-weight: 600;
        color: #4b5563;
        margin: 0;
    }

    /* PRINT STYLES */

    @media print {
        @page { margin: 0; }
        
        /* Hide everything by default using visibility to preserve layout */
        body * {
            visibility: hidden;
        }

        /* Hide the main UI container explicitly */
        .page-container, .modal-overlay {
            display: none !important;
        }

        /* Clean canvas */
        :global(body) {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
        }

        /* Show the printable area and its children */
        #printable-area, #printable-area * {
            visibility: visible !important;
            display: block !important;
        }

        #printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 99999 !important;
            background: white !important;
            opacity: 1 !important; /* Force opacity back to 1 */
        }

        .print-document {
            font-family: inherit; /* Use default font, not times new roman */
            color: black !important;
            border: none !important; /* No border for actual print */
            padding: 0 !important; /* Maximize space */
            min-height: 100vh;
        }
        
        /* Ensure images and canvases resize correctly */
        img, canvas {
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid;
            display: block; /* Remove inline gaps */
            margin-bottom: 0;
        }
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
    }

    .modal {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid #e5e7eb;
    }

    .modal h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #111;
        margin-bottom: 0.5rem;
    }

    .modal-file-name {
        color: #4b5563;
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        font-size: 0.9rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
    }

    .form-group input[type="number"] {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-family: inherit;
        font-size: 1rem;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
        width: 1.2rem;
        height: 1.2rem;
        cursor: pointer;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 2rem;
    }

    .btn-secondary {
        padding: 0.5rem 1rem;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        color: #374151;
        font-weight: 500;
        transition: background 0.2s;
    }

    .btn-secondary:hover {
        background: #f9fafb;
    }

    .btn-primary {
        padding: 0.5rem 1.5rem;
        background: var(--primary-color);
        border: 1px solid var(--primary-color);
        border-radius: 4px;
        color: white;
        font-weight: 500;
        transition: background 0.2s;
    }

    .btn-primary:hover {
        background: #1e293b; /* Slightly lighter navy */
        border-color: #1e293b;
    }

    /* ICONS */
    .file-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .file-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
    }
    .file-icon.pdf { color: #ef4444; }
    .file-icon.image { color: #3b82f6; }
    .file-icon.word { color: #2563eb; }

    /* STATUS BAR */
    .status-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 32px;
        background: #0f172a;
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.5rem;
        font-size: 0.75rem;
        z-index: 50;
    }

    .status-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ef4444;
    }
    .status-dot.active {
        background: #22c55e;
        box-shadow: 0 0 8px #22c55e;
    }

    /* TOASTS */
    .toast-container {
        position: fixed;
        bottom: 50px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 9000;
    }

    .toast {
        background: white;
        padding: 0.8rem 1.2rem;
        border-radius: 6px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #3b82f6;
        font-size: 0.9rem;
        font-weight: 500;
        color: #1e293b;
        animation: slideIn 0.3s ease-out;
    }
    .toast-warning { border-left-color: #f59e0b; }
    .toast-error { border-left-color: #ef4444; }

    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
</style>
