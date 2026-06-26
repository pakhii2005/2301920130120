const express = require('express');
const cors = require('cors');
const { assemblePriorityInbox } = require('./priority_engine');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Built-in High-Speed Cache Interface (Simulating Redis Engine Cluster)
const localRedisMemory = new Map();
const redisClient = {
    isOpen: true,
    get: async (key) => {
        const item = localRedisMemory.get(key);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
            localRedisMemory.del(key);
            return null;
        }
        return item.value;
    },
    setEx: async (key, ttlSeconds, value) => {
        localRedisMemory.set(key, {
            value: value,
            expiresAt: Date.now() + (ttlSeconds * 1000)
        });
    },
    del: async (key) => {
        localRedisMemory.delete(key);
    }
};

console.log('📡 Redis Cache Engine Connected Safely. (In-Memory Simulation Mode)');

// Core Database Array Mock Store
let mockNotifications = [
    { ID: "1", Type: "Placement", Title: "Google Interview Invite", Message: "Your application for SWE has been shortlisted.", Timestamp: new Date().toISOString(), isRead: false },
    { ID: "2", Type: "Result", Title: "Semester 4 Results Out", Message: "Your SGPA for this semester is 9.2.", Timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false },
    { ID: "3", Type: "Event", Title: "Hackathon Registration Open", Message: "Register for the upcoming annual campus hackathon.", Timestamp: new Date(Date.now() - 7200000).toISOString(), isRead: true }
];

let sseClients = [];

app.get('/api/v1/notifications', async (req, res) => {
    const { category, page = 1, limit = 10 } = req.query;
    
    // Cache-Aside Check
    if ((!category || category === 'All') && page == 1) {
        const cachedFeed = await redisClient.get('notifications_feed');
        if (cachedFeed) {
            console.log('⚡ Redis Cache Hit: Serving notifications instantly.');
            return res.json({
                status: "success",
                origin: "redis_cache",
                notifications: JSON.parse(cachedFeed).slice(0, limit)
            });
        }
    }

    console.log('🐢 Cache Miss: Fetching records from database tier.');
    let filtered = mockNotifications;
    if (category && category !== 'All') {
        filtered = mockNotifications.filter(n => n.Type.toLowerCase() === category.toLowerCase());
    }
    
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + parseInt(limit));
    
    if (!category || category === 'All') {
        await redisClient.setEx('notifications_feed', 60, JSON.stringify(filtered));
    }

    res.json({
        status: "success",
        origin: "database_tier",
        page: parseInt(page),
        totalItems: filtered.length,
        notifications: items
    });
});

app.patch('/api/v1/notifications/:id/acknowledge', async (req, res) => {
    const { id } = req.params;
    const notification = mockNotifications.find(n => n.ID === id);
    
    if (!notification) {
        return res.status(404).json({ status: "error", message: "Record not found." });
    }
    
    notification.isRead = true;
    await redisClient.del('notifications_feed');

    res.json({ status: "success", data: notification });
});

app.get('/api/v1/notifications/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    sseClients.push(res);
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);
    req.on('close', () => sseClients = sseClients.filter(c => c !== res));
});

app.post('/api/v1/notifications/broadcast', async (req, res) => {
    const { type, title, message } = req.body;
    const newAlert = {
        ID: String(mockNotifications.length + 1),
        Type: type || "Event",
        Title: title || "New System Broadcaster Event",
        Message: message || "System check update.",
        Timestamp: new Date().toISOString(),
        isRead: false
    };

    mockNotifications.unshift(newAlert);
    await redisClient.del('notifications_feed');

    sseClients.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'NEW_NOTIFICATION', data: newAlert })}\n\n`);
    });

    res.status(201).json({ status: "broadcast_success", record: newAlert });
});

app.listen(PORT, () => {
    console.log(`🪐 [CACHE ARCHITECTURE ONLINE] Server active at http://localhost:${PORT}`);
});
