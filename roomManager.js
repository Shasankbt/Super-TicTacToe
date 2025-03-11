const session = require('express-session');
const express = require("express");
const router = express.Router();
const sessionManager = require("./sessionManager");
const { stat } = require('fs');


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
        player1: {
            playerType: states.X,
            validBlocks: [0, 1, 2, 3, 4, 5, 6, 7, 8],
            isNext: true
        },
        player2: {
            playerType: states.O,
            validBlocks: [0, 1, 2, 3, 4, 5, 6, 7, 8],
            isNext: false
        }
        
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
    });
    const player1 = getUserDataFromSocketId(player1_socketId);
    const player2 = getUserDataFromSocketId(player2_socketId);
    player1.playerType = 'X';
    player2.playerType = 'O';

    return roomId;
}




router.post("/getState", (req, res) => {
    const userId = req.session.userId;
    
    const user = sessionManager.userMap.get(userId);
    console.log("user socket: ", user.socketId);
    if (user == null) {
        console.log("user is null while getting state");
        res.json(null);
        return;
    }
    
    const room = matchRoom.get(user.matchRoom);
    if (room == null) {
        console.log("room is null while getting state");
        res.json(null);
        return;
    }

    const userState = {
        cellState: room.state.cellState,
        blockState: room.state.blockState,
        playerType: null,
        validBlocks: null,
        isNext: null
    }
    if(room.player1 == user.socketId){
        userState.playerType = 'X';
        userState.validBlocks = room.state.player1.validBlocks;
        userState.isNext = room.state.player1.isNext;
    }
    else if(room.player2 == user.socketId){
        userState.playerType = 'O';
        userState.validBlocks = room.state.player2.validBlocks;
        userState.isNext = room.state.player2.isNext;
    }
    else {
        console.log("room.player1: ", room.player1, "room.player2: ", room.player2, "user.socketId: ", user.socketId);
        console.log("!! something wrong while getting state");
        res.json(null);
        return
    }
    console.log("userState (while getState fetch): ", userState);
    res.json(userState);
});

function getValidBlocks(currState, cellIdx){
    if(currState.blockState[cellIdx] === states.empty){
        return [cellIdx];
    } else {
        return currState.blockState.map((state, index) => state === states.empty ? index : null).filter(index => index !== null);
    }
}

function checkBlockWin(state, boardIdx) {
    if (state.blockState[boardIdx] !== states.empty) {
        console.log("asked to check for the block win of already won block, something wrong");
        return;
    }
    const board = state.cellState[boardIdx];
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6], // Diagonals
    ];
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            state.blockState[boardIdx] = board[a];
        }
    }
}

module.exports = {
    states,
    matchRoom,
    createMatchRoom,
    getValidBlocks,
    checkBlockWin,
    roomRoutes : router
}