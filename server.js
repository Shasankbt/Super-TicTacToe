const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // Create server first
const io = new Server(server); // Pass server to socket.io
const sessionManager = require("./sessionManager");
const roomManager = require("./roomManager");
const session = require('express-session');

const PORT = 3000;

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionManager.sessionMiddleware);
app.use(sessionManager.userTrackingMiddleware);

app.use("/room", roomManager.roomRoutes);


app.get('/', (req, res) => {
    res.render("home.ejs"); // If using EJS, make sure `app.set('view engine', 'ejs');`
});

app.get('/game/:id', (req, res) => {
    console.log("rendering gamepage.ejs")
    res.render("gamePage.ejs");
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.post('/getOldSocket', (req, res) => {
    console.log("old user logging in: ", req.session.userId, " with map: ", sessionManager.userMap);
    const userData = sessionManager.userMap.get(req.session.userId);
    if (userData) {
        console.log("old user logging in: ", req.session.userId, "with socketID: ", userData.socketId);

        res.json({ socketId: userData.socketId });
    } else {
        res.json({ socketId: null });
    }
});

const opponents = new Map()


const sharedSession = require("express-socket.io-session");
io.use(sharedSession(sessionManager.sessionMiddleware, {
    autoSave: true
}));

function checkForOlderConnections(socketId) {
    for (const [userId, user] of sessionManager.userMap.entries()) {
        if (user.socketId === socketId) {
            console.log(`Old socket ${socketId} found. Disconnecting it.`);
            io.sockets.sockets.get(socketId).disconnect();
        }
    }
}

function getUserDataFromSocketId(socketId) {
    for (const [userId, user] of sessionManager.userMap.entries()) {
        if (user.socketId === socketId) {
            return user;
        }
    }
    return null;
}


io.on('connection', (socket) => {
    const session = socket.handshake.session
    if(!session.userId){
        console.log("!!!Session not found");
        const newuser = sessionManager.createNewUser();
        session.userId = newuser.userId;
        sessionManager.userMap.set(session.userId, newuser);
    }
    console.log('A user connected:', socket.id, " with id: ", session.userId);

    
    const oldSocketId = sessionManager.userMap.get(session.userId)?.socketId;
    if (oldSocketId && io.sockets.sockets.has(oldSocketId)) {
        console.log(`Old socket ${oldSocketId} found. Disconnecting it.`);
        io.sockets.sockets.get(oldSocketId).disconnect();
    }
    
    // initiate after the user sends the signal to the server
    socket.on('new-connection-request-to-server', () => {
        handleJoin(socket, session);
    });

    socket.on('pair', (to_id, connection_type) => {
        handlePair(socket, to_id, connection_type, session);
        console.log("usermap: ", sessionManager.userMap)
        // if(connection_type === "initiate"){
        //     console.log('recieved intiatte-pair request:', to_id);
        // } else if (connection_type === "sucess"){
        //     console.log('recieved pair-sucessful signal:', to_id);
        // }
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket, session);
    });

    socket.on('move', (player, position) => {
        handleMove(socket, player, position, session);
    });

    socket.on
});


function handleJoin(socket, session){
    const userData = sessionManager.userMap.get(session.userId);
    if (userData) {
        userData.socketId = socket.id; // Modify the existing object
        sessionManager.userMap.set(session.userId, userData); // Re-set the entry
    
        if(roomManager.matchRoom.has(userData.matchRoom) ){
            // Rejoin match room
            const room = roomManager.matchRoom.get(userData.matchRoom);
            let opponentId;
            if(room.player1 && room.player2){
                console.log("!!!Room is full");
                return;
            } else if(room.player1){
                opponentId = room.player1;
                room.player2 = socket.id;
            } else {
                opponentId = room.player2;
                room.player1 = socket.id;
            }
            roomManager.matchRoom.set(userData.matchRoom, room);
            opponents.set(socket.id, opponentId);
            opponents.set(opponentId, socket.id);
            console.log('Pairing', socket.id, 'with', opponentId);
            socket.emit('pair', opponents.get(socket.id), "sucess"); // Send pair request to specific player
        } else {
            // incase the opponent left the room and is null but this user left early, resetting room
            userData.matchRoom = null;
            sessionManager.userMap.set(session.userId, userData);

            // broadcast or search for players
            socket.broadcast.emit('new-connection-request', socket.id); // Broadcast new connection to all players
        }
    }
}

function handlePair(socket, to_id, connection_type, session){
    opponents.set(socket.id, to_id);
    opponents.set(to_id, socket.id);
    const userData = sessionManager.userMap.get(session.userId);
    if( ! roomManager.matchRoom.has(userData.matchRoom) ) {
        const roomId = roomManager.createMatchRoom(socket.id, to_id);
        if (userData) {
            userData.matchRoom = roomId;
            sessionManager.userMap.set(socket.handshake.session.userId, userData);
        }
        const opponentData = sessionManager.userMap.get(io.sockets.sockets.get(to_id).handshake.session.userId);
        if (opponentData) {
            opponentData.matchRoom = roomId;
            sessionManager.userMap.set(io.sockets.sockets.get(to_id).handshake.session.userId, opponentData);
        }
    }
    
    console.log('Pairing', socket.id, 'with', to_id);

    socket.to(to_id).emit('pair', socket.id, connection_type); // Send pair request to specific player
}

function handleDisconnect(socket, session){
    console.log('A user disconnected:', socket.id);
    const userData = sessionManager.userMap.get(session.userId);
    if(userData === null){
        console.log("user data is null");
        return
    }

    userData.socketId = null; // Modify the existing object
    sessionManager.userMap.set(session.userId, userData); // Re-set the entry
    const roomData = roomManager.matchRoom.get(userData.matchRoom);
    if (roomData) {
        // if the connected user was in a room, unpair them from the opponent
        let opponentId;
        if(roomData.player1 === socket.id){
            roomData.player1 = null;
            opponentId = roomData.player2;
        } else if (roomData.player2 === socket.id){
            roomData.player2 = null;
            opponentId = roomData.player1;
        }
        // now if the room is empty, delete it
        if(roomData.player1 === null && roomData.player2 === null){
            roomManager.matchRoom.delete(userData.matchRoom);
        } else {
            roomManager.matchRoom.set(userData.matchRoom, roomData);
            opponents.set(opponentId, null);
        }
        
        opponents.delete(socket.id);
        console.log('Unpairing', socket.id, 'from', opponentId);
        socket.to(opponentId).emit('unpair', socket.id); // Send unpair request to specific player
    }

}

function handleLeave(){}

function handleMove(socket, playerType, position, session){
    // console.log(opponents)
    const opponentId = opponents.get(socket.id);
    console.log('Move from', socket.id, 'to', opponentId, ':', playerType, position);
    
    const room = roomManager.matchRoom.get(sessionManager.userMap.get(session.userId).matchRoom);
    if(playerType === roomManager.states.X){
        room.state.cellState[position.boardIdx][position.cellIdx] = roomManager.states.X;
        room.state.player1.isNext = false;
        room.state.player2.isNext = true;
        room.state.player2.validBlocks = roomManager.getValidBlocks(room.state, position.cellIdx);
    } else if (playerType === roomManager.states.O){
        room.state.cellState[position.boardIdx][position.cellIdx] = roomManager.states.O;
        room.state.player1.isNext = true;
        room.state.player2.isNext = false;
        room.state.player1.validBlocks = roomManager.getValidBlocks(room.state, position.cellIdx);
    }
    roomManager.checkBlockWin(room.state, position.boardIdx);
    roomManager.matchRoom.set(sessionManager.userMap.get(session.userId).matchRoom, room);
    if (opponentId) {
        socket.to(opponentId).emit('move', playerType, position); // Send move to specific player
    }
}


