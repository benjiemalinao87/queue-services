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
      "test-direct-sms-api": "./src/test-direct-sms-api.ts",
      "test-railway-redis-options": "./src/test-railway-redis-options.ts",
      "test-delayed-sms": "./src/test-delayed-sms.ts",
      "test-redis-ping": "./src/test-redis-ping.ts",
      "test-delayed-sms-new": "./src/test-delayed-sms-new.ts",
      "test-redis-ping-url": "./src/test-redis-ping-url.ts",
      "test-redis-simple": "./src/test-redis-simple.ts",
      "test-redis-node": "./src/test-redis-node.ts",
    },
  },
  lib: [{ format: "esm", syntax: "es2022" }],
});
