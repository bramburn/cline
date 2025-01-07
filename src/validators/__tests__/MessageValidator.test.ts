import { describe, it, expect, beforeEach } from 'vitest';
import { MessageValidator } from '../MessageValidator';
import { Message, ValidationError } from '../../types/MessageTypes';

describe('MessageValidator', () => {
  let validator: MessageValidator;

  beforeEach(() => {
    validator = new MessageValidator();
  });

  const createValidMessage = (): Message => ({
    id: '123',
    type: 'user',
    content: 'Test message',
    timestamp: Date.now()
  });

  describe('Required Fields Validation', () => {
    it('should validate a message with all required fields', () => {
      const message = createValidMessage();
      expect(() => validator.validate(message)).not.toThrow();
    });

    it('should throw error for missing id', () => {
      const message = createValidMessage();
      delete (message as any).id;
      expect(() => validator.validate(message)).toThrow(ValidationError);
      expect(() => validator.validate(message)).toThrow('Missing required field: id');
    });

    it('should throw error for null field', () => {
      const message = createValidMessage();
      (message as any).content = null;
      expect(() => validator.validate(message)).toThrow(ValidationError);
      expect(() => validator.validate(message)).toThrow('Required field cannot be null or undefined: content');
    });
  });

  describe('Content Length Validation', () => {
    it('should validate message with content within length limit', () => {
      const message = createValidMessage();
      expect(() => validator.validate(message)).not.toThrow();
    });

    it('should throw error for content exceeding max length', () => {
      const message = createValidMessage();
      message.content = 'a'.repeat(11000);
      expect(() => validator.validate(message)).toThrow(ValidationError);
      expect(() => validator.validate(message)).toThrow('Content length exceeds maximum allowed length');
    });
  });

  describe('Message Type Validation', () => {
    it('should validate allowed message types', () => {
      const types = ['user', 'assistant', 'system'] as const;
      types.forEach(type => {
        const message = { ...createValidMessage(), type };
        expect(() => validator.validate(message)).not.toThrow();
      });
    });

    it('should throw error for invalid message type', () => {
      const message = createValidMessage();
      (message as any).type = 'invalid';
      expect(() => validator.validate(message)).toThrow(ValidationError);
      expect(() => validator.validate(message)).toThrow('Invalid message type');
    });
  });

  describe('Timestamp Validation', () => {
    it('should validate message with current timestamp', () => {
      const message = createValidMessage();
      expect(() => validator.validate(message)).not.toThrow();
    });

    it('should throw error for future timestamp', () => {
      const message = createValidMessage();
      message.timestamp = Date.now() + 10000;
      expect(() => validator.validate(message)).toThrow(ValidationError);
      expect(() => validator.validate(message)).toThrow('Timestamp cannot be in the future');
    });

    it('should throw error for negative timestamp', () => {
      const message = createValidMessage();
      message.timestamp = -1;
      expect(() => validator.validate(message)).toThrow(ValidationError);
      expect(() => validator.validate(message)).toThrow('Timestamp cannot be negative');
    });

    it('should throw error for invalid timestamp', () => {
      const message = createValidMessage();
      message.timestamp = NaN;
      expect(() => validator.validate(message)).toThrow(ValidationError);
      expect(() => validator.validate(message)).toThrow('Timestamp must be a valid number');
    });
  });

  describe('Rules Management', () => {
    it('should allow updating validation rules', () => {
      validator.updateRules({ maxContentLength: 5 });
      const message = createValidMessage();
      message.content = '123456';
      expect(() => validator.validate(message)).toThrow(ValidationError);
      expect(() => validator.validate(message)).toThrow('Content length exceeds maximum allowed length of 5');
    });

    it('should return current rules', () => {
      const rules = validator.getRules();
      expect(rules).toEqual({
        maxContentLength: 10000,
        requiredFields: ['id', 'type', 'content', 'timestamp'],
        allowedTypes: ['user', 'assistant', 'system']
      });
    });
  });
}); 