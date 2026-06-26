const express = require('express');
const cors = require('cors');
const { assemblePriorityInbox } = require('./priority_engine');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable Cross-Origin Resource Sharing so your React frontend can talk to it safely
app.use(cors());
app.use(express.json());

// In-memory mock store mimicking PostgreSQL records for localized operations
let mockNotifications = [
    { ID: "1", Type: "Placement", Title: "Google Interview Invite", Message: "Your application for SWE has been shortlisted.", Timestamp: new Date().toISOString(), isRead: false },
    { ID: "2", Type: "Result", Title: "Semester 4 Results Out", Message: "Your SGPA for this semester is 9.2.", Timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false },
    { ID: "3", Type: "Event", Title: "Hackathon Registration Open", Message: "Register for the upcoming annual campus hackathon.", Timestamp: new Date(Date.now() - 7200000).toISOString(), isRead: true }
];

/**
 * [STAGE 1 ENDPOINT 1] Fetch Paginated & Categorized Student Feed
 * GET /api/v1/notifications
 */
app.get('/api/v1/notifications', (req, res) => {
    const { category, page = 1, limit = 10 } = req.query;
    
    let filtered = mockNotifications;
    if (category && category !== 'All') {
        filtered = mockNotifications.filter(n => n.Type.toLowerCase() === category.toLowerCase());
    }
    
    // Simple offset pagination simulation
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + parseInt(limit));
    
    res.json({
        status: "success",
        page: parseInt(page),
        totalItems: filtered.length,
        notifications: paginatedItems
    });
});

/**
 * [STAGE 1 ENDPOINT 2] Mark Notification as Read / Acknowledged
 * PATCH /api/v1/notifications/:id/acknowledge
 */
app.patch('/api/v1/notifications/:id/acknowledge', (req, res) => {
    const { id } = req.params;
    const notification = mockNotifications.find(n => n.ID === id);
    
    if (!notification) {
        return res.status(404).json({ status: "error", message: "Notification record not found." });
    }
    
    notification.isRead = true;
    res.json({ status: "success", message: "Notification acknowledged successfully.", data: notification });
});

/**
 * [STAGE 1 ENDPOINT 3] Fetch Category Summary Badges Count
 * GET /api/v1/notifications/summary
 */
app.get('/api/v1/notifications/summary', (req, res) => {
    const summary = { Placement: 0, Result: 0, Event: 0, totalUnread: 0 };
    
    mockNotifications.forEach(n => {
        if (!n.isRead) {
            summary.totalUnread++;
            if (summary[n.Type] !== undefined) summary[n.Type]++;
        }
    });
    
    res.json({ status: "success", summary });
});

/**
 * [BONUS PROXY ROUTE] Dynamic Stream Multi-Layer Priority Sort Engine Integration
 * GET /api/v1/notifications/priority
 */
app.get('/api/v1/notifications/priority', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const fallbackOrLiveStream = await assemblePriorityInbox(limit);
    
    // If the external evaluation utility server returns nothing (like our 404 error), serve the ranked local matrix instead!
    if (!fallbackOrLiveStream || fallbackOrLiveStream.length === 0) {
        const sortedLocal = [...mockNotifications].sort((a, b) => b.ID - a.ID);
        return res.json({ status: "success", origin: "local_fallback", notifications: sortedLocal.slice(0, limit) });
    }
    
    res.json({ status: "success", origin: "external_stream", notifications: fallbackOrLiveStream });
});

app.listen(PORT, () => {
    console.log(`\n🪐 [BACKEND SERVER RUNNING] REST Endpoints fully operational on http://localhost:${PORT}`);
    console.log(` -> GET   http://localhost:${PORT}/api/v1/notifications`);
    console.log(` -> PATCH http://localhost:${PORT}/api/v1/notifications/:id/acknowledge`);
    console.log(` -> GET   http://localhost:${PORT}/api/v1/notifications/summary`);
    console.log(` -> GET   http://localhost:${PORT}/api/v1/notifications/priority\n`);
});
