import { describe, it, expect, vi } from 'vitest';
import { ToolCallOptimizationAgent } from '../ToolCallOptimizationAgent';

interface PatternAnalysis {
  [toolId: string]: {
    successRate: number;
    successfulPatterns: string[];
  };
}

interface ErrorReport {
  error: Error;
  timestamp: number;
}

describe('ToolCallOptimizationAgent', () => {
  const agent = new ToolCallOptimizationAgent();

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
      expect(patterns['read_file'].successfulPatterns).toEqual([
        JSON.stringify({ path: './test1.txt' }),
        JSON.stringify({ path: './test2.txt' })
      ]);
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
      expect(history[0].error.message).toBe('Resource not found');
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

    it('should handle parameter modification in retries', async () => {
      const mockExecute = vi.fn()
        .mockRejectedValueOnce(new Error('RESOURCE_NOT_FOUND'))
        .mockResolvedValue('success');

      agent.setToolConfig('read_file', {
        maxRetries: 2,
        retryDelay: 1000,
        modifyParameters: (parameters: any, error: Error): any => {
          if (error.message === 'RESOURCE_NOT_FOUND') {
            return {
              ...parameters,
              end_line: parameters.end_line ? parameters.end_line + 10 : 10
            };
          }
          return parameters;
        }
      });

      const result = await agent.executeToolCall(
        'read_file',
        { path: './test.txt', start_line: 1, end_line: 10 },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenLastCalledWith(
        'read_file',
        { path: './test.txt', start_line: 1, end_line: 20 }
      );
    });

    it('should provide useful suggestions in error reports', async () => {
      try {
        await agent.executeToolCall(
          'search_files',
          { path: './', regex: '.*txt' },
          vi.fn().mockRejectedValue(new Error('Invalid parameter format'))
        );
      } catch (error) {
        // Expected error
      }

      const suggestions = agent.getSuggestions();
      expect(suggestions).toContain('Consider using proper regex patterns');
    });

    it('should learn from successful patterns', async () => {
      console.log('Test: should learn from successful patterns');
      const parameters = { path: './successful.txt' };
      console.log('Parameters:', parameters);

      const mockExecute = vi.fn().mockResolvedValue('success');

      const result = await agent.executeToolCall(
        'read_file',
        parameters,
        mockExecute
      );

      console.log('Result:', result);
      console.log('Mock Execute Calls:', mockExecute.mock.calls);

      const patterns = agent.getPatternAnalysis();
      console.log('Patterns:', patterns);

      expect(patterns['read_file'].successRate).toBe(1);
      expect(patterns['read_file'].successfulPatterns).toContain(JSON.stringify(parameters));
    });
  });
});
