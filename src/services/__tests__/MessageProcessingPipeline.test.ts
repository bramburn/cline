import { MessageProcessingPipeline } from '../MessageProcessingPipeline';
import { ClineMessage } from '../../shared/ExtensionMessage';
import { firstValueFrom } from 'rxjs';

describe('MessageProcessingPipeline', () => {
  let pipeline: MessageProcessingPipeline;

  const createMessage = (content: string): ClineMessage => ({
    type: 'user',
    content,
    id: 'test-id',
    timestamp: new Date().toISOString()
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
      expect(shortProcessedMessage).toBeDefined();
      expect(shortProcessedMessage.content).toBe('short');

      await expect(firstValueFrom(pipeline.processMessage(longMessage)))
        .rejects.toThrow('Message validation failed');
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
      expect(processedMessage).toBeDefined();

      await expect(firstValueFrom(pipeline.processMessage(invalidMessage)))
        .rejects.toThrow('Message validation failed');
    });
  });

  describe('Transformation', () => {
    it('should handle built-in transformations', async () => {
      pipeline.addTransformation(MessageProcessingPipeline.trimContent);
      pipeline.addTransformation(MessageProcessingPipeline.removeExcessiveWhitespace);

      const message = createMessage('  hello   world  ');
      const processedMessage = await firstValueFrom(pipeline.processMessage(message));

      expect(processedMessage.content).toBe('hello world');
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

      expect(processedMessage.content).toBe('HELLO WORLD');
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

      expect(processedMessage.content).toBe('prefix: hello');
    });
  });

  describe('Error Handling', () => {
    it('should emit errors through error stream', (done) => {
      pipeline.addValidation({
        name: 'alwaysFail',
        validate: () => false,
        errorMessage: 'Test error'
      });

      const errorSpy = jest.fn();
      pipeline.getErrorStream().subscribe(errorSpy);

      const message = createMessage('test');
      firstValueFrom(pipeline.processMessage(message))
        .catch(() => {
          expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Test error',
            stage: 'alwaysFail'
          }));
          done();
        });
    });

    it('should handle transformation errors', async () => {
      pipeline.addTransformation({
        name: 'failingTransform',
        transform: () => {
          throw new Error('Transform error');
        }
      });

      const message = createMessage('test');
      await expect(firstValueFrom(pipeline.processMessage(message)))
        .rejects.toThrow('Transform error');
    });
  });
}); 