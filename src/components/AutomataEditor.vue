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
  <v-tabs v-model="tabIndex" bg-color="primary" id="tabs">
    <v-tab
      v-for="(automata, index) in automatas"
      :key="index"
      @click="selectAutomata(index)"
    >
      {{ automata.name }}
      <v-icon icon="mdi-close" end @click="removeAutomata(index)"></v-icon>
    </v-tab>
    <v-btn height="100%" @click="createNewAutomata" variant="plain"
      >(New)</v-btn
    >
  </v-tabs>

  <!-- Mode Selector -->
  <div class="top-menu" id="top-menu">
    <div class="mode-selector">
      <v-btn color="primary" @click="clearAutomata">Clear</v-btn>
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
      <v-btn
        color="primary"
        @click="
          showTestModal = true;
          automataType = automatas[tabIndex].isDFA();
        "
        >Test Input</v-btn
      >
      <v-btn color="primary" @click="convertToDFA">Convert to DFA</v-btn>
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
    v-if="contextMenu.stateIndex !== -1"
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
            automatas[tabIndex].states[contextMenu.stateIndex].isFinal
              ? "Unset Final"
              : "Set Final"
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
      <v-card-title class="text-h5"> Edit Transition </v-card-title>
      <v-card-text>
        <v-row
          v-for="(value, index) in automatas[tabIndex].transitions[
            editingTransitionIndex
          ].symbol.values"
          :key="index"
          align="center"
        >
          <v-col>
            <v-text-field
              v-model="
                automatas[tabIndex].transitions[editingTransitionIndex].symbol
                  .values[index]
              "
              :placeholder="epsilon"
              hide-details
              density="compact"
              single-line
            />
          </v-col>
          <v-col cols="auto">
            <v-btn color="primary" @click="deleteTransitionSymbol(index)">
              Remove
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="error" @click="deleteTransition()"> Delete </v-btn>
        <v-btn
          color="primary"
          @click="addTransitionSymbol(editingTransitionIndex)"
        >
          Add Symbol
        </v-btn>
        <v-btn color="grey darken-1" @click="closeTransitionEdit"> Ok </v-btn>
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
            <v-col cols="6">
              <p>Type: {{ automataType ? "DFA" : "NFA" }}</p>
            </v-col>
            <v-col cols="6">
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

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import Point from "../models/Point";
import State from "../models/State";
import Transition from "../models/Transition";
import Symbol from "../models/Symbol";
import Automata from "../models/Automata";
import { epsilon } from "../global";

const canvas = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

// App state
const automatas = ref<Array<Automata>>([]);
const automataType = ref(true); // false for NFA, true for DFA
const mode = ref("create");
const tabIndex = ref(0);
const draggingState = reactive({
  index: null,
  offset: { x: 0, y: 0 },
});
const dragStartStateIndex = ref<number | null>(null);
const cursorPosition = ref<State | null>(null);
const contextMenu = reactive({
  stateIndex: -1,
  x: 0,
  y: 0,
});
const editingTransitionIndex = ref<number | null>(null);
const transitionEditText = ref("");
const showTestModal = ref(false);
const contextMenuVisible = ref(false);
const transitionEditVisible = ref(false);

const testInput = ref("");
const testResult = ref("");

const contextMenuStyle = computed(() => ({
  left: `${contextMenu.x}px`,
  top: `${contextMenu.y}px`,
}));

const lastFindStateTime = ref(0);
const throttleInterval = 300; //ms
let cachedStateIndex = -1;

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.keyCode == 90) {
    automatas.value[tabIndex.value].popState();
    automatas.value[tabIndex.value].save(tabIndex.value);
  }
});

onMounted(() => {
  const savedAutomatas = localStorage.getItem("automatas")
    ? JSON.parse(localStorage.getItem("automatas")!)
    : [];
  if (savedAutomatas.length === 0) {
    automatas.value.push(new Automata());
    automatas.value[tabIndex.value].save(tabIndex.value);
  } else {
    for (let i = 0; i < savedAutomatas.length; i++) {
      automatas.value.push(new Automata());
      automatas.value[i].load(i);
    }
  }

  ctx.value = canvas.value?.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  requestAnimationFrame(draw);
});

function resizeCanvas() {
  if (!canvas.value) return;

  canvas.value.width = window.innerWidth;
  canvas.value.height =
    window.innerHeight -
    document.getElementById("top-menu")!.offsetHeight -
    document.getElementById("tabs")!.offsetHeight; // Adjust for mode selector
}

