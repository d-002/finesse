let canvas, toggleMessage, mobileControlsDiv, stopButton, tips, totalFinesseP, totalPiecesP, ppsP, mobileButtons, adDiv, settingsButton, settingsDiv, settingsForm, helpDiv, cookiePopup;
let device, threads, patterns, patternNames, rotationNames, colors, colors_, piece, pressed, keysQueue, keys, DAS, ARR, pieceChoice, positionChoice, rotationChoice, goal, scores, totalFinesse, finesse, finesseCodes, nPieces, whenPlaced, cookiePopupOk;
device = "Desktop";
threads = {}; // thread id: isRunning
mobileButtons = [];
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
colors = ["#f6d03c", "#9739a2", "#f38927", "#1165b5", "#51b84d", "#eb4f65", "#42afe1", "#868686"]; // last one for goal
colors_ = ["#ffff7f", "#d958e9", "#ffba59", "#339bff", "#84f880", "#ff7f79", "#6ceaff", "#dddddd"]; // top of the blocks
pressed = {}; // keys pressed
keysQueue = {}; // keys pressed/released this frame
keys = {
  "left": "ArrowLeft",
  "right": "ArrowRight",
  "hardDrop": " ",
  "rotateCCW": "z",
  "rotateCW": "ArrowUp",
  "rotate180": "a"
}; // assigned keys for each action
keysNames = {
  "left": "Move mino left",
  "right": "Move mino right",
  "hardDrop": "Hard drop mino",
  "rotateCCW": "Rotate counterclockwise",
  "rotateCW": "Rotate clockwise",
  "rotate180": "Rotate 180°"
}
totalFinesse = 0; // number of errors
nPieces = 0; // number of placed pieces
cookiePopupOk = false; // set to true when popup button clicked

whenPlaced = []; // when each piece has been placed (used to calculate PPS)

// combinations of moves for every possible case
finesse = {
  "O": {
    "-1": ["L", "L", "L", "L"],
    "0": ["Lr", "Lr", "Lr", "Lr"],
    "1": ["ll", "ll", "ll", "ll"],
    "2": ["l", "l", "l", "l"],
    "3": ["", "", "", ""],
    "4": ["r", "r", "r", "r"],
    "5": ["rr", "rr", "rr", "rr"],
    "6": ["Rl", "Rl", "Rl", "Rl"],
    "7": ["R", "R", "R", "R"]
  },
  "T": {
    "-1": [null, "CL", null, null],
    "0": ["L", "LC", "1L", "Lc"],
    "1": ["ll", "llC", "1ll", "llc"],
    "2": ["l", "lC", "1l", "lc"],
    "3": ["", "C", "1", "c"],
    "4": ["r", "rC", "1r", "rc"],
    "5": ["rr", "rrC", "1rr", "rrc"],
    "6": ["Rl", "RlC", "1Rl", "Rlc"],
    "7": ["R", "RC", "1R", "Rc"],
    "8": [null, null, null, "cR"]
  },
  "S": { // some of the rotations are pointless
    "0": ["L", "LC", null, "Lc"],
    // 1
    "2": ["l", null, null, "lc"],
    "3": ["", "C", null, "c"],
    "4": ["r", "rC", null, null],
    "5": ["rr", "rrC", null, null],
    // 6
    "7": ["R", "RC", null, "Rc"]
  },
  "I": { // same
    "-1": [null, null, null, "cL"],
    "0": ["L", null, null, "Lc"],
    "1": ["ll", "LC", null, "Lc"],
    "2": ["l", null, null, "lc"],
    "3": ["", "C", null, "c"],
    "4": ["r", "rC", null, null],
    "5": ["rr", "rC", null, null],
    "6": ["R", "RC", null, "RC"],
    "7": [null, "CR", null, null]
  },
};
finesse.J = finesse.L = finesse.T;
finesse.Z = finesse.S;
finesseCodes = {
  "l": "left",
  "r": "right",
  "L": "DAS left",
  "R": "DAS right",
  "c": "CCW rotation",
  "C": "CW rotation",
  "1": "180° rotation"
};

