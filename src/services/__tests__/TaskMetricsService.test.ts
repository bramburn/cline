import { TaskMetricsService } from '../TaskMetricsService';
import { describe, it, expect, beforeEach } from 'vitest';

describe('TaskMetricsService', () => {
  let metricsService: TaskMetricsService;
  const testTaskId = 'test-task-id';

  beforeEach(() => {
    metricsService = new TaskMetricsService();
    metricsService.initializeMetrics(testTaskId);
  });

  describe('initializeMetrics', () => {
    it('should initialize metrics with default values', () => {
      const metrics = metricsService.getMetrics(testTaskId);
      expect(metrics).toEqual({
        tokenCount: 0,
        cost: 0,
        duration: 0,
        cacheReads: 0,
        cacheWrites: 0
      });
    });
  });

  describe('trackTokens', () => {
    it('should increment token count', () => {
      metricsService.trackTokens(testTaskId, 100);
      const metrics = metricsService.getMetrics(testTaskId);
      expect(metrics.tokenCount).toBe(100);

      metricsService.trackTokens(testTaskId, 50);
      const updatedMetrics = metricsService.getMetrics(testTaskId);
      expect(updatedMetrics.tokenCount).toBe(150);
    });

    it('should throw error for non-existent task', () => {
      expect(() => metricsService.trackTokens('non-existent', 100)).toThrow();
    });
  });

  describe('trackCost', () => {
    it('should increment cost', () => {
      metricsService.trackCost(testTaskId, 0.5);
      const metrics = metricsService.getMetrics(testTaskId);
      expect(metrics.cost).toBe(0.5);

      metricsService.trackCost(testTaskId, 0.3);
      const updatedMetrics = metricsService.getMetrics(testTaskId);
      expect(updatedMetrics.cost).toBe(0.8);
    });

    it('should throw error for non-existent task', () => {
      expect(() => metricsService.trackCost('non-existent', 0.5)).toThrow();
    });
  });

  describe('trackCacheOperation', () => {
    it('should increment cache reads', () => {
      metricsService.trackCacheOperation(testTaskId, 'read');
      const metrics = metricsService.getMetrics(testTaskId);
      expect(metrics.cacheReads).toBe(1);

      metricsService.trackCacheOperation(testTaskId, 'read');
      const updatedMetrics = metricsService.getMetrics(testTaskId);
      expect(updatedMetrics.cacheReads).toBe(2);
    });

    it('should increment cache writes', () => {
      metricsService.trackCacheOperation(testTaskId, 'write');
      const metrics = metricsService.getMetrics(testTaskId);
      expect(metrics.cacheWrites).toBe(1);

      metricsService.trackCacheOperation(testTaskId, 'write');
      const updatedMetrics = metricsService.getMetrics(testTaskId);
      expect(updatedMetrics.cacheWrites).toBe(2);
    });

    it('should throw error for non-existent task', () => {
      expect(() => metricsService.trackCacheOperation('non-existent', 'read')).toThrow();
    });
  });

  describe('updateDuration', () => {
    it('should calculate and update duration', () => {
      const startTime = Date.now();
      const endTime = startTime + 1000;

      metricsService.updateDuration(testTaskId, startTime, endTime);
      const metrics = metricsService.getMetrics(testTaskId);
      expect(metrics.duration).toBe(1000);
    });

    it('should throw error for non-existent task', () => {
      expect(() => metricsService.updateDuration('non-existent', Date.now(), Date.now())).toThrow();
    });
  });

  describe('clearMetrics', () => {
    it('should remove metrics for task', () => {
      metricsService.clearMetrics(testTaskId);
      expect(() => metricsService.getMetrics(testTaskId)).toThrow();
    });
  });

  describe('getAllMetrics', () => {
    it('should return all task metrics', () => {
      const secondTaskId = 'second-task';
      metricsService.initializeMetrics(secondTaskId);

      metricsService.trackTokens(testTaskId, 100);
      metricsService.trackTokens(secondTaskId, 200);

      const allMetrics = metricsService.getAllMetrics();
      expect(allMetrics.size).toBe(2);
      expect(allMetrics.get(testTaskId)?.tokenCount).toBe(100);
      expect(allMetrics.get(secondTaskId)?.tokenCount).toBe(200);
    });

    it('should return a copy of metrics', () => {
      const allMetrics = metricsService.getAllMetrics();
      allMetrics.clear(); // This shouldn't affect the original metrics

      expect(metricsService.getAllMetrics().size).toBe(1);
    });
  });
}); 