function draw() {
  if (!ctx.value || !canvas.value) return;

  ctx.value.clearRect(0, 0, canvas.value?.width, canvas.value?.height);

  // Draw transitions
  automatas.value[tabIndex.value]?.transitions.forEach(
    (transition: Transition) => {
      drawTransition(transition);
    }
  );

  // Draw states
  automatas.value[tabIndex.value]?.states.forEach((state: State) => {
    drawState(state);
  });

  // Draw dragging transition preview (NOT WORKING)
  if (dragStartStateIndex.value !== null) {
    const fromState =
      automatas.value[tabIndex.value].states[dragStartStateIndex.value];
    canvasArrow(fromState.center, cursorPosition.value);
  }
  requestAnimationFrame(draw);
}

function drawState(state: State) {
  if (!ctx.value) return;

  ctx.value.beginPath();
  // Draw circle inner circle
  ctx.value.arc(state.center.x, state.center.y, state.radius, 0, Math.PI * 2);
  ctx.value.fillStyle = "#6496c8";
  ctx.value.fill();
  // Draw circle outer circle
  ctx.value.strokeStyle = "black";
  ctx.value.stroke();

  if (state.isFinal) {
    // Draw final state circle
    ctx.value.beginPath();
    ctx.value.arc(
      state.center.x,
      state.center.y,
      state.radius * 0.85,
      0,
      Math.PI * 2
    );
    ctx.value.stroke();
  }

  // Draw arrow if is initial state
  if (automatas.value[tabIndex.value].initial?.id == state.id) {
    const leftMostPointX = state.center.x - state.radius;
    const lineWidth = state.radius * 2;
    const headWidth = lineWidth * 0.25;
    // Arrow line
    ctx.value.beginPath();
    ctx.value.moveTo(leftMostPointX, state.center.y);
    ctx.value.lineTo(leftMostPointX - lineWidth, state.center.y);
    ctx.value.strokeStyle = "black";
    ctx.value.stroke();
    // Arrow head
    ctx.value.beginPath();
    ctx.value.moveTo(leftMostPointX, state.center.y);
    ctx.value.lineTo(leftMostPointX - headWidth, state.center.y + headWidth);
    ctx.value.strokeStyle = "black";
    ctx.value.stroke();
    // Arrow head
    ctx.value.beginPath();
    ctx.value.moveTo(leftMostPointX, state.center.y);
    ctx.value.lineTo(leftMostPointX - headWidth, state.center.y - headWidth);
    ctx.value.strokeStyle = "black";
    ctx.value.stroke();
  }

  // Draw text
  ctx.value.fillStyle = "white";
  ctx.value.textAlign = "center";
  ctx.value.textBaseline = "middle";
  ctx.value.font = "16px Roboto";
  ctx.value.fillText(state.name, state.center.x, state.center.y);
}

function drawTransition(transition: Transition) {
  if (!ctx.value) return;

  ctx.value.beginPath();
  const fromState = automatas.value[tabIndex.value].states.find(
    (state: State) => state.id === transition.from.id
  )!;
  const toState = automatas.value[tabIndex.value].states.find(
    (state: State) => state.id === transition.to.id
  )!;
  if (transition.from.id === transition.to.id) {
    // Get states from id
    // Draw bezier from same state
    const relativeSize = 50;
    const start = {
      x: fromState.center.x - 10,
      y: fromState.center.y,
    };
    const controlPoint1 = {
      x: fromState.center.x - relativeSize * 1.5,
      y: fromState.center.y - relativeSize * 2.0,
    };
    const controlPoint2 = {
      x: fromState.center.x + relativeSize * 1.5,
      y: fromState.center.y - relativeSize * 2.0,
    };
    const end = {
      x: fromState.center.x + 10,
      y: fromState.center.y,
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
      transitionText(transition),
      fromState.center.x,
      fromState.center.y - relativeSize * 2.0 + 10
    );
    transition.symbol.position = new Point(
      fromState.center.x,
      fromState.center.y - relativeSize * 2.0 + 10
    );
    return;
  }

  // Draw straight line arrow
  const radius = toState.radius;
  const diffX = fromState.center.x - toState.center.x;
  const diffY = fromState.center.y - toState.center.y;
  const inter = new Point(
    toState.center.x +
      radius * (diffX / Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2))),
    toState.center.y +
      radius * (diffY / Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2)))
  );
  canvasArrow(fromState.center, inter);

  // Draw symbol
  const midX = (fromState.center.x + toState.center.x) / 2;
  const midY = (fromState.center.y + toState.center.y) / 2;
  ctx.value.fillStyle = "black";
  ctx.value.fillText(transitionText(transition), midX + 10, midY + 10);
  transition.symbol.position = new Point(midX + 10, midY + 10);
}

