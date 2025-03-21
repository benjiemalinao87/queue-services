import { defineConfig } from "@rslib/core";

export default defineConfig({
  source: {
    entry: {
      worker: "./src/worker/index.ts",
      server: "./src/index.ts",
      "test-queues": "./src/test-queues.ts",
      "test-railway": "./src/test-railway.ts",
      "test-direct": "./src/test-direct.ts",
      "test-connections": "./src/test-connections.ts",
      "test-bull-board": "./src/test-bull-board.ts",
      "test-redis-config": "./src/test-redis-config.ts",
      "test-proxy-jobs": "./src/test-proxy-jobs.ts",
      "test-sms-queues": "./src/test-sms-queues.ts",
      "test-sms-api": "./src/test-sms-api.ts",
    },
  },
  lib: [{ format: "esm", syntax: "es2022" }],
});
