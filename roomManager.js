const session = require('express-session');
const express = require("express");
const router = express.Router();
const sessionManager = require("./sessionManager");


const matchRoom = new Map();
// format:
// roomId: {
//      player1: socketId,
//      player2: socketId,
//      state: gameInstance,
// }    playerType: {
//          player1: X,
//          player2: O,
//      }
//}

// a user may leave the room temporarily, but the room should not be deleted 
// and the player1 socket will be null in that case, (both cant be null)

let nextMatchId = 1;

const states = {
    X: 'X',
    O: 'O',
    empty: null,
}

function getInitialState(){
    return {
        cellState: [
            [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
            [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
            [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
            [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
            [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
            [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
            [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
            [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
            [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty]
        ],
        blockState: [
            states.empty, states.empty, states.empty,
            states.empty, states.empty, states.empty,
            states.empty, states.empty, states.empty
        ],
        validBlocks: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        isNext: null
    };
}

function getUserDataFromSocketId(socketId) {
    for (const [userId, user] of sessionManager.userMap.entries()) {
        if (user.socketId === socketId) {
            return user;
        }
    }
    return null;
}

function createMatchRoom(player1_socketId, player2_socketId) {
    const roomId = nextMatchId++;
    const state = getInitialState();
    state.isNext = 0;
    matchRoom.set(roomId, {
        player1: player1_socketId,
        player2: player2_socketId,
        state: state,
        playerType: {
            player1: 'X',
            player2: 'O'
        }
    });
    const player1 = getUserDataFromSocketId(player1_socketId);
    const player2 = getUserDataFromSocketId(player2_socketId);
    player1.playerType = 'X';
    player2.playerType = 'O';

    return roomId;
}




router.post("/getState", (req, res) => {
    console.log("getState request");
    const userId = req.session.userId;
    
    const user = sessionManager.userMap.get(userId);
    console.log("user socket: ", user.socketId);
    if (user == null) { res.json(null); return;}
    
    const room = matchRoom.get(user.matchRoom);
    if (room == null) {
        console.log("new user entering the room")
        res.json(getInitialState()); return; }
        
    room.state.playerType = user.playerType;
    if(room.state.isNext == 0){
        if(room.player1 == user.socketId){
            room.state.isNext = true;
        } else {
            room.state.isNext = false;
        }
    } else if(room.state.isNext == 1){
        if(room.player2 == user.socketId){
            room.state.isNext = true;
        } else {
            room.state.isNext = false;
        }
    } else {
        console.log("!!! something wrong ey")
    }
    console.log("room state: ", room, room.state.isNext);

    res.json(room.state);
});

module.exports = {
    matchRoom,
    createMatchRoom,
    roomRoutes : router
}