import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ToolCallRetryService,
  ToolCallPatternAnalyzer,
  ErrorReportingService,
} from '../__mocks__';

import type {
  ToolUseName,
  ErrorReport,
  PatternAnalysis,
  ToolCallPattern,
  RetryHistory,
  ExecuteToolCallResponse,
  OptimizationConfig,
} from '../types/__mocks__';
import { ToolCallOptimizationAgent } from '../ToolCallOptimizationAgent';

describe('ToolCallOptimizationAgent', () => {
  let agent: ToolCallOptimizationAgent;

  beforeEach(() => {
    agent = new ToolCallOptimizationAgent();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('executeToolCall', () => {
    it('should execute tool call successfully without retries', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const parameters = { param1: 'value1' };

      const result = await agent.executeToolCall('tool1', parameters, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith(parameters);

      const patterns = agent.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].toolId).toBe('tool1');
      expect(patterns[0].parameters).toEqual(parameters);
      expect(patterns[0].outcome.success).toBe(true);
    });

    it('should retry on failure and succeed', async () => {
      console.log("Test: should retry on failure and succeed - Start");
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');

      const parameters = { param1: 'value1' };

      const result = await agent.executeToolCall('tool1', parameters, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);

      const patterns = agent.getPatterns();
      expect(patterns).toHaveLength(3);
      expect(patterns[0].outcome.success).toBe(false);
      expect(patterns[1].outcome.success).toBe(false);
      expect(patterns[2].outcome.success).toBe(true);
      console.log("Test: should retry on failure and succeed - End");
    });

    it('should fail after max retries', async () => {
      console.log("Test: should fail after max retries - Start");
      const error = new Error('test error');
      const operation = vi.fn().mockRejectedValue(error);
      const parameters = { param1: 'value1' };

      await expect(agent.executeToolCall('tool1', parameters, operation))
        .rejects.toThrow(error);

      expect(operation).toHaveBeenCalledTimes(3);

      const patterns = agent.getPatterns();
      expect(patterns).toHaveLength(3);
      expect(patterns.every(p => !p.outcome.success)).toBe(true);
      console.log("Test: should fail after max retries - End");
    });

    it('should respect custom tool configuration', async () => {
      console.log("Test: should respect custom tool configuration - Start");
      const operation = vi.fn().mockRejectedValue(new Error('test error'));
      const parameters = { param1: 'value1' };

      agent.setToolConfig('tool1', {
        maxRetries: 1,
        retryDelay: 1000,
        shouldRetry: () => false
      });

      await expect(agent.executeToolCall('tool1', parameters, operation))
        .rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(1);
      console.log("Test: should respect custom tool configuration - End");
    });

    it('should modify parameters between retries', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockResolvedValue('success');

      const parameters = { param1: 'value1' };
      const modifiedParameters = { param1: 'modified' };

      agent.setToolConfig('tool1', {
        maxRetries: 2,
        retryDelay: 1000,
        modifyParameters: () => modifiedParameters
      });

      const result = await agent.executeToolCall('tool1', parameters, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(operation).toHaveBeenLastCalledWith(modifiedParameters);
    });

    it('should wait for retry delay between attempts', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');

      const parameters = { param1: 'value1' };

      const promise = agent.executeToolCall('tool1', parameters, operation);

      expect(operation).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(operation).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1000);
      expect(operation).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('pattern management', () => {
    it('should record patterns with timestamps', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const parameters = { param1: 'value1' };

      await agent.executeToolCall('tool1', parameters, operation);

      const patterns = agent.getPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].timestamp).toBeDefined();
      expect(patterns[0].outcome.duration).toBeGreaterThanOrEqual(0);
    });

    it('should clear patterns', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const parameters = { param1: 'value1' };

      await agent.executeToolCall('tool1', parameters, operation);
      expect(agent.getPatterns()).toHaveLength(1);

console.log("Calling clearHistory");
agent.clearHistory();
expect(agent.getPatterns()).toHaveLength(0);
console.log("clearHistory called");
    });
  });

  describe('tool configuration', () => {
    it('should use default config when no specific config exists', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('test error'));
      const parameters = { param1: 'value1' };

      await expect(agent.executeToolCall('tool1', parameters, operation))
        .rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(3); // default maxRetries is 3
    });

    it('should merge custom config with default config', () => {
      agent.setToolConfig('tool1', {
        maxRetries: 5,
        retryDelay: 2000
      });

      const config = agent.getToolConfig('tool1');
      expect(config.maxRetries).toBe(5);
      expect(config.retryDelay).toBe(2000);
      expect(config.shouldRetry).toBeDefined();
      expect(config.modifyParameters).toBeDefined();
    });
  });
});
