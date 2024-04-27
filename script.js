let canvas, toggleMessage, mobileControlsDiv, stopButton, tips, totalFinesseP, totalPiecesP, ppsP, adDiv, settingsButton, applyButton, settingsDiv, settingsForm, helpDiv, cookiePopup;
let device, threads, patterns, patternNames, rotationNames, colors, colors_, piece, pressed, keysQueue, keys, DAS, ARR, pieceChoice, positionChoice, rotationChoice, goal, scores, totalFinesse, totalFaultedPieces, finesse, finesseCodes, whenPlaced, cookiePopupOk, moveSFX, rotateSFX, dropSFX;

device = "Desktop";
threads = {}; // thread id: isRunning
patterns = [
  ["0000", "0110", "0110", "0000"], // O
  ["010", "111", "000"], // T
  ["100", "111", "000"], // J
  ["001", "111", "000"], // L
  ["011", "110", "000"], // S
  ["110", "011", "000"], // Z
  ["0000", "1111", "0000", "0000"], // I
];
patternNames = ["O", "T", "J", "L", "S", "Z", "I"];
positionNames = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
rotationNames = ["N", "E", "S", "W"];
colors = [
  "#f6d03c",
  "#9739a2",
  "#1165b5",
  "#f38927",
  "#51b84d",
  "#eb4f65",
  "#42afe1",
  "#868686",
]; // last one for goal
colors_ = [
  "#ffff7f",
  "#d958e9",
  "#339bff",
  "#ffba59",
  "#84f880",
  "#ff7f79",
  "#6ceaff",
  "#dddddd",
]; // top of the blocks
pressed = {}; // keys pressed
keysQueue = {}; // keys pressed/released this frame
keys = {
  left: "ArrowLeft",
  right: "ArrowRight",
  hardDrop: " ",
  rotateCCW: "q",
  rotateCW: "w",
  rotate180: "e",
  restart: "r",
}; // assigned keys for each action
keysNames = {
  left: "Move mino left",
  right: "Move mino right",
  hardDrop: "Hard drop mino",
  rotateCCW: "Rotate counterclockwise",
  rotateCW: "Rotate clockwise",
  rotate180: "Rotate 180°",
  restart: "Restart",
};
totalFinesse = 0; // number of errors
totalFaultedPieces = 0; // number of finesse faulted pieces
cookiePopupOk = false; // set to true when popup button clicked

whenPlaced = []; // when each piece has been placed (used to calculate PPS)

// combinations of moves for every possible case
finesse = {
  O: {
    "-1": ["L", "L", "L", "L"],
    0: ["Lr", "Lr", "Lr", "Lr"],
    1: ["ll", "ll", "ll", "ll"],
    2: ["l", "l", "l", "l"],
    3: ["", "", "", ""],
    4: ["r", "r", "r", "r"],
    5: ["rr", "rr", "rr", "rr"],
    6: ["Rl", "Rl", "Rl", "Rl"],
    7: ["R", "R", "R", "R"],
  },
  T: {
    "-1": [null, "CL", null, null],
    0: ["L", "LC", "1L", "Lc"],
    1: ["ll", "llC", "1ll", "llc"],
    2: ["l", "lC", "1l", "lc"],
    3: ["", "C", "1", "c"],
    4: ["r", "rC", "1r", "rc"],
    5: ["rr", "rrC", "1rr", "rrc"],
    6: ["Rl", "RlC", "1Rl", "Rlc"],
    7: ["R", "RC", "1R", "Rc"],
    8: [null, null, null, "cR"],
  },
  S: {
    // some of the rotations are pointless
    0: ["L", "LC", null, "Lc"],
    // 1
    2: ["l", null, null, "lc"],
    3: ["", "C", null, "c"],
    4: ["r", "rC", null, null],
    5: ["rr", "rrC", null, null],
    // 6
    7: ["R", "RC", null, "Rc"],
  },
  I: {
    // same
    "-1": [null, null, null, "cL"],
    0: ["L", null, null, "Lc"],
    1: ["ll", "LC", null, "Lc"],
    2: ["l", null, null, "lc"],
    3: ["", "C", null, "c"],
    4: ["r", "rC", null, null],
    5: ["rr", "rC", null, null],
    6: ["R", "RC", null, "RC"],
    7: [null, "CR", null, null],
  },
};
finesse.J = finesse.L = finesse.T;
finesse.Z = finesse.S;
finesseCodes = {
  l: "left",
  r: "right",
  L: "DAS left",
  R: "DAS right",
  c: "CCW rotation",
  C: "CW rotation",
  1: "180° rotation",
};

