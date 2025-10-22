const { chromium } = require('playwright-chromium');
const express = require('express');
const cors = require('cors');
const RedisPublisher = require('./redis-publisher');

const app = express();
app.use(cors());
app.use(express.json());

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const QUEUE_NAME = 'whatsapp:messages';
const PORT = 21465;

const publisher = new RedisPublisher(REDIS_URL, QUEUE_NAME);

// Global variables
let browser = null;
let page = null;
let isConnected = false;
let qrCode = null;

// Start Redis webhook server
require('./redis-webhook-server.js');

// API Routes
app.get('/api/:session/check-connection-session', (req, res) => {
    res.json({
        status: 'success',
        session: req.params.session,
        connected: isConnected
    });
});

app.get('/api/:session/qrcode-session', (req, res) => {
    res.json({
        status: 'success',
        session: req.params.session,
        qrcode: qrCode
    });
});

app.post('/api/:session/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!page || !isConnected) {
            res.status(500).json({
                status: 'error',
                message: 'WhatsApp not connected'
            });
            return;
        }

        // Send message using WA-JS
        const result = await page.evaluate(
            (phone, message) => WPP.chat.sendTextMessage(phone, message),
            phone,
            message
        );

        res.json({
            status: 'success',
            message: 'Message sent successfully',
            result: result
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to send message',
            error: error.message
        });
    }
});

app.post('/api/:session/start-session', async (req, res) => {
    try {
        await startWhatsAppSession();
        res.json({
            status: 'success',
            session: req.params.session,
            message: 'Session started'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to start session',
            error: error.message
        });
    }
});

app.post('/api/:session/closeSession', async (req, res) => {
    try {
        if (browser) {
            await browser.close();
            browser = null;
            page = null;
            isConnected = false;
            qrCode = null;
        }
        res.json({
            status: 'success',
            message: 'Session closed'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to close session',
            error: error.message
        });
    }
});

// Token generation endpoint (for compatibility)
app.post('/api/:session/:secretKey/generate-token', (req, res) => {
    const token = Buffer.from(`${req.params.session}:${Date.now()}`).toString('base64');
    res.json({
        status: 'success',
        session: req.params.session,
        token: token,
        full: `${req.params.session}:${token}`
    });
});

async function startWhatsAppSession() {
    try {
        console.log('🚀 Starting WhatsApp session with WA-JS...');

        // Connect to Redis
        await publisher.connect();
        console.log('✅ Redis Publisher Connected');

        // Launch browser
        browser = await chromium.launch({
            headless: true,
            executablePath: '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        // Create context with CSP disabled
        const context = await browser.newContext({
            bypassCSP: true
        });

        page = await context.newPage();

        // Navigate to WhatsApp Web
        await page.goto('https://web.whatsapp.com/');
        console.log('📱 Navigated to WhatsApp Web');

        // Inject WA-JS using the npm package
        const waJsPath = require.resolve('@wppconnect/wa-js');
        await page.addScriptTag({
            path: waJsPath
        });

        // Wait for WA-JS to load
        await page.waitForFunction(() => window.WPP?.isReady, { timeout: 30000 });
        console.log('✅ WA-JS loaded successfully');

        // Set up message listener
        await page.evaluate(() => {
            WPP.chat.on('chat.new_message', async (message) => {
                console.log('📱 Message received:', message);

                // Extract message data
                const messageData = {
                    phone: message.from?.replace('@c.us', '') || 'unknown',
                    message: message.body || 'No message body',
                    messageType: message.type || 'text',
                    timestamp: message.t || Date.now()
                };

                // Send to Redis (this will be handled by the webhook server)
                fetch('http://localhost:3002/webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(messageData)
                }).catch(err => console.error('Error sending to Redis:', err));
            });
        });

        // Check authentication status
        const isAuthenticated = await page.evaluate(() => WPP.conn.isAuthenticated());

        if (isAuthenticated) {
            isConnected = true;
            console.log('✅ WhatsApp is already authenticated');
        } else {
            console.log('📱 Waiting for QR code scan...');

            // Get QR code
            const qrCodeData = await page.evaluate(() => {
                const qrElement = document.querySelector('canvas');
                if (qrElement) {
                    return qrElement.toDataURL();
                }
                return null;
            });

            if (qrCodeData) {
                qrCode = qrCodeData;
                console.log('✅ QR Code generated');
            }

            // Wait for authentication
            await page.waitForFunction(() => WPP.conn.isAuthenticated(), { timeout: 300000 });
            isConnected = true;
            qrCode = null;
            console.log('✅ WhatsApp authenticated successfully');
        }

        console.log('✅ WhatsApp session started successfully');

    } catch (error) {
        console.error('❌ Error starting WhatsApp session:', error);
        throw error;
    }
}

// Start Express server
app.listen(PORT, () => {
    console.log(`🚀 WA-JS service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🔄 Shutting down...');
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🔄 Shutting down...');
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});
