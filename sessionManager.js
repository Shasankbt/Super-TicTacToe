const session = require('express-session');
const express = require('express');

let nextUserId = 1;
const userMap = new Map();

// Create an explicit session store
const MemoryStore = session.MemoryStore;
const store = new MemoryStore();

const USER_TIMEOUT = 10 * 60; // 10 minutes
const CLEANUP_INTERVAL = 60; // 1 minute

// Create the session middleware using that store
const sessionMiddleware = session({
    store: store,  // Use the explicitly created store
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
});

const userTrackingMiddleware = (req, res, next) => {
    console.log("hii");
    if (!req.session.userId) {
        console.log("creating new user: ", nextUserId);
        req.session.userId = nextUserId++;
        userMap.set(req.session.userId, {
            userId: req.session.userId,
            socketId: null,
            gameId: null,
            playerType: null,
            matchRoom: null,
            lastActive: Date.now()
        });
    } else {
        // Update last active timestamp for existing users
        if (userMap.has(req.session.userId)) {
            const user = userMap.get(req.session.userId);
            user.lastActive = Date.now();
        } else {
            console.log("old user logging in: ", req.session.userId);
            userMap.set(req.session.userId, {
                userId: req.session.userId,
                socketId: null,
                gameId: null,
                playerType: null,
                matchRoom: null,
                lastActive: Date.now()
            })
        }
    }
    next();
};

// Cleanup inactive users based on time
const cleanupInactiveUsers = () => {
    console.log('Starting time-based cleanup of inactive users...');
    const now = Date.now();
    
    let removedCount = 0;
    for (const [userId, user] of userMap.entries()) {
        // If user has lastActive property and has been inactive for more than threshold
        if (user.lastActive && (now - user.lastActive > USER_TIMEOUT * 1000)) {
            console.log(`Removing inactive user ${userId} (inactive for ${Math.round((now - user.lastActive)/1000)} seconds)`);
            userMap.delete(userId);
            removedCount++;
        }
    }
    
    console.log(`Cleanup complete. Removed ${removedCount} users. UserMap size: ${userMap.size}`);
};

const app = express();
const router = express.Router();

router.post('/getOldSocket', (req, res) => {
    const userData = userMap.get(req.session.userId);
    if (userData) {
        console.log("old user logging in: ", req.session.userId, "with socketID: ", userData.socketId);
        res.json({ socketId: userData.socketId });
    } else {
        res.json({ socketId: null });
    }
});

app.use('/session/', router);







// Run cleanup every 30 seconds
const cleanupInterval = setInterval(cleanupInactiveUsers, CLEANUP_INTERVAL * 1000);

module.exports = {
    sessionMiddleware,
    userTrackingMiddleware,
    userMap,
    store  // Export the store if needed elsewhere
};