scores = {};
for (let pi = 0; pi < patternNames.length; pi++) {
  // for every piece
  scores[patternNames[pi]] = {};
  const pos = Object.keys(finesse[patternNames[pi]]);
  for (let p = 0; p < pos.length; p++) {
    // for every possible position (string form)
    scores[patternNames[pi]][pos[p]] = [];
    for (let r = 0; r < 4; r++) {
      // for every rotation
      if (finesse[patternNames[pi]][pos[p]][r] === null) {
        scores[patternNames[pi]][pos[p]].push(null);
      } else {
        scores[patternNames[pi]][pos[p]].push([0, 0]); // [success, total]
      }
    }
  }
}

moveSFX = new Audio("sounds/move.mp3");
rotateSFX = new Audio("sounds/rotate.mp3");
dropSFX = new Audio("sounds/drop.mp3");
failSFX = new Audio("sounds/fail.mp3");
restartSFX = new Audio("sounds/restart.mp3");
buttonSFX = new Audio("sounds/button.mp3");

class Canvas {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
  }

  drawBlock(x, y, index, blockOnTop, alpha, isGoal = false) {
    // block with 3D-like border around
    x *= 40;
    y *= 40;
    this.ctx.fillStyle = hexToRGBA(colors[index], alpha);

    if (isGoal) {
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = "rgba(255, 255, 255, 1)";
      this.ctx.setLineDash([5, 4]);
      this.ctx.strokeRect(x, y, 40, 40);
    } else {
      this.ctx.fillRect(x, y, 40, 40);
    }

    this.ctx.fill();
    this.ctx.setLineDash([]);

    if (!blockOnTop && !isGoal) {
      this.ctx.fillStyle = hexToRGBA(colors_[index], alpha);
      this.ctx.fillRect(x, y - 8, 40, 8);
      this.ctx.fill();
    }
  }

  draw() {
    this.ctx.fillStyle = "#363941";
    this.ctx.fillRect(0, 0, 400, 800);
    this.ctx.fill();

    // draw lines
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = "rgba(170, 170, 170, 0.3)";
    for (let x = 1; x < 10; x++) {
      for (let y = 1; y < 20; y++) {
        this.ctx.beginPath();
        this.ctx.moveTo(40 * x - 10, 40 * y);
        this.ctx.lineTo(40 * x + 10, 40 * y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(40 * x, 40 * y - 10);
        this.ctx.lineTo(40 * x, 40 * y + 10);
        this.ctx.stroke();
      }
    }
  }
}

class Piece {
  constructor(index, pos = [3, 1], rotation = 0, goal = false) {
    this.pos = pos;
    this.index = index;
    this.goal = goal;
    this.len = patterns[index].length;
    this.startMove = 0;
    this.lastDASMove = 0;
    this.totalMoves = ""; // used for finesse

    this.pattern = [];
    for (let y = 0; y < this.len; y++) {
      const line = patterns[index][y];
      this.pattern.push([]);
      for (let x = 0; x < line.length; x++) {
        this.pattern[y].push(parseInt(line[x]));
      }
    }

    if (goal) {
      for (let i = 0; i < rotation; i++) {
        this.rotate();
      }
      this.rotation = rotation;
      this.hardDrop(); // go to the bottom of the grid
    }
  }

  collide() {
    for (let x = 0; x < this.len; x++) {
      for (let y = 0; y < this.len; y++) {
        if (this.pattern[y][x]) {
          const x_ = x + this.pos[0];
          const y_ = y + this.pos[1];
          if (x_ < 0 || x_ > 9 || y_ < 0 || y_ > 19) {
            return true;
          }
        }
      }
    }
    return false;
  }

