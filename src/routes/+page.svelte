<script>
	let items = $state([
		{ id: 1, title: 'Confidential_Report_2025.pdf', opened: false, date: '10:42 AM' },
		{ id: 2, title: 'System_Logs_v4.txt', opened: true, date: 'Yesterday' },
		{ id: 3, title: 'Encrypted_Keys.dat', opened: false, date: 'Jan 28' },
		{ id: 4, title: 'Backup_Manifest.json', opened: true, date: 'Jan 25' },
		{ id: 5, title: 'User_Credentials_Dump.csv', opened: false, date: 'Jan 20' },
		{ id: 6, title: 'Network_Topology.png', opened: true, date: 'Jan 18' },
        { id: 7, title: 'Security_Policy_Draft.docx', opened: false, date: 'Jan 15' },
	]);

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

                // Auto-delete after 15 minutes (15 * 60 * 1000 ms)
                setTimeout(() => {
                    const currentIdx = items.findIndex(i => i.id === id);
                    if (currentIdx !== -1) {
                        items.splice(currentIdx, 1); // Remove from list
                    }
                }, 900000); 
            }
		}
	}

	function printItem(event, item) {
		event.stopPropagation();
		printingItem = item;
        printDetails = { copies: 1, color: false }; // Reset defaults
		showPrintModal = true;
	}

    function cancelPrint() {
        showPrintModal = false;
        printingItem = null;
    }

    function confirmPrint() {
        // We close the modal first so it's not visible in the print preview (if we were printing this view)
        showPrintModal = false;
        
        // Use a small timeout to allow the modal state to resolve and UI to update
        // before invoking the browser's blocking print dialog.
        setTimeout(() => {
            window.print();
            
            // Log what we would have sent to a real backend printer
            console.log(`Printed ${printingItem.title} with ${printDetails.copies} copies (Color: ${printDetails.color})`);
            
            printingItem = null;
        }, 300);
    }

    function handleKeydown(e) {
        // Disable Ctrl+S (Save) to prevent saving page
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            // Optional: User feedback could go here, but silence is often more secure/confusing for attackers
            console.log("Saving is disabled");
        }
    }
</script>

<svelte:window 
    oncontextmenu={(e) => e.preventDefault()} 
    onkeydown={handleKeydown}
/>

<div class="page-container">
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
								<span class="file-name">{item.title}</span>
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
			<div class="qr-container">
				<div class="qr-placeholder">
					<span>QR Code</span>
					<small>Generated in future</small>
				</div>
			</div>
		</section>
	</main>
</div>

<!-- Hidden Printable Area -->
<div id="printable-area">
    <div class="print-document">
        <header class="doc-header">
            <h1>CONFIDENTIAL DOCUMENT</h1>
            <p>ID: {printingItem?.id || '---'} | Date: {printingItem?.date || '---'}</p>
        </header>
        <div class="doc-content">
            <h2>{printingItem?.title || 'Document'}</h2>
            <hr>
            <p>This is a simulated view of the document content.</p>
            <p>In a real application, the actual PDF or file content would be rendered here for the printer.</p>
            <br>
            <p class="watermark">DATA RESIDUE PROTECTED</p>
        </div>
        <footer class="doc-footer">
            <p>Printed via DataResidue Secure Client</p>
        </footer>
    </div>
</div>

{#if showPrintModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
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
		height: 100vh;
		width: 100vw;
		background: var(--bg-primary);
		align-items: center;
		justify-content: center;
	}

	.layout-wrapper {
		display: flex;
		width: 100%;
		height: 100%;
		padding: 0 5%; /* Equal percentage padding on left and right for the wrapper */
        box-sizing: border-box;
        align-items: center; /* Vertically center content */
		justify-content: space-between; /* Space out the tile and QR */
	}

	/* Tile Section */
	.tile-section {
		flex: 1; /* Take available space */
        max-width: 65%; /* Limit width to keep proportion */
		display: flex;
		flex-direction: column;
        justify-content: center;
        height: 80%; /* Consistent height */
	}

	.tile {
		background: #ffffff;
		border: 2px solid #374151; /* Thicker border (2px) */
		border-radius: 16px;
		height: 100%; 
		display: flex;
		flex-direction: column;
		box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15);
		overflow: hidden;
	}

	.tile-header {
		padding: 1.5rem;
		border-bottom: 2px solid #374151; /* Match tile border thickness */
		display: flex;
		justify-content: space-between;
		align-items: center;
        background: #e2e8f0; /* Darker grey but not too dark */
	}

	.tile-header h2 {
		font-size: 1.2rem;
		font-weight: 700; /* Bolder */
		color: #111; /* Darker for better contrast with bold */
		letter-spacing: -0.5px;
	}

	.badge {
		background: #f3f4f6;
		color: #111;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
	}

	.file-list {
		flex: 1;
		overflow-y: auto;
	}

	.file-item {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06); /* Very thin/subtle border */
		cursor: pointer;
		transition: background 0.2s ease;
		display: flex;
		align-items: center;
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
        background: #ffffff; /* Bright white for unopened */
        border-left: 4px solid #3b82f6; 
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
        background: #e5e7eb; /* Clearly grey for opened items */
        border-left: 4px solid transparent;
    }

	.file-date {
		font-size: 0.85rem;
	}

	/* QR Section */
	.qr-section {
		flex: 0 0 30%; /* Fixed width for QR side */
		display: flex;
		align-items: center;
		justify-content: center; /* Center QR in its section */
	}

	.qr-container {
		width: 100%;
		max-width: 350px; /* Increased size */
		aspect-ratio: 1;
		border: 1px dashed #e5e7eb;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
        background: #fafafa;
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

    /* PRINT STYLES */
    #printable-area {
        display: none;
    }

    @media print {
        /* Hide everything by default */
        :global(body > *) {
            display: none !important;
        }

        /* Hide the modal and main UI explicitly to be safe */
        .page-container, .modal-overlay {
            display: none !important;
        }

        /* Show only the printable area */
        :global(body) {
            background: white !important;
        }

        #printable-area {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            padding: 2rem;
            z-index: 9999;
        }

        .print-document {
            font-family: 'Courier New', Courier, monospace;
            color: black;
            border: 1px solid #ddd;
            padding: 2rem;
            height: 90vh;
        }

        .doc-header {
            text-align: center;
            border-bottom: 2px solid black;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
        }

        .watermark {
            opacity: 0.1;
            font-size: 3rem;
            transform: rotate(-45deg);
            position: fixed;
            top: 40%;
            left: 10%;
            pointer-events: none;
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
        background: #3b82f6;
        border: 1px solid #2563eb;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        transition: background 0.2s;
    }

    .btn-primary:hover {
        background: #2563eb;
    }
</style>
