import { Observable, Subject, pipe, from, of, throwError } from 'rxjs';
import { map, catchError, mergeMap, tap, filter } from 'rxjs/operators';
import { ClineMessage } from '../shared/ExtensionMessage';

export interface MessageTransformation {
  name: string;
  transform: (message: ClineMessage) => ClineMessage | Promise<ClineMessage>;
  priority?: number; // Higher priority transformations run first
}

export interface MessageValidation {
  name: string;
  validate: (message: ClineMessage) => boolean | Promise<boolean>;
  errorMessage: string;
  priority?: number; // Higher priority validations run first
}

export interface ProcessingError {
  message: string;
  stage: string;
  originalMessage: ClineMessage;
  error?: Error;
}

export class MessageProcessingPipeline {
  private transformations: MessageTransformation[] = [];
  private validations: MessageValidation[] = [];
  private errorSubject = new Subject<ProcessingError>();
  private isDisposed = false;

  constructor() {}

  addTransformation(transformation: MessageTransformation): void {
    if (this.isDisposed) {
      throw new Error('Pipeline is disposed');
    }
    this.transformations.push(transformation);
    // Sort by priority (higher first)
    this.transformations.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  addValidation(validation: MessageValidation): void {
    if (this.isDisposed) {
      throw new Error('Pipeline is disposed');
    }
    this.validations.push(validation);
    // Sort by priority (higher first)
    this.validations.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  removeTransformation(name: string): void {
    this.transformations = this.transformations.filter(t => t.name !== name);
  }

  removeValidation(name: string): void {
    this.validations = this.validations.filter(v => v.name !== name);
  }

  clearTransformations(): void {
    this.transformations = [];
  }

  clearValidations(): void {
    this.validations = [];
  }

  private async runValidations(message: ClineMessage): Promise<boolean> {
    if (this.isDisposed) {
      throw new Error('Pipeline is disposed');
    }

    for (const validation of this.validations) {
      try {
        const isValid = await validation.validate(message);
        if (!isValid) {
          this.errorSubject.next({
            message: validation.errorMessage,
            stage: validation.name,
            originalMessage: message
          });
          return false;
        }
      } catch (error) {
        const processingError: ProcessingError = {
          message: `Validation error in ${validation.name}: ${error instanceof Error ? error.message : String(error)}`,
          stage: validation.name,
          originalMessage: message,
          error: error instanceof Error ? error : new Error(String(error))
        };
        this.errorSubject.next(processingError);
        return false;
      }
    }
    return true;
  }

  processMessage(message: ClineMessage): Observable<ClineMessage> {
    if (this.isDisposed) {
      return throwError(() => new Error('Pipeline is disposed'));
    }

    return from(this.runValidations(message)).pipe(
      mergeMap(isValid => {
        if (!isValid) {
          return throwError(() => new Error('Message validation failed'));
        }
        return of(message);
      }),
      mergeMap(msg => {
        return this.transformations.reduce(
          (obs, transformation) => 
            obs.pipe(
              mergeMap(async (currentMsg) => {
                try {
                  return await transformation.transform(currentMsg);
                } catch (error) {
                  const processingError: ProcessingError = {
                    message: `Transformation error in ${transformation.name}: ${error instanceof Error ? error.message : String(error)}`,
                    stage: transformation.name,
                    originalMessage: message,
                    error: error instanceof Error ? error : new Error(String(error))
                  };
                  this.errorSubject.next(processingError);
                  throw error;
                }
              })
            ),
          of(msg)
        );
      }),
      catchError(error => {
        console.error('Error processing message:', error);
        return throwError(() => error);
      })
    );
  }

  getErrorStream(): Observable<ProcessingError> {
    return this.errorSubject.asObservable();
  }

  // Common transformations
  static readonly trimContent: MessageTransformation = {
    name: 'trimContent',
    transform: (message: ClineMessage) => ({
      ...message,
      content: message.content?.trim() || ''
    }),
    priority: 100 // Run early in the pipeline
  };

  static readonly removeExcessiveWhitespace: MessageTransformation = {
    name: 'removeExcessiveWhitespace',
    transform: (message: ClineMessage) => ({
      ...message,
      content: message.content?.replace(/\s+/g, ' ') || ''
    }),
    priority: 90 // Run after trim
  };

  static readonly normalizeNewlines: MessageTransformation = {
    name: 'normalizeNewlines',
    transform: (message: ClineMessage) => ({
      ...message,
      content: message.content?.replace(/\r\n/g, '\n').replace(/\r/g, '\n') || ''
    }),
    priority: 95
  };

  // Common validations
  static readonly nonEmptyContent: MessageValidation = {
    name: 'nonEmptyContent',
    validate: (message: ClineMessage) => (message.content?.trim().length || 0) > 0,
    errorMessage: 'Message content cannot be empty',
    priority: 100 // Run first
  };

  static readonly maxLength = (maxLength: number): MessageValidation => ({
    name: 'maxLength',
    validate: (message: ClineMessage) => (message.content?.length || 0) <= maxLength,
    errorMessage: `Message content cannot exceed ${maxLength} characters`,
    priority: 90
  });

  static readonly noControlCharacters: MessageValidation = {
    name: 'noControlCharacters',
    validate: (message: ClineMessage) => !/[\x00-\x1F\x7F]/.test(message.content || ''),
    errorMessage: 'Message contains invalid control characters',
    priority: 95
  };

  dispose(): void {
    if (!this.isDisposed) {
      this.isDisposed = true;
      this.transformations = [];
      this.validations = [];
      this.errorSubject.complete();
    }
  }
} 