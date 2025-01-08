import { vi } from 'vitest';

export const mockStreamController = {
  error: vi.fn().mockImplementation((error: Error) => {
    console.log('Mock stream error:', error);
  })
};
