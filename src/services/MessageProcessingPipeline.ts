import { Observable } from 'rxjs';
import { Message, MessageProcessingResult } from '../types/MessageTypes';

export interface MessageTransformation {
  name: string;
  transform: (message: Message) => Message | Promise<Message>;
  priority?: number; // Higher priority transformations run first
}

export interface MessageValidation {
  name: string;
  validate: (message: Message) => boolean | Promise<boolean>;
  errorMessage: string;
  priority?: number; // Higher priority validations run first
}

export interface ProcessingError {
  message: string;
  stage: string;
  originalMessage: Message;
  error?: Error;
}

export class MessageProcessingPipeline {
  private transformations: MessageTransformation[] = [];
  private validations: MessageValidation[] = [];
  private isDisposed = false;

  constructor() {}

  public processMessage(message: Message): Observable<MessageProcessingResult> {
    if (this.isDisposed) {
      throw new Error('Pipeline is disposed');
    }

    // Run validations
    for (const validation of this.validations) {
      const isValid = validation.validate(message);
      if (!isValid) {
        return new Observable(subscriber => {
          subscriber.next({
            success: false,
            error: new Error(validation.errorMessage)
          });
          subscriber.complete();
        });
      }
    }

    // Run transformations
    return new Observable(subscriber => {
      let currentMessage = message;
      try {
        for (const transformation of this.transformations) {
          const result = transformation.transform(currentMessage);
          if (result instanceof Promise) {
            result.then(transformedMessage => {
              currentMessage = transformedMessage;
            }).catch(error => {
              subscriber.next({
                success: false,
                error: new Error(`Transformation ${transformation.name} failed: ${error.message}`)
              });
              subscriber.complete();
            });
          } else {
            currentMessage = result;
          }
        }
        subscriber.next({
          success: true,
          data: currentMessage
        });
        subscriber.complete();
      } catch (error) {
        subscriber.next({
          success: false,
          error: new Error(`Message processing failed: ${error.message}`)
        });
        subscriber.complete();
      }
    });
  }

  public addTransformation(transformation: MessageTransformation): void {
    if (this.isDisposed) {
      throw new Error('Pipeline is disposed');
    }
    this.transformations.push(transformation);
    // Sort by priority (higher first)
    this.transformations.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  public addValidation(validation: MessageValidation): void {
    if (this.isDisposed) {
      throw new Error('Pipeline is disposed');
    }
    this.validations.push(validation);
    // Sort by priority (higher first)
    this.validations.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  public removeTransformation(name: string): void {
    this.transformations = this.transformations.filter(t => t.name !== name);
  }

  public removeValidation(name: string): void {
    this.validations = this.validations.filter(v => v.name !== name);
  }

  public clearTransformations(): void {
    this.transformations = [];
  }

  public clearValidations(): void {
    this.validations = [];
  }

  public dispose(): void {
    this.isDisposed = true;
    this.clearTransformations();
    this.clearValidations();
  }
} 