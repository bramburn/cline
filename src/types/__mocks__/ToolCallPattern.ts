import { ErrorCategory, ToolCallOutcome } from '../../types';

export interface ToolCallPattern {
  toolId: string;
  toolName: 'browser_action' | 'execute_command' | 'read_file' | 'write_to_file' | 'replace_in_file' | 'search_files' | 'list_files' | 'list_code_definition_names' | 'use_mcp_tool' | 'access_mcp_resource' | 'ask_followup_question' | 'attempt_completion';
  parameters: Record<string, any>;
  outcome: ToolCallOutcome;
  timestamp: Date;
  retryCount: number;
  errorType?: ErrorCategory;
}

export const createMockToolCallPattern = (overrides: Partial<ToolCallPattern> = {}): ToolCallPattern => ({
  toolId: 'mock-tool',
  toolName: 'read_file',
  parameters: { path: './mock-file.txt' },
  outcome: {
    success: true,
    duration: 100,
  },
  timestamp: new Date(),
  retryCount: 0,
  ...overrides
});