  rotate() {
    // clockwise
    const newPattern = [];
    for (let x = 0; x < this.len; x++) {
      newPattern.push([]);
      for (let y = 0; y < this.len; y++) {
        newPattern[x].push(this.pattern[this.len - y - 1][x]);
      }
    }
    this.pattern = newPattern;
  }

  left(fromKey = true) {
    this.pos[0] -= 1;
    if (this.collide()) {
      this.pos[0] += 1;
    } else {
      playSound(moveSFX);
      if (fromKey) {
        this.startMove = Date.now();
      }
    }
  }

  right(fromKey = true) {
    this.pos[0] += 1;
    if (this.collide()) {
      this.pos[0] -= 1;
    } else {
      playSound(moveSFX);
      if (fromKey) {
        this.startMove = Date.now();
      }
    }
  }

  hardDrop() {
    while (!this.collide()) {
      this.pos[1] += 1;
    }
    this.pos[1] -= 1;
  }

  equals(piece) {
    if (this.index !== piece.index) {
      return false; // shouldn't happen
    }

    let x1;
    let y1;
    let x2;
    let y2;
    let thisPos;
    let piecePos;
    x1 = this.pos[0];
    y1 = this.pos[1];
    x2 = piece.pos[0];
    y2 = piece.pos[1];
    thisPos = []; // list of blocks
    piecePos = [];

    for (let x = 0; x < this.len; x++) {
      for (let y = 0; y < this.len; y++) {
        if (this.pattern[y][x]) {
          thisPos.push([x + x1, y + y1].toString()); // converted to string to make it comparable
        }
        if (piece.pattern[y][x]) {
          piecePos.push([x + x2, y + y2].toString());
        }
      }
    }

    for (let i = 0; i < thisPos.length; i++) {
      if (!piecePos.includes(thisPos[i])) {
        return false; // at least one block was off
      }
    }
    return true;
  }

  removeChar(chr) {
    // remove last occurence of chr in this.totalMoves
    const index = this.totalMoves.lastIndexOf(chr);
    this.totalMoves =
      this.totalMoves.slice(0, index) + this.totalMoves.slice(index + 1);
  }

  update() {
    let forceDraw = false;

    // movement
    if (keysQueue[keys.left]) {
      this.totalMoves += "l";
      this.left();
    } else if (keysQueue[keys.right]) {
      this.totalMoves += "r";
      this.right();
    }
    if (pressed[keys.left] !== true && pressed[keys.right] !== true) {
      this.startMove = 0; // stop DAS timeout if both left and right keys are released
    }

    // rotation
    if (keysQueue[keys.rotateCCW]) {
      playSound(rotateSFX);
      this.totalMoves += "c";
      for (let i = 0; i < 3; i++) {
        this.rotate();
      }
      if (this.collide()) {
        this.rotate();
      }
    }
    if (keysQueue[keys.rotateCW]) {
      playSound(rotateSFX);
      this.totalMoves += "C";
      this.rotate();
      if (this.collide()) {
        for (let i = 0; i < 3; i++) {
          this.rotate();
        }
      } else {
        this.startMove = Date.now();
      }
    }
    if (keysQueue[keys.rotate180]) {
      playSound(rotateSFX);
      this.totalMoves += "1";
      for (let i = 0; i < 2; i++) {
        this.rotate();
      }
      if (this.collide()) {
        for (let i = 0; i < 2; i++) {
          this.rotate();
        }
      }
    }

    // DAS/ARR
    if (this.startMove && Date.now() - this.startMove > DAS) {
      if (ARR) {
        if (Date.now() - this.lastDASMove > ARR) {
          if (this.lastDASMove === 0) {
            // start of DAS
            // remove the previous l/r movement and add DAS
            this.removeChar(pressed[keys.left] ? "l" : "r");
            this.totalMoves += pressed[keys.left] ? "L" : "R";
          }
          if (pressed[keys.left]) {
            this.left(false);
          }
          if (pressed[keys.right]) {
            this.right(false);
          }
          this.lastDASMove = Date.now();
          forceDraw = true;
        }
      } else {
        // instant movement (0 ARR)
        playSound(moveSFX);
        let add;
        if (this.lastDASMove === 0) {
          this.removeChar(pressed[keys.left] ? "l" : "r");
          this.totalMoves += pressed[keys.left] ? "L" : "R";
        }
        if (pressed[keys.left]) {
          add = -1;
        } else {
          add = 1;
        }
        while (!this.collide()) {
          this.pos[0] += add;
        }
        this.pos[0] -= add;
        this.startMove = 0;
        forceDraw = true;
      }
    } else {
      this.lastDASMove = 0;
    }

    // hard drop
    if (keysQueue[keys.hardDrop]) {
      this.hardDrop();
      playSound(dropSFX);
      return [true, forceDraw];
    }

    return [false, forceDraw];
  }

