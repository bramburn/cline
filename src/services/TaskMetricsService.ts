import { TaskMetrics } from './TaskManagementService';

export class TaskMetricsService {
  private metrics: Map<string, TaskMetrics> = new Map();

  constructor() {}

  initializeMetrics(taskId: string): void {
    this.metrics.set(taskId, {
      tokenCount: 0,
      cost: 0,
      duration: 0,
      cacheReads: 0,
      cacheWrites: 0
    });
  }

  trackTokens(taskId: string, count: number): void {
    const metrics = this.getMetrics(taskId);
    metrics.tokenCount += count;
    this.metrics.set(taskId, metrics);
  }

  trackCost(taskId: string, amount: number): void {
    const metrics = this.getMetrics(taskId);
    metrics.cost += amount;
    this.metrics.set(taskId, metrics);
  }

  trackCacheOperation(taskId: string, operation: 'read' | 'write'): void {
    const metrics = this.getMetrics(taskId);
    if (operation === 'read') {
      metrics.cacheReads = (metrics.cacheReads || 0) + 1;
    } else {
      metrics.cacheWrites = (metrics.cacheWrites || 0) + 1;
    }
    this.metrics.set(taskId, metrics);
  }

  getMetrics(taskId: string): TaskMetrics {
    const metrics = this.metrics.get(taskId);
    if (!metrics) {
      throw new Error(`No metrics found for task ${taskId}`);
    }
    return { ...metrics };
  }

  updateDuration(taskId: string, startTime: number, endTime: number): void {
    const metrics = this.getMetrics(taskId);
    metrics.duration = endTime - startTime;
    this.metrics.set(taskId, metrics);
  }

  clearMetrics(taskId: string): void {
    this.metrics.delete(taskId);
  }

  getAllMetrics(): Map<string, TaskMetrics> {
    return new Map(this.metrics);
  }
} 