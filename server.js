
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { spawn } from 'child_process';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '500mb' })); // Increased limit for large files

// In-memory database
let items = [];
let tunnelUrl = null;

// API Routes

// GET: Fetch all files
app.get('/files', (req, res) => {
    res.json(items);
});

// GET: Fetch tunnel URL
app.get('/tunnel-url', (req, res) => {
    res.json({ url: tunnelUrl });
});

// POST: Upload files
app.post('/files', (req, res) => {
    const data = req.body;

    if (Array.isArray(data)) {
        const newItems = data.map(file => ({
            id: Date.now() + Math.random(),
            title: file.name,
            opened: false,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            size: file.size,
            type: file.type,
            content: file.content
        }));
        items = [...newItems, ...items];
    } else {
        const newItem = {
            id: Date.now() + Math.random(),
            title: data.name,
            opened: false,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            size: data.size,
            type: data.type,
            content: data.content
        };
        items = [newItem, ...items];
    }

    console.log(`Received upload. Total items: ${items.length}`);
    res.json(items);
});

// PATCH: Update opened status
app.patch('/files', (req, res) => {
    const { id, opened } = req.body;
    const item = items.find(i => i.id == id);
    if (item) {
        item.opened = opened;
    }
    res.json(items);
});

// DELETE: Remove file
app.delete('/files', (req, res) => {
    const { id } = req.query;
    items = items.filter(i => i.id != id);
    res.json(items);
});

function startTunnel() {
    // Kill any existing cloudflared processes to capture the lock? 
    // Maybe risky if multiple instances. Assuming single user dev mode.

    console.log("Starting Cloudflare Tunnel for localhost:8080...");
    const tunnel = spawn('cloudflared', ['tunnel', '--url', 'localhost:8080']);

    tunnel.stdout.on('data', (data) => {
        // cloudflared usually outputs to stderr, but we can log stdout too just in case
        console.log(`[Cloudflared]: ${data}`);
    });

    tunnel.stderr.on('data', (data) => {
        const str = data.toString();
        // console.log(`[Cloudflared Error]: ${str}`); 

        // Match the URL: https://<random>.trycloudflare.com
        const match = str.match(/https:\/\/[-a-zA-Z0-9]+\.trycloudflare\.com/);
        if (match) {
            if (tunnelUrl !== match[0]) {
                tunnelUrl = match[0];
                console.log('>>> Cloudflare Tunnel URL:', tunnelUrl);
            }
        }
    });

    tunnel.on('close', (code) => {
        console.log(`Cloudflared process exited with code ${code}`);
    });
}

// Start Server
app.listen(PORT, () => {
    console.log(`Express backend running on http://localhost:${PORT}`);
    startTunnel();
});
