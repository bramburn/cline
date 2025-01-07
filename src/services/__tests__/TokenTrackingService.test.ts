import { TokenTrackingService } from '../TokenTrackingService';

describe('TokenTrackingService', () => {
  let service: TokenTrackingService;

  beforeEach(() => {
    service = new TokenTrackingService();
  });

  it('should track token usage correctly', () => {
    service.trackUsage(10, 5, 'request1');
    service.trackUsage(20, 10, 'request2');

    const metrics = service.getMetrics();
    expect(metrics.totalInputTokens).toBe(30);
    expect(metrics.totalOutputTokens).toBe(15);
    expect(metrics.averageInputTokens).toBe(15);
    expect(metrics.averageOutputTokens).toBe(7.5);
    expect(metrics.usageHistory).toHaveLength(2);
  });

  it('should maintain history size limit', () => {
    // Add more entries than the limit
    for (let i = 0; i < 1100; i++) {
      service.trackUsage(1, 1, `request${i}`);
    }

    const metrics = service.getMetrics();
    expect(metrics.usageHistory).toHaveLength(1000); // MAX_HISTORY_SIZE
  });

  it('should get usage for specific request', () => {
    service.trackUsage(10, 5, 'request1');
    service.trackUsage(20, 10, 'request2');

    const usage = service.getUsageForRequest('request1');
    expect(usage).toBeDefined();
    expect(usage?.inputTokens).toBe(10);
    expect(usage?.outputTokens).toBe(5);
  });

  it('should clear history', () => {
    service.trackUsage(10, 5, 'request1');
    service.trackUsage(20, 10, 'request2');
    
    service.clearHistory();
    
    const metrics = service.getMetrics();
    expect(metrics.usageHistory).toHaveLength(0);
    expect(metrics.totalInputTokens).toBe(0);
    expect(metrics.totalOutputTokens).toBe(0);
  });

  it('should handle empty history correctly', () => {
    const metrics = service.getMetrics();
    expect(metrics.totalInputTokens).toBe(0);
    expect(metrics.totalOutputTokens).toBe(0);
    expect(metrics.averageInputTokens).toBe(0);
    expect(metrics.averageOutputTokens).toBe(0);
    expect(metrics.usageHistory).toHaveLength(0);
  });
}); 