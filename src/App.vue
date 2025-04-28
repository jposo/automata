<template>
  <v-app>
    <v-main
      style="font-family: 'Roboto', sans-serif; overflow: hidden; height: 100vh"
    >
      <AutomataEditor />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AutomataEditor from "./components/AutomataEditor.vue";

export default defineComponent({
  name: "App",

  components: {
    AutomataEditor,
  },

  data() {
    return {
      //
    };
  },
});
</script>