  draw() {
    let trueY;
    let shadowY;
    if (!this.goal) {
      trueY = this.pos[1];
      this.hardDrop();
      shadowY = this.pos[1];
      this.pos[1] = trueY;
    }

    for (let x = 0; x < this.len; x++) {
      for (let y = 0; y < this.len; y++) {
        if (this.pattern[y][x]) {
          let blockOnTop = true;
          if (y === 0 || this.pattern[y - 1][x] === 0) {
            blockOnTop = false;
          }

          if (this.goal) {
            // draw grey shape
            canvas.drawBlock(
              this.pos[0] + x,
              this.pos[1] + y,
              7,
              blockOnTop,
              1,
              this.goal
            );
          } else {
            // draw piece and shadow
            canvas.drawBlock(
              this.pos[0] + x,
              shadowY + y,
              this.index,
              blockOnTop,
              1
            );
            canvas.drawBlock(
              this.pos[0] + x,
              trueY + y,
              this.index,
              blockOnTop,
            );
          }
        }
      }
    }
  }
}

function playSound(sound) {
  if (sound != undefined) {
    sound.pause();
    sound.currentTime = 0;
    sound.play();
  }
}

function mobileCheck() {
  // switch to mobile if needed
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a,
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4),
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  if (check === true) {
    toggleDevice();
  }
}

function hexToRGBA(hex, alpha) {
  // hex needs to be 6 digits
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  } else {
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }
}

function updateSettings() {
  pieceChoice = [];
  positionChoice = [];
  rotationChoice = [];

  // [list to get the names from, list to add to, string to add before id]
  const values = [
    [patternNames, pieceChoice, "piece-"],
    [positionNames, positionChoice, "position-"],
    [rotationNames, rotationChoice, "rotation-"],
  ];

  for (let i = 0; i < values.length; i++) {
    const listFrom = values[i][0];
    const listTo = values[i][1];
    const addToId = values[i][2];
    for (let j = 0; j < listFrom.length; j++) {
      if (
        document
          .getElementById(addToId + listFrom[j])
          .classList.contains("checked")
      ) {
        listTo.push(listFrom[j]);
      }
    }
  }

  applyButton.className = "input-button";
  saveCookies();
  restart(); // restart to see the changes
}

function updateDASSettings() {
  const DAS_ = document.getElementById("DAS");
  const ARR_ = document.getElementById("ARR");
  DAS = parseInt(DAS_.value); // ms
  ARR = parseInt(ARR_.value); // ms
}

function updateSettingsInHTML() {
  // [list to check if selected, list to get the names from, string to add before id]
  const values = [
    [pieceChoice, patternNames, "piece-"],
    [positionChoice, positionNames, "position-"],
    [rotationChoice, rotationNames, "rotation-"],
  ];

  // update piece settings checkboxes
  for (let i = 0; i < values.length; i++) {
    const listSelected = values[i][0];
    const listNames = values[i][1];
    const addToId = values[i][2];
    for (let j = 0; j < listNames.length; j++) {
      const element = document.getElementById(addToId + listNames[j]);
      if (
        element.classList.contains("unchecked") &&
        listSelected.includes(listNames[j])
      ) {
        toggleSetting(element.id); // check element
      }
      if (
        element.classList.contains("checked") &&
        !listSelected.includes(listNames[j])
      ) {
        toggleSetting(element.id); // uncheck element
      }
    }
  }

  // update keybinds
  const keys_ = Object.keys(keys);
  for (let i = 0; i < keys_.length; i++) {
    document.getElementById(keys_[i]).value = keys[keys_[i]];
  }
}

