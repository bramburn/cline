import { injectable } from 'inversify';

export interface RequestMetric {
  requestId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  endpoint: string;
  errorMessage?: string;
}

export interface MetricsSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  metrics: RequestMetric[];
}

@injectable()
export class ApiRequestMetrics {
  private metrics: RequestMetric[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;

  public startRequest(requestId: string, endpoint: string): void {
    this.metrics.push({
      requestId,
      startTime: new Date(),
      success: false,
      endpoint
    });

    this.pruneMetrics();
  }

  public completeRequest(requestId: string, success: boolean, errorMessage?: string): void {
    const metric = this.metrics.find(m => m.requestId === requestId);
    if (metric) {
      metric.endTime = new Date();
      metric.duration = metric.endTime.getTime() - metric.startTime.getTime();
      metric.success = success;
      metric.errorMessage = errorMessage;
    }
  }

  public getMetricsSummary(): MetricsSummary {
    const completedMetrics = this.metrics.filter(m => m.endTime !== undefined);
    const successfulMetrics = completedMetrics.filter(m => m.success);
    
    const totalDuration = completedMetrics.reduce((sum, metric) => 
      sum + (metric.duration || 0), 0);

    return {
      totalRequests: completedMetrics.length,
      successfulRequests: successfulMetrics.length,
      failedRequests: completedMetrics.length - successfulMetrics.length,
      averageResponseTime: completedMetrics.length > 0 
        ? totalDuration / completedMetrics.length 
        : 0,
      metrics: [...this.metrics]
    };
  }

  public getRequestMetric(requestId: string): RequestMetric | undefined {
    return this.metrics.find(m => m.requestId === requestId);
  }

  private pruneMetrics(): void {
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  public clearMetrics(): void {
    this.metrics = [];
  }
} 