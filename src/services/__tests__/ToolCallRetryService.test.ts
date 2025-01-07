import { ToolCallRetryService } from '../ToolCallRetryService';

describe('ToolCallRetryService', () => {
  let service: ToolCallRetryService;

  beforeEach(() => {
    service = new ToolCallRetryService();
  });

  describe('executeWithRetry', () => {
    it('should successfully execute a tool call without retries', async () => {
      const mockExecute = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithRetry(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(1);
      
      const history = service.getRetryHistory();
      expect(history).toHaveLength(1);
      expect(history[0].outcome.success).toBe(true);
    });

    it('should retry on failure and succeed', async () => {
      const mockExecute = jest.fn()
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
      
      const history = service.getRetryHistory();
      expect(history).toHaveLength(3);
      expect(history[0].outcome.success).toBe(false);
      expect(history[1].outcome.success).toBe(false);
      expect(history[2].outcome.success).toBe(true);
    });

    it('should not retry on invalid parameter errors', async () => {
      const mockExecute = jest.fn()
        .mockRejectedValue(new Error('INVALID_PARAMETER'));

      await expect(service.executeWithRetry(
        'read_file',
        { path: './test.txt' },
        mockExecute
      )).rejects.toThrow('INVALID_PARAMETER');

      expect(mockExecute).toHaveBeenCalledTimes(1);
      
      const history = service.getRetryHistory();
      expect(history).toHaveLength(1);
      expect(history[0].outcome.success).toBe(false);
    });

    it('should modify parameters for read_file on RESOURCE_NOT_FOUND', async () => {
      const mockExecute = jest.fn()
        .mockRejectedValueOnce(new Error('RESOURCE_NOT_FOUND'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(
        'read_file',
        { path: 'dir/test.txt' },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenLastCalledWith({ path: 'dir' });
      
      const history = service.getRetryHistory();
      expect(history).toHaveLength(2);
      expect(history[0].parameters.path).toBe('dir/test.txt');
      expect(history[1].parameters.path).toBe('dir');
    });

    it('should modify parameters for search_files on invalid regex', async () => {
      const mockExecute = jest.fn()
        .mockRejectedValueOnce(new Error('INVALID_PARAMETER'))
        .mockResolvedValue('success');

      const result = await service.executeWithRetry(
        'search_files',
        { path: './', regex: '*.txt' },
        mockExecute
      );

      expect(result).toBe('success');
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenLastCalledWith({ 
        path: './', 
        regex: '\\*\\.txt'
      });
      
      const history = service.getRetryHistory();
      expect(history).toHaveLength(2);
      expect(history[0].parameters.regex).toBe('*.txt');
      expect(history[1].parameters.regex).toBe('\\*\\.txt');
    });
  });

  describe('history management', () => {
    it('should maintain retry history', async () => {
      const mockExecute = jest.fn()
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockResolvedValue('success');

      await service.executeWithRetry(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      const history = service.getRetryHistory();
      expect(history).toHaveLength(2);
      expect(history[0].toolName).toBe('read_file');
      expect(history[0].outcome.success).toBe(false);
      expect(history[1].outcome.success).toBe(true);
    });

    it('should clear history', async () => {
      const mockExecute = jest.fn().mockResolvedValue('success');

      await service.executeWithRetry(
        'read_file',
        { path: './test.txt' },
        mockExecute
      );

      expect(service.getRetryHistory()).toHaveLength(1);
      
      service.clearHistory();
      expect(service.getRetryHistory()).toHaveLength(0);
    });
  });
}); 