import { Message, MessageValidationRules, ValidationError } from '../types/MessageTypes';

export class MessageValidator {
  private rules: MessageValidationRules;

  constructor(rules?: Partial<MessageValidationRules>) {
    this.rules = {
      maxContentLength: rules?.maxContentLength || 10000,
      requiredFields: rules?.requiredFields || ['id', 'type', 'content', 'timestamp'],
      allowedTypes: rules?.allowedTypes || ['user', 'assistant', 'system']
    };
  }

  public validate(message: Message): void {
    this.validateRequiredFields(message);
    this.validateContentLength(message);
    this.validateMessageType(message);
    this.validateTimestamp(message);
  }

  private validateRequiredFields(message: Message): void {
    for (const field of this.rules.requiredFields) {
      if (!(field in message)) {
        throw new ValidationError(`Missing required field: ${field}`);
      }
      if (message[field as keyof Message] === undefined || message[field as keyof Message] === null) {
        throw new ValidationError(`Required field cannot be null or undefined: ${field}`);
      }
    }
  }

  private validateContentLength(message: Message): void {
    if (message.content.length > this.rules.maxContentLength) {
      throw new ValidationError(
        `Content length exceeds maximum allowed length of ${this.rules.maxContentLength}`
      );
    }
  }

  private validateMessageType(message: Message): void {
    if (!this.rules.allowedTypes.includes(message.type)) {
      throw new ValidationError(
        `Invalid message type: ${message.type}. Allowed types: ${this.rules.allowedTypes.join(', ')}`
      );
    }
  }

  private validateTimestamp(message: Message): void {
    if (typeof message.timestamp !== 'number' || isNaN(message.timestamp)) {
      throw new ValidationError('Timestamp must be a valid number');
    }
    if (message.timestamp < 0) {
      throw new ValidationError('Timestamp cannot be negative');
    }
    if (message.timestamp > Date.now() + 1000) { // Allow 1 second future tolerance
      throw new ValidationError('Timestamp cannot be in the future');
    }
  }

  public updateRules(rules: Partial<MessageValidationRules>): void {
    this.rules = {
      ...this.rules,
      ...rules
    };
  }

  public getRules(): MessageValidationRules {
    return { ...this.rules };
  }
} 