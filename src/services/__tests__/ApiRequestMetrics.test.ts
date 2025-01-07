import { ApiRequestMetrics } from '../ApiRequestMetrics';

describe('ApiRequestMetrics', () => {
  let metrics: ApiRequestMetrics;

  beforeEach(() => {
    metrics = new ApiRequestMetrics();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should track request lifecycle correctly', () => {
    const requestId = 'test-request-1';
    const endpoint = 'https://api.example.com/test';

    metrics.startRequest(requestId, endpoint);
    
    // Simulate some time passing
    jest.advanceTimersByTime(1000);
    
    metrics.completeRequest(requestId, true);

    const summary = metrics.getMetricsSummary();
    const metric = metrics.getRequestMetric(requestId);

    expect(summary.totalRequests).toBe(1);
    expect(summary.successfulRequests).toBe(1);
    expect(summary.failedRequests).toBe(0);
    expect(metric).toBeDefined();
    expect(metric?.success).toBe(true);
    expect(metric?.duration).toBe(1000);
  });

  it('should handle failed requests correctly', () => {
    const requestId = 'test-request-2';
    const endpoint = 'https://api.example.com/test';
    const errorMessage = 'Network error';

    metrics.startRequest(requestId, endpoint);
    metrics.completeRequest(requestId, false, errorMessage);

    const summary = metrics.getMetricsSummary();
    const metric = metrics.getRequestMetric(requestId);

    expect(summary.totalRequests).toBe(1);
    expect(summary.successfulRequests).toBe(0);
    expect(summary.failedRequests).toBe(1);
    expect(metric?.success).toBe(false);
    expect(metric?.errorMessage).toBe(errorMessage);
  });

  it('should maintain history size limit', () => {
    // Add more entries than the limit
    for (let i = 0; i < 1100; i++) {
      const requestId = `request-${i}`;
      metrics.startRequest(requestId, 'https://api.example.com/test');
      metrics.completeRequest(requestId, true);
    }

    const summary = metrics.getMetricsSummary();
    expect(summary.metrics.length).toBe(1000); // MAX_METRICS_HISTORY
  });

  it('should calculate average response time correctly', () => {
    // Add requests with different durations
    const requests = [
      { id: 'req1', duration: 1000 },
      { id: 'req2', duration: 2000 },
      { id: 'req3', duration: 3000 }
    ];

    for (const req of requests) {
      metrics.startRequest(req.id, 'https://api.example.com/test');
      jest.advanceTimersByTime(req.duration);
      metrics.completeRequest(req.id, true);
    }

    const summary = metrics.getMetricsSummary();
    expect(summary.averageResponseTime).toBe(2000); // (1000 + 2000 + 3000) / 3
  });

  it('should clear metrics correctly', () => {
    metrics.startRequest('req1', 'https://api.example.com/test');
    metrics.completeRequest('req1', true);

    metrics.clearMetrics();

    const summary = metrics.getMetricsSummary();
    expect(summary.totalRequests).toBe(0);
    expect(summary.metrics).toHaveLength(0);
  });

  it('should handle non-existent request IDs gracefully', () => {
    metrics.completeRequest('non-existent', true);
    const metric = metrics.getRequestMetric('non-existent');
    
    expect(metric).toBeUndefined();
  });
}); 