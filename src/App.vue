<script setup lang="ts">
import StateMachine from './components/AutomataEditor.vue';
</script>

<template>
  <div class="app">
    <h1>State Machine Editor</h1>
    <StateMachine />
  </div>
</template>

<style>
.app {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 2rem;
  color: #333;
}
</style>