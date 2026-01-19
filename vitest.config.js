import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      API_TOKEN: 'test-token-123'
    }
  }
});
