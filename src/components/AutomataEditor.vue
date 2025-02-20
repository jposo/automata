<template>
  <div>
    <!-- Mode Selector -->
    <div class="mode-selector">
      <button 
        @click="mode = 'create'"
        :class="{ active: mode === 'create' }"
      >
        Create (States & Transitions)
      </button>
      <button 
        @click="mode = 'move'"
        :class="{ active: mode === 'move' }"
      >
        Move States
      </button>
      <button @click="showTestModal = true">Test Input</button>
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
    <div 
      v-if="contextMenu.stateIndex !== null"
      :style="contextMenuStyle"
      class="context-menu"
    >
      <div v-if="contextMenu.stateIndex !== null">
        <h3>Options for {{ states[contextMenu.stateIndex].name }}</h3>
        <button @click="deleteState(contextMenu.stateIndex)">Delete State</button>
        <button @click="setInitialState(contextMenu.stateIndex)">Set as Initial</button>
        <button @click="toggleFinalState(contextMenu.stateIndex)">
          {{ states[contextMenu.stateIndex].isFinal ? 'Unset Final' : 'Set Final' }}
        </button>
        <button @click="closeContextMenu">Close</button>
      </div>
    </div>

    <!-- Transition Edit Modal -->
    <div v-if="editingTransition !== null" class="modal">
      <div class="modal-content">
        <h3>Edit Transition Symbol</h3>
        <input v-model="transitionEditText" />
        <button @click="saveTransitionEdit">OK</button>
        <button @click="cancelTransitionEdit">Cancel</button>
      </div>
    </div>

    <!-- Test Modal -->
    <div v-if="showTestModal" class="modal">
      <div class="modal-content">
        <h3>Test Input</h3>
        <input v-model="testInput" />
        <button @click="runTest">Test</button>
        <p>Result: {{ testResult }}</p>
        <button @click="showTestModal = false">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
// import { State } from '@/models/State';
// import { Transition } from '@/models/Transition';

const canvas = ref(null);
const ctx = ref(null);

// App state
const mode = ref('create');
const states = ref([]);
const transitions = ref([]);
const stateCounter = ref(0);
const initial = ref(null);
const draggingState = reactive({
  index: null,
  offset: { x: 0, y: 0 }
});
const transitionDragStart = ref(null);
const contextMenu = reactive({
  stateIndex: null,
  x: 0,
  y: 0
});
const editingTransition = ref(null);
const transitionEditText = ref('');
const showTestModal = ref(false);
const testInput = ref('');
const testResult = ref('');

const contextMenuStyle = computed(() => ({
  left: `${contextMenu.x}px`,
  top: `${contextMenu.y}px`
}));

onMounted(() => {
  ctx.value = canvas.value.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  requestAnimationFrame(draw);
});

function resizeCanvas() {
  canvas.value.width = window.innerWidth;
  canvas.value.height = window.innerHeight - 50; // Adjust for mode selector
}

function draw() {
  if (!ctx.value) return;
  
  ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height);
  
  // Draw transitions
  transitions.value.forEach(transition => {
    const from = states.value[transition.from];
    const to = states.value[transition.to];
    drawTransition(from, to, transition.symbol);
  });

  // Draw states
  states.value.forEach((state, index) => {
    drawState(state, index === initial.value);
  });

  // Draw dragging transition preview
  if (transitionDragStart.value !== null) {
    const fromState = states.value[transitionDragStart.value];
    ctx.value.beginPath();
    ctx.value.moveTo(fromState.x, fromState.y);
    ctx.value.lineTo(draggingState.currentX, draggingState.currentY);
    ctx.value.strokeStyle = 'black';
    ctx.value.stroke();
  }

  requestAnimationFrame(draw);
}

function drawState(state, isInitial) {
  ctx.value.beginPath();
  ctx.value.arc(state.x, state.y, state.radius, 0, Math.PI * 2);
  ctx.value.fillStyle = isInitial ? '#ff0000' : '#6496c8';
  ctx.value.fill();
  ctx.value.strokeStyle = 'black';
  ctx.value.stroke();

  if (state.isFinal) {
    ctx.value.beginPath();
    ctx.value.arc(state.x, state.y, state.radius * 0.85, 0, Math.PI * 2);
    ctx.value.stroke();
  }

  ctx.value.fillStyle = 'white';
  ctx.value.textAlign = 'center';
  ctx.value.textBaseline = 'middle';
  ctx.value.font = '16px Arial';
  ctx.value.fillText(state.name, state.x, state.y);
}

