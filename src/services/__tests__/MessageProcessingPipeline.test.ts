import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { MessageProcessingPipeline, MessageTransformation, MessageValidation, ProcessingError } from '../MessageProcessingPipeline';
import { ClineMessage } from '../../shared/ExtensionMessage';

describe('MessageProcessingPipeline', () => {
  let pipeline: MessageProcessingPipeline;

  beforeEach(() => {
    pipeline = new MessageProcessingPipeline();
  });

  afterEach(() => {
    pipeline.dispose();
  });

  const createMessage = (content: string): ClineMessage => ({
    content,
    ts: Date.now(),
    role: 'user'
  });

  describe('Transformations', () => {
    it('should apply single transformation correctly', async () => {
      const transformation: MessageTransformation = {
        name: 'uppercase',
        transform: (msg) => ({ ...msg, content: msg.content.toUpperCase() })
      };

      pipeline.addTransformation(transformation);
      const message = createMessage('hello');
      const result = await firstValueFrom(pipeline.processMessage(message));

      expect(result.content).toBe('HELLO');
    });

    it('should apply multiple transformations in order', async () => {
      const transformation1: MessageTransformation = {
        name: 'uppercase',
        transform: (msg) => ({ ...msg, content: msg.content.toUpperCase() })
      };

      const transformation2: MessageTransformation = {
        name: 'addPrefix',
        transform: (msg) => ({ ...msg, content: `PREFIX_${msg.content}` })
      };

      pipeline.addTransformation(transformation1);
      pipeline.addTransformation(transformation2);

      const message = createMessage('hello');
      const result = await firstValueFrom(pipeline.processMessage(message));

      expect(result.content).toBe('PREFIX_HELLO');
    });

    it('should handle async transformations', async () => {
      const asyncTransformation: MessageTransformation = {
        name: 'asyncUppercase',
        transform: async (msg) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { ...msg, content: msg.content.toUpperCase() };
        }
      };

      pipeline.addTransformation(asyncTransformation);
      const message = createMessage('hello');
      const result = await firstValueFrom(pipeline.processMessage(message));

      expect(result.content).toBe('HELLO');
    });
  });

  describe('Validations', () => {
    it('should pass valid messages through pipeline', async () => {
      const validation: MessageValidation = {
        name: 'minLength',
        validate: (msg) => msg.content.length >= 3,
        errorMessage: 'Content too short'
      };

      pipeline.addValidation(validation);
      const message = createMessage('hello');
      const result = await firstValueFrom(pipeline.processMessage(message));

      expect(result).toEqual(message);
    });

    it('should reject invalid messages', async () => {
      const validation: MessageValidation = {
        name: 'minLength',
        validate: (msg) => msg.content.length >= 10,
        errorMessage: 'Content too short'
      };

      pipeline.addValidation(validation);
      const message = createMessage('hello');

      let error: ProcessingError | undefined;
      pipeline.getErrorStream().subscribe((err) => {
        error = err;
      });

      await expect(firstValueFrom(pipeline.processMessage(message)))
        .rejects.toThrow('Message validation failed');

      expect(error).toBeDefined();
      expect(error?.message).toBe('Content too short');
      expect(error?.stage).toBe('minLength');
      expect(error?.originalMessage).toEqual(message);
    });

    it('should handle async validations', async () => {
      const asyncValidation: MessageValidation = {
        name: 'asyncMinLength',
        validate: async (msg) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return msg.content.length >= 3;
        },
        errorMessage: 'Content too short'
      };

      pipeline.addValidation(asyncValidation);
      const message = createMessage('hi');

      let error: ProcessingError | undefined;
      pipeline.getErrorStream().subscribe((err) => {
        error = err;
      });

      await expect(firstValueFrom(pipeline.processMessage(message)))
        .rejects.toThrow('Message validation failed');

      expect(error).toBeDefined();
      expect(error?.message).toBe('Content too short');
    });
  });

  describe('Built-in Transformations', () => {
    it('should trim content correctly', async () => {
      pipeline.addTransformation(MessageProcessingPipeline.trimContent);
      const message = createMessage('  hello world  ');
      const result = await firstValueFrom(pipeline.processMessage(message));

      expect(result.content).toBe('hello world');
    });

    it('should remove excessive whitespace', async () => {
      pipeline.addTransformation(MessageProcessingPipeline.removeExcessiveWhitespace);
      const message = createMessage('hello    world   test');
      const result = await firstValueFrom(pipeline.processMessage(message));

      expect(result.content).toBe('hello world test');
    });
  });

  describe('Built-in Validations', () => {
    it('should validate non-empty content', async () => {
      pipeline.addValidation(MessageProcessingPipeline.nonEmptyContent);
      const message = createMessage('   ');

      await expect(firstValueFrom(pipeline.processMessage(message)))
        .rejects.toThrow('Message validation failed');
    });

    it('should validate maximum length', async () => {
      pipeline.addValidation(MessageProcessingPipeline.maxLength(5));
      const message = createMessage('too long');

      await expect(firstValueFrom(pipeline.processMessage(message)))
        .rejects.toThrow('Message validation failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle transformation errors', async () => {
      const failingTransformation: MessageTransformation = {
        name: 'failing',
        transform: () => {
          throw new Error('Transformation failed');
        }
      };

      pipeline.addTransformation(failingTransformation);
      const message = createMessage('hello');

      let error: ProcessingError | undefined;
      pipeline.getErrorStream().subscribe((err) => {
        error = err;
      });

      await expect(firstValueFrom(pipeline.processMessage(message)))
        .rejects.toThrow();

      expect(error).toBeDefined();
      expect(error?.message).toContain('Transformation failed');
      expect(error?.stage).toBe('failing');
    });

    it('should handle validation errors', async () => {
      const failingValidation: MessageValidation = {
        name: 'failing',
        validate: () => {
          throw new Error('Validation failed');
        },
        errorMessage: 'Should not see this'
      };

      pipeline.addValidation(failingValidation);
      const message = createMessage('hello');

      let error: ProcessingError | undefined;
      pipeline.getErrorStream().subscribe((err) => {
        error = err;
      });

      await expect(firstValueFrom(pipeline.processMessage(message)))
        .rejects.toThrow();

      expect(error).toBeDefined();
      expect(error?.message).toContain('Validation failed');
      expect(error?.stage).toBe('failing');
    });
  });
}); 