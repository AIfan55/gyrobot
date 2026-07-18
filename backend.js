// server.js (Firebase-Free Swarm Auth Backend)
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Allows your Vercel frontend to communicate freely

// 1. HARDCODED SWARM MAPPING LOGIC (1 to 50)
// Automated allocation: Group 1 (Ch 1), Group 2 (Ch 6), Group 3 (Ch 11)
const robotSwarmRegistry = {};
for (let i = 1; i <= 50; i++) {
    // Cycles groups: 1, 2, 3, 1, 2, 3...
    const group = ((i - 1) % 3) + 1; 
    const channel = group === 1 ? 1 : (group === 2 ? 6 : 11);
    
    robotSwarmRegistry[`robot_${i}`] = { group, channel };
}

// 2. GENERATE OPERATOR USERNAMES & PASSWORDS (operator01 to operator50)
const operatorRegistry = {};
for (let i = 1; i <= 50; i++) {
    const paddedId = String(i).padStart(2, '0');
    const username = `operator${paddedId}@swarm.local`;
    const password = `SwarmPass2026_${paddedId}`; // Unique per operator
    
    operatorRegistry[username] = password;
}

/**
 * Endpoint A: Simple Driver Login Validation
 */
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (operatorRegistry[email] && operatorRegistry[email] === password) {
        // Return a simple mock session token string
        return res.status(200).json({ 
            success: true, 
            token: `mock-session-token-operator-${email}` 
        });
    }
    
    return res.status(401).json({ error: 'Invalid operator credentials.' });
});

/**
 * Endpoint B: Swarm Target Profile Routing
 */
app.post('/api/swarm/route-robot', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized session.' });
    }

    const { robotId } = req.body;
    const parsedId = parseInt(robotId);

    if (!parsedId || parsedId < 1 || parsedId > 50) {
        return res.status(400).json({ error: 'Robot ID out of bounds (1-50).' });
    }

    const botData = robotSwarmRegistry[`robot_${parsedId}`];
    if (!botData) {
        return res.status(404).json({ error: 'Robot profile not found.' });
    }

    console.log(`[ROUTE MATCHED] Dispatched profile config for Robot #${parsedId}`);
    return res.status(200).json({
        robotId: parsedId,
        group: botData.group,
        channel: botData.channel
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Standalone Auth Engine live on port ${PORT}`));
