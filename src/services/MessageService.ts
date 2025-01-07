import { Observable, Subject, from } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { ClineMessage, ClineAsk, ClineSay, ClineAskResponse } from '../shared/ExtensionMessage';
import { ReactiveConversationHistoryService } from './ReactiveConversationHistoryService';
import { MessageProcessingPipeline } from './MessageProcessingPipeline';
import { ConversationState } from '../services/ConversationStateService';
import { TaskManagementService } from './TaskManagementService';
import { TaskMetricsService } from './TaskMetricsService';

export class MessageService {
  private processingPipeline: MessageProcessingPipeline;
  private conversationHistoryService: ReactiveConversationHistoryService;
  private taskManagementService: TaskManagementService;
  private taskMetricsService: TaskMetricsService;

  constructor(
    conversationHistoryService: ReactiveConversationHistoryService,
    taskManagementService?: TaskManagementService,
    taskMetricsService?: TaskMetricsService
  ) {
    this.processingPipeline = new MessageProcessingPipeline();
    this.conversationHistoryService = conversationHistoryService;
    this.taskMetricsService = taskMetricsService || new TaskMetricsService();
    this.taskManagementService = taskManagementService || new TaskManagementService(this.taskMetricsService);
  }

  ask(type: ClineAsk, text?: string): Observable<ClineAskResponse> {
    const message: ClineMessage = {
      ts: Date.now(),
      type: 'ask',
      ask: type,
      text,
    };

    return from(this.startNewTask()).pipe(
      switchMap(task => from(this.processingPipeline.processMessage(message)).pipe(
        tap(processedMessage => {
          this.updateTaskMetrics(task.id, processedMessage);
        }),
        switchMap(async (processedMessage) => {
          await this.conversationHistoryService.addMessage(processedMessage);
          return { response: 'messageResponse', text: '', images: [] } as unknown as ClineAskResponse;
        }),
        catchError(error => {
          this.handleError(error, task.id);
          throw error;
        })
      ))
    );
  }

  say(type: ClineSay, text?: string, images?: string[], partial?: boolean): Observable<void> {
    const message: ClineMessage = {
      ts: Date.now(),
      type: 'say',
      say: type,
      text,
      images,
      partial
    };

    return from(Promise.resolve()).pipe(
      tap(() => {
        this.conversationHistoryService.setProcessing(true);
        this.conversationHistoryService.updateMessage(message);
      }),
      tap(() => this.conversationHistoryService.setProcessing(false)),
      catchError(error => {
        this.handleError(error);
        throw error;
      })
    );
  }

  private async startNewTask() {
    const currentTask = this.taskManagementService.getCurrentTask();
    if (currentTask) {
      await this.taskManagementService.endTask(currentTask.id);
    }
    return this.taskManagementService.startTask();
  }

  private updateTaskMetrics(taskId: string, message: ClineMessage) {
    // Update token count and cost based on message content
    if (message.apiReqInfo) {
      if (message.apiReqInfo.tokensIn) {
        this.taskMetricsService.trackTokens(taskId, message.apiReqInfo.tokensIn);
      }
      if (message.apiReqInfo.tokensOut) {
        this.taskMetricsService.trackTokens(taskId, message.apiReqInfo.tokensOut);
      }
      if (message.apiReqInfo.cacheReads) {
        this.taskMetricsService.trackCacheOperation(taskId, 'read');
      }
      if (message.apiReqInfo.cacheWrites) {
        this.taskMetricsService.trackCacheOperation(taskId, 'write');
      }
      if (message.apiReqInfo.cost) {
        this.taskMetricsService.trackCost(taskId, message.apiReqInfo.cost);
      }
    } else {
      // Fallback to simple estimation if no API info
      const estimatedTokens = this.estimateTokenCount(message);
      this.taskMetricsService.trackTokens(taskId, estimatedTokens);
    }

    // Update task metrics in management service
    this.taskManagementService.updateTaskMetrics(taskId, this.taskMetricsService.getMetrics(taskId));
  }

  private estimateTokenCount(message: ClineMessage): number {
    // Simple estimation based on text length
    // In a real implementation, this would use a proper tokenizer
    return message.text?.length || 0;
  }

  private handleError(error: any, taskId?: string) {
    this.conversationHistoryService.setError(error.message || 'An error occurred');
    this.conversationHistoryService.setProcessing(false);
    
    if (taskId) {
      this.taskManagementService.failTask(taskId, error);
    }
  }

  getState(): Observable<ConversationState> {
    return this.conversationHistoryService.getState();
  }

  getMessages(): Observable<ClineMessage[]> {
    return this.conversationHistoryService.getMessages();
  }

  getCurrentTask() {
    return this.taskManagementService.getCurrentTask();
  }

  getAllTasks() {
    return this.taskManagementService.getAllTasks();
  }

  updatePartialMessage(message: ClineMessage) {
    if (message.partial) {
      const currentState = this.conversationHistoryService.getCurrentState();
      const lastMessage = currentState.messages[currentState.messages.length - 1];
      
      if (lastMessage && lastMessage.partial && 
          lastMessage.type === message.type &&
          ((lastMessage.ask && message.ask && lastMessage.ask === message.ask) ||
           (lastMessage.say && message.say && lastMessage.say === message.say))) {
        this.conversationHistoryService.updateMessage({
          ...lastMessage,
          text: message.text,
          images: message.images
        });
      } else {
        this.conversationHistoryService.updateMessage(message);
      }
    } else {
      this.conversationHistoryService.updateMessage(message);
    }
  }
} 