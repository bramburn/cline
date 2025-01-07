import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiRequestService } from '../ApiRequestService';
import { StreamController } from '../StreamController';
import { firstValueFrom } from 'rxjs';

describe('ApiRequestService', () => {
  let service: ApiRequestService;
  let streamController: StreamController;

  beforeEach(() => {
    streamController = new StreamController();
    service = new ApiRequestService(streamController);
  });

  it('should perform an API request successfully', async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ value: new TextEncoder().encode('Hello'), done: false })
            .mockResolvedValueOnce({ value: new TextEncoder().encode('World'), done: false })
            .mockResolvedValueOnce({ value: undefined, done: true })
        })
      }
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const chunks: any[] = [];
    await service.performRequest('test-url', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' })
    }, (chunk) => {
      chunks.push(chunk);
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe('Hello');
    expect(chunks[1]).toBe('World');
  });

  it('should handle API request errors', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(service.performRequest('test-url', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' })
    }, () => {})).rejects.toThrow('API Error: 500 Internal Server Error');
  });

  it('should update stream controller progress', async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ value: new TextEncoder().encode('Hello'), done: false })
            .mockResolvedValueOnce({ value: undefined, done: true })
        })
      }
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const updateProgressSpy = vi.spyOn(streamController, 'updateProgress');
    await service.performRequest('test-url', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' })
    }, () => {});

    expect(updateProgressSpy).toHaveBeenCalled();
  });

  it('should support cancellation', async () => {
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ value: new TextEncoder().encode('data'), done: false }),
          cancel: vi.fn()
        })
      }
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const abortController = new AbortController();
    const requestPromise = service.performRequest('test-url', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
      signal: abortController.signal
    }, () => {});

    abortController.abort();

    await expect(requestPromise).rejects.toThrow('Request aborted');
  });
}); 