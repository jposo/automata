<template>
  <!-- Hidden inputs -->
  <input
    type="file"
    id="load-file"
    @change="loadFromDevice"
    style="display: none"
    accept=".at"
  />
  <!-- Tabs -->
  <v-tabs v-model="tabIndex" bg-color="primary">
    <v-tab>Automata 1</v-tab>
    <v-tab>Automata 1</v-tab>
  </v-tabs>

  <!-- Mode Selector -->
  <div class="top-menu" id="top-menu">
    <div class="mode-selector">
      <v-btn color="primary" @click="clearAutomata">New</v-btn>
      <v-btn color="primary" @click="saveToDevice">Save to Device</v-btn>
      <v-btn color="primary" @click="clickLoadFile">Load from Device</v-btn>
    </div>
    <div class="mode-selector">
      <v-btn @click="mode = 'create'" :class="{ active: mode === 'create' }">
        Create (States & Transitions)
      </v-btn>
      <v-btn @click="mode = 'move'" :class="{ active: mode === 'move' }">
        Move States
      </v-btn>
      <br />
      <v-btn color="primary" @click="showTestModal = true">Test Input</v-btn>
    </div>
  </div>

  <!-- Canvas -->
  <canvas
    ref="canvas"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @contextmenu.prevent="handleContextMenu"
  ></canvas>

  <!-- Context Menu -->
  <v-menu
    v-if="contextMenu.stateIndex !== null"
    :style="contextMenuStyle"
    v-model="contextMenuVisible"
    offset-y
  >
    <template v-slot:activator="{ on, attrs }">
      <div v-bind="attrs" v-on="on"></div>
    </template>
    <v-list>
      <v-list-item @click="deleteState(contextMenu.stateIndex)">
        <v-list-item-title>Delete State</v-list-item-title>
      </v-list-item>
      <v-list-item @click="setInitialState(contextMenu.stateIndex)">
        <v-list-item-title>Set as Initial</v-list-item-title>
      </v-list-item>
      <v-list-item @click="toggleFinalState(contextMenu.stateIndex)">
        <v-list-item-title>
          {{
            states[contextMenu.stateIndex].isFinal ? "Unset Final" : "Set Final"
          }}
        </v-list-item-title>
      </v-list-item>
      <v-list-item @click="closeContextMenu">
        <v-list-item-title>Close</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>

  <!-- Transition Edit Modal -->
  <v-dialog v-model="transitionEditVisible" max-width="400px">
    <v-card>
      <v-card-title class="text-h5"> Edit Transition Symbol </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="transitionEditText"
                label="Enter symbol"
                outlined
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="saveTransitionEdit"> OK </v-btn>
        <v-btn color="grey darken-1" text @click="cancelTransitionEdit">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Test Modal -->
  <v-dialog v-model="showTestModal" max-width="400px">
    <v-card>
      <v-card-title class="text-h5"> Test Input </v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="testInput"
                label="Enter test input"
                outlined
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <p>Result: {{ testResult }}</p>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="runTest"> Test </v-btn>
        <v-btn color="grey darken-1" text @click="showTestModal = false">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";

const epsilon = "ε";

const canvas = ref(null);
const ctx = ref(null);

// App state
const mode = ref("create");
const automatas = ref([]);
const states = ref([]);
const transitions = ref([]);
const stateCounter = ref(0);
const tabIndex = ref(0);
const initial = ref(null);
const draggingState = reactive({
  index: null,
  offset: { x: 0, y: 0 },
});
const transitionDragStart = ref(null);
const transitionDragEnd = ref(null);
const isDrawingTransition = ref(false);
const contextMenu = reactive({
  stateIndex: null,
  x: 0,
  y: 0,
});
const editingTransition = ref(null);
const transitionEditText = ref("");
const showTestModal = ref(false);
// const showSaveToDeviceModal = ref(false);
// const showLoadFromDeviceModal = ref(false);
const contextMenuVisible = ref(false);
const transitionEditVisible = ref(false);
const testInput = ref("");
const testResult = ref("");

const contextMenuStyle = computed(() => ({
  left: `${contextMenu.x}px`,
  top: `${contextMenu.y}px`,
}));

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.keyCode == 90) {
    states.value.pop();
    stateCounter.value--;
  }
});

onMounted(() => {
  fromJSON(localStorage.getItem("automata"));
  ctx.value = canvas.value.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  // console.log(states, transitions);
  requestAnimationFrame(draw);
});

function toJSON() {
  return JSON.stringify({
    states: states.value,
    transitions: transitions.value,
    initial: initial.value,
  });
}