function drawTransition(from, to, symbol) {
  ctx.value.beginPath();
  ctx.value.moveTo(from.x, from.y);
  ctx.value.lineTo(to.x, to.y);
  ctx.value.strokeStyle = 'black';
  ctx.value.stroke();

  // Draw symbol
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  ctx.value.fillStyle = 'black';
  ctx.value.fillText(symbol, midX + 10, midY + 10);
}

// Event handlers
function handleMouseDown(event) {
  if (event.button === 2) return;
  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (contextMenu.stateIndex !== null) {
    closeContextMenu();
  }
  if (mode.value === 'move') {
    const stateIndex = findStateAt(x, y);
    if (stateIndex !== -1) {
      draggingState.index = stateIndex;
      draggingState.offset.x = x - states.value[stateIndex].x;
      draggingState.offset.y = y - states.value[stateIndex].y;
    }
  } else if (mode.value === 'create') {
    const stateIndex = findStateAt(x, y);
    if (stateIndex === -1) {
      states.value.push({
        x, y,
        radius: 30,
        name: `q${stateCounter.value++}`,
        isFinal: false
      });
    } else {
      transitionDragStart.value = stateIndex;
    }
  }
}

function handleMouseMove(event) {
  if (draggingState.index !== null) {
    const rect = canvas.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    states.value[draggingState.index].x = x - draggingState.offset.x;
    states.value[draggingState.index].y = y - draggingState.offset.y;
  }
}

function handleMouseUp(event) {
  if (mode.value === 'create' && transitionDragStart.value !== null) {
    const rect = canvas.value.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const endIndex = findStateAt(x, y);
    
    if (endIndex !== -1 && endIndex !== transitionDragStart.value) {
      transitions.value.push({
        from: transitionDragStart.value,
        to: endIndex,
        symbol: '1'
      });
    }
  }
  
  transitionDragStart.value = null;
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
    return;
  }
  
  const transitionIndex = findTransitionNear(x, y);
  if (transitionIndex !== -1) {
    editingTransition.value = transitionIndex;
    transitionEditText.value = transitions.value[transitionIndex].symbol;
  }
}

// Helper functions
function findStateAt(x, y) {
  return states.value.findIndex(state => {
    const dx = x - state.x;
    const dy = y - state.y;
    return Math.sqrt(dx*dx + dy*dy) <= state.radius;
  });
}

function findTransitionNear(x, y) {
  const pos = { x, y };
  return transitions.value.findIndex(t => {
    const a = states.value[t.from];
    const b = states.value[t.to];
    return distanceToLineSegment(pos, a, b) < 10;
  });
}

function distanceToLineSegment(p, a, b) {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const abLengthSq = ab.x**2 + ab.y**2;
  
  let t = 0;
  if (abLengthSq !== 0) {
    t = (ap.x * ab.x + ap.y * ab.y) / abLengthSq;
    t = Math.max(0, Math.min(1, t));
  }
  
  const projection = {
    x: a.x + ab.x * t,
    y: a.y + ab.y * t
  };
  
  return Math.sqrt((p.x - projection.x)**2 + (p.y - projection.y)**2);
}

// Context menu actions
function deleteState(index) {
  states.value.splice(index, 1);
  closeContextMenu();
}

function setInitialState(index) {
  initial.value = index;
  closeContextMenu();
}

function toggleFinalState(index) {
  states.value[index].isFinal = !states.value[index].isFinal;
  closeContextMenu();
}

function closeContextMenu() {
  contextMenu.stateIndex = null;
}

// Transition editing
function saveTransitionEdit() {
  transitions.value[editingTransition.value].symbol = transitionEditText.value;
  editingTransition.value = null;
}

function cancelTransitionEdit() {
  editingTransition.value = null;
}

// Test execution
function runTest() {
  let current = initial.value;
  if (current === null || current >= states.value.length) {
    testResult.value = 'No initial state';
    return;
  }

  for (const char of testInput.value) {
    const transition = transitions.value.find(t => 
      t.from === current && t.symbol === char
    );
    if (!transition) {
      testResult.value = 'Rejected';
      return;
    }
    current = transition.to;
  }

  testResult.value = states.value[current]?.isFinal ? 'Accepted' : 'Rejected';
}
</script>

<style>
canvas {
  border: 1px solid #ccc;
  overflow-x: hidden;
}

.mode-selector {
  padding: 10px;
  background: #eee;
  width: 100vw;
  display: flex;
  flex-direction: row;
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
  box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border: 1px solid #ccc;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}
</style>