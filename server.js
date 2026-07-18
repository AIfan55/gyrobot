// server.js
// Standalone Swarm Authentication & Configuration Backend Engine
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

// Enable open CORS so your Vercel frontend can call these endpoints freely
app.use(cors());

// ==========================================
// 1. IN-MEMORY REGISTRY CREATION (50 BOTS / OPERATORS)
// ==========================================
const robotSwarmRegistry = {};
const operatorRegistry = {};

for (let i = 1; i <= 50; i++) {
    // Balanced allocation pattern: Cycles 1, 2, 3, 1, 2, 3...
    const group = ((i - 1) % 3) + 1; 
    const channel = group === 1 ? 1 : (group === 2 ? 6 : 11);
    
    robotSwarmRegistry[`robot_${i}`] = { group, channel };

    // Format IDs with leading zeros for operator alignment (01 to 50)
    const paddedId = String(i).padStart(2, '0');
    const username = `operator${paddedId}@swarm.local`;
    const password = `SwarmPass2026_${paddedId}`; 
    
    operatorRegistry[username] = password;
}

// ==========================================
// 2. ENDPOINTS INTERACTION PIPELINE
// ==========================================

/**
 * Endpoint A: Operator Authenticating Route
 */
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password fields.' });
    }

    if (operatorRegistry[email] && operatorRegistry[email] === password) {
        // Issue standard localized security token string
        return res.status(200).json({ 
            success: true, 
            token: `swarm-session-token-hash-${Buffer.from(email).toString('base64')}` 
        });
    }
    
    return res.status(401).json({ error: 'Access Denied: Invalid operator credentials.' });
});

/**
 * Endpoint B: Swarm Target Mapping Lookup (Protected)
 */
app.post('/api/swarm/route-robot', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Session identification dropped.' });
    }

    const { robotId } = req.body;
    const parsedId = parseInt(robotId);

    if (isNaN(parsedId) || parsedId < 1 || parsedId > 50) {
        return res.status(400).json({ error: 'Validation Rejection: Robot ID must sit between 1 and 50.' });
    }

    const botData = robotSwarmRegistry[`robot_${parsedId}`];
    if (!botData) {
        return res.status(404).json({ error: 'Swarm Target execution data missing.' });
    }

    console.log(`[ROUTING] Config dispatched for Robot #${parsedId} -> Group ${botData.group}`);
    return res.status(200).json({
        robotId: parsedId,
        group: botData.group,
        channel: botData.channel
    });
});

// Health check route
app.get('/health', (req, res) => res.status(200).send('Swarm Router Online.'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Standalone Swarm Backend streaming live on port ${PORT}`));