scores = {};
for (let pi = 0; pi < patternNames.length; pi++) { // for every piece
  scores[patternNames[pi]] = {};
  let pos = Object.keys(finesse[patternNames[pi]]);
  for (let p = 0; p < pos.length; p++) { // for every possible position (string form)
    scores[patternNames[pi]][pos[p]] = [];
    for (let r = 0; r < 4; r++) { // for every rotation
      if (finesse[patternNames[pi]][pos[p]][r] === null) {
        scores[patternNames[pi]][pos[p]].push(null);
      } else {
        scores[patternNames[pi]][pos[p]].push([0, 0]); // [success, total]
      }
    }
  }
}

class Canvas {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
  }

  drawBlock(x, y, index, blockOnTop, alpha) {
    // block with 3D-like border around
    x *= 40;
    y *= 40;
    this.ctx.fillStyle = hexToRGBA(colors[index], alpha);
    this.ctx.fillRect(x, y, 40, 40);
    this.ctx.fill();

    if (!blockOnTop) {
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
    this.ctx.lineWidth = 2;
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
      let line = patterns[index][y];
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
          let x_ = x + this.pos[0];
          let y_ = y + this.pos[1];
          if (x_ < 0 || x_ > 9 || y_ < 0 || y_ > 19) {
            return true;
          }
        }
      }
    }
    return false;
  }

  rotate() { // clockwise
    let newPattern = [];
    for (let x = 0; x < this.len; x++) {
      newPattern.push([])
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
    } else if (fromKey) {
      this.startMove = Date.now();
    }
  }

  right(fromKey = true) {
    this.pos[0] += 1;
    if (this.collide()) {
      this.pos[0] -= 1;
    } else if (fromKey) {
      this.startMove = Date.now();
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

    let x1, y1, x2, y2, thisPos, piecePos;
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

  removeChar(chr) { // remove last occurence of chr in this.totalMoves
    let index = this.totalMoves.lastIndexOf(chr);
    this.totalMoves = this.totalMoves.slice(0, index) + this.totalMoves.slice(index + 1);
  }

  update() {
    let forceDraw = false;

    // movement
    if (keysQueue[keys.left]) {
      this.totalMoves += "l";
      this.left();
    }
    if (keysQueue[keys.right]) {
      this.totalMoves += "r";
      this.right();
    }
    if (pressed[keys.left] !== true && pressed[keys.right] !== true) {
      this.startMove = 0; // stop DAS timeout if both left and right keys are released
    }

    // rotation
    if (keysQueue[keys.rotateCCW]) {
      this.totalMoves += "c";
      for (let i = 0; i < 3; i++) {
        this.rotate();
      }
      if (this.collide()) {
        this.rotate();
      }
    }
    if (keysQueue[keys.rotateCW]) {
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
          if (this.lastDASMove === 0) { // start of DAS
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
      } else { // instant movement (0 ARR)
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
      return [true, forceDraw];
    }

    return [false, forceDraw];
  }

  draw() {
    let trueY, shadowY;
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

          if (this.goal) { // draw grey shape
            canvas.drawBlock(this.pos[0] + x, this.pos[1] + y, 7, blockOnTop, 0.3);
          } else { // draw piece and shadow
            canvas.drawBlock(this.pos[0] + x, shadowY + y, this.index, blockOnTop, 0.3);
            canvas.drawBlock(this.pos[0] + x, trueY + y, this.index, blockOnTop);
          }
        }
      }
    }
  }
}

function hexToRGBA(hex, alpha) { // hex needs to be 6 digits
  var r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  } else {
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }
}