function addSettingsToHTML() {
  // add a style for the pieces toggles
  const style = document.createElement("style");
  document.getElementsByTagName("head")[0].appendChild(style);

  const div = document.getElementById("settings-form");
  const pieces = document.getElementById("allowed-pieces");
  const positions = document.getElementById("allowed-positions");
  const rotations = document.getElementById("allowed-rotations");

  // [place to put, list to get the names from, string to add before id]
  const values = [
    [pieces, patternNames, "piece-"],
    [positions, positionNames, "position-"],
    [rotations, rotationNames, "rotation-"],
  ];

  for (let i = 0; i < values.length; i++) {
    // generate checkboxes
    const place = values[i][0];
    const list = values[i][1];
    const addToId = values[i][2];
    for (let j = list.length - 1; j >= 0; j--) {
      const element = document.createElement("a");
      element.setAttribute("id", addToId + list[j]);
      element.setAttribute(
        "href",
        "javascript:toggleSetting('ID')".replace(/ID/g, element.id),
      );
      element.classList.add("unchecked");
      element.innerHTML = list[j];

      // if piece, color it like the piece
      if (place === pieces) {
        const css =
          "#ID.checked {background-color: BG1; color: FG1} #ID.unchecked {background-color: BG2; color: FG2}"
            .replace(/ID/g, element.id)
            .replace(/BG1/g, colors[patternNames.indexOf(list[j])])
            .replace(/FG1/g, colors_[patternNames.indexOf(list[j])])
            .replace(/BG2/g, colors[patternNames.length])
            .replace(/FG2/g, colors_[patternNames.length]);
        style.appendChild(document.createTextNode(css));
      }

      div.insertBefore(element, place.nextSibling);
    }
  }
}

function addKeysSettingsToHTML() {
  let element;
  let keys_;
  keys_ = Object.keys(keys);
  for (let i = 0; i < keys_.length; i++) {
    element = document.createElement("label");
    element.for = keys_[i];
    element.innerHTML = keysNames[keys_[i]];
    settingsForm.appendChild(element);
    element = document.createElement("input");
    element.type = "text";
    element.id = keys_[i];
    element.value = keys[keys_[i]];
    settingsForm.appendChild(element);
    element = document.createElement("br");
    settingsForm.appendChild(element);
  }
}

function addKeysListeners() {
  const keys_ = Object.keys(keys);
  for (let i = 0; i < keys_.length; i++) {
    document.getElementById(keys_[i]).addEventListener("keydown", editKey);
  }
}

function removeKeysListeners() {
  const keys_ = Object.keys(keys);
  for (let i = 0; i < keys_.length; i++) {
    document.getElementById(keys_[i]).removeEventListener("keydown", editKey);
  }
}

function editKey(event) {
  const id = document.activeElement.id;
  const valid = event.key !== ";"; // can't use ; character

  function updateKey() {
    if (valid) {
      document.activeElement.value = event.key;
    } else {
      document.activeElement.value = "Unusable character";
    }
  }

  function resetKey() {
    document.activeElement.value = keys[id];
  }

  if (valid) {
    keys[id] = event.key;
  } else {
    window.setTimeout(resetKey, 1000);
  }
  window.setTimeout(updateKey, 1);
}

function toggleSetting(id) {
  const caller = document.getElementById(id);
  if (caller.classList.contains("checked")) {
    caller.classList.add("unchecked");
    caller.classList.remove("checked");
  } else {
    caller.classList.add("checked");
    caller.classList.remove("unchecked");
  }
  applyButton.classList.add("red");
}

