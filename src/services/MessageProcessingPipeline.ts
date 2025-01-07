import { Observable, Subject, pipe, from, of, throwError } from 'rxjs';
import { map, catchError, mergeMap, tap, filter } from 'rxjs/operators';
import { ClineMessage } from '../shared/ExtensionMessage';

export interface MessageTransformation {
  name: string;
  transform: (message: ClineMessage) => ClineMessage | Promise<ClineMessage>;
}

export interface MessageValidation {
  name: string;
  validate: (message: ClineMessage) => boolean | Promise<boolean>;
  errorMessage: string;
}

export interface ProcessingError {
  message: string;
  stage: string;
  originalMessage: ClineMessage;
}

export class MessageProcessingPipeline {
  private transformations: MessageTransformation[] = [];
  private validations: MessageValidation[] = [];
  private errorSubject = new Subject<ProcessingError>();

  constructor() {}

  addTransformation(transformation: MessageTransformation): void {
    this.transformations.push(transformation);
  }

  addValidation(validation: MessageValidation): void {
    this.validations.push(validation);
  }

  private async runValidations(message: ClineMessage): Promise<boolean> {
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
        this.errorSubject.next({
          message: `Validation error in ${validation.name}: ${error}`,
          stage: validation.name,
          originalMessage: message
        });
        return false;
      }
    }
    return true;
  }

  processMessage(message: ClineMessage): Observable<ClineMessage> {
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
                  this.errorSubject.next({
                    message: `Transformation error in ${transformation.name}: ${error}`,
                    stage: transformation.name,
                    originalMessage: message
                  });
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
    })
  };

  static readonly removeExcessiveWhitespace: MessageTransformation = {
    name: 'removeExcessiveWhitespace',
    transform: (message: ClineMessage) => ({
      ...message,
      content: message.content?.replace(/\s+/g, ' ') || ''
    })
  };

  // Common validations
  static readonly nonEmptyContent: MessageValidation = {
    name: 'nonEmptyContent',
    validate: (message: ClineMessage) => (message.content?.trim().length || 0) > 0,
    errorMessage: 'Message content cannot be empty'
  };

  static readonly maxLength: (maxLength: number) => MessageValidation = (maxLength: number) => ({
    name: 'maxLength',
    validate: (message: ClineMessage) => (message.content?.length || 0) <= maxLength,
    errorMessage: `Message content cannot exceed ${maxLength} characters`
  });

  dispose(): void {
    this.errorSubject.complete();
  }
} 