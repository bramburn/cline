import { ErrorCategory } from '../../types';

export interface ToolCallOutcome {
  success: boolean;
  duration: number;
  errorMessage?: string;
}

export interface ToolCallPattern {
  toolName: string;
  parameters: Record<string, any>;
  outcome: ToolCallOutcome;
  timestamp: number;
  retryCount: number;
  errorType?: ErrorCategory;
}

export const createMockToolCallPattern = (overrides: Partial<ToolCallPattern> = {}): ToolCallPattern => ({
  toolName: 'read_file',
  parameters: { path: './mock-file.txt' },
  outcome: {
    success: true,
    duration: 100,
  },
  timestamp: Date.now(),
  retryCount: 0,
  ...overrides
});
