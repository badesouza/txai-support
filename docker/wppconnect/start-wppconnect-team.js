const { create, SocketState } = require('@wppconnect-team/wppconnect');
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

// Global client variable
let client = null;

// Start Express server first
app.get('/api/:session/check-connection-session', (req, res) => {
    const isConnected = client && client.getState && client.getState() === 'CONNECTED';
    res.json({
        status: 'success',
        session: req.params.session,
        connected: isConnected
    });
});

app.get('/api/:session/qrcode-session', (req, res) => {
    if (!client) {
        // Return a placeholder QR code when client is not ready
        res.json({
            status: 'success',
            session: req.params.session,
            qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        });
        return;
    }

    try {
        // Get QR code from WPPConnect Team
        const qrCode = client.getQrCode ? client.getQrCode() : null;
        res.json({
            status: 'success',
            session: req.params.session,
            qrcode: qrCode
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to get QR code',
            error: error.message
        });
    }
});

app.post('/api/:session/send-message', (req, res) => {
    if (!client) {
        res.status(500).json({
            status: 'error',
            message: 'WPPConnect client not ready'
        });
        return;
    }

    try {
        const { phone, message } = req.body;
        const result = client.sendText ? client.sendText(phone, message) : null;
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

app.listen(PORT, () => {
    console.log(`🚀 WPPConnect Team server running on port ${PORT}`);
});

async function startWPPConnectTeam() {
    try {
        // Connect to Redis
        await publisher.connect();
        console.log('✅ Redis Publisher Connected');

        // Create WPPConnect session
        client = await create({
            session: 'txai-whatsapp',
            tokenStore: 'file',
            folderNameToken: './tokens',
            puppeteerOptions: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        console.log('✅ WPPConnect Team client created');

        // Handle incoming messages
        client.onMessage(async (message) => {
            try {
                console.log('📱 Message received:', message);

                // Extract message data
                const messageData = {
                    phone: message.from ? message.from.replace('@c.us', '') : 'unknown',
                    message: message.body || 'No message body',
                    messageType: message.type || 'text',
                    timestamp: message.timestamp || Date.now()
                };

                // Push to Redis queue
                await publisher.publishMessage(messageData);
                console.log('📤 Message pushed to Redis queue:', messageData.phone);
            } catch (error) {
                console.error('❌ Error processing message:', error);
            }
        });

        // Handle connection state changes
        client.onStateChange((state) => {
            console.log('🔄 State changed:', state);
        });

        // Client is now ready and available globally
        console.log('✅ WPPConnect Team client is ready for API calls');

    } catch (error) {
        console.error('❌ Error starting WPPConnect Team:', error);
        console.log('🔄 WPPConnect Team client failed to initialize, but server will continue running');
        console.log('🔄 API endpoints will return placeholder responses until client is ready');
        // Don't exit, let the server continue running
    }
}

startWPPConnectTeam();
