import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Match the host used by `vite preview --host 127.0.0.1`. Using the
    // "localhost" name can resolve to ::1 only, where nothing is listening.
    baseUrl: 'http://127.0.0.1:4173',
    supportFile: false,
  },
});
