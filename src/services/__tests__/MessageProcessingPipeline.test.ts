import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageProcessingPipeline } from '../MessageProcessingPipeline';
import { ClineMessage } from '../../shared/ExtensionMessage';
import { firstValueFrom } from 'rxjs';

const createMessage = (text: string): ClineMessage => ({
  ts: Date.now(),
  type: 'say',
  text: text,
  content: text
});

describe('MessageProcessingPipeline', () => {
  let pipeline: MessageProcessingPipeline;

  beforeEach(() => {
    pipeline = new MessageProcessingPipeline();
  });

  afterEach(() => {
    pipeline.dispose();
  });

  it('should apply single transformation', async () => {
    pipeline.addTransformation({
      name: 'uppercase',
      transform: (msg) => ({
        ...msg,
        content: msg.content?.toUpperCase() || ''
      })
    });

    const message = createMessage('hello world');
    const processedMessage = await firstValueFrom(pipeline.processMessage(message));

    expect(processedMessage.content).toBe('HELLO WORLD');
  });

  it('should apply multiple transformations', async () => {
    pipeline.addTransformation({
      name: 'uppercase',
      transform: (msg) => ({
        ...msg,
        content: msg.content?.toUpperCase() || ''
      })
    });

    pipeline.addTransformation({
      name: 'addPrefix',
      transform: (msg) => ({
        ...msg,
        content: `Transformed: ${msg.content}`
      })
    });

    const message = createMessage('hello world');
    const processedMessage = await firstValueFrom(pipeline.processMessage(message));

    expect(processedMessage.content).toBe('Transformed: HELLO WORLD');
  });

  it('should validate messages', async () => {
    pipeline.addValidation({
      name: 'maxLength',
      validate: (msg) => (msg.content?.length || 0) <= 10,
      errorMessage: 'Message too long'
    });

    const shortMessage = createMessage('short');
    const longMessage = createMessage('this message is too long');

    const shortProcessedMessage = await firstValueFrom(pipeline.processMessage(shortMessage));
    expect(shortProcessedMessage).toBeDefined();

    await expect(firstValueFrom(pipeline.processMessage(longMessage)))
      .rejects.toThrow('Message validation failed');
  });

  it('should handle built-in transformations', async () => {
    pipeline.addTransformation(MessageProcessingPipeline.trimContent);
    pipeline.addTransformation(MessageProcessingPipeline.removeExcessiveWhitespace);

    const message = createMessage('  hello   world  ');
    const processedMessage = await firstValueFrom(pipeline.processMessage(message));

    expect(processedMessage.content).toBe('hello world');
  });

  it('should handle built-in validations', async () => {
    pipeline.addValidation(MessageProcessingPipeline.nonEmptyContent);
    pipeline.addValidation(MessageProcessingPipeline.maxLength(10));

    const validMessage = createMessage('valid');
    const emptyMessage = createMessage('');
    const longMessage = createMessage('too long message');

    const validProcessedMessage = await firstValueFrom(pipeline.processMessage(validMessage));
    expect(validProcessedMessage).toBeDefined();

    await expect(firstValueFrom(pipeline.processMessage(emptyMessage)))
      .rejects.toThrow('Message validation failed');

    await expect(firstValueFrom(pipeline.processMessage(longMessage)))
      .rejects.toThrow('Message validation failed');
  });

  it('should capture processing errors', async () => {
    const errorSubject = pipeline.getErrorStream();
    const errorPromise = new Promise<void>((resolve, reject) => {
      const subscription = errorSubject.subscribe({
        next: (error) => {
          expect(error.stage).toBe('maxLength');
          expect(error.message).toBe('Message content cannot exceed 10 characters');
          subscription.unsubscribe();
          resolve();
        },
        error: reject
      });
    });

    pipeline.addValidation({
      name: 'maxLength',
      validate: (msg) => (msg.content?.length || 0) <= 10,
      errorMessage: 'Message content cannot exceed 10 characters'
    });

    await expect(firstValueFrom(pipeline.processMessage(createMessage('this message is too long'))))
      .rejects.toThrow('Message validation failed');

    await errorPromise;
  });
}); 