function start() {
  // add event listeners for sounds
  function btn() {
    playSound(buttonSFX);
  }
  const btns = document.querySelectorAll(".pseudo-button,.input-button");
  for (let i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", btn);
  }

  canvas = new Canvas();
  toggleMessage = document.getElementById("toggle-message");
  mobileControlsDiv = document.getElementById("mobile-controls-div");
  tipsP = document.getElementById("tips");
  totalFinesseP = document.getElementById("total-finesse");
  totalPiecesP = document.getElementById("total-pieces");
  ppsP = document.getElementById("pps");
  stopButton = document.getElementById("stop");
  applyButton = document.getElementById("apply");
  adDiv = document.getElementById("ad");
  settingsButton = document.getElementById("settings-button");
  settingsDiv = document.getElementById("keys-settings");
  settingsForm = document.getElementById("keys-settings-form");
  helpDiv = document.getElementById("help");
  cookiePopup = document.getElementById("cookie-popup");

  mobileCheck();

  updateDASSettings();
  addSettingsToHTML();
  addKeysSettingsToHTML();
  openCookies();
  if (cookiePopupOk) {
    hideCookiePopup();
  }

  restart();
}

function restart() {
  function findId() {
    // find available id in threads
    const keys = Object.keys(threads);
    let i = 0;
    while (keys.includes(i)) {
      i++;
    }
    return i;
  }

  stop();

  if (newGoal()) {
    // found a valid piece
    const id = findId();
    threads[id] = true; // allow a new thread to start
    gameFrame(id);
  }

  totalFinesse = 0;
  totalFaultedPieces = 0;
  whenPlaced = [];
  stopButton.classList = "pseudo-button";
  stopButton.innerHTML = "Stop";
}

function stop() {
  const keys = Object.keys(threads);
  for (let i = 0; i < keys.length; i++) {
    // index backwards in case deletion happens in the process
    threads[keys[i]] = false;
  }
  stopButton.classList = "pseudo-button red";
  stopButton.innerHTML = "Stopped";
}

function newGoal() {
  function choice(list) {
    if (list.length !== 0) {
      return list[Math.floor(Math.random() * list.length)];
    }
    return null; // not possible; will raise an alert
  }

  let pieceName;
  let positionChoice_;
  let rotationChoice_;
  let pos;
  let rotation;
  if (pieceChoice.length !== 0) {
    pieceName = choice(pieceChoice);

    positionChoice_ = [];
    for (let i = 0; i < positionChoice.length; i++) {
      const p = positionChoice[i];
      if (Object.keys(finesse[pieceName]).includes(p.toString())) {
        positionChoice_.push(p); // only allow positions contained in this piece finesse
      }
    }
    if (positionChoice.length !== 0) {
      pos = [choice(positionChoice_), 0];

      rotationChoice_ = [];
      for (let i = 0; i < rotationChoice.length; i++) {
        const r = rotationNames.indexOf(rotationChoice[i]);
        if (finesse[pieceName][pos[0].toString()][r] !== null) {
          rotationChoice_.push(r); // only allow rotations contained in this position finesse
        }
      }
      if (rotationChoice.length !== 0) {
        rotation = choice(rotationChoice_);
        if (rotation === null) {
          // just brute force until a valid set is chosen
          return newGoal();
        }

        goal = new Piece(patternNames.indexOf(pieceName), pos, rotation, true);
        piece = new Piece(goal.index);
        return true;
      }
    }
  }
  // if did not succeed, did not return so execute the following lines
  canvas.draw();
  alert("Please select a valid set of piece settings");
  return false;
}

function drawPPS() {
  if (whenPlaced.length > 1) {
    const start = whenPlaced[0];
    const end = whenPlaced[whenPlaced.length - 1];
    const pps = ((whenPlaced.length - 1) * 1000) / (end - start);
    ppsP.innerHTML = "PPS: " + parseInt(pps * 100) / 100;
  } else {
    ppsP.innerHTML = "PPS: -";
  }
}

