import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Match the host used by `vite preview --host 127.0.0.1`. Using the
    // "localhost" name can resolve to ::1 only, where nothing is listening.
    baseUrl: 'http://127.0.0.1:4173',
    supportFile: 'cypress/support/e2e.ts',
    // A transient API/websocket hiccup should not fail an otherwise correct
    // run; real assertion failures still fail after the retry.
    retries: { runMode: 1, openMode: 0 },
  },
});
