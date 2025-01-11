import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // ... other configurations
    setupFiles: ['./src/setupTests.ts'],
  },
}); 