import { describe, it, expect, vi } from 'vitest';
import { ToolCallRetryService } from '../ToolCallRetryService';

describe('ToolCallRetryService', () => {
  const service = new ToolCallRetryService();

  describe('executeWithRetry', () => {
    it('should successfully execute a tool call without retries', async () => {
      const mockExecute = vi.fn().mockResolvedValue('success');

      const result = await service.executeWithRetry(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const mockExecute = vi.fn()
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('should not retry on invalid parameter errors', async () => {
      const mockExecute = vi.fn()
        .mockRejectedValue(new Error('INVALID_PARAMETER'));

      await expect(service.executeWithRetry(
        'read_file',
        { path: './test.txt' },
        mockExecute
      )).rejects.toThrow('INVALID_PARAMETER');

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should modify parameters for read_file on RESOURCE_NOT_FOUND', async () => {
      const mockExecute = vi.fn()
        .mockRejectedValueOnce(new Error('RESOURCE_NOT_FOUND'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(
        'read_file',
        { path: './test.txt', start_line: 1, end_line: 10 },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenLastCalledWith('read_file', {
        path: './test.txt',
        start_line: 1,
        end_line: 20
      });
    });

    it('should modify parameters for search_files on invalid regex', async () => {
      const mockExecute = vi.fn()
        .mockRejectedValueOnce(new Error('INVALID_PARAMETER'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(
        'search_files',
        { path: './', regex: '*.txt' },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenLastCalledWith('search_files', {
        path: './',
        regex: '.+\\.txt$'
      });
    });
  });

  describe('history management', () => {
    it('should maintain retry history', async () => {
      const mockExecute = vi.fn()
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockResolvedValue('success');

      await service.executeWithRetry(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      const history = service.getRetryHistory();
      expect(history).toHaveLength(1);
      expect(history[0].error).toBe('TIMEOUT');
      expect(history[0].toolName).toBe('read_file');
    });

    it('should clear history', async () => {
      const mockExecute = vi.fn().mockResolvedValue('success');

      await service.executeWithRetry(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      service.clearHistory();
      expect(service.getRetryHistory()).toHaveLength(0);
    });
  });
}); 