function fromJSON(json) {
  const data = JSON.parse(json);
  if (data) {
    states.value = data.states;
    transitions.value = data.transitions;
    initial.value = data.initial;
  }
}

function getAutomatas() {
  return localStorage.getItem("automatas");
}

function setAutomatas(automatas) {
  localStorage.setItem("automatas", automatas);
}

function saveAutomata(tabIndex) {
  // get localstorage
  const automatas = getAutomatas();
  const automata = toJSON();
  localStorage.setItem(
    "automatas",
    automatas ? automatas + "," + automata : automata
  );
}

function resizeCanvas() {
  canvas.value.width = window.innerWidth;
  canvas.value.height =
    window.innerHeight - document.getElementById("top-menu").offsetHeight; // Adjust for mode selector
}

function draw() {
  if (!ctx.value) return;

  ctx.value.clearRect(0, 0, canvas.value?.width, canvas.value?.height);

  // Draw transitions
  transitions.value.forEach((transition) => {
    const from = states.value[transition.from];
    const to = states.value[transition.to];
    drawTransition(from, to, transition);
  });

  if (isDrawingTransition.value) {
    const fromState = states.value[transitionDragStart.value];
    ctx.value.beginPath();
    ctx.value.moveTo(fromState.x, fromState.y);
    ctx.value.lineTo(draggingState.currentX, draggingState.currentY);
    ctx.value.strokeStyle = "black";
    ctx.value.stroke();
  }

  // Draw states
  states.value.forEach((state, index) => {
    drawState(state, index === initial.value);
  });

  // Draw dragging transition preview (NOT WORKING)
  // if (transitionDragStart.value !== null) {
  //   const fromState = states.value[transitionDragStart.value];
  //   ctx.value.beginPath();
  //   ctx.value.moveTo(fromState.x, fromState.y);
  //   ctx.value.lineTo(draggingState.currentX, draggingState.currentY);
  //   ctx.value.strokeStyle = "black";
  //   ctx.value.stroke();
  // }
  requestAnimationFrame(draw);
}

function drawState(state, isInitial) {
  ctx.value.beginPath();
  // Draw circle inner circle
  ctx.value.arc(state.x, state.y, state.radius, 0, Math.PI * 2);
  ctx.value.fillStyle = "#6496c8";
  ctx.value.fill();
  // Draw circle outer circle
  ctx.value.strokeStyle = "black";
  ctx.value.stroke();

  if (state.isFinal) {
    // Draw final state circle
    ctx.value.beginPath();
    ctx.value.arc(state.x, state.y, state.radius * 0.85, 0, Math.PI * 2);
    ctx.value.stroke();
  }

  // Draw arrow if is initial state
  if (isInitial) {
    const leftMostPointX = state.x - state.radius;
    const lineWidth = state.radius * 2;
    const headWidth = lineWidth * 0.25;
    // Arrow line
    ctx.value.beginPath();
    ctx.value.moveTo(leftMostPointX, state.y);
    ctx.value.lineTo(leftMostPointX - lineWidth, state.y);
    ctx.value.strokeStyle = "black";
    ctx.value.stroke();
    // Arrow head
    ctx.value.beginPath();
    ctx.value.moveTo(leftMostPointX, state.y);
    ctx.value.lineTo(leftMostPointX - headWidth, state.y + headWidth);
    ctx.value.strokeStyle = "black";
    ctx.value.stroke();
    // Arrow head
    ctx.value.beginPath();
    ctx.value.moveTo(leftMostPointX, state.y);
    ctx.value.lineTo(leftMostPointX - headWidth, state.y - headWidth);
    ctx.value.strokeStyle = "black";
    ctx.value.stroke();
  }

  // Draw text
  ctx.value.fillStyle = "white";
  ctx.value.textAlign = "center";
  ctx.value.textBaseline = "middle";
  ctx.value.font = "16px Roboto";
  ctx.value.fillText(state.name, state.x, state.y);
}