function gameFrame(id, length = 1) {
  const return_ = piece.update(); // will return information needed
  const placed = return_[0];
  const forceDraw = return_[1];

  if (length !== 0) {
    canvas.draw();
    piece.draw();
    goal.draw();
    drawPPS();
  }

  if (placed) {
    let ok = false;
    if (piece.equals(goal)) {
      // correct position and rotation
      let finesse_;
      let score;
      finesse_ =
        finesse[patternNames[goal.index]][goal.pos[0].toString()][
        goal.rotation
        ];
      score =
        scores[patternNames[goal.index]][goal.pos[0].toString()][goal.rotation];

      if (piece.totalMoves.length === finesse_.length) {
        tipsP.innerHTML = "Tips: -";
        score[0] += 1;
        ok = true;
      } else {
        showTips(finesse_);
        totalFaultedPieces += 1;
      }
      score[1] += 1;
      whenPlaced.push(Date.now());
      totalFinesse += Math.max(piece.totalMoves.length - finesse_.length, 0);
      totalFinesseP.innerHTML =
        "Finesse: " +
        totalFinesse +
        "F (" +
        parseInt(
          ((whenPlaced.length - totalFaultedPieces) * 10000) /
          whenPlaced.length,
        ) /
        100 +
        "%)";
      totalPiecesP.innerHTML = "Total pieces: " + whenPlaced.length;
    }
    if (ok) {
      newGoal();
    } else {
      playSound(failSFX);
      piece = new Piece(goal.index); // retry
    }
  }

  if (keysQueue[keys.restart]) {
    playSound(restartSFX);
    window.setTimeout(restart, 0);
  }

  if (forceDraw === true) {
    length = 1;
  } else {
    // if no draw needed, only draw if action done
    length = Object.keys(keysQueue).length;
  }
  keysQueue = {}; // reset the queue each frame
  if (threads[id]) {
    // this thread is allowed to run
    window.setTimeout(function () {
      gameFrame(id, length);
    }, 0);
  } else {
    // stop
    delete threads[id];
  }
}

function showTips(tipsCode) {
  let tips = "Tips: ";
  for (let i = 0; i < tipsCode.length; i++) {
    tips += finesseCodes[tipsCode[i]];
    if (i !== tipsCode.length - 1) {
      tips += ", ";
    }
  }
  tipsP.innerHTML = tips;
}

function toggleDevice() {
  if (device === "Desktop") {
    device = "Mobile"; // toggle to mobile website
    document.body.className = "mobile-body";
    canvas.canvas.style.margin = "20px auto 20px auto";
    canvas.canvas.style.width = "200px";
    canvas.canvas.style.height = "400px";
    mobileControlsDiv.style.display = "flex";
    mobileControlsDiv.addEventListener("touchstart", handleTouchStart);
    mobileControlsDiv.addEventListener("touchend", handleTouchEnd);
    adDiv.style.display = "none";
    settingsForm.style.display = "none";

  } else {
    device = "Desktop"; // toggle to desktop website
    document.body.className = "";
    canvas.canvas.style.margin = "20px";
    canvas.canvas.style.width = "400px";
    canvas.canvas.style.height = "800px";
    mobileControlsDiv.style.display = "none";
    mobileControlsDiv.removeEventListener("touchstart", handleTouchStart);
    mobileControlsDiv.removeEventListener("touchend", handleTouchEnd);
    adDiv.style.display = "flex";
    settingsForm.style.display = "block";
  }

  toggleMessage.innerHTML = device + " website -";
}

// handle keys pressed
window.addEventListener("keydown", function (e) {
  if (!e.repeat) {
    pressed[e.key] = true;
    keysQueue[e.key] = true;
  }
});

window.addEventListener("keyup", function (e) {
  pressed[e.key] = false;
  keysQueue[e.key] = false;
});

// handle touch (mobile mode)

function handleTouchStart(evt) {
  handleTouch(evt, true);
}

function handleTouchEnd(evt) {
  handleTouch(evt, false);
}