function updateSettings(fromButton) {
  let DAS_ = document.getElementById("DAS");
  let ARR_ = document.getElementById("ARR");
  DAS = parseInt(DAS_.value); // ms
  ARR = parseInt(ARR_.value); // ms
  pieceChoice = [];
  positionChoice = [];
  rotationChoice = [];

  // [list to get the names from, list to add to, string to add before id]
  let values = [
    [patternNames, pieceChoice, "piece-"],
    [positionNames, positionChoice, "position-"],
    [rotationNames, rotationChoice, "rotation-"]
  ];

  for (let i = 0; i < values.length; i++) {
    let listFrom = values[i][0];
    let listTo = values[i][1];
    let addToId = values[i][2];
    for (let j = 0; j < listFrom.length; j++) {
      if (document.getElementById(addToId + listFrom[j]).classList.contains("checked")) {
        listTo.push(listFrom[j]);
      }
    }
  }

  // rotation needs to be 0/1/2/3 instead of N/E/S/W
  values = [
    ["N", 0],
    ["E", 1],
    ["S", 2],
    ["W", 3]
  ]; // [to replace, with what]
  for (let i = 0; i < values.length; i++) {
    let from = values[i][0];
    let to = values[i][1];
    let index = rotationChoice.indexOf(from);
    if (index !== -1) {
      rotationChoice[index] = to;
    }
  }

  if (fromButton) {
    saveCookies();
    restart(); // restart to see the changes
  }
}

function updateSettingsInHTML() {
  // [list to check if selected, list to get the names from, string to add before id]
  let rotationChoiceStr = [];
  for (let i = 0; i < rotationChoice.length; i++) {
    rotationChoiceStr.push(rotationNames[rotationChoice[i]]);
  }
  let values = [
    [pieceChoice, patternNames, "piece-"],
    [positionChoice, positionNames, "position-"],
    [rotationChoiceStr, rotationNames, "rotation-"]
  ];

  for (let i = 0; i < values.length; i++) { // update checkboxes
    let listSelected = values[i][0];
    let listNames = values[i][1];
    let addToId = values[i][2];
    for (let j = 0; j < listNames.length; j++) {
      let element = document.getElementById(addToId + listNames[j]);
      if (element.classList.contains("unchecked") && listSelected.includes(listNames[j])) {
        toggleSetting(element.id); // check element
      }
      if (element.classList.contains("checked") && !listSelected.includes(listNames[j])) {
        toggleSetting(element.id); // uncheck element
      }
    }
  }
}

function addSettingsToHTML() {
  // add a style for the pieces toggles
  let style = document.createElement("style");
  document.getElementsByTagName("head")[0].appendChild(style);

  let div = document.getElementById("settings-form");
  let pieces = document.getElementById("allowed-pieces");
  let positions = document.getElementById("allowed-positions");
  let rotations = document.getElementById("allowed-rotations");

  // [place to put, list to get the names from, string to add before id]
  let values = [
    [pieces, patternNames, "piece-"],
    [positions, positionNames, "position-"],
    [rotations, rotationNames, "rotation-"]
  ];

  for (let i = 0; i < values.length; i++) { // generate checkboxes
    let place = values[i][0];
    let list = values[i][1];
    let addToId = values[i][2];
    for (let j = list.length - 1; j >= 0; j--) {
      let element = document.createElement("a");
      element.setAttribute("id", addToId + list[j]);
      element.setAttribute("href", "javascript:toggleSetting('ID')".replace(/ID/g, element.id));
      element.classList.add("unchecked");
      element.innerHTML = list[j];

      // if piece, color it like the piece
      if (place === pieces) {
        let css = "#ID.checked {background-color: BG1; color: FG1} #ID.unchecked {background-color: BG2; color: FG2}".replace(/ID/g, element.id).replace(/BG1/g, colors[patternNames.indexOf(list[j])]).replace(/FG1/g, colors_[patternNames.indexOf(list[j])]).replace(/BG2/g, colors[patternNames.length]).replace(/FG2/g, colors_[patternNames.length])
        style.appendChild(document.createTextNode(css));
      }

      div.insertBefore(element, place.nextSibling);
    }
  }
}

