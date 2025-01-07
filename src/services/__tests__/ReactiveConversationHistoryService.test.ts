import { describe, it, expect, beforeEach } from 'vitest';
import { ReactiveConversationHistoryService } from '../ReactiveConversationHistoryService';
import { firstValueFrom } from 'rxjs';
import { ClineMessage } from '../../shared/ExtensionMessage';

describe('ReactiveConversationHistoryService', () => {
  let service: ReactiveConversationHistoryService;

  beforeEach(() => {
    service = new ReactiveConversationHistoryService({ taskDir: './test-tasks' });
  });

  it('should add messages', async () => {
    const message: ClineMessage = {
      ts: Date.now(),
      role: 'user',
      content: 'Test message'
    };

    await service.addMessage(message);
    const messages = await firstValueFrom(service.getMessages());
    
    expect(messages).toBeDefined();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(message);
  });

  it('should update messages', async () => {
    const message: ClineMessage = {
      ts: Date.now(),
      role: 'user',
      content: 'Original message'
    };

    await service.addMessage(message);

    const updatedMessage = {
      ...message,
      content: 'Updated message'
    };

    service.updateMessage(updatedMessage);
    const messages = await firstValueFrom(service.getMessages());
    
    expect(messages).toBeDefined();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(updatedMessage);
  });

  it('should delete messages', async () => {
    const message1: ClineMessage = {
      ts: Date.now(),
      role: 'user',
      content: 'Message 1'
    };

    const message2: ClineMessage = {
      ts: Date.now() + 1,
      role: 'user',
      content: 'Message 2'
    };

    await service.addMessage(message1);
    await service.addMessage(message2);

    service.deleteMessage(message1.ts);
    const messages = await firstValueFrom(service.getMessages());
    
    expect(messages).toBeDefined();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(message2);
  });

  it('should limit maximum number of messages', async () => {
    const maxMessages = 100;
    for (let i = 0; i < maxMessages + 10; i++) {
      await service.addMessage({
        ts: Date.now() + i,
        role: 'user',
        content: `Message ${i}`
      });
    }

    const messages = await firstValueFrom(service.getMessages());
    expect(messages).toHaveLength(maxMessages);
  });

  it('should set processing state', async () => {
    service.setProcessing(true);
    const state = service.getCurrentState();
    expect(state.isProcessing).toBe(true);

    service.setProcessing(false);
    const updatedState = service.getCurrentState();
    expect(updatedState.isProcessing).toBe(false);
  });

  it('should set error state', async () => {
    const errorMessage = 'Test error';
    service.setError(errorMessage);
    const state = service.getCurrentState();
    expect(state.error).toBe(errorMessage);
  });
}); 