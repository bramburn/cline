import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReactiveConversationHistoryService } from '../ReactiveConversationHistoryService';
import { ClineMessage } from '../../shared/ExtensionMessage';
import { firstValueFrom } from 'rxjs';

const createMessage = (text: string, ts?: number): ClineMessage => ({
  ts: ts || Date.now(),
  type: 'say',
  text: text,
  content: text
});

describe('ReactiveConversationHistoryService', () => {
  let service: ReactiveConversationHistoryService;

  beforeEach(() => {
    service = new ReactiveConversationHistoryService();
  });

  afterEach(() => {
    service.dispose();
  });

  it('should add messages', async () => {
    const message = createMessage('Test message');
    service.addMessage(message);

    const messages = await firstValueFrom(service.getMessages());
    expect(messages).toBeDefined();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(message);
  });

  it('should update messages', async () => {
    const originalMessage = createMessage('Original message');
    service.addMessage(originalMessage);

    const updatedMessage = { ...originalMessage, text: 'Updated message' };
    service.updateMessage(updatedMessage);

    const messages = await firstValueFrom(service.getMessages());
    expect(messages).toBeDefined();
    expect(messages[0].text).toBe('Updated message');
  });

  it('should delete messages', async () => {
    const message1 = createMessage('Message 1');
    const message2 = createMessage('Message 2');
    
    service.addMessage(message1);
    service.addMessage(message2);

    service.deleteMessage(message1);

    const messages = await firstValueFrom(service.getMessages());
    expect(messages).toBeDefined();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(message2);
  });

  it('should limit maximum number of messages', async () => {
    const messages = Array.from({ length: 150 }, (_, i) => 
      createMessage(`Message ${i}`, Date.now() + i)
    );

    messages.forEach(msg => service.addMessage(msg));

    const storedMessages = await firstValueFrom(service.getMessages());
    expect(storedMessages).toBeDefined();
    expect(storedMessages).toHaveLength(100);
    expect(storedMessages[0].text).toBe('Message 50');
  });

  it('should set processing state', async () => {
    service.setProcessing(true);

    const state = await firstValueFrom(service.getState());
    expect(state).toBeDefined();
    expect(state.isProcessing).toBe(true);
  });

  it('should set error state', async () => {
    service.setError('Test error');

    const state = await firstValueFrom(service.getState());
    expect(state).toBeDefined();
    expect(state.error).toBe('Test error');
  });
}); 