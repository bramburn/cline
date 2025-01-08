import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolCallOptimizationAgent } from '../ToolCallOptimizationAgent';
import { createMockToolCallPattern } from '../../../types/__mocks__/ToolCallPattern';
import { ErrorCategory } from '../../../types/__mocks__/ErrorCategory';

// Mock the dependencies
vi.mock('../../services/ToolCallPatternAnalyzer', () => ({
  ToolCallPatternAnalyzer: vi.fn().mockImplementation(() => ({
    recordToolCall: vi.fn(),
    getToolCallHistory: vi.fn(),
    analyzeToolCallPatterns: vi.fn().mockReturnValue({
      successRate: 1,
      averageDuration: 100,
      commonErrors: [],
      suggestions: [],
      successfulPatterns: []
    }),
    clearAnalysis: vi.fn()
  }))
}));

vi.mock('../../services/ToolCallRetryService', () => ({
  ToolCallRetryService: vi.fn().mockImplementation(() => ({
    executeWithRetry: vi.fn(),
    clearHistory: vi.fn()
  }))
}));

vi.mock('../../services/ToolCallErrorReporter', () => ({
  ToolCallErrorReporter: vi.fn().mockImplementation(() => ({
    reportError: vi.fn(),
    getHistory: vi.fn().mockReturnValue([]),
    clearHistory: vi.fn()
  }))
}));

vi.mock('../../services/ToolCallSuggestionGenerator', () => ({
  ToolCallSuggestionGenerator: vi.fn().mockImplementation(() => ({
    getSuggestions: vi.fn().mockReturnValue([
      'Consider using proper regex patterns',
      'Consider increasing timeout duration'
    ]),
    addPattern: vi.fn()
  }))
}));

describe('ToolCallOptimizationAgent', () => {
  let agent: ToolCallOptimizationAgent;

  beforeEach(() => {
    // Reset the agent before each test
    agent = new ToolCallOptimizationAgent();
  });

  describe('executeToolCall', () => {
    it('should handle successful tool execution', async () => {
      const mockExecute = vi.fn().mockResolvedValue('success');

      const result = await agent.executeToolCall(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should handle failed tool execution with retries', async () => {
      const mockExecute = vi.fn()
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockResolvedValue('success');

      const result = await agent.executeToolCall(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should handle failed tool execution with error report', async () => {
      const mockExecute = vi.fn()
        .mockRejectedValue(new Error('Resource not found'));

      await expect(agent.executeToolCall(
        'read_file',
        { path: './test.txt' },
        mockExecute
      )).rejects.toThrow('Resource not found');

      expect(mockExecute).toHaveBeenCalledTimes(1);

      const history = agent.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Resource not found');
    });

    it('should provide pattern analysis with success rates', async () => {
      await agent.executeToolCall(
        'read_file',
        { path: './test1.txt' },
        vi.fn().mockResolvedValue('success')
      );

      await agent.executeToolCall(
        'read_file',
        { path: './test2.txt' },
        vi.fn().mockResolvedValue('success')
      );

      const patterns = agent.getPatternAnalysis();
      expect(patterns['read_file'].successRate).toBe(1);
      expect(patterns['read_file'].successfulPatterns).toHaveLength(2);
    });

    it('should maintain error history', async () => {
      try {
        await agent.executeToolCall(
          'read_file',
          { path: './test1.txt' },
          vi.fn().mockRejectedValue(new Error('Resource not found'))
        );
      } catch (error) {
        // Expected error
      }

      const history = agent.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Resource not found');
    });

    it('should clear history', async () => {
      await agent.executeToolCall(
        'read_file',
        { path: './test.txt' },
        vi.fn().mockResolvedValue('success')
      );

      agent.clearHistory();
      expect(agent.getErrorHistory()).toHaveLength(0);
      expect(agent.getPatternAnalysis()).toEqual({});
    });

    it('should get suggestions', async () => {
      const suggestions = agent.getSuggestions();
      expect(suggestions).toHaveLength(2);
      expect(suggestions).toContain('Consider using proper regex patterns');
      expect(suggestions).toContain('Consider increasing timeout duration');
    });
  });

  describe('Tool Configuration', () => {
    it('should set and get tool config', () => {
      const config = {
        maxRetries: 5,
        retryDelay: 2000,
        shouldRetry: (error: Error) => error.message.includes('TIMEOUT'),
        modifyParameters: (params: Record<string, any>) => ({ ...params, timeout: 5000 })
      };

      agent.setToolConfig('read_file', config);
      const retrievedConfig = agent.getToolConfig('read_file');

      expect(retrievedConfig.maxRetries).toBe(5);
      expect(retrievedConfig.retryDelay).toBe(2000);
    });
  });
});
