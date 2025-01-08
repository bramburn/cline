import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { injectable, inject } from 'inversify';
import {
  Message,
  MessageState,
  MessageServiceConfig,
  MessageProcessingResult,
  ProcessingError
} from '../types/MessageTypes';
import { MessageValidator } from '../validators/MessageValidator';
import { MessageProcessingPipeline } from './MessageProcessingPipeline';
import { TaskManagementService } from './TaskManagementService';
import { TaskMetricsService } from './TaskMetricsService';
import { IMessageService } from '../types/services/IMessageService';
import { TYPES } from '../types';

@injectable()
export class MessageService implements IMessageService {
  private state: BehaviorSubject<MessageState>;
  private validator: MessageValidator;
  private config: MessageServiceConfig;

  constructor(
    @inject(TYPES.MessageProcessingPipeline) private processingPipeline: MessageProcessingPipeline,
    @inject(TYPES.TaskManagementService) private taskManagementService: TaskManagementService,
    @inject(TYPES.TaskMetricsService) private taskMetricsService: TaskMetricsService,
    config?: MessageServiceConfig
  ) {
    this.config = {
      maxContentLength: config?.maxContentLength || 10000,
      maxHistorySize: config?.maxHistorySize || 100,
      persistenceEnabled: config?.persistenceEnabled ?? true
    };

    this.validator = new MessageValidator({
      maxContentLength: this.config.maxContentLength
    });

    this.state = new BehaviorSubject<MessageState>({
      messages: [],
      isProcessing: false
    });
  }

  public sendMessage(message: Message): Observable<MessageProcessingResult> {
    return from(Promise.resolve()).pipe(
      tap(() => this.setProcessing(true)),
      tap(() => this.validator.validate(message)),
      switchMap(() => this.startNewTask()),
      switchMap(taskId => this.processMessage(message, taskId)),
      tap(result => this.handleProcessingResult(result)),
      catchError(error => this.handleError(error)),
      tap(() => this.setProcessing(false))
    );
  }

  private async startNewTask(): Promise<string> {
    const currentTask = this.taskManagementService.getCurrentTask();
    if (currentTask) {
      await this.taskManagementService.endTask(currentTask.id);
    }
    return this.taskManagementService.startTask();
  }

  private processMessage(message: Message, taskId: string): Observable<MessageProcessingResult> {
    return this.processingPipeline.processMessage(message).pipe(
      tap(result => {
        if (result.success) {
          this.updateState(prevState => ({
            ...prevState,
            messages: [...prevState.messages, message],
            lastMessageId: message.id
          }));
          this.updateTaskMetrics(taskId, message);
        }
      })
    );
  }

  private updateTaskMetrics(taskId: string, message: Message): void {
    this.taskMetricsService.initializeMetrics(taskId);
    
    // Update basic metrics
    this.taskMetricsService.trackTokens(taskId, this.estimateTokenCount(message));
    
    // Update additional metrics if available
    if (message.metadata?.apiInfo) {
      const { tokensIn, tokensOut, cost, cacheReads, cacheWrites } = message.metadata.apiInfo;
      
      if (tokensIn) this.taskMetricsService.trackTokens(taskId, tokensIn);
      if (tokensOut) this.taskMetricsService.trackTokens(taskId, tokensOut);
      if (cost) this.taskMetricsService.trackCost(taskId, cost);
      if (cacheReads) this.taskMetricsService.trackCacheOperation(taskId, 'read');
      if (cacheWrites) this.taskMetricsService.trackCacheOperation(taskId, 'write');
    }
  }

  private estimateTokenCount(message: Message): number {
    return Math.ceil(message.content.length / 4);
  }

  private handleProcessingResult(result: MessageProcessingResult): void {
    if (!result.success && result.error) {
      this.setError(result.error.message);
    }
  }

  private handleError(error: any): Observable<MessageProcessingResult> {
    const processingError = new ProcessingError(
      error.message || 'An error occurred during message processing',
      error
    );
    this.setError(processingError.message);
    return of({ success: false, error: processingError });
  }

  private setProcessing(isProcessing: boolean): void {
    this.updateState(prevState => ({ ...prevState, isProcessing }));
  }

  private setError(error: string): void {
    this.updateState(prevState => ({ ...prevState, error }));
  }

  private updateState(updater: (prevState: MessageState) => MessageState): void {
    const currentState = this.state.value;
    const newState = updater(currentState);
    this.state.next(newState);
  }

  public getState(): Observable<MessageState> {
    return this.state.asObservable();
  }

  public getMessages(): Observable<Message[]> {
    return this.state.pipe(map(state => state.messages));
  }

  public getCurrentTask() {
    return this.taskManagementService.getCurrentTask();
  }

  public updateMessageContent(messageId: string, content: string): void {
    this.updateState(prevState => {
      const messages = prevState.messages.map(msg =>
        msg.id === messageId ? { ...msg, content } : msg
      );
      return { ...prevState, messages };
    });
  }

  public dispose(): void {
    this.state.complete();
  }
} 