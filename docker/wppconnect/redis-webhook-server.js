const express = require('express');
const RedisPublisher = require('./redis-publisher');

const app = express();
const port = 3002;

// Initialize Redis Publisher
const redisPublisher = new RedisPublisher();

// Connect to Redis
redisPublisher.connect().catch(console.error);

// Middleware to parse JSON
app.use(express.json());

// Webhook endpoint to receive messages from WPPConnect
app.post('/webhook', async (req, res) => {
    try {
        console.log('📱 Webhook received - Raw body:', req.body);
        console.log('📱 Webhook received - Body type:', typeof req.body);

        // Extract message data from WPPConnect webhook format
        const message = req.body;

        if (message && message.from && message.body) {
            const payload = {
                phone: message.from.replace('@c.us', ''),
                message: message.body,
                messageType: message.type || 'text',
                timestamp: message.t ? message.t * 1000 : Date.now()
            };

            await redisPublisher.publishMessage(payload);
            console.log('📤 Message published to Redis:', payload.phone);
        } else {
            console.log('❌ Invalid message format:', message);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.status(500).json({ error: 'Error processing webhook' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Redis webhook server running on port ${port}`);
});
