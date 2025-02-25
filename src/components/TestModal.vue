<template>
    <v-dialog v-model="showTestModal" max-width="400px">
    <v-card>
      <v-card-title class="text-h5">
        Test Input
      </v-card-title>
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
        <v-btn color="primary" @click="runTest">
          Test
        </v-btn>
        <v-btn color="grey darken-1" text @click="showTestModal = false">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue';

const showTestModal = ref(false);
const testInput = ref('');
const testResult = ref('');

function runTest() {
  // Implement the test logic here
}
</script>