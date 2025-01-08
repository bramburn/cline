import { vi } from 'vitest';

export class ToolCallRetryService {
  executeWithRetry = vi.fn().mockImplementation(async (operation, maxRetries = 3) => {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempts++;
        if (attempts === maxRetries) {
          throw error;
        }
      }
    }
  });

  clearHistory = vi.fn();
}
