export const TYPES = {
  NotificationService: Symbol.for('NotificationService'),
};

export type ErrorCategory = 'TIMEOUT' | 'NETWORK_ERROR';

export interface ToolCallOutcome {
  success: boolean;
  duration: number;
  errorMessage?: string;
}

export interface ToolCallPattern {
  toolName: string;
  parameters: Record<string, any>;
  outcome: ToolCallOutcome;
  timestamp: Date;
  retryCount: number;
}
