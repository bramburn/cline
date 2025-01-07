import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ConversationHistoryService } from '../ConversationHistoryService';
import { TestScheduler } from 'rxjs/testing';
import * as fs from 'fs/promises';
import { Anthropic } from '@anthropic-ai/sdk';

describe('ConversationHistoryService', () => {
  let service: ConversationHistoryService;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
    service = new ConversationHistoryService('/test/dir');
  });

  afterEach(() => {
    service.dispose();
    vi.restoreAllMocks();
  });

  it('should add message to history', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const message: Anthropic.MessageParam = {
        role: 'user' as const,
        content: 'test message'
      };
      const expected = '(a|)';

      const result$ = service.addMessage(message);

      expectObservable(result$).toBe(expected, { a: undefined });
      expect(service.getCurrentHistory()).toContain(message);
    });
  });

  it('should handle errors gracefully', () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const message: Anthropic.MessageParam = {
        role: 'user' as const,
        content: 'test message'
      };
      const expected = '(a|)';

      // Mock fs.writeFile to throw an error
      vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('Test error'));

      const result$ = service.addMessage(message);

      expectObservable(result$).toBe(expected, { a: undefined });
      expect(service.getCurrentHistory()).toContain(message);
    });
  });

  it('should persist history to file', async () => {
    const message: Anthropic.MessageParam = {
      role: 'user' as const,
      content: 'test message'
    };

    const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

    await new Promise<void>((resolve) => {
      service.addMessage(message).subscribe(() => {
        resolve();
      });
    });

    expect(writeFileSpy).toHaveBeenCalled();
    expect(JSON.parse(writeFileSpy.mock.calls[0][1] as string)).toContainEqual(message);
  });
}); 