import { ToolCallOptimizationAgent } from '../ToolCallOptimizationAgent';
import { ErrorCategory } from '../../../types/ToolCallOptimization';

describe('ToolCallOptimizationAgent', () => {
  let agent: ToolCallOptimizationAgent;

  beforeEach(() => {
    agent = new ToolCallOptimizationAgent();
  });

  describe('executeToolCall', () => {
    it('should handle successful tool execution', async () => {
      const mockExecute = jest.fn().mockResolvedValue('success');

      const result = await agent.executeToolCall(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      expect(result.result).toBe('success');
      expect(result.pattern).toBeDefined();
      expect(result.pattern?.outcome.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle failed tool execution with retries', async () => {
      const mockExecute = jest.fn()
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockResolvedValue('success');

      const result = await agent.executeToolCall(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      expect(result.result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(3);
      expect(result.pattern).toBeDefined();
      expect(result.pattern?.outcome.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle failed tool execution with error report', async () => {
      const mockExecute = jest.fn()
        .mockRejectedValue(new Error('Resource not found'));

      const result = await agent.executeToolCall(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      expect(result.result).toBeNull();
      expect(result.pattern).toBeDefined();
      expect(result.pattern?.outcome.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe(ErrorCategory.RESOURCE_NOT_FOUND);
      expect(result.analysis).toBeDefined();
    });

    it('should provide pattern analysis with success rates', async () => {
      // First call - success
      await agent.executeToolCall(
        'read_file',
        { path: './test1.txt' },
        jest.fn().mockResolvedValue('success')
      );

      // Second call - failure
      await agent.executeToolCall(
        'read_file',
        { path: './test2.txt' },
        jest.fn().mockRejectedValue(new Error('Resource not found'))
      );

      // Get analysis
      const analysis = agent.getPatternAnalysis('read_file');
      expect(analysis.successRate).toBe(0.5);
      expect(analysis.commonErrors).toContainEqual({
        category: ErrorCategory.RESOURCE_NOT_FOUND,
        count: 1
      });
    });

    it('should maintain error history', async () => {
      // Generate some errors
      await agent.executeToolCall(
        'read_file',
        { path: './test1.txt' },
        jest.fn().mockRejectedValue(new Error('Resource not found'))
      );

      await agent.executeToolCall(
        'read_file',
        { path: './test2.txt' },
        jest.fn().mockRejectedValue(new Error('Permission denied'))
      );

      const errorHistory = agent.getErrorHistory();
      expect(errorHistory).toHaveLength(2);
      expect(errorHistory[0].category).toBe(ErrorCategory.RESOURCE_NOT_FOUND);
      expect(errorHistory[1].category).toBe(ErrorCategory.PERMISSION_DENIED);
    });

    it('should clear history', async () => {
      // Generate some history
      await agent.executeToolCall(
        'read_file',
        { path: './test.txt' },
        jest.fn().mockResolvedValue('success')
      );

      expect(agent.getPatternAnalysis('read_file').successRate).toBe(1);
      
      agent.clearHistory();
      
      expect(agent.getPatternAnalysis('read_file').successRate).toBe(0);
      expect(agent.getErrorHistory()).toHaveLength(0);
    });

    it('should handle parameter modification in retries', async () => {
      const mockExecute = jest.fn()
        .mockRejectedValueOnce(new Error('RESOURCE_NOT_FOUND'))
        .mockResolvedValue('success');

      const result = await agent.executeToolCall(
        'read_file',
        { path: 'dir/test.txt' },
        mockExecute
      );

      expect(result.result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenLastCalledWith({ path: 'dir' });
    });

    it('should provide useful suggestions in error reports', async () => {
      const result = await agent.executeToolCall(
        'search_files',
        { path: './', regex: '*.txt' },
        jest.fn().mockRejectedValue(new Error('Invalid parameter format'))
      );

      expect(result.error?.suggestions).toContainEqual(expect.objectContaining({
        toolName: 'search_files',
        suggestedParameters: expect.objectContaining({
          regex: '\\*\\.txt'
        })
      }));
    });

    it('should learn from successful patterns', async () => {
      // First call with successful pattern
      await agent.executeToolCall(
        'read_file',
        { path: './successful.txt' },
        jest.fn().mockResolvedValue('success')
      );

      // Second call with failure
      const result = await agent.executeToolCall(
        'read_file',
        { path: 'failed.txt' },
        jest.fn().mockRejectedValue(new Error('Resource not found'))
      );

      // Should suggest the successful pattern
      expect(result.error?.suggestions).toContainEqual(expect.objectContaining({
        toolName: 'read_file',
        suggestedParameters: expect.objectContaining({
          path: './successful.txt'
        })
      }));
    });
  });
}); 