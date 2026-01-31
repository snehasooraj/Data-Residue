
// Helper for DOCX conversion and PDF rendering
// We use dynamic imports to avoid SSR issues since these libraries rely on browser APIs (like DOMMatrix)

export async function renderDocx(arrayBuffer) {
    if (typeof window === 'undefined') return ""; // Guard against SSR usage

    try {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        return result.value; // The generated HTML
    } catch (e) {
        console.error("DOCX Error", e);
        return "<p>Error rendering DOCX document.</p>";
    }
}

export async function renderPdf(dataUrl, container) {
    if (typeof window === 'undefined') return;

    // Clear container
    container.innerHTML = '';

    try {
        console.log("Starting PDF Render...");
        const pdfjsLib = await import('pdfjs-dist');

        // Check if worker is set, if not use the local one
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
            console.log(`Using PDF Worker: ${pdfjsLib.GlobalWorkerOptions.workerSrc}`);
        }

        // Convert base64 Data URL to Uint8Array for strictly typed handling
        // Data URL format: "data:application/pdf;base64,....."
        const base64 = dataUrl.split(',')[1];
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({
            data: bytes,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        console.log(`PDF Loaded. Pages: ${pdf.numPages}`);

        // Render all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.maxWidth = "100%"; // Responsiveness
            canvas.style.marginBottom = "20px";
            canvas.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";

            container.appendChild(canvas);

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext).promise;
        }
        console.log("PDF Rendering Complete");
    } catch (e) {
        console.error("PDF Error", e);
        container.innerHTML = `<p style="color:red">Error rendering PDF: ${e.message}</p>`;
    }
}