function drawTransition(from, to, transition) {
  ctx.value.beginPath();
  if (from === to) {
    // Draw bezier from same state
    const relativeSize = 50;
    const start = {
      x: from.x - 10,
      y: from.y,
    };
    const controlPoint1 = {
      x: from.x - relativeSize * 1.5,
      y: from.y - relativeSize * 2.0,
    };
    const controlPoint2 = {
      x: from.x + relativeSize * 1.5,
      y: from.y - relativeSize * 2.0,
    };
    const end = {
      x: from.x + 10,
      y: from.y,
    };
    ctx.value.moveTo(start.x, start.y);
    ctx.value.bezierCurveTo(
      controlPoint1.x,
      controlPoint1.y,
      controlPoint2.x,
      controlPoint2.y,
      end.x,
      end.y
    );
    ctx.value.strokeStyle = "black";
    ctx.value.stroke();

    // Draw symbol
    ctx.value.fillStyle = "black";
    ctx.value.fillText(
      transition.symbol.values.join(", "),
      from.x,
      from.y - relativeSize * 2.0 + 10
    );
    transition.symbol.position = {
      x: from.x,
      y: from.y - relativeSize * 2.0 + 10,
    };
    return;
  }

  // Draw straight line
  ctx.value.moveTo(from.x, from.y);
  ctx.value.lineTo(to.x, to.y);
  ctx.value.strokeStyle = "black";
  ctx.value.stroke();

  // Draw symbol
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  ctx.value.fillStyle = "black";
  ctx.value.fillText(transition.symbol.values.join(", "), midX + 10, midY + 10);
  transition.symbol.position = {
    x: midX + 10,
    y: midY + 10,
  };
}

// Event handlers
function handleMouseDown(event) {
  if (event.button === 2) return;
  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (contextMenu.stateIndex !== null) {
    // If context menu is open, and clicked outside of it, close
    closeContextMenu();
  }
  if (mode.value === "move") {
    // Get state index at mouse position
    const stateIndex = findStateAt(x, y);
    if (stateIndex !== -1) {
      // If it exists, start dragging
      draggingState.index = stateIndex;
      draggingState.offset.x = x - states.value[stateIndex].x;
      draggingState.offset.y = y - states.value[stateIndex].y;
    }
  } else if (mode.value === "create") {
    const stateIndex = findStateAt(x, y);
    if (stateIndex === -1) {
      // Create a new state
      states.value.push({
        x,
        y,
        radius: 30,
        name: `q${stateCounter.value++}`,
        isFinal: false,
      });
      // save state
      // localStorage.setItem("automatas", fromJSON(localStorage.getItem("automatas")[tabIndex.value] = ));
    } else {
      // Start a new transition
      transitionDragStart.value = stateIndex;
    }
  }
}

function handleMouseMove(event) {
  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (draggingState.index !== null) {
    // Moving state
    states.value[draggingState.index].x = x - draggingState.offset.x;
    states.value[draggingState.index].y = y - draggingState.offset.y;
    localStorage.setItem("automata", toJSON());
  } else if (transitionDragStart.value !== null) {
    // Draw transition cursor line
    // transitionDragEnd.value = { x, y };
    // isDrawingTransition.value = true;
    // draw();
  }
}

function handleMouseUp(event) {
  if (mode.value === "create" && transitionDragStart.value !== null) {
    // Create mode and transition drag has started
    const rect = canvas.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const endIndex = findStateAt(x, y);

    if (endIndex !== -1) {
      // Check if transition from to already exists
      const existingTransition = transitions.value.find(
        (t) => t.from === transitionDragStart.value && t.to === endIndex
      );
      if (existingTransition) {
        existingTransition.symbol.values.push(epsilon);
        return;
      }
      // Create transition
      transitions.value.push({
        from: transitionDragStart.value,
        to: endIndex,
        symbol: {
          values: [epsilon],
          position: { x, y },
        },
      });
      const index = transitions.value.length - 1;
      openTransitionEdit(index);
      localStorage.setItem("automata", toJSON());
    }
  }

  transitionDragStart.value = null;
  transitionDragEnd.value = null;
  isDrawingTransition.value = false;
  draggingState.index = null;
}

function handleContextMenu(event) {
  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const stateIndex = findStateAt(x, y);
  if (stateIndex !== -1) {
    contextMenu.stateIndex = stateIndex;
    contextMenu.x = event.clientX;
    contextMenu.y = event.clientY;
    contextMenuVisible.value = true;
    return;
  }

  const transitionIndex = findTransitionNear(x, y);
  if (transitionIndex !== -1) {
    openTransitionEdit(transitionIndex);
  }
}

function openTransitionEdit(transitionIndex) {
  editingTransition.value = transitionIndex;
  transitionEditVisible.value = true;
  transitionEditText.value =
    transitions.value[transitionIndex].symbol.values.join(",");
}

// Helper functions
function findStateAt(x, y) {
  return states.value.findIndex((state) => {
    const dx = x - state.x;
    const dy = y - state.y;
    return Math.sqrt(dx * dx + dy * dy) <= state.radius;
  });
}

