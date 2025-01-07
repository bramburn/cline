import { Observable, Subject, from } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { ClineMessage, ClineAsk, ClineSay, ClineAskResponse } from '../shared/ExtensionMessage';
import { ConversationStateService } from './ConversationStateService';
import { HistoryItem } from '../shared/HistoryItem';

export class MessageService {
  private messageSubject: Subject<ClineMessage>;
  private conversationState: ConversationStateService;

  constructor(historyItem?: HistoryItem) {
    this.messageSubject = new Subject<ClineMessage>();
    this.conversationState = new ConversationStateService(historyItem);
  }

  ask(type: ClineAsk, text?: string, partial?: boolean): Observable<{
    response: ClineAskResponse;
    text?: string;
    images?: string[];
  }> {
    const message: ClineMessage = {
      ts: Date.now(),
      type: 'ask',
      ask: type,
      text,
      partial
    };

    return from(this.processAskMessage(message)).pipe(
      tap(() => {
        this.conversationState.setProcessing(true);
        this.conversationState.updateMessage(message);
      }),
      switchMap(async (response) => {
        this.conversationState.setAskResponse(response.response, response.text, response.images);
        return response;
      }),
      tap(() => this.conversationState.setProcessing(false)),
      catchError(error => {
        this.handleError(error);
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
        this.conversationState.setProcessing(true);
        this.conversationState.updateMessage(message);
      }),
      tap(() => this.conversationState.setProcessing(false)),
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
    this.conversationState.setError(error.message || 'An error occurred');
    this.conversationState.setProcessing(false);
  }

  getState(): Observable<ConversationState> {
    return this.conversationState.getState();
  }

  getMessages(): Observable<ClineMessage[]> {
    return this.conversationState.getMessages();
  }

  updatePartialMessage(message: ClineMessage) {
    if (message.partial) {
      const currentState = this.conversationState.getCurrentState();
      const lastMessage = currentState.messages[currentState.messages.length - 1];
      
      if (lastMessage && lastMessage.partial && 
          lastMessage.type === message.type &&
          ((lastMessage.ask && message.ask && lastMessage.ask === message.ask) ||
           (lastMessage.say && message.say && lastMessage.say === message.say))) {
        this.conversationState.updateMessage({
          ...lastMessage,
          text: message.text,
          images: message.images
        });
      } else {
        this.conversationState.updateMessage(message);
      }
    } else {
      this.conversationState.updateMessage(message);
    }
  }
} 