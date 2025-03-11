

export function getIsPaired() { return isPaired; }

export function setIsPaired(value) { isPaired = value; }

export function getPlayerState() { return userState; }

export function setPlayerState(state) { userState = state; }

export function getIsNext() { return isNext; }

export function setIsNext(value) { isNext = value; }



// export const states = {
//     X: 'X',
//     O: 'O',
//     empty: null,
// }
// let cellState =  [
//     [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
//     [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
//     [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
//     [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
//     [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
//     [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
//     [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
//     [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty],
//     [states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty, states.empty]
// ];
// let blockState = [
//     states.empty, states.empty, states.empty,
//     states.empty, states.empty, states.empty,
//     states.empty, states.empty, states.empty
// ];
// let validBlocks = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export function getCellState() {
    return cellState;
}

export function getBlockState() {
    return blockState;
}

export function setCellState(state, boardIdx, cellIdx) {
    cellState[boardIdx][cellIdx] = state;
}

export const states = {
    X: 'X',
    O: 'O',
    empty: null,
}
let isPaired = false;
let userState = null;
let cellState = null;
let blockState = null;
let validBlocks = null;
let isNext = null;

export async function loadState(){
    console.log("loading state");
    try {
        const response = await fetch('/room/getState', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const state = await response.json();
        console.log("loaded state: ", state);
        if (state) {
            cellState = state.cellState;
            blockState = state.blockState;
            validBlocks = state.validBlocks;
            isNext = state.isNext;
            userState = state.playerType;
        }
    } catch (error) {
        console.error('Error fetching state:', error);
    }
}

export function validateMove(boardIdx, cellIdx) {
    if (blockState[boardIdx] !== states.empty) {
        return false;
    }
    if (cellState[boardIdx][cellIdx] !== states.empty) {
        return false;
    }
    if (!validBlocks.includes(String(boardIdx)) &&  ! validBlocks.includes(Number(boardIdx))) {
        console.log("invalid move due to not being in valid blocks");
        console.log("validBlocks: ", validBlocks);
        console.log("boardIdx: ", boardIdx);
        return false;
    }
    console.log("valid move");
    return true;
}

export function updateValidBlocks(cellIdx){
    if(blockState[cellIdx] === states.empty){
        validBlocks = [cellIdx];
    } else {
        validBlocks = blockState.map((state, index) => state === states.empty ? index : null).filter(index => index !== null);
    }
}

export function getValidBlocks(){
    return validBlocks;
}

export function checkBlockWin(boardIdx) {
    if (blockState[boardIdx] !== states.empty) {
        return blockState[boardIdx];
    }
    const board = cellState[boardIdx];
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6], // Diagonals
    ];
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            blockState[boardIdx] = board[a];
            return blockState[boardIdx];
        }
    }
    return states.empty;
}
