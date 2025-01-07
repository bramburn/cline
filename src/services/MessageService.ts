import { Observable, Subject, from } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { ClineMessage, ClineAsk, ClineSay, ClineAskResponse } from '../shared/ExtensionMessage';
import { ReactiveConversationHistoryService } from './ReactiveConversationHistoryService';
import { MessageProcessingPipeline } from './MessageProcessingPipeline';
import { ConversationState } from '../services/ConversationStateService';

export class MessageService {
  private processingPipeline: MessageProcessingPipeline;
  private conversationHistoryService: ReactiveConversationHistoryService;

  constructor(conversationHistoryService: ReactiveConversationHistoryService) {
    this.processingPipeline = new MessageProcessingPipeline();
    this.conversationHistoryService = conversationHistoryService;
  }

  ask(type: ClineAsk, text?: string): Observable<ClineAskResponse> {
    const message: ClineMessage = {
      ts: Date.now(),
      type: 'ask',
      ask: type,
      text,
    };

    return from(this.processingPipeline.processMessage(message)).pipe(
      switchMap(async (processedMessage) => {
        await this.conversationHistoryService.addMessage(processedMessage);
        return { response: 'messageResponse', text: '', images: [] } as unknown as ClineAskResponse;
      }),
      catchError(error => {
        console.error('Error processing ask message:', error);
        throw error;
      })
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
  private async processAskMessage(message: ClineMessage): Promise<{
    response: ClineAskResponse;
    text?: string;
    images?: string[];
  }> {
    // This will be integrated with the existing Cline class functionality
    return {
      response: 'messageResponse',
      text: '',
      images: []
    };
  }
  private handleError(error: any) {
    this.conversationHistoryService.setError(error.message || 'An error occurred');
    this.conversationHistoryService.setProcessing(false);
  }

  getState(): Observable<ConversationState> {
    return this.conversationHistoryService.getState();
  }

  getMessages(): Observable<ClineMessage[]> {
    return this.conversationHistoryService.getMessages();
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