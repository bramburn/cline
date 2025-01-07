import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiRequestService } from '../ApiRequestService';
import { StreamController } from '../StreamController';

describe('ApiRequestService', () => {
  let apiRequestService: ApiRequestService;
  let streamController: StreamController;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    streamController = new StreamController();
    apiRequestService = new ApiRequestService(streamController);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('performRequest', () => {
    it('should perform a successful request', async () => {
      const mockResponse = { data: 'test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers({ 'Content-Type': 'application/json' })
      });

      const config = {
        url: 'https://api.test.com',
        method: 'GET'
      };

      const response = await apiRequestService.performRequest(config);

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/json');
    });

    it('should handle request errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const config = {
        url: 'https://api.test.com',
        method: 'GET'
      };

      await expect(apiRequestService.performRequest(config)).rejects.toThrow('HTTP error! status: 404');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      global.fetch = vi.fn().mockRejectedValue(networkError);

      const config = {
        url: 'https://api.test.com',
        method: 'GET'
      };

      await expect(apiRequestService.performRequest(config)).rejects.toThrow(networkError);
    });

    it('should handle request timeout', async () => {
      const abortError = new Error('The operation was aborted');
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const config = {
        url: 'https://api.test.com',
        method: 'GET',
        timeout: 100
      };

      await expect(apiRequestService.performRequest(config)).rejects.toThrow();
    });

    it('should update progress during request', async () => {
      const mockResponse = { data: 'test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers()
      });

      const progressUpdates: number[] = [];
      streamController.getProgressUpdates().subscribe(progress => {
        progressUpdates.push(progress.progress);
      });

      const config = {
        url: 'https://api.test.com',
        method: 'GET'
      };

      await apiRequestService.performRequest(config);

      expect(progressUpdates).toEqual([0, 50, 100]);
    });

    it('should handle request with body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        headers: new Headers()
      });

      const config = {
        url: 'https://api.test.com',
        method: 'POST',
        body: { test: 'data' }
      };

      await apiRequestService.performRequest(config);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ test: 'data' })
        })
      );
    });
  });
}); 