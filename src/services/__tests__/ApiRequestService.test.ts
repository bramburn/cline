import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ApiRequestService } from '../ApiRequestService';
import { StreamController } from '../StreamController';
import { firstValueFrom, of } from 'rxjs';
import { ApiStreamChunk } from '../../api/transform/stream';

describe('ApiRequestService', () => {
  let apiRequestService: ApiRequestService;
  let streamController: StreamController;

  beforeEach(() => {
    streamController = new StreamController();
    apiRequestService = new ApiRequestService(streamController);
  });

  afterEach(() => {
    streamController.dispose();
  });

  it('should perform an API request successfully', async () => {
    const mockApi = {
      createMessage: async function* () {
        yield { type: 'text', text: 'Hello' };
        yield { type: 'text', text: 'World' };
        yield { type: 'usage', inputTokens: 10, outputTokens: 5 };
      }
    };

    const options = {
      systemPrompt: 'Test prompt',
      conversationHistory: [],
      previousApiReqIndex: 0
    };

    const chunks: ApiStreamChunk[] = [];
    for await (const chunk of apiRequestService.performApiRequest(mockApi, options)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual({ type: 'text', text: 'Hello' });
    expect(chunks[1]).toEqual({ type: 'text', text: 'World' });
    expect(chunks[2]).toEqual({ type: 'usage', inputTokens: 10, outputTokens: 5 });
  });

  it('should handle API request errors', async () => {
    const mockApi = {
      createMessage: async function* () {
        throw new Error('API Error');
      }
    };

    const options = {
      systemPrompt: 'Test prompt',
      conversationHistory: [],
      previousApiReqIndex: 0
    };

    await expect(
      firstValueFrom(apiRequestService.performApiRequest(mockApi, options))
    ).rejects.toThrow('API Error');
  });

  it('should update stream controller progress', async () => {
    const mockApi = {
      createMessage: async function* () {
        yield { type: 'text', text: 'Hello' };
        yield { type: 'text', text: 'World' };
      }
    };

    const options = {
      systemPrompt: 'Test prompt',
      conversationHistory: [],
      previousApiReqIndex: 0
    };

    await firstValueFrom(apiRequestService.performApiRequest(mockApi, options));

    const progress = streamController.getCurrentProgress();
    expect(progress.status).toBe('completed');
    expect(progress.processed).toBe(2);
  });

  it('should support cancellation', async () => {
    const mockApi = {
      createMessage: async function* () {
        yield { type: 'text', text: 'Hello' };
        yield { type: 'text', text: 'World' };
      }
    };

    const options = {
      systemPrompt: 'Test prompt',
      conversationHistory: [],
      previousApiReqIndex: 0,
      abort$: of(true)
    };

    const chunks: ApiStreamChunk[] = [];
    for await (const chunk of apiRequestService.performApiRequest(mockApi, options)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(0);
  });
}); 