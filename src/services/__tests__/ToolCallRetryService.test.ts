import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolCallRetryService } from '../ToolCallRetryService';

describe('ToolCallRetryService', () => {
  let retryService: ToolCallRetryService;

  beforeEach(() => {
    retryService = new ToolCallRetryService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully without retries', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const config = { maxRetries: 3, retryDelay: 1000 };

      const result = await retryService.executeWithRetry('tool1', operation, config);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);

      const history = retryService.getRetryHistory('tool1');
      expect(history?.attempts).toBe(0);
      expect(history?.lastError).toBeUndefined();
    });

    it('should retry on failure and succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');

      const config = { maxRetries: 3, retryDelay: 1000 };

      const result = await retryService.executeWithRetry('tool1', operation, config);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);

      const history = retryService.getRetryHistory('tool1');
      expect(history?.attempts).toBe(2);
      expect(history?.lastError).toBeUndefined();
    });

    it('should fail after max retries', async () => {
      const error = new Error('test error');
      const operation = vi.fn().mockRejectedValue(error);
      const config = { maxRetries: 3, retryDelay: 1000 };

      await expect(retryService.executeWithRetry('tool1', operation, config))
        .rejects.toThrow(error);

      expect(operation).toHaveBeenCalledTimes(3);

      const history = retryService.getRetryHistory('tool1');
      expect(history?.attempts).toBe(3);
      expect(history?.lastError).toBe(error);
    });

    it('should respect shouldRetry function', async () => {
      const error = new Error('test error');
      const operation = vi.fn().mockRejectedValue(error);
      const shouldRetry = vi.fn().mockReturnValue(false);
      const config = { maxRetries: 3, retryDelay: 1000, shouldRetry };

      await expect(retryService.executeWithRetry('tool1', operation, config))
        .rejects.toThrow(error);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(error);

      const history = retryService.getRetryHistory('tool1');
      expect(history?.attempts).toBe(1);
      expect(history?.lastError).toBe(error);
    });

    it('should wait for retry delay between attempts', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');

      const config = { maxRetries: 3, retryDelay: 1000 };

      const promise = retryService.executeWithRetry('tool1', operation, config);

      expect(operation).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(operation).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1000);
      expect(operation).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('retry history management', () => {
    it('should track retry history correctly', async () => {
      const error = new Error('test error');
      const operation = vi.fn().mockRejectedValue(error);
      const config = { maxRetries: 2, retryDelay: 1000 };

      try {
        await retryService.executeWithRetry('tool1', operation, config);
      } catch {}

      const history = retryService.getRetryHistory('tool1');
      expect(history?.attempts).toBe(2);
      expect(history?.lastError).toBe(error);
      expect(history?.lastAttemptTime).toBeDefined();
    });

    it('should clear retry history', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('test error'));
      const config = { maxRetries: 1, retryDelay: 1000 };

      try {
        await retryService.executeWithRetry('tool1', operation, config);
      } catch {}

      expect(retryService.getRetryHistory('tool1')).toBeDefined();

      retryService.clearRetryHistory('tool1');
      expect(retryService.getRetryHistory('tool1')).toBeUndefined();
    });
  });
}); 