function handleTouch(evt, value) {
  evt.preventDefault();
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    // change button appearance (touched), but make sure to target the right element
    let target = touches[i].target;
	if (target.tagName == "IMG") target = target.parentNode;
    if (value) {
      target.classList.add("touched");
    } else {
      target.classList.remove("touched");
    }
    // trigger linked action
    let action = target.getAttribute("linked-action");
    pressed[keys[action]] = value;
    keysQueue[keys[action]] = value;
  }
}

function openKeysSettings() {
  settingsDiv.style.display = "flex";
  addKeysListeners();
  stop();
}

function closeKeysSettings() {
  settingsDiv.style.display = "none";
  removeKeysListeners();
  updateDASSettings();
  saveCookies();
  restart();
}

function openHelp() {
  helpDiv.style.display = "flex";
  stop();
}

function closeHelp() {
  helpDiv.style.display = "none";
  restart();
}

function deleteAllCookies() {
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    document.cookie =
      cookies[i].split("=")[0] +
      "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  }
}

function openCookies() {
  // defaults, when a cookie is non-existent or missing
  pieceChoice = [...patternNames];
  positionChoice = [...positionNames];
  rotationChoice = [...rotationNames];

  if (document.cookie !== "") {
    const cookie = document.cookie.replaceAll("space", " ").split("; ");
    const preferences = {};
    const keys_ = [];
    for (let i = 0; i < cookie.length; i++) {
      const key = cookie[i].split("=")[0];
      const value = cookie[i].split("=")[1];
      preferences[key] = value;
      keys_.push(key);
    }

    // handling
    const keysOfKeys = Object.keys(keys);
    for (let i = 0; i < keysOfKeys.length; i++) {
      if (preferences[keysOfKeys[i]] !== undefined) {
        keys[keysOfKeys[i]] = preferences[keysOfKeys[i]];
      }
    }

    // piece settings
    if (keys_.includes("pieces")) {
      pieceChoice = preferences.pieces.split("");
    }
    if (keys_.includes("positions")) {
      positionChoice = preferences.positions.split("");
    }
    if (keys_.includes("rotations")) {
      rotationChoice = preferences.rotations.split("");
    }

    // others
    if (preferences.cookiePopupOk === "true") {
      cookiePopupOk = true;
    }
    if (preferences.DAS !== undefined) {
      DAS = parseInt(preferences.DAS);
      const DAS_ = document.getElementById("DAS");
      DAS_.value = DAS;
    }
    if (preferences.ARR !== undefined) {
      ARR = parseInt(preferences.ARR);
      const ARR_ = document.getElementById("ARR");
      ARR_.value = ARR;
    }

    for (let i = 0; i < positionChoice.length; i++) {
      // convert positions to integers + shift them
      positionChoice[i] = parseInt(positionChoice[i]) - 1; // stored as 0 - 9 instead of -1 - 8
    }
  } else {
    // no cookies saved: create them and leave everything as default
    console.log("Could not retrieve any cookies");
    saveCookies(); // update cookies
  }
  updateSettingsInHTML();
  applyButton.className = "input-button";
}

function saveCookies() {
  const date = new Date(Date.now() + 2592000000); // expires in 30 days
  const end = "; expires=" + date.toGMTString() + "; path=/";

  deleteAllCookies(); // begin fresh

  // handling
  const keys_ = Object.keys(keys);
  for (let i = 0; i < keys_.length; i++) {
    let key = keys[keys_[i]];
    if (key == " ") {
      key = "space";
    }
    document.cookie = keys_[i] + "=" + key + end;
  }

  // piece settings
  let positionChoice_ = "";
  for (let i = 0; i < positionChoice.length; i++) {
    positionChoice_ += positionChoice[i] + 1;
  }
  document.cookie = "pieces=" + pieceChoice.join("") + end;
  document.cookie = "positions=" + positionChoice_ + end;
  document.cookie = "rotations=" + rotationChoice.join("") + end;

  // others
  document.cookie = "cookiePopupOk=" + cookiePopupOk + end;
  document.cookie = "DAS=" + DAS + end;
  document.cookie = "ARR=" + ARR + end;
}

function hideCookiePopup() {
  cookiePopupOk = true; // user when close button clicked
  cookiePopup.style.display = "none";
  saveCookies();
}
