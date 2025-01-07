import { MessageProcessingPipeline } from '../MessageProcessingPipeline';
import { Message, MessageProcessingResult } from '../../types/MessageTypes';
import { firstValueFrom } from 'rxjs';

describe('MessageProcessingPipeline', () => {
  let pipeline: MessageProcessingPipeline;

  const createMessage = (content: string): Message => ({
    type: 'user',
    content,
    id: 'test-id',
    timestamp: Date.now()
  });

  beforeEach(() => {
    pipeline = new MessageProcessingPipeline();
  });

  afterEach(() => {
    pipeline.dispose();
  });

  describe('Validation', () => {
    it('should validate messages with custom validators', async () => {
      pipeline.addValidation({
        name: 'maxLength',
        validate: (msg) => (msg.content?.length || 0) <= 10,
        errorMessage: 'Message too long'
      });

      const shortMessage = createMessage('short');
      const longMessage = createMessage('this message is too long');

      const shortProcessedMessage = await firstValueFrom(pipeline.processMessage(shortMessage));
      expect(shortProcessedMessage.success).toBe(true);
      expect(shortProcessedMessage.data?.content).toBe('short');

      const longProcessedMessage = await firstValueFrom(pipeline.processMessage(longMessage));
      expect(longProcessedMessage.success).toBe(false);
      expect(longProcessedMessage.error?.message).toBe('Message too long');
    });

    it('should handle built-in validations', async () => {
      pipeline.addValidation(MessageProcessingPipeline.nonEmptyContent);
      pipeline.addValidation(MessageProcessingPipeline.maxLength(10));

      const validMessage = createMessage('valid');
      const emptyMessage = createMessage('');
      const longMessage = createMessage('too long message');

      const validProcessedMessage = await firstValueFrom(pipeline.processMessage(validMessage));
      expect(validProcessedMessage.success).toBe(true);

      const emptyProcessedMessage = await firstValueFrom(pipeline.processMessage(emptyMessage));
      expect(emptyProcessedMessage.success).toBe(false);
      expect(emptyProcessedMessage.error?.message).toBe('Message content cannot be empty');

      const longProcessedMessage = await firstValueFrom(pipeline.processMessage(longMessage));
      expect(longProcessedMessage.success).toBe(false);
      expect(longProcessedMessage.error?.message).toContain('must be no longer than');
    });

    it('should handle multiple validations in sequence', async () => {
      pipeline.addValidation(MessageProcessingPipeline.nonEmptyContent);
      pipeline.addValidation({
        name: 'noSpecialChars',
        validate: (msg) => !/[!@#$%^&*(),.?":{}|<>]/.test(msg.content || ''),
        errorMessage: 'No special characters allowed'
      });

      const validMessage = createMessage('Hello World');
      const invalidMessage = createMessage('Hello@World!');

      const processedMessage = await firstValueFrom(pipeline.processMessage(validMessage));
      expect(processedMessage.success).toBe(true);

      const invalidProcessedMessage = await firstValueFrom(pipeline.processMessage(invalidMessage));
      expect(invalidProcessedMessage.success).toBe(false);
      expect(invalidProcessedMessage.error?.message).toBe('No special characters allowed');
    });
  });

  describe('Transformation', () => {
    it('should handle built-in transformations', async () => {
      pipeline.addTransformation(MessageProcessingPipeline.trimContent);
      pipeline.addTransformation(MessageProcessingPipeline.removeExcessiveWhitespace);

      const message = createMessage('  hello   world  ');
      const processedMessage = await firstValueFrom(pipeline.processMessage(message));

      expect(processedMessage.success).toBe(true);
      expect(processedMessage.data?.content).toBe('hello world');
    });

    it('should handle custom transformations', async () => {
      pipeline.addTransformation({
        name: 'toUpperCase',
        transform: (msg) => ({
          ...msg,
          content: msg.content?.toUpperCase() || ''
        })
      });

      const message = createMessage('hello world');
      const processedMessage = await firstValueFrom(pipeline.processMessage(message));

      expect(processedMessage.success).toBe(true);
      expect(processedMessage.data?.content).toBe('HELLO WORLD');
    });

    it('should handle multiple transformations in sequence', async () => {
      pipeline.addTransformation(MessageProcessingPipeline.trimContent);
      pipeline.addTransformation({
        name: 'addPrefix',
        transform: (msg) => ({
          ...msg,
          content: `prefix: ${msg.content}`
        })
      });

      const message = createMessage('  hello  ');
      const processedMessage = await firstValueFrom(pipeline.processMessage(message));

      expect(processedMessage.success).toBe(true);
      expect(processedMessage.data?.content).toBe('prefix: hello');
    });
  });

  describe('Error Handling', () => {
    it('should handle transformation errors', async () => {
      pipeline.addTransformation({
        name: 'failingTransform',
        transform: () => {
          throw new Error('Transform error');
        }
      });

      const message = createMessage('test');
      const processedMessage = await firstValueFrom(pipeline.processMessage(message));
      
      expect(processedMessage.success).toBe(false);
      expect(processedMessage.error?.message).toContain('Transform error');
    });
  });
}); 