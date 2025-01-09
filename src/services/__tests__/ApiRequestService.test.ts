import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiRequestService } from '../ApiRequestService';
import { StreamController } from '../StreamController';
import { ApiRequestMetrics } from '../ApiRequestMetrics';
import { NotificationService } from '../NotificationService';
import { TokenTrackingService } from '../TokenTrackingService';
import { StreamHandlerService } from '../StreamHandlerService';
import { ApiRequestConfig, ApiResponse } from '../../types/ApiRequestConfig';

// Mock dependencies
const mockStreamController = new StreamController();
const mockTokenTracker = new TokenTrackingService();
const mockStreamHandler = new StreamHandlerService();
const mockMetrics = new ApiRequestMetrics();
const mockNotificationService = new NotificationService();

// Mock Response with bytes method
class MockResponse extends Response {
  constructor(body?: BodyInit | null, init?: ResponseInit & { bytes?: ArrayBuffer | null }) {
    super(body, init);
    this._bytes = init?.bytes ?? null;
  }

  private _bytes: ArrayBuffer | null;

  bytes(): Promise<Uint8Array> {
    if (this._bytes) {
      return Promise.resolve(new Uint8Array(this._bytes));
    }
    return Promise.resolve(new Uint8Array());
  }
}

describe('ApiRequestService', () => {
  let apiRequestService: ApiRequestService;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    apiRequestService = new ApiRequestService(
      mockStreamController,
      mockTokenTracker,
      mockStreamHandler,
      mockMetrics,
      mockNotificationService
    );
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('performRequest', () => {
    it('should perform a successful request', async () => {
      const mockResponse = new MockResponse(JSON.stringify({ data: 'test' }), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        bytes: new ArrayBuffer(0)
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config: ApiRequestConfig = {
        url: 'https://api.test.com',
        method: 'GET'
      };

      console.log('Test: should perform a successful request - Start');
      console.log('Input config:', config);
      console.log('Expected response:', { data: { data: 'test' }, status: 200, headers: { 'content-type': 'application/json' } });

      const response = await apiRequestService.performRequest(config);

      console.log('Actual response:', response);
      console.log('Test: should perform a successful request - End');

      expect(response.data).toEqual({ data: 'test' });
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/json');
    });

    it('should handle request errors', async () => {
      const mockResponse = new MockResponse('', {
        status: 404,
        statusText: 'Not Found',
        bytes: new ArrayBuffer(0)
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config: ApiRequestConfig = {
        url: 'https://api.test.com',
        method: 'GET'
      };

      console.log('Test: should handle request errors - Start');
      console.log('Input config:', config);
      console.log('Expected error:', 'HTTP error! status: 404');

      await expect(apiRequestService.performRequest(config)).rejects.toThrow('HTTP error! status: 404');

      console.log('Test: should handle request errors - End');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      const config: ApiRequestConfig = {
        url: 'https://api.test.com',
        method: 'GET'
      };

      console.log('Test: should handle network errors - Start');
      console.log('Input config:', config);
      console.log('Expected error:', networkError.message);

      await expect(apiRequestService.performRequest(config)).rejects.toThrow(networkError.message);

      console.log('Test: should handle network errors - End');
    });

    it('should handle request timeout', async () => {
      const abortController = new AbortController();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          abortController.abort();
          reject(new Error('The operation was aborted'));
        }, 100);
      });

      const config: ApiRequestConfig = {
        url: 'https://api.test.com',
        method: 'GET',
        timeout: 100
      };

      await expect(
        Promise.race([
          apiRequestService.performRequest(config),
          timeoutPromise
        ])
      ).rejects.toThrow('The operation was aborted');
    });

    it('should update progress during request', async () => {
      const mockResponse = new MockResponse(JSON.stringify({ data: 'test' }), {
        status: 200,
        statusText: 'OK',
        bytes: new ArrayBuffer(0)
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const progressUpdates: number[] = [];
      const uniqueProgressUpdates = new Set<number>();
      mockStreamController.getProgressUpdates().subscribe(progress => {
        if (!uniqueProgressUpdates.has(progress.progress)) {
          uniqueProgressUpdates.add(progress.progress);
          progressUpdates.push(progress.progress);
        }
      });

      const config: ApiRequestConfig = {
        url: 'https://api.test.com',
        method: 'GET'
      };

      console.log('Test: should update progress during request - Start');
      console.log('Input config:', config);
      console.log('Expected progress updates:', [0, 50, 100]);

      await apiRequestService.performRequest(config);

      console.log('Actual progress updates:', progressUpdates);
      console.log('Test: should update progress during request - End');

      expect(progressUpdates).toEqual([0, 50, 100]);
    });

    it('should handle request with body', async () => {
      const mockResponse = new MockResponse('{}', {
        status: 200,
        statusText: 'OK',
        bytes: new ArrayBuffer(0)
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config: ApiRequestConfig = {
        url: 'https://api.test.com',
        method: 'POST',
        body: { test: 'data' }
      };

      console.log('Test: should handle request with body - Start');
      console.log('Input config:', config);
      console.log('Expected fetch call:', {
        url: 'https://api.test.com',
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      });

      await apiRequestService.performRequest(config);

      console.log('Actual fetch call:', global.fetch.mock.calls[0]);
      console.log('Test: should handle request with body - End');

      expect((global.fetch as jest.Mock)).toHaveBeenCalledWith(
        'https://api.test.com',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ test: 'data' })
        })
      );
    });

    it('should handle non-existent request IDs gracefully', async () => {
      const mockResponse = new MockResponse(JSON.stringify({ data: 'test' }), {
        status: 200,
        statusText: 'OK',
        headers: {},
        bytes: new ArrayBuffer(0)
      });

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config: ApiRequestConfig = {
        url: 'https://api.test.com',
        method: 'GET'
      };

      console.log('Test: should handle non-existent request IDs gracefully - Start');
      console.log('Input config:', config);
      console.log('Expected response:', { data: { data: 'test' }, status: 200, headers: {} });

      const response = await apiRequestService.performRequest(config);

      console.log('Actual response:', response);
      console.log('Test: should handle non-existent request IDs gracefully - End');

      expect(response.data).toEqual({ data: 'test' });
      expect(response.status).toBe(200);
      expect(response.headers).toEqual({});
    });
  });
});
