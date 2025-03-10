import * as logicFunctions from './gamelogic.js';


export function contextSwitchOut(){
    console.log("contextSwitchOut");
    const superBoard = document.getElementById("super-board");
    const blocks = superBoard.children;
    const blocksState = logicFunctions.getBlockState();
    console.log("blocksState", blocksState);
    for(let i = 0; i <9 ; i++){
        if(blocksState[i] === logicFunctions.states.empty){
            blocks[i].classList.add("faded");
        }
    }
}

export function contextSwitchIn(){
    console.log("contextSwitchIn");
    const validBlockIndices = logicFunctions.getValidBlocks();
    const superBoard = document.getElementById("super-board");
    const blocks = superBoard.children;
    const blocksState = logicFunctions.getBlockState();
    for(const validBlockIdx of validBlockIndices){
        if(blocksState[validBlockIdx] === logicFunctions.states.empty){
            blocks[validBlockIdx].classList.remove("faded");
        }
    }
}

export function highlightNewMove(cell) {
    cell.classList.add("highlight");

    setTimeout(() => {
        cell.style.transition = "background-color 1s ease-in-out"; // Ensure transition applies
        cell.classList.remove("highlight");
    }, 500); // Delay before removing
}

export function hightlightNextMoveBlocks(block) {
    block.classList.add("highlight");

    setTimeout(() => {
        block.style.transition = "background-color 1s ease-in-out"; // Ensure transition applies
        block.classList.remove("highlight");
    }, 1000); // Delay before removing
}

export function displayWinnerSymbol(boardElement, winner) {
    const overlay = document.createElement("div");
    for (const cell of boardElement.children) {
        cell.classList.add("faded");
    }
    overlay.classList.add("winner-symbol");
    boardElement.appendChild(overlay);
    overlay.textContent = winner; // Display "X" or "O"
    
}