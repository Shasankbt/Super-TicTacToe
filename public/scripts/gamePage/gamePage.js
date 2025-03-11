let socket = null;
let loadedData = false;

// import {states, logicFunctions.getPlayerState, logicFunctions.setPlayerState, logicFunctions.setCellState, getBlockState, logicFunctions.validateMove, logicFunctions.checkBlockWin} from './gamelogic.js';
import * as logicFunctions from './gamelogic.js';
import * as uiFunctions from './ui.js';

async function getOldSocket(){
    const response = await fetch('/getOldSocket', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    console.log("data: ", data);
    return data.socketId;
}


async function socketConnect(){
    socket = io();
    let opponentId = null
    socket.on('connect', () => {
        onConnection(socket);
    });
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        
    });
    socket.on('new-connection-request', (id) => {
        if (!logicFunctions.getIsPaired()) {
            console.log('New player connected:', id);
            socket.emit('pair', id, "initiate");
            opponentId = id;
            logicFunctions.setIsPaired(true);
        }
    });
    socket.on('pair', (id, connection_type) => {
        opponentId = id;
        if(connection_type === "initiate"){
            console.log('recieved intiatte-pair request:', id);
        } else if (connection_type === "sucess"){
            console.log('recieved pair-sucessful signal:', id);
        }
        onPair(socket, id, connection_type);
    });
    socket.on('unpair', (id) => {
        console.log('Unpaired from:', id);
        opponentId = null;
        // logicFunctions.setIsPaired(false);
        // logicFunctions.setPlayerState(null);
        socket.emit('new-connection-request');
    });
}

async function onConnection(socket){
    console.log('Connected to server with id: ', socket.id);
    socket.emit('new-connection-request-to-server', );
    loadedData = true;
    getUpdateFromServer();
}

async function onPair(socket, to_id, connection_type){
    console.log('Paired with:', to_id);
    await logicFunctions.loadState();
    renderState();
    logicFunctions.setIsPaired(true);
    if (logicFunctions.getIsNext()){
        uiFunctions.contextSwitchIn();
    } else{
        uiFunctions.contextSwitchOut();
    }
    if(connection_type === "initiate"){
        socket.emit('pair', to_id, "sucess");
    }
}



function renderEmptySuperBlock(){
    const superBoard = document.getElementById("super-board");

    function createBoard(boardIdx) {
        const board = document.createElement("div");
        board.dataset.board = boardIdx;
        board.classList.add("board");
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.index = i;
            cell.dataset.board = boardIdx;
            cell.addEventListener("click", () => handleClick(cell));
            board.appendChild(cell);
        }
        return board;
    }

    for (let i = 0; i < 9; i++) {
        superBoard.appendChild(createBoard(i));
    }
}

function renderState(){
    const cellState = logicFunctions.getCellState();
    const blockState = logicFunctions.getBlockState();
    const superBoard = document.getElementById("super-board");
    const blocks = superBoard.children;
    for(let i = 0; i < 9; i++){
        const block = blocks[i];
        const cells = block.children;
        for(let j = 0; j < 9; j++){
            if(cellState[i][j] !== logicFunctions.states.empty){
                cells[j].textContent = cellState[i][j];
            }
        }
        if(blockState[i] !== logicFunctions.states.empty){
            uiFunctions.displayWinnerSymbol(block, blockState[i]);
        }
    }
    if(logicFunctions.getIsNext()){
        uiFunctions.contextSwitchIn();
    }
    else{
        uiFunctions.contextSwitchOut();
    }
}

function handleClick(cell) {
    const boardIdx = cell.dataset.board;
    console.log('Clicked:', cell.dataset.board, cell.dataset.index, "logicFunctions.isXNext:", logicFunctions.getIsNext());
    

    if (!logicFunctions.getIsNext() || cell.textContent) return; // Prevent overwriting
    if(!logicFunctions.validateMove(cell.dataset.board, cell.dataset.index)) return;
    
    cell.textContent = logicFunctions.getPlayerState();
    logicFunctions.setCellState(logicFunctions.getPlayerState(), cell.dataset.board, cell.dataset.index);
    const winner = logicFunctions.checkBlockWin(cell.dataset.board);
    if (winner !== logicFunctions.states.empty) {
        const boardElement = cell.parentElement;
        console.log('Block', cell.dataset.board, 'won by', winner);
        uiFunctions.displayWinnerSymbol(boardElement, winner);
    }
    updateMoveToServer(cell);
    logicFunctions.setIsNext(false);
    uiFunctions.contextSwitchOut();
}





function updateMoveToServer(cell) {
    if(logicFunctions.getPlayerState() === null){
        console.error('Player state is null');
    }
    socket.emit(
        'move',
        logicFunctions.getPlayerState(),
        {
            boardIdx: cell.dataset.board,
            cellIdx: cell.dataset.index,
        }
    );
}


function getUpdateFromServer(){
    socket.on('move', (player, { boardIdx, cellIdx }) => {
        // update cell
        const cell = document.querySelector(`.cell[data-board="${boardIdx}"][data-index="${cellIdx}"]`);
        cell.textContent = player;
        uiFunctions.highlightNewMove(cell);
        logicFunctions.setCellState(player, boardIdx, cellIdx);
        
        // check for block winner
        const winner = logicFunctions.checkBlockWin(boardIdx);
        if (winner !== logicFunctions.states.empty) {
            const boardElement = cell.parentElement;
            console.log('Block', cell.dataset.board, 'won by', winner);
            uiFunctions.displayWinnerSymbol(boardElement, winner);
        }
        
        // check for superblock winner

        // highlight valid block for next move
        logicFunctions.updateValidBlocks(cellIdx);
        const validBlockIndices = logicFunctions.getValidBlocks();
        for (const idx of validBlockIndices) {
            const block = document.querySelector(`.board[data-board="${idx}"]`);
            uiFunctions.hightlightNextMoveBlocks(block);
        }      
        uiFunctions.contextSwitchIn();
  
        logicFunctions.setIsNext(true);
        
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    socketConnect();
    renderEmptySuperBlock();



});