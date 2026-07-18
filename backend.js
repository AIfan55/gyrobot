// server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());

// Enable CORS explicitly for your Vercel deployment domain
app.use(cors({
    origin: process.env.VERCEL_FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Reconstruct Private Key string to properly escape newlines in production environments
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

// Safety Guardrail validation for deployment setup
if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
    console.error("CRITICAL CONFIGURATION ERROR: Environment values missing inside runtime layer.");
    process.exit(1);
}

// Initialize secure Firebase Admin Operations Interface
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

/**
 * Security Middleware: Asserts incoming client headers carry valid Firebase JSON tokens
 */
async function verifySessionToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing session token prefix.' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.operator = decodedToken;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Forbidden: Session key signature invalid.' });
    }
}

/**
 * Core Dynamic Target Routing Endpoint
 */
app.post('/api/swarm/route-robot', verifySessionToken, async (req, res) => {
    const { robotId } = req.body;
    const parsedId = parseInt(robotId);

    if (!parsedId || parsedId < 1 || parsedId > 50) {
        return res.status(400).json({ error: 'Validation Error: Target out of range parameters.' });
    }

    try {
        // Interrogate database reference nodes for targeted routing data
        const snapshot = await db.ref(`robots/robot_${parsedId}`).once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: `Swarm target record for ID #${parsedId} missing.` });
        }

        const configurationManifest = snapshot.val();
        console.log(`[ROUTE SUCCESS] Operator: ${req.operator.email} mapped to Target Robot #${parsedId}`);

        return res.status(200).json({
            robotId: parsedId,
            group: configurationManifest.group,
            channel: configurationManifest.channel
        });

    } catch (dbError) {
        console.error('Database query structural exception:', dbError);
        return res.status(500).json({ error: 'Internal failure resolving target path configuration.' });
    }
});

// Port binding fallback rules for cloud container wrappers
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Swarm Core Security Microservice active on port ${PORT}`);
});