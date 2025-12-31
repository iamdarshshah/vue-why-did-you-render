<script setup lang="ts">
import { ref, shallowRef, triggerRef } from "vue";

/**
 * NoOpDemo Component
 * Demonstrates NO-OP render detection.
 *
 * ⚠️ This is a PERFORMANCE ISSUE that vue-why-did-you-render helps detect!
 *
 * Note: Vue 3.4+ optimizes away primitive no-ops (value.value = 5 when already 5).
 * But it CANNOT optimize away:
 * - triggerRef() calls on unchanged refs
 * - shallowRef with same object reference
 * - Object spreads creating new references with same content
 */

const value = ref(5);
const message = ref("Hello");

// shallowRef with an object - Vue can't deeply compare
const config = shallowRef({ theme: "dark", fontSize: 14 });

function triggerNoOp() {
  // Vue 3.4+ optimizes this away - no re-render happens!
  value.value = 5;
}

function triggerRealChange() {
  // This is a real change
  value.value = Math.floor(Math.random() * 100);
}

function triggerForcedNoOp() {
  // This FORCES a re-render even though nothing changed!
  // triggerRef bypasses Vue's optimization
  triggerRef(value);
}

function triggerObjectNoOp() {
  // Creates a NEW object with SAME values - Vue sees different reference
  // This causes a re-render even though content is identical!
  config.value = { ...config.value };
}

function triggerMultipleNoOps() {
  // Multiple forced no-ops
  triggerRef(value);
  triggerRef(message);
}
</script>

<template>
  <div class="card">
    <h2>⚠️ NoOpDemo (Performance Issue Detection)</h2>
    <p>
      Value: <strong>{{ value }}</strong>
    </p>
    <p>
      Message: <strong>{{ message }}</strong>
    </p>
    <p>
      Config: <strong>{{ config.theme }} / {{ config.fontSize }}px</strong>
    </p>

    <button @click="triggerRealChange">✅ Trigger Real Change</button>
    <button class="warning" @click="triggerNoOp">(Optimized) Set value = 5</button>
    <button class="warning" @click="triggerForcedNoOp">⚠️ Force NO-OP (triggerRef)</button>
    <button class="warning" @click="triggerObjectNoOp">⚠️ Object Spread NO-OP</button>
    <button class="warning" @click="triggerMultipleNoOps">⚠️ Multiple NO-OPs</button>

    <div class="hint">
      <strong>⚠️ NO-OP renders</strong> are performance issues!<br />
      • "Set value = 5" - Vue 3.4+ optimizes this away (no re-render)<br />
      • Orange ⚠️ buttons force re-renders with unchanged values<br />
      • Watch for ❌ markers in the console
    </div>
  </div>
</template>
