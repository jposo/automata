<script setup lang="ts">
import StateMachine from './components/AutomataEditor.vue';
</script>

<template>
  <div class="app">
    <StateMachine />
  </div>
</template>

<style>
body {
  width:  100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}
.app {
  max-width: 1200px;
}

h1 {
  margin-bottom: 2rem;
  color: #333;
}
</style>