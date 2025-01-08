import { vi } from 'vitest';
import { ToolCallPattern } from '../../types/__mocks__/ToolCallPattern';

export class ToolCallSuggestionGenerator {
  private _patterns: ToolCallPattern[] = [];

  getSuggestions = vi.fn().mockReturnValue([
    'Consider using proper regex patterns',
    'Consider increasing timeout duration'
  ]);

  addPattern = vi.fn().mockImplementation((pattern: ToolCallPattern) => {
    this._patterns.push(pattern);
  });
} 