function canvasArrow(from: Point, to: Point) {
  if (!ctx.value) return;

  const headlen = 10;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);

  ctx.value.beginPath();
  ctx.value.moveTo(from.x, from.y);
  ctx.value.lineTo(to.x, to.y);
  ctx.value.lineTo(
    to.x - headlen * Math.cos(angle - Math.PI / 6),
    to.y - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.value.lineTo(to.x, to.y);
  ctx.value.lineTo(
    to.x - headlen * Math.cos(angle + Math.PI / 6),
    to.y - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.value.strokeStyle = "black";
  ctx.value.stroke();
}

function transitionText(transition: Transition) {
  let epsilonedTransitions = transition.symbol.values.map((value) =>
    value === "" ? epsilon : value
  );
  return epsilonedTransitions.join(", ");
}

function selectAutomata(index: number) {
  tabIndex.value = index;
}

function createNewAutomata() {
  automatas.value.push(new Automata());
  tabIndex.value = automatas.value.length - 1;
  automatas.value[tabIndex.value].save(tabIndex.value);
}

function removeAutomata(index: number) {
  automatas.value.splice(index, 1);
  selectAutomata(0);
  localStorage.setItem("automatas", JSON.stringify(automatas.value));
}

// Event handlers
function handleMouseDown(event: MouseEvent) {
  if (event.button === 2) return;
  if (!canvas.value) return;

  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (contextMenu.stateIndex !== -1) {
    // If context menu is open, and clicked outside of it, close
    closeContextMenu();
  }
  if (mode.value === "move") {
    // Get state index at mouse position
    const stateIndex = findStateAt(x, y);
    if (stateIndex !== -1) {
      // If it exists, start dragging
      draggingState.index = stateIndex;
      draggingState.offset.x =
        x - automatas.value[tabIndex.value].states[stateIndex].center.x;
      draggingState.offset.y =
        y - automatas.value[tabIndex.value].states[stateIndex].center.y;
    }
  } else if (mode.value === "create") {
    const stateIndex = findStateAt(x, y);
    if (stateIndex === -1) {
      // Create a new state
      automatas.value[tabIndex.value].addState(
        new State(
          `q${automatas.value[tabIndex.value].stateCount}`,
          new Point(x, y)
        )
      );
      // save state
      automatas.value[tabIndex.value].save(tabIndex.value);
    } else {
      // Start a new transition
      dragStartStateIndex.value = stateIndex;
      cursorPosition.value = new Point(x, y);
    }
  }
}

function handleMouseMove(event: MouseEvent) {
  if (!canvas.value) return;

  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (draggingState.index !== null) {
    // Moving state
    automatas.value[tabIndex.value].states[draggingState.index].center.x =
      x - draggingState.offset.x;
    automatas.value[tabIndex.value].states[draggingState.index].center.y =
      y - draggingState.offset.y;
    automatas.value[tabIndex.value].save(tabIndex.value);
  } else if (dragStartStateIndex.value !== null) {
    // Draw arrow from state to cursor
    cursorPosition.value = new Point(x, y);
  } else {
    if (mode.value === "move") {
      const currentTime = Date.now();

      if (currentTime - lastFindStateTime.value > throttleInterval) {
        cachedStateIndex = findStateAt(x, y);
        lastFindStateTime.value = currentTime;
      }

      // Use cached state index if available
      if (cachedStateIndex !== -1) {
        canvas.value.style.cursor = "grabbing";
      } else {
        canvas.value.style.cursor = "default";
      }
    }
  }
}

function handleMouseUp(event: MouseEvent) {
  if (!canvas.value) return;

  if (mode.value === "create" && dragStartStateIndex.value !== null) {
    // Create mode and transition drag has started
    const rect = canvas.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const endIndex = findStateAt(x, y);

    if (endIndex !== -1) {
      // Check if transition from-to already exists
      const existingTransition = automatas.value[
        tabIndex.value
      ].transitions.find(
        (t: Transition) =>
          t.from.id ===
            automatas.value[tabIndex.value].states[dragStartStateIndex.value]
              .id &&
          t.to.id === automatas.value[tabIndex.value].states[endIndex].id
      );
      if (existingTransition) {
        // Add epsilon (default) to existing transition
        existingTransition.addSymbol("");
      } else {
        // Create transition
        automatas.value[tabIndex.value]?.transitions.push(
          new Transition(
            automatas.value[tabIndex.value].states[dragStartStateIndex.value],
            automatas.value[tabIndex.value].states[endIndex],
            new Symbol([""], new Point(x, y))
          )
        );
      }
      const index = automatas.value[tabIndex.value]?.transitions.length - 1;
      openTransitionEdit(index);
      automatas.value[tabIndex.value].save(tabIndex.value);
    }
  }

  dragStartStateIndex.value = null;
  cursorPosition.value = null;
  draggingState.index = null;
}

function handleContextMenu(event: MouseEvent) {
  if (!canvas.value) return;

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

function openTransitionEdit(transitionIndex: number) {
  editingTransitionIndex.value = transitionIndex;
  transitionEditVisible.value = true;
  transitionEditText.value =
    automatas.value[tabIndex.value]?.transitions[
      transitionIndex
    ]?.symbol.values.join(",");
}

function findStateAt(x: number, y: number) {
  return automatas.value[tabIndex.value]?.states.findIndex((state: State) => {
    const dx = x - state.center.x;
    const dy = y - state.center.y;
    return Math.sqrt(dx * dx + dy * dy) <= state.radius;
  });
}

function findTransitionNear(x: number, y: number) {
  const pos = new Point(x, y);
  return automatas.value[tabIndex.value].transitions.findIndex(
    (t: Transition) => {
      const a = new Point(t.symbol.position.x, t.symbol.position.y);
      return pos.distanceTo(a) < 30;
    }
  );
}

function deleteTransition() {
  if (editingTransitionIndex.value === null) return;
  // Delete transition
  automatas.value[tabIndex.value].deleteTransition(
    editingTransitionIndex.value
  );
  automatas.value[tabIndex.value].save(tabIndex.value);
  editingTransitionIndex.value = 0;
  closeTransitionEdit();
}

function deleteTransitionSymbol(index: number) {
  if (editingTransitionIndex.value === null) return;
  // Delete transition symbol
  automatas.value[tabIndex.value].transitions[
    editingTransitionIndex.value
  ].removeSymbolViaIndex(index);
  if (
    automatas.value[tabIndex.value].transitions[editingTransitionIndex.value]
      .symbol.values.length === 0
  ) {
    deleteTransition();
  }
  automatas.value[tabIndex.value].save(tabIndex.value);
}

function deleteState(index: number) {
  // Delete state
  const state = automatas.value[tabIndex.value].states[index];
  automatas.value[tabIndex.value].deleteState(state);
  automatas.value[tabIndex.value].save(tabIndex.value);
  closeContextMenu();
}

function setInitialState(index: number) {
  const state = automatas.value[tabIndex.value].states[index];
  automatas.value[tabIndex.value].setInitial(state);
  automatas.value[tabIndex.value].save(tabIndex.value);
  closeContextMenu();
}

function toggleFinalState(index: number) {
  automatas.value[tabIndex.value].states[index].isFinal =
    !automatas.value[tabIndex.value].states[index].isFinal;
  automatas.value[tabIndex.value].save(tabIndex.value);
  closeContextMenu();
}

function closeContextMenu() {
  contextMenu.stateIndex = -1;
  contextMenuVisible.value = false;
}

function addTransitionSymbol() {
  if (editingTransitionIndex.value === null) return;
  automatas.value[tabIndex.value].transitions[
    editingTransitionIndex.value
  ].addSymbol("");
  automatas.value[tabIndex.value].save(tabIndex.value);
}

// Transition editing
function closeTransitionEdit() {
  transitionEditVisible.value = false;
  automatas.value[tabIndex.value].save(tabIndex.value);
}

// Test execution
function runTest() {
  const result = automatas.value[tabIndex.value].runInput(testInput.value);
  testResult.value = result ? "Accepted" : "Rejected";
}

function convertToDFA() {
  const dfa = automatas.value[tabIndex.value].convertToDFA();
  automatas.value.push(dfa);
  dfa.save(automatas.value.length - 1);
}

function clearAutomata() {
  automatas.value[tabIndex.value].reset();
  automatas.value[tabIndex.value].save(tabIndex.value);
}

function saveToDevice() {
  if (automatas.value[tabIndex.value].states.length === 0) {
    alert("No automata to save");
    return;
  }
  const automata = automatas.value[tabIndex.value].toJSONString();
  const blob = new Blob([automata], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${automatas.value[tabIndex.value].name}.at`;
  a.click();
  URL.revokeObjectURL(url);
}

function clickLoadFile() {
  document?.getElementById("load-file")?.click();
}

function loadFromDevice(event: Event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    automatas.value[tabIndex.value].fromJSONString(
      e.target.result,
      tabIndex.value
    );
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