function addKeysSettingsToHTML() {
  let element, k;
  k = Object.keys(keys);
  for (let i = 0; i < k.length; i++) {
    element = document.createElement("label");
    element.for = k[i];
    element.innerHTML = keysNames[k[i]];
    settingsForm.appendChild(element);
    element = document.createElement("input");
    element.type = "text";
    element.id = k[i];
    element.value = keys[k[i]];
    settingsForm.appendChild(element);
    element = document.createElement("br");
    settingsForm.appendChild(element);
  }
}

function addKeysListeners() {
  let k = Object.keys(keys);
  for (let i = 0; i < k.length; i++) {
    document.getElementById(k[i]).addEventListener("keydown", editKey);
  }
}

function removeKeysListeners() {
  let k = Object.keys(keys);
  for (let i = 0; i < k.length; i++) {
    document.getElementById(k[i]).removeEventListener("keydown", editKey);
  }
}

function editKey(event) {
  let id = document.activeElement.id;

  function updateKey() {
    document.activeElement.value = keys[id];
  }
  keys[id] = event.key;
  window.setTimeout(updateKey, 1);
}

function toggleSetting(id) {
  let caller = document.getElementById(id);
  if (caller.classList.contains("checked")) {
    caller.classList.add("unchecked");
    caller.classList.remove("checked");
  } else {
    caller.classList.add("checked");
    caller.classList.remove("unchecked");
  }
}

function start() {
  canvas = new Canvas();
  toggleMessage = document.getElementById("toggle-message");
  mobileControlsDiv = document.getElementById("mobile-controls-div");
  tipsP = document.getElementById("tips");
  totalFinesseP = document.getElementById("total-finesse");
  totalPiecesP = document.getElementById("total-pieces");
  ppsP = document.getElementById("pps");
  stopButton = document.getElementById("stop");
  adDiv = document.getElementById("ad");
  settingsButton = document.getElementById("settings-button");
  settingsDiv = document.getElementById("keys-settings");
  settingsForm = document.getElementById("keys-settings-form");
  helpDiv = document.getElementById("help");
  cookiePopup = document.getElementById("cookie-popup");

  addSettingsToHTML();
  addKeysSettingsToHTML();
  updateSettings(false);
  openCookies();

  restart();
}

function restart() {
  function findId() { // find available id in threads
    let keys = Object.keys(threads);
    let i = 0;
    while (keys.includes(i)) {
      i++;
    }
    return i;
  }

  stop();

  if (newGoal()) { // found a valid piece
    let id = findId();
    threads[id] = true; // allow a new thread to start
    gameFrame(id);
  }

  whenPlaced = [];
  stopButton.classList = "pseudo-button";
  stopButton.innerHTML = "Stop";
}

