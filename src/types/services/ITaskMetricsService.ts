export interface TaskMetricsEntry {
  taskId: string;
  tokenCount: number;
  cost: number;
  cacheReads?: number;
  cacheWrites?: number;
}

export interface ITaskMetricsService {
  initializeMetrics(taskId: string): void;
  trackTokens(taskId: string, tokens: number): void;
  trackCost(taskId: string, cost: number): void;
  trackCacheOperation(taskId: string, operation: 'read' | 'write'): void;
  getTaskMetrics(taskId: string): TaskMetricsEntry | undefined;
  getAllTaskMetrics(): TaskMetricsEntry[];
  clearTaskMetrics(taskId: string): void;
} 