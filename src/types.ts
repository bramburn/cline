export const TYPES = {
  NotificationService: Symbol.for('NotificationService'),
};

export type ErrorCategory = 'TIMEOUT' | 'NETWORK_ERROR';

export interface ToolCallPattern {
  toolName: string;
  parameters: Record<string, any>;
  outcome: string;
  timestamp: Date;
  retryCount: number;
}