function findTransitionNear(x, y) {
  const pos = { x, y };
  return transitions.value.findIndex((t) => {
    const a = {
      x: t.symbol.position.x,
      y: t.symbol.position.y,
    };
    return distanceToPoint(pos, a) < 30;
  });
}

function distanceToPoint(p, a) {
  const dx = p.x - a.x;
  const dy = p.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Context menu actions
function deleteState(index) {
  // Delete state
  states.value.splice(index, 1);
  // Delete transitions related to state
  transitions.value = transitions.value.filter(
    (t) => t.from !== index && t.to !== index
  );
  localStorage.setItem("automata", toJSON());
  closeContextMenu();
}

function setInitialState(index) {
  initial.value = index;
  closeContextMenu();
}

function toggleFinalState(index) {
  states.value[index].isFinal = !states.value[index].isFinal;
  localStorage.setItem("automata", toJSON());
  closeContextMenu();
}

function closeContextMenu() {
  contextMenu.stateIndex = null;
  contextMenuVisible.value = false;
}

// Transition editing
function saveTransitionEdit() {
  transitions.value[editingTransition.value].symbol.values =
    transitionEditText.value.split(",").map((value) => value.trim());
  transitionEditVisible.value = false;
  editingTransition.value = null;
  localStorage.setItem("automata", toJSON());
}

function cancelTransitionEdit() {
  editingTransition.value = null;
  transitionEditVisible.value = false;
}

// Test execution
function runTest() {
  function getTransitions(currentState, symbol) {
    const _transitions = transitions.value.filter(
      (t) => t.from === currentState && t.symbol.values.includes(symbol)
    );
    return _transitions.length > 0 ? _transitions[0].to : null;
  }

  function epsilonClosure(states) {
    const closure = new Set(states);
    const queue = [...states];
    while (queue.length > 0) {
      const state = queue.shift();
      const epsilonTransitions = transitions.value.filter(
        (t) => t.from === state && t.symbol.values.includes(epsilon)
      );
      for (const transition of epsilonTransitions) {
        if (!closure.has(transition.to)) {
          closure.add(transition.to);
          queue.push(transition.to);
        }
      }
    }
    return Array.from(closure);
  }

  function dfs(currentStates, remainingInput) {
    currentStates = epsilonClosure(currentStates);
    if (remainingInput.length === 0) {
      return currentStates.some((state) => states.value[state].isFinal);
    }
    const nextSymbol = remainingInput[0];
    const nextStates = new Set();
    for (const state of currentStates) {
      for (const nextState in getTransitions(state, nextSymbol)) {
        nextStates.add(nextState);
      }
      // const transition = transitions.value.find(
      //   (t) => t.from === state && t.symbol.value === symbol
      // );
      // if (transition) {
      //   nextStates.add(transition.to);
      // }
    }
    return dfs(Array.from(nextStates), remainingInput.slice(1));
  }

  const result = dfs([initial.value], testInput.value);

  testResult.value = result ? "Accepted" : "Rejected";

  // let current = initial.value;
  // if (current === null || current >= states.value.length) {
  //   testResult.value = "No initial state";
  //   return;
  // }

  // for (const char of testInput.value) {
  //   const transition = transitions.value.find(
  //     (t) => t.from === current && t.symbol.value === char
  //   );
  //   if (!transition) {
  //     testResult.value = "Rejected";
  //     return;
  //   }
  //   current = transition.to;
  // }

  // testResult.value = states.value[current]?.isFinal ? "Accepted" : "Rejected";
}

function clearAutomata() {
  states.value = [];
  transitions.value = [];
  initial.value = null;
  localStorage.setItem("automata", toJSON());
}

function saveToDevice() {
  if (states.value.length === 0) {
    alert("No automata to save");
    return;
  }
  const automata = toJSON();
  const blob = new Blob([automata], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${Date.now()}.at`;
  a.click();
  URL.revokeObjectURL(url);
}

function clickLoadFile() {
  document.getElementById("load-file").click();
}

function loadFromDevice(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    // const automata = JSON.parse(e.target.result);
    fromJSON(e.target.result);
  };
  reader.readAsText(file);
}
</script>

<style>
canvas {
  border: 1px solid #ccc;
  overflow-x: hidden;
}

.mode-selector {
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.top-menu {
  background: #eee;
  padding: 10px;
  width: 100vw;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

button.active {
  background: #007bff;
  color: white;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  padding: 10px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border: 1px solid #ccc;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
</style>
