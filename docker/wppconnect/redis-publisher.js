const { createClient } = require('redis');

class RedisPublisher {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.queueName = 'whatsapp:messages';
    }

    async connect() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
            this.client = createClient({ url: redisUrl });

            this.client.on('error', (err) => {
                console.error('❌ Redis Publisher Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('✅ Redis Publisher Connected');
                this.isConnected = true;
            });

            await this.client.connect();
            console.log('✅ Redis Publisher connected successfully');
        } catch (error) {
            console.error('❌ Failed to connect Redis Publisher:', error);
            throw error;
        }
    }

    async publishMessage(messageData) {
        if (!this.isConnected || !this.client) {
            console.log('⚠️ Redis Publisher not connected, skipping message');
            return;
        }

        try {
            const message = {
                event: 'message',
                data: {
                    from: messageData.from,
                    body: messageData.body,
                    type: messageData.type || 'text',
                    t: messageData.t || Date.now()
                },
                timestamp: Date.now()
            };

            await this.client.lPush(this.queueName, JSON.stringify(message));
            console.log('📤 Message published to Redis queue:', message);
        } catch (error) {
            console.error('❌ Error publishing message to Redis:', error);
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            this.isConnected = false;
        }
    }
}

module.exports = RedisPublisher;
