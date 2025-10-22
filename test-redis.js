const redis = require('redis');

async function testRedis() {
    const client = redis.createClient({
        host: 'localhost',
        port: 6380
    });

    await client.connect();

    const message = {
        phone: "557381112636",
        message: "Hello test from Node.js",
        messageType: "text",
        timestamp: Date.now()
    };

    console.log('Pushing message:', message);
    await client.rPush('whatsapp:messages', JSON.stringify(message));
    console.log('Message pushed successfully!');

    await client.disconnect();
}

testRedis().catch(console.error);