function stop() {
  let keys = Object.keys(threads);
  for (let i = 0; i < keys.length; i++) { // index backwards in case deletion happens in the process
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

  let pieceName, positionChoice_, rotationChoice_, pos, rotation;
  if (pieceChoice.length !== 0) {
    pieceName = choice(pieceChoice);

    positionChoice_ = [];
    for (let i = 0; i < positionChoice.length; i++) {
      let p = positionChoice[i];
      if (Object.keys(finesse[pieceName]).includes(p.toString())) {
        positionChoice_.push(p); // only allow positions contained in this piece finesse
      }
    }
    if (positionChoice.length !== 0) {
      pos = [choice(positionChoice_), 0];

      rotationChoice_ = [];
      for (let i = 0; i < rotationChoice.length; i++) {
        let r = rotationChoice[i];
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
    let start = whenPlaced[0];
    let end = whenPlaced[whenPlaced.length - 1];
    let pps = (whenPlaced.length - 1) * 1000 / (end - start);
    ppsP.innerHTML = "PPS: " + parseInt(pps * 100) / 100;
  } else {
    ppsP.innerHTML = "PPS: -";
  }
}

function gameFrame(id, length = 1) {
  let return_ = piece.update(); // returns information needed
  let placed = return_[0];
  let forceDraw = return_[1];

  if (length !== 0) {
    canvas.draw();
    goal.draw();
    piece.draw();
    //drawPPS();
  }

  if (placed) {
    if (piece.equals(goal)) { // correct position and rotation
      let finesse_, score;
      finesse_ = finesse[patternNames[goal.index]][goal.pos[0].toString()][goal.rotation];
      score = scores[patternNames[goal.index]][goal.pos[0].toString()][goal.rotation];

      if (piece.totalMoves.length === finesse_.length) {
        tipsP.innerHTML = "Tips: -";
        score[0] += 1;
      } else {
        showTips(finesse_);
      }
      score[1] += 1;
      nPieces += 1;
      totalFinesse += Math.max(piece.totalMoves.length - finesse_.length, 0);
      totalFinesseP.innerHTML = "Total finesse: " + totalFinesse;
      totalPiecesP.innerHTML = "Total pieces: " + nPieces;
      newGoal();

      whenPlaced.push(Date.now());
    } else {
      piece = new Piece(goal.index); // retry
    }
  }

  if (forceDraw === true) {
    length = 1;
  } else { // if no draw needed, only draw if action done
    length = Object.keys(keysQueue).length;
  }
  keysQueue = {}; // reset the queue each frame
  if (threads[id]) { // this thread is allowed to run
    window.setTimeout(function() {
      gameFrame(id, length)
    }, 0);
  } else { // stop
    delete threads[id];
  }
}

function showTips(tipsCode) {
  let tips = "Tips: ";
  for (let i = 0; i < tipsCode.length; i++) {
    tips += finesseCodes[tipsCode[i]];
    if (i !== tipsCode.length - 1) {
      tips += ", "
    }
  }
  tipsP.innerHTML = tips;
}

function toggleDevice() {
  if (device === "Desktop") {
    device = "Mobile"; // toggle to mobile website
    document.body.style.flexDirection = "column";
    canvas.canvas.style.margin = "20px auto 20px auto";
    canvas.canvas.style.width = "200px";
    canvas.canvas.style.height = "400px";
    mobileControlsDiv.style.display = "flex";
    mobileControlsDiv.addEventListener("touchstart", handleTouchStart);
    mobileControlsDiv.addEventListener("touchend", handleTouchEnd);
    adDiv.style.display = "none";
    settingsButton.style.display = "none";

    mobileButtons = [];
    let buttons = mobileControlsDiv.children;
    for (let i = 0; i < buttons.length; i++) {
      mobileButtons.push(buttons[i]);
    }
  } else {
    device = "Desktop"; // toggle to desktop website
    document.body.style.flexDirection = "row";
    canvas.canvas.style.margin = "20px";
    canvas.canvas.style.width = "400px";
    canvas.canvas.style.height = "800px";
    mobileControlsDiv.style.display = "none";
    mobileControlsDiv.removeEventListener("touchstart", handleTouchStart);
    mobileControlsDiv.removeEventListener("touchend", handleTouchEnd);
    adDiv.style.display = "flex";
    settingsButton.style.display = "block";
  }

  toggleMessage.innerHTML = device + " website -";
}

// handle keys pressed
window.addEventListener("keydown",
  function(e) {
    if (!e.repeat) {
      pressed[e.key] = true;
      keysQueue[e.key] = true;
    }
  });

window.addEventListener("keyup",
  function(e) {
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
    if (mobileButtons.includes(touches[i].target)) {
      // change button appearance (touched)
      if (value) {
        touches[i].target.classList.add("touched");
      } else {
        touches[i].target.classList.remove("touched");
      }
      // trigger linked action
      let action = touches[i].target.getAttribute("linked-action");
      pressed[keys[action]] = value;
      keysQueue[keys[action]] = value;
    }
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
  var cookies = document.cookie.split(";");

  for (var i = 0; i < cookies.length; i++) {
    document.cookie = cookie.split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  }
}

function openCookies() {
  if (document.cookie !== "") {
    let keysValues = document.cookie.replace(/ /g, "").split(";");
    let preferences = {};
    for (let i = 0; i < keysValues.length; i++) {
      let key = keysValues[i].split("=")[0];
      let value = keysValues[i].split("=")[1];
      if (key !== "expires" && key !== "path") {
        preferences[key] = value;
      }
    }

    // assign each value
    let toAdd;
    let keys_ = Object.keys(preferences);
    let keysKeys = Object.keys(keys);
    for (let i = 0; i < keys_.length; i++) {
      // first, add to the keys dictionary
      toAdd = undefined;
      if (keysKeys.includes(keys_[i])) {
        toAdd = keys;
      }
      if (toAdd !== undefined) {
        toAdd[keys_[i]] = preferences[keys_[i]];
      }

      // then, add to the piece settings lists
      if (preferences[keys_[i]] === "true") {
        toAdd = undefined;
        if (keys_[i].startsWith("piece")) {
          toAdd = pieceChoice;
        } else if (keys_[i].startsWith("position")) {
          toAdd = positionChoice;
        } else if (keys_[i].startsWith("rotation")) {
          toAdd = rotationChoice;
        }
        if (toAdd !== undefined) {
          let index = keys_[i].indexOf("-");
          toAdd.push(keys_[i].slice(index + 1));
        }
      }
    }
    
    // then, others
    if (preferences[keys_.cookiePopupOk] === "true") {
    	cookiePopupOk = true;
      hideCookiePopup();
    }

    // convert positions to integers
    for (let i = 0; i < positionChoice.length; i++) {
      positionChoice[i] = parseInt(positionChoice[i]);
    }
    // convert rotations to integers
    for (let i = 0; i < rotationChoice.length; i++) {
      rotationChoice[i] = rotationNames.indexOf(rotationChoice[i]);
    }
  } else { // no cookies saved: save them and leave everything on (in saveSettingsToHTML)
    console.log("Could not retrieve any cookies");
    pieceChoice = [...patternNames];
    positionChoice = [...positionNames];
    rotationChoice = [];
    for (let i = 0; i < rotationNames.length; i++) {
    	rotationChoice.push(i);
    }
    saveCookies(); // update cookies
  }
  updateSettingsInHTML();
}

function saveCookies() {
  let date = new Date(Date.now() + 2592000000);
  let end = ";expires=" + date.toGMTString() + ";path=/"

  // add keybinds
  let keys_ = Object.keys(keys);
  for (let i = 0; i < keys_.length; i++) {
    document.cookie = keys_[i] + "=" + keys[keys_[i]] + end;
  }

  let rotationChoiceStr = [];
  for (let i = 0; i < rotationChoice.length; i++) {
    rotationChoiceStr.push(rotationNames[rotationChoice[i]]);
  }
  // [list to read from, possible values, add to variable name]
  let values = [
    [pieceChoice, patternNames, "piece-"],
    [positionChoice, positionNames, "position-"],
    [rotationChoiceStr, rotationNames, "rotation-"]
  ];

  for (let i = 0; i < values.length; i++) {
    let list = values[i][0];
    let possibleValues = values[i][1];
    let addToVar = values[i][2];

    for (let j = 0; j < possibleValues.length; j++) {
      let value = false;
      if (list.includes(possibleValues[j])) {
        value = true;
      }
      document.cookie = addToVar + possibleValues[j] + "=" + value + end;
    }
  }
  
  document.cookie = "cookiePopupOk=" + cookiePopupOk + end;
}

function hideCookiePopup() {
	cookiePopupOk = true;
  cookiePopup.style.display = "none";
}
