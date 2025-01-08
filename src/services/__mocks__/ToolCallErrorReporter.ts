import { vi } from 'vitest';

export class ToolCallErrorReporter {
  private _errorHistory: Array<{ error: { message: string }; timestamp: number }> = [];

  reportError = vi.fn().mockImplementation((toolId, parameters, error) => {
    this._errorHistory.push({
      error: { message: error.message },
      timestamp: Date.now()
    });
  });

  getHistory = vi.fn().mockImplementation(() => [...this._errorHistory]);

  clearHistory = vi.fn().mockImplementation(() => {
    this._errorHistory = [];
  });
} 