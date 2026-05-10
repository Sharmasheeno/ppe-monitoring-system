const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('Connected to Broker');

    // Subscribe to alerts
    client.subscribe('ppe/alerts', (err) => {
        if (!err) {
            console.log('Subscribed to ppe/alerts');
        }
    });

    // Simulate publishing an alert after 2 seconds
    setTimeout(() => {
        const alert = JSON.stringify({
            title: "Test Alert",
            body: "Testing MQTT Connection",
            type: "Test",
            timestamp: new Date().toISOString()
        });
        client.publish('ppe/alerts', alert);
        console.log('Published Test Alert');
    }, 2000);
});

client.on('message', (topic, message) => {
    console.log(`Received message on ${topic}: ${message.toString()}`);
    client.end();
});
